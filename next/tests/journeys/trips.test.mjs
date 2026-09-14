/**
 * PI-012 journey 3 of 4: TRIPS.
 *
 * States covered:
 *   - signed out
 *   - an empty trip
 *   - a repeated action: pressing "+ Trip" twice must add exactly two stops,
 *     one per press. A trip is allowed to hold the same venue twice (two days,
 *     two visits), so the assertion is one-press-one-add rather than
 *     deduplication - which is exactly the assertion a second listener on the
 *     same button breaks.
 *   - a navigation between /me/saved/ and /me/trip/, both of which read and
 *     write the same store, and the action used again afterwards
 *   - removal after a navigation
 *   - a failed network call while signed in
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';

const TRIP_KEY = 'pi:saves:v2:trip';
const site = await Site.open();
test.after(() => site.close());

const tripEntries = async (reader) => {
  const raw = await reader.storage(TRIP_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw).entries || []; } catch { return []; }
};

/**
 * Wait until the trip store holds exactly `n` entries.
 *
 * Every wait in this suite is on the store reaching a stated size rather than
 * on a stopwatch. The press either moved the store or it did not; how long
 * that took is a property of the machine and must not decide the verdict.
 */
const waitForTrip = (reader, n, why) => reader.waitFor(
  (want) => {
    try {
      const raw = localStorage.getItem('pi:saves:v2:trip');
      return (raw ? (JSON.parse(raw).entries || []).length : 0) === want;
    } catch { return false; }
  },
  why,
  n,
  { describe: () => localStorage.getItem('pi:saves:v2:trip') },
);

/** Save the first two venues on a hub, so the trip journey has something to draw on. */
async function seedSaves(reader) {
  await reader.load('/eat/');
  await reader.page.evaluate(() => {
    document.querySelectorAll('[data-v5-save-control]')[0].querySelector('[data-v5-save-btn]').click();
    document.querySelectorAll('[data-v5-save-control]')[1].querySelector('[data-v5-save-btn]').click();
  });
  await reader.waitFor(
    () => {
      try {
        const raw = localStorage.getItem('pi:saves:v2');
        return (raw ? (JSON.parse(raw).items || []).length : 0) === 2;
      } catch { return false; }
    },
    'seeding two saves on /eat/ never reached two items in the store',
    null,
    { describe: () => localStorage.getItem('pi:saves:v2') },
  );
}

const stopsOnPage = (reader) => reader.page.evaluate(() => document.querySelectorAll('[data-trip-stop]').length);

test('signed out, the trip starts empty and offers a way out of the empty state', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/me/trip/');
    assert.deepEqual(await tripEntries(reader), []);
    assert.equal(await stopsOnPage(reader), 0);
    // This assertion used to count `.trip-empty-doors a, [data-surface="me-trip"]`
    // and require more than nought. It could not fail. `[data-surface="me-trip"]`
    // also matches the "Search for something to fill a gap" link down in the add
    // panel, which is in the static HTML of every visit whether or not the empty
    // state exists - so deleting the empty state outright left it green.
    //
    // Worse, it never asked whether the reader could SEE any of it. The empty
    // state ships `hidden` and the page's own script un-hides it when the trip
    // has no stops. A script left dead by a client-side navigation - this
    // ticket's entire subject - shows the reader a page with nothing on it, and
    // the old assertion called that a pass.
    //
    // So: look only inside the empty state, require it to be visible, and count
    // only links the reader could actually click.
    const empty = await reader.page.evaluate(() => {
      const panel = document.querySelector('[data-trip-empty]');
      if (!panel) return { present: false, visible: false, doors: [] };
      const shown = (el) => el.getClientRects().length > 0;
      return {
        present: true,
        visible: !panel.hidden && shown(panel),
        doors: [...panel.querySelectorAll('a[href]')].filter(shown).map((a) => a.getAttribute('href')),
      };
    });
    assert.ok(empty.present, 'the trip page must ship an empty state');
    assert.ok(
      empty.visible,
      'an empty trip renders its empty state hidden and the page script reveals it. '
      + 'It is still hidden, so the script never ran and the reader is looking at a '
      + 'page with nothing on it whatsoever.',
    );
    assert.ok(
      empty.doors.length >= 2,
      'an empty trip must offer somewhere to go, not just say it is empty. Visible links '
      + `inside the empty state: ${JSON.stringify(empty.doors)}`,
    );
  } finally {
    await reader.close();
  }
});

