---
flowscribe: 1
type: flow
id: launch-installed-app
title: Launch an installed app
summary: The driver selects a shortcut or app-drawer tile and Android opens the validated installed package.
status: active
updated: 2026-11-23
actor: driver
trigger: The driver taps an application tile outside shortcut edit mode
modules: [web-dashboard, native-bridge, app-catalog, android-launcher-host]
files:
  - frontend/src/ui/apps.js
  - frontend/src/actions.js
  - android/app/src/main/java/id/hengki/monovra/bridge/NativeBridge.kt
  - android/app/src/main/java/id/hengki/monovra/apps/AppRepository.kt
steps:
  - id: choose-app
    kind: screen
    title: Choose an application
    screen: { route: /, name: Dashboard or app drawer }
    action: The driver taps a pinned shortcut or an app-drawer tile
    calls: [Bridge launchApp]
    next: validate-app
  - id: validate-app
    kind: system
    title: Validate the package
    action: Native code validates the package name and resolves it from the installed app catalog
    calls: [Resolve launch intent]
    next: open-app
  - id: open-app
    kind: external
    title: Open the selected app
    action: Android starts the selected launch activity in a new task
    end: success
---

# Launch an installed app

Both dashboard shortcuts and app-drawer tiles use the same bridge method. Native code never accepts an arbitrary intent from JavaScript; it resolves the package against the current app catalog.

## Gotchas
- In shortcut edit mode, tapping a tile pins or unpins it instead of launching it.
- If the package disappears or cannot be opened, the bridge returns a stable error and the dashboard shows a short message.

