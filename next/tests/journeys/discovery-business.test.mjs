import test from 'node:test';

import assert from 'node:assert/strict';
import { Site, DIST } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const site = await Site.open();
test.after(() => site.close());

test('date-led events guidance remains readable on its solid header', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/whats-on/');
    const ratios = await reader.page.evaluate(() => {
      const luminance = value => {
        const channels = value.match(/[\d.]+/g).slice(0,3).map(Number).map(v => {
          const c=v/255; return c<=0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4;
        });
        return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
      };
      const background=luminance(getComputedStyle(document.querySelector('.wo-head')).backgroundColor);
      return [...document.querySelectorAll('.wo-head p')].map(el => {
        const foreground=luminance(getComputedStyle(el).color);
        return (Math.max(background,foreground)+0.05)/(Math.min(background,foreground)+0.05);
      });
    });
    assert.ok(ratios.length>=2);
    assert.ok(ratios.every(r=>r>=4.5),JSON.stringify(ratios));
  } finally { await reader.close(); }
});

const routes = ['/eat/', '/eat/best-restaurants/', '/stay/', '/stay/best-accommodation/', '/wine/', '/wine/best-cellar-doors/', '/explore/', '/explore/things-to-do/'];
test('eight hub and ranked pages expose every structured FAQ question and answer in the rendered document', async () => {
  const reader = await site.reader();
  try {
    for (const route of routes) {
      await reader.load(route);
      const findings = await reader.page.evaluate(() => {
        const normalize = (s) => s.replace(/\s+/g, ' ').trim();
        const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(el => { const v = JSON.parse(el.textContent); return Array.isArray(v) ? v : [v]; });
        const faq = schemas.find(s => s['@type'] === 'FAQPage');
        const copy = normalize(document.querySelector('main').textContent);
        return { count: faq?.mainEntity?.length ?? 0, missing: (faq?.mainEntity ?? []).filter(q => !copy.includes(normalize(q.name)) || !copy.includes(normalize(q.acceptedAnswer.text))).map(q => q.name) };
      });
      assert.ok(findings.count > 0, route);
      assert.deepEqual(findings.missing, [], route);
    }
  } finally { await reader.close(); }
});
test('homepage offers three working intent routes within narrow-screen width', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');
    const targets = await reader.page.$$eval('.home-cover__actions a', links => links.map(a => a.getAttribute('href')));
    assert.deepEqual(targets, ['#home-choose', '/whats-on/this-weekend/', '/search/']);
    for (const width of [320, 390, 1280]) {
      await reader.page.setViewport({width, height: 900});
      assert.ok(await reader.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
    }
    await reader.page.click('.home-cover__actions [data-open-search]');
    await reader.waitFor(() => document.querySelector('[role="dialog"][aria-modal="true"]') || location.pathname === '/search/', 'search did not open');
    for (const route of targets.slice(0, 2)) {
      await reader.load(route.startsWith('#') ? '/' + route : route);
      assert.ok(await reader.page.$('main h1'), route);
    }
  } finally { await reader.close(); }
});
test('business corrections and updates are available to a signed-out visitor without a paid step', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/partners/');
    const hrefs = await reader.page.$$eval('main a', links => links.map(a => a.getAttribute('href')));
    for (const href of ['/contact/?type=correction#correction', '/partners/add/', '/partners/update/']) assert.ok(hrefs.includes(href), href);
    await reader.load('/partners/update/');
    assert.ok(await reader.page.$('form[data-public-intake="listing-update"]'));
    const copy = await reader.page.$eval('main', el => el.textContent);
    assert.doesNotMatch(copy, /sign in to submit/i);
    assert.match(copy, /updates are free/i);
    assert.ok(await reader.page.$('a[href="/partners/add/"]'));
    await reader.load('/corrections/');
    assert.ok(await reader.page.$('main form'));
    assert.equal(new URL(reader.page.url()).pathname, '/contact/');
  } finally { await reader.close(); }
});
test('high-value discovery URLs are unique sitemap entries with self-canonicals and indexable HTML', () => {
  const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(urls).size, urls.length);
  for (const route of [...routes, '/whats-on/', '/whats-on/this-weekend/', '/partners/', '/dispatch/', '/picks/']) {
    const url = `https://peninsulainsider.com.au${route}`;
    assert.ok(urls.includes(url), `${route} absent from sitemap`);
    const html = readFileSync(join(DIST, route, 'index.html'), 'utf8');
    const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0];
    assert.ok(canonical?.includes(`href="${url}"`), `${route} canonical`);
    assert.doesNotMatch(html, /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i, route);
  }
});

