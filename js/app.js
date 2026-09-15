"use strict";
/* ============================================================================
   app.js — connection lifecycle, global controls, the render loop, and boot.
   Loaded last: everything it touches is already defined.
   ========================================================================= */

/* ------------------------------------------------------------- CONNECTION */
function setConn(text,kind){
  const el=$("#sConn");
  el.textContent=text;
  el.className="spill "+(kind==="ok" ? "ok" : kind==="warn" ? "warn" : "bad");
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

  /* auto → light → dark → auto. Auto is the interesting one: instruments on
     dark, the setup guide on white, without the operator managing it. */
  $("#themeBtn").onclick=()=>{
    const order=["auto","light","dark"];
    App.themeMode=order[(order.indexOf(App.themeMode)+1) % order.length];
    applyTheme();
    Prefs.save();
  };
}

const THEME_BTN={auto:["🌗","ธีมอัตโนมัติ (ตามแท็บ)"],light:["☀️","ธีมสว่าง"],dark:["🌙","ธีมมืด"]};

function applyTheme(){
  const t = App.themeMode==="auto"
    ? (App.tab==="guide" ? "light" : "dark")
    : App.themeMode;
  document.documentElement.setAttribute("data-theme",t);
  const b=$("#themeBtn"), m=THEME_BTN[App.themeMode] || THEME_BTN.auto;
  if(b){ b.textContent=m[0]; b.title=m[1]; }
}

/* The status rail and the guide's sticky toolbar both park directly under the
   header, so measure it rather than hard-coding a height that drifts. */
function measureHeader(){
  const h=document.querySelector("header");
  if(h) document.documentElement.style.setProperty("--railtop",(h.offsetHeight+8)+"px");
}

/* -------------------------------------------------------------- KPI STRIP
   Four numbers, all derived from data already arriving. The forward-clearance
   filter is the same one localAnswer() uses, so the tile and the voice agent
   can never disagree about what is in front of the robot. */
function setKpi(id,txt,unit,state){
  const el=$(id); if(!el) return;
  el.className="kpi "+(state || "");
  el.querySelector("u").innerHTML=esc(txt)+(unit?`<small>${esc(unit)}</small>`:"");
}

function updateKpis(){
  const pts=App.cloud.length;

  /* forward ±30° arc, torso height band */
  let clear=Infinity;
  for(const p of App.cloud){
    if(p[2]<=-0.85 || p[2]>=0.7) continue;
    if(Math.abs(Math.atan2(p[1],p[0]))>=0.52) continue;
    const d=Math.hypot(p[0],p[1]);
    if(d<clear) clear=d;
  }
  if(!pts)                setKpi("#kClear","—","ม.","idle");
  else if(!isFinite(clear)) setKpi("#kClear","โล่ง","","");
  else setKpi("#kClear",clear.toFixed(2),"ม.",
        clear<0.6 ? "alert" : clear<1.2 ? "warn" : "");

  const hz=Bus.hz(T.lidar);
  setKpi("#kLidar", hz>0 ? hz.toFixed(1) : "—", "Hz",
         hz>0 ? (hz<3 ? "warn" : "") : "idle");

  setKpi("#kPts", pts ? pts.toLocaleString("en-US") : "—", "", pts?"":"idle");

  const havePose=App.pose.x || App.pose.y || App.pose.yaw;
  setKpi("#kPose", havePose
    ? `${App.pose.x.toFixed(1)}, ${App.pose.y.toFixed(1)}` : "—", "",
    havePose?"":"idle");
}

/* ---------------------------------------------------------------- LOOP */
let last=now(), mapAcc=0, kpiAcc=0;
function frame(){
  const t=now(), dt=Math.min(t-last,0.1); last=t;

  /* The guide has no canvases; skipping saves a pointless full redraw. */
  if(App.tab!=="guide"){
    if(App.sim) Mock.tick(dt);
    tickCams(dt); tickBigCam();
    drawLidar2D(); drawPC(); drawDepth(); drawPose(); drawHorizon();
    if(App.mapping){ mapAcc+=dt; if(mapAcc>0.25){ mapAcc=0; splatCloudIntoMap(); } }
    drawMap();
    /* 5 Hz is plenty for numbers a human reads, and keeps the tiles from
       flickering between adjacent LiDAR frames. */
    kpiAcc+=dt; if(kpiAcc>0.2){ kpiAcc=0; updateKpis(); }
  }
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- BOOT */
(function boot(){
  Prefs.load();
  if(!document.body.getAttribute("data-lang")) document.body.setAttribute("data-lang","both");
  applyTheme();

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
  measureHeader();
  window.addEventListener("resize",measureHeader);

  setInterval(()=>{ $("#clock").textContent=new Date().toTimeString().slice(0,8); },1000);
  setInterval(()=>{ if($("#discModal").classList.contains("on")) renderDisc(); },1200);

  log("X2 Command Center พร้อมใช้งาน","s");
  log("เริ่มต้นที่โหมดใช้งานจริง — กำลังลองเชื่อมต่อ "+App.cfg.url,"i");
  log("ยังไม่มีหุ่นยนต์? เปิดแท็บ “โหมดสาธิต” เพื่อดูว่าแต่ละแผงทำงานอย่างไร","i");

  if(App.tab==="live") connect();
  frame();
})();
