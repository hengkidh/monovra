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
  watch(['view'], show);
  show();

  app.replaceChildren(main, dock);
}

boot();
