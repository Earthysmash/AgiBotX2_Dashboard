"use strict";
/* ============================================================================
   demo.js — the guided walkthrough.

   Same panels as the Live tab, same drawing code, but fed by Mock and wrapped
   in an explanation of what each sensor is and what you are looking at. Every
   node here carries a `d_` id prefix; P() in core.js routes the renderers to
   this set whenever the Demo tab is on screen.
   ========================================================================= */

const DEMO = [
{
  id:"cams",
  title:{th:"กล้อง 5 ตัวรอบหัว", en:"Five cameras around the head"},
  p:{
    th:"X2 มีกล้องห้าตัว: RGBD ด้านหน้า, กล้องกลาง, กล้องหลังมุมกว้าง และกล้องคู่ stereo ซ้าย-ขวา " +
       "ทั้งหมดส่งภาพออกมาเป็น JPEG บีบอัดแล้ว แดชบอร์ดจึงเอามาแสดงได้ตรง ๆ โดยไม่ต้องแปลงอะไรเพิ่ม " +
       "คลิกที่ภาพใดก็ได้เพื่อดูขนาดใหญ่",
    en:"The X2 carries five cameras: a front RGBD unit, a centre camera, a wide rear view, and a " +
       "left/right stereo pair. All of them publish pre-compressed JPEG, which is why the dashboard " +
       "can show them with no conversion step. Click any tile to enlarge it.",
  },
  facts:[
    {th:"ภาพในโหมดสาธิตนี้วาดขึ้นเอง ไม่ได้มาจากกล้องจริง", en:"These demo frames are drawn procedurally — no real camera involved."},
    {th:"ของจริงมาจาก topic <code>/rgb_image/compressed</code> ของแต่ละตัว", en:"Live frames arrive on each camera's <code>/rgb_image/compressed</code> topic."},
  ],
  viz:`<div class="cams" id="d_cams"></div>`,
},
{
  id:"lidar2d",
  title:{th:"LiDAR มองจากด้านบน", en:"LiDAR seen from above"},
  p:{
    th:"LiDAR ยิงเลเซอร์ออกไปรอบตัวแล้วจับเวลาที่แสงสะท้อนกลับ ได้ออกมาเป็นระยะห่างของทุกสิ่งรอบตัวหุ่นยนต์ " +
       "ภาพนี้คือการมองลงมาจากข้างบน จุดสีเขียวคือสิ่งที่เลเซอร์ไปโดน จุดแดงตรงกลางคือตัวหุ่นยนต์ " +
       "วงกลมจาง ๆ คือระยะทุก 1 เมตร ทำให้กะระยะได้ทันทีโดยไม่ต้องอ่านตัวเลข",
    en:"LiDAR fires laser pulses in every direction and times the reflections, giving the distance to " +
       "everything around the robot. This is the view looking straight down: green dots are whatever " +
       "the laser struck, the red dot at the centre is the robot, and the faint rings mark one-metre " +
       "intervals so you can judge distance without reading a number.",
  },
  facts:[
    {th:"แสดงเฉพาะจุดที่อยู่ในช่วงความสูงของลำตัว จึงตัดพื้นและเพดานออก", en:"Only points at torso height are drawn, which filters out floor and ceiling returns."},
    {th:"ตัวเลข Hz มุมล่างบอกว่าข้อมูลมาถี่แค่ไหน", en:"The Hz figure in the corner reports how often fresh scans arrive."},
  ],
  viz:`<div class="viz"><canvas id="d_lidar2d" width="420" height="330"></canvas>
       <div class="ov" id="d_lidar2dInfo">— pts</div></div>`,
},
{
  id:"pc3d",
  title:{th:"LiDAR แบบ 3 มิติ (Point Cloud)", en:"The same LiDAR in 3D"},
  p:{
    th:"ข้อมูลชุดเดียวกับด้านบน แต่แสดงครบทั้งสามแกน กลุ่มจุดแบบนี้เรียกว่า point cloud " +
       "สีบอกความสูง — ม่วงคือต่ำ ฟ้าคือสูง ทำให้แยกออกว่าอะไรคือพื้น อะไรคือกำแพง อะไรคือโต๊ะ " +
       "ลากเมาส์เพื่อหมุนดูรอบ ๆ กดค้าง Shift แล้วเลื่อนล้อเพื่อซูม ดับเบิลคลิกเพื่อกลับมุมเดิม",
    en:"The same data as above, but with all three axes kept. A blob of points like this is called a " +
       "point cloud. Colour encodes height — purple low, cyan high — which is what lets you tell floor " +
       "from wall from tabletop. Drag to rotate, hold Shift and scroll to zoom, double-click to reset.",
  },
  facts:[
    {th:"จำกัดจำนวนจุดต่อเฟรมไว้เพื่อไม่ให้เบราว์เซอร์ช้า ปรับได้ในหน้าตั้งค่า", en:"Points per frame are capped so the browser stays smooth; the limit is adjustable in settings."},
    {th:"ล้อเมาส์จะซูมก็ต่อเมื่อกด Shift ค้าง เพื่อไม่ให้ขัดการเลื่อนหน้าเว็บ", en:"The wheel only zooms while Shift is held, so it never hijacks page scrolling."},
  ],
  viz:`<div class="viz"><canvas id="d_pc3d" width="420" height="300"></canvas>
       <div class="ov">ลาก = หมุน · Shift+ล้อ = ซูม</div>
       <div class="ov r" id="d_pcInfo">— pts</div></div>`,
},
{
  id:"depth",
  title:{th:"กล้องวัดความลึก (Depth)", en:"The depth camera"},
  p:{
    th:"กล้องธรรมดาบอกได้แค่สี กล้อง depth บอกระยะห่างของทุกจุดในภาพ ที่นี่แปลงระยะเป็นสี — " +
       "แดงคือใกล้ ไล่ผ่านเหลืองเขียวฟ้า ไปจนน้ำเงินคือไกล ตัวเลขมุมขวาบนคือระยะของจุดกึ่งกลางภาพพอดี " +
       "ซึ่งเป็นตัวเลขที่ใช้บอกว่า “ตรงหน้ามีอะไรห่างเท่าไร”",
    en:"An ordinary camera reports colour; a depth camera reports how far away every pixel is. Here that " +
       "distance is mapped to colour — red for near, through yellow, green and cyan, to blue for far. " +
       "The figure in the corner is the distance at the exact centre of frame, which is the number that " +
       "answers \"how far is the thing straight ahead\".",
  },
  facts:[
    {th:"ข้อมูลจริงเป็นมิลลิเมตรต่อพิกเซล (รูปแบบ 16UC1)", en:"Live data is one millimetre reading per pixel, in the 16UC1 format."},
    {th:"จุดที่วัดไม่ได้จะเป็นสีดำ ไม่ใช่สีแดง เพื่อไม่ให้เข้าใจผิดว่ามีของมาจ่ออยู่", en:"Pixels with no reading are painted black, not red, so a dropout never reads as an object in your face."},
  ],
  viz:`<div class="viz"><canvas id="d_depth" width="640" height="400"></canvas>
       <div class="ov">ใกล้ <span style="color:#ef4444">●</span> — <span style="color:#3b82f6">●</span> ไกล</div>
       <div class="ov r" id="d_depthAhead">ตรงหน้า — ม.</div></div>`,
},
{
  id:"imu",
  title:{th:"IMU — หุ่นเอียงหรือเปล่า", en:"IMU — is the robot tilting?"},
  p:{
    th:"IMU คือเซนเซอร์ทรงตัว บอกว่าตอนนี้ตัวหุ่นเอียงไปทางไหนและกำลังขยับเร็วแค่ไหน " +
       "เส้นขอบฟ้าเทียมด้านล่างทำงานเหมือนมาตรวัดในเครื่องบิน เส้นกลางเอียงตามตัวหุ่น " +
       "roll คือเอียงซ้ายขวา pitch คือก้มเงย yaw คือหันซ้ายขวา",
    en:"The IMU is the balance sensor: it reports which way the body is leaning and how fast it is " +
       "moving. The artificial horizon below works like an aircraft instrument — the line tilts with " +
       "the robot. Roll is leaning sideways, pitch is nodding forward or back, yaw is turning on the spot.",
  },
  facts:[
    {th:"ค่าดิบมาเป็น quaternion สี่ตัว แล้วแปลงเป็นองศาให้อ่านง่าย", en:"Raw values arrive as a four-part quaternion and are converted to degrees for reading."},
    {th:"ถ้า roll หรือ pitch พุ่งขึ้นแรง ๆ แปลว่าหุ่นกำลังจะล้ม", en:"A sharp spike in roll or pitch is what a fall looks like as it starts."},
  ],
  viz:`<div class="kv" style="margin-bottom:9px">
         <div><b>Orientation (w)</b><u id="d_imuW">0.000</u></div>
         <div><b>Angular vel.</b><u id="d_imuA">0.00</u></div>
         <div><b>Linear accel.</b><u id="d_imuL">0.00</u></div>
       </div>
       <div class="viz"><canvas id="d_horizon" width="420" height="120"></canvas>
       <div class="ov" id="d_rpy">roll — · pitch — · yaw —</div></div>`,
},
{
  id:"pose",
  title:{th:"ท่าทางร่างกาย และการสั่งท่า", en:"Body pose, and commanding a gesture"},
  p:{
    th:"รูปคนที่เห็นคือท่าทางของหุ่นยนต์ ประกอบขึ้นใหม่ทุกเฟรมจากมุมของข้อต่อแต่ละจุด " +
       "ลองกดปุ่มท่าทางข้างล่างดู รูปจะขยับตามท่านั้นจริง ๆ ในโหมดสาธิตนี้คำสั่งไม่ได้ถูกส่งออกไปไหน " +
       "แต่ขั้นตอนทุกอย่างเหมือนของจริงทุกประการ รวมถึงต้องเปิดสวิตช์ความปลอดภัยด้านบนก่อนด้วย",
    en:"That figure is the robot's posture, rebuilt every frame from the individual joint angles. Try a " +
       "gesture button below and the figure actually performs it. In this demo nothing is transmitted " +
       "anywhere, but every step matches the real thing — including having to arm the safety switch at " +
       "the top of the page first.",
  },
  facts:[
    {th:"หมายเลขท่ามาจากไฟล์ <code>McPresetMotion.msg</code> ของ SDK ตรง ๆ", en:"Motion IDs are taken verbatim from the SDK's <code>McPresetMotion.msg</code>."},
    {th:"สีหน้าไม่ผ่านสวิตช์ความปลอดภัย เพราะแสดงบนจอเท่านั้น ตัวหุ่นไม่ขยับ", en:"Facial expressions skip the safety gate — they are screen-only and move nothing."},
  ],
  viz:`<div class="viz"><canvas id="d_pose" width="440" height="320"></canvas>
       <div class="ov">ลาก = หมุน · Shift+ล้อ = ซูม</div></div>
       <div class="ctl">
         <div class="grp"><b>ท่าทาง (มือ/แขน) <i>arm gestures</i></b><div class="btns" id="d_gArm"></div></div>
         <div class="grp"><b>ท่าทาง (หัว) <i>head</i></b><div class="btns" id="d_gHead"></div></div>
         <div class="grp"><b>สีหน้า <i>facial expression — screen only</i></b><div class="btns" id="d_gFace"></div></div>
       </div>`,
},
{
  id:"slam",
  title:{th:"SLAM — วาดแผนที่ขณะเดินสำรวจ", en:"SLAM — mapping while exploring"},
  p:{
    th:"SLAM คือการที่หุ่นยนต์วาดแผนที่ของสถานที่ไปพร้อมกับหาว่าตัวเองอยู่ตรงไหนในแผนที่นั้น " +
       "สีเขียวคือสิ่งกีดขวางที่เจอแล้ว สีเข้มคือพื้นที่ที่ตรวจแล้วว่าว่าง สีเทาคือยังไม่เคยไปถึง " +
       "จุดแดงคือตัวหุ่นและขีดที่ยื่นออกมาคือทิศที่หันหน้าอยู่ ปล่อยหน้านี้ทิ้งไว้สักครู่แล้วดูแผนที่ค่อย ๆ เต็มขึ้น",
    en:"SLAM is the robot drawing a map of a place while working out where it is on that map. Green marks " +
       "obstacles it has found, dark grey is space confirmed empty, mid-grey is territory never reached. " +
       "The red dot is the robot and the stub shows which way it faces. Leave this panel a moment and " +
       "watch the map fill itself in.",
  },
  facts:[
    {th:"X2 ไม่มี topic แผนที่ให้ตรง ๆ แผงนี้จึงสะสมเป็นตารางเองจากข้อมูล LiDAR", en:"The X2 publishes no map topic, so this panel accumulates its own grid from LiDAR."},
    {th:"แต่ละช่องในตารางกว้าง 5 เซนติเมตร", en:"Each cell in that grid is five centimetres across."},
  ],
  viz:`<div class="row" style="margin-bottom:9px">
         <button class="ab" data-act="mapStart">🅰 เริ่มสร้างแผนที่</button>
         <input type="text" id="d_mapName" value="demo_map" style="width:118px">
         <button class="ab" data-act="mapStop">🅱 หยุด+บันทึก</button>
       </div>
       <label class="sw" style="margin-bottom:9px">
         <input type="checkbox" id="d_mapShow" checked><i></i>
         <span style="font-size:11px">แสดงแผนที่</span></label>
       <div class="viz"><canvas id="d_map" width="700" height="560"></canvas>
       <div class="ov" id="d_mapInfo">— × — · — ม./ช่อง</div></div>`,
},
];

