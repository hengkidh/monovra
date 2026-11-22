import './styles.css';
import { connect, call, on } from './bridge.js';
import { state, set, watch } from './store.js';
import { actions } from './actions.js';
import { h } from './dom.js';
import { ClockPanel } from './ui/clock.js';
import { AppsPanel, AllAppsView } from './ui/apps.js';
import { MusicPanel } from './ui/music.js';
import { Dock } from './ui/dock.js';
import { SettingsView } from './ui/settings.js';
import { FocusView } from './ui/focus.js';

async function boot() {
  const kind = await connect();
  set({ bridge: kind });

  // Native pushes state changes; no polling.
  on('music', (music) => set({ music }));
  on('apps', (apps) => set({ apps }));
  on('system', (system) => set({ system }));
  on('settings', (settings) => {
    actions.applyTheme(settings.theme);
    set({ settings });
  });
  on('back', goBack);
  on('home', () => {
    document.activeElement?.blur?.();
    set({ view: 'home', editShortcuts: false, query: '' });
  });

  render();

  if (kind === 'none') return;
  try {
    const b = await call('getBootstrap');
    actions.applyTheme(b.settings.theme);
    set({ device: b.device, settings: b.settings, apps: b.apps, music: b.music, system: b.system });
  } catch (e) {
    console.error('Bootstrap failed', e);
  }
}

function goBack() {
  if (state.view === 'apps' && state.editShortcuts) return set({ editShortcuts: false });
  if (state.view !== 'home') return set({ view: 'home', query: '' });
}

/** Swipe up from Home to enter Focus; swipe down from Focus to return Home. */
function installFocusSwipe(target) {
  const minDistance = 72;
  let gesture = null;

  target.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || (state.view !== 'home' && state.view !== 'focus')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, startedAt: performance.now() };
  });
  target.addEventListener('pointercancel', () => (gesture = null));
  target.addEventListener('pointerup', (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const elapsed = performance.now() - gesture.startedAt;
    gesture = null;

    if (elapsed > 900 || Math.abs(dy) < minDistance || Math.abs(dy) < Math.abs(dx) * 1.25) return;
    if (state.view === 'home' && dy < 0) set({ view: 'focus' });
    else if (state.view === 'focus' && dy > 0) set({ view: 'home' });
  });
}

function render() {
  const main = h('main', { class: 'min-h-0 grid grid-rows-[minmax(0,1fr)]' });
  const views = {};
  // Views are created on first visit to keep startup light.
  const factories = {
    home: () =>
      h('div', { class: 'dashboard' }, ClockPanel(), MusicPanel(), AppsPanel()),
    apps: AllAppsView,
    settings: SettingsView,
    focus: FocusView,
  };
  const show = () => {
    const v = state.view;
    if (!views[v]) views[v] = factories[v]();
    for (const [k, el] of Object.entries(views)) el.hidden = k !== v;
    if (!main.contains(views[v])) main.append(views[v]);
    // Focus mode is full screen: no dock, no outer padding.
    app.classList.toggle('is-focus', v === 'focus');
    dock.hidden = v === 'focus';
  };
  const app = document.getElementById('app');
  const dock = Dock();
  installFocusSwipe(app);
  watch(['view'], show);
  show();

  app.replaceChildren(main, dock);
}

boot();
