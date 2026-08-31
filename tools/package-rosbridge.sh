#!/usr/bin/env bash
# ============================================================================
# package-rosbridge.sh — run this in the Ubuntu VM, NOT on the robot.
#
# Collects ros-humble-rosbridge-suite and every dependency it needs into one
# folder you can rsync to an X2 that has no internet of its own.
#
#   ./package-rosbridge.sh arm64            # or amd64 — must match the robot
#   rsync -avz rosbridge-offline/ agi@<robot>:~/rosbridge-offline/
#
# Run it in a VM that does NOT already have rosbridge installed. apt only
# downloads what is missing, so on a machine that already has the packages the
# folder comes out half empty and the robot-side install fails on the parts
# that were silently skipped.
# ============================================================================
set -euo pipefail

ARCH="${1:-}"
OUT="${2:-$PWD/rosbridge-offline}"
PKG="ros-humble-rosbridge-suite"

if [[ -z "$ARCH" ]]; then
  echo "usage: $0 <robot-arch: amd64|arm64> [output-dir]" >&2
  echo "find the robot's with:  ssh <robot> dpkg --print-architecture" >&2
  exit 2
fi

HOST_ARCH="$(dpkg --print-architecture)"
if [[ "$ARCH" != "$HOST_ARCH" ]]; then
  cat >&2 <<MSG
STOP — architecture mismatch.
  this VM : $HOST_ARCH
  robot   : $ARCH

Some dependencies carry compiled code, so debs built for $HOST_ARCH will not
install on $ARCH. Either use a VM matching the robot, or take the source route
in the comments at the bottom of this script — rosbridge itself is pure Python
and does not care about architecture.
MSG
  exit 1
fi

mkdir -p "$OUT/partial"
echo "==> refreshing package lists"
sudo apt-get update -qq

echo "==> downloading $PKG and its dependencies into $OUT"
sudo apt-get install -y --download-only --reinstall \
     -o Dir::Cache::archives="$OUT" "$PKG"

sudo chown -R "$(id -u):$(id -g)" "$OUT"
rmdir "$OUT/partial" 2>/dev/null || true

COUNT=$(find "$OUT" -maxdepth 1 -name '*.deb' | wc -l | tr -d ' ')
echo
echo "==> $COUNT .deb files in $OUT"
[[ "$COUNT" -lt 4 ]] && echo "    WARNING: that looks too few. Is rosbridge already installed in this VM?"
find "$OUT" -maxdepth 1 -name '*.deb' -printf '    %f\n' | sort
cp "$(dirname "$0")/install-rosbridge.sh" "$OUT/" 2>/dev/null || true
echo
echo "next:"
echo "  rsync -avz --progress \"$OUT/\" <user>@<robot>:~/rosbridge-offline/"
echo "  ssh <user>@<robot> 'bash ~/rosbridge-offline/install-rosbridge.sh'"

# ---------------------------------------------------------------------------
# If the architectures cannot be made to match: rosbridge_suite is pure Python,
# so build it from source on the robot instead of shipping debs.
#
#   git clone -b humble https://github.com/RobotWebTools/rosbridge_suite.git
#   rsync -avz rosbridge_suite/ <user>@<robot>:~/ros2_ws/src/rosbridge_suite/
#   # then on the robot:
#   sudo apt install -y python3-tornado python3-bson   # the only real deps
#   cd ~/ros2_ws && colcon build --packages-select \
#       rosbridge_library rosbridge_server rosapi rosbridge_msgs
#   source install/setup.bash
# ---------------------------------------------------------------------------
