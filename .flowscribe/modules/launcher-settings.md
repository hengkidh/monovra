---
flowscribe: 1
type: module
id: launcher-settings
title: Launcher settings and system actions
summary: Persists launcher preferences and opens Android consent screens for Home role, media access, and app information.
status: active
updated: 2026-11-23
kind: feature
files:
  - android/app/src/main/java/id/hengki/monovra/settings/**
  - android/app/src/main/java/id/hengki/monovra/system/**
entrypoints:
  - android/app/src/main/java/id/hengki/monovra/settings/SettingsRepository.kt
  - android/app/src/main/java/id/hengki/monovra/system/SystemActions.kt
  - android/app/src/main/java/id/hengki/monovra/settings/MonovraTheme.kt
depends_on: []
env: []
data: [MonovraSettings, MonovraTheme, ThemePreference]
---

# Launcher settings and system actions

`SettingsRepository` stores the theme, ordered favorites, first-run initialization marker, and optional preferred music package in Jetpack DataStore. `SystemActions` reports Home-role state and opens Android-owned settings or consent screens without bypassing user choice.

The stored theme is a `ThemePreference`: Dark (`black`), Light (`white`), or Auto (`auto`). Auto resolves to one of the two `MonovraTheme` color themes from Android's night mode. The two color themes are mirrored by the frontend tokens so the native window and WebView paint consistently from the first frame.

## Gotchas
- Unknown stored theme identifiers fall back to the black theme.
- Settings JSON carries the preference (`auto` included); the page resolves the painted theme itself from `system.nightMode`.
- Home-role and settings intents have device-dependent fallbacks because aftermarket firmware varies.
- On newer Android versions, sideloaded builds may require the user to allow restricted settings before Notification Access can be enabled.

