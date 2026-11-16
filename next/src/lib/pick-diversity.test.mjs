import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillDistinctPicks, recentlyChecked } from './pick-diversity.mjs';

const event = (slug, venue, category) => ({ slug, venue, category });

test('the short list favours distinct venues and categories before a second event at one venue', () => {
  const ranked = [
    event('gallery', 'mprg', 'exhibition'),
    event('music', 'hot-springs', 'live-music'),
    event('yoga', 'hot-springs', 'wellness'),
    event('market', 'red-hill', 'market'),
  ];
  assert.deepEqual(fillDistinctPicks(ranked).map((item) => item.slug), ['gallery', 'music', 'market']);
});

test('a thin live pool still fills the short list without repeating a slug', () => {
  const ranked = [
    event('music', 'hot-springs', 'live-music'),
    event('yoga', 'hot-springs', 'wellness'),
    event('gallery', 'mprg', 'exhibition'),
  ];
  assert.deepEqual(fillDistinctPicks(ranked, [event('gallery', 'mprg', 'exhibition')]).map((item) => item.slug), ['gallery', 'music', 'yoga']);
});

test('existing editor choices retain their positions', () => {
  const editor = [event('editor-lead', 'mprg', 'exhibition')];
  const ranked = [event('same-gallery', 'mprg', 'exhibition'), event('market', 'red-hill', 'market')];
  assert.deepEqual(fillDistinctPicks(ranked, editor, 2).map((item) => item.slug), ['editor-lead', 'market']);
});

test('automatic picks require a source check within the last 30 calendar days', () => {
  const today = new Date('2026-10-04T23:00:00Z');
  assert.equal(recentlyChecked(new Date('2026-09-04'), today), true);
  assert.equal(recentlyChecked(new Date('2026-09-03'), today), false);
  assert.equal(recentlyChecked(new Date('2026-10-05'), today), false);
  assert.equal(recentlyChecked(undefined, today), false);
});
