/**
 * DEVELOPMENT ONLY — loaded by `vite dev` when no Android bridge exists, so the
 * UI can be built in a desktop browser. It is never included in the APK build
 * (bridge.js imports it behind `import.meta.env.DEV`).
 */

const svgIcon = (letter, color) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="${color}"/>` +
      `<text x="48" y="62" font-family="sans-serif" font-size="44" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`,
  );

const APPS = [
  ['com.google.android.apps.youtube.music', 'YT Music', '#ff0033', true, false],
  ['com.google.android.apps.maps', 'Maps', '#34a853', false, true],
  ['com.waze', 'Waze', '#33ccff', false, true],
  ['com.android.settings', 'Settings', '#607d8b', false, false],
  ['com.spotify.music', 'Spotify', '#1db954', true, false],
  ['com.android.chrome', 'Chrome', '#4285f4', false, false],
  ['com.android.dialer', 'Phone', '#0b8043', false, false],
  ['com.whatsapp', 'WhatsApp', '#25d366', false, false],
  ['com.vendor.radio', 'FM Radio', '#ff9800', true, false],
  ['com.vendor.carsettings', 'Car Settings', '#9c27b0', false, false],
  ['com.vendor.bluetooth', 'Bluetooth Phone With A Very Long Name', '#3f51b5', false, false],
].map(([packageName, label, color, isMusic, isNavigation]) => ({
  packageName,
  label,
  icon: svgIcon(label[0], color),
  isMusic,
  isNavigation,
}));

const ART =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs>' +
      '<rect width="300" height="300" fill="url(#g)"/><circle cx="150" cy="150" r="70" fill="#111" opacity=".85"/>' +
      '<circle cx="150" cy="150" r="14" fill="#f97316"/></svg>',
  );

export function createMockNative(receive) {
  const settings = {
    theme: new URLSearchParams(location.search).get('theme') || 'black',
    favorites: ['com.google.android.apps.youtube.music', 'com.google.android.apps.maps', 'com.waze', 'com.android.settings'],
    preferredMusicApp: null,
  };
  const scenario = new URLSearchParams(location.search).get('music') || 'playing'; // playing | empty | denied
  let music = {
    permission: scenario === 'denied' ? 'denied' : 'granted',
    hasSession: scenario === 'playing',
    source: { packageName: 'com.google.android.apps.youtube.music', label: 'YT Music' },
    title: 'Midnight Highway (Extended Drive Mix) — a deliberately long title',
    artist: 'The Mock Session Orchestra',
    album: 'Dev Preview',
    artwork: ART,
    playback: 'playing',
    positionMs: 42_000,
    durationMs: 245_000,
    speed: 1,
    capturedAt: Date.now(),
    actions: { playPause: true, next: true, previous: true },
  };
  const system = { isDefaultLauncher: false, homeRoleAvailable: true, notificationAccess: scenario !== 'denied', sdkInt: 34 };
  const emit = (event, data) => setTimeout(() => receive({ type: 'event', event, data }), 30);
  const snapshot = () => {
    const pos = music.playback === 'playing' ? music.positionMs + (Date.now() - music.capturedAt) : music.positionMs;
    return { ...music, positionMs: pos, capturedAt: Date.now() };
  };

  const handlers = {
    getBootstrap: () => ({
      device: { manufacturer: 'Browser', model: 'Dev preview', androidVersion: '14', sdkInt: 34, appVersion: 'dev', webViewVersion: navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? null },
      settings,
      apps: APPS,
      music: snapshot(),
      system,
    }),
    setTheme: ({ theme }) => {
      settings.theme = theme;
      emit('settings', { ...settings });
      return { theme };
    },
    setFavorites: ({ packages }) => {
      settings.favorites = packages;
      emit('settings', { ...settings });
      return { favorites: packages };
    },
    setPreferredMusicApp: ({ packageName }) => {
      settings.preferredMusicApp = packageName;
      emit('settings', { ...settings });
      return {};
    },
    playPause: () => {
      music = snapshot();
      music.playback = music.playback === 'playing' ? 'paused' : 'playing';
      emit('music', snapshot());
      return { done: true };
    },
    nextTrack: () => {
      music = { ...snapshot(), title: 'Next Track', positionMs: 0, durationMs: -1 };
      emit('music', snapshot());
      return { done: true };
    },
    previousTrack: () => {
      music = { ...snapshot(), positionMs: 0 };
      emit('music', snapshot());
      return { done: true };
    },
    launchApp: ({ packageName }) => (console.info('[mock] launch', packageName), { launched: packageName }),
    openMusicApp: () => (console.info('[mock] open music app'), {}),
    requestHomeRole: () => {
      system.isDefaultLauncher = true;
      emit('system', { ...system });
      return { requested: true };
    },
    openHomeSettings: () => ({ opened: true }),
    openNotificationAccessSettings: () => {
      system.notificationAccess = true;
      music.permission = 'granted';
      emit('system', { ...system });
      emit('music', snapshot());
      return { opened: true };
    },
    openAppInfo: () => ({ opened: true }),
  };

  return {
    send(raw) {
      const { id, method, params } = JSON.parse(raw);
      const fn = handlers[method];
      setTimeout(() => {
        if (!fn) receive({ type: 'response', id, ok: false, error: { code: 'UNKNOWN_METHOD', message: method } });
        else receive({ type: 'response', id, ok: true, result: fn(params || {}) });
      }, 10);
    },
  };
}
