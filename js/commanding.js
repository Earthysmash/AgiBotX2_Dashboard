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

async function callSvc(name,type,args,label){
  log(`→ ${label} · ${name}`,"i");
  if(App.sim){
    await new Promise(r=>setTimeout(r,180));
    log(`✓ ${label} (จำลอง)`,"s");
    return {__sim:true};
  }
  try{
    const r=await ros.call(name,type,args);
    log(`✓ ${label}`,"s");
    return r;
  }catch(e){
    log(`✗ ${label}: ${e?.message || JSON.stringify(e)}`,"e");
    toast(label+" ล้มเหลว","err");
    throw e;
  }
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
    list.forEach(([label,id])=>{
      const b=document.createElement("button");
      b.className="ab"; b.textContent=label; b.dataset.id=id;
      b.onclick=()=>fn(id,b,label);
      box.appendChild(b);
    });
  };

  const preset=(id,btn,label)=>{
    if(!guardMotion()) return;
    flash(btn);
    if(App.sim) Mock.playGesture(id);
    /* area is inferred: head motions (4xxx) -> HEAD(4), everything else
       RIGHT_HAND(2). Some two-handed motions may also want LEFT_HAND(1). */
    const area=id>=4000 ? 4 : 2;
    callSvc(S.preset,"aimdk_msgs/srv/SetMcPresetMotion",
      {header:{},motion:{value:id},area:{value:area},interrupt:false},
      `ท่าทาง ${label} (motion=${id}, area=${area})`).catch(()=>{});
  };

  const face=(id,btn,label)=>{
    flash(btn);                 /* faces are screen-only: no motion guard */
    callSvc(S.emoji,"aimdk_msgs/srv/PlayEmoji",
      {emotion_id:id,mode:1,priority:10},`สีหน้า ${label} (id=${id})`).catch(()=>{});
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
    ros.advertise(T.slamCmd,"std_msgs/String");
    ros.publish(T.slamCmd,{data:"start_mapping"});
    log("→ /integrated_command : start_mapping","s");
  });

  bindAll("mapStop",()=>{
    App.mapping=false;
    const el=P("mapName");
    const nm=(el && el.value.trim()) || "map";
    if(App.sim){ log(`→ stop_mapping:${nm} (จำลอง)`,"s"); toast("บันทึกแผนที่ "+nm); return; }
    ros.advertise(T.slamCmd,"std_msgs/String");
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
        App.mapGrid=new Int8Array(App.mapW*App.mapH).fill(-1);
        log(`   map_id=${r.map_id} path=${r.map_path}`,"s");
        log("   หมายเหตุ: service คืนเฉพาะ metadata + path — ไม่มี grid ให้วาด","w");
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

/* Questions answerable straight from telemetry never need an LLM. */
function localAnswer(q){
  const near=App.cloud
    .filter(p=>p[2]>-0.85 && p[2]<0.7 && Math.abs(Math.atan2(p[1],p[0]))<0.52)
    .map(p=>Math.hypot(p[0],p[1]));
  const d=near.length ? Math.min(...near) : Infinity;

  if(/ข้างหน้า|อะไร|มีอะไร/.test(q))
    return d<50
      ? `ตรวจพบวัตถุใกล้สุดด้านหน้าที่ระยะ ${d.toFixed(2)} เมตร (จาก LiDAR ${App.cloud.length} จุด)`
      : "ด้านหน้าโล่ง ไม่พบสิ่งกีดขวางในระยะ LiDAR";
  if(/แบต|battery/i.test(q))
    return `แบตเตอรี่ ${$("#sBatt").textContent} · ${$("#sVolt").textContent}`;
  if(/โหมด|mode/i.test(q))
    return `โหมดปัจจุบัน: ${$("#sMode").textContent}`;
  if(/เดินหน้า|เดิน|ไปข้างหน้า/.test(q))
    return App.motion
      ? "SDK ไม่มี navigation stack — ต้องใช้ x2_nav_test (T5) สั่ง waypoint แทน"
      : "ต้องเปิดสวิตช์ “อนุญาตให้หุ่นยนต์เคลื่อนไหว” ก่อน";
  return null;
}

async function sendChat(){
  const inp=$("#chatIn");
  const q=inp.value.trim(); if(!q) return;
  inp.value=""; addMsg(q,"u");
  const local=localAnswer(q);
  addMsg(local || "ส่งข้อความไปพูดผ่านลำโพงหุ่นยนต์ (PlayTts)","r");
  try{
    await callSvc(S.tts,"aimdk_msgs/srv/PlayTts",
      {header:{}, tts_req:{text:local||q, domain:"dashboard", trace_id:"web",
        is_interrupted:true, priority_weight:0, priority_level:{value:6}}},"พูด (TTS)");
  }catch{}
}

function bindChat(){
  $("#chatSend").onclick=sendChat;
  $("#chatIn").addEventListener("keydown",e=>{ if(e.key==="Enter") sendChat(); });
}
