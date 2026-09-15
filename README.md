# X2 Command Center

Control dashboard for the **AgiBot X2 Ultra** humanoid.
No build step, no npm, no CDN — clone and open
[`x2_command_center.html`](x2_command_center.html) in a browser.

It boots straight into **live mode** and starts looking for the robot. If
nothing answers, the page says so and points you at the setup guide rather
than sitting there looking broken.

Built against **AIMDK v1.0.0-ga424add**. Service payloads and preset-motion
IDs are taken verbatim from the SDK's message definitions.

## Three tabs

**🤖 ใช้งานจริง · Live robot** — the default. Talks to the real X2 over
rosbridge. Retries every 10 seconds while disconnected, so plugging the cable
in is enough to bring it up; no reload needed.

**🎬 โหมดสาธิต · Demo** — a guided walkthrough of every sensor, driven by a
procedural engine. Each panel sits next to a short explanation of what the
sensor is and what you are looking at. Nothing needs to be connected, and no
command leaves the page. Use it to learn the dashboard before touching
hardware, or to demo the robot's capabilities without the robot.

**📖 วิธีเชื่อมต่อ · Setup guide** — step by step from "plug in the cable" to
"read the topic list", in Thai and English side by side, written for someone
who has never used SSH. Type your robot's IP and username once at the top and
every command on the page rewrites itself to match. Every command has a copy
button.

Tabs are linkable (`#live`, `#demo`, `#guide`) and switchable with
<kbd>Alt</kbd>+<kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd>.

## Live mode needs rosbridge

HTML cannot speak DDS. There is no way around this: the browser has no
participant, no discovery, no QoS. `rosbridge_server` is the bridge.

On the robot (PC2, `10.0.1.41`):

```bash
sudo apt install -y ros-humble-rosbridge-suite
```

```bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

Then in the dashboard: **ตั้งค่า → URL** `ws://10.0.1.41:9090` → **เชื่อมต่อ**.
Or open the setup guide, type the IP, and press the green auto-fill button.

On success the page calls `/rosapi/topics`, auto-subscribes to every endpoint
it knows how to render, and **opens the topic list automatically**. The 🔍
Topics button reopens it any time; it shows live Hz per topic and which ones
the dashboard has bound.

## Serving the file

`file://` works — the code is deliberately split into plain `<script>` tags
rather than ES modules, so double-clicking the HTML still works. Some browsers
restrict WebSockets from `file://`, so for live mode you may need to serve it:

```bash
python3 -m http.server 8777
```

A page served over `https://` cannot open a plain `ws://` socket. Serve over
`http://` or open the file locally.

## Layout

```
x2_command_center.html    markup + script tags only
css/theme.css             tokens, base elements, modals, toasts
css/dashboard.css         the telemetry panels
css/pages.css             tab shell, demo walkthrough, setup guide
js/config.js              topics, services, motion + emoji IDs
js/core.js                state, DOM helpers, the event bus, prefs
js/rosbridge.js           rosbridge v2 client
js/mock.js                procedural engine behind the demo
js/panels-*.js            camera, lidar, depth, pose, imu, slam renderers
js/commanding.js          everything that sends to the robot
js/discovery.js           topic list
js/guide-data.js          the setup guide, as bilingual data
js/guide.js               guide renderer
js/demo.js                demo walkthrough
js/tabs.js                the three-way mode switch
js/app.js                 connection lifecycle, render loop, boot
```

Load order in the HTML is the dependency order.

## Design system

Two type scales share one set of tokens, because this repo holds two different
kinds of page.

| | Live tab | Guide + Demo tabs |
|---|---|---|
| Scale | `--fs-*` — 13–15px, dense | `--ed-*` — 19px/1.7 |
| Measure | full width | `--ed-measure`, ~57 chars |
| Separation | cards and borders | `--ed-gap` rhythm, no cards |
| Default theme | dark | light (guide only) |

The Live tab is a control surface scanned at a glance while the robot is
moving; the other two are documents read top to bottom. Applying the editorial
scale to the instruments would fit about two panels on screen — so it stays
where it belongs.

Palette is adapted from the KKP Better article layout: one violet accent
(`--blue`, shifted cooler and deeper than KKP's `#7A5DFF`), a lime signal
(`--lime`) used only for "live", pill radii (`--rp`), and a shadow with no
offset. Semantic colours (`--green` / `--amber` / `--red`) are deliberately
**separate from the accent**, so an E-stop can never read as a branded button.

Theme is three-state: `auto` follows the tab, `light` and `dark` pin it. The
button in the header cycles them. All text passes WCAG AA (4.5:1) in both.

Token *names* are stable — every panel stylesheet and all 17 JS modules
reference them, so re-theming means changing values in `css/theme.css` only.

## Panels

| Panel | Source | Notes |
|---|---|---|
| กล้องสด | 5× `/rgb_image/compressed` | base64 JPEG straight into `<img>` |
| IMU | `/aima/hal/imu/chest/state` | + artificial horizon from the quaternion |
| Lidar | `lidar_pointcloud` | top-down, height-banded |
| Lidar 3D | `lidar_pointcloud` | drag rotate · **Shift**+wheel zoom · dbl-click reset |
| ความลึก | `depth_image` | 16UC1 mm → near-red/far-blue |
| ท่าทางหุ่นยนต์ | joint state | articulated figure, animates gestures |
| ผู้ช่วยเสียง | `PlayTts` | answers LiDAR/battery/mode questions from live data |
| การโต้ตอบ | `SetMcPresetMotion`, `PlayEmoji` | IDs verbatim from `McPresetMotion.msg` |
| แผนที่ | `/integrated_command` + odom | accumulates its own occupancy grid |

## Safety

Three interlocks, all verified:

1. **อนุญาตให้หุ่นยนต์เคลื่อนไหว** gates every motion command. Gesture
   buttons refuse while it is off.
2. **หยุดฉุกเฉิน** latches, force-clears the motion switch, blocks it from
   being re-enabled, and publishes twelve zero-velocity messages on
   `/aima/mc/locomotion/velocity`.
3. Facial expressions bypass the motion gate — they are screen-only.

The demo tab enforces the same interlocks, so rehearsing there teaches the
real workflow.

## Known limits

- **`GetStoredMapByName` returns metadata and a file path, not grid data.**
  There is no map topic on the X2, so the map panel builds its own occupancy
  grid by splatting LiDAR into the odom frame. That is a live exploration
  view, not the robot's stored map.
- **Emoji IDs are partly inferred.** Anchors (1 blink, 60 bored, 70 abnormal,
  80 sleeping, 90 happy, 190 double-angry, 200 adore) come from
  `py_examples/play_emoji.py`; the rest follow its 10-step spacing and need
  confirming on hardware.
- **ชี้ที่วัตถุตามสี needs a node that does not exist yet.** Colour detection
  plus depth back-projection is not in the SDK — the button logs what it
  would need.
- **Preset-motion area is inferred**: head motions (4xxx) → `HEAD(4)`,
  everything else → `RIGHT_HAND(2)`. Some two-handed motions may want
  `LEFT_HAND(1)` as well.
- The robot pose figure only animates in the demo. In live mode joint state is
  not yet decoded, so the figure stands still.
- Live mode is **untested against real hardware** — no SSH access yet. The
  simulation path and every service payload have been verified offline.
