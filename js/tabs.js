"use strict";
/* ============================================================================
   tabs.js — the three-way switch between Live, Demo and the setup guide.

   The tab is now the single source of truth for which data source drives the
   panels. There used to be a header toggle for this; having both a toggle and
   a tab would have meant two controls that can disagree.

   The rosbridge socket is deliberately NOT closed when you visit the Demo tab.
   Bus.emit drops the inactive source instead, so flipping back to Live is
   instant rather than a reconnect.
   ========================================================================= */

const Tabs = {
  names:["live","demo","guide"],

  go(name){
    if(!this.names.includes(name)) name="live";
    if(App.tab===name) return;

    App.tab=name;
    const sim = name==="demo";

    /* Wipe anything derived from the other source. Carrying a mock point cloud
       into Live mode would show the operator a room that is not there. */
    if(sim!==App.sim){
      App.sim=sim;
      App.cloud=[]; App.depthBuf=null; App.depthW=App.depthH=0;
      App.mapGrid=null; App.mapping=false;
      App.imu={w:1,x:0,y:0,z:0};
      Mock.reset();
    }

    $$(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab===name));
    $$(".pane").forEach(p=>p.classList.toggle("on",p.id==="pane-"+name));
    /* Status cards and the motion bar mean nothing on the guide. */
    $("#chrome").style.display = name==="guide" ? "none" : "";

    if(sim){
      setConn("โหมดสาธิต · demo","warn");
      $("#sMode").textContent="SIMULATED";
      PC.spin=true;
      App.mapping=true; ensureGrid();       /* let the map fill while reading */
      log("เข้าสู่โหมดสาธิต — ข้อมูลจำลองทั้งหมด","w");
    }else if(name==="live"){
      reflectConn();
      /* Only ask for topics if there is a socket to ask down. Otherwise this
         would log a connection failure every time the tab is touched. */
      if(ros.connected) discover();
    }

    if(location.hash.slice(1)!==name) history.replaceState(null,"","#"+name);
    window.scrollTo({top:0,behavior:"instant"});
  },

  init(){
    $$(".tab").forEach(b=>b.onclick=()=>this.go(b.dataset.tab));

    /* Alt+1/2/3 — cheap, and genuinely useful when demoing to a room. */
    document.addEventListener("keydown",e=>{
      if(!e.altKey || e.ctrlKey || e.metaKey) return;
      const i="123".indexOf(e.key);
      if(i>=0){ e.preventDefault(); this.go(this.names[i]); }
    });

    window.addEventListener("hashchange",()=>this.go(location.hash.slice(1)));

    /* Boot into Live unless a link explicitly asked for another tab. */
    const want=location.hash.slice(1);
    const start=this.names.includes(want) ? want : "live";
    App.tab="__none__";                     /* force go() to do the work */
    this.go(start);
  },
};
