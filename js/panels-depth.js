"use strict";
/* ============================================================================
   panels-depth.js — the depth camera view.

   Live frames are 16UC1: one unsigned 16-bit millimetre reading per pixel,
   little-endian. Zero means "no return" and is painted near-black rather than
   as a very close object, which would otherwise read as a wall in your face.
   ========================================================================= */

/* t = 0 (near) -> red, through yellow/green/cyan, to 1 (far) -> blue.
   Matches the on-canvas legend: ใกล้ ● แดง — ● น้ำเงิน ไกล */
function depthColor(t){
  const h=clamp(t,0,1)*240, c=0.95, x=c*(1-Math.abs((h/60)%2-1)), m=0.5-c/2;
  let r,g,b;
  if(h<60){ r=c; g=x; b=0; }
  else if(h<120){ r=x; g=c; b=0; }
  else if(h<180){ r=0; g=c; b=x; }
  else if(h<240){ r=0; g=x; b=c; }
  else { r=0; g=0; b=c; }
  return [(r+m)*255|0,(g+m)*255|0,(b+m)*255|0];
}

function drawDepth(){
  const cv=P("depth"); if(!cv) return;
  const ctx=cv.getContext("2d"), w=cv.width, h=cv.height;
  let centre=0;

  if(App.sim){
    const img=ctx.createImageData(w,h), t=Mock.t;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const u=x/w-0.5, v=y/h-0.5;
      /* floor plane recedes; a doorway void in the middle; a near box low-left */
      let d = v>0.02 ? 0.55/(v+0.02) : 7.5+u*2.5;
      if(Math.abs(u)<0.14 && v<0.06 && v>-0.30) d=7.9;                /* far doorway */
      if(u>-0.42&&u<-0.22&&v>0.24&&v<0.44) d=0.85+Math.sin(t)*0.05;   /* near box */
      if(u>0.24&&u<0.46&&v>-0.06&&v<0.20) d=2.6;                      /* mid object */
      d=clamp(d+Math.sin(x*0.09+t)*0.012,0.35,8);
      const i=(y*w+x)*4, c=depthColor(clamp((d-0.35)/7.65,0,1));
      img.data[i]=c[0]; img.data[i+1]=c[1]; img.data[i+2]=c[2]; img.data[i+3]=255;
      if(Math.abs(u)<0.02 && Math.abs(v)<0.02) centre=d;
    }
    ctx.putImageData(img,0,0);

  }else if(App.depthBuf){
    const img=ctx.createImageData(w,h);
    const dw=App.depthW, dh=App.depthH, buf=App.depthBuf;
    for(let y=0;y<h;y++){
      const sy=(y*dh/h)|0;
      for(let x=0;x<w;x++){
        const sx=(x*dw/w)|0, mm=buf[sy*dw+sx], i=(y*w+x)*4;
        if(!mm){ img.data[i]=img.data[i+1]=img.data[i+2]=8; img.data[i+3]=255; continue; }
        const c=depthColor(clamp((mm/1000-0.35)/7.65,0,1));
        img.data[i]=c[0]; img.data[i+1]=c[1]; img.data[i+2]=c[2]; img.data[i+3]=255;
      }
    }
    ctx.putImageData(img,0,0);
    centre=buf[((dh/2)|0)*dw+((dw/2)|0)]/1000;

  }else{
    vizEmpty(ctx,w,h,"รอข้อมูล depth …","waiting for depth frames");
    setTx("depthAhead","ตรงหน้า — ม.");
    return;
  }

  setTx("depthAhead",`ตรงหน้า ${centre.toFixed(2)} ม.`);
}