function renderDemo(){
  const host=$("#pane-demo");
  if(!host) return;

  host.innerHTML=`
    <div class="dbanner">
      <div class="bi">🎬</div>
      <div>
        <b><span class="th">โหมดสาธิต — ข้อมูลทั้งหมดเป็นของจำลอง</span><span class="en">Demo mode — every number on this page is simulated</span></b>
        <p class="th">ไม่มีการเชื่อมต่อกับหุ่นยนต์จริง ปุ่มทุกปุ่มกดได้ แต่ไม่มีคำสั่งใดถูกส่งออกไป ใช้หน้านี้เพื่อทำความเข้าใจว่าแต่ละแผงบอกอะไร ก่อนไปใช้งานจริง</p>
        <p class="en">Nothing is connected to a robot. Every button works, but no command leaves the page. Use this to learn what each panel means before working with real hardware.</p>
      </div>
      <div class="row">
        <button class="pb" type="button" data-act="goLive">
          <span class="th1">→ ไปโหมดใช้งานจริง</span><span class="en1">→ Go to live mode</span></button>
      </div>
    </div>
    <div id="demoList">${DEMO.map((d,i)=>`
      <article class="show">
        <div class="show-txt">
          <span class="step">${String(i+1).padStart(2,"0")}</span>
          <h4><span class="th">${esc(d.title.th)}</span><i class="en">${esc(d.title.en)}</i></h4>
          <p class="th">${esc(d.p.th)}</p>
          <p class="en">${esc(d.p.en)}</p>
          <ul class="facts">
            ${d.facts.map(f=>`<li class="th">${f.th}</li><li class="en">${f.en}</li>`).join("")}
          </ul>
        </div>
        <div class="show-viz">${d.viz}</div>
      </article>`).join("")}
    </div>`;

  $$('#pane-demo [data-act="goLive"]').forEach(b=>b.onclick=()=>Tabs.go("live"));
}
