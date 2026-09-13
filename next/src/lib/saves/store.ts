/**
 * Peninsula Insider - unified saves store (v2).
 *
 * One canonical local store for every kind of saved item - articles,
 * venues, places, events, experiences, itineraries, tours, operators,
 * packages. Replaces the two competing v1 stores:
 *
 *   - pi:saved:v1            (venues + events, via SaveSiteController)
 *   - pi:saved-articles:v1   (articles, via v2/SaveButton.astro)
 *
 * Migration from v1 happens automatically on first read after this file
 * loads. Both v1 keys are left in place for a quarter as a rollback path;
 * a later cleanup commit will delete them.
 *
 * Signed-in users get the same items mirrored to `pi.user_saves` via
 * `CloudSync`, which now uses `kind` to distinguish row types.
 */

export type SaveKind =
  | 'article'
  | 'venue'
  | 'place'
  | 'event'
  | 'experience'
  | 'itinerary'
  | 'tour'
  | 'tour-operator'
  | 'tour-package';

export interface SavedItem {
  kind: SaveKind;
  /** Stable slug within the kind's namespace. */
  slug: string;
  /** Editorial section for articles (`eat`, `stay`, `journal`, etc). Optional for other kinds. */
  section?: string;
  /** Human-readable title; used in the saved view and the share preview. */
  title: string;
  /** Short summary shown on the saved card. */
  dek?: string;
  /** Cover image. */
  image_url?: string;
  /** Canonical URL to the saved page. */
  href: string;
  /** Unix milliseconds the user added this item. */
  savedAt: number;
}

export interface SavesStore {
  version: 2;
  items: SavedItem[];
}

const STORAGE_KEY = 'pi:saves:v2';

const LEGACY_VENUES_EVENTS_KEY = 'pi:saved:v1';
const LEGACY_ARTICLES_KEY = 'pi:saved-articles:v1';

const EMPTY: SavesStore = { version: 2, items: [] };

// --------------------------------------------------------------------------
// Read / write
// --------------------------------------------------------------------------

function readRaw(): SavesStore {
  if (typeof localStorage === 'undefined') return { ...EMPTY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateFromLegacy();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 2 || !Array.isArray(parsed.items)) {
      return migrateFromLegacy();
    }
    return parsed as SavesStore;
  } catch {
    return migrateFromLegacy();
  }
}

/**
 * Persist to localStorage. Returns false when the write did not land -
 * private mode, exhausted quota, storage disabled by the browser, or SSR.
 * A false return means nothing changed; callers must not report success.
 */
function writeRaw(store: SavesStore): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    /* private mode / quota / disabled */
    return false;
  }
}

// --------------------------------------------------------------------------
// Migration from v1 stores
// --------------------------------------------------------------------------

interface LegacyVenueOrEvent {
  slug: string;
  title?: string;
  href?: string;
  savedAt?: number;
}

interface LegacyArticle {
  slug: string;
  section?: string;
  title?: string;
  dek?: string;
  image_url?: string;
  savedAt?: number;
}

