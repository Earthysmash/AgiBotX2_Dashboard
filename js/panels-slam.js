"use strict";
/* ============================================================================
   panels-slam.js — live message decoders plus the occupancy grid.

   GetStoredMapByName returns metadata and a file path, not grid data, and the
   X2 publishes no /map topic. So the map panel builds its own grid by
   splatting LiDAR into the odom frame. That is a live exploration view — it is
   not the robot's stored map, and it should not be read as one.
   ========================================================================= */

/* ------------------------------------------------------------- DECODERS */
function parseCloud(msg){
  if(msg.__mock) return;
  const f={}; (msg.fields || []).forEach(x=>f[x.name]=x);
  if(!f.x || !f.y || !f.z || !msg.data) return;

  const bytes=b64bytes(msg.data);
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const step=msg.point_step, n=(bytes.length/step)|0;
  const stride=Math.max(1,Math.ceil(n/App.cfg.maxPts));
  const out=[];
  for(let i=0;i<n;i+=stride){
    const o=i*step;
    const x=dv.getFloat32(o+f.x.offset,true),
          y=dv.getFloat32(o+f.y.offset,true),
          z=dv.getFloat32(o+f.z.offset,true);
    if(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z)) out.push([x,y,z]);
  }
  App.cloud=out;
}
Bus.on(T.lidar,parseCloud);

Bus.on(T.depth,m=>{
  if(!m.data) return;
  const bytes=b64bytes(m.data);
  App.depthW=m.width; App.depthH=m.height;
  /* 16UC1 is the standard depth encoding: millimetres, little-endian */
  App.depthBuf=new Uint16Array(bytes.buffer,bytes.byteOffset,(bytes.length/2)|0);
});

Bus.on(T.odom,m=>{
  if(m.__mock) return;
  const p=m.pose?.pose?.position, q=m.pose?.pose?.orientation;
  if(!p) return;
  App.pose={x:p.x, y:p.y, yaw:q ? quatToRPY(q).yaw : 0};
});

/* --------------------------------------------------------- OCCUPANCY GRID */
function ensureGrid(){
  if(App.mapGrid) return;
  App.mapW=483; App.mapH=556; App.mapRes=0.05;
  App.mapGrid=new Int8Array(App.mapW*App.mapH).fill(-1);
}

function splatCloudIntoMap(){
  ensureGrid();
  const {x:rx,y:ry,yaw}=App.pose, c=Math.cos(yaw), s=Math.sin(yaw);
  const cx=App.mapW/2, cy=App.mapH/2, k=1/App.mapRes;

  for(const p of App.cloud){
    if(p[2]<-0.9 || p[2]>0.8) continue;
    const wx=rx+p[0]*c-p[1]*s, wy=ry+p[0]*s+p[1]*c;
    const gx=(cx+wx*k)|0, gy=(cy-wy*k)|0;
    if(gx<1||gy<1||gx>=App.mapW-1||gy>=App.mapH-1) continue;
    App.mapGrid[gy*App.mapW+gx]=100;
    /* carve free space along the ray, cheaply */
    for(let t=0.3;t<0.95;t+=0.14){
      const fx=(cx+(rx+(wx-rx)*t)*k)|0, fy=(cy-(ry+(wy-ry)*t)*k)|0;
      if(fx>0&&fy>0&&fx<App.mapW&&fy<App.mapH && App.mapGrid[fy*App.mapW+fx]===-1)
        App.mapGrid[fy*App.mapW+fx]=0;
    }
  }
}

function drawMap(){
  const cv=P("map"); if(!cv) return;
  const ctx=cv.getContext("2d"), w=cv.width, h=cv.height;
  const showEl=P("mapShow");
  ctx.fillStyle="#141a26"; ctx.fillRect(0,0,w,h);

  if((showEl && !showEl.checked) || !App.mapGrid){
    ctx.fillStyle="#3b4761"; ctx.font="13px sans-serif"; ctx.textAlign="center";
    ctx.fillText(App.mapGrid ? "ปิดการแสดงแผนที่"
                             : "ยังไม่มีแผนที่ — กด “เริ่มสร้างแผนที่”", w/2, h/2);
    ctx.textAlign="left";
    setTx("mapInfo","— × — · — ม./ช่อง");
    return;
  }

  const sc=Math.min(w/App.mapW,h/App.mapH);
  const ox=(w-App.mapW*sc)/2, oy=(h-App.mapH*sc)/2;
  const img=ctx.createImageData(App.mapW,App.mapH);
  for(let i=0;i<App.mapGrid.length;i++){
    const v=App.mapGrid[i], o=i*4;
    if(v===100){ img.data[o]=45; img.data[o+1]=252; img.data[o+2]=140; }
    else if(v===0){ img.data[o]=20; img.data[o+1]=26; img.data[o+2]=38; }
    else { img.data[o]=32; img.data[o+1]=40; img.data[o+2]=56; }
    img.data[o+3]=255;
  }
  const tmp=document.createElement("canvas");
  tmp.width=App.mapW; tmp.height=App.mapH;
  tmp.getContext("2d").putImageData(img,0,0);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(tmp,ox,oy,App.mapW*sc,App.mapH*sc);

  /* robot marker + heading */
  const rx=ox+(App.mapW/2+App.pose.x/App.mapRes)*sc;
  const ry=oy+(App.mapH/2-App.pose.y/App.mapRes)*sc;
  ctx.fillStyle="#ef4444"; ctx.beginPath(); ctx.arc(rx,ry,5,0,7); ctx.fill();
  ctx.strokeStyle="#ef4444"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(rx,ry);
  ctx.lineTo(rx+Math.cos(-App.pose.yaw)*15, ry+Math.sin(-App.pose.yaw)*15);
  ctx.stroke();

  setTx("mapInfo",`${App.mapW}×${App.mapH} · ${App.mapRes} ม./ช่อง`+
    (App.mapping ? " · ● กำลังสร้าง" : ""));
}
