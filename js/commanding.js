"use strict";
/* ============================================================================
   commanding.js — everything that sends something to the robot.

   Three interlocks stand between a click and a moving humanoid:
     1. the motion switch gates every preset motion,
     2. E-STOP latches, force-clears that switch and blocks re-enabling it,
     3. facial expressions bypass the gate because they are screen-only.
   ========================================================================= */

function guardMotion(){
  if(App.estop){ toast("ระบบหยุดฉุกเฉินทำงานอยู่","err"); return false; }
  if(!App.motion){ toast("เปิดสวิตช์ “อนุญาตให้หุ่นยนต์เคลื่อนไหว” ก่อน","err"); return false; }
  return true;
}

/* AIMDK's services are bridged out of AimRT, and the vendor's own py_examples
   all wrap every call in `for i in range(8)` with a 0.25 s wait and the comment
   "retry as remote peer is NOT handled well by ROS". A single call with a long
   timeout — which is what this used to do — loses to that quirk almost every
   time and reports it as a plain timeout. So: fire repeatedly, take whichever
   attempt answers first. */
function nowStamp(){
  const t=Date.now();
  return {sec:Math.floor(t/1000), nanosec:(t%1000)*1e6};
}

/* Each service nests its header differently: SetMcPresetMotion wants
   header.stamp, PlayTts and PlayEmoji want header.header.stamp, and
   SetMcInputSource wants request.header.stamp. The examples refresh it on
   every retry, so a stale attempt is never what the robot sees. */
function setStamp(args,path){
  if(!path) return;
  let o=args;
  const parts=path.split(".");
  for(const k of parts){ if(o[k]==null) o[k]={}; o=o[k]; }
  o.stamp=nowStamp();
}

function callRetry(name,type,args,tries,wait,stampPath){
  return new Promise((resolve,reject)=>{
    let settled=false, fired=0, lastErr=null;
    const fire=()=>{
      if(settled) return;
      fired++;
      setStamp(args,stampPath);
      ros.call(name,type,args,wait*2)
        .then(r=>{ if(!settled){ settled=true; resolve({r,attempts:fired}); } })
        .catch(e=>{ lastErr=e; });
      if(fired<tries) setTimeout(fire,wait);
      else setTimeout(()=>{ if(!settled){ settled=true;
             reject(lastErr || {message:`ไม่ตอบหลังลอง ${tries} ครั้ง · no answer after ${tries} tries`}); } }, wait*3);
    };
    fire();
  });
}

async function callSvc(name,type,args,label,opt){
  opt=opt||{};
  log(`→ ${label} · ${name}`,"i");
  if(App.sim){
    await new Promise(r=>setTimeout(r,180));
    log(`✓ ${label} (จำลอง)`,"s");
    return {__sim:true};
  }
  try{
    const {r,attempts}=await callRetry(name,type,args,
      opt.tries||8, opt.wait||400, opt.stamp);
    /* A reply is not the same as success: the robot answers with a code and a
       task id, and a non-zero code means it declined the request. */
    const inner=r&&r.response;
    const code=inner&&inner.header&&inner.header.code;
    if(code!=null && code!==0){
      log(`✗ ${label}: หุ่นยนต์ปฏิเสธ (code=${code}${inner.task_id?", task="+inner.task_id:""})`,"e");
      toast(label+" ถูกปฏิเสธ","err");
      throw {message:"code "+code};
    }
    log(`✓ ${label}${attempts>1?` (ลอง ${attempts} ครั้ง)`:""}`,"s");
    return r;
  }catch(e){
    log(`✗ ${label}: ${e?.message || JSON.stringify(e)}`,"e");
    toast(label+" ล้มเหลว","err");
    throw e;
  }
}

/* The motion arbitrator ignores commands from a source it has not registered.
   py_examples/set_mc_input_source.py registers with action 1001, priority 40
   and a 1000 ms timeout; without it the preset services accept a call and the
   robot simply does not move. */
