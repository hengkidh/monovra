import { h, icon, formatTime } from '../dom.js';
import { state, watch, set, musicApp } from '../store.js';
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
  // Idle: the same record illustration as the home card, with one calm action.
  const openLabel = h('span');
  const openBtn = h('button', { class: 'idle-app is-primary', onclick: () => actions.openMusicApp(musicApp()?.packageName) }, icon('Play', '1.1rem', 2.25), openLabel);
  const empty = h(
    'div',
    { class: 'idle focus-empty' },
    h('div', { class: 'idle-disc', 'aria-hidden': 'true' }, h('span', { class: 'idle-disc-label' }, icon('Music', '42%', 1.75))),
    h('div', { class: 'idle-text' }, h('div', { class: 'idle-title', text: 'Nothing playing' }), h('p', { class: 'idle-sub', text: 'Start a song to see it here.' })),
    openBtn,
  );
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
    if (!has) {
      const app = musicApp();
      openLabel.textContent = app ? `Open ${app.label}` : 'Open music';
      openBtn.disabled = !app;
      return;
    }

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

  watch(['music', 'apps', 'settings'], render);
  render();
  onClock(progress);
  return root;
}

/**
 * Compact metadata-only player used below the large clock. When nothing plays
 * it shows the same record illustration as the other idle states, with one
 * "Open <app>" action, kept on a single row so the clock stays the anchor.
 */
function FocusMiniPlayer({ onArtwork } = {}) {
  const art = h('button', { class: 'focus-mini-art', 'aria-label': 'Open music app', onclick: () => actions.openMusicApp() });
  const title = h('div', { class: 'focus-mini-title' });
  const artist = h('div', { class: 'focus-mini-artist' });
  const meta = h('div', { class: 'focus-mini-meta' }, title, artist);
  const openLabel = h('span');
  const openBtn = h(
    'button',
    { class: 'idle-app is-primary focus-mini-open', onclick: () => actions.openMusicApp(musicApp()?.packageName) },
    icon('Play', '1.1rem', 2.25),
    openLabel,
  );
  const root = h('div', { class: 'focus-mini-player', 'aria-label': 'Now playing' }, art, meta, openBtn);

  let artKey;
  const render = () => {
    const m = state.music;
    const has = !!m?.hasSession && m.permission === 'granted';
    root.classList.toggle('is-empty', !has);
    title.textContent = has ? m.title || 'Unknown title' : 'Nothing playing';
    artist.textContent = has ? m.artist || m.source?.label || '' : 'Start a song to see it here.';
    artist.hidden = !artist.textContent;

    openBtn.hidden = has;
    if (!has) {
      const app = musicApp();
      openLabel.textContent = app ? `Open ${app.label}` : 'Open music';
      openBtn.disabled = !app;
    }

    const artwork = has ? m.artwork || null : null;
    const nextKey = has ? artwork || 'placeholder' : 'idle';
    if (nextKey !== artKey) {
      artKey = nextKey;
      if (artwork) art.replaceChildren(h('img', { src: artwork, alt: '', decoding: 'async', draggable: 'false' }));
      else if (has) art.replaceChildren(icon('Music', '42%', 1.5));
      else art.replaceChildren(h('span', { class: 'idle-disc is-mini', 'aria-hidden': 'true' }, h('span', { class: 'idle-disc-label' }, icon('Music', '46%', 2))));
      onArtwork?.(artwork);
    }
  };

  watch(['music', 'apps', 'settings'], render);
  render();
  return root;
}

/**
 * Focus mode: full screen, no dock. Swipe between
 *  1. the clock alone, very large
 *  2. the clock beside a minimal player
 *  3. a large centered clock with compact track metadata below it
 *  4. the same centered layout over blurred ambient artwork
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
  const stackedPlayer = h(
    'div',
    { class: 'focus-page focus-stacked' },
    h('div', { class: 'focus-stacked-clock' }, LargeTime('is-focus is-stacked')),
    FocusMiniPlayer(),
  );
  const ambientArt = h('img', { alt: '', decoding: 'async', draggable: 'false' });
  const ambient = h('div', { class: 'focus-ambient', 'aria-hidden': 'true', hidden: true }, ambientArt);
  const ambientPlayer = h('div', { class: 'focus-page focus-stacked focus-stacked-ambient' }, ambient);
  ambientPlayer.append(
    h('div', { class: 'focus-stacked-clock' }, LargeTime('is-focus is-stacked')),
    FocusMiniPlayer({
      onArtwork: (artwork) => {
        ambient.hidden = !artwork;
        ambientPlayer.classList.toggle('has-ambient', !!artwork);
        if (artwork) ambientArt.src = artwork;
        else ambientArt.removeAttribute('src');
      },
    }),
  );
  const exit = h(
    'button',
    { class: 'btn btn-icon focus-exit', 'aria-label': 'Exit focus mode', onclick: () => set({ view: 'home' }) },
    icon('X', '1.5rem'),
  );
  return h(
    'section',
    { class: 'focus', 'aria-label': 'Focus mode' },
    Pager([clockOnly, withPlayer, stackedPlayer, ambientPlayer], {
      key: 'monovra.focusPage',
      labels: ['Clock', 'Clock and music', 'Clock with compact music', 'Clock with ambient music'],
    }),
    exit,
  );
}
