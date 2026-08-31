#!/usr/bin/env bash
# Run on the robot (PC2, the Jetson Orin NX):  bash ~/start-rosbridge.sh
# Loads AgiBot's DDS config, puts aimdk_msgs on the path, launches rosbridge.
set -u

# ---------------------------------------------------------------- DDS config
# The single most important line in this file. AgiBot's FAQ:
#   "A node launched by systemd service cannot receive ROS topic messages —
#    ensure the AgiBot DDS config and environment variables are loaded at
#    startup by running source /agibot/data/home/agi/.aima/env/bashrc"
# The X2's three compute units (PC1 motion control, PC2 development,
# PC3 interaction) are stitched into one ROS graph by a non-default DDS
# profile. Without it a node still starts, still sees *some* topics, and
# silently misses the rest — which reads as "the camera is broken" rather
# than "this shell has the wrong DDS settings".
AIMA_ENV=/agibot/data/home/agi/.aima/env/bashrc
if [ -r "$AIMA_ENV" ]; then
  source "$AIMA_ENV"
  echo "DDS config loaded — $AIMA_ENV"
else
  echo "WARNING: $AIMA_ENV not found. Topics from other compute units"
  echo "         (cameras, LiDAR, motion control) may never arrive."
fi

source /opt/ros/humble/setup.bash

# ------------------------------------------------------------- message types
# Skip backup trees. The robot ships an aimdk.bak alongside the live aimdk and
# its own login banner asks you to delete it; picking it up gives you message
# definitions that may not match the running firmware.
D=${AIMDK_DIR:-$(find / -type d -name aimdk_msgs -path '*-packages/*' 2>/dev/null | grep -v '\.bak' | head -1)}
[ -z "$D" ] && { echo "aimdk_msgs not found — run push-aimdk-msgs.sh on the Mac"; exit 1; }

P=${D%/local/lib/python3*}; P=${P%/lib/python3*}          # install prefix
export PYTHONPATH=${D%/aimdk_msgs}:${PYTHONPATH:-}
export AMENT_PREFIX_PATH=$P:${AMENT_PREFIX_PATH:-}
export LD_LIBRARY_PATH=$P/lib:${LD_LIBRARY_PATH:-}

# Load a real service type, not just the Python module. `import aimdk_msgs`
# succeeds while libaimdk_msgs__rosidl_typesupport_c.so is still unreachable —
# and rosbridge then answers every service call with a silent timeout instead
# of an error, which is a much harder failure to read.
python3 -c "from rosidl_runtime_py.utilities import get_service
get_service('aimdk_msgs/srv/SetMcPresetMotion')" 2>/dev/null \
  || { echo "typesupport will not load from $P — check $P/lib for libaimdk_msgs__rosidl_typesupport_c.so"; exit 1; }
echo "typesupport OK — $P"

# ------------------------------------------------------------------ sanity
# One line that tells you whether this shell can actually see the robot. If
# the count is small (< 50) the DDS config did not take and nothing below
# will work properly.
echo "topics visible from this shell: $(ros2 topic list 2>/dev/null | wc -l)"

pkill -f rosbridge_websocket 2>/dev/null; pkill -f rosapi_node 2>/dev/null; sleep 2

# call_services_in_new_thread: a failed service call must not freeze the video.
# 5 s is the ceiling per call; the dashboard retries far faster than that.
exec ros2 launch rosbridge_server rosbridge_websocket_launch.xml \
     call_services_in_new_thread:=true default_call_service_timeout:=5.0
