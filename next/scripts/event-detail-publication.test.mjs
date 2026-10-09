import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { transform } from '@astrojs/compiler';
import { isPublicEventRecord } from '../src/lib/event-publication.mjs';
const source = await readFile(new URL('../src/pages/whats-on/[slug].astro', import.meta.url), 'utf8');
test('actual detail route generates approved/public URLs and refuses draft records', async () => {
  const body = source.match(/export async function getStaticPaths\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(body, 'Actual route function must be present');
  const records = ['published', 'draft', 'review', 'scheduled', 'expired', 'past', 'archived'].map(status => ({ data: { slug: status, status } }));
  records.push({ data: { slug: 'unapproved-import', status: 'published', intelligence: {} } });
  const getCollection = async (name, predicate) => {
    assert.equal(name, 'events');
    return predicate ? records.filter(predicate) : records;
  };
  records.push({data:{slug:'published-archive',status:'archived',publishedAt:'2026-04-09'}});
  const actual = new Function('getCollection', 'routeSlug', 'isPublicEventRecord', `return (async () => {${body}})();`);
  const paths = await actual(getCollection, event => event.data.slug, isPublicEventRecord);
  assert.deepEqual(paths.map(entry => entry.params.slug), ['published', 'expired', 'past', 'published-archive']);
});
test('actual detail template compiles with Astro, including price expiry script', async () => {
  const compiled = await transform(source, { filename: 'src/pages/whats-on/[slug].astro' });
  assert.deepEqual(compiled.diagnostics.filter(item => item.severity === 1), []);
  assert.ok(compiled.code.length > 0);
  assert.ok(compiled.scripts.some(script => script.code.includes('refreshVerifiedPriceElements')));
});

test('actual detail hides cancelled-edition invitation lenses without changing other records', () => {
  const block = source.slice(source.indexOf('const lensSeen ='), source.indexOf('const slug ='));
  const actual = new Function('event', 'cancelled', 'eventLensLabel', `${stripTypeScriptTypes(block)}; return lensList;`);
  const lens = ['free', 'walk-in', 'weekend-pick', 'family-saturday', 'market'];
  assert.deepEqual(actual({ data: { lens } }, true, {}).map(item => item.key), ['market']);
  assert.deepEqual(actual({ data: { lens } }, false, {}).map(item => item.key), lens);
});
test('actual detail labels only the cancelled edition and preserves noncancelled recurrence', () => {
  const expression = source.match(/const recurrenceLabel = ([^;]+);/)?.[1];
  assert.ok(expression);
  const actual = new Function('cancelled', 'unconfirmedArchivedSchedule', 'flexibleDate', 'flexibleRecurrenceLabel', 'dateBasis', 'eventRecurrenceLabel', 'event', `return ${expression};`);
  const run = cancelled => actual(cancelled, false, false, {}, 'fixed', () => 'Recurs monthly', { data: {} });
  assert.equal(run(true), 'Cancelled edition. Check the organiser for future dates.');
  assert.equal(run(false), 'Recurs monthly');
});

test('homepage event photography requires a recorded rights receipt', async () => {
  const home = await readFile(new URL('../src/components/v5/home/HomeWeekend.astro', import.meta.url), 'utf8');
  const block = home.slice(home.indexOf('    const image ='), home.indexOf('    const dateISO ='));
  const actual = new Function('contextPhotos', 'slug', 'hero', 'recorded', 'status', `${stripTypeScriptTypes(block)}; return image;`);
  const hero = { hasPhoto: true, src: '/event.webp' };
  const photo = { alt: 'Verified subject', credit: 'Photographer' };
  const fallback = actual({}, 'event', hero, photo, 'actual');
  assert.equal(fallback.src, '/images/generated/coastal-punch-plate.svg');
  assert.match(fallback.caption, /not a depiction of this event/);
  assert.equal(fallback.credit, 'Illustration: Peninsula Insider');
  assert.equal(actual({}, 'event', hero, { ...photo, rightsStatus: 'recorded' }, 'actual').src, '/event.webp');
  assert.equal(actual({}, 'event', hero, { ...photo, rightsStatus: 'recorded' }, 'unverified').src, fallback.src);
  assert.equal(actual({event:{src:'/context.webp'}}, 'event', hero, {...photo,rightsStatus:'recorded'}, 'actual').src, '/event.webp');
});
test('event discovery shelf photography requires recorded rights and actual depiction', async () => {
  const hub = await readFile(new URL('../src/pages/whats-on/index.astro', import.meta.url), 'utf8');
  const block = hub.slice(hub.indexOf('  const source = shelf.items.find'), hub.indexOf('  const photo = source ?'));
  const actual = new Function('shelf', `${stripTypeScriptTypes(block)}; return source;`);
  const item = rightsStatus => ({ event: { data: { heroImage: { src: '/event.webp', alt: 'Subject', credit: 'Photographer', depictionStatus: 'actual', rightsStatus } } } });
  assert.equal(actual({ items: [item(undefined)] }), undefined);
  const approved = item('recorded');
  assert.equal(actual({ items: [item(undefined), approved] }), approved);
});
