---
flowscribe: 1
type: flow
id: open-launcher-dashboard
title: Open the launcher dashboard
summary: The driver opens Home and receives a themed dashboard populated from native launcher, app, media, and system state.
status: active
updated: 2026-11-23
actor: driver
trigger: The driver opens MONOVRA or presses the Home control
modules: [android-launcher-host, native-bridge, web-dashboard, app-catalog, media-control, launcher-settings]
files:
  - android/app/src/main/java/id/hengki/monovra/MainActivity.kt
  - android/app/src/main/java/id/hengki/monovra/MonovraApp.kt
  - android/app/src/main/java/id/hengki/monovra/bridge/NativeBridge.kt
  - frontend/src/main.js
  - frontend/src/store.js
steps:
  - id: start-host
    kind: system
    title: Start the launcher host
    action: Android creates or resumes the launcher activity and applies the saved native theme
    calls: [Load packaged dashboard assets]
    next: connect-dashboard
  - id: connect-dashboard
    kind: system
    title: Connect the dashboard
    action: The page selects the native transport and registers state event listeners
    calls: [Bridge connect]
    next: request-bootstrap
  - id: request-bootstrap
    kind: action
    title: Request initial state
    action: The page asks native services for device, settings, apps, music, and system state
    calls: [Bridge getBootstrap]
    next: show-dashboard
  - id: show-dashboard
    kind: screen
    title: Show the dashboard
    screen: { route: /, name: Dashboard }
    action: The driver sees the clock, media panel, shortcuts, and dock
    end: success
---

# Open the launcher dashboard

The native window paints the saved theme before the WebView loads. The page renders its shell, then replaces default state with one bootstrap snapshot. Later repository changes arrive as events rather than polling.

## Gotchas
- Pressing Home while the activity is already in front emits a Home event that closes panels and returns to the dashboard.
- The first installed-app snapshot may initialize default shortcuts once; subsequent launches preserve the user's order.

