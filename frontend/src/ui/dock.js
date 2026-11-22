import { h, icon } from '../dom.js';
import { state, watch, set, musicApp, navigationApp } from '../store.js';
import { actions } from '../actions.js';

/** Bottom dock: Home · Focus · Music · Navigation · All Apps · Settings. */
export function Dock() {
  const item = (iconName, label, onclick) =>
    h('button', { class: 'dock-item', 'aria-label': label, onclick }, icon(iconName, '1.45rem'), h('span', { text: label }));

  const home = item('House', 'Home', () => set({ view: 'home' }));
  const focus = item('Focus', 'Focus', () => set({ view: 'focus' }));
  const music = item('Music', 'Music', () => actions.openMusicApp());
  const nav = item('Navigation', 'Navigation', () => {
    const app = navigationApp();
    if (app) actions.launchApp(app.packageName);
  });
  const all = item('LayoutGrid', 'All Apps', () => set({ view: 'apps', editShortcuts: false }));
  const settings = item('Settings', 'Settings', () => set({ view: 'settings' }));

  const render = () => {
    const views = { home, apps: all, settings };
    for (const [v, el] of Object.entries(views)) {
      if (state.view === v) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    }
    const m = musicApp();
    music.lastChild.textContent = m?.label || 'Music';
    music.disabled = !m;
    const n = navigationApp();
    nav.lastChild.textContent = n?.label || 'Navigation';
    nav.disabled = !n;
  };
  watch(['view', 'apps', 'music', 'settings'], render);
  render();

  return h('nav', { class: 'dock card', 'aria-label': 'Dock' }, home, focus, music, nav, all, settings);
}
