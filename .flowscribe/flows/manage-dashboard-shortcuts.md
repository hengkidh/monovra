---
flowscribe: 1
type: flow
id: manage-dashboard-shortcuts
title: Manage dashboard shortcuts
summary: The driver pins, unpins, or reorders installed apps and the ordered shortcut list persists across launches.
status: active
updated: 2026-11-23
actor: driver
trigger: The driver opens shortcut editing from the app drawer or Applications settings
modules: [web-dashboard, native-bridge, app-catalog, launcher-settings]
files:
  - frontend/src/ui/apps.js
  - frontend/src/ui/settings.js
  - frontend/src/actions.js
  - android/app/src/main/java/id/hengki/monovra/bridge/NativeBridge.kt
  - android/app/src/main/java/id/hengki/monovra/settings/SettingsRepository.kt
steps:
  - id: edit-shortcuts
    kind: screen
    title: Edit shortcuts
    screen: { route: /, name: App drawer or Applications settings }
    action: The driver toggles a pin or changes the order of existing shortcuts
    next: update-page
  - id: update-page
    kind: action
    title: Update the dashboard immediately
    action: The frontend applies the new ordered package list to local state
    calls: [Bridge setFavorites]
    next: validate-list
  - id: validate-list
    kind: system
    title: Validate installed packages
    action: Native code validates the count and names and removes packages absent from the app catalog
    next: persist-list
  - id: persist-list
    kind: system
    title: Persist shortcut order
    action: DataStore saves the ordered favorites and marks first-run initialization complete
    end: success
---

# Manage dashboard shortcuts

The app drawer supports tap-to-pin editing, while Applications settings also supports explicit up, down, and remove actions. Both paths update the same ordered favorites list.

## Gotchas
- The frontend updates optimistically; a rejected native request leaves an error message but does not currently roll local state back.
- Favorites that are no longer installed are filtered out when the dashboard derives visible shortcuts.

