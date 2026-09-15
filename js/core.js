"use strict";
/* ============================================================================
   core.js — shared state, DOM helpers, logging, and the event bus that keeps
   the panels ignorant of where their data came from.
   ========================================================================= */

/* ------------------------------------------------------------------- UTILS */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v,a,b) => v<a ? a : v>b ? b : v;
const lerp  = (a,b,t) => a+(b-a)*t;
const now   = () => performance.now()/1000;

/* Escape anything that came from the robot or an input field before it goes
   near innerHTML. Topic names and service errors are not ours to trust. */
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function toast(msg,kind=""){
  const d=document.createElement("div"); d.className="tst "+kind; d.textContent=msg;
  $("#toast").appendChild(d); setTimeout(()=>d.remove(),2600);
}
function log(msg,lvl="i"){
  const el=$("#logs"); if(!el) return;
  const t=new Date().toTimeString().slice(0,8);
  const d=document.createElement("div");
  d.innerHTML=`<span class="t">${t}</span> <span class="${lvl}">${esc(msg)}</span>`;
  el.appendChild(d); el.scrollTop=el.scrollHeight;
  while(el.children.length>400) el.firstChild.remove();
}
function b64bytes(b64){
  const s=atob(b64), n=s.length, a=new Uint8Array(n);
  for(let i=0;i<n;i++) a[i]=s.charCodeAt(i);
  return a;
}

/* --------------------------------------------------------------- APP STATE */
const App = {
  /* sim is derived from the active tab now, not from a header switch */
  sim:false, motion:false, estop:false, tab:"live",
  /* "auto" follows the tab — dark for the instruments, light for the guide,
     which is a document and reads better on white. "dark"/"light" pin it. */
  themeMode:"auto",
  cfg:{url:DEFAULTS.url, throttle:DEFAULTS.throttle, maxPts:DEFAULTS.maxPts,
       ip:DEFAULTS.ip, user:DEFAULTS.user, autoRetry:true},
  cloud:[], depthBuf:null, depthW:0, depthH:0,
  imu:{w:1,x:0,y:0,z:0},
  pose:{x:0,y:0,yaw:0}, joints:{}, mapping:false,
  mapGrid:null, mapW:0, mapH:0, mapRes:0.05,
  discovered:[],
};

/* -------------------------------------------------------- PANEL RESOLUTION
   The Demo tab owns a second, parallel set of panel nodes whose ids carry a
   `d_` prefix. Renderers ask for the logical id and get whichever set is
   currently on screen, so not one drawing function needs to know tabs exist. */
function P(id){
  return document.getElementById(App.tab==="demo" ? "d_"+id : id);
}
function setTx(id,txt){ const e=P(id); if(e) e.textContent=txt; }

/* ----------------------------------------------------------------- THE BUS
   The seam between data source and panels. Two sources can be alive at once —
   a live rosbridge socket and the mock engine — so emit() drops whichever one
   is not currently driving the UI. Without that gate, live LiDAR frames would
   overwrite App.cloud mid-demo and the showcase would flicker. */
const Bus = {
  m:new Map(), rate:new Map(),
  on(t,fn){ (this.m.get(t) || this.m.set(t,[]).get(t)).push(fn); },
  emit(t,msg,src="live"){
    /* Rate is counted before the gate: the topic list should report what the
       robot is genuinely sending, even while the Demo tab is on screen. */
    const r=this.rate.get(t) || {n:0,t0:now(),hz:0};
    r.n++; const dt=now()-r.t0;
    if(dt>=1){ r.hz=r.n/dt; r.n=0; r.t0=now(); }
    this.rate.set(t,r);

    if(App.sim ? src!=="mock" : src!=="live") return;

    (this.m.get(t) || []).forEach(fn=>{ try{ fn(msg); }catch(e){ console.error(t,e); } });
  },
  hz(t){ return (this.rate.get(t) || {hz:0}).hz; }
};

/* ------------------------------------------------------------ PREFERENCES
   Remembering the rosbridge URL matters more than it sounds: the whole point
   of booting in real mode is that a returning operator gets straight to work. */
const Prefs = {
  key:"x2cc.prefs",
  load(){
    try{
      const p=JSON.parse(localStorage.getItem(this.key) || "{}");
      if(p.url)   App.cfg.url  = p.url;
      if(p.ip)    App.cfg.ip   = p.ip;
      if(p.user)  App.cfg.user = p.user;
      if(p.theme) App.themeMode = p.theme;
      if(p.lang)  document.body.setAttribute("data-lang",p.lang);
      if(typeof p.autoRetry === "boolean") App.cfg.autoRetry = p.autoRetry;
    }catch{ /* corrupt or blocked storage is not worth failing boot over */ }
  },
  save(){
    try{
      localStorage.setItem(this.key, JSON.stringify({
        url:App.cfg.url, ip:App.cfg.ip, user:App.cfg.user, autoRetry:App.cfg.autoRetry,
        theme:App.themeMode,
        lang:document.body.getAttribute("data-lang") || "both",
      }));
    }catch{}
  }
};

/* Pull the host out of a ws:// URL, and build one back from an IP. The setup
   guide and the settings modal both need to stay in step with each other. */
function ipFromUrl(url){
  const m=/^wss?:\/\/([^:/]+)/.exec(String(url).trim());
  return m ? m[1] : "";
}
function urlFromIp(ip,port=9090){ return `ws://${String(ip).trim()}:${port}`; }
