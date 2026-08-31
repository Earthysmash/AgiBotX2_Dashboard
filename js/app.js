"use strict";
/* ============================================================================
   app.js — connection lifecycle, global controls, the render loop, and boot.
   Loaded last: everything it touches is already defined.
   ========================================================================= */

/* ------------------------------------------------------------- CONNECTION */
function setConn(text,kind){
  const el=$("#sConn");
  el.textContent=text;
  el.closest(".stat").style.setProperty("--c",
    kind==="ok" ? "var(--green)" : kind==="warn" ? "var(--amber)" : "var(--red)");
}

/* Push the socket's real state onto the status card and the offline hero. */
function reflectConn(){
  if(App.sim) return;
  if(ros.connected){
    setConn("เชื่อมต่อแล้ว","ok");
    document.body.classList.remove("offline");
  }else{
    setConn("ยังไม่เชื่อมต่อ","bad");
    document.body.classList.add("offline");
  }
}

function connect(){
  App.cfg.url=$("#cfgUrl").value.trim() || DEFAULTS.url;
  /* Read through the element when it is there, but never let a missing control
     take down boot — connect() runs before the operator has touched anything. */
  App.cfg.compression=($("#cfgCompression") || {}).value || App.cfg.compression || DEFAULTS.compression;
  App.cfg.throttle=+$("#cfgThrottle").value || DEFAULTS.throttle;
  App.cfg.maxPts=+$("#cfgMaxPts").value || DEFAULTS.maxPts;
  App.cfg.ip=ipFromUrl(App.cfg.url) || App.cfg.ip;
  Prefs.save();
  setConn("กำลังเชื่อมต่อ…","warn");
  ros.connect(App.cfg.url);
}

ros.onstate=(ok)=>{
  if(ok){
    document.body.classList.remove("offline");
    setConn("เชื่อมต่อแล้ว","ok");
    discover();
    readMode();
  }else{
    reflectConn();
  }
};

async function readMode(){
  try{
    const r=await ros.call(S.getAction,"aimdk_msgs/srv/GetMcAction",{request:{}});
    $("#sMode").textContent=r?.info?.action_desc || "UNKNOWN";
  }catch{}
};

/* Booting straight into real mode is only pleasant if plugging the cable in
   is enough. Retry quietly in the background; the first failure is logged,
   the rest are not, so the log stays readable. */
setInterval(()=>{
  if(App.sim || App.tab!=="live") return;
  if(ros.connected || !App.cfg.autoRetry) return;
  /* Don't stack a second socket on one that is still handshaking — that is
     what produces a console full of "closed before the connection was
     established" warnings. */
  if(ros.ws && ros.ws.readyState===0) return;
  ros.quiet=true;
  ros.connect(App.cfg.url);
},10000);

