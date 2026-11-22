import { h, icon, formatTime } from '../dom.js';
import { state, watch, musicApp } from '../store.js';
import { actions } from '../actions.js';

/**
 * Music player card. Renders real media-session data only; never fake metadata.
 * Progress interpolates locally once per second while playing and visible, and
 * resyncs whenever Android pushes a new PlaybackState.
 */
export function MusicPanel() {
  const root = h('section', { class: 'card music', 'aria-label': 'Music' });

  // Persistent nodes for the "playing" layout (reused across updates).
  const artBtn = h('button', { class: 'art', 'aria-label': 'Open music app', onclick: () => actions.openMusicApp() });
  const source = h('div', { class: 'source label' });
  const title = h('div', { class: 'track-title' });
  const artist = h('div', { class: 'track-sub' });
  const album = h('div', { class: 'track-sub text-sm' });
  const meta = h('button', { class: 'track-meta', onclick: () => actions.openMusicApp() }, source, title, artist, album);
  const fill = h('span');
  const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Playback progress' }, fill);
  const elapsed = h('span');
  const duration = h('span');
  const progress = h('div', { class: 'progress' }, bar, h('div', { class: 'times' }, elapsed, duration));
  const prevBtn = h('button', { class: 'ctl', 'aria-label': 'Previous', onclick: () => actions.previousTrack() }, icon('SkipBack', '1.5rem'));
  const playBtn = h('button', { class: 'ctl ctl-main', 'aria-label': 'Play', onclick: () => actions.playPause() });
  const nextBtn = h('button', { class: 'ctl', 'aria-label': 'Next', onclick: () => actions.nextTrack() }, icon('SkipForward', '1.5rem'));
  const controls = h('div', { class: 'controls' }, prevBtn, playBtn, nextBtn);
  const top = h('div', { class: 'music-top' }, artBtn, meta);
  const bottom = h('div', { class: 'music-bottom' }, progress, controls);
  // Ambient backdrop: the artwork itself, heavily blurred behind the card content.
  const ambientImg = h('img', { alt: '', decoding: 'async', draggable: 'false' });
  ambientImg.addEventListener('error', () => (ambient.hidden = true));
  const ambient = h('div', { class: 'music-ambient', 'aria-hidden': 'true' }, ambientImg);
  const playingNodes = [ambient, top, bottom];

  let artUrl = null;
  let playIconState = null;
  let timer = 0;
  let mode = null;

  function setMode(next, build) {
    if (mode === next && next !== 'playing') return;
    if (mode !== next) {
      mode = next;
      root.replaceChildren(...build());
    }
  }

  function emptyState({ iconName, heading, body, buttons }) {
    return [
      h(
        'div',
        { class: 'empty' },
        h('span', { class: 'empty-icon' }, icon(iconName, '2rem', 1.5)),
        h('div', { class: 'text-xl font-semibold', text: heading }),
        body && h('p', { class: 'text-muted max-w-[28rem] leading-relaxed', text: body }),
        h('div', { class: 'flex flex-wrap justify-center gap-3 pt-2' }, ...buttons),
      ),
    ];
  }

  function render() {
    const m = state.music;
    clearTimeout(timer);
    root.classList.remove('has-ambient');

    if (state.bridge === 'none') {
      mode = null;
      root.replaceChildren(
        ...emptyState({ iconName: 'Music', heading: 'Music unavailable', body: 'The Android bridge is not connected.', buttons: [] }),
      );
      return;
    }

    if (!m || m.permission !== 'granted') {
      mode = null;
      const restricted = (state.system.sdkInt || 0) >= 33;
      root.replaceChildren(
        ...emptyState({
          iconName: 'BellRing',
          heading: 'Allow media access',
          body:
            'MONOVRA shows the song that is playing and its controls through Android media sessions. ' +
            'Enable Notification Access for MONOVRA. Notifications are never read or stored.' +
            (restricted ? ' If the switch is greyed out, open App info › ⋮ › Allow restricted settings first.' : ''),
          buttons: [
            h('button', { class: 'btn btn-primary', onclick: () => actions.openNotificationAccessSettings() }, 'Open settings'),
            restricted && h('button', { class: 'btn', onclick: () => actions.openAppInfo() }, 'App info'),
          ],
        }),
      );
      return;
    }

    if (!m.hasSession) {
      mode = null;
      const app = musicApp();
      root.replaceChildren(
        ...emptyState({
          iconName: 'Music',
          heading: 'No music playing',
          body: null,
          buttons: [
            h(
              'button',
              { class: 'btn btn-primary', disabled: !app, onclick: () => app && actions.openMusicApp(app.packageName) },
              icon('Play', '1.1rem'),
              'Open Music',
            ),
          ],
        }),
      );
      return;
    }

    setMode('playing', () => playingNodes);

    source.replaceChildren(icon('Disc3', '0.95rem', 2), h('span', { class: 'truncate', text: m.source?.label || 'Media' }));
    title.textContent = m.title || 'Unknown title';
    artist.textContent = m.artist || '';
    artist.hidden = !m.artist;
    album.textContent = m.album || '';
    album.hidden = !m.album || m.album === m.title;

    if (m.artwork !== artUrl) {
      artUrl = m.artwork;
      ambient.hidden = !artUrl;
      if (artUrl) ambientImg.src = artUrl;
      if (artUrl) {
        const img = h('img', { src: artUrl, alt: '', decoding: 'async', draggable: 'false' });
        img.addEventListener('error', () => artBtn.replaceChildren(icon('Music', '35%', 1.25)), { once: true });
        artBtn.replaceChildren(img);
      } else {
        artBtn.replaceChildren(icon('Music', '35%', 1.25));
      }
    }

    root.classList.toggle('has-ambient', !!artUrl);

    const playing = m.playback === 'playing' || m.playback === 'buffering';
    if (playIconState !== playing) {
      playIconState = playing;
      playBtn.replaceChildren(icon(playing ? 'Pause' : 'Play', '2rem', 2));
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
    playBtn.disabled = !m.actions?.playPause;
    prevBtn.disabled = !m.actions?.previous;
    nextBtn.disabled = !m.actions?.next;

    updateProgress();
  }

  function currentPosition(m) {
    if (m.playback !== 'playing') return m.positionMs;
    const pos = m.positionMs + (Date.now() - m.capturedAt) * (m.speed || 1);
    return m.durationMs > 0 ? Math.min(pos, m.durationMs) : pos;
  }

  function updateProgress() {
    const m = state.music;
    if (!m?.hasSession) return;
    const pos = currentPosition(m);
    const known = m.durationMs > 0;
    bar.classList.toggle('is-indeterminate', !known);
    fill.style.width = known ? `${Math.min(100, (pos / m.durationMs) * 100).toFixed(2)}%` : '';
    bar.setAttribute('aria-valuenow', known ? String(Math.round((pos / m.durationMs) * 100)) : '');
    elapsed.textContent = formatTime(pos);
    duration.textContent = known ? formatTime(m.durationMs) : '--:--';

    clearTimeout(timer);
    if (m.playback === 'playing' && !document.hidden) {
      // Wake up right after the next whole second of playback.
      const delay = 1000 - (pos % 1000) + 20;
      timer = setTimeout(updateProgress, Math.max(250, delay));
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else updateProgress();
  });

  watch(['music', 'system', 'bridge', 'apps', 'settings'], render);
  render();
  return root;
}
