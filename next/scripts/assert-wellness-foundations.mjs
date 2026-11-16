import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Validate rendered output or the same contract against the public deployment.
const live = process.argv.includes('--live');
const origin = 'https://peninsulainsider.com.au';
async function html(route) {
  if (!live) return readFile(path.join(process.cwd(), 'dist', route, 'index.html'), 'utf8');
  const response = await fetch(`${origin}/${route}/`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, route);
  return response.text();
}
const jsonLd = text => [...text.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const hub = await html('explore/spas-and-wellness');
const list = jsonLd(hub).find(item => item['@type'] === 'ItemList');
assert.ok(list, 'Wellness hub must contain an ItemList');
assert.ok(hub.includes('id="alba-thermal-springs"'), 'Alba redirect destination must exist');
const alba = hub.match(/<article\b[^>]*id="alba-thermal-springs"[^>]*>([\s\S]*?)<\/article>/)?.[1];
assert.ok(alba?.includes('<img'), 'Alba section must include its venue image');
assert.ok(alba.includes('data-pi-kind="venue"') && alba.includes('data-pi-slug="alba-thermal-springs"'));
assert.ok(alba.includes('data-pi-href="/explore/spas-and-wellness/#alba-thermal-springs"'), 'Save metadata must resolve to the real Alba section');
assert.equal(list.numberOfItems, list.itemListElement.length);
assert.ok(list.itemListElement.length >= 5);
for (const { item } of list.itemListElement) {
  const url = new URL(item.url);
  assert.equal(url.pathname, '/explore/spas-and-wellness/');
  assert.ok(url.hash && hub.includes(`id="${url.hash.slice(1)}"`), `Schema fragment must exist: ${item.url}`);
  assert.equal(item['@type'], 'DaySpa');
  assert.equal(item['@id'], item.url, 'Section identity must not append a second fragment');
}
const stays = await html('stay/wellness-retreats');
const data = jsonLd(stays);
const stayList = data.find(item => item['@type'] === 'CollectionPage')?.mainEntity;
assert.equal(stayList?.numberOfItems, 6);
assert.equal(new Set(stayList.itemListElement.map(item => item.url)).size, 6);
for (const item of stayList.itemListElement) {
  const url = new URL(item.url);
  assert.ok(url.pathname.startsWith('/stay/') && !url.hash, 'Stay must link to accommodation, not a spa fragment');
  assert.ok(stays.includes(`href="${url.pathname}"`), `Visible stay card must link to ${url.pathname}`);
  const target = await html(url.pathname.replace(/^\/|\/$/g, ''));
  assert.ok(!/http-equiv="refresh"/.test(target), `Stay destination must be content: ${url.pathname}`);
}
for (const retired of ['1 wellness properties', 'Alba Thermal Springs at Red Hill', 'weekend shuttle from Frankston', 'only car-free wellness stay']) assert.ok(!stays.includes(retired), `Retired claim: ${retired}`);
const faq = data.find(item => item['@type'] === 'FAQPage');
const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
const text = stays.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
  .replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (_, entity) => entity[0] === '#'
    ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)))
    : entities[entity.toLowerCase()])
  .replace(/\s+/g, ' ');
for (const question of faq.mainEntity) {
  assert.ok(text.includes(question.name), `FAQ question must be visible: ${question.name}`);
  assert.ok(text.includes(question.acceptedAnswer.text), 'FAQ answer must match visible content');
}
console.log(`Wellness foundation assertions passed (${live ? 'production' : 'built output'}): ${list.numberOfItems} spa entries, 6 distinct accommodation destinations, FAQ parity.`);

if (process.argv.includes('--redirects')) {
  const csv = await readFile(new URL('../../ops/wellness-redirects.csv', import.meta.url), 'utf8');
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [from, to] = line.split(',');
    const source = new URL(from); source.searchParams.set('utm_source', 'wellness-verification');
    const expected = new URL(to); expected.search = source.search;
    const response = await fetch(source, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 301, `Edge redirect not deployed: ${from}`);
    assert.equal(new URL(response.headers.get('location'), from).href, expected.href);
    const target = await fetch(expected, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert.equal(target.status, 200, `Redirect must reach content in one hop: ${to}`);
  }
  console.log('All five HTTP 301 redirects and query-string preservation passed.');
}
