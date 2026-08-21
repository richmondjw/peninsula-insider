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

let memory: SavesStore | null = null;

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

function writeRaw(store: SavesStore): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota / disabled - fail silently */
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

function load(): SavesStore {
  if (!memory) memory = readRaw();
  return memory;
}

function persist(store: SavesStore): void {
  memory = store;
  writeRaw(store);
  emit({ kind: 'change' });
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
 * Toggle save state. Returns the new state (true = now saved).
 * If the item is new, snapshot fields (title / dek / image_url / href / section)
 * are required to render the saved view later. If toggling off an existing
 * item, snapshot fields are ignored.
 */
export function toggle(item: Omit<SavedItem, 'savedAt'>): boolean {
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
  persist(next);
  return nowSaved;
}

/** Explicitly remove. No-op if not saved. */
export function remove(kind: SaveKind, slug: string): void {
  const store = load();
  const idx = store.items.findIndex((it) => it.kind === kind && it.slug === slug);
  if (idx < 0) return;
  const next: SavesStore = { version: 2, items: store.items.slice() };
  next.items.splice(idx, 1);
  persist(next);
}

/**
 * Merge an externally-supplied list (e.g. from Supabase after sign-in, or
 * from a shared-plan URL). Items in `incoming` that don't exist locally are
 * added; existing items are left alone. Returns the count of items added.
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
  if (added > 0) persist(next);
  return added;
}

/** Wipe all saves. Used by sign-out flows and on user request. */
export function clear(): void {
  persist({ version: 2, items: [] });
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