/* ---------------------------------------------------------- GLOBAL CONTROLS */
function wireControls(){
  $("#topicsBtn").onclick=()=>{ renderDisc(); $("#discModal").classList.add("on"); };
  $("#setBtn").onclick=()=>$("#setModal").classList.add("on");
  $("#discFilter").addEventListener("input",renderDisc);
  $("#discRefresh").onclick=discover;

  $("#cfgConnect").onclick=()=>{
    Tabs.go("live");
    connect();
    $("#setModal").classList.remove("on");
  };
  $("#cfgDisconnect").onclick=()=>{
    App.cfg.autoRetry=false; Prefs.save();
    ros.close();
    reflectConn();
    log("ตัดการเชื่อมต่อแล้ว — ปิดการลองใหม่อัตโนมัติ","w");
  };
  $("#cfgRetry").onchange=e=>{ App.cfg.autoRetry=e.target.checked; Prefs.save(); };

  /* Compression is fixed per subscription, so switching it has to tear the
     subscriptions down and ask again — otherwise the setting appears to do
     nothing until the next reconnect. */
  $("#cfgCompression").onchange=e=>{
    App.cfg.compression=e.target.value; Prefs.save();
    log("เปลี่ยนการบีบอัดเป็น "+App.cfg.compression,"i");
    if(ros.connected){ ros.subs.clear(); discover(); }
  };

  /* ---- Zenoh experiment ---- */
  $("#zStart").onclick=()=>{
    const z=App.cfg.zenoh;
    z.base =$("#zBase").value.trim();
    z.key  =$("#zKey").value.trim();
    z.topic=$("#zTopic").value.trim();
    z.type =$("#zType").value;
    if(!z.base || !z.key || !z.topic){
      toast("กรอก URL, key และ topic ให้ครบ","err"); return;
    }
    Prefs.save();
    Zenoh.connect(z.base,z.key,z.type,z.topic);
    /* rosbridge may already be feeding this topic — hand it over cleanly */
    if(ros.connected) ros.subs.delete(z.topic);
  };
  $("#zStop").onclick=()=>{ Zenoh.close(); log("Zenoh: หยุดแล้ว","w"); };
  $("#zRaw").onclick=()=>{
    if(!Zenoh.lastRaw){ toast("ยังไม่ได้รับ sample","err"); return; }
    log("Zenoh raw sample: "+JSON.stringify(Zenoh.lastRaw).slice(0,600),"i");
    toast("เขียน sample ลง log แล้ว","ok");
  };

  $$("[data-close]").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("on"));
  $$(".modal").forEach(m=>m.onclick=e=>{ if(e.target===m) m.classList.remove("on"); });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") $$(".modal").forEach(m=>m.classList.remove("on"));
  });

  /* offline hero shortcuts */
  $$('[data-act="goGuide"]').forEach(b=>b.onclick=()=>Tabs.go("guide"));
  $$('[data-act="goDemo"]').forEach(b=>b.onclick=()=>Tabs.go("demo"));
  $$('[data-act="retry"]').forEach(b=>b.onclick=()=>{
    App.cfg.autoRetry=true; $("#cfgRetry").checked=true;
    ros.quiet=false; connect();
  });

  /* motion interlock */
  $("#motionSw").onchange=e=>{
    if(App.estop && e.target.checked){
      e.target.checked=false; toast("ปลดล็อก E-STOP ก่อน","err"); return;
    }
    App.motion=e.target.checked;
    $("#motionHint").textContent=App.motion
      ? "⚠️ ปลดล็อกแล้ว — หุ่นยนต์เคลื่อนไหวได้"
      : "ระบบล็อกการเคลื่อนไหวเพื่อความปลอดภัย";
    $("#motionHint").style.color=App.motion ? "var(--amber)" : "var(--tx3)";
    log(App.motion ? "ปลดล็อกการเคลื่อนไหว" : "ล็อกการเคลื่อนไหว", App.motion ? "w" : "i");
  };

  /* Stationary lock. Turning it off is a deliberate act with a loud log line,
     because the room may not have space for a bow or a hug. */
  const paintLocked=()=>{
    $$('[id$="gArm"] .ab, [id$="gHead"] .ab').forEach(b=>{
      const locked = App.stationary;   /* every preset motion, not just area 11 */
      b.classList.toggle("locked",!!locked);
      b.title = locked ? "ล็อกในโหมดอยู่กับที่ · locked while stationary" : (b.title||"");
    });
  };
  App.paintLocked=paintLocked;
  const statSw=$("#statSw");
  if(statSw){
    statSw.checked=App.stationary;
    statSw.onchange=e=>{
      App.stationary=e.target.checked;
      log(App.stationary
        ? "โหมดอยู่กับที่: เปิด — อนุญาตเฉพาะท่าแขน/ศีรษะ และสีหน้า"
        : "โหมดอยู่กับที่: ปิด — ท่าเต็มตัวและคำสั่งเดินทำงานได้แล้ว",
        App.stationary ? "i" : "w");
      if(!App.stationary) toast("ปลดโหมดอยู่กับที่ — ตรวจสอบพื้นที่รอบหุ่นยนต์","err");
      paintLocked();
    };
  }

  $("#estopBtn").onclick=()=>{
    App.estop=!App.estop;
    document.body.classList.toggle("estopped",App.estop);
    $("#estopBtn").classList.toggle("on",App.estop);
    $("#estopBtn").textContent=App.estop ? "● ปลดล็อก E-STOP" : "● หยุดฉุกเฉิน";
    if(App.estop){
      App.motion=false; $("#motionSw").checked=false;
      $("#motionHint").textContent="🛑 หยุดฉุกเฉิน";
      log("E-STOP — ส่งความเร็วศูนย์","e"); toast("หยุดฉุกเฉิน","err");
      if(!App.sim){
        ros.advertise(T.vel,"aimdk_msgs/msg/McLocomotionVelocity");
        for(let i=0;i<12;i++) setTimeout(()=>ros.publish(T.vel,
          {forward_velocity:0,lateral_velocity:0,angular_velocity:0}),i*40);
      }
    }else{
      $("#motionHint").textContent="ระบบล็อกการเคลื่อนไหวเพื่อความปลอดภัย";
      log("ปลดล็อก E-STOP","w");
    }
  };

  /* point-cloud colour mode + spin */
  $("#pcH").onclick=()=>{ PC.mode="h"; $("#pcH").classList.add("on"); $("#pcR").classList.remove("on"); };
  $("#pcR").onclick=()=>{ PC.mode="r"; $("#pcR").classList.add("on"); $("#pcH").classList.remove("on"); };
  $("#pcSpin").onchange=e=>PC.spin=e.target.checked;

  $("#themeBtn").onclick=()=>{
    const light=document.documentElement.getAttribute("data-theme")==="light";
    document.documentElement.setAttribute("data-theme",light?"dark":"light");
    $("#themeBtn").textContent=light?"☀️":"🌙";
    Prefs.save();
  };
}

