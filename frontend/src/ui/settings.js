import { h, icon, appIcon } from '../dom.js';
import { state, watch, set, favoriteApps } from '../store.js';
import { actions } from '../actions.js';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: 'Palette' },
  { id: 'applications', label: 'Applications', icon: 'LayoutGrid' },
  { id: 'music', label: 'Music', icon: 'Music' },
  { id: 'launcher', label: 'Launcher', icon: 'House' },
  { id: 'about', label: 'About', icon: 'Info' },
];

export const THEMES = [
  { id: 'black', label: 'Dark', icon: 'Moon', hint: 'True black for night driving' },
  { id: 'white', label: 'Light', icon: 'Sun', hint: 'Bright and clean' },
  { id: 'auto', label: 'Auto', icon: 'SunMoon', hint: 'Follows Android dark mode (day/night)' },
];

const heading = (text, sub) =>
  h('div', { class: 'pb-1' }, h('h2', { class: 'text-xl font-semibold', text }), sub && h('p', { class: 'text-muted text-sm mt-1', text: sub }));

const radioRow = (label, checked, onclick, leading = null, sub = null) =>
  h(
    'button',
    { class: 'row w-full text-left', role: 'radio', 'aria-checked': String(checked), onclick },
    leading,
    h('span', { class: 'row-title' }, label, sub && h('span', { class: 'block text-sm text-muted truncate', text: sub })),
    h('span', { class: 'radio' }),
  );

const statusPill = (ok, okText, badText) =>
  h('span', { class: `pill ${ok ? 'pill-ok' : ''}` }, icon(ok ? 'Check' : 'X', '0.9rem', 2.5), ok ? okText : badText);

function appearance() {
  return [
    heading('Appearance', 'Choose the launcher color theme.'),
    ...THEMES.map((t) => radioRow(t.label, state.settings.theme === t.id, () => actions.setTheme(t.id), null, t.hint)),
  ];
}

function applications() {
  const pinned = favoriteApps();
  return [
    heading('Applications', 'Pinned shortcuts on the home screen, in order.'),
    ...pinned.map((app, i) =>
      h(
        'div',
        { class: 'row' },
        appIcon(app, 'app-icon-sm'),
        h('span', { class: 'row-title', text: app.label }),
        h(
          'button',
          { class: 'btn btn-icon', 'aria-label': `Move ${app.label} up`, disabled: i === 0, onclick: () => actions.moveFavorite(app.packageName, -1) },
          icon('ArrowUp', '1.2rem'),
        ),
        h(
          'button',
          {
            class: 'btn btn-icon',
            'aria-label': `Move ${app.label} down`,
            disabled: i === pinned.length - 1,
            onclick: () => actions.moveFavorite(app.packageName, 1),
          },
          icon('ArrowDown', '1.2rem'),
        ),
        h(
          'button',
          { class: 'btn btn-icon', 'aria-label': `Unpin ${app.label}`, onclick: () => actions.togglePinned(app.packageName) },
          icon('X', '1.2rem'),
        ),
      ),
    ),
    !pinned.length && h('p', { class: 'text-muted py-2', text: 'No pinned apps yet.' }),
    h(
      'div',
      { class: 'pt-2' },
      h('button', { class: 'btn btn-primary', onclick: () => set({ view: 'apps', editShortcuts: true }) }, icon('Pin', '1.1rem'), 'Pin apps'),
    ),
  ];
}

