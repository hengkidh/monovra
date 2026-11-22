---
flowscribe: 1
type: flow
id: configure-launcher
title: Configure MONOVRA as Home
summary: The driver opens launcher settings, asks Android for the Home role, and returns to an updated default-launcher status.
status: active
updated: 2026-11-23
actor: driver
trigger: The driver chooses Set MONOVRA as Default Launcher
modules: [web-dashboard, native-bridge, launcher-settings, android-launcher-host]
files:
  - frontend/src/ui/settings.js
  - frontend/src/actions.js
  - android/app/src/main/java/id/hengki/monovra/bridge/NativeBridge.kt
  - android/app/src/main/java/id/hengki/monovra/system/SystemActions.kt
  - android/app/src/main/java/id/hengki/monovra/MainActivity.kt
steps:
  - id: open-launcher-settings
    kind: screen
    title: Open launcher settings
    screen: { route: /, name: Launcher settings }
    action: The driver reviews the current default Home status and requests the Home role
    calls: [Bridge requestHomeRole]
    next: show-system-choice
  - id: show-system-choice
    kind: external
    title: Show Android Home choice
    action: Android opens the Home-role dialog or a compatible settings fallback
    next: choose-home
  - id: choose-home
    kind: action
    title: Choose the Home app
    action: The driver confirms MONOVRA or leaves the current launcher unchanged
    next: refresh-status
  - id: refresh-status
    kind: system
    title: Refresh launcher status
    action: Returning to MONOVRA rechecks the default Home role and pushes current system state
    next: show-status
  - id: show-status
    kind: screen
    title: Show current status
    screen: { route: /, name: Launcher settings }
    action: The driver sees which launcher is currently the default
    end: success
---

# Configure MONOVRA as Home

MONOVRA delegates the decision to Android. On devices without the standard Home-role dialog, it attempts the most specific available Android settings screen and then refreshes status on resume.

## Gotchas
- Firmware support varies, so the system-action layer maintains several settings fallbacks.
- MONOVRA never disables or removes the factory launcher; the driver can switch back through Android settings.

