import { h, icon } from '../dom.js';
import { state, watch, set } from '../store.js';
import { actions } from '../actions.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

/** Outer edge shared by every dial mark (hour ticks, minor ticks, minute dots). */
const OUTER = 12;

/** Analog dial: 12 hour ticks, hour + minute hands and an amber second hand. */
function AnalogClock() {
  const root = svg('svg', { class: 'analog', viewBox: '0 0 200 200', 'aria-hidden': 'true' });
  // Minute dots: small and light, skipped where an hour tick sits.
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    root.append(svg('circle', { class: 'minute-dot', cx: 100, cy: OUTER + 1.3, r: 1.3, transform: `rotate(${i * 6} 100 100)` }));
  }
  for (let i = 0; i < 12; i++) {
    const major = i % 3 === 0;
    root.append(
      svg('line', {
        class: `tick ${major ? 'tick-major' : ''}`,
        x1: 100,
        y1: OUTER + (major ? 2 : 1.25),
        x2: 100,
        y2: major ? 30 : 23,
        'stroke-width': major ? 4 : 2.5,
        transform: `rotate(${i * 30} 100 100)`,
      }),
    );
  }
  const hour = svg('line', { class: 'hand', x1: 100, y1: 108, x2: 100, y2: 56, 'stroke-width': 7 });
  const minute = svg('line', { class: 'hand', x1: 100, y1: 112, x2: 100, y2: 30, 'stroke-width': 4 });
  const second = svg('line', { class: 'hand-second', x1: 100, y1: 122, x2: 100, y2: 22, 'stroke-width': 2 });
  root.append(hour, minute, second, svg('circle', { class: 'hub', cx: 100, cy: 100, r: 6 }), svg('circle', { class: 'hub-second', cx: 100, cy: 100, r: 3 }));

  return {
    el: root,
    set(date) {
      const sec = date.getSeconds();
      const m = date.getMinutes() + sec / 60;
      const hr = (date.getHours() % 12) + m / 60;
      hour.setAttribute('transform', `rotate(${hr * 30} 100 100)`);
      minute.setAttribute('transform', `rotate(${m * 6} 100 100)`);
      second.setAttribute('transform', `rotate(${sec * 6} 100 100)`);
    },
  };
}

/**
 * Left column: big analog + digital clock (24h) and the date.
 * Ticks once per second for the second hand, only while the page is visible
 * (timers are also paused natively when MONOVRA is in the background).
 */
export function ClockPanel() {
  const analog = AnalogClock();
  const hm = h('span');
  const secs = h('span', { class: 'digital-sec' });
  const digital = h('div', { class: 'digital', 'aria-label': 'Time' }, hm, secs);
  const date = h('div', { class: 'date' });

  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let timer = 0;
  let lastMinute = -1;
  const tick = () => {
    const now = new Date();
    const minuteKey = Math.floor(now.getTime() / 60_000);
    if (minuteKey !== lastMinute) {
      lastMinute = minuteKey;
      hm.textContent = timeFmt.format(now);
      date.textContent = dateFmt.format(now);
    }
    secs.textContent = String(now.getSeconds()).padStart(2, '0');
    analog.set(now);
    clearTimeout(timer);
    // Next wake-up right after the next whole second.
    timer = setTimeout(tick, 1000 - now.getMilliseconds() + 15);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else tick();
  });
  tick();

  return h('section', { class: 'clock-panel', 'aria-label': 'Clock' }, analog.el, h('div', {}, digital, date));
}

const THEMES = [
  { id: 'black', name: 'Full Black' },
  { id: 'white', name: 'Pure White' },
];

/** Top-right: theme swatches and the settings shortcut. */
export function Toolbar() {
  const swatches = THEMES.map((t) =>
    h(
      'button',
      { class: 'swatch', 'aria-label': t.name, title: t.name, 'data-theme-id': t.id, onclick: () => actions.setTheme(t.id) },
      h('span'),
    ),
  );
  const sync = () =>
    swatches.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeId === state.settings.theme)));
  watch(['settings'], sync);
  sync();

  return h(
    'div',
    { class: 'flex items-center justify-end gap-1 -my-1' },
    ...swatches,
    h('button', { class: 'btn btn-ghost btn-icon', 'aria-label': 'Settings', onclick: () => set({ view: 'settings' }) }, icon('Settings', '1.5rem')),
  );
}
