"use strict";
/* ============================================================================
   zenoh.js — experimental second transport, running beside rosbridge.

   The browser cannot be a Zenoh peer, so this talks to the REST plugin in
   zenohd: a GET whose Accept header is text/event-stream turns into a live
   subscription, which is exactly what EventSource sends. That keeps the page
   dependency-free — zenoh-ts is npm/ESM and would cost us the single-file
   build — at the price of measuring the REST path rather than the WebSocket
   one. Fine for deciding whether Zenoh is worth the full swap; not the number
   to quote for the swap itself.

   Whatever arrives is raw CDR, so cdr.js has to know the type up front. There
   is no /rosapi/topics here and no server-side throttle: both are rosbridge
   features that do not exist on this path.
   ========================================================================= */

const Zenoh = {
  es:null, connected:false, topic:"", type:"", key:"",
  n:0, bad:0, lastErr:"", lastRaw:null, t0:0,

  /* Which ROS topic this transport currently owns. rosbridge must not also
     subscribe to it, or two sources would fight over the same panel. */
  owns(t){ return this.connected && this.topic===t; },

  connect(base,key,type,topic){
    this.close();
    const decode=CDR_TYPES[type];
    if(!decode){ log("Zenoh: ไม่รู้จักชนิดข้อความ "+type,"e"); return; }

    const url=String(base).trim().replace(/\/+$/,"")+"/"+String(key).trim().replace(/^\/+/,"");
    this.topic=topic; this.type=type; this.key=key;
    this.n=0; this.bad=0; this.lastErr=""; this.t0=now();

    log("Zenoh: เปิด SSE → "+url,"i");
    try{ this.es=new EventSource(url); }
    catch(e){ log("Zenoh: URL ไม่ถูกต้อง — "+e.message,"e"); return; }

    this.es.onopen=()=>{
      this.connected=true;
      log("Zenoh: สตรีมเปิดแล้ว · stream open","s");
      toast("Zenoh เชื่อมต่อแล้ว","ok");
      zStatus();
    };

    this.es.onmessage=ev=>{
      let samples;
      try{ samples=JSON.parse(ev.data); }
      catch{ this.fail("payload ไม่ใช่ JSON"); return; }
      for(const s of (Array.isArray(samples) ? samples : [samples])){
        /* Keep the first sample verbatim. The REST plugin's JSON shape has
           moved between zenoh releases, and seeing the real thing beats
           guessing which field name this build uses. */
        if(!this.lastRaw) this.lastRaw=s;
        const bytes=zPayload(s);
        if(!bytes){ this.fail("อ่าน payload ไม่ได้ · unrecognised sample shape"); continue; }
        try{
          Bus.emit(this.topic,decode(bytes),"live");
          this.n++;
        }catch(e){ this.fail("decode: "+e.message); }
      }
      zStatus();
    };

    this.es.onerror=()=>{
      /* EventSource retries on its own; say it once, not once per attempt. */
      if(this.connected) log("Zenoh: สตรีมหลุด — กำลังลองใหม่","w");
      this.connected=false; zStatus();
    };
  },

  fail(msg){
    this.bad++;
    if(this.bad<=3 || this.bad%50===0) log("Zenoh: "+msg,"e");
    this.lastErr=msg;
  },

  close(){
    if(this.es){ this.es.onerror=null; try{ this.es.close(); }catch{} this.es=null; }
    this.connected=false; this.topic="";
    zStatus();
  },

  hz(){ const dt=now()-this.t0; return dt>0 ? this.n/dt : 0; },
};

/* The REST plugin has spelled this field `value` and `payload` depending on
   version, and encodes non-text payloads as base64. Try what we know, and
   surface the raw sample when none of it fits rather than failing silently. */
function zPayload(s){
  const v = s?.value !== undefined ? s.value
          : s?.payload !== undefined ? s.payload
          : undefined;
  if(v==null) return null;
  if(Array.isArray(v)) return new Uint8Array(v);
  if(typeof v === "string"){
    try{ return b64bytes(v); }catch{ return null; }
  }
  if(typeof v === "object" && typeof v.payload === "string"){
    try{ return b64bytes(v.payload); }catch{ return null; }
  }
  return null;
}
