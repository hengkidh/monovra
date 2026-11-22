import { h, icon, formatTime } from '../dom.js';
import { state, watch, set } from '../store.js';
import { actions } from '../actions.js';
import { LargeTime, onClock } from './clock.js';
import { Pager } from './pager.js';

/**
 * Calm "now playing" block for focus mode: cover, title, artist, progress and
 * a single play/pause. No skip buttons on purpose, so nothing invites fiddling.
 */
function FocusPlayer() {
  const art = h('button', { class: 'focus-art', 'aria-label': 'Open music app', onclick: () => actions.openMusicApp() });
  const title = h('div', { class: 'focus-title' });
  const artist = h('div', { class: 'focus-artist' });
  const fill = h('span');
  const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Playback progress' }, fill);
  const elapsed = h('span');
  const duration = h('span');
  const play = h('button', { class: 'ctl ctl-main', 'aria-label': 'Play', onclick: () => actions.playPause() });
  const info = h(
    'div',
    { class: 'focus-info' },
    title,
    artist,
    h('div', { class: 'focus-progress' }, bar, h('div', { class: 'times' }, elapsed, duration)),
    play,
  );
  const empty = h('div', { class: 'focus-empty' }, icon('Music', '2rem', 1.5), h('span', { text: 'No music playing' }));
  const root = h('div', { class: 'focus-player' }, art, info, empty);

  let artUrl;
  let playing;

  const progress = () => {
    const m = state.music;
    if (!m?.hasSession) return;
    let pos = m.positionMs;
    if (m.playback === 'playing') pos += (Date.now() - m.capturedAt) * (m.speed || 1);
    const known = m.durationMs > 0;
    if (known) pos = Math.min(pos, m.durationMs);
    bar.classList.toggle('is-indeterminate', !known);
    fill.style.width = known ? `${((pos / m.durationMs) * 100).toFixed(2)}%` : '';
    elapsed.textContent = formatTime(pos);
    duration.textContent = known ? formatTime(m.durationMs) : '--:--';
  };

  const render = () => {
    const m = state.music;
    const has = !!m?.hasSession && m.permission === 'granted';
    art.hidden = info.hidden = !has;
    empty.hidden = has;
    if (!has) return;

    title.textContent = m.title || 'Unknown title';
    artist.textContent = m.artist || '';
    artist.hidden = !m.artist;
    if (m.artwork !== artUrl) {
      artUrl = m.artwork;
      art.replaceChildren(artUrl ? h('img', { src: artUrl, alt: '', decoding: 'async', draggable: 'false' }) : icon('Music', '35%', 1.25));
    }
    const isPlaying = m.playback === 'playing' || m.playback === 'buffering';
    if (isPlaying !== playing) {
      playing = isPlaying;
      play.replaceChildren(icon(isPlaying ? 'Pause' : 'Play', '2rem', 2));
      play.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    }
    play.disabled = !m.actions?.playPause;
    progress();
  };

  watch(['music'], render);
  render();
  onClock(progress);
  return root;
}

/**
 * Focus mode: full screen, no dock. Swipe between
 *  1. the clock alone, very large
 *  2. the clock beside a minimal player
 * Exit (top right) or Android Back returns home.
 */
export function FocusView() {
  const clockOnly = h('div', { class: 'focus-page' }, h('div', { class: 'focus-cell' }, LargeTime('is-focus')));
  const withPlayer = h(
    'div',
    { class: 'focus-page focus-split' },
    h('div', { class: 'focus-cell' }, LargeTime()),
    h('div', { class: 'focus-cell' }, FocusPlayer()),
  );
  const exit = h(
    'button',
    { class: 'btn btn-icon focus-exit', 'aria-label': 'Exit focus mode', onclick: () => set({ view: 'home' }) },
    icon('X', '1.5rem'),
  );
  return h(
    'section',
    { class: 'focus', 'aria-label': 'Focus mode' },
    Pager([clockOnly, withPlayer], { key: 'monovra.focusPage', labels: ['Clock', 'Clock and music'] }),
    exit,
  );
}
