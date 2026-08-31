"use strict";
/* ============================================================================
   discovery.js — ask rosbridge what the robot is publishing, show it, and
   subscribe to everything the dashboard knows how to render.

   The topic list is the single most useful screen for someone who has just
   got SSH working: it answers "is the robot actually talking?" in one glance.
   ========================================================================= */

const BOUND = new Set(Object.values(T));

async function discover(){
  if(App.sim){
    App.discovered=Object.entries(T).map(([k,v])=>({name:v,type:"(จำลอง / simulated)"}));
    renderDisc();
    return;
  }
  try{
    const r=await ros.topics();
    App.discovered=(r.topics || [])
      .map((n,i)=>({name:n,type:(r.types || [])[i] || "?"}))
      .sort((a,b)=>a.name.localeCompare(b.name));
    log(`ตรวจพบ ${App.discovered.length} topics`,"s");
    renderDisc();
    autoSubscribe();
    $("#discModal").classList.add("on");
  }catch(e){
    log("ดึงรายการ topic ไม่สำเร็จ: "+(e?.message || e),"e");
  }
}

function autoSubscribe(){
  const have=new Set(App.discovered.map(d=>d.name));
  const typeOf=n=>(App.discovered.find(d=>d.name===n) || {}).type;
  /* per-topic throttle floors: images are heavy, telemetry is cheap */
  /* Per-topic throttle floors, in ms between frames. These cap the frame rate:
     the ตั้งค่า throttle box is a Math.max() against them, so it can only slow
     a stream down, never speed one past its floor. Lowering these is the only
     way to raise fps from the dashboard side — the resolution itself is set on
     the robot, and downscaling in the browser saves nothing, because the bytes
     have already crossed the wire by then. */
  /* Take the robot-side downsampled sweep when it exists. It carries the same
     geometry at a fraction of the bytes, and the SDK documents the full cloud
     as ~10 MB/s and "not recommended" across compute units — a browser on
     Wi-Fi is a harsher client than that. */
  const lidarTopic = have.has(T.lidarDS) ? T.lidarDS : T.lidar;
  if(lidarTopic===T.lidarDS) log("ใช้ LiDAR แบบ downsampled (เบากว่ามาก)","i");

  const want=[
    [T.camRGB,200],[T.camCenter,200],[T.camRear,200],[T.camSL,300],[T.camSR,300],
    [T.depth,150],[lidarTopic,150],[T.imu,100],[T.pmu,1000],
    [T.odom,100],[T.odomMap,100],[T.odomLeg,100],
    /* Joint state drives the Live figure through the real URDF chain. The
       robot publishes these per limb at up to 500 Hz; 100 ms is plenty for a
       pose readout and keeps the socket quiet. */
    [T.jointsArm,100],[T.jointsLeg,100],[T.jointsHead,150],
    [T.jointsWaist,150],[T.jointsHand,300],
  ];
  let n=0;
  for(const [topic,thr] of want){
    if(!have.has(topic)) continue;
    /* Zenoh owns this one right now — two sources on one panel would fight */
    if(Zenoh.owns(topic)){ log("ข้าม "+topic+" — รับผ่าน Zenoh อยู่","i"); continue; }
    ros.subscribe(topic,typeOf(topic),Math.max(thr,App.cfg.throttle));
    n++;
  }
  log(`สมัครรับข้อมูล ${n} topics`,"s");
  toast(`เชื่อมต่อแล้ว · ${n} topics`,"ok");

  if(!n){
    log("ไม่พบ topic ที่รู้จักเลย — rosbridge ต่อได้ แต่ node ของหุ่นยนต์อาจยังไม่ทำงาน","w");
  }
  /* A short topic list is the signature of rosbridge started without AgiBot's
     DDS profile: the socket works, rosapi answers, and most of the robot is
     simply invisible. Worth saying out loud, because every downstream symptom
     looks like a broken sensor instead. */
  if(App.discovered.length && App.discovered.length < 50)
    log(`เห็นแค่ ${App.discovered.length} topics — rosbridge อาจไม่ได้ source `
      + "/agibot/data/home/agi/.aima/env/bashrc (ค่า DDS ของ AgiBot)","w");

  if(typeof preflight==="function") preflight();
}

function renderDisc(){
  const f=$("#discFilter").value.toLowerCase();
  const rows=App.discovered.filter(d=>
    !f || d.name.toLowerCase().includes(f) || (d.type || "").toLowerCase().includes(f));

  $("#discCount").textContent=App.discovered.length;
  $("#discBody").innerHTML = rows.map(d=>{
    const hz=Bus.hz(d.name), used=BOUND.has(d.name);
    return `<tr>
      <td class="m">${esc(d.name)}</td>
      <td class="m" style="color:var(--tx3)">${esc(d.type)}</td>
      <td class="m" style="color:${hz>0?"var(--green)":"var(--tx3)"}">${hz>0?hz.toFixed(1):"—"}</td>
      <td>${used?'<span class="tag ok">ผูกแล้ว</span>':'<span class="tag">—</span>'}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" style="color:var(--tx3);padding:16px">ไม่พบ / no match</td></tr>`;
}
