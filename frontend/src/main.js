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
  on('navigation', (navigation) => set({ navigation: navigation || { active: false } }));
  on('apps', (apps) => set({ apps }));
  on('system', (system) => {
    set({ system });
    actions.applyTheme(); // "auto" follows Android day/night
  });
  on('settings', (settings) => {
    set({ settings });
    actions.applyTheme();
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
    set({ device: b.device, settings: b.settings, apps: b.apps, music: b.music, navigation: b.navigation || { active: false }, system: b.system });
    actions.applyTheme();
  } catch (e) {
    console.error('Bootstrap failed', e);
  }
}

function goBack() {
  if (state.view === 'apps' && state.editShortcuts) return set({ editShortcuts: false });
  if (state.view !== 'home') return set({ view: 'home', query: '' });
}

/**
 * Swipe up from Home to enter Focus; swipe down from Focus to return Home.
 * Decided while the finger moves (no need to lift), with forgiving limits for
 * slow or slightly diagonal swipes on a moving car's touch screen.
 */
function installFocusSwipe(target) {
  const minDistance = 48;
  const maxDuration = 1500;
  let gesture = null;

  const decide = (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (performance.now() - gesture.startedAt > maxDuration) return (gesture = null);
    if (Math.abs(dy) < minDistance || Math.abs(dy) < Math.abs(dx)) return;
    gesture = null;
    if (state.view === 'home' && dy < 0) set({ view: 'focus' });
    else if (state.view === 'focus' && dy > 0) set({ view: 'home' });
  };

  target.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || (state.view !== 'home' && state.view !== 'focus')) return;
    // Vertical lists scroll on their own; a swipe there is a scroll, not navigation.
    if (event.target.closest?.('.scroll, input, textarea')) return (gesture = null);
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, startedAt: performance.now() };
  });
  target.addEventListener('pointermove', decide);
  target.addEventListener('pointerup', (event) => {
    decide(event);
    gesture = null;
  });
  target.addEventListener('pointercancel', () => (gesture = null));
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
