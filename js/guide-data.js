"use strict";
/* ============================================================================
   guide-data.js — the whole setup guide as data, Thai and English side by side.

   Kept out of the renderer on purpose: correcting a step, or adding a language,
   should never mean touching layout code.

   {IP} and {USER} are placeholders. The two inputs at the top of the guide
   rewrite every occurrence, so the reader copies commands that already carry
   their own robot's address instead of editing each one by hand.
   ========================================================================= */

const GUIDE = {

hero:{
  th:"ต่อหุ่นยนต์ AgiBot X2 ทีละขั้น",
  en:"Connecting to the AgiBot X2, one step at a time",
  p:{
    th:"หน้านี้เขียนสำหรับคนที่ไม่เคยใช้ Linux หรือ SSH มาก่อน ทำตามทีละข้อตั้งแต่บนลงล่าง " +
       "ไม่ต้องข้าม แต่ละขั้นบอกว่าจะเห็นอะไรเมื่อทำถูก และให้ทำอะไรต่อเมื่อไม่เห็นสิ่งนั้น " +
       "ใส่หมายเลข IP กับชื่อผู้ใช้ในช่องด้านบนหนึ่งครั้ง แล้วทุกคำสั่งในหน้านี้จะเปลี่ยนตามให้เอง",
    en:"This page is written for someone who has never used Linux or SSH. Work top to " +
       "bottom without skipping. Every step says what you should see when it worked, and " +
       "what to do when you do not see it. Fill in the IP address and username once at the " +
       "top and every command on the page rewrites itself to match your robot.",
  },
},

steps:[

/* ------------------------------------------------------------------ 1 */
{
  icon:"🧰",
  title:{th:"เตรียมของให้ครบก่อน", en:"Get these ready first"},
  blocks:[
    {p:{
      th:"ก่อนเริ่ม ตรวจว่ามีของครบทั้งห้าอย่างนี้ ถ้าขาดข้อใดข้อหนึ่ง ขั้นตอนถัดไปจะไม่สำเร็จ " +
         "และคุณจะไม่รู้ว่าพลาดตรงไหน",
      en:"Check you have all five things below before starting. If any one is missing the " +
         "later steps will fail, and it will not be obvious which one was at fault.",
    }},
    {list:[
      {th:"หุ่นยนต์ X2 เปิดเครื่องอยู่ และบูตเสร็จแล้ว (รอจนไฟนิ่ง ประมาณ 1–2 นาทีหลังกดเปิด)",
       en:"The X2 powered on and finished booting — wait until the lights settle, roughly 1–2 minutes."},
      {th:"สายแลน (สาย LAN / Ethernet) หัวเหลี่ยม ๆ คล้ายหัวโทรศัพท์แต่ใหญ่กว่า",
       en:"A LAN (Ethernet) cable — the squarish plug that looks like a fat telephone connector."},
      {th:"คอมพิวเตอร์ที่มีช่องเสียบสายแลน ถ้าเป็นโน้ตบุ๊กบางรุ่นไม่มีช่อง ต้องใช้หัวแปลง USB-to-LAN",
       en:"A computer with a LAN port. Many thin laptops have none — you will need a USB-to-Ethernet adapter."},
      {th:"โปรแกรมสำหรับพิมพ์คำสั่ง: Windows ใช้ PowerShell หรือ Terminal, Mac ใช้ Terminal " +
          "(ทั้งคู่มีมาให้อยู่แล้ว ไม่ต้องติดตั้งเพิ่ม)",
       en:"A place to type commands: PowerShell or Terminal on Windows, Terminal on Mac. " +
          "Both are already installed — nothing to download."},
      {th:"ชื่อผู้ใช้และรหัสผ่านของหุ่นยนต์ ขอจากคนที่ดูแลเครื่อง อย่าเดาเอง",
       en:"The robot's username and password. Ask whoever administers the robot; do not guess."},
    ]},
    {tip:{
      th:"“เปิด Terminal ยังไง” — Windows: กดปุ่ม Windows แล้วพิมพ์ powershell กด Enter. " +
         "Mac: กด Command+Space แล้วพิมพ์ terminal กด Enter. หน้าต่างดำ ๆ ที่ขึ้นมาคือที่ที่ใช้พิมพ์คำสั่งทุกข้อในหน้านี้",
      en:"How to open a terminal — Windows: press the Windows key, type powershell, press Enter. " +
         "Mac: press Command+Space, type terminal, press Enter. That black window is where every " +
         "command on this page gets typed.",
    }},
  ],
},

/* ------------------------------------------------------------------ 2 */
{
  icon:"🔌",
  title:{th:"เสียบสายแลนเข้ากับหุ่นยนต์", en:"Plug the network cable into the robot"},
  blocks:[
    {p:{
      th:"เสียบปลายสายข้างหนึ่งเข้าช่องแลนบนตัวหุ่นยนต์ อีกข้างเข้าคอมพิวเตอร์ของคุณ " +
         "ดันจนได้ยินเสียง “คลิก” เบา ๆ ถ้าดึงแล้วหลุดง่ายแปลว่ายังไม่เข้าล็อก",
      en:"Push one end into the robot's LAN port and the other into your computer. Press until " +
         "you hear a small click. If it slides out easily it is not latched.",
    }},
    {p:{
      th:"ดูไฟเล็ก ๆ ตรงมุมช่องเสียบทั้งสองฝั่ง ถ้าไฟติดหรือกะพริบ แปลว่าสายใช้ได้และสองเครื่องเจอกันแล้วในระดับสายไฟ " +
         "ถ้าไฟไม่ติดเลยทั้งสองฝั่ง ให้ลองสายเส้นอื่นก่อนทำขั้นต่อไป เพราะสายแลนเสียเป็นสาเหตุที่พบบ่อยที่สุด",
      en:"Look at the small lights beside each socket. Lit or blinking means the cable is good and " +
         "the two machines see each other electrically. If both ends stay dark, swap the cable before " +
         "going further — a dead cable is the single most common cause of everything below failing.",
    }},
    {warn:{
      th:"ถ้าหุ่นยนต์ต่ออยู่กับเราเตอร์อยู่แล้ว ไม่ต้องถอด ให้เสียบคอมของคุณเข้าเราเตอร์ตัวเดียวกันแทน " +
         "แล้วข้ามไปอ่านฝั่งขวาของขั้นตอนที่ 3",
      en:"If the robot is already plugged into a router, leave it there — plug your computer into the " +
         "same router instead, and read the right-hand column of step 3.",
    }},
  ],
},

/* ------------------------------------------------------------------ 3 */
{
  icon:"🔎",
  title:{th:"หาหมายเลข IP ของหุ่นยนต์", en:"Find the robot's IP address"},
  blocks:[
    {p:{
      th:"IP คือ “เลขที่บ้าน” ของเครื่องบนเครือข่าย คอมของคุณต้องรู้เลขนี้ถึงจะส่งข้อมูลไปถูกเครื่อง " +
         "วิธีหาขึ้นอยู่กับว่าคุณต่อแบบไหน เลือกฝั่งที่ตรงกับสถานการณ์ของคุณ",
      en:"An IP address is a machine's house number on the network. Your computer needs it to send " +
         "anything to the right place. How you find it depends on how you connected — read whichever " +
         "column matches your situation.",
    }},
    {fork:[
      {
        h:{th:"ก. ต่อสายตรงจากคอมเข้าหุ่นยนต์", en:"A. Cable straight from computer to robot"},
        blocks:[
          {p:{
            th:"แบบนี้ไม่มีใครแจกเลขให้ ทั้งสองเครื่องต้องตั้งเลขเอง หุ่นยนต์ X2 ตั้งมาจากโรงงานที่ " +
               "10.0.1.41 คุณต้องตั้งคอมของคุณให้เป็นเลขในย่านเดียวกัน เช่น 10.0.1.50 " +
               "(สามชุดแรกต้องเหมือนกัน ชุดสุดท้ายต้องต่างกัน — เหมือนบ้านคนละหลังบนถนนสายเดียวกัน)",
            en:"With a direct cable nobody hands out numbers, so both machines must be set by hand. " +
               "The X2 ships fixed at 10.0.1.41. Set your computer to a number on the same street, " +
               "for example 10.0.1.50 — first three groups identical, last group different.",
          }},
          {p:{
            th:"Windows: Settings → Network & Internet → Ethernet → IP assignment กด Edit → เลือก Manual → " +
               "เปิด IPv4 → IP address 10.0.1.50, Subnet mask 255.255.255.0 → Save",
            en:"Windows: Settings → Network & Internet → Ethernet → IP assignment → Edit → Manual → " +
               "turn on IPv4 → IP address 10.0.1.50, Subnet mask 255.255.255.0 → Save",
          }},
          {p:{
            th:"Mac: System Settings → Network → Ethernet → Details → TCP/IP → Configure IPv4 เป็น Manually " +
               "แล้วใส่เลขชุดเดียวกัน",
            en:"Mac: System Settings → Network → Ethernet → Details → TCP/IP → Configure IPv4: Manually, " +
               "then enter the same numbers.",
          }},
        ],
      },
      {
        h:{th:"ข. ต่อผ่านเราเตอร์ / Wi-Fi", en:"B. Through a router or Wi-Fi"},
        blocks:[
          {p:{
            th:"แบบนี้เราเตอร์เป็นคนแจกเลขให้ และเลขอาจเปลี่ยนได้ทุกครั้งที่เปิดเครื่องใหม่ " +
               "วิธีที่ง่ายที่สุดคือเปิดหน้าเว็บของเราเตอร์แล้วดูรายชื่อเครื่องที่ต่ออยู่ " +
               "มองหาชื่อที่มีคำว่า agibot หรือ x2",
            en:"Here the router hands out the numbers, and they can change each time something reboots. " +
               "The easiest way is to open the router's admin page and look at its list of connected " +
               "devices for a name containing agibot or x2.",
          }},
          {p:{
            th:"ถ้าเข้าหน้าเราเตอร์ไม่ได้ ให้พิมพ์คำสั่งข้างล่างในคอมของคุณ มันจะแสดงรายชื่อทุกเครื่องที่คอมคุณเพิ่งคุยด้วย",
            en:"If you cannot reach the router page, run the command below on your own computer. It lists " +
               "every machine yours has recently talked to.",
          }},
          {cmd:{lb:{th:"ดูรายชื่อเครื่องในเครือข่าย (พิมพ์ในคอมของคุณ ไม่ใช่ในหุ่นยนต์)",
                    en:"List machines on the network — run this on YOUR computer, not the robot"},
                run:"arp -a"}},
          {p:{
            th:"จะได้ตารางยาว ๆ ให้ไล่ดูเลขที่ขึ้นต้นเหมือนกับ IP ของคอมคุณ แล้วลองทีละเลขในขั้นตอนที่ 4",
            en:"You get a long table. Look for addresses that start the same way as your own computer's, " +
               "then try them one at a time in step 4.",
          }},
        ],
      },
    ]},
    {tip:{
      th:"ถ้าเข้าถึงหน้าจอหรือคีย์บอร์ดของหุ่นยนต์ได้โดยตรง วิธีที่ชัวร์ที่สุดคือพิมพ์ hostname -I " +
         "บนเครื่องหุ่นยนต์ มันจะบอก IP ของตัวเองออกมาตรง ๆ ไม่ต้องเดา",
      en:"If you can reach the robot's own screen and keyboard, the surest method is to type " +
         "hostname -I on the robot itself. It prints its own address — no guessing.",
    }},
  ],
},

/* ------------------------------------------------------------------ 4 */
{
  icon:"📡",
  title:{th:"ทดสอบว่าคอมกับหุ่นยนต์เห็นกัน", en:"Check the two machines can see each other"},
  blocks:[
    {p:{
      th:"ก่อนจะพยายามล็อกอิน ต้องรู้ก่อนว่าส่งข้อมูลถึงกันได้จริง คำสั่ง ping คือการ “ตะโกนเรียกแล้วรอเสียงตอบ” " +
         "ถ้าไม่มีเสียงตอบ ปัญหาอยู่ที่สายหรือเลข IP ไม่ใช่ที่รหัสผ่าน",
      en:"Before trying to log in, confirm the data can get there at all. ping is a shout with a wait " +
         "for the echo. No echo means the problem is the cable or the IP address — not your password.",
    }},
    {cmd:{lb:{th:"พิมพ์ในคอมของคุณ", en:"Run on your computer"},
          run:"ping {IP}"}},
    {p:{
      th:"ถ้าทำถูก จะเห็นบรรทัดขึ้นเรื่อย ๆ ว่า Reply from {IP} พร้อมตัวเลข time= สั้น ๆ นั่นคือใช้ได้แล้ว " +
         "กด Ctrl + C เพื่อหยุด",
      en:"When it works you get repeating lines reading Reply from {IP} with a small time= value. " +
         "That is success. Press Ctrl + C to stop it.",
    }},
    {p:{
      th:"ถ้าเห็น Request timed out หรือ Destination host unreachable ซ้ำ ๆ แปลว่ายังไปไม่ถึง " +
         "ให้กลับไปตรวจสายแลน ไฟที่ช่องเสียบ และเลข IP ว่าพิมพ์ถูกหรือไม่ อย่าเพิ่งไปขั้นถัดไป",
      en:"Repeating Request timed out or Destination host unreachable means nothing is getting there. " +
         "Go back and check the cable, the port lights, and whether the IP is typed correctly. " +
         "Do not move on until ping answers.",
    }},
  ],
},

/* ------------------------------------------------------------------ 5 */
{
  icon:"🔐",
  title:{th:"เข้าเครื่องหุ่นยนต์ด้วย SSH", en:"Log in to the robot with SSH"},
  blocks:[
    {p:{
      th:"SSH คือการยืมคีย์บอร์ดของคอมพิวเตอร์ในตัวหุ่นยนต์มาใช้ผ่านสายแลน สิ่งที่คุณพิมพ์จะไปทำงานบนหุ่นยนต์ " +
         "ไม่ใช่บนคอมของคุณ เหมือนนั่งอยู่หน้าเครื่องนั้นจริง ๆ",
      en:"SSH borrows the keyboard of the computer inside the robot, over the network cable. What you " +
         "type runs on the robot, not on your machine — as if you were sitting in front of it.",
    }},
    {cmd:{lb:{th:"พิมพ์ในคอมของคุณ", en:"Run on your computer"},
          run:"ssh {USER}@{IP}"}},
    {p:{
      th:"ครั้งแรกที่ต่อ จะมีข้อความยาว ๆ ถามว่า Are you sure you want to continue connecting (yes/no)? " +
         "ให้พิมพ์คำว่า yes เต็ม ๆ แล้วกด Enter — พิมพ์ y ตัวเดียวไม่พอ คำถามนี้ถามครั้งเดียวตอนแรกเท่านั้น",
      en:"The first time, a long message asks: Are you sure you want to continue connecting (yes/no)? " +
         "Type the full word yes and press Enter — a single y is not accepted. It only asks once.",
    }},
    {warn:{
      th:"ตอนพิมพ์รหัสผ่าน หน้าจอจะไม่ขึ้นอะไรเลย ไม่มีดาว ไม่มีจุด นี่คือเรื่องปกติของ Linux ไม่ใช่คีย์บอร์ดเสีย " +
         "ให้พิมพ์รหัสให้ครบแล้วกด Enter ไปเลย นี่เป็นจุดที่คนติดกันมากที่สุด",
      en:"While you type the password the screen shows nothing at all — no dots, no asterisks. That is " +
         "normal on Linux, not a broken keyboard. Type it in full and press Enter. This is the single " +
         "most common place people get stuck.",
    }},
    {p:{
      th:"เมื่อเข้าได้แล้ว ข้อความหน้าบรรทัดที่พิมพ์จะเปลี่ยนไปเป็นชื่อของหุ่นยนต์ เช่น {USER}@x2:~$ " +
         "นั่นคือสัญญาณว่าตอนนี้คุณอยู่ในเครื่องหุ่นยนต์แล้ว ทุกคำสั่งหลังจากนี้ให้พิมพ์ในหน้าต่างนี้",
      en:"Once you are in, the text at the start of the line changes to the robot's name, something like " +
         "{USER}@x2:~$. That is the signal you are now inside the robot. Every command from here on gets " +
         "typed in this same window.",
    }},
    {tip:{
      th:"อยากออกจากหุ่นยนต์กลับมาที่คอมตัวเอง พิมพ์ exit แล้วกด Enter",
      en:"To leave the robot and come back to your own computer, type exit and press Enter.",
    }},
  ],
},

/* ------------------------------------------------------------------ 6 */
{
  icon:"🤖",
  title:{th:"ตรวจว่าซอฟต์แวร์หุ่นยนต์ทำงานอยู่", en:"Check the robot's software is running"},
  blocks:[
    {p:{
      th:"หุ่นยนต์ใช้ระบบชื่อ ROS 2 ในการส่งข้อมูลระหว่างส่วนต่าง ๆ ก่อนใช้คำสั่งของ ROS ได้ ต้อง “เปิดใช้งาน” มันก่อนหนึ่งครั้งในทุกหน้าต่างใหม่ " +
         "นี่คือสาเหตุที่บางทีคำสั่งใช้ได้เมื่อวาน แต่วันนี้ขึ้นว่าไม่รู้จักคำสั่ง",
      en:"The robot uses a system called ROS 2 to move data between its parts. Before any ros2 command " +
         "works you must switch it on once in each new window. This is why a command that worked " +
         "yesterday can come back as not found today.",
    }},
    {cmd:{lb:{th:"พิมพ์ในหน้าต่างที่ SSH เข้าหุ่นยนต์แล้ว", en:"Run inside the SSH session, on the robot"},
          run:"source /opt/ros/humble/setup.bash"}},
    {p:{
      th:"คำสั่งนี้ไม่แสดงผลอะไรเลยเมื่อสำเร็จ เงียบ ๆ คือดี ถ้าขึ้นว่า No such file or directory " +
         "แปลว่า ROS ติดตั้งไว้ที่อื่นหรือใช้เวอร์ชันอื่น ให้ถามผู้ดูแลเครื่องว่าต้อง source ไฟล์ไหน",
      en:"A successful run prints nothing at all — silence is good. If it says No such file or directory, " +
         "ROS lives somewhere else or is a different version; ask your robot's administrator which file to source.",
    }},
    {cmd:{lb:{th:"ตรวจว่า ROS ตอบสนอง", en:"Confirm ROS responds"},
          run:"ros2 --version"}},
  ],
},

/* ------------------------------------------------------------------ 7 */
{
  icon:"📋",
  title:{th:"ดูรายการ topic ของหุ่นยนต์", en:"Read the robot's topic list"},
  blocks:[
    {p:{
      th:"topic คือ “ช่อง” ที่หุ่นยนต์ประกาศข้อมูลออกมาตลอดเวลา เหมือนช่องวิทยุ — ช่องหนึ่งเป็นภาพจากกล้อง " +
         "อีกช่องเป็นระยะจากเลเซอร์ LiDAR อีกช่องเป็นระดับแบตเตอรี่ ใครอยากได้ข้อมูลไหนก็ไป “จูน” ที่ช่องนั้น " +
         "แดชบอร์ดหน้านี้ก็แค่ตัวรับที่จูนหลายช่องพร้อมกัน",
      en:"A topic is a channel the robot broadcasts on, continuously, like a radio station. One channel " +
         "carries camera pictures, another the LiDAR distances, another the battery level. Anything that " +
         "wants data just tunes in. This dashboard is simply a receiver tuned to several channels at once.",
    }},
    {cmd:{lb:{th:"รายชื่อทุกช่องที่หุ่นยนต์กำลังประกาศอยู่", en:"Every channel the robot is broadcasting right now"},
          run:"ros2 topic list"}},
    {p:{
      th:"จะได้รายชื่อยาว ๆ ขึ้นต้นด้วยเครื่องหมาย / ของ X2 ส่วนใหญ่จะขึ้นต้นด้วย /aima/hal/ ซึ่งแปลว่าเป็นข้อมูลดิบจากฮาร์ดแวร์ " +
         "ถ้าเห็นแค่ /parameter_events กับ /rosout สองอันนี้เท่านั้น แปลว่า ROS ทำงานแต่ซอฟต์แวร์หลักของหุ่นยนต์ยังไม่เริ่ม — " +
         "ต้องรอให้บูตเสร็จ หรือให้ผู้ดูแลสั่งเปิดให้",
      en:"You get a long list of names beginning with a slash. On the X2 most start with /aima/hal/, " +
         "meaning raw hardware data. If the only two entries are /parameter_events and /rosout, ROS is " +
         "alive but the robot's main software has not started — wait for the boot to finish, or ask an " +
         "administrator to start it.",
    }},
    {cmd:{lb:{th:"รายชื่อพร้อมชนิดข้อมูลของแต่ละช่อง — บอกว่าช่องนั้นส่งอะไรออกมา",
              en:"The same list with each channel's message type, so you can tell what it carries"},
          run:"ros2 topic list -t"}},
    {cmd:{lb:{th:"หาเฉพาะช่องที่เกี่ยวกับ LiDAR (เปลี่ยนคำว่า lidar เป็น camera, imu, depth ได้ตามต้องการ)",
              en:"Filter to just the LiDAR channels — swap lidar for camera, imu or depth as needed"},
          run:"ros2 topic list | grep lidar"}},
    {cmd:{lb:{th:"ดูว่าช่องนั้นส่งข้อมูลจริงหรือไม่ และเร็วแค่ไหน (ตัวเลข Hz ยิ่งสูงยิ่งถี่)",
              en:"Check a channel is genuinely sending, and how fast — higher Hz means more often"},
          run:"ros2 topic hz /aima/hal/sensor/lidar_chest_front/lidar_pointcloud"}},
    {cmd:{lb:{th:"แอบดูข้อมูลจริงหนึ่งชุดจากช่องนั้น", en:"Peek at one real message from a channel"},
          run:"ros2 topic echo /aima/hal/pmu/state --once"}},
    {cmd:{lb:{th:"ดูว่าใครเป็นคนส่งและใครเป็นคนรับช่องนั้นอยู่", en:"See who publishes and who listens to a channel"},
          run:"ros2 topic info /aima/hal/imu/chest/state"}},
    {tip:{
      th:"ถ้า ros2 topic hz ค้างอยู่เฉย ๆ ไม่ขึ้นตัวเลขเลย แปลว่าช่องนั้นมีชื่ออยู่แต่ไม่มีใครส่งข้อมูลออกมาจริง ๆ " +
         "เซนเซอร์ตัวนั้นอาจยังไม่เปิด กด Ctrl + C เพื่อหยุดแล้วลองช่องอื่น",
      en:"If ros2 topic hz just sits there printing nothing, the channel exists by name but nobody is " +
         "actually sending on it — that sensor is probably not started. Press Ctrl + C and try another.",
    }},
    {p:{
      th:"ช่องที่แดชบอร์ดหน้านี้ใช้จริง ๆ มีตามนี้ ถ้าครบแปลว่าทุกแผงจะมีข้อมูลแสดง",
      en:"These are the channels this dashboard actually reads. If they are all present, every panel " +
         "will have something to show.",
    }},
    {topics:true},
  ],
},

/* ------------------------------------------------------------------ 8 */
{
  icon:"🌉",
  title:{th:"เปิด rosbridge ให้เว็บคุยกับหุ่นยนต์ได้", en:"Start rosbridge so the browser can join in"},
  blocks:[
    {p:{
      th:"หน้าเว็บพูดภาษาเดียวกับ ROS ไม่ได้โดยตรง เบราว์เซอร์ไม่มีความสามารถนั้นติดตัวมา และไม่มีวิธีอ้อม " +
         "rosbridge คือล่ามที่นั่งอยู่บนหุ่นยนต์ คอยแปลข้อมูล ROS ให้เป็นภาษาที่เว็บอ่านออก ต้องเปิดมันก่อนเสมอ",
      en:"A web page cannot speak ROS directly — the browser has no such ability built in, and there is " +
         "no way around it. rosbridge is a translator that runs on the robot and converts ROS data into " +
         "something a web page can read. It has to be started first, every time.",
    }},
    {cmd:{lb:{th:"ติดตั้ง — ทำครั้งเดียวตลอดชีพของเครื่อง (ต้องใส่รหัสผ่านอีกครั้ง)",
              en:"Install — once per robot, for good. It will ask for the password again"},
          run:"sudo apt install -y ros-humble-rosbridge-suite"}},
    {cmd:{lb:{th:"เปิดใช้งาน — ต้องทำใหม่ทุกครั้งที่เปิดหุ่นยนต์",
              en:"Start it — needed again after every robot reboot"},
          run:"ros2 launch rosbridge_server rosbridge_websocket_launch.xml"}},
    {p:{
      th:"เมื่อสำเร็จจะเห็นบรรทัดประมาณว่า Rosbridge WebSocket server started on port 9090 " +
         "แล้วหน้าต่างจะค้างอยู่แบบนั้น — อย่าปิด อย่ากด Ctrl + C เพราะ rosbridge ต้องทำงานค้างไว้ตลอดเวลาที่ใช้แดชบอร์ด " +
         "ถ้าต้องพิมพ์คำสั่งอื่น ให้เปิดหน้าต่างใหม่แล้ว ssh เข้าไปอีกรอบ",
      en:"Success looks like a line reading Rosbridge WebSocket server started on port 9090, after which " +
         "the window just sits there. Leave it. Do not press Ctrl + C — rosbridge has to keep running the " +
         "whole time you use the dashboard. If you need to type something else, open a second window and " +
         "ssh in again.",
    }},
  ],
},

/* ------------------------------------------------------------------ 9 */
{
  icon:"🖥",
  title:{th:"ต่อแดชบอร์ดหน้านี้เข้ากับหุ่นยนต์", en:"Point this dashboard at the robot"},
  blocks:[
    {p:{
      th:"ขั้นสุดท้าย กลับมาที่หน้าเว็บนี้ กดปุ่ม ⚙️ ตั้งค่า ที่มุมขวาบน ใส่ที่อยู่ข้างล่างนี้ลงในช่อง URL แล้วกดเชื่อมต่อ " +
         "หรือกดปุ่มสีเขียวข้างล่างนี้เพื่อกรอกให้อัตโนมัติ",
      en:"Last step: come back to this page, click ⚙️ ตั้งค่า at the top right, put the address below into " +
         "the URL box and press connect — or use the green button below to fill it in for you.",
    }},
    {cmd:{lb:{th:"ที่อยู่สำหรับช่อง URL", en:"The address for the URL box"},
          run:"ws://{IP}:9090"}},
    {apply:true},
    {p:{
      th:"เมื่อเชื่อมต่อสำเร็จ การ์ด “การเชื่อมต่อ” ด้านบนจะเปลี่ยนเป็นสีเขียว รายการ topic จะเด้งขึ้นมาเอง " +
         "และทุกแผงจะเริ่มมีข้อมูลจริงไหลเข้ามา ถ้าอยากเปิดรายการ topic ดูอีกทีให้กดปุ่ม 🔍 Topics บนหัวเว็บ",
      en:"On success the connection card at the top turns green, the topic list pops up by itself, and " +
         "every panel starts filling with real data. The 🔍 Topics button in the header reopens that list " +
         "any time.",
    }},
    {warn:{
      th:"ถ้าเปิดหน้านี้จากที่อยู่ที่ขึ้นต้นด้วย https:// เบราว์เซอร์จะบล็อกการต่อแบบ ws:// ทิ้งโดยไม่บอกอะไรเลย " +
         "ให้เปิดไฟล์จากเครื่องตัวเอง หรือเสิร์ฟผ่าน http:// ธรรมดา",
      en:"If you opened this page from an https:// address, the browser silently blocks plain ws:// " +
         "connections. Open the file locally instead, or serve it over ordinary http://.",
    }},
    {cmd:{lb:{th:"วิธีเสิร์ฟไฟล์แดชบอร์ดแบบง่าย (พิมพ์ในคอมของคุณ ในโฟลเดอร์ของโปรเจกต์)",
              en:"Simplest way to serve the dashboard — run on your computer, inside the project folder"},
          run:"python3 -m http.server 8777"}},
  ],
},

],

/* ---------------------------------------------------------- TROUBLESHOOTING */
trouble:[
  {sym:"ping: Request timed out",
   fix:{th:"สายแลนหลุด ไฟที่ช่องเสียบไม่ติด หรือ IP ผิด ลองสายเส้นใหม่ก่อน แล้วค่อยตรวจเลข IP อีกครั้ง",
        en:"Cable unplugged, port lights dark, or wrong IP. Swap the cable first, then re-check the address."}},
  {sym:"ssh: connect to host … port 22: Connection refused",
   fix:{th:"ไปถึงเครื่องแล้ว แต่หุ่นยนต์ไม่ได้เปิดบริการ SSH ไว้ ต้องให้ผู้ดูแลเปิดให้ด้วย sudo systemctl start ssh",
        en:"You reached the machine, but SSH is not running on it. An administrator needs to start it with sudo systemctl start ssh."}},
  {sym:"ssh: No route to host",
   fix:{th:"คอมกับหุ่นยนต์อยู่คนละย่านเลข กลับไปขั้นตอนที่ 3 แล้วตั้ง IP ของคอมให้สามชุดแรกตรงกับของหุ่นยนต์",
        en:"The two machines are on different number ranges. Go back to step 3 and set your computer so the first three groups match the robot's."}},
  {sym:"Permission denied, please try again",
   fix:{th:"ชื่อผู้ใช้หรือรหัสผ่านผิด จำไว้ว่าตอนพิมพ์รหัสหน้าจอจะไม่ขึ้นอะไรเลย ให้พิมพ์ช้า ๆ แล้วกด Enter และตรวจว่าปุ่ม Caps Lock ไม่ได้เปิดอยู่",
        en:"Wrong username or password. Remember the screen shows nothing while typing the password — type it carefully, press Enter, and check Caps Lock is off."}},
  {sym:"ros2: command not found",
   fix:{th:"ยังไม่ได้เปิดใช้งาน ROS ในหน้าต่างนี้ พิมพ์ source /opt/ros/humble/setup.bash ก่อน ต้องทำใหม่ทุกครั้งที่เปิดหน้าต่างใหม่",
        en:"ROS is not switched on in this window yet. Run source /opt/ros/humble/setup.bash first — needed in every new window."}},
  {sym:"ros2 topic list แสดงแค่ /parameter_events กับ /rosout",
   fix:{th:"ROS ทำงานแล้วแต่ซอฟต์แวร์หลักของหุ่นยนต์ยังไม่เริ่ม รอให้บูตเสร็จอีกสักครู่ หรือให้ผู้ดูแลสั่งเปิดโปรแกรมของหุ่นยนต์",
        en:"ROS is running but the robot's own software has not started. Wait for the boot to finish, or ask an administrator to launch it."}},
  {sym:"ros2 topic list ว่างเปล่าทั้งที่โปรแกรมหุ่นยนต์เปิดอยู่",
   fix:{th:"มักเกิดจาก ROS_DOMAIN_ID ไม่ตรงกัน ลองพิมพ์ echo $ROS_DOMAIN_ID เทียบกันทั้งสองหน้าต่าง ถ้าไม่ตรงให้ตั้งให้เหมือนกันด้วย export ROS_DOMAIN_ID=<เลขเดียวกัน>",
        en:"Usually a ROS_DOMAIN_ID mismatch. Run echo $ROS_DOMAIN_ID in both windows; if they differ, set them the same with export ROS_DOMAIN_ID=<same number>."}},
  {sym:"แดชบอร์ดขึ้น “ขาดการเชื่อมต่อ” ทั้งที่ ssh เข้าได้",
   fix:{th:"rosbridge ยังไม่ได้เปิด หรือถูกปิดไปแล้ว กลับไปขั้นตอนที่ 8 แล้วเปิดค้างไว้ อย่าปิดหน้าต่างนั้น",
        en:"rosbridge is not running, or was closed. Go back to step 8 and leave that window open."}},
  {sym:"rosbridge เปิดอยู่ แต่แดชบอร์ดยังต่อไม่ติด",
   fix:{th:"พอร์ต 9090 อาจถูกไฟร์วอลล์บล็อก ลองสั่ง sudo ufw allow 9090 บนหุ่นยนต์ และตรวจว่า URL เป็น ws:// ไม่ใช่ http://",
        en:"Port 9090 may be blocked by a firewall. Try sudo ufw allow 9090 on the robot, and confirm the URL starts with ws:// and not http://."}},
  {sym:"ทุกแผงว่างเปล่า แต่การ์ดเชื่อมต่อเป็นสีเขียว",
   fix:{th:"ต่อ rosbridge ติดแล้วแต่ไม่พบ topic ที่แดชบอร์ดรู้จัก กดปุ่ม 🔍 Topics เพื่อดูว่าหุ่นยนต์ส่งช่องอะไรออกมาบ้างจริง ๆ",
        en:"rosbridge is attached but none of the expected channels are present. Press 🔍 Topics to see what the robot is genuinely publishing."}},
],

/* ----------------------------------------------------------------- GLOSSARY */
glossary:[
  {t:"IP address",
   th:"เลขประจำเครื่องบนเครือข่าย เหมือนเลขที่บ้าน ใช้ระบุว่าจะส่งข้อมูลไปหาเครื่องไหน",
   en:"A machine's number on the network — its house number. It says where data should go."},
  {t:"LAN / Ethernet",
   th:"สายที่ต่อคอมพิวเตอร์สองเครื่องเข้าด้วยกันโดยตรง เสถียรและเร็วกว่า Wi-Fi",
   en:"The cable that wires two computers together directly. Steadier and faster than Wi-Fi."},
  {t:"Terminal",
   th:"หน้าต่างสีดำที่ใช้พิมพ์คำสั่งแทนการคลิกเมาส์",
   en:"The black window where you type commands instead of clicking."},
  {t:"SSH",
   th:"วิธียืมคีย์บอร์ดของคอมพิวเตอร์อีกเครื่องมาใช้ผ่านเครือข่าย สิ่งที่พิมพ์จะไปทำงานที่เครื่องปลายทาง",
   en:"A way to borrow another computer's keyboard over the network. What you type runs on the far end."},
  {t:"ROS 2",
   th:"ระบบที่หุ่นยนต์ใช้ส่งข้อมูลระหว่างส่วนต่าง ๆ ของตัวเอง เช่นจากกล้องไปยังสมองกลาง",
   en:"The system a robot uses to pass data between its own parts — camera to brain, and so on."},
  {t:"topic",
   th:"ช่องข้อมูลที่หุ่นยนต์ประกาศออกมาตลอดเวลา เหมือนช่องวิทยุ ใครอยากได้ก็ไปจูนที่ช่องนั้น",
   en:"A channel the robot broadcasts on continuously, like a radio station. Anything that wants it tunes in."},
  {t:"Hz",
   th:"จำนวนครั้งต่อวินาที เช่น 10 Hz คือส่งข้อมูลใหม่สิบครั้งในหนึ่งวินาที",
   en:"Times per second. 10 Hz means ten fresh messages every second."},
  {t:"rosbridge",
   th:"โปรแกรมล่ามที่รันบนหุ่นยนต์ แปลข้อมูล ROS ให้หน้าเว็บอ่านออก ต้องเปิดค้างไว้เสมอ",
   en:"A translator running on the robot that converts ROS data for web pages. Must stay running."},
  {t:"WebSocket / ws://",
   th:"ช่องทางที่หน้าเว็บใช้คุยกับ rosbridge แบบสองทางตลอดเวลา ที่อยู่จะขึ้นต้นด้วย ws:// ไม่ใช่ http://",
   en:"The two-way channel a web page uses to talk to rosbridge. Its address starts with ws://, not http://."},
  {t:"SLAM",
   th:"การที่หุ่นยนต์วาดแผนที่ของสถานที่ไปพร้อม ๆ กับหาว่าตัวเองอยู่ตรงไหนในแผนที่นั้น",
   en:"The robot drawing a map of a place while simultaneously working out where it is on that map."},
  {t:"LiDAR",
   th:"เซนเซอร์ที่ยิงแสงเลเซอร์ออกไปรอบตัวแล้ววัดเวลาที่แสงสะท้อนกลับ ได้ออกมาเป็นกลุ่มจุดรูปร่างของห้อง",
   en:"A sensor that fires laser light around itself and times the reflections, producing a cloud of points shaped like the room."},
  {t:"depth camera",
   th:"กล้องที่บอกระยะห่างของทุกจุดในภาพ แทนที่จะบอกแค่สี ทำให้รู้ว่าอะไรอยู่ใกล้อะไรอยู่ไกล",
   en:"A camera that reports how far away every pixel is, not just its colour — so near and far can be told apart."},
],

};
