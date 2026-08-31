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
every command on the page rewrites itself to match. Press **บันทึก · Save**
(or Enter) to keep that IP across refreshes — it is written to the rosbridge
URL too, so the next reload connects to the same robot. The button turns amber
while there are unsaved edits. Every command has a copy button.

Tabs are linkable (`#live`, `#demo`, `#guide`) and switchable with
<kbd>Alt</kbd>+<kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd>.

## Live mode needs rosbridge

HTML cannot speak DDS. There is no way around this: the browser has no
participant, no discovery, no QoS. `rosbridge_server` is the bridge.

On the robot (PC2, `10.0.1.41`):

```bash
sudo apt install -y ros-humble-rosbridge-suite
```

Then use `tools/start-rosbridge.sh` rather than launching rosbridge by hand.
It does two things a bare launch does not:

```bash
source /agibot/data/home/agi/.aima/env/bashrc   # AgiBot's DDS profile
```

The X2 is three computers — PC1 motion control, PC2 development, PC3
interaction — stitched into one ROS graph by a non-default DDS config. A shell
that has not sourced that file still starts nodes, still answers `rosapi`, and
silently sees only part of the graph. Every symptom downstream then looks like
a dead sensor. AgiBot's own FAQ names this as the fix for "a node cannot
receive ROS topic messages". The script also refuses to start unless
`aimdk_msgs` typesupport actually loads, and prints the visible topic count so
a short graph is obvious immediately.

### Wire format

**ตั้งค่า → การบีบอัด** picks how messages cross the socket:

- **CBOR** (default) — binary frames; `uint8[]` fields (JPEG frames, point
  clouds, depth) arrive as a `Uint8Array` and go straight into a Blob or a
  `DataView`. No base64 inflation, no multi-hundred-KB `JSON.parse` per frame,
  no character-by-character base64 walk.
- **none** — the original JSON + base64 path, kept as a fallback.

Switching re-subscribes immediately, so the two can be compared against a live
robot by watching the per-panel Hz.

One trap worth knowing if you extend this: under CBOR a `uint8[]` is a *view
into the WebSocket frame*, so it can start at any byte offset, while a
`Uint16Array` view requires an even one. Base64 always decoded into a fresh
buffer at offset 0, so code that reinterprets bytes as wider types has to
realign — see the depth handler in `js/panels-slam.js`.

### Vendor message types (`aimdk_msgs`)

rosbridge is a Python node: to carry `aimdk_msgs/srv/SetMcPresetMotion` it has
to `import aimdk_msgs`, and sourcing `/opt/ros/humble` alone does not put that
on the path. Miss it and the dashboard is confusingly *half* broken — every
sensor panel works, because those are all standard `sensor_msgs`, while every
command button, the face emotions, TTS, the battery and the mode card fail.

`tools/start-rosbridge.sh` runs on the robot, finds the package, says exactly
why it cannot be imported when it cannot, and launches rosbridge with the
threading flags that stop a failed service call from freezing the video:

```bash
bash ~/start-rosbridge.sh
```

If the robot has no copy, `tools/push-aimdk-msgs.sh` (run on the Mac) rsyncs
the SDK's prebuilt aarch64 tree across — it is cpython-310/aarch64, matching
the X2's Jetson — then re-run with `AIMDK_PREFIX=$HOME/aimdk_msgs_install`.

**No internet on the robot?** `tools/package-rosbridge.sh` collects rosbridge
and its dependencies into a folder in an Ubuntu VM; rsync that across and run
`tools/install-rosbridge.sh` on the robot. The VM's architecture must match the
robot's — the script refuses to run otherwise and points at the source route,
since rosbridge itself is pure Python.

Then in the dashboard: **ตั้งค่า → URL** `ws://10.0.1.41:9090` → **เชื่อมต่อ**.
Or open the setup guide, type the IP, and press the green auto-fill button.

On success the page calls `/rosapi/topics`, auto-subscribes to every endpoint
it knows how to render, and **opens the topic list automatically**. The 🔍
Topics button reopens it any time; it shows live Hz per topic and which ones
the dashboard has bound.

## 🧪 Zenoh (experimental, one topic)

