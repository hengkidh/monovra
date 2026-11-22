---
flowscribe: 1
type: flow
id: control-current-music
title: Control current music
summary: The driver views the selected media session and sends only playback commands supported by the current player.
status: active
updated: 2026-11-23
actor: driver
trigger: The launcher is visible and Android reports an active media session
modules: [media-control, native-bridge, web-dashboard, app-catalog, launcher-settings]
files:
  - android/app/src/main/java/id/hengki/monovra/media/MediaRepository.kt
  - android/app/src/main/java/id/hengki/monovra/bridge/NativeBridge.kt
  - frontend/src/ui/music.js
  - frontend/src/actions.js
steps:
  - id: select-session
    kind: system
    title: Select a media session
    action: Native code ranks active sessions and publishes metadata, progress, artwork, and supported actions
    calls: [Media session callbacks]
    next: show-now-playing
  - id: show-now-playing
    kind: screen
    title: Show now playing
    screen: { route: /, name: Dashboard media panel }
    action: The driver sees the selected source, track details, artwork, progress, and enabled controls
    next: choose-control
  - id: choose-control
    kind: action
    title: Choose playback control
    action: The driver taps play, pause, next, or previous
    calls: [Bridge playback command]
    next: validate-control
  - id: validate-control
    kind: system
    title: Validate media access and support
    action: Native code confirms permission, an active session, and support for the requested control
    next: update-playback
  - id: update-playback
    kind: system
    title: Update playback state
    action: The selected controller receives the command and later publishes callback state to the dashboard
    end: success
---

# Control current music

The native side is the source of truth for session selection and available controls. The page extrapolates progress between native callbacks only while playback is active and the document is visible.

## Gotchas
- Without Notification Access, the media panel shows onboarding instead of controls.
- Playing sessions outrank paused sessions; within the same group the saved preference and built-in priority rules apply.

