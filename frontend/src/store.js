/** Minimal reactive store: one state object, keyed subscriptions. */

export const state = {
  bridge: 'none',
  device: null,
  settings: { theme: 'black', favorites: [], preferredMusicApp: null },
  apps: [],
  music: null,
  system: { isDefaultLauncher: false, homeRoleAvailable: false, notificationAccess: false, sdkInt: 0 },
  view: 'home', // home | apps | settings
  settingsSection: 'appearance',
  editShortcuts: false,
  query: '',
};

const subs = new Map();

/** Subscribe to one or more keys. Returns nothing; UI lives as long as the page. */
export function watch(keys, fn) {
  for (const k of keys) {
    if (!subs.has(k)) subs.set(k, new Set());
    subs.get(k).add(fn);
  }
}

/** Shallow-merge a patch and notify subscribers of the changed keys (once per fn). */
export function set(patch) {
  const fns = new Set();
  for (const [k, v] of Object.entries(patch)) {
    if (state[k] === v) continue;
    state[k] = v;
    subs.get(k)?.forEach((fn) => fns.add(fn));
  }
  fns.forEach((fn) => fn(state));
}

// ---- Derived helpers --------------------------------------------------------

export const KNOWN = {
  YOUTUBE_MUSIC: 'com.google.android.apps.youtube.music',
  SPOTIFY: 'com.spotify.music',
  NAV: ['com.google.android.apps.maps', 'com.waze'],
};

export function appByPackage(pkg) {
  return state.apps.find((a) => a.packageName === pkg) || null;
}

/** Pinned apps that are actually installed, in the user's order. */
export function favoriteApps() {
  return state.settings.favorites.map(appByPackage).filter(Boolean);
}

export function musicApp() {
  const candidates = [
    state.music?.source?.packageName,
    state.settings.preferredMusicApp,
    KNOWN.YOUTUBE_MUSIC,
    KNOWN.SPOTIFY,
  ];
  for (const pkg of candidates) {
    const app = pkg && appByPackage(pkg);
    if (app) return app;
  }
  return state.apps.find((a) => a.isMusic) || null;
}

export function navigationApp() {
  for (const pkg of KNOWN.NAV) {
    const app = appByPackage(pkg);
    if (app) return app;
  }
  return state.apps.find((a) => a.isNavigation) || null;
}
