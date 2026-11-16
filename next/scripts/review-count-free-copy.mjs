import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Site } from '../tests/journeys/harness.mjs';
import { checkPage } from './assert-count-semantics.mjs';

const out = 'review/count-free-copy';
await fs.mkdir(out, { recursive: true });
const report = { head: process.env.REVIEW_HEAD_SHA ?? null, mode: 'Built site; harness CMS fixtures', pages: [] };
const routes = ['/', '/eat/', '/wine/', '/stay/', '/explore/', '/explore/plans/', '/whats-on/', '/journal/', '/eat/breweries/', '/explore/golf/', '/stay/winery-accommodation/', '/explore/places/red-hill/', '/wine/red-hill/', '/journal/the-pub-crawl/', '/guides/autumn/', '/tour/wine-tours/'];
const site = await Site.open();
try {
  for (const route of routes) for (const width of [390, 1440]) {
    const reader = await site.reader();
    const { page } = reader;
    try {
      await page.setViewport({ width, height: 900 });
      // Print-only guides deliberately have no Astro ClientRouter/page-load
      // event. Check their actual HTTP document and font readiness directly.
      if (route.startsWith('/guides/')) {
        const response = await page.goto(site.origin + route, { waitUntil: 'networkidle0' });
        assert.equal(response.status(), 200, route);
        await page.waitForSelector('h1');
      } else {
        await reader.load(route);
      }
      await page.evaluate(() => document.fonts.ready);
      // Trigger native lazy images and intersection-based reveals throughout
      // the document before inspecting the full page, then restore its cover.
      await page.evaluate(async () => {
        for (const img of document.images) img.loading = 'eager';
        for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
          scrollTo(0, y);
          await new Promise(resolve => setTimeout(resolve, 120));
        }
        await Promise.race([
          Promise.all([...document.images].filter(img => img.currentSrc).map(img => img.decode().catch(() => {}))),
          new Promise(resolve => setTimeout(resolve, 8000)),
        ]);
        scrollTo(0, 0);
        await new Promise(resolve => setTimeout(resolve, 800));
      });
      const observed = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content,
        overflow: document.documentElement.scrollWidth > innerWidth,
        unloadedImages: [...document.images].filter(img => img.getBoundingClientRect().width > 0 && (!img.complete || img.naturalWidth === 0)).map(img => ({ src: img.currentSrc || img.src, alt: img.alt })),
        headings: [...document.querySelectorAll('h1,h2')].map(el => el.textContent.trim()),
        actions: [...document.querySelectorAll('header a,.hub-entry a,.category-browse a')].map(el => ({ text: el.textContent.trim(), href: el.getAttribute('href') })),
        counts: [...document.querySelectorAll('[data-filter-count],[data-directory-progress-count],#result-count')].map(el => el.textContent.trim()),
      }));
      assert.equal(observed.overflow, false, route + ' horizontal overflow');
      assert.ok(!observed.headings.some(text => /^(?:All \d+ |Six starting points|Three ways into|\d+ (?:places|producers|experiences|breweries))/.test(text)), route + ' count-led heading');
      const key = route === '/' ? 'home' : route.slice(1,-1).replaceAll('/','-');
      await page.screenshot({ path: `${out}/${key}-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${out}/${key}-${width}-top.png` });
      // Chromium can leave very tall full-page textures blank below 16k px.
      // Retain real viewport captures for every lower segment as well.
      const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      observed.lowerSegments = [];
      if (documentHeight > 15000) {
        for (let y = 13500; y < documentHeight; y += 800) {
          await page.evaluate(y => scrollTo(0, y), y);
          await new Promise(resolve => setTimeout(resolve, 150));
          const file = `${key}-${width}-lower-${y}.png`;
          await page.screenshot({ path: `${out}/${file}` });
          observed.lowerSegments.push(file);
        }
      }
      if (['/eat/', '/wine/', '/stay/', '/explore/'].includes(route)) {
        const contract = checkPage(route, await page.content());
        assert.equal(contract.skipped, false, 'directory total contract is present');
        assert.deepEqual(contract.failures, []);
        observed.directory = { total: contract.claims[0].count, countable: contract.countableNodes };
      }
      report.pages.push({ route, width, ...observed });
    } finally { await reader.close(); }
  }
} finally {
  await fs.writeFile(`${out}/rendered.json`, JSON.stringify(report,null,2));
  await site.close();
}
