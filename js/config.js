"use strict";
/* ============================================================================
   config.js — every X2 endpoint and command ID the dashboard knows about.
   Audited against AIMDK v1.0.0-ga424add message definitions.
   Loaded first: nothing here depends on anything else.
   ========================================================================= */

/* ---------- topics ---------- */
const T = {
  camRGB   : "/aima/hal/sensor/rgbd_head_front/rgb_image/compressed",
  camCenter: "/aima/hal/sensor/rgb_head_front_center/rgb_image/compressed",
  camRear  : "/aima/hal/sensor/rgb_head_rear/rgb_image/compressed",
  camSL    : "/aima/hal/sensor/stereo_head_front_left/rgb_image/compressed",
  camSR    : "/aima/hal/sensor/stereo_head_front_right/rgb_image/compressed",
  depth    : "/aima/hal/sensor/rgbd_head_front/depth_image",
  lidar    : "/aima/hal/sensor/lidar_chest_front/lidar_pointcloud",
  /* The same sweep, thinned on the robot. 10 Hz of full cloud is ~10 MB/s,
     which is documented as "not recommended" even for a wired cross-unit
     subscriber, let alone a browser. Preferred when the robot offers it. */
  lidarDS  : "/aima/hal/sensor/lidar_chest_front/lidar_pointcloud_down_sampling",
  imu      : "/aima/hal/imu/chest/state",
  pmu      : "/aima/hal/pmu/state",
  /* The X2 publishes joint state per limb — there is no combined
     /aima/hal/joint/state, which is what this used to point at. */
  jointsArm  : "/aima/hal/joint/arm/state",
  jointsLeg  : "/aima/hal/joint/leg/state",
  jointsHead : "/aima/hal/joint/head/state",
  jointsHand : "/aima/hal/joint/hand/state",
  jointsWaist: "/aima/hal/joint/waist/state",
  /* SLAM publishes its pose on two different topics depending on what it is
     doing. /slam/lidar_odom carries the LOCALIZATION result and only runs
     after start_relocalization against a stored map; while you are MAPPING it
     stays silent and the pose comes out of /slam/mapping/odometry instead.
     Subscribing only to the first is why SLAM looked dead during mapping. */
  odom     : "/slam/lidar_odom",
  odomMap  : "/slam/mapping/odometry",
  /* Leg odometry is always running; /slam/lidar_odom only publishes once SLAM
     has been started. Same type, so it stands in until localization is up. */
  odomLeg  : "/aima/mc/leg_odometry",
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
  /* Read-only diagnostics. GetSystemState answers the question the log could
     never answer before: IN_READY(1) means services will be executed, and
     IN_MOVE(2)/IN_ROLLBACK(3)/IN_FALLBACK_MOVE(5) mean every call is refused
     no matter how well formed it is. */
  getState  : "/aimdk_5Fmsgs/srv/GetSystemState",
  getInputSrc: "/aimdk_5Fmsgs/srv/GetCurrentInputSource",
};

/* SystemStatus.value, from aimdk_msgs sm/msg/SystemStatus.msg */
const SYS_STATE = {0:"INITIAL",1:"READY",2:"MOVE (ปฏิเสธ service)",
  3:"ROLLBACK (ปฏิเสธ service)",4:"FALLBACK",5:"FALLBACK_MOVE (ปฏิเสธ service)"};

/* Preset motions. Each row is [label, motion, area] — area is NOT derivable
   from the motion id, which is what this used to assume. The X2 docs
   (5.1.4 Preset Motion Control) give the exact pairs: 1 = left arm,
   2 = right arm, 3 = both arms, 11 = whole body. Sending a whole-body motion
   with area 2 is a different request, and the robot answers it with a
   non-zero code rather than moving.

   Every motion below is from the documented table. The robot must be in
   Stable Stand before any of them will execute. */
const ARM = [
  ["✋ ยกมือขวา",1001,2],   ["✋ ยกมือซ้าย",1001,1],
  ["👋 โบกมือขวา",1002,2],  ["👋 โบกมือซ้าย",1002,1],
  ["🤝 จับมือขวา",1003,2],  ["🤝 จับมือซ้าย",1003,1],
  ["😘 ส่งจูบขวา",1004,2],  ["😘 ส่งจูบซ้าย",1004,1],
  ["💗 ทำหัวใจสองมือ",1007,3], ["💗 หัวใจมือขวา",1007,2],
  ["🙏 ไฮไฟฟ์ขวา",1008,2],  ["🙏 ไฮไฟฟ์ซ้าย",1008,1],
  ["🙌 ยกสองมือ",1010,3],   ["🙌 ยกมือขวาสูง",1010,2],
  ["🖐 โบกมือระดับอก",1011,2],
  ["🫡 เคารพ",1013,2],
  ["🙇 โค้งคำนับ",3001,11], ["🤚 โบกมือเบา ๆ",3007,11],
  ["🤗 กอด",3008,11],       ["❌ ไขว้แขน",3009,11],
  ["📣 เชียร์",3011,11],    ["👏 ตบมือ",3017,11],
  ["🤔 เกาหัว",3024,11],    ["👋 โบกมือลา",3031,11],
];

/* Not in the documented table. The firmware may still accept them — the v1
   dashboard used several — but the SDK explicitly says not to rely on
   undocumented motions, so they are marked in the UI and in the log. */
const UNVERIFIED = new Set([2001,3002,3003,3004,3006,3010,3012,3013,3014,
                            3015,3016,3018,3019,3025,4001,4002]);

const HEAD = [["😌 พยักหน้า",4001,4],["🙂‍↔️ ส่ายหน้า",4002,4]];

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
  /* MUST stay "none" on this robot. rosbridge 2.0.1's CBOR encoder walks a
     message with getattr/get_fields_and_field_types and blows up the moment it
     meets a numpy array inside a sub-message:

       AttributeError: 'numpy.ndarray' object has no attribute
                       'get_fields_and_field_types'
       (rosbridge_library/internal/cbor_conversion.py:54)

     It then retries per frame, so one image or point cloud floods the log --
     17 MB in seconds, measured -- until the process is killed. The dropped
     WebSocket and the "first service call works, then nothing" behaviour were
     both this, not the robot. "cbor" is still selectable in the settings for a
     patched rosbridge; the code path is kept and tested. */
  compression : "none",
  throttle : 100,
  maxPts   : 14000,
};
