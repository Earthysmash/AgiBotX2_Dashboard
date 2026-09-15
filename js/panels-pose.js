"use strict";
/* ============================================================================
   panels-pose.js — the articulated figure.

   Segments are rebuilt every frame from gesture state, so a preset motion
   actually animates the body instead of just logging a service call.
   ========================================================================= */

const RP = {yaw:0.5, pitch:0.18, zoom:1, drag:null,
            zmin:0.4, zmax:3.2, home:{yaw:0.5,pitch:0.18,zoom:1}};

/* Segment list: [a, b, thickness, shade] with a/b as [x,y,z] in metres. */
function skeleton(t,g){
  const sway=Math.sin(t*0.9)*0.012;
  let lsh=-0.15, rsh=-0.15, lel=0.25, rel=0.25, hy=0, hp=0, kn=0.12, waist=0;

  if(g){
    const p=clamp((t-Mock.gestureT)/3.2,0,1), s=Math.sin(p*Math.PI);   /* ease in/out */
    const osc=Math.sin(p*Math.PI*6);
    if([1001,1002,3007,3010,2001,3011].includes(g)){ rsh=-0.15-s*2.0; rel=0.25+osc*s*0.55; }
    if(g===1003||g===1009){ rsh=-0.15-s*1.0; rel=0.25+s*0.9; }
    if(g===3002||g===3003){ rsh=-0.15-s*1.5; rel=0.25+s*1.2; }
    if(g===1008||g===3015){ rsh=lsh=-0.15-s*1.1; rel=lel=0.25+Math.abs(osc)*s*0.5; }
    if(g===1013){ rsh=-0.15-s*1.6; rel=0.25+s*1.5; }
    if(g===3001){ waist=s*0.55; }
    if(g===3008){ rsh=lsh=-0.15-s*1.2; rel=lel=0.25+s*1.3; }
    if(g===1004||g===3012){ rsh=-0.15-s*1.8; rel=0.25+s*1.4; }
    if(g===3004){ rsh=lsh=-0.15-s*2.3; rel=lel=0.25+s*1.1; }
    if(g===3006){ hp=s*0.4; rsh=-0.15-s*0.6; }
    if(g===3016){ rsh=-0.15-s*0.9; rel=0.25+osc*s*0.3; }
    if(g===3018||g===3019){ rsh=lsh=-0.15-s*1.4; rel=lel=0.25+s*1.1; }
    if(g===3013||g===3014){
      rsh=-0.15-Math.abs(osc)*1.6; lsh=-0.15-Math.abs(osc)*1.6;
      waist=osc*0.22; kn=0.12+Math.abs(osc)*0.25;
    }
    if(g===4001) hp=s*0.45*Math.sin(p*Math.PI*5);
    if(g===4002) hy=s*0.6*Math.sin(p*Math.PI*5);
    if(g===3009){ rsh=lsh=-0.15-s*1.6; rel=lel=1.4*s; }
  }

  const S=[];
  const hip=[0,0,0.82+sway], nk=[0,0,1.30+sway];
  const wx=Math.sin(waist)*0.10;
  const chest=[wx,0,1.16+sway];

  S.push([hip,chest,17,.82]);                       /* torso */
  S.push([chest,[wx,0,nk[2]],14,.86]);

  const hd=[wx+Math.sin(hy)*0.05, Math.sin(hp)*0.05, 1.44+sway];
  S.push([[wx,0,nk[2]],hd,9,.9]);                   /* neck */
  S.push([hd,[hd[0],hd[1],hd[2]+0.10],21,.95]);     /* head */

  for(const [sgn,sh,el] of [[1,rsh,rel],[-1,lsh,lel]]){
    const sp0=[wx+sgn*0.18,0,1.24+sway];
    const ep=[sp0[0]+sgn*0.10, Math.sin(sh)*0.30, sp0[2]+Math.cos(sh)*-0.30];
    const hp2=[ep[0]+sgn*0.03, ep[1]+Math.sin(sh+el)*0.28, ep[2]+Math.cos(sh+el)*-0.28];
    S.push([sp0,ep,11,.78]); S.push([ep,hp2,9,.74]);
    S.push([hp2,[hp2[0],hp2[1]+0.02,hp2[2]-0.03],10,.9]);
  }

  for(const sgn of [1,-1]){
    const h0=[sgn*0.10,0,0.82+sway];
    const k=[sgn*0.10,Math.sin(kn)*0.12,0.44];
    const f=[sgn*0.10,Math.sin(kn)*0.16,0.05];
    S.push([h0,k,13,.7]); S.push([k,f,11,.66]);
    S.push([f,[sgn*0.10,f[1]+0.10,0.02],9,.8]);
  }
  return S;
}

function drawPose(){
  const cv=P("pose"); if(!cv) return;
  const ctx=cv.getContext("2d"), w=cv.width, h=cv.height;
  ctx.fillStyle="#05070d"; ctx.fillRect(0,0,w,h);

  const cy=Math.cos(RP.yaw), sy=Math.sin(RP.yaw),
        cp=Math.cos(RP.pitch), sp=Math.sin(RP.pitch);
  const F=118*RP.zoom, ox=w/2, oy=h*0.80;

  /* Orthographic: world Z stays screen-up so the figure reads as standing;
     the yaw-rotated Y feeds a slight vertical skew plus the depth sort key. */
  const proj=p=>{
    const x1=p[0]*cy-p[1]*sy, y1=p[0]*sy+p[1]*cy;
    return {x:ox+x1*F, y:oy-p[2]*F+y1*sp*0.42*F, d:y1*cp};
  };

  ctx.strokeStyle="#16233a"; ctx.lineWidth=1;
  for(let i=-4;i<=4;i++){
    const a=proj([i*0.4,-1.6,0]), b=proj([i*0.4,1.6,0]);
    const c=proj([-1.6,i*0.4,0]), d=proj([1.6,i*0.4,0]);
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x,c.y); ctx.lineTo(d.x,d.y); ctx.stroke();
  }

  const segs=skeleton(Mock.t,Mock.gesture)
    .map(([a,b,t,sh])=>{ const A=proj(a), B=proj(b); return {A,B,t,sh,d:(A.d+B.d)/2}; })
    .sort((p,q)=>p.d-q.d);

  ctx.lineCap="round";
  for(const s of segs){
    ctx.strokeStyle="rgba(0,0,0,.55)"; ctx.lineWidth=s.t*RP.zoom+3;
    ctx.beginPath(); ctx.moveTo(s.A.x,s.A.y); ctx.lineTo(s.B.x,s.B.y); ctx.stroke();
    const v=Math.round(150*s.sh+38);
    ctx.strokeStyle=`rgb(${v},${v+5},${v+12})`; ctx.lineWidth=s.t*RP.zoom;
    ctx.beginPath(); ctx.moveTo(s.A.x,s.A.y); ctx.lineTo(s.B.x,s.B.y); ctx.stroke();
  }
}
