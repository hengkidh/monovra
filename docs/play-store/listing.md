# Google Play — store listing and console answers

Ready-to-paste text and answers for Play Console. Character limits are Play's:
title ≤ 30, short description ≤ 80, full description ≤ 4000.

---

## 1. Store listing — English (default language)

**App name** (14/30)

```
MONOVRA Launcher
```

**Short description** (79/80)

```
Minimal, offline home screen for car head units: clock, music and app shortcuts
```

**Full description**

```
MONOVRA is a clean, distraction-free Home launcher made for Android car head units and in-car tablets. Big, glanceable information and large touch targets, so you can see what matters with a quick look and keep your eyes on the road.

HOME DASHBOARD
• Large analog and digital clock with the full date
• Now playing card with album art and play, pause, previous and next controls for your music app
• Your favourite apps (navigation, music, radio) one tap away

NEXT TURN AT A GLANCE
• While Google Maps or Waze is navigating, the next turn (arrow, distance and street) replaces the clock
• In Focus mode it takes the music player's place, and on other screens it stays visible in the dock
• Turns into a bold highlight in the last metres before the turn; tap it to open your navigation app

FOCUS MODE
• Swipe up for a full-screen view without the dock
• Choose a clock-only, clock-and-player, stacked or ambient album-art layout
• Swipe down to return Home

MADE FOR THE CAR
• Dark, Light or Auto theme that follows your head unit's day/night mode
• Large buttons designed for touch screens in a moving car
• Pin, unpin and reorder shortcuts; search all installed apps in the app drawer

PRIVATE AND OFFLINE
• No internet permission: everything runs on your device
• No ads, no analytics, no tracking, no account
• Notification Access is used to find the music session that is playing and to show the next turn from Google Maps or Waze; other notifications are never read, and nothing is stored or sent

HOW TO USE
1. Install MONOVRA and open it.
2. Set it as your Home app when Android asks (or in Settings › Apps › Default apps › Home app).
3. Allow Notification Access to show and control the song that is playing and to show the next turn.

MONOVRA works on Android 10 and newer. It is a regular Android launcher for head units and tablets; it is not an Android Auto or Android Automotive OS app.
```

---

## 2. Store listing — Bahasa Indonesia (add as a translation)

**Nama aplikasi** (16/30)

```
MONOVRA Launcher
```

**Deskripsi singkat** (79/80)

```
Layar utama minimalis & offline untuk head unit mobil: jam, musik, pintasan app
```

**Deskripsi lengkap**

```
MONOVRA adalah launcher (layar utama) yang bersih dan minim gangguan, dibuat untuk head unit Android dan tablet di mobil. Informasi besar yang mudah dilihat sekilas dan tombol besar, supaya mata tetap fokus ke jalan.

DASHBOARD UTAMA
• Jam analog dan digital besar lengkap dengan tanggal
• Kartu lagu yang sedang diputar dengan sampul album serta tombol putar, jeda, sebelumnya, dan berikutnya
• Aplikasi favorit (navigasi, musik, radio) cukup satu ketukan

BELOKAN BERIKUTNYA SEKILAS PANDANG
• Saat Google Maps atau Waze sedang navigasi, belokan berikutnya (panah, jarak, dan nama jalan) menggantikan jam
• Di mode Focus tampil menggantikan pemutar musik, dan di layar lain tetap terlihat di dock
• Berubah jadi sorotan tebal di meter-meter terakhir sebelum belok; ketuk untuk membuka aplikasi navigasi

MODE FOCUS
• Geser ke atas untuk tampilan layar penuh tanpa dock
• Pilih tata letak jam saja, jam + pemutar, bertumpuk, atau ambient dengan sampul album
• Geser ke bawah untuk kembali ke Home

DIBUAT UNTUK MOBIL
• Tema Gelap, Terang, atau Otomatis yang mengikuti mode siang/malam head unit
• Tombol besar untuk layar sentuh di mobil yang bergerak
• Sematkan, lepas, dan urutkan pintasan; cari semua aplikasi di laci aplikasi

PRIVAT DAN OFFLINE
• Tanpa izin internet: semuanya berjalan di perangkat Anda
• Tanpa iklan, tanpa analitik, tanpa pelacakan, tanpa akun
• Akses Notifikasi dipakai untuk menemukan sesi musik yang sedang diputar dan menampilkan belokan berikutnya dari Google Maps atau Waze; notifikasi lain tidak pernah dibaca, dan tidak ada yang disimpan atau dikirim

CARA PAKAI
1. Pasang MONOVRA lalu buka.
2. Jadikan aplikasi Home saat Android bertanya (atau di Setelan › Aplikasi › Aplikasi default › Aplikasi layar utama).
3. Izinkan Akses Notifikasi agar lagu yang sedang diputar bisa ditampilkan dan dikontrol, serta belokan berikutnya bisa ditampilkan.

MONOVRA berjalan di Android 10 ke atas. Ini launcher Android biasa untuk head unit dan tablet, bukan aplikasi Android Auto atau Android Automotive OS.
```

