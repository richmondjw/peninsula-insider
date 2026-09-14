/**
 * PI-012 journey 2 of 4: SAVES.
 *
 * States covered:
 *   - signed out, which is the state most readers save in
 *   - an empty list
 *   - a repeated action - save, unsave, save on the same control, which is the
 *     case a duplicated listener turns into a no-op or a double write
 *   - a navigation between two hubs that both carry SaveControl, then saving
 *     on the second and returning to the first
 *   - removing from the saved list after a navigation
 *   - a failed network call while signed in: the local save must hold and the
 *     UI must not claim anything the cloud did not accept
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';

const SAVES_KEY = 'pi:saves:v2';
const site = await Site.open();
test.after(() => site.close());

const savedItems = async (reader) => {
  const raw = await reader.storage(SAVES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw).items || []; } catch { return []; }
};

const storedCount = async (reader) => (await savedItems(reader)).length;

/**
 * Click the nth save control, then wait for the store to actually change.
 *
 * Waiting on the effect rather than on a stopwatch is what makes this
 * deterministic: a press either moved the store or it did not, and the answer
 * does not depend on how loaded the machine is. The old 150ms sleep would
 * report a slow save as a broken one.
 */
async function clickSave(reader, index = 0) {
  const before = await storedCount(reader);
  const label = await reader.page.evaluate((i) => {
    const controls = document.querySelectorAll('[data-v5-save-control]');
    const control = controls[i];
    if (!control) return null;
    control.querySelector('[data-v5-save-btn]').click();
    return control.dataset.slug;
  }, index);
  assert.ok(label, `expected a save control at index ${index}`);
  await reader.waitFor(
    (n) => {
      try {
        const raw = localStorage.getItem('pi:saves:v2');
        return (raw ? (JSON.parse(raw).items || []).length : 0) !== n;
      } catch { return false; }
    },
    `pressing save on "${label}" never changed the saved store (it held ${before} items before the press)`,
    before,
    { describe: () => localStorage.getItem('pi:saves:v2') },
  );
  return label;
}

const pressed = (reader, index = 0) => reader.page.evaluate((i) => {
  const control = document.querySelectorAll('[data-v5-save-control]')[i];
  return control ? control.querySelector('[data-v5-save-btn]').getAttribute('aria-pressed') : null;
}, index);

test('signed out, the saved list starts empty and says so', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/me/saved/');
    assert.deepEqual(await savedItems(reader), []);
    const copy = await reader.page.evaluate(() => document.body.innerText);
    // Deliberately NOT a loose alternation with /start/ in it. The word "start"
    // appears in site chrome on plenty of pages, so accepting it would let this
    // pass on a page whose empty state had been deleted entirely - which is the
    // regression the assertion exists to catch.
    assert.match(
      copy,
      /nothing saved|no saves/i,
      'an empty saved list must explain itself in its own words, not just render blank',
    );
    const cards = await reader.page.evaluate(() => document.querySelectorAll('[data-me-remove]').length);
    assert.equal(cards, 0);
  } finally {
    await reader.close();
  }
});

test('saving is idempotent under a repeated press', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/eat/');
    const slug = await clickSave(reader, 0);
    assert.equal(
      await pressed(reader, 0),
      'true',
      'after one press the button must read as saved; "false" here means the press was '
      + 'handled an even number of times, which is what a double-bound control does',
    );
    assert.equal((await savedItems(reader)).length, 1, 'one press, one saved item');

    // Press again: unsaved. And again: saved. The store must hold exactly one
    // row for this slug throughout - a second listener on the same button
    // would toggle twice per press and leave the label lying about the state.
    await clickSave(reader, 0);
    assert.equal(await pressed(reader, 0), 'false', 'the second press must unsave');
    assert.equal((await savedItems(reader)).length, 0, 'unsaving must empty the store');

    await clickSave(reader, 0);
    const items = await savedItems(reader);
    assert.equal(await pressed(reader, 0), 'true', 'the third press must save again');
    assert.equal(items.length, 1, `after three presses the store holds ${items.length} items`);
    assert.equal(items[0].slug, slug);
  } finally {
    await reader.close();
  }
});

