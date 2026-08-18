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
  bindPointAt();
  bindSlam();
  bindChat();

  bindOrbit($("#pc3d"),PC);   bindOrbit($("#d_pc3d"),PC);
  bindOrbit($("#pose"),RP);   bindOrbit($("#d_pose"),RP);

  $("#cfgUrl").value=App.cfg.url;
  $("#cfgThrottle").value=App.cfg.throttle;
  $("#cfgMaxPts").value=App.cfg.maxPts;
  $("#cfgRetry").checked=App.cfg.autoRetry;
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
