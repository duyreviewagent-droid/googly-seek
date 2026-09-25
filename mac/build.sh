#!/bin/bash
# Builds "Googly Seek.app": a Mac window around the online game (same game as the website).
# The icon comes from mac/icon-1024.png (rendered by the game itself: web/test/shot.sh ... "icon=1").
set -euo pipefail
cd "$(dirname "$0")"
APP="../Googly Seek.app"
BIN="$APP/Contents/MacOS/GooglySeek"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc -O -target "$(uname -m)-apple-macos13.0" main.swift -o "$BIN" -framework Cocoa -framework WebKit 2>&1 | grep -v warning || true
[ -f "$BIN" ] || { echo "Build failed"; exit 1; }
cp Info.plist "$APP/Contents/Info.plist"
if [ -f icon-1024.png ]; then
  SET="$(mktemp -d)/AppIcon.iconset"; mkdir -p "$SET"
  for s in 16 32 128 256 512; do
    sips -z $s $s icon-1024.png --out "$SET/icon_${s}x${s}.png" >/dev/null
    sips -z $((s*2)) $((s*2)) icon-1024.png --out "$SET/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$SET" -o "$APP/Contents/Resources/AppIcon.icns"
fi
codesign --force --deep -s - "$APP" >/dev/null 2>&1
touch "$APP"
echo "Built $(cd .. && pwd)/Googly Seek.app"
