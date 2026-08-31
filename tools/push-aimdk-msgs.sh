#!/usr/bin/env bash
# ============================================================================
# push-aimdk-msgs.sh — run this ON THE MAC, not on the robot.
#
#   ./push-aimdk-msgs.sh                    push to agi@192.168.0.248
#   ./push-aimdk-msgs.sh agi@10.0.0.5       push somewhere else
#
# Only needed when start-rosbridge.sh reports that aimdk_msgs is nowhere on
# the robot. The SDK's prebuilt tree is aarch64 / cpython-310, which matches
# the X2's Jetson exactly, so it can be copied rather than built.
# ============================================================================
set -euo pipefail

TARGET="${1:-agi@192.168.0.248}"
SRC="$HOME/Downloads/aimdk-aarch64-a424add7-artifacts/src/aimdk_msgs/prebuilt_aarch64"
DEST="~/aimdk_msgs_install"

if [[ ! -d "$SRC" ]]; then
  echo "SDK tree not found at:" >&2; echo "  $SRC" >&2
  echo "Adjust SRC at the top of this script to wherever you unpacked it." >&2
  exit 1
fi

echo "==> source : $SRC"
echo "==> target : $TARGET:$DEST"
echo "    ($(find "$SRC" -type f | wc -l | tr -d ' ') files, $(du -sh "$SRC" | cut -f1))"
echo

rsync -avz --progress "$SRC/" "$TARGET:$DEST/"

cat <<MSG

Done. Now on the robot:

  AIMDK_PREFIX=\$HOME/aimdk_msgs_install bash ~/start-rosbridge.sh

MSG
