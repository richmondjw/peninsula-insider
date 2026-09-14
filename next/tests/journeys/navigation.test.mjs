/**
 * PI-012: the listener sweep, as a measurement rather than a reading.
 *
 * scripts/client-listener-hygiene.test.mjs scans source for the shapes that
 * are known to accumulate. It is cheap and it runs on every build, and it
 * should stay - but it can only find shapes someone has already thought of. It
 * missed six live accumulators because it follows a function called by name
 * and not a function passed as an argument, which is how every v5 island
 * registers (`querySelectorAll(...).forEach(hydrate)`).
 *
 * This test does not read the source at all. It drives the built site, counts
 * every listener, interval and observer held on `document` or `window`, walks
 * back and forth between two pages, and counts again. A shape nobody has
 * thought of still shows up as a number that went up, with the file that
 * registered it named in the failure.
 *
 * WARM-UP. The first visit to a page type executes bundled modules that have
 * never run in this tab, and each registers its listeners once. That is
 * correct and finite. So the baseline is taken after two full round trips,
 * by which point every module on both pages has executed, and only growth
 * AFTER that point counts - which is growth per navigation, which is
 * unbounded.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Site, grown } from './harness.mjs';

const site = await Site.open();
test.after(() => site.close());

/**
 * One pair per journey, plus the two layout surfaces that carry the site
 * chrome. Every page here is on a journey named in the ticket.
 */
const PAIRS = [
  ['/', '/eat/', 'the home page and a hub, which is most readers\' first navigation'],
  ['/search/', '/eat/', 'search'],
  ['/saved/', '/eat/', 'saves, legacy surface'],
  ['/me/saved/', '/eat/', 'saves, v5 surface'],
  ['/me/trip/', '/me/saved/', 'trips, between the two surfaces that write the same store'],
  ['/explore/plans/', '/eat/', 'planning'],
  ['/whats-on/', '/explore/', 'two filtered hubs'],
  ['/explore/map/', '/eat/', 'the map surface'],
];

for (const [a, b, why] of PAIRS) {
  test(`no listener accumulates walking between ${a} and ${b} (${why})`, async () => {
    const reader = await site.reader();
    try {
      await reader.load(a);
      // Warm: every module on both pages has now executed at least once.
      await reader.navigate(b);
      await reader.navigate(a);
      await reader.navigate(b);
      await reader.navigate(a);
      const before = await reader.globals();

      for (let i = 0; i < 3; i += 1) {
        await reader.navigate(b);
        await reader.navigate(a);
      }
      const after = await reader.globals();

      const growth = grown(before, after);
      const detail = growth.map((line) => {
        const key = line.slice(0, line.lastIndexOf(':'));
        const was = before.sources[key] || {};
        const now = after.sources[key] || {};
        const who = Object.entries(now)
          .filter(([src, n]) => n > (was[src] || 0))
          .map(([src, n]) => `        ${src} (${was[src] || 0} -> ${n})`);
        return [`      ${line}`, ...who].join('\n');
      });

      assert.deepEqual(
        growth,
        [],
        `Six navigations between ${a} and ${b} left extra listeners behind.\n`
        + 'Each one is a copy that will run on the next event, on a DOM that no longer exists, '
        + 'for the life of the tab. Register on document/window once at module scope, or tear the '
        + 'previous registration down before making a new one.\n'
        + detail.join('\n'),
      );
    } finally {
      await reader.close();
    }
  });
}

test('walking the journeys raises no uncaught error', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');
    for (const route of ['/eat/', '/search/', '/me/saved/', '/me/trip/', '/explore/plans/', '/']) {
      await reader.navigate(route);
    }
    assert.deepEqual(
      await reader.errors(),
      [],
      'an uncaught error stops every handler registered after it on that turn, so the page '
      + 'half-works in a way nothing reports',
    );
  } finally {
    await reader.close();
  }
});
