---
flowscribe: 1
type: module
id: media-control
title: Media session control
summary: Selects an active Android media session, publishes track state and artwork, and performs supported playback controls.
status: active
updated: 2026-11-23
kind: feature
files:
  - android/app/src/main/java/id/hengki/monovra/media/**
entrypoints:
  - android/app/src/main/java/id/hengki/monovra/media/MediaRepository.kt
  - android/app/src/main/java/id/hengki/monovra/media/ArtworkStore.kt
  - android/app/src/main/java/id/hengki/monovra/media/MediaNotificationListener.kt
depends_on: [app-catalog, launcher-settings]
env: []
data: [MusicState]
---

# Media session control

`MediaRepository` observes active Android media sessions only while the launcher is visible. It favors a playing session, then the user's preferred player, then the built-in preferred player family, then the prior or first available session. Metadata and playback callbacks publish `MusicState` without polling.

Artwork is scaled, encoded, and held in memory behind an opaque local token. Playback commands are sent only when the selected session advertises support for the requested action.

## Gotchas
- Reading sessions requires the user-granted Notification Access special permission; the listener service does not read or retain notifications.
- Changing the preferred player triggers immediate session reselection.
- Artwork work is canceled when selection changes, and stale results are ignored.

