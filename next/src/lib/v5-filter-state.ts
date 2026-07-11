/**
 * v5-filter-state - the one client-side filter state utility for v5 surfaces.
 *
 * One filter state governs every filterable region on a page (curated grid
 * AND directory, per page-redesigns section 2 blocks 20-21). The URL query
 * string is the single source of truth; this module reads it, writes it via
 * history.replaceState (pushState on sheet Apply), shows/hides server-rendered
 * items, and broadcasts changes as a 'pi:filters-changed' CustomEvent.
 *
 * PAGE-AGENT CONTRACT (how a page opts into filtering):
 *   - Server-render ALL items (SEO). Default state = everything visible.
 *   - Mark each filterable item with a `data-facets` attribute containing
 *     JSON: Partial<Record<FacetKey, string[]>> using values from the shared
 *     facets taxonomy (lib/facets.ts getFacets/FACET_OPTIONS). Example:
 *       <article data-facets='{"place":["red-hill"],"mood":["long-lunch"]}'>
 *   - Optionally add `data-title="..."` (used by A-to-Z sort; falls back to
 *     the first heading's text).
 *   - Optionally wrap zero-result messaging in `[data-filter-empty]` (hidden
 *     attr toggled by this module) and counts in `[data-filter-count]`.
 *   - Items live inside any container; sorting reorders siblings within each
 *     `[data-sort-container]` (add that attribute to grids that may re-order).
 *   - Render exactly ONE live region per page with id `pi-results-status`
 *     (FilterBar.astro does this for you).
 *
 * Framework-free. Safe to import from node for the pure helpers below - no
 * DOM access at module scope.
 */

/* ------------------------------------------------------------------ */
/* Pure state helpers (DOM-free, node-testable)                        */
/* ------------------------------------------------------------------ */

export const FILTER_KEYS = ['place', 'cat', 'mood', 'price', 'party', 'date'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** Active selections per facet. Absent key = facet not filtering. */
export type FilterState = Partial<Record<FilterKey, string[]>>;

export interface FiltersChangedDetail {
  filters: FilterState;
  /** Items visible after this change. */
  shown: number;
  /** Total filterable items on the page. */
  total: number;
  /** What triggered the change: 'chip' | 'sheet' | 'clear' | 'url' | 'restore'. */
  source: string;
}

const RESTORE_PREFIX = 'pi:restore:v1:';
const RESTORE_TTL_MS = 30 * 60 * 1000;
const RESTORE_MAX_KEYS = 20;

export const SORT_PARAM = 'sort';
export const VIEW_PARAM = 'view';
export type SortValue = 'editors' | 'az' | 'town';
export const SORT_DEFAULT: SortValue = 'editors';

function isFilterKey(k: string): k is FilterKey {
  return (FILTER_KEYS as readonly string[]).indexOf(k) !== -1;
}

/** Parse a query string ('?mood=a,b&place=c' or 'mood=a') into FilterState. */
export function parseFilters(search: string): FilterState {
  const params = new URLSearchParams(search.charAt(0) === '?' ? search.slice(1) : search);
  const state: FilterState = {};
  for (const key of FILTER_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;
    const values = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length) state[key] = values;
  }
  return state;
}

/**
 * Serialise state back into a query string, preserving any non-facet params
 * already present in `existingSearch` (sort, view, utm, etc). Returns the
 * string without a leading '?' ('' when nothing survives).
 */
export function serializeFilters(state: FilterState, existingSearch = ''): string {
  const params = new URLSearchParams(
    existingSearch.charAt(0) === '?' ? existingSearch.slice(1) : existingSearch,
  );
  for (const key of FILTER_KEYS) params.delete(key);
  for (const key of FILTER_KEYS) {
    const values = state[key];
    if (values && values.length) params.set(key, values.join(','));
  }
  return params.toString();
}

/** Immutable toggle of one value within one facet. */
export function toggleValue(state: FilterState, key: FilterKey, value: string): FilterState {
  const next: FilterState = { ...state };
  const current = next[key] ? [...(next[key] as string[])] : [];
  const idx = current.indexOf(value);
  if (idx === -1) current.push(value);
  else current.splice(idx, 1);
  if (current.length) next[key] = current;
  else delete next[key];
  return next;
}

