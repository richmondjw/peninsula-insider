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

test('first phone screen offers a dated event link with the cookie note visible', async (t) => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({ width: 390, height: 844 });
    await reader.load('/whats-on/');
    const lead = await reader.page.evaluate(() => {
      const title = document.querySelector('.wo-picks .pi-card:first-of-type .pi-card__link');
      const whenWhere = document.querySelector('.wo-picks .pi-card:first-of-type .pi-card__eyebrow');
      return {
        hasCookieNote: document.body.textContent.includes('A note on cookies'),
        title: title?.textContent?.trim(),
        href: title?.getAttribute('href'),
        titleBottom: title?.getBoundingClientRect().bottom,
        whenWhere: whenWhere?.textContent?.trim(),
        whenWhereBottom: whenWhere?.getBoundingClientRect().bottom,
      };
    });
    if (!lead.title) { t.skip('No current weekend pick is eligible'); return; }
    assert.ok(lead.hasCookieNote, 'measure the first-visit consent state');
    assert.match(lead.href, /^\/whats-on\/[^/]+\/$/);
    assert.match(lead.whenWhere, /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b.* · .+/);
    assert.ok(lead.whenWhereBottom <= 844, 'event date and place belong in the first screen');
    assert.ok(lead.titleBottom <= 844, 'linked event title belongs in the first screen');
  } finally { await reader.close(); }
});

test('featured picks keep keyboard focus visible after date changes and client navigation', async (t) => {
  for (const width of [320, 768]) {
    const reader = await site.reader();
    try {
      await reader.page.setViewport({ width, height: 900 });
      await reader.load('/whats-on/');
      const count = await reader.page.$$eval('.wo-picks .pi-card', cards => cards.length);
      if (count < 2) { t.skip('This edition has fewer than two featured picks'); return; }
      for (const state of ['initial', 'restored dates', 'client return']) {
        if (state === 'restored dates') {
          await clickScope(reader, 'next-weekend');
          await nextReady(reader);
          await clickScope(reader, 'weekend');
        } else if (state === 'client return') {
          await reader.navigate('/wine/');
          await reader.navigate('/whats-on/');
        }
        await reader.page.focus('.wo-picks .pi-card__link');
        const visited = new Set();
        for (let step = 0; step < 30; step++) {
          const focused = await reader.page.evaluate(() => {
            const rail = document.querySelector('.wo-picks .v5-card-grid');
            const active = document.activeElement;
            const card = active?.closest('.pi-card');
            if (!rail?.contains(card)) return null;
            const box = active.getBoundingClientRect();
            const bounds = rail.getBoundingClientRect();
            return {
              index: [...rail.querySelectorAll('.pi-card')].indexOf(card),
              label: active.getAttribute('aria-label') || active.textContent.trim(),
              width: box.width,
              visible: Math.max(0, Math.min(box.right, bounds.right) - Math.max(box.left, bounds.left)),
            };
          });
          if (!focused) break;
          visited.add(focused.index);
          assert.ok(focused.visible >= focused.width - 2, `${width}px ${state}: focused ${focused.label} is clipped`);
          await reader.page.keyboard.press('Tab');
        }
        assert.equal(visited.size, count, `${width}px ${state}: every pick is keyboard reachable`);
      }
    } finally { await reader.close(); }
  }
});

test('public event media keeps its reviewed image and attribution when CMS slots change', async () => {
  const reader = await site.reader();
  const mediaSnapshot = () => reader.page.evaluate(() => [...document.querySelectorAll('[data-pi-entity-type="event"][data-pi-field-path]')].map(el => ({
    slug: el.dataset.piEntitySlug,
    field: el.dataset.piFieldPath,
    src: el.getAttribute('src'),
    background: el.style.backgroundImage,
    alt: el.getAttribute('alt'),
    note: el.closest('.pi-card, .event-card, figure')?.querySelector('.pi-card__image-note, figcaption, .event-image-credit')?.textContent ?? '',
  })));
  try {
    let observed = 0;
    for (const route of ['/', '/whats-on/', '/whats-on/mornington-racecourse-market/', '/whats-on/by-mood/this-weekend/']) {
      reader.setSupabase([]);
      await reader.load(route);
      await reader.page.waitForNetworkIdle({ idleTime: 100 });
      const baseline = await mediaSnapshot();
      observed += baseline.length;
      if (!baseline.length) continue;
      for (const metadata of [{ alt_text: null, credit: null }, { alt_text: 'A different uploaded subject', credit: 'Different uploader' }]) {
        const slots = baseline.map(item => ({
          entity_type: 'event', entity_slug: item.slug, field_path: item.field,
          public_url: '/__unreviewed-event-upload.svg', ...metadata,
        }));
        reader.setSupabase([{ match: '/rest/v1/cms_image_slots', body: slots }]);
        await reader.load(route);
        await reader.page.waitForNetworkIdle({ idleTime: 100 });
        assert.deepEqual(await mediaSnapshot(), baseline, `${route}: uploaded event media must not replace the reviewed image or attribution`);
      }
    }
    assert.ok(observed > 0, 'event media slots were exercised');
  } finally { await reader.close(); }
});

