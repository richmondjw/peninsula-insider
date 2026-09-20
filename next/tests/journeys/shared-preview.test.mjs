import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';
const site = await Site.open();
test.after(() => site.close());
test('shared trip is a read-only two-day preview until recipient imports it', async () => {
 const r = await site.reader();
 try {
  await r.load('/me/trip/');
  const keys = await r.page.$eval('#pi-trip-lookup', el => Object.keys(JSON.parse(el.textContent)).filter(k => k.startsWith('venue/')).slice(0, 2));
  const i = keys.map((key, n) => key.replace('/', ':') + ':d' + n).join('|') + '|venue:missing-place:d1';
  const url = '/me/trip/?' + new URLSearchParams({ i, d: 'd0:Sorrento%20Saturday|d1:Sunday' });
  await r.load(url);
  assert.match(await r.page.$eval('[data-trip-shared-list]', el => el.textContent), /Sorrento Saturday/);
  assert.equal(await r.page.$$eval('.trip-preview-day', els => els.length), 2);
  assert.match(await r.page.$eval('[data-trip-shared-list]', el => el.textContent), /Current PI details unavailable/);
  assert.equal(await r.page.$eval('[data-trip-empty]', el => el.hidden), true);
  assert.equal(await r.page.evaluate(() => JSON.parse(localStorage.getItem('pi:saves:v2:trip') || '{}').entries?.length || 0), 0);
  for (const width of [390, 1280]) { await r.page.setViewport({ width, height: 844 }); assert.ok(await r.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
  await r.page.click('[data-trip-import]');
  await r.waitFor(() => document.querySelector('[data-trip-shared]').hidden, 'preview not dismissed after import');
  assert.equal(await r.page.$eval('[data-note-pathway]', el => el.hidden), false);
  const count = await r.page.evaluate(() => JSON.parse(localStorage.getItem('pi:saves:v2:trip')).entries.length);
  await r.load(url); await r.page.click('[data-trip-import]');
  assert.equal(await r.page.evaluate(() => JSON.parse(localStorage.getItem('pi:saves:v2:trip')).entries.length), count);
 } finally { await r.close(); }
});
test('malformed shared link does not import and offers the normal empty-state actions', async () => {
 const r = await site.reader(); try {
  await r.load('/me/trip/?i=unknown:evil');
  assert.equal(await r.page.$eval('[data-trip-shared]', el => el.hidden), true);
  assert.equal(await r.page.$eval('[data-trip-empty]', el => el.hidden), false);
  assert.equal(await r.page.$eval('[data-note-pathway]', el => el.hidden), true);
 } finally { await r.close(); }
});
