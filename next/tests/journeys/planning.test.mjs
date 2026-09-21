/**
 * PI-012 journey 4 of 4: PLANNING.
 *
 * The plans hub answers "what should I do" with a plan, and "Make it my trip"
 * copies that plan's stops into the reader's trip. The plan detail pages carry
 * the same import flow, preserving day order and protecting an existing trip.
 *
 * States covered:
 *   - signed out
 *   - an empty trip before the fork
 *   - a navigation between the hub and another page, three times over, then
 *     the fork pressed ONCE. This is the regression that was found in the
 *     PI-012 audit and fixed in #395: the fork listener was registered from an
 *     astro:page-load handler, so returning to the hub three times and
 *     pressing once copied the plan three times, days included. It is the
 *     single most expensive way this defect class shows up, because the
 *     reader's trip quietly triples.
 *   - a repeated action on the detail-page fork, which must add nothing the
 *     second time and must say so
 *   - a failed network call
 *
 * The plan detail route is discovered from the built output rather than
 * hardcoded: which plan carries a fork button is an editorial decision.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Site, routesContaining } from './harness.mjs';

const TRIP_KEY = 'pi:saves:v2:trip';
const SAVES_KEY = 'pi:saves:v2';
const site = await Site.open();
test.after(() => site.close());

const read = async (reader, key, field) => {
  const raw = await reader.storage(key);
  if (!raw) return [];
  try { return JSON.parse(raw)[field] || []; } catch { return []; }
};

const forkOnce = async (reader) => {
  const before = (await read(reader, TRIP_KEY, 'entries')).length;
  const clicked = await reader.page.evaluate(() => {
    const btn = document.querySelector('[data-plan-fork]:not([disabled])');
    if (!btn) return false;
    btn.click();
    return true;
  });
  assert.ok(clicked, 'expected an enabled "Make it my trip" control on the plans hub');
  // Wait for the copy to land in the store rather than for 300ms to pass. The
  // fork either moved the trip or it did not; how long it took is a fact about
  // the machine and must not be allowed to decide the verdict.
  await reader.waitFor(
    (n) => {
      try {
        const raw = localStorage.getItem('pi:saves:v2:trip');
        return (raw ? (JSON.parse(raw).entries || []).length : 0) > n;
      } catch { return false; }
    },
    `pressing "Make it my trip" never added a stop (the trip held ${before} before the press)`,
    before,
    { describe: () => localStorage.getItem('pi:saves:v2:trip') },
  );
};

test('the plans hub offers a plan and a way to take it', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/explore/plans/');
    const forks = await reader.page.evaluate(() => document.querySelectorAll('[data-plan-fork]').length);
    assert.ok(forks > 0, 'the hub must offer at least one "Make it my trip"');
    assert.deepEqual(await read(reader, TRIP_KEY, 'entries'), [], 'the trip starts empty');
  } finally {
    await reader.close();
  }
});

test('forking a plan copies it into the trip exactly once', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/explore/plans/');
    await forkOnce(reader);
    const entries = await read(reader, TRIP_KEY, 'entries');
    assert.ok(entries.length > 0, 'forking a plan must put its stops in the trip');

    await reader.navigate('/me/trip/');
    const rendered = await reader.page.evaluate(() => document.querySelectorAll('[data-trip-stop]').length);
    assert.equal(rendered, entries.length, 'the trip page must show every stop the fork added');
  } finally {
    await reader.close();
  }
});

test('returning to the hub three times and forking once copies the plan once', async () => {
  const reader = await site.reader();
  try {
    // Establish the size of one copy, in a reader of its own.
    const control = await site.reader();
    let oneCopy;
    try {
      await control.load('/explore/plans/');
      await forkOnce(control);
      oneCopy = {
        entries: (await read(control, TRIP_KEY, 'entries')).length,
        days: (await read(control, TRIP_KEY, 'days')).length,
      };
    } finally {
      await control.close();
    }
    assert.ok(oneCopy.entries > 0);

    await reader.load('/explore/plans/');
    for (let i = 0; i < 3; i += 1) {
      await reader.navigate('/eat/');
      await reader.navigate('/explore/plans/');
    }
    await forkOnce(reader);

    const entries = (await read(reader, TRIP_KEY, 'entries')).length;
    const days = (await read(reader, TRIP_KEY, 'days')).length;
    assert.equal(
      entries,
      oneCopy.entries,
      `after three returns to the hub, one press copied the plan ${(entries / oneCopy.entries).toFixed(1)} times `
      + `(${entries} stops where one copy is ${oneCopy.entries})`,
    );
    assert.equal(days, oneCopy.days, 'the plan\'s days were copied more than once');
  } finally {
    await reader.close();
  }
});

test('a plan detail page imports its sequenced stops into the trip once, and says so on a repeat', async () => {
  const [route] = routesContaining('data-pi-fork-plan', 1);
  assert.ok(route);
  const reader = await site.reader();
  try {
    await reader.load(route);
    const expected = await reader.page.evaluate(() => JSON.parse(document.querySelector('[data-pi-fork-plan]').dataset.piPlan));
    await reader.page.evaluate(() => document.querySelector('[data-pi-fork-plan]').click());
    await reader.waitFor(() => /ready/i.test(document.querySelector('[data-plan-import-status]')?.textContent || ''), 'detail import must finish');
    const first = await read(reader, TRIP_KEY, 'entries');
    assert.equal(first.length, expected.stops.length);
    assert.equal((await read(reader, TRIP_KEY, 'days')).length, new Set(expected.stops.map(s => s.day)).size);
    await reader.page.evaluate(() => document.querySelector('[data-pi-fork-plan]').click());
    await reader.waitFor(() => /already/i.test(document.querySelector('[data-plan-import-status]')?.textContent || ''), 'repeat must report existing plan');
    assert.deepEqual(await read(reader, TRIP_KEY, 'entries'), first);
  } finally { await reader.close(); }
});

test('existing trip offers cancel, extra days and explicit replacement', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/explore/plans/the-peninsula-golf-weekend/');
    const seed = { version: 1, days: [{ id: 'mine', label: 'My day' }], entries: [{ id: 'mine', title: 'Keep my stop', dayId: 'mine', note: 'My note', addedAt: 1 }] };
    await reader.page.evaluate((value) => localStorage.setItem('pi:saves:v2:trip', JSON.stringify(value)), seed);
    await reader.page.evaluate(() => document.querySelector('[data-pi-fork-plan]').click());
    await reader.waitFor(() => !!document.querySelector('.plan-import-dialog[open]'), 'existing-trip decision must open');
    await reader.page.evaluate(() => document.querySelector('.plan-import-dialog button[value="cancel"]').click());
    await reader.waitFor(() => !document.querySelector('.plan-import-dialog'), 'cancel closes dialog');
    assert.deepEqual(JSON.parse(await reader.storage(TRIP_KEY)), seed);
    await reader.page.evaluate(() => document.querySelector('[data-pi-fork-plan]').click());
    await reader.waitFor(() => !!document.querySelector('.plan-import-dialog[open]'), 'decision opens again');
    await reader.page.evaluate(() => document.querySelector('.plan-import-dialog button[value="append"]').click());
    await reader.waitFor(() => /ready/i.test(document.querySelector('[data-plan-import-status]')?.textContent || ''), 'append finishes');
    assert.deepEqual((await read(reader, TRIP_KEY, 'entries'))[0], seed.entries[0]);
    assert.ok((await read(reader, TRIP_KEY, 'days')).length > 1);
    // A different itinerary must also offer explicit replacement.
    await reader.navigate('/explore/plans/the-family-day-out/');
    await reader.page.evaluate(() => document.querySelector('[data-pi-fork-plan]').click());
    await reader.waitFor(() => !!document.querySelector('.plan-import-dialog[open]'), 'another plan asks before replacing');
    await reader.page.evaluate(() => document.querySelector('.plan-import-dialog button[value="replace"]').click());
    await reader.waitFor(() => /ready/i.test(document.querySelector('[data-plan-import-status]')?.textContent || ''), 'replace finishes');
    assert.equal((await read(reader, TRIP_KEY, 'entries')).some(e => e.id === 'mine'), false);
  } finally { await reader.close(); }
});

test('curated dining swap keeps day and position and updates the stop', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/explore/plans/the-peninsula-golf-weekend/');
    await reader.page.evaluate(() => document.querySelector('[data-pi-fork-plan]').click());
    await reader.waitFor(() => /ready/i.test(document.querySelector('[data-plan-import-status]')?.textContent || ''), 'import finishes');
    const before = await read(reader, TRIP_KEY, 'entries');
    const index = before.findIndex(e => e.slug === 'montalto');
    assert.ok(index >= 0);
    await reader.navigate('/me/trip/');
    await reader.page.evaluate(() => document.querySelector('[data-trip-swap="port-phillip-estate"]').click());
    await reader.waitFor(() => /Changed to/i.test(document.querySelector('#pi-trip-status')?.textContent || ''), 'swap finishes');
    const after = await read(reader, TRIP_KEY, 'entries');
    assert.equal(after.length, before.length);
    assert.equal(after[index].slug, 'port-phillip-estate');
    assert.equal(after[index].dayId, before[index].dayId);
    assert.equal(after[index].id, before[index].id);
  } finally { await reader.close(); }
});

test('planning works signed out with the network down', async () => {
  const reader = await site.reader({ offline: true });
  try {
    await reader.load('/explore/plans/');
    await forkOnce(reader);
    assert.ok((await read(reader, TRIP_KEY, 'entries')).length > 0, 'the fork is local and must not need the network');
    assert.deepEqual(await reader.errors(), [], 'a failed beacon must not raise an uncaught error');
  } finally {
    await reader.close();
  }
});


test('sharing the wellness plan preserves repeat stays and importing twice is idempotent', async () => {
  const author = await site.reader();
  const recipient = await site.reader();
  try {
    await author.load('/explore/plans/wellness-weekend/');
    await author.page.evaluate(() => document.querySelector('[data-pi-fork-plan]').click());
    await author.waitFor(() => /ready/i.test(document.querySelector('[data-plan-import-status]')?.textContent || ''), 'wellness import finishes');
    const original = await read(author, TRIP_KEY, 'entries');
    await author.navigate('/me/trip/');
    await author.page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__sharedTripUrl = text; } } });
      document.querySelector('[data-trip-share]').click();
    });
    await author.waitFor(() => !!window.__sharedTripUrl, 'share link is generated');
    const url = await author.page.evaluate(() => window.__sharedTripUrl);
    const path = new URL(url).pathname + new URL(url).search;
    await recipient.load(path);
    await recipient.page.evaluate(() => document.querySelector('[data-trip-import]').click());
    await recipient.waitFor(() => document.querySelector('[data-trip-shared]')?.hidden, 'shared import finishes');
    const imported = await read(recipient, TRIP_KEY, 'entries');
    assert.equal(imported.length, original.length);
    assert.equal(imported.filter(e => e.slug === 'lindenderry').length, 2);
    await recipient.navigate(path);
    await recipient.page.evaluate(() => document.querySelector('[data-trip-import]').click());
    await recipient.waitFor(() => document.querySelector('[data-trip-shared]')?.hidden, 'repeat shared import finishes');
    assert.equal((await read(recipient, TRIP_KEY, 'entries')).length, original.length);
  } finally { await author.close(); await recipient.close(); }
});