test('custom dates return keyboard focus to a visible trigger and date scopes keep suitable copy', async () => {
  const reader = await site.reader();
  try {
    for (const width of [390, 1440]) {
      await reader.page.setViewport({ width, height: 900 });
      await reader.load('/whats-on/');
      await reader.page.evaluate(() => {
        const details = document.querySelector('[data-wo-custom]');
        details.open = true;
        const form = details.querySelector('form');
        for (const name of ['from', 'to']) {
          const input = form.elements.namedItem(name);
          input.value = input.min;
        }
        form.querySelector('button[type="submit"]').focus();
      });
      await reader.page.keyboard.press('Enter');
      const focus = await reader.page.evaluate(() => ({
        open: document.querySelector('[data-wo-custom]').open,
        summary: document.activeElement.matches('[data-wo-custom-summary]'),
      }));
      assert.deepEqual(focus, { open: false, summary: true }, `${width}px date submission keeps visible focus`);
      await clickScope(reader, 'today');
      await reader.waitFor(() => document.querySelector('[data-wo-heading]')?.textContent === "What's on today", 'today scope did not apply');
      const copy = await reader.page.$eval('.wo-head__rule', el => el.textContent);
      assert.ok(!/better weekend/i.test(copy), 'Today must not retain a weekend-only promise');
    }
  } finally { await reader.close(); }
});

test('a featured market without editorial notes still exposes its official confirmation source', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/crib-point-community-market/');
    const links = await reader.page.$$eval('main a[href]', nodes => nodes.map(el => ({ href: el.href, label: el.textContent.trim() })));
    const record = JSON.parse(readFileSync(new URL('../../src/content/events/crib-point-community-market.json', import.meta.url), 'utf8'));
    assert.ok(links.some(link => link.href === record.primarySourceUrl && /latest details at the source/.test(link.label)), 'source remains visible without editorial notes');
    const primary=links.find(link=>/Check latest details/.test(link.label));
    if(primary) assert.equal(primary.href,record.officialEventUrl,'current market primary action uses the official source');
  } finally { await reader.close(); }
});

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
  const weekendUrls = feed.events.filter(e => e.thisWeekend && e.contentKind === 'event').map(e => e.url).sort();
  assert.deepEqual(pageUrls, weekendUrls);
  for (const event of feed.events) { assert.equal(event.thisWeekend, event.weekendOccurrences.length > 0); assert.ok(['event','experience','offer'].includes(event.contentKind)); if(event.contentKind !== 'event') { assert.equal(event.eventStatus, undefined); assert.notEqual(event.dateMeaning, 'occurrence'); } }
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

test('a feed failure with active filters recovers to the unfiltered weekend', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    await reader.page.evaluate(() => {
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes('/whats-on/feed.json') ? Promise.reject(new Error('test failure')) : nativeFetch(input, init);
      const form = document.querySelector('[data-wo-filters]');
      form.elements.namedItem('q').value = 'market';
      form.elements.namedItem('q').dispatchEvent(new Event('input', { bubbles: true }));
    });
    await reader.waitFor(() => document.querySelector('#pi-results-status')?.textContent.includes('Could not load'), 'filtered feed failure was not announced');
    const state = await reader.page.evaluate(() => ({
      heading: document.querySelector('[data-wo-heading]')?.textContent,
      query: location.search,
      filter: document.querySelector('[data-wo-filters]').elements.namedItem('q').value,
      schema: Boolean(document.querySelector('[data-wo-event-schema]')),
    }));
    assert.deepEqual(state, { heading: "What's on this weekend", query: '', filter: '', schema: true });
  } finally { await reader.close(); }
});

