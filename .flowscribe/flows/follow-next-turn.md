---
flowscribe: 1
type: flow
id: follow-next-turn
title: Follow the next turn
summary: While Google Maps or Waze navigates, the driver sees the next turn on the dashboard or dock and can tap it to open the navigation app.
status: active
updated: 2026-11-24
actor: driver
trigger: Google Maps or Waze posts an ongoing turn-by-turn notification and Notification Access is granted
modules: [navigation-turns, media-control, native-bridge, web-dashboard]
files:
  - android/app/src/main/java/id/hengki/monovra/navigation/NavigationRepository.kt
  - android/app/src/main/java/id/hengki/monovra/media/MediaNotificationListener.kt
  - android/app/src/main/java/id/hengki/monovra/web/LocalPathHandlers.kt
  - frontend/src/ui/navigation.js
  - frontend/src/ui/clock.js
  - frontend/src/ui/dock.js
  - frontend/src/ui/focus.js
steps:
  - id: read-notification
    kind: system
    title: Read navigation notification
    action: The listener passes only ongoing Google Maps or Waze notifications to the navigation repository, which parses distance, instruction, arrival estimate and arrow
    calls: [Notification listener callbacks]
    next: publish-state
  - id: publish-state
    kind: system
    title: Publish next turn
    action: Native code pushes the navigation event with an opaque arrow URL
    calls: [Bridge navigation event]
    next: show-turn
  - id: show-turn
    kind: screen
    title: Show next turn
    screen: { route: /, name: Dashboard next-turn card, dock chip, or focus-mode turn in place of the player }
    action: The card replaces the clock or player only within 300 m of the turn or for 8 s after a new step; between turns the clock and player stay. A vector arrow is drawn from the instruction text (bitmap arrow only as fallback); the card turns to full accent within 50 m
    next: open-navigation
  - id: open-navigation
    kind: action
    title: Open navigation app
    action: The driver taps the card or chip and the source navigation app opens
    calls: [Bridge launchApp]
    next: end-navigation
  - id: end-navigation
    kind: system
    title: End navigation
    action: The notification is removed, state is cleared and the clock returns
    end: success
---

# Follow the next turn

Read-only for the driver except the tap that opens the navigation app. Development preview: `/?nav=on` fakes a counting-down turn.

## Gotchas
- Without Notification Access, nothing is shown; the rest of the dashboard is unaffected.
- The vector arrow depends on recognisable words (ID/EN) in the instruction; when the app gives only a street name, the blurrier notification bitmap is used.
- The dock chip outside Home stays visible for the whole route; only takeovers of the clock and player wait for the turn.
