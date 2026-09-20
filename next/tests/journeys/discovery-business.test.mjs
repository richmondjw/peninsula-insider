import test from 'node:test';
import assert from 'node:assert/strict';
import { Site, DIST } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const site = await Site.open();
test.after(() => site.close());
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
