"use strict";
/* ============================================================================
   config.js — every X2 endpoint and command ID the dashboard knows about.
   Audited against AIMDK v1.0.0-ga424add message definitions.
   Loaded first: nothing here depends on anything else.
   ========================================================================= */

/* ---------- topics ---------- */
const T = {
  camRGB   : "/aima/hal/sensor/rgbd_head_front/rgb_image/compressed",
  camCenter: "/aima/hal/sensor/rgb_head_rear/rgb_image/compressed",
  camRear  : "/aima/hal/sensor/rgb_head_rear/rgb_image/compressed",
  camSL    : "/aima/hal/sensor/stereo_head_front_left/rgb_image/compressed",
  camSR    : "/aima/hal/sensor/stereo_head_front_right/rgb_image/compressed",
  depth    : "/aima/hal/sensor/rgbd_head_front/depth_image",
  lidar    : "/aima/hal/sensor/lidar_chest_front/lidar_pointcloud",
  imu      : "/aima/hal/imu/chest/state",
  pmu      : "/aima/hal/pmu/state",
  joints   : "/aima/hal/joint/state",
  odom     : "/slam/lidar_odom",
  slamCmd  : "/integrated_command",
  reloc    : "/relocalization_pose",
  vel      : "/aima/mc/locomotion/velocity",
};

/* ---------- services ---------- */
const S = {
  setAction : "/aimdk_5Fmsgs/srv/SetMcAction",
  getAction : "/aimdk_5Fmsgs/srv/GetMcAction",
  inputSrc  : "/aimdk_5Fmsgs/srv/SetMcInputSource",
  preset    : "/aimdk_5Fmsgs/srv/SetMcPresetMotion",
  tts       : "/aimdk_5Fmsgs/srv/PlayTts",
  emoji     : "/face_ui_proxy/play_emoji",
  getMap    : "/aimdk_5Fmsgs/srv/GetStoredMapByName",
};

/* Preset motion IDs — verbatim from aimdk_msgs/msg/McPresetMotion.msg */
const ARM = [
  ["✋ ยกมือ",1001],["👋 โบกมือ",1002],["🤚 โบกมือเบา ๆ",3007],["🙌 โบกมือหน้าอก",3010],
  ["🔄 หันตัวโบกมือ",2001],["🤝 จับมือ",1003],["❌ ขวางหน้า",3009],["👍 ไลค์",3002],
  ["✌️ ท่า YE",3003],["👏 ตบมือ",1008],["🙏 ตบมือ 2",3015],["🫡 เคารพ",1013],
  ["🙇 โค้งคำนับ",3001],["🤗 กอด",3008],["👊 ชนกำปั้น",1009],["📣 เชียร์",3011],
  ["😘 ส่งจูบ",1004],["💋 จูบต่ำ",3012],["💗 ทำหัวใจ",3004],["😢 ท่าเศร้า",3006],
  ["🗣 ท่าพูด",3016],["📸 โพสถ่ายรูป",3018],["🎞 โพส 3 จังหวะ",3019],
  ["💃 เต้น 1",3013],["🕺 เต้น 2",3014],
];
const HEAD = [["😌 พยักหน้า",4001],["🙂‍↔️ ส่ายหน้า",4002]];

/* Emoji IDs: anchors documented in py_examples/play_emoji.py; the rest follow
   its 10-step spacing and are UNVERIFIED until confirmed on hardware. */
const FACE = [
  ["😀 ดีใจ",90],["😄 ดีใจมาก",100],["🥰 ปลื้มปิติ",110],["😍 ชื่นชม",200],
  ["🥺 น่ารัก",120],["😢 เศร้า",130],["😔 เดินใจ",140],["😠 โกรธ",150],
  ["😡 โกรธมาก",190],["😲 ตกใจ",160],["😳 ขวย",170],["🤔 คิด",180],
  ["😐 จริงจัง",70],["😑 เบื่อ",60],["😴 ง่วง",80],["😉 กะพริบตา",1],
];

/* ---------- camera tiles ---------- */
const CAMS = [
  {id:"rgbd",  name:"หน้า (RGBD)",   topic:T.camRGB,   hue:210},
  {id:"center",name:"หน้า (Center)", topic:T.camCenter,hue:200},
  {id:"rear",  name:"หลัง",          topic:T.camRear,  hue:26},
  {id:"sl",    name:"Stereo ซ้าย",   topic:T.camSL,    hue:205},
  {id:"sr",    name:"Stereo ขวา",    topic:T.camSR,    hue:205},
];

/* Defaults for the connection form. The IP is the X2's PC2 as shipped; the
   setup guide lets the operator override it and writes the result back here. */
const DEFAULTS = {
  url      : "ws://10.0.1.41:9090",
  ip       : "10.0.1.41",
  user     : "agibot",
  throttle : 100,
  maxPts   : 14000,
};