let mcRegistered=false;
async function registerInputSource(){
  if(mcRegistered || App.sim) return true;
  try{
    await callSvc(S.inputSrc,"aimdk_msgs/srv/SetMcInputSource",
      {request:{header:{}}, action:{value:1001},
       input_source:{name:"dashboard", priority:40, timeout:1000}},
      "ลงทะเบียนแหล่งควบคุม · register input source",
      {stamp:"request.header"});
    mcRegistered=true;
    return true;
  }catch{
    log("ลงทะเบียนแหล่งควบคุมไม่สำเร็จ — คำสั่งอาจถูกละเลย","w");
    return false;
  }
}

/* Why a service "times out" is almost never answerable from the timeout
   itself. These two read-only queries answer it directly:
     GetSystemState  — IN_READY(1) is the only state that executes services;
                       IN_MOVE/IN_ROLLBACK/IN_FALLBACK_MOVE refuse every call.
     GetMcAction     — preset motions are documented as requiring Stable Stand;
                       in zero-torque or damping the call succeeds and the
                       robot does not move.
   Neither of these commands the robot, so both are safe to run on connect. */
async function preflight(){
  if(App.sim) return;
  try{
    const r=await callRetry(S.getState,"aimdk_msgs/srv/GetSystemState",
      {header:{}},4,400,"header");
    const v=r.r?.curr_status?.value;
    const nm=SYS_STATE[v] ?? v;
    log(`สถานะระบบ · system state: ${nm}${r.r?.cur_state?" ("+r.r.cur_state+")":""}`,
        v===1?"s":"w");
    if(v!==1 && v!=null)
      log("   สถานะนี้ปฏิเสธ service ทุกคำสั่ง — รีบูตหุ่นยนต์หรือรอให้ migration จบ","w");
  }catch(e){ log("อ่านสถานะระบบไม่ได้: "+(e?.message||e),"w"); }

  try{
    const r=await callRetry(S.getAction,"aimdk_msgs/srv/GetMcAction",
      {request:{}},4,400,null);
    const d=r.r?.info?.action_desc, st=r.r?.info?.status?.value;
    log(`โหมดการเคลื่อนไหว · motion mode: ${d||"?"}${st===200?" (กำลังสลับ)":""}`,"i");
    if(d && !/stand|locomotion/i.test(d))
      log("   ท่าทางสำเร็จรูปต้องอยู่โหมด Stable Stand ก่อน — สลับจากแอป Agibot Go หรือจอย","w");
  }catch(e){ log("อ่านโหมดการเคลื่อนไหวไม่ได้: "+(e?.message||e),"w"); }

  /* Arbitration is winner-take-all: only the highest-priority active source is
     obeyed, and everything else is discarded silently. The Agibot Go app sits
     at 60 and the RC at 80, both above the 40 the SDK example registers with,
     so "the button did nothing" can simply mean the phone is still holding
     control. This names the holder instead of leaving it to guesswork. */
  try{
    const r=await callRetry(S.getInputSrc,"aimdk_msgs/srv/GetCurrentInputSource",
      {request:{}},4,400,null);
    const src=r.r?.input_source;
    if(src?.name){
      const mine = src.name==="dashboard";
      log(`แหล่งควบคุมปัจจุบัน · input source: ${src.name} (priority ${src.priority})`,
          mine?"s":"w");
      if(!mine) log("   คำสั่งจากแดชบอร์ดจะถูกละเลยจนกว่าแหล่งนี้จะหมดเวลา","w");
    }
  }catch(e){ log("อ่านแหล่งควบคุมไม่ได้: "+(e?.message||e),"w"); }
}

function flash(btn){ btn.classList.add("sent"); setTimeout(()=>btn.classList.remove("sent"),650); }

/* Bind every copy of a duplicated control. The Demo tab clones several of
   these, so id lookups are not enough. */
function bindAll(act,fn){ $$(`[data-act="${act}"]`).forEach(el=>el.onclick=fn); }

