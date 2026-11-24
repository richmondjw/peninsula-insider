import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const bundle = async (path) => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(path, import.meta.url))],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
};
const [facets, schema, onannon, detail, hub, map, config, shortlist] = await Promise.all([
  bundle('../src/lib/facets.ts'),
  bundle('../src/lib/schema.ts'),
  read('../src/content/venues/onannon.json').then(JSON.parse),
  read('../src/components/VenueDetailTemplate.astro'),
  read('../src/pages/wine/index.astro'),
  read('../src/pages/map.astro'),
  read('../src/content.config.ts'),
  read('../src/data/cellar-door-shortlist.json').then(JSON.parse),
]);
const stale = {
  ...onannon,
  coordinates: { lat: -38.2912, lng: 145.1154 },
  visiting: { publicVisitStatus: 'unconfirmed', bookingRequired: true, openingHours: [{ days: ['Saturday'], opens: '10:00', closes: '16:00' }] },
  tags: { mood: ['cellar-door'] },
  editorNote: 'A small winery with appointment tastings.',
};
const existing = { ...stale, visiting: { ...stale.visiting, publicVisitStatus: undefined } };

test('unconfirmed record remains a producer listing without appointment or map destination', () => {
  assert.equal(onannon.website, 'https://www.onannon.com.au');
  assert.equal(onannon.place, 'tuerong');
  assert.equal(onannon.type, 'winery');
  assert.equal(onannon.visiting.publicVisitStatus, 'unconfirmed');
  assert.ok(!('coordinates' in onannon));
  assert.ok(!('bookingUrl' in onannon));
  assert.ok(!('bookingProvider' in onannon));
  assert.ok(!('bookingRequired' in onannon.visiting));
  assert.match(map, /filter\(\(v\) => v\.data\.coordinates && Number\.isFinite\(v\.data\.coordinates\.lat\)\)/);
  assert.ok(!shortlist.selections.find(({ slug }) => slug === 'onannon'));
  assert.match(config, /publicVisitStatus: z.literal\('unconfirmed'\).optional\(\)/);
});

test('wine category and place remain searchable; unconfirmed discovery does not imply a tasting', () => {
  const cautious = facets.getFacets('venue', stale);
  const normal = facets.getFacets('venue', existing);
  assert.deepEqual(cautious.cat, normal.cat);
  assert.deepEqual(cautious.place, normal.place);
  assert.ok(normal.mood.includes('tasting-first'));
  assert.ok(!cautious.mood?.includes('tasting-first'));
  assert.ok(!cautious.mood?.includes('small-quiet'));
});

test('unconfirmed Winery JSON-LD retains the entity, not its stale visit data', () => {
  const cautious = schema.buildWinerySchema(stale, 'onannon');
  const normal = schema.buildWinerySchema(existing, 'onannon');
  assert.equal(cautious['@id'], normal['@id']);
  assert.deepEqual(cautious.sameAs, normal.sameAs);
  for (const k of ['address', 'geo', 'openingHoursSpecification']) {
    assert.ok(k in normal, k);
    assert.ok(!(k in cautious), k);
  }
});

test('detail guards directions, Google hours, booking and empty Visiting; Wine card reads Check ahead', () => {
  assert.match(detail, /const hasVisiting = [^\n]*!isPublicVisitUnconfirmed/);
  assert.match(detail, /const isAppointmentOnly = [^\n]*!isPublicVisitUnconfirmed/);
  assert.match(detail, /!isNonPublicProducer && !isPublicVisitUnconfirmed && <><dt>Directions/);
  assert.match(detail, /data\.address && !isPaused && !isNonPublicProducer && !isPublicVisitUnconfirmed/);
  assert.match(detail, /data\.bookingUrl && !isPublicVisitUnconfirmed && !isClosed && !isPaused/);
  assert.match(detail, /!isPublicVisitUnconfirmed && venueSlug !== 'cassis'/);
  assert.match(hub, /publicVisitStatus === 'unconfirmed'\) return 'Check ahead'/);
});
