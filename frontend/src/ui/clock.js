import { h } from '../dom.js';
import { watch } from '../store.js';
import { Pager } from './pager.js';

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
  const root = svg('svg', { class: 'analog', viewBox: '-16 -16 232 232', 'aria-hidden': 'true' });
  // Watch face: a soft filled disc with a hairline bezel.
  root.append(svg('circle', { class: 'face', cx: 100, cy: 100, r: 94 }));
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
  // Minute numbers 5…60 on a ring outside the dial, kept upright.
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const r = 101;
    const t = svg('text', { class: 'minute-num', x: (100 + r * Math.sin(a)).toFixed(2), y: (100 - r * Math.cos(a)).toFixed(2) });
    t.textContent = String(i * 5);
    root.append(t);
  }
  const hour = svg('line', { class: 'hand', x1: 100, y1: 108, x2: 100, y2: 56, 'stroke-width': 7 });
  const minute = svg('line', { class: 'hand', x1: 100, y1: 112, x2: 100, y2: 30, 'stroke-width': 4 });
  const secondLine = svg('line', { class: 'hand-second', x1: 100, y1: 122, x2: 100, y2: 22, 'stroke-width': 2 });
  // The group sweeps continuously via a 60s CSS animation (GPU, no JS per frame).
  const second = svg('g', { class: 'second-sweep' });
  second.append(secondLine);
  root.append(hour, minute, svg('circle', { class: 'hub', cx: 100, cy: 100, r: 6 }), second, svg('circle', { class: 'hub-second', cx: 100, cy: 100, r: 3 }));

  return {
    el: root,
    /** Re-aligns the sweep with the real clock (on start and when the page becomes visible). */
    sync(date) {
      const s = date.getSeconds() + date.getMilliseconds() / 1000;
      second.style.animation = 'none';
      void second.getBoundingClientRect();
      second.style.animation = '';
      second.style.animationDelay = `-${s.toFixed(3)}s`;
    },
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

// ---- Shared once-per-second ticker ------------------------------------------
// One timer drives every clock on screen. CSS sweeps (second hand, seconds bar)
// are re-aligned whenever the page or a view becomes visible again, because
// animations restart from zero after display:none.
const tickSubs = new Set();
const syncSubs = new Set();
let tickTimer = 0;

function loop() {
  const now = new Date();
  tickSubs.forEach((f) => f(now));
  clearTimeout(tickTimer);
  // Next wake-up right after the next whole second.
  tickTimer = setTimeout(loop, 1000 - now.getMilliseconds() + 15);
}
function resync() {
  const now = new Date();
  syncSubs.forEach((f) => f(now));
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearTimeout(tickTimer);
    tickTimer = 0;
  } else {
    loop();
    resync();
  }
});
watch(['view'], () => requestAnimationFrame(resync));

/** Calls `tick(now)` every second and `sync(now)` whenever sweeps must re-align. */
export function onClock(tick, sync) {
  tickSubs.add(tick);
  if (sync) syncSubs.add(sync);
  const now = new Date();
  tick(now);
  sync?.(now);
  if (!tickTimer) loop();
}

export const FMT = {
  time: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  weekday: new Intl.DateTimeFormat(undefined, { weekday: 'long' }),
  day: new Intl.DateTimeFormat(undefined, { day: 'numeric' }),
  monthYear: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }),
};

/** Digital time (HH:MM + small amber seconds) and the date block. */
function TimeDate() {
  const hm = h('span');
  const secs = h('span', { class: 'digital-sec' });
  const dayNum = h('div', { class: 'date-num' });
  const weekday = h('div', { class: 'date-weekday' });
  const dayDate = h('div', { class: 'date-day' });
  const el = h(
    'div',
    {},
    h('div', { class: 'digital', 'aria-label': 'Time' }, hm, secs),
    h('div', { class: 'date' }, dayNum, h('div', { class: 'date-text' }, weekday, dayDate)),
  );
  let lastMinute = -1;
  return {
    el,
    tick(now) {
      const minute = Math.floor(now.getTime() / 60_000);
      if (minute !== lastMinute) {
        lastMinute = minute;
        hm.textContent = FMT.time.format(now);
        weekday.textContent = FMT.weekday.format(now);
        dayNum.textContent = FMT.day.format(now);
        dayDate.textContent = FMT.monthYear.format(now);
      }
      secs.textContent = String(now.getSeconds()).padStart(2, '0');
    },
  };
}

/**
 * Large clock: weekday label, big split-weight time with a seconds sweep bar,
 * and the full date with the day number emphasized. Self-ticking.
 */
export function LargeTime(extraClass = '') {
  const weekday = h('div', { class: 'big-weekday label' });
  const hh = h('span', { class: 'big-hh' });
  const mm = h('span', { class: 'big-mm' });
  const secs = h('span', { class: 'big-sec' });
  const time = h('div', { class: 'big-time', 'aria-label': 'Time' }, hh, h('span', { class: 'big-colon', text: ':' }), mm, secs);
  const fill = h('span');
  const bar = h('div', { class: 'sec-bar', 'aria-hidden': 'true' }, fill);
  const dayNum = h('span', { class: 'big-daynum' });
  const monthYear = h('span', { class: 'big-month' });
  const el = h('div', { class: `big-clock ${extraClass}` }, weekday, time, bar, h('div', { class: 'big-date' }, dayNum, monthYear));

  let lastMinute = -1;
  onClock(
    (now) => {
      const minute = Math.floor(now.getTime() / 60_000);
      if (minute !== lastMinute) {
        lastMinute = minute;
        const [H, M] = FMT.time.format(now).split(':');
        hh.textContent = H;
        mm.textContent = M;
        weekday.textContent = FMT.weekday.format(now);
        dayNum.textContent = FMT.day.format(now);
        monthYear.textContent = FMT.monthYear.format(now);
      }
      secs.textContent = String(now.getSeconds()).padStart(2, '0');
      // Reduced-motion fallback: stepped fill (the CSS sweep overrides it otherwise).
      fill.style.setProperty('--p', String(now.getSeconds() / 59));
    },
    (now) => {
      const s = now.getSeconds() + now.getMilliseconds() / 1000;
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = '';
      fill.style.animationDelay = `-${s.toFixed(3)}s`;
    },
  );
  return el;
}

/** Home left column, swipeable: (1) analog + time + date, (2) large time + date. */
export function ClockPanel() {
  const analog = AnalogClock();
  const small = TimeDate();
  onClock(
    (now) => {
      small.tick(now);
      analog.set(now);
    },
    (now) => analog.sync(now),
  );
  const page1 = h('div', { class: 'clock-page' }, analog.el, small.el);
  const page2 = h('div', { class: 'clock-page' }, LargeTime());
  return h(
    'section',
    { class: 'clock-panel', 'aria-label': 'Clock' },
    Pager([page1, page2], { key: 'monovra.clockPage', labels: ['Analog clock', 'Large clock'] }),
  );
}
