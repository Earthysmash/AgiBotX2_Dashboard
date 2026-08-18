"use strict";
/* ============================================================================
   panels-imu.js — IMU readouts and the artificial horizon, plus the power
   telemetry that drives the status cards.
   ========================================================================= */

function quatToRPY(q){
  const {w,x,y,z}=q;
  return {
    roll : Math.atan2(2*(w*x+y*z), 1-2*(x*x+y*y)),
    pitch: Math.asin(clamp(2*(w*y-z*x),-1,1)),
    yaw  : Math.atan2(2*(w*z+x*y), 1-2*(y*y+z*z)),
  };
}

function drawHorizon(){
  const cv=P("horizon"); if(!cv) return;
  const ctx=cv.getContext("2d"), w=cv.width, h=cv.height;
  const {roll,pitch,yaw}=quatToRPY(App.imu);

  ctx.save();
  ctx.fillStyle="#05070d"; ctx.fillRect(0,0,w,h);
  ctx.beginPath(); ctx.rect(0,0,w,h); ctx.clip();
  ctx.translate(w/2,h/2); ctx.rotate(-roll); ctx.translate(0,pitch*220);
  ctx.fillStyle="#0e2340"; ctx.fillRect(-w,-h*2,w*2,h*2);     /* sky */
  ctx.fillStyle="#2a1d10"; ctx.fillRect(-w,0,w*2,h*2);        /* ground */
  ctx.strokeStyle="#5b7fb5"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-w,0); ctx.lineTo(w,0); ctx.stroke();
  ctx.strokeStyle="#31456a"; ctx.lineWidth=1;
  for(let p=-30;p<=30;p+=10){
    if(!p) continue;
    const y=p*3.9;
    ctx.beginPath(); ctx.moveTo(-22,y); ctx.lineTo(22,y); ctx.stroke();
  }
  ctx.restore();

  /* fixed aircraft-style reticle */
  ctx.strokeStyle="#f5b942"; ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(w/2-26,h/2); ctx.lineTo(w/2-8,h/2);
  ctx.moveTo(w/2+8,h/2);  ctx.lineTo(w/2+26,h/2);
  ctx.moveTo(w/2,h/2-4);  ctx.lineTo(w/2,h/2+4);
  ctx.stroke();

  setTx("rpy",`roll ${(roll*57.3).toFixed(1)}° · pitch ${(pitch*57.3).toFixed(1)}° · yaw ${(yaw*57.3).toFixed(1)}°`);
}

Bus.on(T.imu,m=>{
  const o=m.orientation || {w:1,x:0,y:0,z:0};
  App.imu={w:o.w,x:o.x,y:o.y,z:o.z};
  const av=m.angular_velocity || {x:0,y:0,z:0};
  const la=m.linear_acceleration || {x:0,y:0,z:9.81};
  setTx("imuW",(o.w ?? 0).toFixed(3));
  setTx("imuA",Math.hypot(av.x,av.y,av.z).toFixed(2));
  setTx("imuL",Math.hypot(la.x,la.y,la.z).toFixed(2));
  setTx("imuRaw",JSON.stringify(
    {orientation:o, angular_velocity:av, linear_acceleration:la},
    (k,v)=>typeof v==="number" ? +v.toFixed(5) : v, 2));
});

/* Power telemetry feeds the shared status strip, which sits outside the tab
   panes — so these are direct lookups, not P() lookups. */
Bus.on(T.pmu,m=>{
  const b=m.battery_percent ?? m.battery_level ?? 0;
  const v=m.bus_48v_voltage ?? m.voltage ?? 0;
  $("#sBatt").textContent=b.toFixed(0)+"%";
  $("#sVolt").textContent=v.toFixed(2)+" V";
  $("#battCard").style.setProperty("--c",
    b<20 ? "var(--red)" : b<40 ? "var(--amber)" : "var(--green)");
});
