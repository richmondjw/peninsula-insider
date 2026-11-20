import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIndex, kindFor, leadSentences, parsePage, plain, unsupported, SITE } from './generate-ask-index.mjs';

const HEAD = (path) => `Canonical: ${SITE}${path}\nPublisher: Peninsula Insider\nPublished: unknown\nModified: unknown\nFormat: public main text.\nDates and caveats below retain their page meaning.\n\n`;
const place = (slug, name) => `[${name}](<${SITE}/explore/places/${slug}/>)`;

const VENUE = HEAD('/eat/rare-hare/') + `[Eat & Drink](<${SITE}/eat/>)    Restaurant    ${place('merricks-north', 'Merricks North')}

# Rare Hare at Willow Creek

- Photo · Courtesy of Visit Victoria

1   of 9

Known for   Wood-Fired Grill Menu

A relaxed lunch room with a wood fire and vineyard views. The walk in is 2.4 km from the gate. Plates are built for sharing.

Part of Jackalope

[Doot Doot Doot  Restaurant  A multi-course dining room.](<${SITE}/eat/doot-doot-doot/>)

**Best for**

Long lunches · Couples

**Type**

Restaurant

**Tasting fee**

Check with the venue

## Where to stay nearby

Hotel  ${place('red-hill', 'Red Hill')}

A hotel somewhere else entirely, described at length for the reader.
`;

const EVENT = (title, when) => HEAD('/whats-on/x/') + `Event     Markets     ${when}

# ${title}

A makers market with craft, food and live music on the reserve.

Hosted at

Emu Plains Reserve

Coolart Road   ,   Balnarring VIC

At a glance

**When**

${when}

**Time**

09:00 to 14:00

**Price**

Check organiser for pricing
`;

test('only detail and guide pages become answerable records', () => {
  assert.equal(kindFor('/eat/rare-hare/'), 'eat');
  assert.equal(kindFor('/explore/coppins-track/'), 'do');
  assert.equal(kindFor('/explore/places/flinders/'), 'place');
  assert.equal(kindFor('/explore/plans/one-night/'), 'plan');
  assert.equal(kindFor('/whats-on/emu-plains-market/'), 'event');
  for (const path of ['/', '/eat/', '/whats-on/this-weekend/saturday/', '/about/', '/tour/operators/x/', '/partners/portal/', '/account/']) assert.equal(kindFor(path), null, path);
});

test('a page is read for its own words: town from the breadcrumb, never from a neighbour further down', () => {
  const page = parsePage(VENUE);
  assert.equal(page.title, 'Rare Hare at Willow Creek');
  assert.deepEqual(page.place, { slug: 'merricks-north', name: 'Merricks North' });
  assert.equal(page.summary, 'A relaxed lunch room with a wood fire and vineyard views. The walk in is 2.4 km from the gate. Plates are built for sharing.');
  assert.equal(page.facts['Best for'], 'Long lunches · Couples');
  assert.equal(page.facts.Type, 'Restaurant');
  assert.equal(page.facts['Tasting fee'], undefined, 'prices and fees are never carried');
  assert.ok(!JSON.stringify(page).includes('hotel somewhere else'));
});

test('a summary is whole sentences from the page, never a cut one', () => {
  assert.equal(leadSentences('One. Two is 2.4 km long. Three.', 26), 'One. Two is 2.4 km long.');
  assert.equal(leadSentences('Short.'), 'Short.');
  assert.equal(leadSentences('x'.repeat(400) + '.'), null);
  const page = parsePage(VENUE);
  assert.ok(plain(VENUE).includes(page.summary));
});

test('anything a card would show that is not on the page is reported', () => {
  const text = plain(VENUE);
  assert.deepEqual(unsupported({ t: 'Rare Hare at Willow Creek', s: 'A relaxed lunch room with a wood fire and vineyard views.', ty: 'Restaurant', pn: 'Merricks North', f: [['Best for', 'Long lunches · Couples']] }, text), []);
  assert.deepEqual(unsupported({ t: 'Rare Hare at Willow Creek', s: 'Order the kingfish.', pn: 'Red Hill South', f: [['Best for', 'Dogs']] }, text), ['Order the kingfish.', 'Red Hill South', 'Dogs']);
});