test('adding from the saved list puts one stop in the trip per press', async () => {
  const reader = await site.reader();
  try {
    await seedSaves(reader);
    await reader.navigate('/me/saved/');
    const addButtons = await reader.page.evaluate(() => document.querySelectorAll('[data-me-trip]').length);
    assert.ok(addButtons >= 1, 'the saved list must offer "+ Trip"');

    await reader.page.evaluate(() => { document.querySelector('[data-me-trip]').click(); });
    await waitForTrip(reader, 1, 'one press on "+ Trip" never put a stop in the trip');
    assert.equal((await tripEntries(reader)).length, 1, 'one press, one stop');

    // Repeated action. Two presses, two stops - never four.
    await reader.page.evaluate(() => { document.querySelector('[data-me-trip]').click(); });
    await waitForTrip(
      reader, 2,
      'a second press on "+ Trip" did not leave the trip holding exactly two stops. Four '
      + 'means the button is bound twice; one means the second press was swallowed',
    );
    const after = await tripEntries(reader);
    assert.equal(after.length, 2, `two presses produced ${after.length} stops`);
  } finally {
    await reader.close();
  }
});

test('the trip survives a navigation between the two surfaces that write it', async () => {
  const reader = await site.reader();
  try {
    await seedSaves(reader);
    await reader.navigate('/me/saved/');
    await reader.page.evaluate(() => { document.querySelector('[data-me-trip]').click(); });
    await waitForTrip(reader, 1, 'adding the first stop from the saved list never reached the store');

    await reader.navigate('/me/trip/');
    assert.equal(await stopsOnPage(reader), 1, 'the trip page must render the stop that was just added');

    // Back to the saved list, add the second item, and return. Both pages read
    // and write the same store; the failure this catches is a page that paints
    // from a DOM reference the router already discarded.
    await reader.navigate('/me/saved/');
    await reader.page.evaluate(() => { document.querySelectorAll('[data-me-trip]')[1].click(); });
    await waitForTrip(
      reader, 2,
      'adding a second stop AFTER a navigation never reached the store - the saved page is '
      + 'painting from a DOM the router already discarded',
    );
    assert.equal((await tripEntries(reader)).length, 2);

    await reader.navigate('/me/trip/');
    assert.equal(await stopsOnPage(reader), 2, 'the trip page must repaint after a navigation');
  } finally {
    await reader.close();
  }
});

test('removing a stop works after a navigation, and removes exactly one', async () => {
  const reader = await site.reader();
  try {
    await seedSaves(reader);
    await reader.navigate('/me/saved/');
    await reader.page.evaluate(() => {
      document.querySelectorAll('[data-me-trip]')[0].click();
      document.querySelectorAll('[data-me-trip]')[1].click();
    });
    await waitForTrip(reader, 2, 'seeding two stops from the saved list never reached two entries');
    assert.equal((await tripEntries(reader)).length, 2);

    await reader.navigate('/me/trip/');
    await reader.navigate('/eat/');
    await reader.navigate('/me/trip/');
    assert.equal(await stopsOnPage(reader), 2, 'the trip must still render after two navigations');

    await reader.page.evaluate(() => { document.querySelector('[data-trip-remove]').click(); });
    await waitForTrip(
      reader, 1,
      'Remove did not leave the trip holding exactly one stop after two navigations. Two '
      + 'means the button is inert; nought means it fired twice',
    );
    assert.equal((await tripEntries(reader)).length, 1, 'Remove removed nothing, or removed twice');
    assert.equal(await stopsOnPage(reader), 1, 'the trip must repaint after a removal');
  } finally {
    await reader.close();
  }
});

test('signed in with the network down, the trip still holds locally', async () => {
  const reader = await site.reader({ signedIn: true, offline: true });
  try {
    await seedSaves(reader);
    await reader.navigate('/me/saved/');
    await reader.page.evaluate(() => { document.querySelector('[data-me-trip]').click(); });
    await waitForTrip(reader, 1, 'with the network down, adding a stop never reached the local store');
    assert.equal((await tripEntries(reader)).length, 1, 'a local trip write must not depend on the cloud');
    await reader.navigate('/me/trip/');
    assert.equal(await stopsOnPage(reader), 1);
    assert.deepEqual(await reader.errors(), [], 'a failed sync must be handled, not thrown');
  } finally {
    await reader.close();
  }
});
