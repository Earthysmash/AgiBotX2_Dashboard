"use strict";
/* ============================================================================
   mock.js — the procedural engine behind the Demo tab.

   It publishes onto the same Bus, with the same message shapes, as the real
   robot. Panels cannot tell the difference; only the "mock" source tag does.
   ========================================================================= */

const Mock = {
  t:0, room:[], gesture:null, gestureT:0,

  init(){
    /* A room outline the LiDAR "sees": walls with a doorway and a divider. */
    this.room = [[-4,-3,4,-3],[4,-3,4,5],[4,5,-4,5],[-4,5,-4,-3],[-1,1,2.4,1]];
  },

  /* distance to the nearest wall along angle a from the origin */
  ray(a){
    let best=Infinity;
    for(const [x1,y1,x2,y2] of this.room){
      const dx=Math.cos(a), dy=Math.sin(a), ex=x2-x1, ey=y2-y1;
      const den=dx*ey-dy*ex; if(Math.abs(den)<1e-9) continue;
      const t=(x1*ey-y1*ex)/den, u=(x1*dy-y1*dx)/den;
      if(t>0.05 && u>=0 && u<=1) best=Math.min(best,t);
    }
    return best===Infinity ? 12 : best;
  },

  tick(dt){
    this.t+=dt;
    const t=this.t;

    /* --- PMU --- */
    Bus.emit(T.pmu,{battery_percent:75-((t/240)%12),
                    bus_48v_voltage:51.48+Math.sin(t*.3)*.18},"mock");

    /* --- IMU: gentle standing sway --- */
    const roll=Math.sin(t*.7)*.035, pitch=Math.sin(t*.53+1)*.05, yaw=Math.sin(t*.21)*.13;
    const cr=Math.cos(roll/2),sr=Math.sin(roll/2),cp=Math.cos(pitch/2),sp=Math.sin(pitch/2),
          cy=Math.cos(yaw/2),sy=Math.sin(yaw/2);
    Bus.emit(T.imu,{
      orientation:{w:cr*cp*cy+sr*sp*sy, x:sr*cp*cy-cr*sp*sy,
                   y:cr*sp*cy+sr*cp*sy, z:cr*cp*sy-sr*sp*cy},
      angular_velocity:{x:Math.cos(t*.7)*.02,y:Math.cos(t*.53)*.03,z:Math.cos(t*.21)*.01},
      linear_acceleration:{x:Math.sin(t*1.6)*.16,y:Math.cos(t*1.3)*.13,z:9.81+Math.sin(t*2.1)*.09}
    },"mock");

    /* --- LiDAR: a 3D cloud swept from the room outline --- */
    const pts=[]; const N=2600;
    for(let i=0;i<N;i++){
      const a=(i/N)*Math.PI*2, r=this.ray(a+yaw)*(1+(Math.random()-.5)*.012);
      if(r>11) continue;
      for(let k=0;k<4;k++){
        if(Math.random()<0.45) continue;
        pts.push([Math.cos(a)*r, Math.sin(a)*r, -0.85+k*0.42+(Math.random()-.5)*.06]);
      }
    }
    for(let i=0;i<340;i++){                       /* floor returns */
      const a=Math.random()*Math.PI*2, r=Math.random()*3.2+.4;
      pts.push([Math.cos(a)*r,Math.sin(a)*r,-1.02+(Math.random()-.5)*.03]);
    }
    App.cloud=pts;
    Bus.emit(T.lidar,{__mock:true,points:pts},"mock");

    /* --- odom: slow drift so the SLAM grid actually accumulates --- */
    App.pose={x:Math.sin(t*.09)*1.5, y:Math.cos(t*.07)*1.1, yaw};
    Bus.emit(T.odom,{__mock:true},"mock");

    /* --- gesture playback window --- */
    if(this.gesture && t-this.gestureT>3.2) this.gesture=null;
    Bus.emit(T.joints,{__mock:true},"mock");
  },

  playGesture(id){ this.gesture=id; this.gestureT=this.t; },

  /* Leaving the Demo tab should not strand a half-played wave. */
  reset(){ this.gesture=null; }
};
