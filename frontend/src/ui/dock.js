import { h, icon } from '../dom.js';
import { state, watch, set, musicApp, navigationApp } from '../store.js';
import { actions } from '../actions.js';
import { THEMES } from './settings.js';
import { NextTurnChip } from './navigation.js';

/** Bottom dock: Home · Focus · Music · Navigation · All Apps · Settings | Dark · Light · Auto. */
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

  // Theme switch after a divider: one tap, no trip into Settings while driving.
  const themeButtons = THEMES.map((t) =>
    h(
      'button',
      { class: 'theme-opt', role: 'radio', 'aria-label': `${t.label} theme`, title: t.label, onclick: () => actions.setTheme(t.id) },
      icon(t.icon, '1.3rem'),
      h('span', { text: t.label }),
    ),
  );
  const themeSwitch = h('div', { class: 'theme-switch', role: 'radiogroup', 'aria-label': 'Theme' }, ...themeButtons);

  const render = () => {
    THEMES.forEach((t, i) => themeButtons[i].setAttribute('aria-checked', String(state.settings.theme === t.id)));
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

  return h(
    'nav',
    { class: 'dock card', 'aria-label': 'Dock' },
    NextTurnChip(),
    home,
    focus,
    music,
    nav,
    all,
    settings,
    h('span', { class: 'dock-divider', 'aria-hidden': 'true' }),
    themeSwitch,
  );
}
