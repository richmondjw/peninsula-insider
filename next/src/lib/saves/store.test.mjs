/**
 * Cross-store regression tests for the `pi:saves:v2` localStorage key (PI-012).
 *
 *   node --test next/src/lib/saves/store.test.mjs
 *
 * Two independent modules write this one key and are live on the same page:
 * `lib/saves/store.ts` (legacy, mounted site-wide via SaveSiteController) and
 * `lib/v5-store.ts` (imported by every v5 card). The legacy module used to
 * hold a module-level `memory` cache that only its own writes replaced, so any
 * v5 write followed by a legacy write silently discarded the v5 write - the
 * user clicked "+ Trip", then Save on another card, and the trip item vanished.
 *
 * These tests drive the exact interleaving. Uses Node's native TypeScript
 * type-stripping to import the .ts modules directly, with a localStorage shim
 * installed before import. No framework, no build step.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// localStorage shim (installed before either store is imported)
// ---------------------------------------------------------------------------

class LocalStorageShim {
  constructor() {
    this.map = new Map();
    /** Set true to simulate private mode / quota exhaustion. */
    this.failWrites = false;
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    if (this.failWrites) {
      const err = new Error('QuotaExceededError: storage is full');
      err.name = 'QuotaExceededError';
      throw err;
    }
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

const legacy = await import('./store.ts');
const v5 = await import('../v5-store.ts');

const SAVES_KEY = 'pi:saves:v2';

function reset() {
  localStorage.failWrites = false;
  localStorage.clear();
}

/** What is actually on disk, independent of either module's view of it. */
function storedKeys() {
  const raw = localStorage.getItem(SAVES_KEY);
  if (!raw) return [];
  return JSON.parse(raw)
    .items.map((it) => `${it.kind}/${it.slug}`)
    .sort();
}

const FOXEYS = {
  kind: 'venue',
  slug: 'foxeys-hangout',
  title: 'Foxeys Hangout',
  href: '/eat/foxeys-hangout/',
};
const MERRICKS = {
  kind: 'venue',
  slug: 'merricks-general-wine-store',
  title: 'Merricks General Wine Store',
  href: '/eat/merricks-general-wine-store/',
};
const POLPERRO = {
  kind: 'venue',
  slug: 'polperro',
  title: 'Polperro',
  href: '/eat/polperro/',
};

// ---------------------------------------------------------------------------
// The collision
// ---------------------------------------------------------------------------

test('a v5-store write survives a later legacy-store write', () => {
  reset();

  // Page load: the site-wide controller reads through the legacy module.
  legacy.list();

  // "+ Trip" on a v5 card auto-saves through v5-store.
  v5.save(FOXEYS);

  // Save on a different card, through the legacy module.
  legacy.toggle(MERRICKS);

  assert.deepEqual(storedKeys(), ['venue/foxeys-hangout', 'venue/merricks-general-wine-store']);
  assert.equal(legacy.isSaved('venue', 'foxeys-hangout'), true, 'legacy module sees the v5 write');
  assert.equal(v5.isSaved('venue', 'merricks-general-wine-store'), true, 'v5 module sees the legacy write');
});

test('a v5-store removal is not resurrected by a later legacy-store write', () => {
  reset();

  // Save one card through the legacy module, one through v5-store.
  legacy.toggle(POLPERRO);
  v5.save(FOXEYS);

  // Page load reads through the legacy module.
  legacy.list();

  // Remove one on /me/saved/, which runs through v5-store.
  v5.unsave('venue', 'polperro');

  // Save any card anywhere, through the legacy module.
  legacy.toggle(MERRICKS);

  assert.deepEqual(storedKeys(), ['venue/foxeys-hangout', 'venue/merricks-general-wine-store']);
  assert.equal(legacy.isSaved('venue', 'polperro'), false, 'the removed item stays removed');
});

test('a legacy-store write is visible to the v5 store (reverse direction)', () => {
  reset();

  v5.save(FOXEYS);
  v5.listSaves();

  legacy.toggle(MERRICKS);

  assert.deepEqual(v5.listSaves().map((it) => it.slug).sort(), [
    'foxeys-hangout',
    'merricks-general-wine-store',
  ]);
});

test('an unsave through the legacy module is visible to the v5 store', () => {
  reset();

  legacy.toggle(FOXEYS);
  legacy.toggle(MERRICKS);
  v5.listSaves();

  legacy.toggle(FOXEYS); // toggling an existing item removes it

  assert.deepEqual(v5.listSaves().map((it) => it.slug), ['merricks-general-wine-store']);
});

// ---------------------------------------------------------------------------
// Silent write failures
// ---------------------------------------------------------------------------

test('the legacy store reports a failed write instead of claiming the save landed', () => {
  reset();
  legacy.toggle(FOXEYS);

  localStorage.failWrites = true;
  const result = legacy.toggle(MERRICKS);

  assert.equal(result.ok, false, 'the caller is told the write did not land');
  assert.equal(result.saved, false, 'and that the item is not saved');
  assert.deepEqual(storedKeys(), ['venue/foxeys-hangout'], 'storage is unchanged');

  localStorage.failWrites = false;
  assert.equal(legacy.isSaved('venue', 'merricks-general-wine-store'), false);
});

test('the legacy store reports a failed unsave too', () => {
  reset();
  legacy.toggle(FOXEYS);

  localStorage.failWrites = true;
  const result = legacy.toggle(FOXEYS);

  assert.equal(result.ok, false);
  assert.equal(result.saved, true, 'the item is still saved, so the button must stay "Saved"');

  localStorage.failWrites = false;
  assert.deepEqual(storedKeys(), ['venue/foxeys-hangout']);
});

test('legacy remove / clear / merge report a failed write', () => {
  reset();
  legacy.toggle(FOXEYS);

  localStorage.failWrites = true;
  assert.equal(legacy.remove('venue', 'foxeys-hangout'), false, 'remove reports failure');
  assert.equal(legacy.clear(), false, 'clear reports failure');
  assert.equal(
    legacy.merge([{ ...MERRICKS, savedAt: Date.now() }]),
    0,
    'merge reports nothing added',
  );

  localStorage.failWrites = false;
  assert.deepEqual(storedKeys(), ['venue/foxeys-hangout'], 'storage is unchanged throughout');
});

test('the v5 store reports a failed write instead of claiming the save landed', () => {
  reset();
  v5.save(FOXEYS);

  localStorage.failWrites = true;
  const result = v5.toggleSave(MERRICKS);

  assert.equal(result.ok, false, 'the caller is told the write did not land');
  assert.equal(result.saved, false, 'and that the item is not saved');
  assert.equal(v5.save(POLPERRO), null, 'save() returns null when the write did not land');
  assert.equal(v5.unsave('venue', 'foxeys-hangout'), false, 'unsave reports failure');

  localStorage.failWrites = false;
  assert.deepEqual(storedKeys(), ['venue/foxeys-hangout'], 'storage is unchanged');
});

test('the v5 store reports a failed trip write', () => {
  reset();
  v5.tripAdd({ kind: 'venue', slug: 'foxeys-hangout', title: 'Foxeys Hangout', href: '/eat/foxeys-hangout/' });
  const before = v5.tripCount();

  localStorage.failWrites = true;
  assert.equal(
    v5.tripAdd({ title: 'Lunch somewhere in Flinders' }),
    null,
    'tripAdd returns null when the write did not land',
  );
  assert.equal(v5.tripAddDay('Saturday'), null, 'tripAddDay returns null when the write did not land');

  localStorage.failWrites = false;
  assert.equal(v5.tripCount(), before, 'the trip is unchanged');
});