An opt-in second transport, in **ตั้งค่า → 🧪 Zenoh**. It takes a single topic
off rosbridge and receives it over Zenoh instead, so you can measure what
Zenoh actually buys before deciding to swap the whole client. Everything else
keeps running on rosbridge; nothing auto-starts.

It talks to the **REST plugin** rather than `zenoh-ts`, deliberately:
`zenoh-ts` is npm/ESM and would force a bundler, which costs this project its
"one HTML file, `file://` works" property. A GET whose `Accept` header is
`text/event-stream` becomes a live subscription, and that is exactly what
`EventSource` sends — so the page stays dependency-free.

On the robot, alongside the existing stack (it is a normal DDS participant and
changes nothing about AIMDK):

```bash
zenoh-bridge-ros2dds --rest-http-port 8000
```

The **📖 วิธีเชื่อมต่อ** tab carries the full setup walkthrough for this, as a
collapsed *Optional / advanced* section below the numbered steps — install
commands, both topologies, and a button that opens the Zenoh box with the
robot's address already filled in. Or set the REST base URL, the key
expression, and the ROS topic it stands in for by hand. **ดู sample ดิบ · Raw** dumps the first sample into the log — use it when
nothing decodes, because the REST plugin's JSON field names have moved between
zenoh releases.

What you give up on this path, and why the swap is not free:

| | rosbridge | Zenoh |
|---|---|---|
| message form | JSON, fields parsed | raw CDR, decode it yourself |
| topic discovery | `/rosapi/topics` | none — you configure the key |
| rate limiting | `throttle_rate`, server-side | none — drop frames client-side |
| services | `call_service` | CDR-encode the request by hand |

`js/cdr.js` implements `nav_msgs/msg/Odometry` and
`geometry_msgs/msg/PoseWithCovarianceStamped`. Every further type is more
hand-written CDR — which is the real cost of a full swap, and the thing this
experiment exists to price.

> **Status:** the decoder is verified against CDR-serialized Odometry, but the
> robot-side setup has not yet been run against a real X2.

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

## Getting live data out of the robot

Three things must all be true or the dashboard looks broken in three different
ways. Each was found the hard way against real hardware.

**1. rosbridge needs AgiBot's DDS profile.** Measured on the robot:

```
without .aima/env/bashrc     0 topics
with it                    258 topics
```

A plain SSH shell sees nothing at all.

**2. `aimdk_msgs` must be the aarch64 build.** The copy that ships on the robot
comes from `extra/x2-rl-deploy/x2_rl_deploy_mujoco`, an **x86 desktop
simulator**, so its Python extension is `...cpython-310-x86_64-linux-gnu.so`
and can never load on the Jetson. rosbridge reports `No module named
'aimdk_msgs'` and every service call times out. Copy the SDK's
`src/aimdk_msgs/prebuilt_aarch64/` somewhere outside `$HOME/aimdk*` (that
prefix is wiped on firmware flash) and point the three path variables at it.
`tools/start-rosbridge.sh` does all of this and refuses to launch if the type
will not actually instantiate — resolving the class is not a strong enough
check.

**3. Kill `rosapi_node` too.** Stopping rosbridge alone orphans it, `ros2 node
list` then shows `/rosapi` twice, and service calls hang ambiguously.

With all three right, services answer in **under 400 ms**.

### Do not turn CBOR back on

`compression: "cbor"` crashes rosbridge 2.0.1 outright:

```
AttributeError: 'numpy.ndarray' object has no attribute 'get_fields_and_field_types'
  rosbridge_library/internal/cbor_conversion.py:54
```

It throws once per frame, so a single image stream writes ~17 MB of tracebacks
in seconds and the process is killed. The dropped WebSocket and the "first
service call works, then nothing" behaviour were both this.

## Sensor frames

`js/urdf-kin.js` is generated from `X2_URDF-v1.3.0` by `tools/gen_urdf_kin.py`
and carries all 40 joints plus the sensor mounts.

The chest LiDAR is mounted `rpy = (-pi/2, 0, 0)`, so **sensor `+y` points down
in base and sensor `+z` points left**. Plotting the raw cloud as if it were
already base coordinates renders a side view and makes the height filter slice
left-to-right — which is exactly what the LiDAR panels used to do. The cloud is
now mapped `(x, z, -y)` into base and then lifted by the live pelvis height, so
**the floor lands at z = 0** and the obstacle band is a real waist-high slab.

