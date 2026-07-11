/**
 * Peninsula Insider v5 - THE one saves + trip store (T-604).
 *
 * Framework-free client lib. One API, two views (IA §4): Saved (collection)
 * and My Trip (sequence). Extends the existing `pi:saves:v2` schema:
 *
 *   pi:saves:v2        {version: 2, items: SavedItem[]}   (unchanged shape;
 *                      items may now carry an optional open `meta` record -
 *                      legacy writers copy item objects wholesale, so the
 *                      field survives round trips through the old store)
 *   pi:saves:v2:trip   {version: 1, days: TripDay[], entries: TripEntry[]}
 *                      (the trip extension lives in a sibling key because the
 *                      legacy store.ts persist() rewrites `{version, items}`
 *                      and would silently drop any extra top-level field)
 *
 * Migration (one-time, idempotent):
 *   - pi:itinerary:v1  -> trip entries + days. Raw legacy value is copied to
 *     `pi:itinerary:v1.bak-v5-migration` first; the original key is left in
 *     place (the old /itinerary/ page still reads it until chrome swap).
 *     Migration runs once - the presence of pi:saves:v2:trip marks it done.
 *   - pi:saved:v1 / pi:saved-articles:v1 -> saves (same rules as the legacy
 *     saves/store.ts migration, so v5 pages that never load the old module
 *     still pick up pre-v2 saves).
 *
 * Sync (documented contract, TOOL-03 "two front ends read different
 * projections" fix):
 *   - Trip: every trip mutation is mirrored into the legacy pi:itinerary:v1
 *     projection ({kind, slug, dayId, note} for entries that reference
 *     content; standalone free-text entries are v5-only) and a
 *     `pi:itinerary-changed` {source:'v5-store'} event is dispatched. The
 *     EXISTING CloudSync.astro consumes that event and pushes
 *     pi.user_itineraries unchanged - trip cloud sync works today.
 *   - Saves: mutations dispatch the legacy `pi:saves-changed` event plus the
 *     v5 `pi:store-changed` event. The existing lib/saves/cloud.ts hooks the
 *     old module's in-memory listener, NOT window events, so a v5 page that
 *     bypasses the old module must wire one line in its CloudSync successor:
 *       window.addEventListener('pi:store-changed', () => pushToServer(uid))
 *     (pushToServer upserts by (user_id, kind, slug); re-running is safe.)
 *   - Cloud pulls: CloudSync writes pi:itinerary:v1 and dispatches
 *     `pi:itinerary-changed` {source:'cloud-pull'}; this store absorbs that
 *     back into the trip (ref entries follow the cloud list, standalone
 *     entries are preserved). Saves pulls go through pi:saves:v2 directly,
 *     which this store re-reads on every call - nothing to absorb.
 *
 * Change events for UI (SaveControl / BottomBar badges):
 *   window `pi:store-changed`  detail {scope: 'saves'|'trip', source: 'v5-store'}
 *   plus subscribe(cb) for module-level consumers.
 *
 * Every operation reads localStorage fresh (saves are small); there is no
 * long-lived cache to go stale when the legacy module or another tab writes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const SAVE_KINDS = [
  'article',
  'venue',
  'place',
  'event',
  'experience',
  'itinerary',
  'tour',
  'tour-operator',
  'tour-package',
] as const;

export type SaveKind = (typeof SAVE_KINDS)[number];

export interface SavedItem {
  kind: SaveKind;
  /** Stable slug within the kind's namespace. */
  slug: string;
  /** Human-readable title. */
  title: string;
  /** Canonical URL to the saved page. */
  href: string;
  /** Editorial section for articles (kept for legacy/cloud column compat). */
  section?: string;
  /** Short summary (legacy/cloud column compat). */
  dek?: string;
  /** Cover image (legacy/cloud column compat). */
  image_url?: string;
  /** Open extension record: priceBand, region, verdict, freshness, ... */
  meta?: Record<string, unknown>;
  /** Unix milliseconds the user added this item. */
  savedAt: number;
}