/* ------------------------------------------------------------- GESTURES */
function buildButtons(){
  const mk=(list,hostId,fn)=>{
    const box=document.getElementById(hostId);
    if(!box) return;
    box.innerHTML="";
    list.forEach(([label,id,area])=>{
      const b=document.createElement("button");
      b.className="ab"; b.textContent=label; b.dataset.id=id;
      if(typeof UNVERIFIED!=="undefined" && UNVERIFIED.has(id)){
        b.title="ไม่อยู่ในตารางที่เอกสารรับรอง · not in the documented motion table";
        b.style.opacity=".72";
      }
      b.onclick=()=>fn(id,b,label,area);
      box.appendChild(b);
    });
  };

  const preset=(id,btn,label,area)=>{
    if(!guardMotion()) return;
    flash(btn);
    if(App.sim) Mock.playGesture(id);
    /* area comes from the button, which comes from the documented motion/area
       table in config.js. It used to be guessed from the id, which sent every
       whole-body motion (bow, hug, cheer, clap) with area 2. */
    if(area==null) area=2;
    /* "Stationary" is taken literally: no preset motion of any area. An arm
       gesture is still the robot moving, and in a room with no clearance the
       distinction between an arm and a whole body is not the one that matters.
       Faces, speech and every read-only query stay available -- those are what
       prove the service path works without the robot moving at all. */
    if(App.stationary){
      log(`ข้าม ${label} — โหมดอยู่กับที่: ไม่สั่งท่าทางใด ๆ (area ${area})`,"e");
      toast("โหมดอยู่กับที่ — ท่าทางถูกล็อกทั้งหมด","err");
      return;
    }
    if(typeof UNVERIFIED!=="undefined" && UNVERIFIED.has(id))
      log(`   motion=${id} ไม่อยู่ในเอกสาร SDK — ผลลัพธ์ไม่รับประกัน`,"w");
    registerInputSource().then(()=>
      callSvc(S.preset,"aimdk_msgs/srv/SetMcPresetMotion",
        {header:{},motion:{value:id},area:{value:area},interrupt:false,ani_path:""},
        `ท่าทาง ${label} (motion=${id}, area=${area})`,
        {stamp:"header"})).catch(()=>{});
  };

  const face=(id,btn,label)=>{  /* area is meaningless for a screen face */
    flash(btn);                 /* faces are screen-only: no motion guard */
    callSvc(S.emoji,"aimdk_msgs/srv/PlayEmoji",
      {header:{header:{}},emotion_id:id,mode:1,priority:10},
      `สีหน้า ${label} (id=${id})`,{stamp:"header.header"}).catch(()=>{});
  };

  for(const pre of ["","d_"]){
    mk(ARM ,pre+"gArm" ,preset);
    mk(HEAD,pre+"gHead",preset);
    mk(FACE,pre+"gFace",face);
  }
}

/* --------------------------------------------------------- POINT AT COLOUR */
function bindPointAt(){
  const btn=$("#poBtn"); if(!btn) return;
  btn.onclick=()=>{
    if(!guardMotion()) return;
    const color=$("#poColor").value, arm=+$("#poArm").value;
    flash(btn);
    log(`→ ชี้วัตถุสี ${color} ด้วย ${arm===2?"แขนขวา":"แขนซ้าย"}`,"i");
    log("   ต้องมี node ตรวจจับสี+depth ฝั่งหุ่นยนต์ — SDK ไม่มีให้","w");
    if(App.sim){ Mock.playGesture(1001); toast("จำลอง: ชี้วัตถุสี "+color); }
    else toast("ยังไม่มี node ตรวจจับวัตถุ — ดู README","err");
  };
}