test('category filters are reachable from the first screen and restore the matching directory', async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({width:390,height:844});
    for (const route of ['/eat/','/stay/','/explore/']) {
      await reader.load(route);
      const geometry = await reader.page.evaluate(() => ({
        bars:document.querySelectorAll('[data-v5-filterbar]').length,
        top:document.querySelector('[data-v5-filterbar]').getBoundingClientRect().top,
        overflow:document.documentElement.scrollWidth > innerWidth + 1,
      }));
      assert.equal(geometry.bars,1,route);
      assert.equal(geometry.overflow,false,route);
      if (route === '/stay/') {
        const jump = await reader.page.$('.stay-hero__secondary[href="#browse-stay"]');
        assert.ok(jump, 'Stay needs a direct first-screen path to filters');
        const bounds = await jump.boundingBox();
        assert.ok(bounds && bounds.y + bounds.height < 750, 'Stay browse action buried');
        await jump.click();
        const landed = await reader.page.evaluate(() => ({
          hash:location.hash,
          top:document.querySelector('[data-v5-filterbar]').getBoundingClientRect().top,
        }));
        assert.equal(landed.hash,'#browse-stay');
        assert.ok(landed.top >= 0 && landed.top < 750, 'Stay jump did not reveal filters');
      } else if (route === '/eat/') {
        const jump = await reader.page.$('.category-browse__links a[href="#directory"]');
        assert.ok(jump, 'Eat needs a direct first-screen path to filters');
        const bounds = await jump.boundingBox();
        assert.ok(bounds && bounds.y + bounds.height < 750, 'Eat browse action buried');
        await jump.click();
        const landed = await reader.page.evaluate(() => ({
          hash:location.hash,
          headingTop:document.querySelector('#directory .v5-directory__heading').getBoundingClientRect().top,
          top:document.querySelector('[data-v5-filterbar]').getBoundingClientRect().top,
        }));
        assert.equal(landed.hash,'#directory');
        assert.ok(landed.headingTop >= 0 && landed.headingTop < 750, 'Eat jump hid the directory heading');
        assert.ok(landed.top >= 0 && landed.top < 750, 'Eat jump did not reveal filters');
      } else {
        assert.ok(geometry.top < 750,route+' filters buried');
      }
    }
    await reader.load('/eat/');
    await reader.page.click('[data-filter-chip][data-key="party"][data-value="family"]');
    await reader.waitFor(()=>document.querySelector('[data-category-editorial]').hidden,'editorial did not yield to results');
    const filtered = await reader.page.evaluate(()=>({
      rows:[...document.querySelectorAll('[data-filter-countable]')].filter(el=>!el.hidden).length,
      total:document.querySelectorAll('[data-filter-countable]').length,
      url:location.search,
    }));
    assert.ok(filtered.rows>0 && filtered.rows<filtered.total);
    assert.match(filtered.url,/party=family/);
    await reader.page.reload({waitUntil:'networkidle0'});
    assert.equal(await reader.page.$eval('[data-category-editorial]',el=>el.hidden),true);
    await reader.page.click('[data-filter-clear]');
    await reader.waitFor(()=>!document.querySelector('[data-category-editorial]').hidden,'clear did not restore editorial');
    const more = await reader.page.$('.v5-six__more');
    assert.ok(more);
    await reader.page.click('.v5-six__more summary');
    assert.equal(await more.evaluate(el=>el.open),true);
  } finally { await reader.close(); }
});

