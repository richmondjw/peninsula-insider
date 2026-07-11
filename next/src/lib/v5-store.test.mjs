/**
 * v5-store tests (T-604). Run from repo root or next/:
 *
 *   node --test next/src/lib/v5-store.test.mjs
 *
 * Uses Node's native TypeScript type-stripping (Node >= 22.18 / 23.6) to
 * import v5-store.ts directly, with a localStorage shim installed before
 * import. No framework, no build step.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// localStorage shim (installed before the store is imported)
// ---------------------------------------------------------------------------

class LocalStorageShim {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(String(key), String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

globalThis.localStorage = new LocalStorageShim();

const store = await import('./v5-store.ts');

const SAVES_KEY = 'pi:saves:v2';
const TRIP_KEY = 'pi:saves:v2:trip';
const ITIN_KEY = 'pi:itinerary:v1';
const ITIN_BACKUP_KEY = 'pi:itinerary:v1.bak-v5-migration';

function reset() {
  globalThis.localStorage.clear();
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

test('migrates pi:itinerary:v1 into the trip, keeps a backup key, idempotent', () => {
  reset();
  const legacy = {
    version: 1,
    items: [
      { kind: 'venue', slug: 'foxeys-hangout', dayId: 'day-1', note: 'lunch' },
      { kind: 'event', slug: 'red-hill-market', dayId: '', note: '' },
      { kind: 'experience', slug: 'cape-schanck-walk', dayId: 'day-1', note: '' },
      { kind: 'bogus-kind', slug: 'mystery', dayId: '', note: '' }, // unknown kind -> venue
      { kind: 'venue', slug: '', dayId: '', note: '' },             // no slug -> dropped
    ],
    days: [{ id: 'day-1', label: 'Saturday' }],
  };
  localStorage.setItem(ITIN_KEY, JSON.stringify(legacy));

  const groups = store.tripList(); // first read triggers migration
  assert.equal(localStorage.getItem(ITIN_BACKUP_KEY), JSON.stringify(legacy), 'raw legacy value backed up');
  assert.ok(localStorage.getItem(ITIN_KEY), 'original legacy key left in place');
  assert.ok(localStorage.getItem(TRIP_KEY), 'trip key written (marks migration done)');

  // 4 entries survive (empty slug dropped); unknown kind coerced to venue.
  assert.equal(store.tripCount(), 4);
  const flat = store.tripEntries();
  assert.deepEqual(flat.map((e) => e.slug), ['foxeys-hangout', 'red-hill-market', 'cape-schanck-walk', 'mystery']);
  assert.equal(flat[3].kind, 'venue');

  // Day grouping: ungrouped bucket first, then Saturday with 2 stops in order.
  assert.equal(groups.length, 2);
  assert.equal(groups[0].day, null);
  assert.deepEqual(groups[0].stops.map((s) => s.slug), ['red-hill-market', 'mystery']);
  assert.equal(groups[1].day.label, 'Saturday');
  assert.deepEqual(groups[1].stops.map((s) => s.slug), ['foxeys-hangout', 'cape-schanck-walk']);

  // Idempotency: mutate the legacy key AFTER migration; the trip must not change.
  localStorage.setItem(ITIN_KEY, JSON.stringify({ version: 1, items: [{ kind: 'venue', slug: 'intruder' }], days: [] }));
  assert.equal(store.tripCount(), 4, 'migration does not re-run once trip key exists');
  assert.equal(localStorage.getItem(ITIN_BACKUP_KEY), JSON.stringify(legacy), 'backup not overwritten');
});

test('migrates pi:saved:v1 and pi:saved-articles:v1 into saves when v2 key is absent', () => {
  reset();
  localStorage.setItem('pi:saved:v1', JSON.stringify({
    venues: [{ slug: 'laura', title: 'Laura', href: '/eat/laura/', savedAt: 100 }],
    events: [{ slug: 'winter-solstice', title: 'Winter Solstice', savedAt: 200 }],
  }));
  localStorage.setItem('pi:saved-articles:v1', JSON.stringify({
    articles: [{ slug: 'best-bakeries', section: 'eat', title: 'Best bakeries', savedAt: 300 }],
  }));

  const all = store.listSaves();
  assert.equal(all.length, 3);
  assert.ok(store.isSaved('venue', 'laura'));
  assert.ok(store.isSaved('event', 'winter-solstice'));
  assert.ok(store.isSaved('article', 'best-bakeries'));
  assert.equal(store.listSaves('article')[0].href, '/eat/best-bakeries/');
});

// ---------------------------------------------------------------------------
// Saves: all 9 kinds round trip
// ---------------------------------------------------------------------------

test('all 9 kinds save, list, filter, and unsave', () => {
  reset();
  assert.equal(store.SAVE_KINDS.length, 9);

  for (const kind of store.SAVE_KINDS) {
    store.save({ kind, slug: `${kind}-one`, title: `${kind} one`, href: `/${kind}/${kind}-one/`, meta: { priceBand: '$$' } });
  }

  assert.equal(store.listSaves().length, 9);
  for (const kind of store.SAVE_KINDS) {
    assert.ok(store.isSaved(kind, `${kind}-one`), `${kind} saved`);
    const ofKind = store.listSaves(kind);
    assert.equal(ofKind.length, 1, `listSaves('${kind}') returns exactly the ${kind}`);
    assert.equal(ofKind[0].meta.priceBand, '$$', 'meta survives the round trip');
  }

  // Persisted shape stays legacy-compatible: {version: 2, items: []}.
  const rawStore = JSON.parse(localStorage.getItem(SAVES_KEY));
  assert.equal(rawStore.version, 2);
  assert.equal(rawStore.items.length, 9);

  store.unsave('tour-operator', 'tour-operator-one');
  assert.equal(store.isSaved('tour-operator', 'tour-operator-one'), false);
  assert.equal(store.listSaves().length, 8);

  // toggleSave round trip
  assert.equal(store.toggleSave({ kind: 'place', slug: 'place-one', title: 'x', href: '/x/' }), false, 'toggle off existing');
  assert.equal(store.toggleSave({ kind: 'place', slug: 'place-one', title: 'x', href: '/x/' }), true, 'toggle back on');
});

test('save is an idempotent upsert that keeps savedAt and refreshes the snapshot', () => {
  reset();
  const first = store.save({ kind: 'venue', slug: 'laura', title: 'Laura', href: '/eat/laura/' });
  const second = store.save({ kind: 'venue', slug: 'laura', title: 'Laura (updated)', href: '/eat/laura/' });
  assert.equal(second.savedAt, first.savedAt, 'savedAt preserved on re-save');
  assert.equal(store.listSaves('venue').length, 1, 'no duplicate rows');
  assert.equal(store.listSaves('venue')[0].title, 'Laura (updated)');
});

// ---------------------------------------------------------------------------
// Trip: ordering, days, hydration, legacy projection
// ---------------------------------------------------------------------------

test('trip ordering: add, move, remove, day grouping', () => {
  reset();
  const a = store.tripAdd({ kind: 'venue', slug: 'a', title: 'A', href: '/eat/a/' });
  const b = store.tripAdd({ kind: 'event', slug: 'b', title: 'B', href: '/whats-on/b/' });
  const c = store.tripAdd({ title: 'Lunch somewhere in Flinders' }); // standalone
  assert.deepEqual(store.tripEntries().map((e) => e.id), [a.id, b.id, c.id]);

  // Adding a referenced stop auto-saved it (spec: add-to-trip auto-saves).
  assert.ok(store.isSaved('venue', 'a'));
  assert.ok(store.isSaved('event', 'b'));

  // Move C to the front.
  store.tripMove(c.id, 0);
  assert.deepEqual(store.tripEntries().map((e) => e.id), [c.id, a.id, b.id]);

  // Day grouping: create a day, move A into it.
  const day1 = store.tripAddDay('Saturday');
  store.tripMove(a.id, 2, day1.id);
  const groups = store.tripList();
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].stops.map((s) => s.id), [c.id, b.id], 'ungrouped keeps canonical order');
  assert.equal(groups[1].day.id, day1.id);
  assert.deepEqual(groups[1].stops.map((s) => s.id), [a.id]);

  // Hydration: the grouped view carries the SavedItem for ref stops.
  assert.equal(groups[1].stops[0].save.title, 'A');
  assert.equal(groups[0].stops[0].save, undefined, 'standalone stop has no save');

  // Removing the day ungroups its stops rather than deleting them.
  store.tripRemoveDay(day1.id);
  assert.equal(store.tripCount(), 3);
  assert.equal(store.tripList().length, 1);

  // Remove a stop.
  store.tripRemove(b.id);
  assert.equal(store.tripCount(), 2);
  assert.ok(store.isSaved('event', 'b'), 'removing a stop does not unsave the item');
});

test('trip mutations mirror a legacy pi:itinerary:v1 projection for the existing CloudSync', () => {
  reset();
  store.tripAdd({ kind: 'venue', slug: 'a', title: 'A', href: '/eat/a/', note: 'book ahead' });
  store.tripAdd({ title: 'Standalone stop' });
  const day = store.tripAddDay('Sunday');
  const entries = store.tripEntries();
  store.tripMove(entries[0].id, 0, day.id);

  const legacy = JSON.parse(localStorage.getItem(ITIN_KEY));
  assert.equal(legacy.version, 1);
  assert.equal(legacy.items.length, 1, 'standalone entries have no legacy representation');
  assert.deepEqual(legacy.items[0], { kind: 'venue', slug: 'a', dayId: day.id, note: 'book ahead' });
  assert.deepEqual(legacy.days, [{ id: day.id, label: 'Sunday' }]);
});

test('same item can appear twice in the trip with distinct entry ids', () => {
  reset();
  const one = store.tripAdd({ kind: 'venue', slug: 'a', title: 'A', href: '/eat/a/' });
  const two = store.tripAdd({ kind: 'venue', slug: 'a', title: 'A', href: '/eat/a/' });
  assert.notEqual(one.id, two.id);
  assert.equal(store.tripCount(), 2);
  assert.equal(store.listSaves('venue').length, 1, 'auto-save stays deduped');
});

// ---------------------------------------------------------------------------
// subscribe
// ---------------------------------------------------------------------------

test('subscribe fires per mutation with the right scope and unsubscribes cleanly', () => {
  reset();
  const seen = [];
  const off = store.subscribe((scope) => seen.push(scope));

  store.save({ kind: 'venue', slug: 's1', title: 'S1', href: '/eat/s1/' });
  store.tripAdd({ kind: 'venue', slug: 's1', title: 'S1', href: '/eat/s1/' });
  store.unsave('venue', 's1');

  // tripAdd on an already-saved item emits only the trip event.
  assert.deepEqual(seen, ['saves', 'trip', 'saves']);

  off();
  store.save({ kind: 'venue', slug: 's2', title: 'S2', href: '/eat/s2/' });
  assert.deepEqual(seen, ['saves', 'trip', 'saves'], 'no events after unsubscribe');
});