function fixture(events, pages) {
  const dist = mkdtempSync(join(tmpdir(), 'ask-index-'));
  const records = [];
  const put = (path, title, markdown) => {
    mkdirSync(join(dist, path), { recursive: true });
    writeFileSync(join(dist, path, 'index.md'), markdown);
    records.push({ id: SITE + path, title, section: path.split('/')[1], canonicalUrl: SITE + path, markdownUrl: `${SITE}${path}index.md`, contentSha256: 'a'.repeat(64) });
  };
  put('/explore/places/balnarring/', 'Balnarring', HEAD('/explore/places/balnarring/') + '# Balnarring\n\nA Western Port village with a general store and a beach at the end of the road.\n');
  put('/explore/places/merricks-north/', 'Merricks North', HEAD('/explore/places/merricks-north/') + '# Merricks North\n\nVineyard country between Red Hill and Balnarring, with a hotel among the vines.\n');
  put('/eat/rare-hare/', 'Rare Hare at Willow Creek', VENUE);
  put('/wine/a/', 'A Winery', VENUE.replace('Rare Hare at Willow Creek', 'A Winery'));
  put('/stay/a/', 'A Stay', VENUE.replace('Rare Hare at Willow Creek', 'A Stay'));
  put('/explore/a/', 'A Walk', VENUE.replace('Rare Hare at Willow Creek', 'A Walk'));
  put('/dog-friendly/', 'Dogs on the Peninsula', HEAD('/dog-friendly/') + '# Dogs on the Peninsula\n\nWhat each venue has confirmed about dogs.\n');
  for (const [path, title, markdown] of pages) put(path, title, markdown);
  mkdirSync(join(dist, 'agents'), { recursive: true });
  mkdirSync(join(dist, 'whats-on'), { recursive: true });
  writeFileSync(join(dist, 'agents/catalog.json'), JSON.stringify({ schemaVersion: '2.0', snapshotId: 's', records }));
  writeFileSync(join(dist, 'whats-on/upcoming.json'), JSON.stringify({ generatedAt: '2026-11-20T03:00:00.000Z', events }));
  return dist;
}
const feedEvent = (slug, extra = {}) => ({
  url: `${SITE}/whats-on/${slug}/`, title: slug, startDate: '2026-11-21', endDate: '2026-11-21', dateMeaning: 'occurrence',
  weekendOccurrences: [{ date: '2026-11-21' }], eventStatus: 'https://schema.org/EventScheduled', place: null, ...extra,
});

test('the index holds published, upcoming pages only, with dates from the feed and words from the page', () => {
  const dist = fixture(
    [feedEvent('emu-plains-market'), feedEvent('gin-class', { dateMeaning: 'availability', endDate: '2027-02-18' })],
    [
      ['/whats-on/emu-plains-market/', 'Emu Plains Market', EVENT('Emu Plains Market', '21 November 2026')],
      ['/whats-on/gin-class/', 'Gin Class', EVENT('Gin Class', 'Choose a date on the organiser calendar')],
      ['/whats-on/last-year/', 'Last Year Fair', EVENT('Last Year Fair', '21 November 2025')],
    ],
  );
  try {
    const { index } = buildIndex(dist);
    const byPath = new Map(index.records.map((record) => [record.u, record]));
    assert.ok(!byPath.has('/whats-on/last-year/'), 'a What\'s On page missing from the forward feed is not answerable');
    assert.ok(!byPath.has('/dog-friendly/'));
    assert.deepEqual(index.topics, { dogs: { u: '/dog-friendly/', t: 'Dogs on the Peninsula' } });

    const market = byPath.get('/whats-on/emu-plains-market/');
    assert.deepEqual(market.d, { dated: true, s: '2026-11-21', e: '2026-11-21', w: ['2026-11-21'], st: 'scheduled' });
    assert.equal(market.p, 'balnarring', 'the town is the one in the page\'s Hosted at address');
    assert.equal(market.pn, 'Balnarring');
    assert.deepEqual(market.f, [['When', '21 November 2026'], ['Time', '09:00 to 14:00']]);
    assert.ok(!JSON.stringify(market).includes('pricing'), 'the Price row is never carried');
    assert.equal(byPath.get('/whats-on/gin-class/').d.dated, false, 'a book-a-session window is never a dated occurrence');

    const venue = byPath.get('/eat/rare-hare/');
    assert.equal(venue.p, 'merricks-north');
    assert.match(venue.kw, /\bwood\b/);
    assert.ok(!/\bhotel\b/.test(venue.kw), 'a neighbouring venue\'s words are not this page\'s words');
    assert.deepEqual(index.places.map((item) => item.slug), ['balnarring', 'merricks-north']);
    assert.equal(index.count, index.records.length);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('a cancellation the page does not state stops the build instead of reaching a reader', () => {
  const cancelled = { eventStatus: 'https://schema.org/EventCancelled' };
  const silent = fixture([feedEvent('emu-plains-market', cancelled)], [['/whats-on/emu-plains-market/', 'Emu Plains Market', EVENT('Emu Plains Market', '21 November 2026')]]);
  const stated = fixture([feedEvent('emu-plains-market', cancelled)], [['/whats-on/emu-plains-market/', 'Emu Plains Market', EVENT('Emu Plains Market', '21 November 2026').replace('A makers market', 'Cancelled by the organiser. A makers market')]]);
  try {
    assert.throws(() => buildIndex(silent), /feed status "cancelled" is not stated on the published page/);
    assert.equal(buildIndex(stated).index.records.find((record) => record.k === 'event').d.st, 'cancelled');
  } finally {
    rmSync(silent, { recursive: true, force: true });
    rmSync(stated, { recursive: true, force: true });
  }
});
