#!/usr/bin/env bash
# Builds the frontend and the Android APK. Runs inside the `builder` container
# (or any machine with JDK 17, Android SDK and Node 20+).
#
#   scripts/build.sh debug     -> dist/monovra-debug.apk
#   scripts/build.sh release   -> dist/monovra-release.apk
#   scripts/build.sh bundle    -> dist/monovra-release.aab (Google Play upload)
set -euo pipefail

VARIANT="${1:-debug}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$VARIANT" in
  debug)   TASK="assembleDebug" ;;
  release) TASK="assembleRelease" ;;
  bundle)  TASK="bundleRelease" ;;
  *) echo "Usage: $0 [debug|release|bundle]" >&2; exit 1 ;;
esac

echo "==> Building frontend"
cd "$ROOT/frontend"
npm ci --no-audit --no-fund
npm run build

echo "==> Building Android $VARIANT"
cd "$ROOT/android"
if [[ -x ./gradlew && -f gradle/wrapper/gradle-wrapper.jar ]]; then
  GRADLE=./gradlew
else
  GRADLE=gradle
fi
"$GRADLE" --no-daemon "$TASK"

mkdir -p "$ROOT/dist"
if [[ "$VARIANT" == bundle ]]; then
  cp "$ROOT/android/app/build/outputs/bundle/release/app-release.aab" "$ROOT/dist/monovra-release.aab"
  echo "==> AAB ready: dist/monovra-release.aab"
  exit 0
fi
APK="$(find "$ROOT/android/app/build/outputs/apk/$VARIANT" -name '*.apk' | head -n 1)"
cp "$APK" "$ROOT/dist/monovra-$VARIANT.apk"
echo "==> APK ready: dist/monovra-$VARIANT.apk"