export function isEmptyState(state: FilterState): boolean {
  return FILTER_KEYS.every((k) => !state[k] || !state[k]!.length);
}

export function countActive(state: FilterState): number {
  return FILTER_KEYS.reduce((n, k) => n + (state[k] ? state[k]!.length : 0), 0);
}

/**
 * Parse a data-facets attribute value. Tolerant: bad JSON yields {} (the item
 * then matches only the empty state for any filtered key, i.e. hides when
 * that facet is active). Scalar values are normalised to single-item arrays.
 */
export function parseItemFacets(raw: string | null | undefined): FilterState {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out: FilterState = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isFilterKey(k)) continue;
    if (typeof v === 'string' && v) out[k] = [v];
    else if (Array.isArray(v)) {
      const values = v.filter((x): x is string => typeof x === 'string' && x !== '');
      if (values.length) out[k] = values;
    }
  }
  return out;
}

/**
 * Matching model: AND across facets, OR within a facet. An item with no
 * values for an active facet does not match it.
 */
export function itemMatches(itemFacets: FilterState, state: FilterState): boolean {
  for (const key of FILTER_KEYS) {
    const wanted = state[key];
    if (!wanted || !wanted.length) continue;
    const have = itemFacets[key];
    if (!have || !have.length) return false;
    if (!wanted.some((w) => have.indexOf(w) !== -1)) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* DOM controller (all functions guard on document)                    */
/* ------------------------------------------------------------------ */

let current: FilterState = {};
let initialised = false;

function hasDom(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

export function getState(): FilterState {
  return { ...current };
}

/** Read the current URL into module state. */
export function readUrl(): FilterState {
  if (!hasDom()) return {};
  current = parseFilters(window.location.search);
  return getState();
}

/** Write state to the URL. replaceState by default; push=true on sheet Apply. */
export function writeUrl(state: FilterState, opts: { push?: boolean } = {}): void {
  if (!hasDom()) return;
  const qs = serializeFilters(state, window.location.search);
  const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  if (opts.push) window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

interface FacetedItem {
  el: HTMLElement;
  facets: FilterState;
}

function collectItems(root: ParentNode): FacetedItem[] {
  const els = root.querySelectorAll<HTMLElement>('[data-facets]');
  const items: FacetedItem[] = [];
  els.forEach((el) => {
    if (el.dataset.piFacetCache === undefined) {
      el.dataset.piFacetCache = '1';
      if (el.dataset.piOrder === undefined) {
        // Capture editorial (source) order once, for sort round-trips.
        const parent = el.parentElement;
        if (parent) {
          el.dataset.piOrder = String(Array.prototype.indexOf.call(parent.children, el));
        }
      }
    }
    items.push({ el, facets: parseItemFacets(el.getAttribute('data-facets')) });
  });
  return items;
}

/** Non-mutating count for the sheet's live "Show N places" preview. */
export function countMatches(state: FilterState, root?: ParentNode): number {
  if (!hasDom()) return 0;
  return collectItems(root || document).reduce(
    (n, it) => n + (itemMatches(it.facets, state) ? 1 : 0),
    0,
  );
}

let announceTimer: ReturnType<typeof setTimeout> | undefined;

/** Politely announce to the shared #pi-results-status live region. */
export function announce(text: string): void {
  if (!hasDom()) return;
  const region = document.getElementById('pi-results-status');
  if (!region) return;
  // Debounce so rapid chip taps produce one announcement, not a stutter.
  if (announceTimer) clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    region.textContent = text;
  }, 350);
}

/**
 * Apply `state` to every [data-facets] item on the page: toggles the hidden
 * attribute plus a data-filtered-out marker (for CSS hooks), updates every
 * [data-filter-count], toggles [data-filter-empty], announces the count.
 */
export function applyToDom(
  state: FilterState = current,
  rootIn?: ParentNode,
  noun = 'results',
): { shown: number; total: number } {
  if (!hasDom()) return { shown: 0, total: 0 };
  const root = rootIn || document;
  const items = collectItems(root);
  let shown = 0;
  for (const it of items) {
    const ok = itemMatches(it.facets, state);
    if (ok) shown += 1;
    it.el.toggleAttribute('hidden', !ok);
    if (ok) delete it.el.dataset.filteredOut;
    else it.el.dataset.filteredOut = '1';
  }
  const total = items.length;
  const anyActive = !isEmptyState(state);
  const countText = anyActive ? `Showing ${shown} of ${total} ${noun}` : `Showing all ${total} ${noun}`;
  root.querySelectorAll<HTMLElement>('[data-filter-count]').forEach((el) => {
    el.textContent = countText;
  });
  root.querySelectorAll<HTMLElement>('[data-filter-empty]').forEach((el) => {
    el.toggleAttribute('hidden', shown !== 0);
  });
  announce(countText);
  return { shown, total };
}

export function emitChange(detail: FiltersChangedDetail): void {
  if (!hasDom()) return;
  document.dispatchEvent(new CustomEvent<FiltersChangedDetail>('pi:filters-changed', { detail }));
}

/**
 * The one write path: set state, sync URL, repaint DOM, broadcast.
 * push=true creates a history entry (sheet Apply per mobile-strategy s5).
 */
export function commit(
  state: FilterState,
  opts: { push?: boolean; source?: string; noun?: string } = {},
): { shown: number; total: number } {
  current = { ...state };
  writeUrl(current, { push: opts.push });
  const counts = applyToDom(current, document, opts.noun || 'results');
  emitChange({ filters: getState(), ...counts, source: opts.source || 'chip' });
  return counts;
}

/* --------------------------- sort + view --------------------------- */

export function getSort(): SortValue {
  if (!hasDom()) return SORT_DEFAULT;
  const v = new URLSearchParams(window.location.search).get(SORT_PARAM);
  return v === 'az' || v === 'town' ? v : SORT_DEFAULT;
}

/** Persist sort in the URL (omitted when default) and reorder the DOM. */
export function setSort(value: SortValue): void {
  if (!hasDom()) return;
  const params = new URLSearchParams(window.location.search);
  if (value === SORT_DEFAULT) params.delete(SORT_PARAM);
  else params.set(SORT_PARAM, value);
  const qs = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
  applySort(value);
}

function sortTitle(el: HTMLElement): string {
  if (el.dataset.title) return el.dataset.title.toLowerCase();
  const heading = el.querySelector('h1, h2, h3, h4, [data-card-title]');
  return (heading ? heading.textContent || '' : el.textContent || '').trim().toLowerCase();
}

function sortTown(el: HTMLElement): string {
  const facets = parseItemFacets(el.getAttribute('data-facets'));
  // Items without a town sort last ('￿' collates after every slug).
  return facets.place && facets.place.length ? facets.place[0] : '￿';
}

/** Reorder children of every [data-sort-container]. 'editors' = source order. */
export function applySort(value?: SortValue, root?: ParentNode): void {
  if (!hasDom()) return;
  const sortValue = value || getSort();
  (root || document).querySelectorAll<HTMLElement>('[data-sort-container]').forEach((container) => {
    const items = Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-facets]'));
    if (!items.length) return;
    const sorted = [...items].sort((a, b) => {
      if (sortValue === 'az') return sortTitle(a) < sortTitle(b) ? -1 : sortTitle(a) > sortTitle(b) ? 1 : 0;
      if (sortValue === 'town') {
        const ta = sortTown(a);
        const tb = sortTown(b);
        if (ta !== tb) return ta < tb ? -1 : 1;
      }
      // Editorial order is the tiebreak and the default: never alphabetical.
      return Number(a.dataset.piOrder || 0) - Number(b.dataset.piOrder || 0);
    });
    sorted.forEach((el) => container.appendChild(el));
  });
}

export type ViewValue = 'list' | 'map';

export function getView(): ViewValue {
  if (!hasDom()) return 'list';
  return new URLSearchParams(window.location.search).get(VIEW_PARAM) === 'map' ? 'map' : 'list';
}

/**
 * Toggle list/map view. Filter params stay untouched in the URL, so state
 * travels between the two views of the same surface. Emits 'pi:view-toggle'.
 */
export function setView(view: ViewValue): void {
  if (!hasDom()) return;
  const params = new URLSearchParams(window.location.search);
  if (view === 'list') params.delete(VIEW_PARAM);
  else params.set(VIEW_PARAM, view);
  const qs = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
  document.dispatchEvent(new CustomEvent('pi:view-toggle', { detail: { view, filters: getState() } }));
}

/* ----------------------- back-nav restoration ---------------------- */

interface RestoreEntry {
  y: number;
  filters: FilterState;
  ts: number;
}

function restoreKey(): string {
  return RESTORE_PREFIX + window.location.pathname;
}

function pruneRestoreKeys(): void {
  try {
    const keys: { key: string; ts: number }[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || key.indexOf(RESTORE_PREFIX) !== 0) continue;
      let ts = 0;
      try {
        ts = (JSON.parse(sessionStorage.getItem(key) || '{}') as RestoreEntry).ts || 0;
      } catch {
        ts = 0;
      }
      keys.push({ key, ts });
    }
    if (keys.length <= RESTORE_MAX_KEYS) return;
    keys
      .sort((a, b) => a.ts - b.ts)
      .slice(0, keys.length - RESTORE_MAX_KEYS)
      .forEach((k) => sessionStorage.removeItem(k.key));
  } catch {
    /* storage unavailable: restoration is best-effort */
  }
}

