# X2 Command Center

Single-file control dashboard for the **AgiBot X2 Ultra** humanoid.
No build step, no npm, no CDN — clone and open
[`x2_command_center.html`](x2_command_center.html) in a browser.

It boots in **โหมดจำลอง (simulation)**, so every panel — cameras, LiDAR,
depth, IMU, pose, SLAM — works with no robot attached. Flip the toggle and
point it at `rosbridge` to go live.

Built against **AIMDK v1.0.0-ga424add**. Service payloads and preset-motion
IDs are taken verbatim from the SDK's message definitions.

## Two modes

**โหมดจำลอง (simulation)** — the default. A procedural engine drives every
panel: cameras, LiDAR, depth, IMU, pose, SLAM. Nothing needs to be connected.
Use this to check the UI and rehearse the workflow before you have SSH.

**Live** — turn the simulation toggle off and connect. The page speaks
rosbridge v2 over WebSocket.

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

On success the page calls `/rosapi/topics`, auto-subscribes to every endpoint
it knows how to render, and **opens the topic list automatically**. The 🔍
Topics button reopens it any time; it shows live Hz per topic and which ones
the dashboard has bound.

## Serving the file

`file://` works for simulation mode. Some browsers restrict WebSockets from
`file://`, so for live mode serve it:

```bash
python3 -m http.server 8777 --directory /path/to/dashboard
```

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
- Live mode is **untested against real hardware** — no SSH access yet. The
  simulation path and every service payload have been verified offline.