function music() {
  const musicApps = state.apps.filter((a) => a.isMusic);
  const pref = state.settings.preferredMusicApp;
  const granted = state.system.notificationAccess;
  const restricted = (state.system.sdkInt || 0) >= 33;
  return [
    heading('Music', 'MONOVRA reads media sessions; YouTube Music is preferred automatically when active.'),
    h('span', { class: 'label pt-2', text: 'Preferred music app' }),
    radioRow('Automatic', !pref, () => actions.setPreferredMusicApp(null), null, 'Playing app first, then YouTube Music'),
    ...musicApps.map((app) =>
      radioRow(app.label, pref === app.packageName, () => actions.setPreferredMusicApp(app.packageName), appIcon(app, 'app-icon-sm')),
    ),
    h('span', { class: 'label pt-4', text: 'Notification Access' }),
    h(
      'div',
      { class: 'row' },
      h('span', { class: 'row-title' }, 'Media session access', h('span', { class: 'block text-sm text-muted', text: 'Required to show and control music' })),
      statusPill(granted, 'Granted', 'Not granted'),
    ),
    h(
      'div',
      { class: 'flex flex-wrap gap-3 pt-1' },
      h('button', { class: `btn ${granted ? '' : 'btn-primary'}`, onclick: () => actions.openNotificationAccessSettings() }, 'Open permission settings'),
      restricted && h('button', { class: 'btn', onclick: () => actions.openAppInfo() }, 'App info'),
    ),
    restricted &&
      !granted &&
      h('p', {
        class: 'text-sm text-muted leading-relaxed',
        text: 'Android 13+ blocks this switch for apps installed outside an app store. Open App info, tap ⋮ › Allow restricted settings, then enable Notification Access.',
      }),
  ];
}

function launcher() {
  const isDefault = state.system.isDefaultLauncher;
  return [
    heading('Launcher', 'Use MONOVRA as the Home screen of this head unit.'),
    h('div', { class: 'row' }, h('span', { class: 'row-title', text: 'Default Home app' }), statusPill(isDefault, 'MONOVRA', 'Another launcher')),
    h(
      'div',
      { class: 'flex flex-wrap gap-3 pt-1' },
      h('button', { class: 'btn btn-primary', disabled: isDefault, onclick: () => actions.requestHomeRole() }, icon('Rocket', '1.1rem'), 'Set MONOVRA as Default Launcher'),
      h('button', { class: 'btn', onclick: () => actions.openHomeSettings() }, 'Open Android Home Settings'),
    ),
    h('p', {
      class: 'text-sm text-muted leading-relaxed pt-1',
      text: 'To return to the original launcher, choose it in Android Home Settings. MONOVRA never disables the factory launcher.',
    }),
  ];
}

function about() {
  const d = state.device || {};
  const line = (k, v) => v && h('div', { class: 'row' }, h('span', { class: 'row-title text-muted', text: k }), h('span', { text: v }));
  return [
    h(
      'div',
      { class: 'py-2' },
      h('div', { class: 'text-3xl font-semibold tracking-[0.2em]', text: 'MONOVRA' }),
      h('p', { class: 'text-muted mt-1', text: 'Less interface. More drive.' }),
    ),
    line('App version', d.appVersion),
    line('Device', [d.manufacturer, d.model].filter(Boolean).join(' ')),
    line('Android', d.androidVersion && `${d.androidVersion} (API ${d.sdkInt})`),
    line('WebView', d.webViewVersion),
  ];
}

const RENDER = { appearance, applications, music, launcher, about };

export function SettingsView() {
  const nav = h('nav', { class: 'flex flex-col gap-1 w-[14rem] flex-none', 'aria-label': 'Settings sections' });
  const body = h('div', { class: 'scroll flex-1 min-w-0 flex flex-col gap-2 pr-1' });

  const render = () => {
    nav.replaceChildren(
      h('button', { class: 'nav-item mb-2', onclick: () => set({ view: 'home' }) }, icon('ArrowLeft', '1.3rem'), 'Back'),
      ...SECTIONS.map((s) =>
        h(
          'button',
          { class: 'nav-item', 'aria-current': String(state.settingsSection === s.id), onclick: () => set({ settingsSection: s.id }) },
          icon(s.icon, '1.3rem'),
          s.label,
        ),
      ),
    );
    const scroll = body.scrollTop;
    body.replaceChildren(...(RENDER[state.settingsSection] || appearance)().filter(Boolean));
    body.scrollTop = scroll;
  };
  watch(['settingsSection', 'settings', 'apps', 'system', 'device'], render);
  render();

  return h('section', { class: 'card flex gap-5 min-h-0 p-4', 'aria-label': 'Settings' }, nav, body);
}