function saveRestoreEntry(): void {
  try {
    const entry: RestoreEntry = { y: window.scrollY, filters: current, ts: Date.now() };
    sessionStorage.setItem(restoreKey(), JSON.stringify(entry));
    pruneRestoreKeys();
  } catch {
    /* best-effort */
  }
}

function readRestoreEntry(): RestoreEntry | null {
  try {
    const raw = sessionStorage.getItem(restoreKey());
    if (!raw) return null;
    const entry = JSON.parse(raw) as RestoreEntry;
    if (!entry || typeof entry.ts !== 'number') return null;
    if (Date.now() - entry.ts > RESTORE_TTL_MS) {
      sessionStorage.removeItem(restoreKey());
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function isBackForwardNav(): boolean {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return !!nav && nav.type === 'back_forward';
  } catch {
    return false;
  }
}

/* ------------------------------ init ------------------------------- */

let throttleTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Idempotent page bootstrap. FilterBar's island calls this; other islands
 * (SortControl, MapToggle, FilterSheet) may call it too - only the first
 * call wires listeners.
 *
 * Order of truth on load: URL params win; on a back/forward navigation with
 * no URL params, the sessionStorage entry (< 30 min old) restores filters
 * and scroll. On bfcache restores (pageshow persisted) nothing runs - the
 * page is already intact.
 */
export function initFilterState(opts: { noun?: string } = {}): void {
  if (!hasDom() || initialised) {
    if (hasDom() && initialised) applyToDom(current, document, opts.noun || 'results');
    return;
  }
  initialised = true;
  const noun = opts.noun || 'results';

  readUrl();

  if (isEmptyState(current) && isBackForwardNav()) {
    const entry = readRestoreEntry();
    if (entry && entry.filters && !isEmptyState(entry.filters)) {
      current = entry.filters;
      writeUrl(current);
    }
    if (entry) {
      // Restore scroll after the filtered layout settles.
      requestAnimationFrame(() => window.scrollTo(0, entry.y));
    }
  }

  const counts = applyToDom(current, document, noun);
  applySort(getSort());
  emitChange({ filters: getState(), ...counts, source: 'url' });

  window.addEventListener('popstate', () => {
    readUrl();
    const c = applyToDom(current, document, noun);
    applySort(getSort());
    emitChange({ filters: getState(), ...c, source: 'url' });
  });

  // bfcache-friendly: pagehide/pageshow only, never unload.
  window.addEventListener('pagehide', saveRestoreEntry);
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) return; // page intact, do nothing
  });
  window.addEventListener(
    'scroll',
    () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = undefined;
        saveRestoreEntry();
      }, 500);
    },
    { passive: true },
  );
}