/* ---------------------------------------------------------------- LOOP */
let last=now(), mapAcc=0;
function frame(){
  const t=now(), dt=Math.min(t-last,0.1); last=t;

  /* The guide has no canvases; skipping saves a pointless full redraw. */
  if(App.tab!=="guide"){
    if(App.sim) Mock.tick(dt);
    tickCams(dt); tickBigCam();
    drawLidar2D(); drawPC(); drawDepth(); drawPose(); drawHorizon();
    if(App.mapping){ mapAcc+=dt; if(mapAcc>0.25){ mapAcc=0; splatCloudIntoMap(); } }
    drawMap();
  }
  requestAnimationFrame(frame);
}

/* Status line for the Zenoh box. Counting decode failures separately matters:
   a stream that connects and then fails to decode looks identical to a dead
   one from the panels' side, and they are entirely different problems. */
function zStatus(){
  const el=$("#zStat"); if(!el) return;
  if(!Zenoh.es){ el.textContent="ยังไม่ได้เริ่ม · not started"; return; }
  const state=Zenoh.connected ? "<b>เปิดอยู่ · open</b>" : "<s>ไม่ได้เชื่อมต่อ · disconnected</s>";
  el.innerHTML =
    `${state}  ·  ${Zenoh.n} samples  ·  ${Zenoh.hz().toFixed(1)} Hz` +
    (Zenoh.bad ? `<br><s>decode ล้มเหลว ${Zenoh.bad} ครั้ง — ${esc(Zenoh.lastErr)}</s>` : "") +
    (Zenoh.n ? `<br>pose: x=${App.pose.x.toFixed(2)} y=${App.pose.y.toFixed(2)} yaw=${App.pose.yaw.toFixed(2)}` : "");
}

/* ---------------------------------------------------------------- BOOT */
(function boot(){
  Prefs.load();
  if(!document.body.getAttribute("data-lang")) document.body.setAttribute("data-lang","both");
  $("#themeBtn").textContent =
    document.documentElement.getAttribute("data-theme")==="light" ? "🌙" : "☀️";

  /* keep IP and URL in step whichever one was restored */
  App.cfg.ip = ipFromUrl(App.cfg.url) || App.cfg.ip;

  Mock.init();

  /* Build the two tab bodies before anything tries to query their nodes. */
  renderDemo();
  renderGuide();

  buildCams("cams","live");
  buildCams("d_cams","demo");
  bindCamTopics();
  buildButtons();
  if(App.paintLocked) App.paintLocked();   /* mark whole-body ท่า as locked */
  bindPointAt();
  bindSlam();
  bindChat();

  bindOrbit($("#pc3d"),PC);   bindOrbit($("#d_pc3d"),PC);
  bindOrbit($("#pose"),RP);   bindOrbit($("#d_pose"),RP);

  $("#cfgUrl").value=App.cfg.url;
  if($("#cfgCompression")) $("#cfgCompression").value=App.cfg.compression;
  $("#cfgThrottle").value=App.cfg.throttle;
  $("#cfgMaxPts").value=App.cfg.maxPts;
  $("#cfgRetry").checked=App.cfg.autoRetry;
  const z=App.cfg.zenoh;
  $("#zBase").value =z.base || "http://"+App.cfg.ip+":8000";
  $("#zKey").value  =z.key;
  $("#zTopic").value=z.topic;
  $("#zType").value =z.type;
  $("#camCount").textContent=CAMS.length+" มุมมอง";

  wireControls();
  Tabs.init();

  setInterval(()=>{ $("#clock").textContent=new Date().toTimeString().slice(0,8); },1000);
  setInterval(()=>{ if($("#discModal").classList.contains("on")) renderDisc(); },1200);

  log("X2 Command Center พร้อมใช้งาน","s");
  log("เริ่มต้นที่โหมดใช้งานจริง — กำลังลองเชื่อมต่อ "+App.cfg.url,"i");
  log("ยังไม่มีหุ่นยนต์? เปิดแท็บ “โหมดสาธิต” เพื่อดูว่าแต่ละแผงทำงานอย่างไร","i");

  if(App.tab==="live") connect();
  frame();
})();
