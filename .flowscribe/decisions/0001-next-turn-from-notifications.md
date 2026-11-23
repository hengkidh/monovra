---
flowscribe: 1
type: decision
id: next-turn-from-notifications
number: 1
title: Show the next turn by reading navigation notifications
summary: The next turn comes from the Google Maps or Waze ongoing notification, not from an embedded map, GPS or network tiles.
status: accepted
date: 2026-11-24
updated: 2026-11-24
affects: [navigation-turns, media-control, web-dashboard]
---

# 0001 — Show the next turn by reading navigation notifications

## Context
Drivers wanted navigation on the Home screen. MONOVRA is an offline launcher with no internet permission and a WebView that blocks all network loads, so an embedded web map cannot load tiles.

## Decision
Read the ongoing turn-by-turn notification of Google Maps and Waze through the existing notification listener and show only the next manoeuvre. Rejected: online map tiles (needs internet, breaks the offline promise and the privacy policy), bundled offline tiles (large download, no routing), and a native map view over the WebView (complex layout, still needs tiles).

## Consequences
No new permission and no network. The privacy policy and store listing now say that this one notification is read. The parser depends on an unofficial notification layout and must degrade to showing raw text when it changes.
