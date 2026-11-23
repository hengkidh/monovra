import { h, icon } from '../dom.js';
import { state, watch } from '../store.js';
import { actions } from '../actions.js';

/** Arrow from the navigation app, tinted by the theme through a CSS mask. */
function Arrow(cls) {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  const fallback = icon('Navigation', '60%');
  return {
    el,
    set(url) {
      if (url) {
        el.style.setProperty('--arrow', `url("${url}")`);
        el.classList.add('has-arrow');
        fallback.remove();
      } else {
        el.style.removeProperty('--arrow');
        el.classList.remove('has-arrow');
        if (!el.contains(fallback)) el.append(fallback);
      }
    },
  };
}

/** Distances at or under this many metres are "turn now". */
const NOW_METRES = 50;

function isNow(distance) {
  const m = /^(\d+(?:[.,]\d+)?)\s?(m|ft|yd)$/i.exec(distance || '');
  if (!m) return false;
  const n = parseFloat(m[1].replace(',', '.'));
  const metres = m[2].toLowerCase() === 'm' ? n : m[2].toLowerCase() === 'ft' ? n * 0.3048 : n * 0.9144;
  return metres <= NOW_METRES;
}

const openNav = () => {
  const pkg = state.navigation?.source?.packageName;
  if (pkg) actions.launchApp(pkg);
};

/** Large next-turn card. Replaces the clock pages while navigation is active. */
export function NextTurnCard() {
  const arrow = Arrow('nav-arrow');
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
    arrow.set(n.arrow);
    source.textContent = n.source?.label || '';
    eta.textContent = n.eta || '';
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
 * Shows `nav` instead of `player` only while a navigation notification is
 * active; the player comes back as soon as navigation ends.
 */
export function WhileNavigating(player, nav, cls = '') {
  const el = h('div', { class: `nav-swap ${cls}` }, player, nav);
  const render = () => {
    const navigating = !!state.navigation?.active;
    player.hidden = navigating;
    nav.hidden = !navigating;
  };
  watch(['navigation'], render);
  render();
  return el;
}

/** Compact chip for the dock (outside Home) or, with `always`, in focus mode. */
export function NextTurnChip({ always = false, cls = '' } = {}) {
  const arrow = Arrow('nav-chip-arrow');
  const distance = h('span', { class: 'nav-chip-distance' });
  const street = h('span', { class: 'nav-chip-street' });
  const el = h('button', { class: `nav-chip ${cls}`, 'aria-label': 'Next turn, open navigation app', onclick: openNav }, arrow.el, distance, street);
  const render = () => {
    const n = state.navigation;
    el.hidden = !n?.active || (!always && state.view === 'home');
    if (el.hidden) return;
    arrow.set(n.arrow);
    distance.textContent = n.distance || '';
    street.textContent = n.instruction || '';
    el.classList.toggle('is-now', isNow(n.distance));
  };
  watch(['navigation', 'view'], render);
  render();
  return el;
}