export interface TripDay {
  id: string;
  label: string;
}

export interface TripEntry {
  /** Stable entry id (an item can appear twice, e.g. lunch and dinner). */
  id: string;
  /** Set for entries referencing saved/saveable content. */
  kind?: SaveKind;
  slug?: string;
  /** Snapshot / standalone fields (standalone = no kind+slug). */
  title?: string;
  href?: string;
  meta?: Record<string, unknown>;
  /** '' = ungrouped (before Day 1), otherwise a TripDay id. */
  dayId: string;
  note: string;
  addedAt: number;
}

export interface TripStore {
  version: 1;
  days: TripDay[];
  /** Canonical order: entries array order IS the trip order. */
  entries: TripEntry[];
}

interface SavesStore {
  version: 2;
  items: SavedItem[];
}

export interface TripGroup {
  /** null = the ungrouped bucket (rendered before Day 1). */
  day: TripDay | null;
  stops: (TripEntry & { save?: SavedItem })[];
}

export type StoreScope = 'saves' | 'trip';
export type StoreListener = (scope: StoreScope) => void;

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const SAVES_KEY = 'pi:saves:v2';
const TRIP_KEY = 'pi:saves:v2:trip';

const LEGACY_ITIN_KEY = 'pi:itinerary:v1';
const ITIN_BACKUP_KEY = 'pi:itinerary:v1.bak-v5-migration';
const LEGACY_SAVED_V1_KEY = 'pi:saved:v1';
const LEGACY_ARTICLES_V1_KEY = 'pi:saved-articles:v1';

// ---------------------------------------------------------------------------
// Storage plumbing
// ---------------------------------------------------------------------------