function safeParse<T>(key: string, validate: (v: unknown) => v is T): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function migrateFromLegacy(): SavesStore {
  const items: SavedItem[] = [];
  const now = Date.now();

  const venuesEventsStore = safeParse(LEGACY_VENUES_EVENTS_KEY, (v): v is { venues: LegacyVenueOrEvent[]; events: LegacyVenueOrEvent[] } => {
    return Boolean(v && typeof v === 'object' && Array.isArray((v as { venues?: unknown }).venues) && Array.isArray((v as { events?: unknown }).events));
  });
  if (venuesEventsStore) {
    for (const v of venuesEventsStore.venues) {
      if (!v?.slug) continue;
      items.push({
        kind: 'venue',
        slug: v.slug,
        title: v.title ?? v.slug,
        href: v.href ?? `/eat/${v.slug}/`,
        savedAt: v.savedAt ?? now,
      });
    }
    for (const e of venuesEventsStore.events) {
      if (!e?.slug) continue;
      items.push({
        kind: 'event',
        slug: e.slug,
        title: e.title ?? e.slug,
        href: e.href ?? `/whats-on/${e.slug}/`,
        savedAt: e.savedAt ?? now,
      });
    }
  }

  const articlesStore = safeParse(LEGACY_ARTICLES_KEY, (v): v is { articles: LegacyArticle[] } => {
    return Boolean(v && typeof v === 'object' && Array.isArray((v as { articles?: unknown }).articles));
  });
  if (articlesStore) {
    for (const a of articlesStore.articles) {
      if (!a?.slug) continue;
      const section = a.section ?? 'journal';
      items.push({
        kind: 'article',
        slug: a.slug,
        section,
        title: a.title ?? a.slug,
        dek: a.dek,
        image_url: a.image_url,
        href: `/${section}/${a.slug}/`,
        savedAt: a.savedAt ?? now,
      });
    }
  }

  const migrated: SavesStore = { version: 2, items };
  writeRaw(migrated);
  return migrated;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Read the store. Deliberately hits localStorage on every call: there is no
 * module-level cache, by design.
 *
 * A cache here was a data-loss bug (PI-012). `lib/v5-store.ts` writes this
 * same `pi:saves:v2` key and has no way to reach into this module, so a cache
 * populated before a v5 write was silently overwritten by the next write from
 * here - the user clicked "+ Trip", then Save on another card, and the trip
 * item disappeared. Nothing could invalidate it either: the `storage` event
 * fires in OTHER tabs, never in the tab doing the writing, and the client
 * router's SPA swaps keep the module alive across in-site navigation.
 *
 * Measured cost of reading fresh: JSON.parse of a saved list runs ~6us at 10
 * items, ~27us at 50, ~300us at 500. A full repaint of a 60-card listing page
 * is roughly 120 reads, so ~0.8ms at 10 saves and ~3ms at 50 - comfortably
 * inside a click frame. `v5-store.ts` already reads this same key this way on
 * every call, in production, on the same pages.
 */
function load(): SavesStore {
  return readRaw();
}

/** Write, then notify listeners. Returns false when the write did not land. */
function persist(store: SavesStore): boolean {
  const ok = writeRaw(store);
  if (ok) emit({ kind: 'change' });
  return ok;
}

/**
 * Outcome of a mutating call. `ok` is false when the change could not be
 * written to localStorage, in which case nothing changed and the UI must not
 * report success. `saved` is the state that actually holds afterwards.
 */
export interface SaveWriteResult {
  ok: boolean;
  saved: boolean;
}

/** Snapshot of all saves. */
export function list(): SavedItem[] {
  return load().items.slice().sort((a, b) => b.savedAt - a.savedAt);
}

/** Snapshot of saves of a given kind. */
export function listByKind(kind: SaveKind): SavedItem[] {
  return list().filter((it) => it.kind === kind);
}

/** True if an item with this kind+slug is saved. */
export function isSaved(kind: SaveKind, slug: string): boolean {
  return load().items.some((it) => it.kind === kind && it.slug === slug);
}

/**
 * Toggle save state. Returns `{ ok, saved }`: `saved` is the state that holds
 * after the attempt, and `ok` is false when the write did not land (private
 * mode, quota, storage disabled) - in which case `saved` is the unchanged
 * prior state and the button must not repaint to "Saved".
 * If the item is new, snapshot fields (title / dek / image_url / href / section)
 * are required to render the saved view later. If toggling off an existing
 * item, snapshot fields are ignored.
 */
export function toggle(item: Omit<SavedItem, 'savedAt'>): SaveWriteResult {
  const store = load();
  const idx = store.items.findIndex((it) => it.kind === item.kind && it.slug === item.slug);
  let next: SavesStore;
  let nowSaved: boolean;
  if (idx >= 0) {
    next = { version: 2, items: store.items.slice() };
    next.items.splice(idx, 1);
    nowSaved = false;
  } else {
    next = { version: 2, items: [...store.items, { ...item, savedAt: Date.now() }] };
    nowSaved = true;
  }
  const ok = persist(next);
  return { ok, saved: ok ? nowSaved : idx >= 0 };
}

/**
 * Explicitly remove. No-op if not saved. Returns false when the removal could
 * not be written; true when the item is gone (including the no-op case).
 */
export function remove(kind: SaveKind, slug: string): boolean {
  const store = load();
  const idx = store.items.findIndex((it) => it.kind === kind && it.slug === slug);
  if (idx < 0) return true;
  const next: SavesStore = { version: 2, items: store.items.slice() };
  next.items.splice(idx, 1);
  return persist(next);
}

/**
 * Merge an externally-supplied list (e.g. from Supabase after sign-in, or
 * from a shared-plan URL). Items in `incoming` that don't exist locally are
 * added; existing items are left alone. Returns the count of items added -
 * zero when nothing was new, and zero when the write did not land.
 */
export function merge(incoming: SavedItem[]): number {
  const store = load();
  const keys = new Set(store.items.map((it) => `${it.kind}/${it.slug}`));
  let added = 0;
  const next: SavesStore = { version: 2, items: store.items.slice() };
  for (const item of incoming) {
    if (!item?.kind || !item?.slug) continue;
    const key = `${item.kind}/${item.slug}`;
    if (keys.has(key)) continue;
    next.items.push(item);
    keys.add(key);
    added += 1;
  }
  if (added > 0 && !persist(next)) return 0;
  return added;
}

/**
 * Wipe all saves. Used by sign-out flows and on user request. Returns false
 * when the write did not land, in which case the saves are still there.
 */
export function clear(): boolean {
  return persist({ version: 2, items: [] });
}

// --------------------------------------------------------------------------
// Change events
// --------------------------------------------------------------------------

type ChangeEvent = { kind: 'change' };
type Listener = (event: ChangeEvent) => void;
const listeners = new Set<Listener>();

export function onChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event: ChangeEvent): void {
  for (const fn of listeners) {
    try { fn(event); } catch { /* swallow - one listener's bug shouldn't break the rest */ }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pi:saves-changed', { detail: event }));
  }
}
