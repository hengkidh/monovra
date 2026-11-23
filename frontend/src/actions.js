import { call } from './bridge.js';
import { state, set } from './store.js';
import { toast } from './dom.js';

const MESSAGES = {
  NOT_INSTALLED: 'This app is not installed',
  LAUNCH_FAILED: 'The app could not be opened',
  NO_SESSION: 'No music is playing',
  UNSUPPORTED: 'Not supported on this device',
  PERMISSION_DENIED: 'Allow Notification Access in Settings',
  NO_BRIDGE: 'Native bridge unavailable',
  TIMEOUT: 'The system did not respond',
};

async function run(method, params) {
  try {
    return await call(method, params);
  } catch (e) {
    toast(MESSAGES[e.code] || 'Something went wrong');
    return null;
  }
}

const SYSTEM_DARK = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * The color theme to paint: a fixed choice, or for "auto" Android's dark mode
 * (pushed by native as system.nightMode; the browser preference in dev).
 */
export function resolveTheme(pref = state.settings.theme) {
  if (pref === 'black' || pref === 'white') return pref;
  const night = typeof state.system.nightMode === 'boolean' ? state.system.nightMode : SYSTEM_DARK.matches;
  return night ? 'black' : 'white';
}

function applyTheme(pref) {
  document.documentElement.dataset.theme = resolveTheme(pref);
}
SYSTEM_DARK.addEventListener?.('change', () => applyTheme());

export const actions = {
  applyTheme,

  setTheme(theme) {
    // Instant: switch CSS tokens now, persist in DataStore in the background.
    applyTheme(theme);
    set({ settings: { ...state.settings, theme } });
    run('setTheme', { theme });
  },

  launchApp: (packageName) => run('launchApp', { packageName }),
  openMusicApp: (packageName) => run('openMusicApp', packageName ? { packageName } : {}),

  playPause: () => run('playPause'),
  nextTrack: () => run('nextTrack'),
  previousTrack: () => run('previousTrack'),

  setFavorites(packages) {
    set({ settings: { ...state.settings, favorites: packages } });
    run('setFavorites', { packages });
  },
  togglePinned(pkg) {
    const fav = state.settings.favorites;
    this.setFavorites(fav.includes(pkg) ? fav.filter((p) => p !== pkg) : [...fav, pkg]);
  },
  moveFavorite(pkg, delta) {
    const fav = [...state.settings.favorites];
    const i = fav.indexOf(pkg);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= fav.length) return;
    [fav[i], fav[j]] = [fav[j], fav[i]];
    this.setFavorites(fav);
  },

  setPreferredMusicApp(packageName) {
    set({ settings: { ...state.settings, preferredMusicApp: packageName } });
    run('setPreferredMusicApp', { packageName });
  },

  requestHomeRole: () => run('requestHomeRole'),
  openHomeSettings: () => run('openHomeSettings'),
  openNotificationAccessSettings: () => run('openNotificationAccessSettings'),
  openAppInfo: () => run('openAppInfo'),
};
