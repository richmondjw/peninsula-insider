import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Site } from '../tests/journeys/harness.mjs';
const out = 'review/appointment-producers';
await fs.mkdir(out, { recursive: true });
const report = { head: process.env.REVIEW_HEAD_SHA, route: '/wine/appointment-producers/', viewports: [] };
const site = await Site.open();
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const reader = await site.reader();
    const { page } = reader;
    try {
      await page.setViewport(viewport);
      await reader.load(report.route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.querySelector('.guide-hero img')?.naturalWidth > 0);
      const observed = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        mainCount: document.querySelectorAll('main').length,
        headings: [...document.querySelectorAll('h1')].map(x => x.textContent.trim()),
        cards: [...document.querySelectorAll('.producer-card')].map(x => ({ name: x.querySelector('h3').textContent.trim(), text: x.textContent.trim(), links: [...x.querySelectorAll('a')].map(a => a.getAttribute('href')) })),
        action: document.querySelector('.guide-hero .pi-btn').getBoundingClientRect().toJSON(),
        canonical: document.querySelector('link[rel=canonical]').href,
        schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map(x => JSON.parse(x.textContent)),
      }));
      report.viewports.push({ viewport, ...observed });
      await page.screenshot({ path: `${out}/${viewport.width}.png`, fullPage: true });
      assert.equal(observed.overflow, false);
      assert.equal(observed.mainCount, 1);
      assert.equal(observed.headings.length, 1);
      assert.equal(observed.cards.length, 8);
      assert.ok(observed.action.bottom < viewport.height, 'Discovery CTA is reachable in first screen');
      assert.equal(observed.canonical, 'https://peninsulainsider.com.au/wine/appointment-producers/');
      assert.doesNotMatch(observed.cards.map(x => x.text).join(' '), /David Lloyd|Halliday|library vintages|CELLAR DOOR SLOW/);
      const list = observed.schema.find(x => x['@type'] === 'ItemList');
      assert.equal(list.itemListElement.length, observed.cards.length);
      for (const card of observed.cards) for (const link of card.links.filter(x => x.startsWith('/'))) {
        const response = await fetch(site.origin + link);
        assert.equal(response.status, 200, link);
      }
      await page.focus('.guide-hero .pi-btn');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#producers');
      await page.focus('.producer-card [data-pi-save]');
      const focus = await page.$eval('.producer-card [data-pi-save]', x => ({ outline: getComputedStyle(x).outlineStyle, height: x.getBoundingClientRect().height }));
      assert.notEqual(focus.outline, 'none'); assert.ok(focus.height >= 44);
      await page.keyboard.press('Space');
      await page.waitForFunction(() => document.querySelector('.producer-card [data-pi-save]').getAttribute('aria-pressed') === 'true');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => document.querySelector('.producer-card [data-pi-save]').getAttribute('aria-pressed') === 'false');
      await page.focus('.producer-card [data-pi-share]');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => /copied/i.test(document.querySelector('.producer-card [data-pi-status]')?.textContent || '') || document.querySelector('dialog[open], [role="dialog"]'));
      await page.screenshot({ path: `${out}/${viewport.width}-controls.png`, fullPage: false });
      if (await page.$('dialog[open]')) {
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('.producer-card [data-pi-share]', x => document.activeElement === x), true);
      }
      report.viewports.at(-1).keyboardSaveShare = 'passed';
      if (viewport.width === 390) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForFunction(() => document.querySelector('.site-header')?.dataset.bound === 'true');
        await page.focus('.site-header .mobile-menu');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('#mobile-drawer')?.open);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: `${out}/390-menu.png` });
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('.site-header .mobile-menu', x => document.activeElement === x), true);
        report.viewports.at(-1).keyboardMenu = 'passed';
      }
    } finally { await reader.close(); }
  }
} finally { await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2)); await site.close(); }