function ls(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function getRaw(key: string): string | null {
  const s = ls();
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

function setRaw(key: string, value: string): void {
  const s = ls();
  if (!s) return;
  try {
    s.setItem(key, value);
  } catch {
    /* private mode / quota - fail silently */
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isKind(v: unknown): v is SaveKind {
  return typeof v === 'string' && (SAVE_KINDS as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Saves: read / write / v1 migration
// ---------------------------------------------------------------------------

function readSaves(): SavesStore {
  const raw = getRaw(SAVES_KEY);
  if (raw) {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && p.version === 2 && Array.isArray(p.items)) {
        return { version: 2, items: p.items.filter((it: unknown) => isValidItem(it)) };
      }
    } catch {
      /* fall through to migration */
    }
  }
  return migrateSavesFromV1();
}

function isValidItem(it: unknown): it is SavedItem {
  if (!it || typeof it !== 'object') return false;
  const o = it as Record<string, unknown>;
  return isKind(o.kind) && typeof o.slug === 'string' && o.slug.length > 0;
}

function writeSaves(store: SavesStore): void {
  setRaw(SAVES_KEY, JSON.stringify(store));
}

/** Same rules as lib/saves/store.ts migrateFromLegacy, condensed. */
function migrateSavesFromV1(): SavesStore {
  const items: SavedItem[] = [];
  const now = Date.now();

  try {
    const raw = getRaw(LEGACY_SAVED_V1_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const venues = Array.isArray(p?.venues) ? p.venues : [];
      const events = Array.isArray(p?.events) ? p.events : [];
      for (const v of venues) {
        if (!v?.slug) continue;
        items.push({ kind: 'venue', slug: v.slug, title: v.title ?? v.slug, href: v.href ?? `/eat/${v.slug}/`, savedAt: v.savedAt ?? now });
      }
      for (const e of events) {
        if (!e?.slug) continue;
        items.push({ kind: 'event', slug: e.slug, title: e.title ?? e.slug, href: e.href ?? `/whats-on/${e.slug}/`, savedAt: e.savedAt ?? now });
      }
    }
  } catch { /* corrupt legacy store - skip */ }

  try {
    const raw = getRaw(LEGACY_ARTICLES_V1_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const articles = Array.isArray(p?.articles) ? p.articles : [];
      for (const a of articles) {
        if (!a?.slug) continue;
        const section = a.section ?? 'journal';
        items.push({ kind: 'article', slug: a.slug, section, title: a.title ?? a.slug, dek: a.dek, image_url: a.image_url, href: `/${section}/${a.slug}/`, savedAt: a.savedAt ?? now });
      }
    }
  } catch { /* corrupt legacy store - skip */ }

  const migrated: SavesStore = { version: 2, items };
  writeSaves(migrated);
  return migrated;
}

// ---------------------------------------------------------------------------
// Trip: read / write / pi:itinerary:v1 migration
// ---------------------------------------------------------------------------

function readTrip(): TripStore {
  const raw = getRaw(TRIP_KEY);
  if (raw) {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && p.version === 1 && Array.isArray(p.entries) && Array.isArray(p.days)) {
        return { version: 1, days: p.days, entries: p.entries };
      }
    } catch {
      /* corrupt - fall through and rebuild via migration path */
    }
  }
  return migrateTripFromItineraryV1();
}

function writeTrip(trip: TripStore): void {
  setRaw(TRIP_KEY, JSON.stringify(trip));
}

interface LegacyItinItem { kind?: string; slug?: string; dayId?: string; note?: string }
interface LegacyItinStore { items: LegacyItinItem[]; days: { id?: string; label?: string }[] }

function parseLegacyItinerary(raw: string | null): LegacyItinStore {
  if (!raw) return { items: [], days: [] };
  try {
    const p = JSON.parse(raw);
    return {
      items: Array.isArray(p?.items) ? p.items : [],
      days: Array.isArray(p?.days) ? p.days : [],
    };
  } catch {
    return { items: [], days: [] };
  }
}

function legacyItemsToEntries(items: LegacyItinItem[], now: number): TripEntry[] {
  const entries: TripEntry[] = [];
  for (const it of items) {
    if (!it?.slug) continue;
    entries.push({
      id: newId('stop'),
      kind: isKind(it.kind) ? it.kind : 'venue',
      slug: String(it.slug),
      dayId: typeof it.dayId === 'string' ? it.dayId : '',
      note: typeof it.note === 'string' ? it.note : '',
      addedAt: now,
    });
  }
  return entries;
}

function legacyDaysToDays(days: LegacyItinStore['days']): TripDay[] {
  const out: TripDay[] = [];
  for (const d of days) {
    if (!d?.id) continue;
    out.push({ id: String(d.id), label: String(d.label || d.id) });
  }
  return out;
}

/**
 * One-time pi:itinerary:v1 -> trip migration. Idempotent: only runs when
 * pi:saves:v2:trip does not exist yet; the written trip key (even when empty)
 * marks migration done. The raw legacy value is kept at ITIN_BACKUP_KEY and
 * the original key is left untouched for the old /itinerary/ page.
 */
function migrateTripFromItineraryV1(): TripStore {
  const raw = getRaw(LEGACY_ITIN_KEY);
  const now = Date.now();
  const legacy = parseLegacyItinerary(raw);

  if (raw && getRaw(ITIN_BACKUP_KEY) === null) {
    setRaw(ITIN_BACKUP_KEY, raw);
  }

  const trip: TripStore = {
    version: 1,
    days: legacyDaysToDays(legacy.days),
    entries: legacyItemsToEntries(legacy.items, now),
  };
  writeTrip(trip);
  return trip;
}

/**
 * Mirror the trip into the legacy pi:itinerary:v1 projection so the old
 * /itinerary/ page and the EXISTING CloudSync push (pi.user_itineraries)
 * keep working until chrome swap. Standalone entries (no kind+slug) have no
 * legacy representation and are v5-only.
 */
function writeLegacyProjection(trip: TripStore): void {
  const items = trip.entries
    .filter((e) => e.kind && e.slug)
    .map((e) => ({ kind: e.kind, slug: e.slug, dayId: e.dayId || '', note: e.note || '' }));
  const days = trip.days.map((d) => ({ id: d.id, label: d.label }));
  setRaw(LEGACY_ITIN_KEY, JSON.stringify({ version: 1, items, days }));
}

/**
 * Absorb an external pi:itinerary:v1 write (cloud pull, or the old
 * /itinerary/ page editing in the same tab) back into the trip. Ref entries
 * follow the incoming list order; standalone entries are preserved at the
 * end. Existing entry ids/meta are kept for entries that survive.
 */
function absorbLegacyItinerary(): void {
  const legacy = parseLegacyItinerary(getRaw(LEGACY_ITIN_KEY));
  const trip = readTrip();
  const now = Date.now();

  const pool = new Map<string, TripEntry[]>();
  for (const e of trip.entries) {
    if (!e.kind || !e.slug) continue;
    const k = `${e.kind}/${e.slug}`;
    const list = pool.get(k) || [];
    list.push(e);
    pool.set(k, list);
  }

  const nextEntries: TripEntry[] = [];
  for (const it of legacy.items) {
    if (!it?.slug) continue;
    const kind = isKind(it.kind) ? it.kind : 'venue';
    const k = `${kind}/${it.slug}`;
    const existing = pool.get(k)?.shift();
    nextEntries.push({
      id: existing?.id ?? newId('stop'),
      kind,
      slug: String(it.slug),
      title: existing?.title,
      href: existing?.href,
      meta: existing?.meta,
      dayId: typeof it.dayId === 'string' ? it.dayId : '',
      note: typeof it.note === 'string' ? it.note : (existing?.note ?? ''),
      addedAt: existing?.addedAt ?? now,
    });
  }
  // Standalone (v5-only) entries survive cloud round trips.
  for (const e of trip.entries) {
    if (!e.kind || !e.slug) nextEntries.push(e);
  }

  writeTrip({ version: 1, days: legacyDaysToDays(legacy.days), entries: nextEntries });
  notify('trip');
}

// ---------------------------------------------------------------------------
// Change events
// ---------------------------------------------------------------------------

const listeners = new Set<StoreListener>();

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(cb: StoreListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(scope: StoreScope): void {
  for (const fn of listeners) {
    try {
      fn(scope);
    } catch {
      /* one listener's bug should not break the rest */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pi:store-changed', { detail: { scope, source: 'v5-store' } }));
    if (scope === 'saves') {
      // Keep legacy badge listeners alive during the migration window.
      window.dispatchEvent(new CustomEvent('pi:saves-changed', { detail: { kind: 'change', source: 'v5-store' } }));
    }
  }
}

function notifyTripMutation(trip: TripStore): void {
  writeTrip(trip);
  writeLegacyProjection(trip);
  notify('trip');
  if (typeof window !== 'undefined') {
    // The existing CloudSync.astro consumes this and pushes pi.user_itineraries.
    window.dispatchEvent(new CustomEvent('pi:itinerary-changed', { detail: { source: 'v5-store' } }));
  }
}

// Cross-writer coherence: re-broadcast external changes so v5 badges react to
// legacy-module writes, other tabs, and cloud pulls. Registered once per page.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === SAVES_KEY) notify('saves');
    if (e.key === TRIP_KEY || e.key === LEGACY_ITIN_KEY) notify('trip');
  });
  window.addEventListener('pi:saves-changed', (e: Event) => {
    const detail = (e as CustomEvent).detail || {};
    if (detail.source === 'v5-store') return; // our own echo
    for (const fn of listeners) {
      try { fn('saves'); } catch { /* ignore */ }
    }
  });
  window.addEventListener('pi:itinerary-changed', (e: Event) => {
    const detail = (e as CustomEvent).detail || {};
    if (detail.source === 'v5-store') return; // our own echo
    // Cloud pull or the old /itinerary/ page wrote the legacy key.
    absorbLegacyItinerary();
  });
}

// ---------------------------------------------------------------------------
// Public API - saves
// ---------------------------------------------------------------------------

/** Idempotent upsert. Re-saving refreshes the snapshot, keeps savedAt. */
export function save(item: Omit<SavedItem, 'savedAt'> & { savedAt?: number }): SavedItem {
  const store = readSaves();
  const idx = store.items.findIndex((it) => it.kind === item.kind && it.slug === item.slug);
  let saved: SavedItem;
  if (idx >= 0) {
    saved = { ...store.items[idx], ...item, savedAt: store.items[idx].savedAt };
    store.items[idx] = saved;
  } else {
    saved = { ...item, savedAt: item.savedAt ?? Date.now() };
    store.items.push(saved);
  }
  writeSaves(store);
  notify('saves');
  return saved;
}

/** Remove a save. No-op if not saved. */
export function unsave(kind: SaveKind, slug: string): void {
  const store = readSaves();
  const next = store.items.filter((it) => !(it.kind === kind && it.slug === slug));
  if (next.length === store.items.length) return;
  writeSaves({ version: 2, items: next });
  notify('saves');
}

export function isSaved(kind: SaveKind, slug: string): boolean {
  return readSaves().items.some((it) => it.kind === kind && it.slug === slug);
}

/** All saves (newest first), optionally filtered to one kind. */
export function listSaves(kind?: SaveKind): SavedItem[] {
  const items = readSaves().items.slice().sort((a, b) => b.savedAt - a.savedAt);
  return kind ? items.filter((it) => it.kind === kind) : items;
}

/** Convenience for SaveControl. Returns the new state (true = now saved). */
export function toggleSave(item: Omit<SavedItem, 'savedAt'>): boolean {
  if (isSaved(item.kind, item.slug)) {
    unsave(item.kind, item.slug);
    return false;
  }
  save(item);
  return true;
}

// ---------------------------------------------------------------------------
// Public API - trip
// ---------------------------------------------------------------------------

export interface TripAddInput {
  kind?: SaveKind;
  slug?: string;
  title?: string;
  href?: string;
  meta?: Record<string, unknown>;
  note?: string;
}

export interface TripAddOptions {
  /** Target day; '' or omitted = ungrouped. */
  dayId?: string;
  /**
   * Adding referenced content to the trip auto-saves it (spec §3.20) when a
   * title+href snapshot is available. Pass false to opt out.
   */
  autoSave?: boolean;
}

/**
 * Append a stop to the trip. Referenced content: pass {kind, slug} plus a
 * title/href snapshot (auto-saved unless opted out). Standalone stop: omit
 * kind/slug and pass a title ("Lunch somewhere in Flinders").
 */
export function tripAdd(item: TripAddInput, opts: TripAddOptions = {}): TripEntry {
  const isRef = Boolean(item.kind && item.slug);
  if (!isRef && !item.title) {
    throw new Error('tripAdd: standalone entries need a title');
  }
  if (isRef && opts.autoSave !== false && item.title && item.href && !isSaved(item.kind!, item.slug!)) {
    save({ kind: item.kind!, slug: item.slug!, title: item.title, href: item.href, meta: item.meta });
  }

  const trip = readTrip();
  // Unknown day ids degrade to ungrouped in tripList; store as-given so a
  // day created in another tab still claims its stops after a storage sync.
  const dayId = opts.dayId ?? '';
  const entry: TripEntry = {
    id: newId('stop'),
    kind: isRef ? item.kind : undefined,
    slug: isRef ? item.slug : undefined,
    title: item.title,
    href: item.href,
    meta: item.meta,
    dayId,
    note: item.note ?? '',
    addedAt: Date.now(),
  };
  trip.entries.push(entry);
  notifyTripMutation(trip);
  return entry;
}

/** Remove a stop by entry id. No-op for unknown ids. */
export function tripRemove(entryId: string): void {
  const trip = readTrip();
  const next = trip.entries.filter((e) => e.id !== entryId);
  if (next.length === trip.entries.length) return;
  notifyTripMutation({ ...trip, entries: next });
}

/**
 * Move a stop to `toIndex` within the canonical order, optionally changing
 * its day. `dayId` undefined keeps the current day; '' ungroups.
 */
export function tripMove(entryId: string, toIndex: number, dayId?: string): void {
  const trip = readTrip();
  const from = trip.entries.findIndex((e) => e.id === entryId);
  if (from < 0) return;
  const entries = trip.entries.slice();
  const [entry] = entries.splice(from, 1);
  const moved: TripEntry = dayId === undefined ? entry : { ...entry, dayId };
  const clamped = Math.max(0, Math.min(toIndex, entries.length));
  entries.splice(clamped, 0, moved);
  notifyTripMutation({ ...trip, entries });
}

/**
 * Day-grouped view, hydrated against saves. Group order: ungrouped bucket
 * first (only when non-empty or the trip has no days), then days in order.
 * Within each group, stops keep the canonical entries order.
 */
export function tripList(): TripGroup[] {
  const trip = readTrip();
  const saves = readSaves().items;
  const saveMap = new Map(saves.map((s) => [`${s.kind}/${s.slug}`, s]));

  const hydrate = (e: TripEntry): TripEntry & { save?: SavedItem } => {
    if (!e.kind || !e.slug) return { ...e };
    const s = saveMap.get(`${e.kind}/${e.slug}`);
    return s ? { ...e, title: e.title ?? s.title, href: e.href ?? s.href, save: s } : { ...e };
  };

  const dayIds = new Set(trip.days.map((d) => d.id));
  const buckets = new Map<string, (TripEntry & { save?: SavedItem })[]>();
  const ungrouped: (TripEntry & { save?: SavedItem })[] = [];
  for (const d of trip.days) buckets.set(d.id, []);
  for (const e of trip.entries) {
    const h = hydrate(e);
    if (e.dayId && dayIds.has(e.dayId)) buckets.get(e.dayId)!.push(h);
    else ungrouped.push(h);
  }

  const groups: TripGroup[] = [];
  if (ungrouped.length > 0 || trip.days.length === 0) {
    groups.push({ day: null, stops: ungrouped });
  }
  for (const d of trip.days) {
    groups.push({ day: d, stops: buckets.get(d.id)! });
  }
  return groups;
}

/** Flat canonical order (for drag-and-drop indices). */
export function tripEntries(): TripEntry[] {
  return readTrip().entries.slice();
}

export function tripDays(): TripDay[] {
  return readTrip().days.slice();
}

export function tripAddDay(label?: string): TripDay {
  const trip = readTrip();
  const day: TripDay = { id: newId('day'), label: label || `Day ${trip.days.length + 1}` };
  trip.days.push(day);
  notifyTripMutation(trip);
  return day;
}

/** Rename a day; no-op when the day does not exist or the label is empty. */
export function tripRenameDay(dayId: string, label: string): void {
  const trip = readTrip();
  const day = trip.days.find((d) => d.id === dayId);
  if (!day || !label.trim()) return;
  day.label = label.trim();
  notifyTripMutation(trip);
}

/** Remove a day; its stops become ungrouped (legacy /itinerary/ behaviour). */
export function tripRemoveDay(dayId: string): void {
  const trip = readTrip();
  const days = trip.days.filter((d) => d.id !== dayId);
  if (days.length === trip.days.length) return;
  const entries = trip.entries.map((e) => (e.dayId === dayId ? { ...e, dayId: '' } : e));
  notifyTripMutation({ version: 1, days, entries });
}

/** Total stop count (BottomBar badge). */
export function tripCount(): number {
  return readTrip().entries.length;
}

/** Wipe the trip (confirm in UI first). Days and stops both cleared. */
export function tripClear(): void {
  notifyTripMutation({ version: 1, days: [], entries: [] });
}
