# Privacy Policy — MONOVRA

_Last updated: 24 November 2026_

MONOVRA is an offline Home launcher for Android car head units. This policy explains what the app
does with information on your device. In short: **MONOVRA does not collect, store on any server,
share or sell any personal data.**

## 1. No internet access

MONOVRA does not request the Android `INTERNET` permission. The whole interface is bundled inside
the app and runs on your device only. The app cannot send any information off your device.

## 2. Information the app uses on your device

| What | Why | Where it stays |
| --- | --- | --- |
| List of installed apps (name and icon of apps that can be launched) | To show app shortcuts and the app drawer | Only in the app's memory on your device |
| Your shortcut order, theme and layout preferences | To remember your settings between launches | Only in the app's private storage on your device |
| Media session information (song title, artist, album art, play state) of the music app that is playing | To show the current song and play/pause/skip controls | Only in the app's memory while it is shown; not saved |
| The ongoing turn-by-turn notification of Google Maps or Waze (next-turn arrow, distance, instruction, arrival estimate) | To show the next turn on the dashboard while you navigate | Only in the app's memory while navigation is active; not saved |

## 3. Notification Access

Android requires MONOVRA to be granted **Notification Access** for two features:

- **Music**: to find the active media session of your music app and show its controls.
- **Next turn**: to show the next turn while Google Maps or Waze is navigating. MONOVRA reads
  only the ongoing navigation notification of these two apps (arrow, distance, instruction and
  arrival estimate). Notifications from any other app are ignored and their content is not read.

Nothing from notifications is saved to storage or sent anywhere: the app has no internet access,
and the next-turn information is dropped as soon as navigation ends. You can turn this permission
off at any time in Android Settings; the rest of the launcher keeps working without it.

## 4. No tracking, ads or analytics

MONOVRA contains no advertising, no analytics or crash-reporting SDKs and no tracking of any kind.

## 5. Children

MONOVRA is not directed at children and does not knowingly collect information from anyone.

## 6. Deleting your data

All settings are stored only on your device. Uninstalling MONOVRA, or clearing its storage in
Android Settings › Apps › MONOVRA › Storage, removes them completely.

## 7. Changes to this policy

If this policy changes, the updated version will be published at this same address with a new
"Last updated" date.

## 8. Contact

Questions about this policy can be raised at
<https://github.com/hengkidh/monovra/issues>.
