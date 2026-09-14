/**
 * PI-012 journey 4 of 4: PLANNING.
 *
 * The plans hub answers "what should I do" with a plan, and "Make it my trip"
 * copies that plan's stops into the reader's trip. The plan detail pages carry
 * the other fork - "copy this plan" - which merges the plan's items into saves.
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

test('a plan detail page copies its items into saves once, and says so on a repeat', async () => {
  const [route] = routesContaining('data-pi-fork-plan', 1);
  assert.ok(route, 'expected at least one built plan page carrying a fork control');

  const reader = await site.reader();
  try {
    await reader.load(route);
    await reader.page.evaluate(() => { document.querySelector('[data-pi-fork-plan]').click(); });
    await reader.waitFor(
      () => {
        try {
          const raw = localStorage.getItem('pi:saves:v2');
          return (raw ? (JSON.parse(raw).items || []).length : 0) > 0;
        } catch { return false; }
      },
      `forking ${route} never put anything in saves`,
      null,
      { describe: () => localStorage.getItem('pi:saves:v2') },
    );
    const first = await read(reader, SAVES_KEY, 'items');
    assert.ok(first.length > 0, `forking ${route} must save its items`);

    // Repeated action: a second press must add nothing and must not claim it did.
    //
    // "Adds nothing" is the one condition you cannot wait for directly - the
    // absence of an effect looks identical to an effect that has not happened
    // yet, and the only way to tell them apart is to wait a while, which is
    // the thing this suite refuses to do. So wait on the positive signal the
    // same press produces: the toast changing from "Saved N items" to "already
    // in your plan". Once that has been said, the handler has demonstrably run
    // to completion, and the store can be asked what it did.
    await reader.page.evaluate(() => {
      const t = document.querySelector('[data-pi-fork-toast]');
      if (t) t.textContent = '';
      document.querySelector('[data-pi-fork-plan]').click();
    });
    await reader.waitFor(
      () => /already/i.test(document.querySelector('[data-pi-fork-toast]')?.textContent || ''),
      'a second fork of the same plan must say the items are already in the plan. It said '
      + 'something else, or nothing - which means it either saved them twice or silently did nothing',
      null,
      { describe: () => document.querySelector('[data-pi-fork-toast]')?.textContent || '(no toast)' },
    );
    const second = await read(reader, SAVES_KEY, 'items');
    assert.equal(second.length, first.length, 'a second fork duplicated the plan into saves');
  } finally {
    await reader.close();
  }
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
