import { h } from '../dom.js';

/**
 * Horizontal, swipeable pages using native scroll-snap (no gesture code),
 * with dots below. The last page is remembered under `key`.
 */
export function Pager(pages, { key, labels = [], className = '' } = {}) {
  const track = h('div', { class: 'pager-track' }, ...pages.map((p) => (p.classList.add('pager-page'), p)));
  const dots = pages.map((_, i) =>
    h('button', {
      class: 'pager-dot',
      'aria-label': labels[i] || `Page ${i + 1}`,
      onclick: () => track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }),
    }),
  );

  const saved = Number(localStorage.getItem(key));
  let page = Number.isInteger(saved) && saved >= 0 && saved < pages.length ? saved : 0;
  const mark = () => dots.forEach((d, i) => d.setAttribute('aria-current', String(i === page)));

  let raf = 0;
  track.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (next !== page) {
          page = next;
          localStorage.setItem(key, String(page));
          mark();
        }
      });
    },
    { passive: true },
  );
  mark();
  // Restore the page whenever the pager gets a size (first layout, view shown again, resize).
  new ResizeObserver(() => (track.scrollLeft = page * track.clientWidth)).observe(track);

  return h('div', { class: `pager ${className}` }, track, h('div', { class: 'pager-dots' }, ...dots));
}
