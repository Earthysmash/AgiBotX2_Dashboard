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
  const want=[
    [T.camRGB,300],[T.camCenter,300],[T.camRear,300],[T.camSL,400],[T.camSR,400],
    [T.depth,200],[T.lidar,150],[T.imu,100],[T.pmu,1000],[T.odom,100],
  ];
  let n=0;
  for(const [topic,thr] of want){
    if(!have.has(topic)) continue;
    ros.subscribe(topic,typeOf(topic),Math.max(thr,App.cfg.throttle));
    n++;
  }
  log(`สมัครรับข้อมูล ${n} topics`,"s");
  toast(`เชื่อมต่อแล้ว · ${n} topics`,"ok");

  if(!n){
    log("ไม่พบ topic ที่รู้จักเลย — rosbridge ต่อได้ แต่ node ของหุ่นยนต์อาจยังไม่ทำงาน","w");
  }
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
