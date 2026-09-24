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
    assert.deepEqual(targets, ['/whats-on/this-weekend/', '/explore/plans/', '/search/']);
    for (const width of [320, 390, 1280]) {
      await reader.page.setViewport({width, height: 900});
      assert.ok(await reader.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
    }
    await reader.page.click('.home-cover__actions [data-open-search]');
    await reader.waitFor(() => document.querySelector('[role="dialog"][aria-modal="true"]') || location.pathname === '/search/', 'search did not open');
    for (const route of targets.slice(0, 2)) {
      await reader.load(route);
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

test('category filters are reachable before editorial choices and restore the matching directory', async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({width:390,height:844});
    for (const route of ['/eat/','/stay/','/wine/','/explore/']) {
      await reader.load(route);
      const geometry = await reader.page.evaluate(() => ({
        bars:document.querySelectorAll('[data-v5-filterbar]').length,
        top:document.querySelector('[data-v5-filterbar]').getBoundingClientRect().top,
        overflow:document.documentElement.scrollWidth > innerWidth + 1,
      }));
      assert.equal(geometry.bars,1,route);
      assert.ok(geometry.top < 750,route+' filters buried');
      assert.equal(geometry.overflow,false,route);
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
test('homepage alternate plan actions only copy usable itineraries and cover targets are comfortable', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/');
    const copiedKinds = await reader.page.$$eval('.home-plan [data-variant="fork"]',els=>els.map(el=>el.dataset.kind));
    assert.ok(copiedKinds.length>=1);
    assert.ok(copiedKinds.every(kind=>kind==='itinerary'));
    const targets = await reader.page.$$eval('[data-cover-dot]',els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));
    assert.ok(targets.length>0);
    assert.ok(targets.every(t=>t.w>=44 && t.h>=44));
  } finally { await reader.close(); }
});
