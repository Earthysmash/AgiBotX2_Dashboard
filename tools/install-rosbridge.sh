#!/usr/bin/env bash
# ============================================================================
# install-rosbridge.sh — run this ON THE ROBOT, after rsync.
#
#   bash ~/rosbridge-offline/install-rosbridge.sh
#
# Installs from local .deb files only. Nothing here reaches the internet, so
# a missing dependency fails loudly here rather than half-installing.
# ============================================================================
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

shopt -s nullglob
DEBS=(*.deb)
if [[ ${#DEBS[@]} -eq 0 ]]; then
  echo "no .deb files in $DIR — did the rsync finish?" >&2
  exit 1
fi

echo "==> installing ${#DEBS[@]} packages from $DIR"
sudo dpkg -i "${DEBS[@]}"
STATUS=$?

if [[ $STATUS -ne 0 ]]; then
  echo
  echo "==> dpkg reported unmet dependencies. What is missing:"
  sudo apt-get --no-download --fix-broken install -s 2>&1 | sed -n '/following/,$p' | head -30
  echo
  echo "Fetch those on the VM too and rsync them across — this robot has no"
  echo "internet, so apt cannot resolve them here."
  exit $STATUS
fi

echo
echo "==> checking rosbridge is importable"
# shellcheck source=/dev/null
source /opt/ros/humble/setup.bash
if ros2 pkg list 2>/dev/null | grep -qx rosbridge_server; then
  echo "    rosbridge_server present"
else
  echo "    rosbridge_server NOT found by ros2 — install did not take" >&2
  exit 1
fi

cat <<'MSG'

Done. Start it with:

  source /opt/ros/humble/setup.bash
  ros2 launch rosbridge_server rosbridge_websocket_launch.xml

Then confirm it is listening on ALL interfaces, not just localhost:

  ss -tlnp | grep 9090

  0.0.0.0:9090   good — reachable from the dashboard
  127.0.0.1:9090 bad  — refuses every remote connection, which looks
                        exactly like the robot being switched off

If it shows 127.0.0.1, relaunch with an explicit address:

  ros2 launch rosbridge_server rosbridge_websocket_launch.xml address:=0.0.0.0
MSG