test('a save made on one hub is still shown as saved after navigating away and back', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/eat/');
    const eatSlug = await clickSave(reader, 0);

    await reader.navigate('/stay/');
    const staySlug = await clickSave(reader, 0);
    assert.equal((await savedItems(reader)).length, 2, 'two hubs, two saves');

    await reader.navigate('/eat/');
    // The control for the already-saved venue must paint itself saved on
    // arrival. This is the state that goes wrong when a control hydrates
    // against a store it can no longer hear from.
    const painted = await reader.page.evaluate((slug) => {
      const control = document.querySelector(`[data-v5-save-control][data-slug="${slug}"]`);
      return control ? control.querySelector('[data-v5-save-btn]').getAttribute('aria-pressed') : null;
    }, eatSlug);
    assert.equal(painted, 'true', `${eatSlug} was saved but does not read as saved after a navigation`);

    // And unsaving it from here must still work, and must not disturb the other.
    await reader.page.evaluate((slug) => {
      document.querySelector(`[data-v5-save-control][data-slug="${slug}"] [data-v5-save-btn]`).click();
    }, eatSlug);
    await reader.waitFor(
      (slug) => {
        try {
          const raw = localStorage.getItem('pi:saves:v2');
          const items = raw ? JSON.parse(raw).items || [] : [];
          return !items.some((it) => it.slug === slug);
        } catch { return false; }
      },
      `unsaving ${eatSlug} after a navigation never removed it from the store - the control `
      + 'is bound to a DOM the router already replaced',
      eatSlug,
      { describe: () => localStorage.getItem('pi:saves:v2') },
    );
    const left = await savedItems(reader);
    assert.equal(left.length, 1);
    assert.equal(left[0].slug, staySlug, 'unsaving one item must not disturb the other');
  } finally {
    await reader.close();
  }
});

test('the saved list lists what was saved, and Remove still works after a navigation', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/eat/');
    await clickSave(reader, 0);
    await clickSave(reader, 1);
    assert.equal((await savedItems(reader)).length, 2);

    await reader.navigate('/me/saved/');
    const listed = await reader.page.evaluate(() => document.querySelectorAll('[data-me-remove]').length);
    assert.equal(listed, 2, `saved two items, the list shows ${listed}`);

    // Leave and come back, then remove. The remove buttons are rendered by the
    // page's own script; if that script is bound to a discarded DOM the button
    // is inert and nothing says so.
    await reader.navigate('/eat/');
    await reader.navigate('/me/saved/');
    const stillListed = await reader.page.evaluate(() => document.querySelectorAll('[data-me-remove]').length);
    assert.equal(stillListed, 2, 'the saved list must render after a client-side navigation');

    await reader.page.evaluate(() => { document.querySelector('[data-me-remove]').click(); });
    await reader.waitFor(
      () => {
        try {
          const raw = localStorage.getItem('pi:saves:v2');
          return (raw ? (JSON.parse(raw).items || []).length : 0) === 1;
        } catch { return false; }
      },
      'Remove did nothing after a navigation - the button is rendered but inert',
      null,
      { describe: () => localStorage.getItem('pi:saves:v2') },
    );
    assert.equal((await savedItems(reader)).length, 1, 'Remove did nothing after a navigation');
    const remaining = await reader.page.evaluate(() => document.querySelectorAll('[data-me-remove]').length);
    assert.equal(remaining, 1, 'the list must repaint after a removal');
  } finally {
    await reader.close();
  }
});

test('signed in with the network down, the save still holds locally', async () => {
  const reader = await site.reader({ signedIn: true, offline: true });
  try {
    await reader.load('/eat/');
    await clickSave(reader, 0);
    const items = await savedItems(reader);
    assert.equal(items.length, 1, 'a local save must not depend on the cloud accepting it');
    assert.equal(await pressed(reader, 0), 'true');
    assert.deepEqual(
      await reader.errors(),
      [],
      'a failed sync must be handled, not thrown - an uncaught error here stops every '
      + 'later handler on the page',
    );
  } finally {
    await reader.close();
  }
});
