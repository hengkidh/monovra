import { h, icon, appIcon } from '../dom.js';
import { state, watch, set, favoriteApps } from '../store.js';
import { actions } from '../actions.js';

/** Home-screen shortcuts: a vertical rail on the right edge. */
export function AppsPanel() {
  const list = h('div', { class: 'shortcut-rail scroll' });
  const allBtn = h(
    'button',
    { class: 'tile rail-all', 'aria-label': 'All apps', onclick: () => set({ view: 'apps', editShortcuts: false }) },
    h('span', { class: 'tile-icon' }, icon('LayoutGrid', '1.9rem', 1.5)),
    h('span', { class: 'tile-label', text: 'All apps' }),
  );

  const render = () => {
    const apps = favoriteApps();
    const tiles = apps.map((app) =>
      h(
        'button',
        { class: 'tile', 'aria-label': app.label, onclick: () => actions.launchApp(app.packageName) },
        appIcon(app),
        h('span', { class: 'tile-label', text: app.label }),
      ),
    );
    if (!apps.length && state.apps.length) {
      tiles.push(
        h(
          'button',
          { class: 'tile', 'aria-label': 'Add shortcuts', onclick: () => set({ view: 'apps', editShortcuts: true }) },
          h('span', { class: 'tile-icon' }, icon('Plus', '1.9rem', 1.5)),
          h('span', { class: 'tile-label', text: 'Add apps' }),
        ),
      );
    }
    list.replaceChildren(...tiles);
  };
  watch(['apps', 'settings'], render);
  render();

  return h('section', { class: 'card apps-rail', 'aria-label': 'Shortcuts' }, list, allBtn);
}

/** Full app drawer with search and pin/unpin editing. */
export function AllAppsView() {
  const input = h('input', {
    type: 'search',
    placeholder: 'Search apps',
    'aria-label': 'Search apps',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  input.addEventListener('input', () => set({ query: input.value }));

  const editBtn = h('button', { class: 'btn', onclick: () => set({ editShortcuts: !state.editShortcuts }) });
  const grid = h('div', { class: 'app-grid' });
  const hint = h('p', { class: 'text-sm text-muted px-1 pb-2' });

  const render = () => {
    if (input.value !== state.query) input.value = state.query;
    editBtn.setAttribute('aria-pressed', String(state.editShortcuts));
    editBtn.replaceChildren(
      icon(state.editShortcuts ? 'Check' : 'Pencil', '1.2rem'),
      state.editShortcuts ? 'Done' : 'Edit shortcuts',
    );
    hint.textContent = state.editShortcuts ? 'Tap an app to pin or unpin it on the home screen.' : '';
    hint.hidden = !state.editShortcuts;

    const q = state.query.trim().toLowerCase();
    const list = q ? state.apps.filter((a) => a.label.toLowerCase().includes(q)) : state.apps;
    const fav = new Set(state.settings.favorites);

    if (!list.length) {
      grid.replaceChildren(
        h('p', { class: 'col-span-full text-center text-muted py-10', text: q ? 'No apps match your search' : 'No apps found' }),
      );
      return;
    }
    grid.replaceChildren(
      ...list.map((app) => {
        const pinned = fav.has(app.packageName);
        return h(
          'button',
          {
            class: 'tile',
            'aria-label': app.label,
            'aria-pressed': state.editShortcuts ? String(pinned) : false,
            onclick: () => (state.editShortcuts ? actions.togglePinned(app.packageName) : actions.launchApp(app.packageName)),
          },
          state.editShortcuts && h('span', { class: 'tile-badge' }, icon(pinned ? 'Check' : 'Plus', '0.9rem', 2.5)),
          appIcon(app),
          h('span', { class: 'tile-label', text: app.label }),
        );
      }),
    );
  };
  watch(['apps', 'settings', 'query', 'editShortcuts'], render);
  render();

  return h(
    'section',
    { class: 'card flex flex-col min-h-0 p-4 gap-3', 'aria-label': 'All apps' },
    h(
      'div',
      { class: 'flex items-center gap-3' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Back', onclick: () => set({ view: 'home' }) }, icon('ArrowLeft', '1.4rem')),
      h('label', { class: 'search' }, icon('Search', '1.4rem'), input),
      editBtn,
    ),
    hint,
    h('div', { class: 'scroll min-h-0 flex-1' }, grid),
  );
}
