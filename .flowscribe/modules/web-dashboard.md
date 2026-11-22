---
flowscribe: 1
type: module
id: web-dashboard
title: Web dashboard
summary: Renders the driving dashboard, app drawer, media controls, focus view, dock, and settings from reactive native state.
status: active
updated: 2026-11-23
kind: feature
files:
  - frontend/index.html
  - frontend/public/**
  - frontend/src/**
entrypoints:
  - frontend/src/main.js
  - frontend/src/store.js
  - frontend/src/ui/apps.js
  - frontend/src/ui/music.js
  - frontend/src/ui/settings.js
depends_on: [native-bridge, app-catalog, media-control, launcher-settings]
env: []
data: []
---

# Web dashboard

The Vite-built single page connects to the native transport, registers event listeners, renders its shell, and requests a complete bootstrap snapshot. A small key-based store updates persistent view components for the dashboard, app drawer, focus mode, dock, and settings.

The app drawer supports search and shortcut editing. The media panel adapts among permission, empty-session, and active-session states. A vertical swipe moves between Home and Focus mode, while horizontal swipes select among clock-only, clock-and-player, centered compact-metadata, and ambient-artwork layouts. Theme and favorites changes update optimistically before native persistence completes.

## Gotchas
- Views are created lazily and hidden rather than rebuilt on every navigation.
- Home-to-Focus gestures require a dominant vertical movement so they do not compete with horizontal pagers.
- The development mock bridge is loaded only by the Vite development build.
- The theme boot script applies the saved or requested theme before the main bundle paints.

