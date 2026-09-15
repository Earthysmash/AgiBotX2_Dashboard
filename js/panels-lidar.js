"use strict";
/* ============================================================================
   panels-lidar.js — the top-down LiDAR sweep and the orbitable 3D point cloud.
   ========================================================================= */

/* Shared placeholder for any viewport with nothing to draw yet. Live mode now
   boots disconnected by default, so this is a state users will actually see. */
function vizEmpty(ctx,w,h,th,en){
  ctx.fillStyle="#05070d"; ctx.fillRect(0,0,w,h);
  ctx.textAlign="center";
  ctx.fillStyle="#3b4761"; ctx.font="13px sans-serif";
  ctx.fillText(th,w/2,h/2-7);
  ctx.fillStyle="#2b3448"; ctx.font="11px sans-serif";
  ctx.fillText(en,w/2,h/2+11);
  ctx.textAlign="left";
}

/* ------------------------------------------------------- LIDAR 2D top-down */
function drawLidar2D(){
  const cv=P("lidar2d"); if(!cv) return;
  const ctx=cv.getContext("2d"), w=cv.width, h=cv.height;

  if(!App.cloud.length){
    vizEmpty(ctx,w,h,"รอข้อมูล LiDAR …","waiting for LiDAR");
    setTx("lidar2dInfo","— pts");
    return;
  }

  ctx.fillStyle="#05070d"; ctx.fillRect(0,0,w,h);
  const cx=w/2, cy=h/2, scale=Math.min(w,h)/2/6.2;

  ctx.strokeStyle="#132033"; ctx.lineWidth=1;
  for(let r=1;r<=6;r++){ ctx.beginPath(); ctx.arc(cx,cy,r*scale,0,7); ctx.stroke(); }
  ctx.beginPath();
  ctx.moveTo(cx,0); ctx.lineTo(cx,h); ctx.moveTo(0,cy); ctx.lineTo(w,cy); ctx.stroke();

  ctx.fillStyle="#22c55e";
  let n=0;
  for(const p of App.cloud){
    if(p[2]<-0.9||p[2]>0.7) continue;
    const x=cx+p[0]*scale, y=cy-p[1]*scale;
    if(x<0||x>w||y<0||y>h) continue;
    ctx.fillRect(x,y,1.7,1.7); n++;
  }
  ctx.fillStyle="#ef4444"; ctx.beginPath(); ctx.arc(cx,cy,4,0,7); ctx.fill();
  setTx("lidar2dInfo",`${n} pts · ${Bus.hz(T.lidar).toFixed(1)} Hz`);
}

/* ---------------------------------------------------------- POINT CLOUD 3D */
const PC = {yaw:0.6, pitch:0.42, zoom:34, spin:true, mode:"h", drag:null,
            zmin:12, zmax:160, home:{yaw:0.6,pitch:0.42,zoom:34}};

function drawPC(){
  const cv=P("pc3d"); if(!cv) return;
  const ctx=cv.getContext("2d"), w=cv.width, h=cv.height;

  if(!App.cloud.length){
    vizEmpty(ctx,w,h,"รอข้อมูล point cloud …","waiting for point cloud");
    setTx("pcInfo","— pts");
    return;
  }

  ctx.fillStyle="#05070d"; ctx.fillRect(0,0,w,h);
  if(PC.spin) PC.yaw+=0.0042;

  const cy=Math.cos(PC.yaw), sy=Math.sin(PC.yaw),
        cp=Math.cos(PC.pitch), sp=Math.sin(PC.pitch);
  const pts=App.cloud, step=Math.max(1,Math.ceil(pts.length/App.cfg.maxPts));
  let n=0;

  for(let i=0;i<pts.length;i+=step){
    const [X,Y,Z]=pts[i];
    const x1=X*cy-Y*sy, y1=X*sy+Y*cy;
    const y2=y1*cp-Z*sp, z2=y1*sp+Z*cp;
    const d=z2+9; if(d<0.6) continue;
    const f=PC.zoom*9/d;
    const sx=w/2+x1*f, sy2=h/2-y2*f*0.62;
    if(sx<0||sx>w||sy2<0||sy2>h) continue;

    const hue = PC.mode==="h"
      ? clamp(280-(Z+1.2)*95,180,300)
      : clamp(280-Math.hypot(X,Y)*22,180,300);
    ctx.fillStyle=`hsl(${hue},82%,${clamp(72-d*1.4,34,72)}%)`;
    ctx.fillRect(sx,sy2,1.5,1.5); n++;
  }
  setTx("pcInfo",`${n} pts`);
}

/* Orbit binding shared by the point cloud and the pose figure. */
function bindOrbit(cv,obj,onZoom){
  if(!cv) return;
  cv.style.cursor="grab";
  cv.addEventListener("pointerdown",e=>{
    obj.drag={x:e.clientX,y:e.clientY};
    cv.style.cursor="grabbing";
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove",e=>{
    if(!obj.drag) return;
    obj.yaw  += (e.clientX-obj.drag.x)*0.0088;
    obj.pitch = clamp(obj.pitch+(e.clientY-obj.drag.y)*0.0075,-1.35,1.35);
    obj.drag={x:e.clientX,y:e.clientY};
  });
  const up=()=>{ obj.drag=null; cv.style.cursor="grab"; };
  cv.addEventListener("pointerup",up);
  cv.addEventListener("pointercancel",up);

  /* Wheel zooms only with Shift held. Without this the viewport swallows
     ordinary page scrolling whenever the cursor crosses a canvas, and the
     view silently zooms itself into uselessness — which matters far more now
     that the Demo tab is a long scrolling page full of canvases. */
  cv.addEventListener("wheel",e=>{
    if(!e.shiftKey) return;                       /* let the page scroll */
    e.preventDefault();
    obj.zoom=clamp(obj.zoom*(e.deltaY>0?0.9:1.1),obj.zmin||10,obj.zmax||160);
    onZoom && onZoom();
  },{passive:false});

  cv.addEventListener("dblclick",()=>{ Object.assign(obj,obj.home); });
}
