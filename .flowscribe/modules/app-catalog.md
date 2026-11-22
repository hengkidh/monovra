---
flowscribe: 1
type: module
id: app-catalog
title: Installed app catalog
summary: Discovers launchable apps, classifies car-relevant apps, supplies icons, and builds first-run dashboard shortcuts.
status: active
updated: 2026-11-23
kind: domain
files:
  - android/app/src/main/java/id/hengki/monovra/apps/**
entrypoints:
  - android/app/src/main/java/id/hengki/monovra/apps/AppRepository.kt
  - android/app/src/main/java/id/hengki/monovra/apps/IconProvider.kt
depends_on: []
env: []
data: [AppEntry]
---

# Installed app catalog

`AppRepository` queries launcher activities, excludes MONOVRA itself, keeps one entry per package, and sorts labels for display. Package broadcasts trigger a coalesced refresh. Music and navigation classification combines Android intent categories with known package families.

`IconProvider` renders package icons as PNG data for the local image handler. On first run the repository selects up to four installed, car-relevant favorites, falling back to other launchable apps when needed.

## Gotchas
- Only packages in the current repository snapshot can be launched or saved as favorites.
- Multiple launcher activities from one package collapse to a single app entry.
- Package updates change the icon URL version so stale cached icons are not reused.