The Live figure runs the same URDF chain against `/aima/hal/joint/` state, so
it shows the posture the robot is actually in. It falls back to the demo
animation only when joint state has been silent for two seconds.

## SLAM publishes on two different topics

`/slam/lidar_odom` carries the **localization** result and only runs after
`start_relocalization` against a stored map. While you are **mapping** it stays
silent and the pose comes out of `/slam/mapping/odometry` instead. Subscribing
to only the first is why SLAM looked dead. The dashboard now takes either.

`/integrated_command`'s subscriber is `TRANSIENT_LOCAL`, so the publisher must
latch or DDS never matches it and `start_mapping` vanishes with no error.

## Voice agent

Telemetry questions (obstacle, battery, mode) are answered locally with no
model. Everything else goes to an OpenAI-compatible endpoint configured in the
panel — including a local Ollama, which needs no key. The key is kept in this
browser's `localStorage` and is never sent to the robot.

The matcher used to fire on a bare `อะไร`, so *"ตอนนี้กินข้าวอะไรดี"* — what
should I eat — came back as a LiDAR obstacle reading. Each pattern now has to
name the thing being asked about.

## Known limits

- **The map panel still draws its own grid by default.** `GetStoredMapByName`
  does return `int8[] data` (−1 unknown / 0 free / 100 occupied) and the
  dashboard now uses it when the array length matches `width × height`;
  otherwise it falls back to splatting LiDAR into the odom frame, which is a
  live exploration view rather than the robot's stored map. `map_id`, needed
  for relocalization, is not in the response — read it on the robot with
  `sqlite3 /agibot/data/var/MapManagerModule/map.db "SELECT * FROM map;"`.
- **SLAM is an optional module.** The SDK marks 5.5.2 "SLAM (Optional) —
  contact after-sales technical support to enable". If mapping does nothing
  on a given robot, that may simply be the licence.
- **Emoji IDs are partly inferred.** Anchors (1 blink, 60 bored, 70 abnormal,
  80 sleeping, 90 happy, 190 double-angry, 200 adore) come from
  `py_examples/play_emoji.py`; the rest follow its 10-step spacing and need
  confirming on hardware.
- **ชี้ที่วัตถุตามสี needs a node that does not exist yet.** Colour detection
  plus depth back-projection is not in the SDK — the button logs what it
  would need.
- **Stationary lock (`อยู่กับที่`).** On by default at every boot, and
  deliberately *not* persisted — a saved "off" is the setting you forget you
  left off. While it is on, **every** preset motion is refused regardless of
  area, and any non-zero `McLocomotionVelocity` is dropped in
  `RosBridge.publish` rather than at the call sites, so it is an invariant of
  the transport instead of a property of which buttons happen to exist. An arm
  gesture is still the robot moving; in a room with no clearance the arm/body
  distinction is not the one that matters.

  E-STOP's all-zero velocity still goes through — a stop must always get
  through. Screen faces, TTS, and every read-only query stay available, and
  those are enough to prove the service path end to end: a reply with
  `header.code == 0` has already made the full round trip through rosbridge,
  DDS and AimRT to PC1 and back, which is precisely what a timeout is not.

- **Preset motions require Stable Stand.** In zero-torque or damping the call
  is accepted and the robot does not move. The dashboard reads `GetMcAction`
  on connect and warns, but switching the mode moves the robot, so that is
  left to the operator via the app or the RC.
- **Motion/area pairs now come from the documented table** (SDK 5.1.4), not
  from the motion id: 1 left arm, 2 right arm, 3 both arms, 11 whole body.
  The previous rule sent every whole-body motion (bow, hug, cheer, clap) with
  area 2, which is a different request. Motions the SDK does not document are
  dimmed in the UI and flagged in the log.
- The robot pose figure only animates in the demo. In live mode joint state is
  not yet decoded, so the figure stands still.
- Live mode is **untested against real hardware** — no SSH access yet. The
  simulation path and every service payload have been verified offline.
