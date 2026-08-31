"use strict";
/* ============================================================================
   cdr.js — just enough CDR to read a ROS 2 message in the browser.

   This is the tax Zenoh charges that rosbridge does not: the bridge hands over
   the raw serialized message, so the field layout is ours to know. rosbridge
   pays this cost on the robot and gives us JSON; here we pay it per type, by
   hand, for every type we want. Two are implemented — enough to prove the pipe.

   Layout rules (RTPS/XCDR1): a 4-byte encapsulation header, then members each
   aligned to their own size, measured from the END of that header.
   ========================================================================= */

class CDR{
  constructor(bytes){
    this.b=bytes;
    this.dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    /* 0x0001 = CDR_LE, 0x0003 = PL_CDR_LE. ROS 2 on x86/ARM emits little. */
    this.le=(bytes[1]===1 || bytes[1]===3);
    this.base=4;          /* alignment origin: right after the header */
    this.o=4;             /* cursor */
  }
  align(n){ const r=(this.o-this.base)%n; if(r) this.o+=n-r; }
  need(n){ if(this.o+n>this.dv.byteLength) throw new Error("CDR: ข้อมูลสั้นเกินไป · buffer underrun"); }
  u32(){ this.align(4); this.need(4); const v=this.dv.getUint32(this.o,this.le); this.o+=4; return v; }
  i32(){ this.align(4); this.need(4); const v=this.dv.getInt32 (this.o,this.le); this.o+=4; return v; }
  f64(){ this.align(8); this.need(8); const v=this.dv.getFloat64(this.o,this.le); this.o+=8; return v; }
  str(){
    const n=this.u32();
    if(n===0) return "";
    this.need(n);
    /* the length counts the NUL that CDR writes after the characters */
    const s=new TextDecoder().decode(this.b.subarray(this.o,this.o+n-1));
    this.o+=n; return s;
  }
  skip(n){ this.need(n); this.o+=n; }
  get left(){ return this.dv.byteLength-this.o; }
}

/* ------------------------------------------------------------ COMMON PARTS */
const cdrTime  = r => ({sec:r.i32(), nanosec:r.u32()});
const cdrHdr   = r => ({stamp:cdrTime(r), frame_id:r.str()});
const cdrVec3  = r => ({x:r.f64(), y:r.f64(), z:r.f64()});
const cdrQuat  = r => ({x:r.f64(), y:r.f64(), z:r.f64(), w:r.f64()});
const cdrPose  = r => ({position:cdrVec3(r), orientation:cdrQuat(r)});
/* float64[36] — a fixed array, so no length prefix: align once, step over it */
const cdrCov36 = r => { r.align(8); r.skip(36*8); };

/* ------------------------------------------------------------------- TYPES
   Both produce the same shape rosbridge would have produced, so every panel
   downstream stays ignorant of which transport delivered the message. */
function decodeOdometry(bytes){
  const r=new CDR(bytes);
  const header=cdrHdr(r);
  const child_frame_id=r.str();
  const pose=cdrPose(r); cdrCov36(r);
  const twist={linear:cdrVec3(r), angular:cdrVec3(r)}; cdrCov36(r);
  return {header, child_frame_id, pose:{pose}, twist:{twist}};
}

function decodePoseWithCovarianceStamped(bytes){
  const r=new CDR(bytes);
  const header=cdrHdr(r);
  const pose=cdrPose(r); cdrCov36(r);
  return {header, pose:{pose}};
}

const CDR_TYPES = {
  "nav_msgs/msg/Odometry"                      : decodeOdometry,
  "geometry_msgs/msg/PoseWithCovarianceStamped": decodePoseWithCovarianceStamped,
};
