import {
  createElement,
  AppWindow,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BellRing,
  Check,
  Disc3,
  House,
  Info,
  LayoutGrid,
  Music,
  Navigation,
  Palette,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  Rocket,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  X,
} from 'lucide';

// Only the icons listed here end up in the bundle (tree-shaken).
const ICONS = {
  AppWindow,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BellRing,
  Check,
  Disc3,
  House,
  Info,
  LayoutGrid,
  Music,
  Navigation,
  Palette,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  Rocket,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  X,
};

export function icon(name, size = '1.5rem', strokeWidth = 1.75) {
  const el = createElement(ICONS[name] || AppWindow);
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  el.setAttribute('stroke-width', String(strokeWidth));
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/**
 * Tiny element helper: h('button', { class: 'btn', onclick }, 'Label', child)
 * Attributes starting with "on" become listeners; `false`/`null` are skipped.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Grayscale app icon with a monochrome fallback when the image is unavailable. */
export function appIcon(app, cls = '') {
  const wrap = h('span', { class: `tile-icon ${cls}` });
  if (!app?.icon) {
    wrap.append(icon('AppWindow', '60%', 1.5));
    return wrap;
  }
  const img = h('img', { class: 'app-icon', src: app.icon, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' });
  img.addEventListener('error', () => img.replaceWith(icon('AppWindow', '60%', 1.5)), { once: true });
  wrap.append(img);
  return wrap;
}

let toastTimer = 0;
export function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status', text: message });
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

export function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '--:--';
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return hh > 0 ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}