test('wine visitors can choose a day or reach filtered places on a first visit', async () => {
  const reader = await site.reader();
  try {
    await reader.page.evaluateOnNewDocument(() => localStorage.removeItem('pi-consent-v1'));
    await reader.page.setViewport({ width: 320, height: 568 });
    await reader.load('/wine/');
    await reader.waitFor(() => document.querySelector('.wine-hero__visual img')?.naturalWidth > 0, 'wine hero photo did not load');
    const firstFold = await reader.page.evaluate(() => ({
      cookie: document.querySelector('#cookie-banner')?.dataset.state,
      actionBottom: document.querySelector('.wine-hero__primary')?.getBoundingClientRect().bottom,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      title: document.querySelector('main h1')?.textContent.trim(),
    }));
    assert.equal(firstFold.cookie, 'visible');
    assert.equal(firstFold.title, 'Mornington Peninsula wine country');
    assert.ok(firstFold.actionBottom <= 568, 'first-screen wine choice is below the 320px fold');
    assert.equal(firstFold.overflow, false);
    await reader.page.setViewport({ width: 390, height: 844 });
    await reader.page.click('.wine-hero__secondary');
    await reader.waitFor(() => location.hash === '#browse-wine', 'browse link did not reach the directory controls');
    const browse = await reader.page.evaluate(() => ({
      top: document.querySelector('#browse-wine')?.getBoundingClientRect().top,
      filters: document.querySelectorAll('[data-v5-filterbar]').length,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    assert.ok(browse.top >= 100 && browse.top < 300, 'browse controls are obscured by the sticky header');
    assert.equal(browse.filters, 1);
    assert.equal(browse.overflow, false);
    await reader.load('/wine/?mood=lunch-attached#browse-wine');
    await reader.waitFor(() => document.querySelector('[data-category-editorial]')?.hidden, 'filtered wine directory did not replace editorial');
    const filtered = await reader.page.evaluate(() => ({
      selected: document.querySelector('[data-filter-chip][data-key="mood"][data-value="lunch-attached"]')?.getAttribute('aria-pressed'),
      visible: [...document.querySelectorAll('[data-filter-countable]')].filter(el => !el.hidden).length,
      all: document.querySelectorAll('[data-filter-countable]').length,
      top: document.querySelector('#browse-wine')?.getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    assert.equal(filtered.selected, 'true');
    assert.ok(filtered.visible > 0 && filtered.visible < filtered.all);
    assert.ok(filtered.top >= 100 && filtered.top < 300, 'filtered controls are obscured by the sticky header');
    assert.equal(filtered.overflow, false);
  } finally { await reader.close(); }
});

test('homepage alternate plan actions retain usable itineraries and the cover is a single still image', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');
    const copiedKinds = await reader.page.$$eval('.home-plan [data-variant="fork"]',els=>els.map(el=>el.dataset.kind));
    assert.ok(copiedKinds.length>=1);
    assert.ok(copiedKinds.every(kind=>kind==='itinerary'));
    assert.equal(await reader.page.$$eval('[data-cover-motion]', els => els.length), 0);
    assert.equal(await reader.page.$$eval('.home-cover__media', els => els.length), 1);
    assert.ok(await reader.page.$eval('.home-cover__media', image => image.complete && image.naturalWidth > 0));
    assert.equal(await reader.page.$$eval('.cover-motion-toggle', els => els.length), 0);
    await reader.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    assert.equal(await reader.page.$$eval('[data-cover-motion]', els => els.length), 0);
  } finally { await reader.close(); }
});


test('first-visit Explore actions and filters stay in view with the cookie note', async () => {
  const reader = await site.reader();
  try {
    await reader.page.evaluateOnNewDocument(() => localStorage.removeItem('pi-consent-v1'));
    await reader.page.setViewport({width:320,height:568});
    await reader.load('/explore/');
    const narrow = await reader.page.evaluate(() => ({
      cookie: document.querySelector('#cookie-banner')?.getAttribute('data-state'),
      actionBottom: document.querySelector('.x-hero__primary')?.getBoundingClientRect().bottom,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    assert.equal(narrow.cookie, 'visible');
    assert.ok(narrow.actionBottom <= 568, 'first-visit primary action is below the 320px fold');
    assert.equal(narrow.overflow, false);
    await reader.page.setViewport({width:390,height:844});
    const wider = await reader.page.evaluate(() => ({
      filterTop: document.querySelector('[data-v5-filterbar]')?.getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    assert.ok(wider.filterTop < 750, 'first-visit filters are buried at 390px');
    assert.equal(wider.overflow, false);
  } finally { await reader.close(); }
});

test('boutique and wellness stay choices remain visible on a first visit', async () => {
  const reader = await site.reader();
  try {
    await reader.page.evaluateOnNewDocument(() => localStorage.removeItem('pi-consent-v1'));
    await reader.page.setViewport({width:320,height:568});
    for (const [route, selector] of [
      ['/stay/boutique-hotels/', '.boutique-hero__cta'],
      ['/stay/wellness-retreats/', '.wellness-choice a'],
    ]) {
      await reader.load(route);
      const bounds = await reader.page.evaluate((target) => ({
        cookie: document.querySelector('#cookie-banner')?.dataset.state,
        bottoms: [...document.querySelectorAll(target)].map(el => el.getBoundingClientRect().bottom),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }), selector);
      assert.equal(bounds.cookie, 'visible', route);
      assert.ok(bounds.bottoms.length >= 1 && bounds.bottoms.every(bottom => bottom <= 568), route + ' first-screen choice');
      assert.equal(bounds.overflow, false, route);
    }
  } finally { await reader.close(); }
});

test('vineyard and resort stay choices remain visible on a first visit', async () => {
  const reader = await site.reader();
  try {
    await reader.page.evaluateOnNewDocument(() => localStorage.removeItem('pi-consent-v1'));
    await reader.page.setViewport({width:320,height:568});
    for (const [route, selector, expected] of [
      ['/stay/vineyard-stays/', '.vine-hero__cta', 1],
      ['/stay/resorts/', '.resorts-choice a', 3],
    ]) {
      await reader.load(route);
      const bounds = await reader.page.evaluate(target => ({
        cookie: document.querySelector('#cookie-banner')?.dataset.state,
        bottoms: [...document.querySelectorAll(target)].map(el => el.getBoundingClientRect().bottom),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }), selector);
      assert.equal(bounds.cookie, 'visible', route);
      assert.equal(bounds.bottoms.length, expected, route + ' choice count');
      assert.ok(bounds.bottoms.every(bottom => bottom <= 568), route + ' first-screen choice');
      assert.equal(bounds.overflow, false, route);
    }
  } finally { await reader.close(); }
});

test('stay guide booking checks and secondary actions remain usable', async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({width:320,height:700});
    await reader.load('/stay/vineyard-stays/');
    const checks = await reader.page.$$eval('.vine-card__check', elements => elements.map(el => el.textContent));
    assert.ok(checks.some(text => text.includes('not suitable for infants or children under 16')));
    assert.ok(checks.some(text => text.includes('Accommodation guests must be 16 or older')));
    await reader.load('/stay/resorts/');
    const links = await reader.page.$$eval('.resorts-text-link', elements => elements.map(el => el.getBoundingClientRect().height));
    assert.equal(links.length, 2);
    assert.ok(links.every(height => height >= 44), 'resort secondary links need a 44px target');
  } finally { await reader.close(); }
});

test('Red Hill stay choices are reachable on a first visit and identify the actual locality', async () => {
  const reader = await site.reader();
  try {
    await reader.page.evaluateOnNewDocument(() => localStorage.removeItem('pi-consent-v1'));
    await reader.page.setViewport({ width: 320, height: 568 });
    await reader.load('/stay/red-hill/');
    const narrow = await reader.page.evaluate(() => ({
      cookie: document.querySelector('#cookie-banner')?.dataset.state,
      choices: [...document.querySelectorAll('.rh-hero__choices a')].map(a => ({ bottom: a.getBoundingClientRect().bottom, height: a.getBoundingClientRect().height, href: a.getAttribute('href') })),
      cards: document.querySelectorAll('.rh-card').length,
      localHrefs: [...document.querySelectorAll('.rh-card h3 a')].map(a => a.getAttribute('href')),
      treetopsPlace: document.querySelector('#rh-treetops-red-hill')?.closest('.rh-card')?.querySelector('.rh-card__top span:last-child')?.textContent?.trim(),
      birchWider: document.querySelector('#further-afield a[href="/stay/birch-creek/"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      copy: document.querySelector('main')?.textContent ?? '',
    }));
    assert.equal(narrow.cookie, 'visible');
    assert.deepEqual(narrow.choices.map(c => c.href), ['#estate-stays', '#private-bases']);
    assert.ok(narrow.choices.every(c => c.height >= 44 && c.bottom <= 568), JSON.stringify(narrow.choices));
    assert.equal(narrow.cards, 5);
    assert.ok(!narrow.localHrefs.includes('/stay/birch-creek/'), 'Dromana stay must not be a Red Hill local card');
    assert.equal(narrow.treetopsPlace, 'Red Hill');
    assert.match(narrow.birchWider, /Dromana \/ farm cottages/);
    assert.equal(narrow.overflow, false);
    assert.match(narrow.copy, /Jackalope is in Merricks North/);
    assert.match(narrow.copy, /Peninsula Hot Springs accommodation is in Fingal/);
    await reader.page.setViewport({ width: 390, height: 844 });
    assert.equal(await reader.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  } finally { await reader.close(); }
});

test('Brewer Cottage 2026 short-stay pause removes booking paths but preserves an explanatory detail page', async () => {
  const reader = await site.reader();
  try {
    for (const route of ['/stay/', '/stay/best-accommodation/', '/stay/cottages/', '/stay/red-hill/', '/stay/vineyard-stays/', '/stay/winery-accommodation/', '/explore/places/red-hill/']) {
      await reader.load(route);
      const links = await reader.page.$$eval('a[href="/stay/brewers-cottage/"]', nodes => nodes.length);
      assert.equal(links, 0, route + ' still recommends the paused cottage');
    }
    await reader.load('/stay/brewers-cottage/');
    const detail = await reader.page.evaluate(() => ({
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
      notice: document.querySelector('.venue-detail__closed-notice')?.textContent ?? '',
      bookingLinks: document.querySelectorAll('a[data-pi-entity-slug="brewers-cottage"][data-pi-book]').length,
      lodgingSchema: [...document.querySelectorAll('script[type="application/ld+json"]')].some(el => el.textContent.includes('"LodgingBusiness"')),
    }));
    assert.match(detail.robots, /noindex/);
    assert.match(detail.notice, /short stays.*2026/i);
    assert.match(detail.notice, /brewery.*trading status/i);
    assert.equal(detail.bookingLinks, 0);
    assert.equal(detail.lodgingSchema, false);
    const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
    assert.doesNotMatch(sitemap, /\/stay\/brewers-cottage\//);
  } finally { await reader.close(); }
});


test('Sorrento hotel choices remain visible on a first visit', async () => {
  const reader = await site.reader();
  try {
    await reader.page.evaluateOnNewDocument(() => localStorage.removeItem('pi-consent-v1'));
    await reader.page.setViewport({width:320,height:568});
    await reader.load('/stay/sorrento/');
    const result = await reader.page.evaluate(() => ({
      cookie: document.querySelector('#cookie-banner')?.dataset.state,
      choices: [...document.querySelectorAll('.sorrento-hero__choices a')].map(el => ({
        href: el.getAttribute('href'),
        bottom: el.getBoundingClientRect().bottom,
        height: el.getBoundingClientRect().height,
      })),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    assert.equal(result.cookie, 'visible');
    assert.deepEqual(result.choices.map(choice => choice.href), ['#hotel-sorrento', '#intercontinental']);
    assert.ok(result.choices.every(choice => choice.height >= 44 && choice.bottom <= 568), JSON.stringify(result.choices));
    assert.equal(result.overflow, false);
  } finally { await reader.close(); }
});

test('four stay guides use social images matching their subjects', () => {
  const expected = new Map([
    ['/stay/vineyard-stays/', '/images/visit-victoria/vv-26070114-jackalope-hotel.webp'],
    ['/stay/resorts/', '/images/visit-victoria/vv-143799-cape-schanck.webp'],
    ['/stay/sorrento/', '/images/visit-victoria/vv-22100103-sorrento-ferry-terminal.webp'],
    ['/stay/red-hill/', '/images/visit-victoria/vv-25061209-lancemore-lindenderry-red-hill.webp'],
  ]);
  for (const [route, image] of expected) {
    const html = readFileSync(join(DIST, route, 'index.html'), 'utf8');
    const tag = html.match(/<meta\b[^>]*property="og:image"[^>]*>/)?.[0];
    assert.ok(tag?.includes(image), route + ' social image');
  }
});
