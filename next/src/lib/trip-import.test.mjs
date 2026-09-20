/**
 * Shared-trip import planner tests (PI-012 defect 4). Run from repo root or next/:
 *
 *   node --test next/src/lib/trip-import.test.mjs
 *
 * Uses Node's native TypeScript type-stripping to import the .ts source
 * directly. No framework, no build step, no browser.
 *
 * The defect these lock down: opening the same share link twice and importing
 * twice duplicated every day and every stop, because the add helpers append
 * unconditionally.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { planSharedTripImport } from './trip-import.ts';

const SHARED = {
  items: [
    { kind: 'venue', slug: 'montalto', dayId: 'd1' },
    { kind: 'venue', slug: 'pt-leo-estate', dayId: 'd1' },
    { kind: 'event', slug: 'sorrento-solstice', dayId: 'd2' },
  ],
  days: [
    { id: 'd1', label: 'Day 1' },
    { id: 'd2', label: 'Day 2' },
  ],
};

const EMPTY_TRIP = { days: [], entries: [] };

/** Apply a plan to a fake trip, the way me/trip.astro applies it to the store. */
function applyPlan(trip, shared) {
  const plan = planSharedTripImport(shared, trip);
  const dayMap = { ...plan.reusedDayIds };
  for (const d of plan.daysToCreate) {
    const created = { id: `day_${trip.days.length + 1}`, label: d.label };
    trip.days.push(created);
    dayMap[d.sharedId] = created.id;
  }
  for (const stop of plan.stops) {
    trip.entries.push({ kind: stop.kind, slug: stop.slug, dayId: dayMap[stop.dayId] || '' });
  }
  return plan;
}

test('first import adds every day and every stop', () => {
  const trip = structuredClone(EMPTY_TRIP);
  const plan = applyPlan(trip, SHARED);

  assert.equal(plan.stops.length, 3);
  assert.deepEqual(plan.daysToCreate.map((d) => d.label), ['Day 1', 'Day 2']);
  assert.deepEqual(plan.reusedDayIds, {});
  assert.equal(trip.entries.length, 3);
  assert.equal(trip.days.length, 2);
});

test('re-importing the same share link adds nothing at all', () => {
  const trip = structuredClone(EMPTY_TRIP);
  applyPlan(trip, SHARED);
  const second = applyPlan(trip, SHARED);

  assert.deepEqual(second.stops, [], 'second import must add no stops');
  assert.deepEqual(second.daysToCreate, [], 'second import must create no days');
  assert.equal(trip.entries.length, 3, 'stops must not be duplicated');
  assert.equal(trip.days.length, 2, 'days must not be duplicated');
});

test('a third import is still a no-op', () => {
  const trip = structuredClone(EMPTY_TRIP);
  applyPlan(trip, SHARED);
  applyPlan(trip, SHARED);
  applyPlan(trip, SHARED);

  assert.equal(trip.entries.length, 3);
  assert.equal(trip.days.length, 2);
});

test('a partly-imported link tops up only what is missing', () => {
  const trip = {
    days: [{ id: 'existing_1', label: 'Day 1' }],
    entries: [{ kind: 'venue', slug: 'montalto', dayId: 'existing_1' }],
  };
  const plan = applyPlan(trip, SHARED);

  assert.deepEqual(plan.stops.map((s) => s.slug), ['pt-leo-estate', 'sorrento-solstice']);
  assert.deepEqual(plan.reusedDayIds, { d1: 'existing_1' }, 'Day 1 already exists; reuse it');
  assert.deepEqual(plan.daysToCreate.map((d) => d.label), ['Day 2']);
  assert.equal(trip.days.length, 2, 'Day 1 must not be recreated');
  assert.equal(trip.entries.length, 3);
});

test('no day is created for a day whose stops were all already held', () => {
  const trip = {
    days: [],
    entries: [
      { kind: 'venue', slug: 'montalto', dayId: '' },
      { kind: 'venue', slug: 'pt-leo-estate', dayId: '' },
    ],
  };
  const plan = planSharedTripImport(SHARED, trip);

  assert.deepEqual(plan.stops.map((s) => s.slug), ['sorrento-solstice']);
  assert.deepEqual(
    plan.daysToCreate.map((d) => d.label),
    ['Day 2'],
    'Day 1 has no surviving stops, so it must not be created as an empty day',
  );
});

test('a stop matching only on slug, not kind, is still imported', () => {
  const trip = { days: [], entries: [{ kind: 'event', slug: 'montalto', dayId: '' }] };
  const plan = planSharedTripImport(SHARED, trip);

  assert.ok(
    plan.stops.some((s) => s.kind === 'venue' && s.slug === 'montalto'),
    'kind is part of the identity; a same-slug event must not mask a venue',
  );
});

test('a share link carrying the same stop twice imports it once', () => {
  const dup = {
    items: [
      { kind: 'venue', slug: 'montalto', dayId: 'd1' },
      { kind: 'venue', slug: 'montalto', dayId: 'd1' },
    ],
    days: [{ id: 'd1', label: 'Day 1' }],
  };
  const plan = planSharedTripImport(dup, { days: [], entries: [] });

  assert.equal(plan.stops.length, 1);
});

test('standalone trip entries without kind or slug do not block an import', () => {
  const trip = { days: [], entries: [{ title: 'Coffee somewhere', dayId: '' }] };
  const plan = planSharedTripImport(SHARED, trip);

  assert.equal(plan.stops.length, 3);
});

test('an empty share link plans nothing', () => {
  const plan = planSharedTripImport({ items: [], days: [] }, EMPTY_TRIP);

  assert.deepEqual(plan.stops, []);
  assert.deepEqual(plan.daysToCreate, []);
  assert.deepEqual(plan.reusedDayIds, {});
});


test('the same venue on separate days survives a shared wellness itinerary', () => {
  const shared = { days: [{ id: 'a', label: 'Day 1' }, { id: 'b', label: 'Day 2' }], items: [
    { kind: 'venue', slug: 'lindenderry', dayId: 'a' },
    { kind: 'venue', slug: 'lindenderry', dayId: 'b' },
  ] };
  const trip = structuredClone(EMPTY_TRIP);
  applyPlan(trip, shared);
  assert.equal(trip.entries.length, 2);
  assert.notEqual(trip.entries[0].dayId, trip.entries[1].dayId);
  assert.equal(planSharedTripImport(shared, trip).stops.length, 0);
});

test('unrelated days with the same label are not reused', () => {
  const trip = { days: [{ id: 'mine', label: 'Day 1' }], entries: [{ kind: 'venue', slug: 'other', dayId: 'mine' }] };
  const result = planSharedTripImport(SHARED, trip);
  assert.equal(result.reusedDayIds.d1, undefined);
  assert.equal(result.daysToCreate.length, 2);
  assert.equal(trip.entries[0].slug, 'other');
});

test('source metadata keeps repeat imports idempotent even after renaming a day', () => {
  const trip = { days: [{ id: 'mine', label: 'Renamed' }], entries: SHARED.items.map((s) => ({ ...s, dayId: 'mine', meta: { sharedSource: JSON.stringify(SHARED), sharedDay: s.dayId } })) };
  assert.equal(planSharedTripImport(SHARED, trip).stops.length, 0);
});