/* ------------------------------- SLAM (std_msgs/String on /integrated_command) */
function bindSlam(){
  bindAll("mapStart",()=>{
    App.mapping=true; ensureGrid();
    if(App.sim){ log("→ start_mapping (จำลอง)","s"); toast("เริ่มสร้างแผนที่"); return; }
    ros.advertise(T.slamCmd,"std_msgs/String",true);   /* TRANSIENT_LOCAL */
    ros.publish(T.slamCmd,{data:"start_mapping"});
    log("→ /integrated_command : start_mapping","s");
  });

  bindAll("mapStop",()=>{
    App.mapping=false;
    const el=P("mapName");
    const nm=(el && el.value.trim()) || "map";
    if(App.sim){ log(`→ stop_mapping:${nm} (จำลอง)`,"s"); toast("บันทึกแผนที่ "+nm); return; }
    ros.advertise(T.slamCmd,"std_msgs/String",true);   /* TRANSIENT_LOCAL */
    ros.publish(T.slamCmd,{data:"stop_mapping:"+nm});
    log(`→ /integrated_command : stop_mapping:${nm}`,"s");
  });

  bindAll("mapLoad",async()=>{
    const el=P("mapName");
    const nm=(el && el.value.trim()) || "map";
    try{
      const r=await callSvc(S.getMap,"aimdk_msgs/srv/GetStoredMapByName",
        {header:{},map_name:nm},`ดึงแผนที่ ${nm}`);
      if(r && r.map_info){
        App.mapW=r.map_info.width; App.mapH=r.map_info.height; App.mapRes=r.map_info.resolution;
        /* GetStoredMapByName.srv carries `int8[] data` alongside the metadata:
           -1 unknown, 0 free, 100 occupied, row-major like nav_msgs/OccupancyGrid.
           This used to throw the grid away and paint the whole map unknown. */
        const d=r.data;
        if(d && d.length===App.mapW*App.mapH){
          App.mapGrid = (d instanceof Int8Array) ? d : Int8Array.from(d);
          log(`   grid ${App.mapW}×${App.mapH} @ ${App.mapRes} ม./ช่อง`,"s");
        }else{
          App.mapGrid=new Int8Array(App.mapW*App.mapH).fill(-1);
          log(`   ไม่มี grid ในคำตอบ (ได้ ${d?d.length:0} ช่อง) — วาดเป็นพื้นที่ไม่รู้จัก`,"w");
        }
        log(`   map_id=${r.map_id} path=${r.map_path}`,"s");
      }
    }catch{}
  });
}

/* ------------------------------------------------------------ VOICE AGENT */
function addMsg(text,who){
  const c=$("#chat"); if(!c) return;
  const ph=c.querySelector(".ph"); if(ph) ph.remove();
  const d=document.createElement("div");
  d.className="msg "+who; d.textContent=text;
  c.appendChild(d); c.scrollTop=c.scrollHeight;
}

/* Questions the robot's own telemetry answers better than any model. The old
   matcher fired on a bare "อะไร", so "ตอนนี้กินข้าวอะไรดี" -- what should I eat --
   came back as a LiDAR obstacle reading. Each pattern now has to name the
   thing being asked about. */
function localAnswer(q){
  const obstacle = /(ข้างหน้า|ด้านหน้า|ตรงหน้า|สิ่งกีดขวาง|กีดขวาง|obstacle|in front|ahead)/i.test(q);
  const battery  = /(แบต|แบตเตอรี่|battery|ไฟเหลือ|พลังงาน)/i.test(q);
  const mode     = /(โหมด|mode|สถานะหุ่น|robot state)/i.test(q);
  const walk     = /(เดินหน้า|เดินไป|ไปข้างหน้า|walk forward|move forward)/i.test(q);
  if(!(obstacle||battery||mode||walk)) return null;   /* -> hand to the LLM */

  if(obstacle){
    const near=App.cloud
      .filter(p=>p[2]>0.05 && p[2]<1.4 && Math.abs(Math.atan2(p[1],p[0]))<0.52)
      .map(p=>Math.hypot(p[0],p[1]));
    const d=near.length ? Math.min(...near) : Infinity;
    return d<50
      ? `ตรวจพบวัตถุใกล้สุดด้านหน้าที่ระยะ ${d.toFixed(2)} เมตร (จาก LiDAR ${App.cloud.length} จุด)`
      : "ด้านหน้าโล่ง ไม่พบสิ่งกีดขวางในระยะ LiDAR";
  }
  if(battery) return `แบตเตอรี่ ${$("#sBatt").textContent} · ${$("#sVolt").textContent}`;
  if(mode)    return `โหมดปัจจุบัน: ${$("#sMode").textContent}`;
  return App.motion
    ? "SDK ไม่มี navigation stack — ต้องใช้ x2_nav_test (T5) สั่ง waypoint แทน"
    : "ต้องเปิดสวิตช์ “อนุญาตให้หุ่นยนต์เคลื่อนไหว” ก่อน";
}

/* A compact snapshot of what the robot can see, handed to the model so it can
   answer about the robot as well as about anything else. */
