import { h, icon } from '../dom.js';
import { set, state, watch } from '../store.js';
import { actions } from '../actions.js';

/**
 * Crisp manoeuvre icons. The arrow inside the navigation app's notification is
 * a small bitmap that blurs when scaled up on a head unit, so when the step's
 * text names the manoeuvre we draw a vector (SVG) arrow instead. The bitmap is
 * only a fallback for text we cannot read.
 */
const LEFT = /\b(kiri|left)\b/i;
const RIGHT = /\b(kanan|right)\b/i;

export function manoeuvreIcon(text) {
  const t = text || '';
  const side = (l, r, none) => (LEFT.test(t) ? l : RIGHT.test(t) ? r : none);
  if (/putar balik|berbalik|u-?turn/i.test(t)) return side('Undo2', 'Redo2', 'Undo2');
  if (/bundaran|roundabout|rotary/i.test(t)) return side('RotateCcw', 'RotateCw', 'RotateCw');
  if (/\b(tiba|arrive|sampai di tujuan)\b/i.test(t)) return 'Flag';
  if (/bergabung|\bmerge\b/i.test(t)) return 'Merge';
  if (/tetap di|\bkeep\b|\bfork\b|percabangan|lajur|\blane\b/i.test(t)) return side('MoveUpLeft', 'MoveUpRight', 'Split');
  if (/sedikit|agak|serong|slight|\bbear\b/i.test(t)) return side('MoveUpLeft', 'MoveUpRight', 'ArrowUp');
  if (/belok|\bturn\b/i.test(t)) return side('CornerUpLeft', 'CornerUpRight', null);
  if (/lurus|straight|\bcontinue\b|lanjutkan|\bhead\b/i.test(t)) return 'ArrowUp';
  return null;
}

/** Arrow element: vector icon when the manoeuvre is known, otherwise the app's bitmap. */
function Arrow(cls, size) {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  let shown = '';
  return {
    el,
    set(url, text) {
      const name = manoeuvreIcon(text);
      const key = name ? `icon:${name}` : url ? `url:${url}` : 'icon:Navigation';
      if (key === shown) return;
      shown = key;
      el.replaceChildren();
      if (!name && url) {
        el.style.setProperty('--arrow', `url("${url}")`);
        el.classList.add('has-arrow');
      } else {
        el.style.removeProperty('--arrow');
        el.classList.remove('has-arrow');
        el.append(icon(name || 'Navigation', size, name ? 2.25 : 1.75));
      }
    },
  };
}

/** Distances at or under this many metres are "turn now". */
const NOW_METRES = 50;
/** The next turn takes over the screen only from this distance... */
const NEAR_METRES = 300;
/** ...or briefly, when the navigation app moves on to a new step. */
const PEEK_MS = 8000;

function metresOf(distance) {
  const m = /^(\d+(?:[.,]\d+)?)\s?(km|mi|m|ft|yd)$/i.exec(distance || '');
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const unit = { km: 1000, mi: 1609.34, m: 1, ft: 0.3048, yd: 0.9144 }[m[2].toLowerCase()];
  return n * unit;
}

const isNow = (distance) => {
  const m = metresOf(distance);
  return m != null && m <= NOW_METRES;
};

/**
 * Keeps `state.navShown`: true while navigating AND the turn is near or a new
 * step has just started. Between turns the clock and player stay on screen.
 */
let peekTimer = 0;
let lastStep = null;
function updateShown() {
  const n = state.navigation;
  if (!n?.active) {
    clearTimeout(peekTimer);
    peekTimer = 0;
    lastStep = null;
    set({ navShown: false });
    return;
  }
  const step = n.instruction || '';
  if (step !== lastStep) {
    lastStep = step;
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => {
      peekTimer = 0;
      updateShown();
    }, PEEK_MS);
  }
  const m = metresOf(n.distance);
  set({ navShown: !!peekTimer || (m != null && m <= NEAR_METRES) });
}
watch(['navigation'], updateShown);
updateShown();

/** The time left ("18 min"), highlighted inside an ETA like "18 min · 8.4 km · 14:32 arrival". */
export function etaMinutes(eta) {
  const parts = (eta || '').split(/\s*[·•|]\s*/).filter(Boolean);
  return parts.find((p) => /\d\s*(min|menit|mnt|jam|j|hr|h)\b/i.test(p)) || parts[0] || '';
}

const openNav = () => {
  const pkg = state.navigation?.source?.packageName;
  if (pkg) actions.launchApp(pkg);
};

/** Large next-turn card. Replaces the clock pages while navigation is active. */
export function NextTurnCard() {
  const arrow = Arrow('nav-arrow', '72%');
  const source = h('span', { class: 'nav-source' });
  const eta = h('span', { class: 'nav-eta' });
  const distance = h('div', { class: 'nav-distance' });
  const instruction = h('div', { class: 'nav-instruction' });
  const el = h(
    'button',
    { class: 'nav-card', 'aria-label': 'Next turn, open navigation app', onclick: openNav },
    h('div', { class: 'nav-meta' }, h('span', { class: 'nav-source-wrap' }, icon('Navigation', '1rem'), source), eta),
    arrow.el,
    h('div', { class: 'nav-text' }, distance, instruction),
  );
  const render = () => {
    const n = state.navigation;
    if (!n?.active) return;
    arrow.set(n.arrow, n.instruction);
    source.textContent = n.source?.label || '';
    const mins = etaMinutes(n.eta);
    const full = n.eta || '';
    const at = mins ? full.indexOf(mins) : -1;
    if (at < 0) eta.replaceChildren(full);
    else eta.replaceChildren(full.slice(0, at), h('strong', { class: 'nav-eta-time' }, mins), full.slice(at + mins.length));
    distance.textContent = n.distance || '';
    distance.hidden = !n.distance;
    instruction.textContent = n.instruction || '';
    el.classList.toggle('is-now', isNow(n.distance));
  };
  watch(['navigation'], render);
  render();
  return el;
}

/**
 * Shows `nav` instead of `player` only while the next turn is near (see
 * `navShown`); the player is back between turns and when navigation ends.
 */
export function WhileNavigating(player, nav, cls = '') {
  const el = h('div', { class: `nav-swap ${cls}` }, player, nav);
  const render = () => {
    const navigating = !!state.navShown;
    player.hidden = navigating;
    nav.hidden = !navigating;
  };
  watch(['navShown'], render);
  render();
  return el;
}

/** Compact chip for the dock (outside Home) or, with `always`, in focus mode. */
export function NextTurnChip({ always = false, cls = '' } = {}) {
  const arrow = Arrow('nav-chip-arrow', '78%');
  const distance = h('span', { class: 'nav-chip-distance' });
  const street = h('span', { class: 'nav-chip-street' });
  const el = h('button', { class: `nav-chip ${cls}`, 'aria-label': 'Next turn, open navigation app', onclick: openNav }, arrow.el, distance, street);
  const render = () => {
    const n = state.navigation;
    el.hidden = always ? !state.navShown : !n?.active || state.view === 'home';
    if (el.hidden) return;
    arrow.set(n.arrow, n.instruction);
    distance.textContent = n.distance || '';
    street.textContent = n.instruction || '';
    el.classList.toggle('is-now', isNow(n.distance));
  };
  watch(['navigation', 'navShown', 'view'], render);
  render();
  return el;
}
