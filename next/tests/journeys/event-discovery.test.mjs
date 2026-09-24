import test from 'node:test';
import assert from 'node:assert/strict';
import { Site, DIST } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const site = await Site.open();
test.after(() => site.close());
const clickScope = (reader, scope) => reader.page.evaluate((value) => document.querySelector(`[data-wo-scope-btn][data-scope="${value}"]`).click(), scope);
const nextReady = (reader) => reader.waitFor(() => document.querySelector('[data-wo-heading]')?.textContent === "What's on next weekend" && document.querySelector('[data-wo-days]')?.querySelector('.wo-day'), 'next-weekend dates did not load');
const snapshot = (reader) => reader.page.evaluate(() => ({
  heading: document.querySelector('[data-wo-heading]')?.textContent,
  range: document.querySelector('[data-wo-range]')?.textContent,
  picks: document.querySelector('.wo-picks')?.textContent ?? null,
  schema: document.querySelector('[data-wo-event-schema]')?.textContent ?? null,
  days: document.querySelector('[data-wo-days]')?.textContent,
  param: new URL(location.href).searchParams.get('date'),
}));

test('next-weekend query reload and history preserve the selected dates and remove default picks/schema', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    const initial = await snapshot(reader);
    assert.ok(initial.schema);
    await clickScope(reader, 'next-weekend');
    await nextReady(reader);
    const next = await snapshot(reader);
    assert.equal(next.picks, null);
    assert.equal(next.schema, null);
    assert.notEqual(next.range, initial.range);
    assert.equal(next.param, 'next-weekend');
    await reader.page.evaluate(() => history.back());
    await reader.waitFor(() => document.querySelector('[data-wo-event-schema]') && !new URL(location.href).searchParams.has('date'), 'back failed to restore default schema');
    const restored = await snapshot(reader);
    assert.equal(restored.range, initial.range);
    assert.equal(restored.picks, initial.picks);
    assert.equal(restored.schema, initial.schema);
    await reader.page.evaluate(() => history.forward());
    await nextReady(reader);
    assert.equal((await snapshot(reader)).schema, null);
    await reader.load('/whats-on/?date=next-weekend');
    await nextReady(reader);
    const reloaded = await snapshot(reader);
    assert.equal(reloaded.range, next.range);
    assert.equal(reloaded.days, next.days);
    assert.equal(reloaded.picks, null);
    assert.equal(reloaded.schema, null);
    await clickScope(reader, 'weekend');
    assert.equal((await snapshot(reader)).schema, initial.schema);
  } finally { await reader.close(); }
});

test('a delayed alternative-date response cannot overwrite a return to this weekend', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    const initial = await snapshot(reader);
    await reader.page.evaluate(() => {
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        if (String(input).includes('/whats-on/feed.json')) return new Promise((resolve, reject) => {
          window.releaseEventFeed = () => nativeFetch(input, init).then(resolve, reject);
        });
        return nativeFetch(input, init);
      };
    });
    await clickScope(reader, 'next-weekend');
    await clickScope(reader, 'weekend');
    await reader.page.evaluate(async () => { await window.releaseEventFeed(); });
    await reader.waitFor(() => document.querySelector('[data-wo-event-schema]'), 'default state not restored after delayed response');
    const after = await snapshot(reader);
    assert.equal(after.heading, initial.heading);
    assert.equal(after.days, initial.days);
    assert.equal(after.schema, initial.schema);
  } finally { await reader.close(); }
});

test('feed failure restores this-weekend heading, URL, picks, schema and rows together', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    const initial = await snapshot(reader);
    await reader.page.evaluate(() => {
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes('/whats-on/feed.json') ? Promise.reject(new Error('test failure')) : nativeFetch(input, init);
    });
    await clickScope(reader, 'next-weekend');
    await reader.waitFor(() => document.querySelector('#pi-results-status')?.textContent.includes('Could not load'), 'failure was not announced');
    const after = await snapshot(reader);
    for (const key of ['heading', 'range', 'picks', 'schema', 'days', 'param']) assert.equal(after[key], initial[key], key);
  } finally { await reader.close(); }
});

test('built default Event ItemList and AI feed agree on weekend event identities', () => {
  const html = readFileSync(join(DIST, 'whats-on/index.html'), 'utf8');
  const match = html.match(/<script\b[^>]*data-wo-event-schema[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(match, 'default event schema is present');
  const schema = JSON.parse(match[1]);
  const feed = JSON.parse(readFileSync(join(DIST, 'whats-on/upcoming.json'), 'utf8'));
  // Upcoming feed deliberately excludes ended one-off records. Restrict the
  // comparison to its published live destinations, including recurring series.
  const feedUrls = new Set(feed.events.map(e => e.url));
  const pageUrls = schema.itemListElement.map(x => x.item.url).filter(url => feedUrls.has(url)).sort();
  const weekendUrls = feed.events.filter(e => e.thisWeekend).map(e => e.url).sort();
  assert.deepEqual(pageUrls, weekendUrls);
  for (const event of feed.events) assert.equal(event.thisWeekend, event.weekendOccurrences.length > 0);
});

test('date controls still work after leaving and returning through client navigation', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    await reader.navigate('/wine/');
    await reader.navigate('/whats-on/');
    await clickScope(reader, 'next-weekend');
    await nextReady(reader);
    assert.equal((await snapshot(reader)).schema, null);
    await clickScope(reader, 'weekend');
    assert.ok((await snapshot(reader)).schema);
  } finally { await reader.close(); }
});


test('a selected weekend preserves the actual closing date and running state of an ongoing exhibition', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    const expected = await reader.page.evaluate(() => {
      const end = new Date(); end.setUTCDate(end.getUTCDate() + 90);
      const start = new Date(); start.setUTCDate(start.getUTCDate() - 30);
      const iso = d => d.toISOString().slice(0,10);
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes('/whats-on/feed.json')
        ? Promise.resolve(new Response(JSON.stringify({events:[{
          slug:'ongoing-exhibition-fixture',href:'/whats-on/ongoing-exhibition-fixture/',
          t:'Ongoing exhibition fixture',d:'An exhibition with a published closing date.',m:['Gallery'],
          k:'range',s:iso(start),e:iso(end),statusData:{startTime:'11:00',endTime:'16:00'},
        }]}), {status:200,headers:{'Content-Type':'application/json'}}))
        : nativeFetch(input,init);
      return end.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
    });
    await clickScope(reader,'next-weekend');
    await nextReady(reader);
    const row = await reader.page.$eval('[data-wo-days] .wo-row', e => ({
      meta:e.querySelector('.wo-row__meta').textContent,phase:e.dataset.occurrencePhase,
    }));
    assert.ok(row.meta.includes(expected), row.meta);
    assert.match(row.meta,/On during your dates/);
    assert.doesNotMatch(row.meta,/Ended/);
    assert.equal(row.phase,'running');
  } finally { await reader.close(); }
});
