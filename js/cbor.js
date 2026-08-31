"use strict";
/* ============================================================================
   cbor.js — decoder for rosbridge's `compression: "cbor"` mode.

   With compression "none" every message is JSON, so a camera frame crosses the
   wire as base64: 4/3 the bytes, then a multi-hundred-KB JSON.parse, then a
   character-by-character base64 walk in JS. In CBOR the frame is a binary
   WebSocket message and `data` arrives as a Uint8Array we can hand straight to
   a Blob. None of those three costs is paid.

   Definite lengths only — that is what rosbridge emits. Indefinite-length
   items throw rather than silently returning half a message.
   ========================================================================= */

const CBOR_TD = new TextDecoder();

/* RFC 8746 typed arrays. rosbridge tags uint8[] fields (image data, point
   clouds) as tag 64; the rest are here so an unexpected field does not become
   a silent wrong number. Multi-byte views are copied because a CBOR byte
   string lands at whatever offset it lands at, and TypedArray views demand
   natural alignment. */
const CBOR_TAGS = {
  64:[Uint8Array,1,true],    68:[Uint8ClampedArray,1,true], 72:[Int8Array,1,true],
  65:[Uint16Array,2,false],  69:[Uint16Array,2,true],
  66:[Uint32Array,4,false],  70:[Uint32Array,4,true],
  73:[Int16Array,2,false],   77:[Int16Array,2,true],
  74:[Int32Array,4,false],   78:[Int32Array,4,true],
  81:[Float32Array,4,false], 85:[Float32Array,4,true],
  82:[Float64Array,8,false], 86:[Float64Array,8,true],
};

function cborDecode(input){
  const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let o = 0;

  const byte = () => { if(o>=dv.byteLength) throw new Error("CBOR: ข้อมูลขาด · truncated"); return dv.getUint8(o++); };

  function count(ai){
    if(ai < 24) return ai;
    if(ai === 24) return byte();
    if(ai === 25){ const v=dv.getUint16(o); o+=2; return v; }
    if(ai === 26){ const v=dv.getUint32(o); o+=4; return v; }
    if(ai === 27){ const hi=dv.getUint32(o), lo=dv.getUint32(o+4); o+=8; return hi*4294967296+lo; }
    if(ai === 31) throw new Error("CBOR: indefinite length ไม่รองรับ");
    throw new Error("CBOR: additional info "+ai+" ไม่ถูกต้อง");
  }

  function bytes(n){
    if(o+n > dv.byteLength) throw new Error("CBOR: ข้อมูลขาด · truncated");
    const b = u8.subarray(o, o+n); o += n; return b;
  }

  /* float16 — rare, but cheap to support and expensive to discover missing */
  function f16(){
    const h=dv.getUint16(o); o+=2;
    const s=(h&0x8000)?-1:1, e=(h>>10)&0x1f, f=h&0x3ff;
    if(e===0)    return s*Math.pow(2,-14)*(f/1024);
    if(e===0x1f) return f ? NaN : s*Infinity;
    return s*Math.pow(2,e-15)*(1+f/1024);
  }

  function typedArray(tag, raw){
    const spec = CBOR_TAGS[tag];
    if(!spec) return raw;                       /* unknown tag: hand back bytes */
    const [Ctor, width, little] = spec;
    if(width === 1) return new Ctor(raw.buffer, raw.byteOffset, raw.byteLength);
    const copy = raw.slice();                   /* realign before viewing */
    if(!little){                                /* big endian: swap in place */
      const d = new DataView(copy.buffer);
      for(let i=0;i<copy.byteLength;i+=width)
        for(let a=0,b=width-1;a<b;a++,b--){
          const t=d.getUint8(i+a); d.setUint8(i+a,d.getUint8(i+b)); d.setUint8(i+b,t);
        }
    }
    return new Ctor(copy.buffer, 0, copy.byteLength/width);
  }

  function item(){
    const ib = byte(), mt = ib >> 5, ai = ib & 31;
    switch(mt){
      case 0: return count(ai);
      case 1: return -1 - count(ai);
      case 2: return bytes(count(ai));
      case 3: return CBOR_TD.decode(bytes(count(ai)));
      case 4: { const n=count(ai), a=new Array(n); for(let i=0;i<n;i++) a[i]=item(); return a; }
      case 5: { const n=count(ai), m={}; for(let i=0;i<n;i++){ const k=item(); m[k]=item(); } return m; }
      case 6: { const tag=count(ai); return typedArray(tag, item()); }
      case 7:
        if(ai === 20) return false;
        if(ai === 21) return true;
        if(ai === 22) return null;
        if(ai === 23) return undefined;
        if(ai === 25) return f16();
        if(ai === 26){ const v=dv.getFloat32(o); o+=4; return v; }
        if(ai === 27){ const v=dv.getFloat64(o); o+=8; return v; }
        throw new Error("CBOR: simple value "+ai+" ไม่รองรับ");
    }
    throw new Error("CBOR: major type "+mt+" ไม่ถูกต้อง");
  }

  return item();
}