test('today and discovery filters can be combined, shared, cleared and revisited', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    await reader.page.evaluate(() => {
      const nativeFetch = window.fetch.bind(window);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const verifiedFreePrice = {label:'Free',sourceUrl:'https://example.com/synthetic-family-market',checkedAt:new Date(Date.now()-60000).toISOString(),validUntil:new Date(Date.now()+3600000).toISOString()};
      const expiredFreePrice = {...verifiedFreePrice,checkedAt:new Date(Date.now()-7200000).toISOString(),validUntil:new Date(Date.now()-3600000).toISOString()};
      const events = [
        { slug: 'free-family-market', href: '/whats-on/free-family-market/', t: 'Family market fixture', d: 'Local makers', m: ['Mornington'], c: 'market', p: 'Mornington', f: true, fp: verifiedFreePrice, g: true, k: 'range', s: today, e: today },
        { slug: 'unverified-family-market', href: '/whats-on/unverified-family-market/', t: 'Unverified family market fixture', d: 'Same town and family, without verified price', m: ['Mornington'], c: 'market', p: 'Mornington', f: true, g: true, k: 'range', s: today, e: today },
        { slug: 'expired-free-family-market', href: '/whats-on/expired-free-family-market/', t: 'Expired free family market fixture', d: 'Same town and family, expired verified price', m: ['Mornington'], c: 'market', p: 'Mornington', f: true, fp: expiredFreePrice, g: true, k: 'range', s: today, e: today },
        { slug: 'paid-adult-market', href: '/whats-on/paid-adult-market/', t: 'Adult market fixture', d: 'Local makers', m: ['Mornington'], c: 'market', p: 'Mornington', f: false, g: false, k: 'range', s: today, e: today },
      ];
      window.fetch = (input, init) => String(input).includes('/whats-on/feed.json')
        ? Promise.resolve(new Response(JSON.stringify({ events }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        : nativeFetch(input, init);
    });
    await clickScope(reader, 'today');
    await reader.waitFor(() => document.querySelector('[data-wo-heading]')?.textContent === "What's on today" && document.querySelector('[data-wo-days]')?.textContent.includes('Family market fixture'), 'today did not load');
    await reader.page.evaluate(() => {
      const form = document.querySelector('[data-wo-filters]');
      form.elements.namedItem('town').value = 'Mornington';
      form.elements.namedItem('town').dispatchEvent(new Event('change', { bubbles: true }));
      for (const name of ['free', 'kids']) {
        form.elements.namedItem(name).checked = true;
        form.elements.namedItem(name).dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await reader.waitFor(() => document.querySelector('[data-wo-days]')?.textContent.includes('Family market fixture') && !document.querySelector('[data-wo-days]')?.textContent.includes('Adult market fixture') && !document.querySelector('[data-wo-days]')?.textContent.includes('Unverified family market fixture') && !document.querySelector('[data-wo-days]')?.textContent.includes('Expired free family market fixture'), 'combined filters did not isolate the event');
    const filtered = await reader.page.evaluate(() => ({
      url: location.search,
      text: document.querySelector('[data-wo-days]').textContent,
      schema: document.querySelector('[data-wo-event-schema]'),
    }));
    assert.match(filtered.url, /date=today/);
    assert.match(filtered.url, /town=Mornington/);
    assert.match(filtered.url, /free=1/);
    assert.match(filtered.url, /kids=1/);
    assert.equal(filtered.schema, null);
    assert.doesNotMatch(filtered.text, /Unverified family market fixture|Expired free family market fixture/);
    await reader.page.evaluate(() => {
      const form = document.querySelector('[data-wo-filters]');
      form.elements.namedItem('q').value = 'no-such-event';
      form.elements.namedItem('q').dispatchEvent(new Event('input', { bubbles: true }));
    });
    await reader.waitFor(() => document.querySelector('[data-wo-days]')?.textContent.includes('No matching events'), 'empty filtered state did not appear');
    await reader.page.evaluate(() => document.querySelector('[data-wo-filter-reset]').click());
    await reader.waitFor(() => document.querySelector('[data-wo-days]')?.textContent.includes('Adult market fixture'), 'reset did not restore the wider date results');
    assert.equal(new URL((await reader.page.url())).searchParams.get('date'), 'today');
    await clickScope(reader, 'tomorrow');
    await reader.waitFor(() => document.querySelector('[data-wo-heading]')?.textContent === "What's on tomorrow", 'tomorrow did not load');
    assert.equal(new URL((await reader.page.url())).searchParams.get('date'), 'tomorrow');
    await reader.load('/whats-on/?date=today&town=Mornington&free=1&kids=1');
    await reader.waitFor(() => document.querySelector('[data-wo-heading]')?.textContent === "What's on today", 'shared date did not restore');
    const shared = await reader.page.evaluate(() => {
      const form = document.querySelector('[data-wo-filters]');
      return {
        town: form.elements.namedItem('town').value,
        free: form.elements.namedItem('free').checked,
        kids: form.elements.namedItem('kids').checked,
        open: document.querySelector('[data-wo-filter-disclosure]').open,
      };
    });
    assert.deepEqual(shared, { town: 'Mornington', free: true, kids: true, open: true });
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

test('the default weekend offers no finished occurrence as a current result', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    const state = await reader.page.evaluate(() => ({
      rows: [...document.querySelectorAll('[data-wo-days] .wo-row')].map(row => ({
        phase: row.dataset.occurrencePhase,
        text: row.textContent,
      })),
      firstDay: document.querySelector('[data-wo-days] .wo-day__h')?.textContent ?? '',
      todayName: new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Melbourne', weekday: 'long',
      }).format(new Date()),
    }));
    assert.ok(state.rows.length > 0, 'weekend still needs useful results');
    assert.ok(state.rows.every(row => row.phase !== 'past' && !row.text.includes('Ended')));
    if (['Saturday', 'Sunday'].includes(state.todayName)) {
      assert.match(state.firstDay, new RegExp('^' + state.todayName));
    }
  } finally { await reader.close(); }
});

test('selected dates omit finished occurrences while keeping an ongoing range and a future event', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    await reader.page.evaluate(() => {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date()).map(part => [part.type, part.value]));
      const today = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
      const iso = offset => new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);
      window.fixtureDates = { from: iso(-1), to: iso(1) };
      const events = [
        { slug: 'finished-fixture', href: '/whats-on/finished-fixture/', t: 'Finished fixture',
          d: 'A completed one-off event.', m: ['Mornington'], k: 'range',
          s: iso(-1), e: iso(-1), statusData: { startTime: '10:00', endTime: '11:00' } },
        { slug: 'ongoing-fixture', href: '/whats-on/ongoing-fixture/', t: 'Ongoing fixture',
          d: 'A multi-day event still running.', m: ['Mornington'], k: 'range',
          s: iso(-1), e: iso(1), statusData: { startTime: '10:00', endTime: '16:00' } },
        { slug: 'future-fixture', href: '/whats-on/future-fixture/', t: 'Future fixture',
          d: 'An event tomorrow.', m: ['Mornington'], k: 'range',
          s: iso(1), e: iso(1), statusData: { startTime: '10:00', endTime: '11:00' } },
      ];
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes('/whats-on/feed.json')
        ? Promise.resolve(new Response(JSON.stringify({ events }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
        : nativeFetch(input, init);
      const form = document.querySelector('[data-wo-custom-form]');
      form.elements.namedItem('from').value = window.fixtureDates.from;
      form.elements.namedItem('to').value = window.fixtureDates.to;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await reader.waitFor(() => document.querySelector('[data-wo-days]')?.textContent.includes('Future fixture'),
      'selected dates did not load');
    const result = await reader.page.evaluate(() => document.querySelector('[data-wo-days]').textContent);
    assert.doesNotMatch(result, /Finished fixture|Ended/);
    assert.match(result, /Ongoing fixture/);
    assert.match(result, /Future fixture/);
    assert.equal(await reader.page.$$eval('[data-wo-days] .wo-day', days => days.length), 2,
      'past day should not take a result section');
  } finally { await reader.close(); }
});
