import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = (path) => readFileSync(new URL(`../dist/${path}/index.html`, import.meta.url), 'utf8');
const values = (html, key) => [...html.matchAll(new RegExp(`data-sheet-option[^>]*data-key="${key}"[^>]*data-value="([^"]+)"`, 'g'))]
  .map((match) => match[1]);

test('active homepage has current editorial, no authoring hint, and the active Instagram footer', () => {
  const html = page('');
  assert.doesNotMatch(html, /right-click the picture to replace it|data-cover-hint|home-cover__edit-hint/i);
  assert.doesNotMatch(html, /The Winter Long Lunch: Vineyard Dining Room or Coastal Pub/);
  assert.match(html, /\/journal\/(spring-school-holidays-2026|area-guide-red-hill)\//);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/peninsula_insider\/"[^>]*>Instagram · @peninsula_insider<\/a>/);
  assert.match(html, /Spring cellar doors/);
  assert.doesNotMatch(html, />Winter wineries<\/span>/);
});

test('each vertical displays only its relevant category choices', () => {
  const expected = {
    eat: ['restaurant', 'cafe', 'bakery', 'pub', 'brewery', 'distillery', 'providore', 'market'],
    stay: ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay'],
    wine: ['winery', 'brewery', 'distillery'],
    explore: ['spa', 'walk', 'beach', 'golf', 'gallery', 'lookout', 'attraction', 'park', 'tour', 'garden', 'market'],
  };
  for (const [surface, categories] of Object.entries(expected)) {
    assert.deepEqual(values(page(surface), 'cat').sort(), categories.sort(), `${surface} categories`);
  }
});

test('Eat and Wine mood choices match their section', () => {
  assert.deepEqual(values(page('eat'), 'mood').sort(), [
    'long-lunch', 'date-night', 'quick', 'slow', 'scenic', 'garden', 'on-the-water', 'cosy', 'worth-the-drive',
  ].sort());
  assert.deepEqual(values(page('wine'), 'mood').sort(), [
    'scenic', 'garden', 'cosy', 'tasting-first', 'lunch-attached', 'small-quiet', 'architecture',
  ].sort());
});

test('the search page suggests Spring while retaining old query aliases', () => {
  assert.match(page('search'), /Spring cellar doors/);
  const source = readFileSync(new URL('../src/pages/search.astro', import.meta.url), 'utf8');
  assert.match(source, /aliases: \[[^\]]*'winter wineries'/);
});
