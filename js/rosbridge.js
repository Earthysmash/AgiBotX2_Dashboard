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
    this.connected=false; this.onstate=()=>{};
    this.quiet=false;   /* suppress repeat error spam while auto-retrying */
  }

  connect(url){
    this.close();
    if(!this.quiet) log("เชื่อมต่อ rosbridge → "+url,"i");
    try{ this.ws=new WebSocket(url); }
    catch(e){ log("URL ไม่ถูกต้อง: "+e.message,"e"); this.onstate(false,"bad-url"); return; }

    this.ws.onopen=()=>{
      this.connected=true; this.quiet=false;
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
      let m; try{ m=JSON.parse(ev.data); }catch{ return; }
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
      throttle_rate:throttle,queue_length:1,compression:"none"});
  }
  advertise(topic,type){ this.send({op:"advertise",id:"a"+(++this.id),topic,type}); }
  publish(topic,msg){ this.send({op:"publish",id:"p"+(++this.id),topic,msg}); }

  call(service,type,args={}){
    return new Promise((res,rej)=>{
      if(!this.connected) return rej({message:"ไม่ได้เชื่อมต่อ"});
      const id="c"+(++this.id);
      this.pending.set(id,{res,rej});
      this.send({op:"call_service",id,service,type,args});
      setTimeout(()=>{
        if(this.pending.has(id)){ this.pending.delete(id); rej({message:"service timeout"}); }
      },8000);
    });
  }
  topics(){ return this.call("/rosapi/topics","rosapi/Topics",{}); }
}

const ros = new RosBridge();