function robotContext(){
  const near=App.cloud
    .filter(p=>p[2]>0.05 && p[2]<1.4 && Math.abs(Math.atan2(p[1],p[0]))<0.52)
    .map(p=>Math.hypot(p[0],p[1]));
  const d=near.length ? Math.min(...near) : null;
  return [
    `battery=${$("#sBatt")?.textContent||"?"}`,
    `voltage=${$("#sVolt")?.textContent||"?"}`,
    `mode=${$("#sMode")?.textContent||"?"}`,
    `lidar_points=${App.cloud.length}`,
    d!=null ? `nearest_obstacle_ahead_m=${d.toFixed(2)}` : "nearest_obstacle_ahead_m=none",
    `motion_unlocked=${!!App.motion}`,
    `stationary_lock=${!!App.stationary}`,
  ].join(", ");
}

/* OpenAI-compatible chat-completions. Works against api.openai.com, any
   compatible gateway, or a local Ollama with no key at all. The key lives in
   this browser's localStorage and is never sent to the robot. */
async function askLLM(q){
  const c = App.cfg.llm || {};
  if(!c.url) return null;
  const body = {
    model: c.model || "gpt-4o-mini",
    messages: [
      {role:"system", content:
        "You are the voice assistant built into an AgiBot X2 humanoid robot. "+
        "Answer naturally and briefly, in the user's language. You may be asked "+
        "about the robot or about anything else; answer both. Live robot "+
        "telemetry: " + robotContext() + ". Only cite telemetry when it is "+
        "relevant to what was asked."},
      {role:"user", content:q},
    ],
    max_tokens: 400,
  };
  const headers = {"Content-Type":"application/json"};
  if(c.key) headers["Authorization"] = "Bearer " + c.key;
  const res = await fetch(c.url, {method:"POST", headers, body:JSON.stringify(body)});
  if(!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0,160)}`);
  const j = await res.json();
  return j?.choices?.[0]?.message?.content?.trim() || null;
}

async function sendChat(){
  const inp=$("#chatIn");
  const q=inp.value.trim(); if(!q) return;
  inp.value=""; addMsg(q,"u");

  let answer = localAnswer(q);
  if(answer == null){
    if(App.cfg.llm && App.cfg.llm.url){
      addMsg("…","r");
      const ph=$("#chat").lastChild;
      try{ answer = await askLLM(q) || "โมเดลไม่ได้ตอบกลับ"; }
      catch(e){ answer = "เรียก LLM ไม่สำเร็จ: " + (e.message||e); }
      ph.remove();
    }else{
      answer = "ยังไม่ได้ตั้งค่า LLM — เปิด “ตั้งค่า LLM” ด้านล่างเพื่อใส่ endpoint "
             + "(คำถามเกี่ยวกับแบตเตอรี่ โหมด และสิ่งกีดขวางตอบได้เลยโดยไม่ต้องใช้ LLM)";
    }
  }
  addMsg(answer,"r");

  /* Speak it, but only when there is a robot to speak through. */
  if(!App.sim && ros.connected){
    try{
      await callSvc(S.tts,"aimdk_msgs/srv/PlayTts",
        {header:{header:{}}, tts_req:{text:answer, domain:"dashboard", trace_id:"web",
          is_interrupted:true, priority_weight:0, priority_level:{value:6}}},
        "พูด (TTS)",{stamp:"header.header"});
    }catch{}
  }
}

function bindChat(){
  $("#chatSend").onclick=sendChat;
  $("#chatIn").addEventListener("keydown",e=>{ if(e.key==="Enter") sendChat(); });
  const u=$("#llmUrl"), m=$("#llmModel"), k=$("#llmKey"), b=$("#llmSave");
  if(u && App.cfg.llm){ u.value=App.cfg.llm.url||""; m.value=App.cfg.llm.model||""; k.value=App.cfg.llm.key||""; }
  if(b) b.onclick=()=>{
    App.cfg.llm={url:u.value.trim(), model:m.value.trim(), key:k.value.trim()};
    Prefs.save();
    log(App.cfg.llm.url ? "ตั้งค่า LLM แล้ว: "+App.cfg.llm.url : "ล้างการตั้งค่า LLM","s");
    toast(App.cfg.llm.url ? "บันทึกการตั้งค่า LLM" : "ล้างการตั้งค่า LLM");
  };
}
