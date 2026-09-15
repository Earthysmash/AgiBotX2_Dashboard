"use strict";
/* ============================================================================
   panels-camera.js — the five camera tiles, plus the procedural "office room"
   that stands in for a real feed while the Demo tab is on screen.

   Each camera owns two views (one per tab). Live JPEG frames land in an <img>;
   simulated frames are painted into a <canvas> behind it.
   ========================================================================= */

const camState = {};   /* id -> { live:{...}, demo:{...} } */
let bigCam = null;

function drawRoom(ctx,w,h,hue,phase,fish){
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,`hsl(${hue},14%,26%)`);
  g.addColorStop(.55,`hsl(${hue},12%,17%)`);
  g.addColorStop(1,`hsl(${hue},10%,10%)`);
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  const hz=h*0.58;
  ctx.fillStyle=`hsl(${hue},9%,13%)`; ctx.fillRect(0,hz,w,h-hz);
  ctx.strokeStyle=`hsl(${hue},12%,30%)`; ctx.lineWidth=1;

  /* perspective floor */
  for(let i=-6;i<=6;i++){
    ctx.beginPath(); ctx.moveTo(w/2+i*w*0.09,hz); ctx.lineTo(w/2+i*w*0.55,h); ctx.stroke();
  }
  for(let i=1;i<7;i++){
    const y=hz+(h-hz)*Math.pow(i/7,1.9);
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }

  /* wall furniture drifting with phase = fake parallax */
  const off=Math.sin(phase*0.35)*w*0.05;
  ctx.fillStyle=`hsl(${hue},10%,22%)`;
  ctx.fillRect(w*0.06+off,hz-h*0.30,w*0.20,h*0.30);
  ctx.fillRect(w*0.72+off,hz-h*0.22,w*0.22,h*0.22);
  ctx.fillStyle=`hsl(${(hue+40)%360},30%,34%)`;
  ctx.fillRect(w*0.40+off,hz-h*0.17,w*0.17,h*0.17);

  /* ceiling lights */
  for(let i=0;i<3;i++){
    const x=w*(0.2+i*0.3)+off*0.5;
    const gl=ctx.createRadialGradient(x,h*0.10,1,x,h*0.10,w*0.13);
    gl.addColorStop(0,"#ffffff55"); gl.addColorStop(1,"#ffffff00");
    ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(x,h*0.10,w*0.13,0,7); ctx.fill();
  }

  if(fish){                                     /* vignette for the rear cam */
    const v=ctx.createRadialGradient(w/2,h/2,h*0.22,w/2,h/2,h*0.72);
    v.addColorStop(0,"#0000"); v.addColorStop(1,"#000e");
    ctx.fillStyle=v; ctx.fillRect(0,0,w,h);
  }

  ctx.globalAlpha=.05;                          /* sensor noise */
  for(let i=0;i<90;i++){
    ctx.fillStyle=Math.random()<.5?"#fff":"#000";
    ctx.fillRect(Math.random()*w,Math.random()*h,2,2);
  }
  ctx.globalAlpha=1;
}

/* Build one grid of tiles into `hostId`, registered under view key `key`. */
function buildCams(hostId,key){
  const box=document.getElementById(hostId);
  if(!box) return;
  box.innerHTML="";
  CAMS.forEach(c=>{
    const d=document.createElement("div");
    d.className="cam";
    d.innerHTML=`<div class="fr"><canvas width="320" height="240"></canvas>
      <img alt="" style="display:none"><span class="fps">0.0</span></div>
      <div class="nm">${esc(c.name)}</div>`;
    d.onclick=()=>openCam(c);
    box.appendChild(d);

    (camState[c.id] = camState[c.id] || {})[key] = {
      cv:d.querySelector("canvas"), img:d.querySelector("img"),
      fps:d.querySelector(".fps"), phase:Math.random()*30,
    };
  });
}

/* Live compressed frames arrive base64 -> straight into the <img>. Registered
   once, at boot, regardless of how many views exist. */
function bindCamTopics(){
  CAMS.forEach(c=>{
    Bus.on(c.topic,msg=>{
      if(App.sim || !msg || (!msg.format && !msg.data)) return;
      const st=(camState[c.id] || {}).live;
      if(!st) return;
      st.cv.style.display="none"; st.img.style.display="block";
      st.img.src="data:image/jpeg;base64,"+msg.data;
      st.fps.textContent=Bus.hz(c.topic).toFixed(1);
    });
  });
}

function tickCams(dt){
  const key = App.tab==="demo" ? "demo" : "live";
  CAMS.forEach(c=>{
    const st=(camState[c.id] || {})[key];
    if(!st) return;
    if(!App.sim){
      /* Live tab with no frames yet: leave the canvas showing its blank
         backdrop rather than animating a fake room the operator might trust. */
      if(!st.img.src){ st.fps.textContent="0.0"; }
      return;
    }
    st.phase+=dt;
    st.cv.style.display="block"; st.img.style.display="none";
    drawRoom(st.cv.getContext("2d"),320,240,c.hue,st.phase+(c.id==="rear"?9:0),c.id==="rear");
    st.fps.textContent="30.0";
  });
}

function openCam(c){
  bigCam=c;
  $("#camTitle").textContent=c.name;
  $("#camModal").classList.add("on");
}
function tickBigCam(){
  if(!bigCam || !$("#camModal").classList.contains("on")) return;
  const cv=$("#camBig"), ctx=cv.getContext("2d");
  if(App.sim){
    drawRoom(ctx,cv.width,cv.height,bigCam.hue,Mock.t,bigCam.id==="rear");
  }else{
    const st=(camState[bigCam.id] || {}).live;
    if(st && st.img.src) ctx.drawImage(st.img,0,0,cv.width,cv.height);
  }
}