---

## 3. Graphics checklist

| Asset | Size | Source |
| --- | --- | --- |
| App icon | 512 × 512 PNG, 32-bit, ≤ 1 MB | Export from `assets/branding/` |
| Feature graphic | 1024 × 500 PNG/JPG, no transparency | To make (logo + one dashboard screenshot) |
| Tablet screenshots (7" and 10") | min. 2, 16:9 landscape, 1080 px+ on the short side recommended | `screenshots/` (1920 × 1080; `7-` and `8-` show the next turn, added in v0.4.0) |
| Phone screenshots | min. 2 | Same landscape screenshots are accepted |

Screenshots must use dummy data only (no real names or account details).

---

## 4. App content answers (Policy › App content)

| Section | Answer |
| --- | --- |
| Privacy policy | `https://github.com/hengkidh/monovra/blob/main/PRIVACY.md` |
| Ads | No, the app contains no ads |
| App access | All functionality is available without special access (no login) |
| Content rating | Questionnaire: category "Utility, productivity, communication or other"; answer No to everything → Everyone / 3+ |
| Target audience | 18 and over (the app is for drivers); not designed for children |
| News app | No |
| Government app | No |
| Financial features | None |
| Health | None |
| Data safety | See section 5 |

---

## 5. Data safety form

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | Not applicable (no data collected) |
| Do you provide a way for users to request that their data is deleted? | Not applicable; all settings are local and removed on uninstall |

Why "No" is correct: the manifest has no `INTERNET` permission, so nothing leaves the device.
Android's definition of "collect" means transmitting data off the device; processing on the
device only (app list, media session, the Google Maps/Waze navigation notification) is not
collection. Still "No" after the next-turn feature (v0.4.0).

---

## 6. Store settings

| Field | Value |
| --- | --- |
| App category | Personalization (alternative: Auto & Vehicles) |
| Tags | Launcher, Car, Music player controls |
| Contact email | Use a dedicated support address (required by Play, shown publicly) |
| Website | `https://github.com/hengkidh/monovra` |

---

## 7. Release steps

1. Create the app in Play Console (default language English, type App, Free).
2. **App signing:** in *Test and release › Setup › App signing*, choose to use your own key
   (export and upload the existing release keystore) so Play builds and GitHub APKs share one
   signature and can update each other. Keep the keystore backed up offline.
3. Fill in sections 1, 4, 5 and 6 above.
4. Tag a release (`git tag vX.Y.Z && git push origin vX.Y.Z`); download `monovra-vX.Y.Z.aab`
   from the GitHub Release (or run `make bundle` locally).
5. Upload the AAB to **Closed testing**, add at least 12 testers and keep them opted in for
   14 days (required for new personal developer accounts).
6. Apply for production access, then promote the build to **Production**.
7. Check the target API level warning on upload; raise `compileSdk` / `targetSdk` in
   `android/app/build.gradle.kts` if Play requires a newer level.

---

## 8. Release notes ("What's new", ≤ 500 characters)

### v0.4.0

English:

```
New: next turn at a glance. While Google Maps or Waze is navigating, MONOVRA shows the next turn (arrow, distance and street) in place of the clock, instead of the music player in Focus mode, and in the dock on other screens. Tap it to open your navigation app. Everything stays on your device; only the navigation notification of these two apps is read.
```

Bahasa Indonesia:

```
Baru: belokan berikutnya sekilas pandang. Saat Google Maps atau Waze sedang navigasi, MONOVRA menampilkan belokan berikutnya (panah, jarak, dan nama jalan) menggantikan jam, menggantikan pemutar musik di mode Focus, dan di dock pada layar lain. Ketuk untuk membuka aplikasi navigasi. Semua tetap di perangkat; hanya notifikasi navigasi dua aplikasi ini yang dibaca.
```
