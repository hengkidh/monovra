---
flowscribe: 1
type: module
id: android-launcher-host
title: Android launcher host
summary: Hosts the bundled dashboard in a locked-down WebView and coordinates launcher lifecycle, state streams, and system bars.
status: active
updated: 2026-11-23
kind: feature
files:
  - android/app/src/main/AndroidManifest.xml
  - android/app/src/main/java/id/hengki/monovra/MainActivity.kt
  - android/app/src/main/java/id/hengki/monovra/MonovraApp.kt
  - android/app/src/main/res/drawable/ic_launcher*.xml
  - android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
  - android/app/src/main/res/values/colors.xml
entrypoints:
  - android/app/src/main/java/id/hengki/monovra/MainActivity.kt
  - android/app/src/main/java/id/hengki/monovra/MonovraApp.kt
  - android/app/src/main/AndroidManifest.xml
depends_on: [native-bridge, app-catalog, media-control, launcher-settings]
env: []
data: []
---

# Android launcher host

`MonovraApp` creates the process-wide repositories. `MainActivity` reads the saved theme before the first frame, loads the packaged frontend through `WebViewAssetLoader`, connects the native bridge, and forwards repository changes while the activity is started.

The manifest registers the activity for both Home and ordinary launcher intents. Returning through a Home intent resets the frontend to its dashboard instead of creating another activity. The launcher identity uses an adaptive vector icon with a dedicated monochrome mask for Android themed icons.

## Gotchas
- The WebView blocks network loads, arbitrary file access, external navigation, and untrusted bridge origins.
- A lost WebView renderer is recreated; repository state is then obtained again through bootstrap.
- `uiMode` is handled in `onConfigurationChanged`: with the Auto theme, a day/night switch repaints the window and system bars and pushes a fresh `system` event, without recreating the activity.
- Media observation starts and stops with activity visibility so head-unit sleep does not leave active listeners or timers.

