---
flowscribe: 1
type: module
id: navigation-turns
title: Next-turn from navigation apps
summary: Reads the ongoing Google Maps or Waze turn-by-turn notification and publishes the next manoeuvre and its arrow to the dashboard.
status: active
updated: 2026-11-24
kind: feature
files:
  - android/app/src/main/java/id/hengki/monovra/navigation/**
  - frontend/src/ui/navigation.js
entrypoints:
  - android/app/src/main/java/id/hengki/monovra/navigation/NavigationRepository.kt
  - frontend/src/ui/navigation.js
depends_on: [media-control, app-catalog]
env: []
data: [NavigationState]
---

# Next-turn from navigation apps

The notification listener owned by media control forwards posted and removed notifications to `NavigationRepository`. Only ongoing notifications from Google Maps and Waze are inspected. Title, text and sub-text are split into distance, instruction and arrival estimate; the large icon is rendered to a small PNG held in memory behind an opaque `/nav/<token>.png` URL.

The dashboard shows a large next-turn card in place of the clock while navigation is active, and a compact chip at the start of the dock on other views. In focus mode the music player is swapped for the next turn only while navigation is active: the large card on the clock-and-music page, a larger chip on the compact and ambient pages. The clock-only focus page is unchanged. The arrow is used as a CSS mask so it follows the theme colour; at 50 m or less both switch to the full accent colour.

## Gotchas
- Only notifications that carry a recognisable distance or use the navigation category are accepted; other ongoing Maps/Waze notifications (location sharing, background) are ignored so they never replace the clock.
- The navigation notification layout is not a public API. If its distance format changes, the card stops appearing rather than showing wrong text.
- Navigation running on a phone through Android Auto does not post a notification on the head unit, so the card does not appear.
- State and arrow are memory only and are cleared when the notification disappears or the listener disconnects.
