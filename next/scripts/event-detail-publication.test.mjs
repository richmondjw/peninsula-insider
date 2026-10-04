import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
