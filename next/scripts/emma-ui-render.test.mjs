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
    stay: ['hotel', 'villa', 'suite', 'accommodation', 'cottage', 'lodge', 'glamping', 'farm-stay'],
    wine: ['winery', 'brewery', 'distillery'],
    explore: ['spa', 'walk', 'beach', 'golf', 'gallery', 'lookout', 'attraction', 'park', 'tour', 'garden', 'market'],
  };
  for (const [surface, categories] of Object.entries(expected)) {
    assert.deepEqual(values(page(surface), 'cat').sort(), categories.sort(), `${surface} categories`);
  }
});

test('an unsourced paused stay keeps context without purchase or search signals', () => {
  const html = page('stay/yurt-hideaway');
  assert.match(html, /Key visitor details are unverified/);
  assert.match(html, /About this listing/);
  assert.doesNotMatch(html, /venue-detail__hero-label|Why we.d go/);
  const hero = html.match(/<figure class="venue-detail__hero"[^>]*>\s*<img src="([^"]+)" alt="([^"]*)"/);
  assert.ok(hero, 'the paused detail keeps a visible hero');
  if (hero[1].includes('/images/sourced/place-rye-01.webp')) {
    assert.equal(hero[2], '', 'the illustrative source image is decorative');
    assert.match(html, /data-pi-media-disclosure="illustrative"/);
  } else {
    // A published CMS override is a different image; never inherit the
    // illustrative source image's disclosure or its credit by implication.
    assert.doesNotMatch(html, /data-pi-media-disclosure="illustrative"/);
  }
  assert.match(html, /noindex, nofollow/);
  assert.match(html, /data-pagefind-ignore/);
  assert.match(html, /BreadcrumbList/);
  assert.doesNotMatch(html, /LodgingBusiness/);
  assert.doesNotMatch(html, /<dt>Spend<\/dt>|venue-detail__price-band/);
  assert.doesNotMatch(html, /<dt>(?:Hours|Opening hours|Live status)<\/dt>|Check current hours/);
  assert.doesNotMatch(html, /data-pi-book="booking"[^>]*data-pi-entity-slug="yurt-hideaway"/);
  assert.doesNotMatch(html, /data-pi-entity-slug="yurt-hideaway"[^>]*data-pi-book="booking"/);
});

test('stay detail and active stay cards withhold relative price bands', () => {
  const eco = page('stay/peninsula-hot-springs-eco-lodges');
  assert.doesNotMatch(eco, /<dt[^>]*>Spend<\/dt>|class="venue-detail__price-band"/);

  const stays = page('stay');
  assert.match(stays, /data-variant="venue"/, "an active stay card renders");
  assert.doesNotMatch(stays, /pi-card__chip--price|aria-label="price band/);
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
