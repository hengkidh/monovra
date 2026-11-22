---
flowscribe: 1
type: module
id: native-bridge
title: Native web bridge
summary: Validates and routes the restricted request, response, and event protocol between the dashboard and Android services.
status: active
updated: 2026-11-23
kind: shared
files:
  - android/app/src/main/java/id/hengki/monovra/bridge/**
  - android/app/src/main/java/id/hengki/monovra/web/**
  - frontend/src/bridge.js
  - frontend/src/actions.js
entrypoints:
  - android/app/src/main/java/id/hengki/monovra/bridge/NativeBridge.kt
  - frontend/src/bridge.js
  - frontend/src/actions.js
depends_on: [app-catalog, media-control, launcher-settings]
env: []
data: []
---

# Native web bridge

The frontend sends named requests with an identifier and validated parameters. `NativeBridge` dispatches only an explicit method allowlist and replies with either a result or a stable error code. After bootstrap, native repositories push music, apps, settings, system, Back, and Home events to the page.

Modern WebViews use an origin-restricted message listener. Older supported WebViews use a guarded JavaScript interface. Local icon and artwork handlers validate path inputs and never map requests to arbitrary files.

## Gotchas
- Events emitted before `getBootstrap` are intentionally dropped; bootstrap is the readiness boundary.
- Requests have size, method-name, package-name, favorites-count, and installed-package checks.
- The frontend gives each request an eight-second timeout and turns known bridge errors into driver-facing messages.

