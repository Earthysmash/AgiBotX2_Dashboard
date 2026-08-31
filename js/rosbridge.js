"use strict";
/* ============================================================================
   rosbridge.js — a hand-rolled rosbridge v2 client. Zero dependencies.

   HTML cannot speak DDS: the browser has no participant, no discovery, no QoS.
   rosbridge_server is the translator, and this is the half that lives in the
   page. Every message is JSON over one WebSocket.
   ========================================================================= */

class RosBridge{
  constructor(){
    this.ws=null; this.id=0; this.pending=new Map(); this.subs=new Set();
    this.connected=false; this.onstate=()=>{}; this.badFrame=false;
    this.quiet=false;   /* suppress repeat error spam while auto-retrying */
  }

  connect(url){
    this.close();
    if(!this.quiet) log("เชื่อมต่อ rosbridge → "+url,"i");
    try{ this.ws=new WebSocket(url); this.ws.binaryType="arraybuffer"; }
    catch(e){ log("URL ไม่ถูกต้อง: "+e.message,"e"); this.onstate(false,"bad-url"); return; }

    this.ws.onopen=()=>{
      this.connected=true; this.quiet=false; this.badFrame=false;
      log("rosbridge เชื่อมต่อสำเร็จ","s"); this.onstate(true);
    };
    this.ws.onclose=()=>{
      const was=this.connected;
      this.connected=false;
      if(was) log("rosbridge ปิดการเชื่อมต่อ","w");
      this.onstate(false,"closed");
    };
    this.ws.onerror=()=>{
      if(this.quiet) return;
      log("rosbridge error — ตรวจว่า rosbridge_server รันอยู่ และ IP/พอร์ตถูกต้อง","e");
    };
    this.ws.onmessage=ev=>{
      /* Two wire formats on one socket: CBOR arrives as a binary frame, plain
         JSON as text. rosbridge answers service calls and status in JSON even
         while publishing CBOR, so this cannot be decided once per connection. */
      let m;
      try{
        m = (typeof ev.data === "string") ? JSON.parse(ev.data) : cborDecode(ev.data);
      }catch(e){
        if(!this.badFrame){ this.badFrame=true; log("decode ผิดพลาด: "+e.message,"e"); }
        return;
      }
      if(m.op==="publish") Bus.emit(m.topic,m.msg,"live");
      else if(m.op==="service_response"){
        const p=this.pending.get(m.id);
        if(p){ this.pending.delete(m.id); m.result===false ? p.rej(m.values) : p.res(m.values); }
      }
      else if(m.op==="status" && m.level==="error") log("rosbridge: "+m.msg,"e");
    };
  }

  close(){
    if(this.ws){
      this.connected=false;
      this.ws.onclose=null;           /* a deliberate close is not a dropout */
      try{ this.ws.close(); }catch{}
      this.ws=null;
    }
    this.subs.clear();
  }

  send(o){ if(this.ws && this.ws.readyState===1) this.ws.send(JSON.stringify(o)); }

  subscribe(topic,type,throttle=100){
    if(this.subs.has(topic)) return;
    this.subs.add(topic);
    this.send({op:"subscribe",id:"s"+(++this.id),topic,type,
      throttle_rate:throttle,queue_length:1,
      compression:App.cfg.compression || "none"});
  }
  /* latch maps to TRANSIENT_LOCAL durability on the ROS side. It is not a
     nicety: /integrated_command's subscriber is declared TRANSIENT_LOCAL, and
     DDS refuses to match a VOLATILE publisher against it. Advertising without
     latch produces a publisher that connects to nobody and reports no error —
     start_mapping simply vanishes. */
  advertise(topic,type,latch=false){
    this.send({op:"advertise",id:"a"+(++this.id),topic,type,latch});
  }
  /* The stationary lock lives here rather than at the call sites, so it is an
     invariant of the transport: no future button can travel the robot by
     accident. E-STOP is unaffected — it publishes all-zero velocity, which is
     a stop, and a stop must always get through. */
  publish(topic,msg){
    if(App.stationary && topic===T.vel){
      const moving = ["forward_velocity","lateral_velocity","angular_velocity"]
        .some(k => Math.abs(+msg?.[k] || 0) > 1e-6);
      if(moving){
        log("ปิดกั้นคำสั่งเดิน — โหมดอยู่กับที่เปิดอยู่ · locomotion blocked","e");
        return;
      }
    }
    this.send({op:"publish",id:"p"+(++this.id),topic,msg});
  }

  /* ms is per attempt, not per request: commanding.js fires this up to eight
     times in a row the way the vendor's own examples do, so a single attempt
     hanging for 8 s just piles up dead promises behind the retry that already
     answered. */
  call(service,type,args={},ms=3000){
    return new Promise((res,rej)=>{
      if(!this.connected) return rej({message:"ไม่ได้เชื่อมต่อ"});
      const id="c"+(++this.id);
      this.pending.set(id,{res,rej});
      this.send({op:"call_service",id,service,type,args});
      setTimeout(()=>{
        if(this.pending.has(id)){ this.pending.delete(id); rej({message:"service timeout"}); }
      },ms);
    });
  }
  topics(){ return this.call("/rosapi/topics","rosapi/Topics",{}); }
}

const ros = new RosBridge();
