import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { transform } from '@astrojs/compiler';
import { isPublicEventRecord } from '../src/lib/event-publication.mjs';
import { cleanCaption } from '../src/lib/image-caption.mjs';
const source = await readFile(new URL('../src/pages/whats-on/[slug].astro', import.meta.url), 'utf8');

test('event host coverage resolves canonical references and omits unavailable venues', async () => {
  const editorial = await readFile(new URL('../src/lib/editorial.ts', import.meta.url), 'utf8');
  const predicates = editorial.slice(editorial.indexOf('export function isPermanentlyClosed'), editorial.indexOf('export const stayTypes'));
  const listable = new Function(`${stripTypeScriptTypes(predicates).replaceAll('export ', '')}; return isListableVenue;`)();
  const block = source.slice(source.indexOf('const hostVenueEntries ='), source.indexOf('const now ='));
  const actual = new Function('originalEvent', 'getEntry', 'isListableVenue', 'venueHref', `return (async () => {${stripTypeScriptTypes(block)}; return hostVenueLinks;})();`);
  const records = [undefined, {data:{name:'Paused',status:'paused'}}, {data:{name:'Closed',operatingStatus:'permanently-closed'}}, {data:{name:'Canonical',slug:'canonical'}}];
  const resolve = async ref => records[ref.id];
  assert.deepEqual(await actual({data:{}}, resolve, listable, v => `/wine/${v.data.slug}/`), []);
  assert.deepEqual(await actual({data:{hostVenues:records.map((_,id)=>({id}))}}, resolve, listable, v => `/wine/${v.data.slug}/`), [{label:'Canonical',href:'/wine/canonical/'}]);
});
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
  const block = home.slice(home.indexOf('    let image ='), home.indexOf('    const dateISO ='));
  const fn = new Function('contextPhotos', 'slug', 'hero', 'recorded', 'status', 'cleanCaption', 'alba', `${stripTypeScriptTypes(block)}; return image;`);
  const alba = JSON.parse(await readFile(new URL('../src/content/venues/alba-thermal-springs.json', import.meta.url), 'utf8'));
  const actual = (...args) => fn(...args, cleanCaption, alba);
  const hero = { hasPhoto: true, src: '/event.webp' };
  const photo = { alt: 'Verified subject', credit: 'Photographer' };
  const fallback = actual({}, 'event', hero, photo, 'actual');
  assert.equal(fallback.src, '/images/generated/coastal-punch-plate.svg');
  // Caption rule (lib/image-caption.mjs): artwork prints nothing beneath it.
  assert.equal(fallback.caption, '');
  assert.equal(fallback.credit, '');
  assert.equal(actual({}, 'event', hero, { ...photo, rightsStatus: 'recorded' }, 'actual').src, '/event.webp');
  assert.equal(actual({}, 'event', hero, { ...photo, rightsStatus: 'recorded' }, 'unverified').src, fallback.src);
  const retreat = 'the-peninsula-retreat-at-alba-thermal-springs-and-spa-2026-11-15';
  const recorded = {...photo,rightsStatus:'recorded',src:'/images/generated/events/thermal-pool.webp'};
  assert.equal(actual({}, retreat, hero, recorded, 'illustrative').src, alba.gallery[0].src);
  assert.equal(actual({}, retreat, hero, {...recorded,src:'/images/editor-choice.webp'}, 'actual').src, hero.src);
  assert.equal(fn({},retreat,hero,recorded,'illustrative',cleanCaption,{gallery:[{...alba.gallery[0],rightsStatus:'unknown'}]}).src,hero.src);
  assert.equal(actual({event:{src:'/context.webp'}}, 'event', hero, {...photo,rightsStatus:'recorded'}, 'actual').src, '/event.webp');
});
test('event discovery shelf photography requires recorded rights and actual depiction', async () => {
  const hub = await readFile(new URL('../src/pages/whats-on/index.astro', import.meta.url), 'utf8');
  // 2026-11-10: the category shelves (and their photography) were removed from the hub in the
  // simplification programme. The rule still binds any shelf that comes back.
  if (!hub.includes('  const source = shelf.items.find')) {
    assert.doesNotMatch(hub, /shelf\.items/, 'shelf photography reintroduced without the rights check');
    return;
  }
  const block = hub.slice(hub.indexOf('  const source = shelf.items.find'), hub.indexOf('  const photo = source ?'));
  const actual = new Function('shelf', `${stripTypeScriptTypes(block)}; return source;`);
  const item = rightsStatus => ({ event: { data: { heroImage: { src: '/event.webp', alt: 'Subject', credit: 'Photographer', depictionStatus: 'actual', rightsStatus } } } });
  assert.equal(actual({ items: [item(undefined)] }), undefined);
  const approved = item('recorded');
  assert.equal(actual({ items: [item(undefined), approved] }), approved);
});
