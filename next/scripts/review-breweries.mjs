import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Site } from '../tests/journeys/harness.mjs';
const out = 'review/breweries';
await fs.mkdir(out, { recursive: true });
const report = { head: process.env.REVIEW_HEAD_SHA, route: '/eat/breweries/', viewports: [] };
const site = await Site.open();
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const reader = await site.reader({ seedStorage: { 'pi-consent-v1': '' } });
    const { page } = reader;
    try {
      await page.setViewport(viewport);
      await reader.load(report.route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.querySelector('.brew-cover img')?.naturalWidth > 0);
      const observed = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        mainCount: document.querySelectorAll('main').length,
        headings: [...document.querySelectorAll('h1')].map(x => x.textContent.trim()),
        cards: [...document.querySelectorAll('.brew-card')].map(x => ({ name: x.querySelector('h3').textContent.trim(), text: x.textContent.trim(), links: [...x.querySelectorAll('a')].map(a => a.getAttribute('href')) })),
        action: document.querySelector('.brew-cover .pi-btn').getBoundingClientRect().toJSON(),
        canonical: document.querySelector('link[rel=canonical]').href,
        schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map(x => JSON.parse(x.textContent)),
      }));
      const contrast = await page.evaluate(() => {
        const rgba = value => (value.match(/[\d.]+/g) || []).map(Number);
        const luminance = rgb => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
        return [...document.querySelectorAll('.brewery-guide h1, .brewery-guide h2, .brewery-guide h3, .brewery-guide p, .brewery-guide a, .brewery-guide button, .brewery-guide figcaption, .brewery-guide .pi-actions__label')].filter(el => el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden').map(el => {
          let bg = [255, 255, 255]; const ancestors = []; for (let node = el; node; node = node.parentElement) ancestors.unshift(node);
          for (const node of ancestors) { const c = rgba(getComputedStyle(node).backgroundColor); const alpha = c[3] ?? 1; bg = bg.map((v, i) => c[i] * alpha + v * (1 - alpha)); }
          const css = getComputedStyle(el); const fg = luminance(rgba(css.color)); const back = luminance(bg); const ratio = (Math.max(fg, back) + .05) / (Math.min(fg, back) + .05);
          const large = parseFloat(css.fontSize) >= 24 || (parseFloat(css.fontSize) >= 18.66 && Number(css.fontWeight) >= 700);
          return { text: el.textContent.trim().slice(0, 80), ratio: Math.round(ratio * 100) / 100, minimum: large ? 3 : 4.5 };
        });
      });
      const composition = await page.evaluate(() => {
        const panel = document.querySelector('.brew-finder').getBoundingClientRect();
        const inset = document.querySelector('.brew-finder__intro').getBoundingClientRect().left - panel.left;
        const figure = document.querySelector('.brew-cover__figure').getBoundingClientRect();
        const caption = document.querySelector('.brew-cover__figure figcaption'); const credit = caption.getBoundingClientRect();
        return { planningInset: inset, captionVisible: credit.height > 0 && credit.bottom <= figure.bottom + 1 && getComputedStyle(caption).visibility !== 'hidden', caption: caption.textContent.trim() };
      });
      report.viewports.push({ viewport, ...observed, contrast, composition });
      assert.ok(composition.brew-finderInset >= 20, 'Place finder has an internal gutter');
      assert.ok(composition.captionVisible && /Courtesy of Visit Victoria/i.test(composition.caption), 'Named photograph credit is visible');
      await page.screenshot({ path: `${out}/${viewport.width}.png`, fullPage: true });
      assert.equal(await page.$eval('#cookie-banner', x => x.dataset.state), 'visible', 'First-visit cookie note is visible');
      assert.ok(contrast.length > 0 && contrast.every(x => x.ratio >= x.minimum), JSON.stringify(contrast.filter(x => x.ratio < x.minimum)));
      assert.equal(observed.overflow, false);
      assert.equal(observed.mainCount, 1);
      assert.equal(observed.headings.length, 1);
      assert.equal(observed.cards.length, 5);
      assert.ok(observed.action.bottom < viewport.height, 'Discovery CTA is reachable in first screen');
      assert.equal(observed.canonical, 'https://peninsulainsider.com.au/eat/breweries/');
      assert.doesNotMatch(observed.cards.map(x => x.text).join(' '), /Australia.s first|unexpectedly good|2\/4 Brasser/);
      const list = observed.schema.find(x => x['@type'] === 'ItemList');
      assert.equal(list.itemListElement.length, observed.cards.length);
      for (const card of observed.cards) for (const link of card.links.filter(x => x.startsWith('/'))) {
        const response = await fetch(site.origin + link);
        assert.equal(response.status, 200, link);
      }
      assert.equal(await page.$eval('.brew-cover .pi-btn', x => { const r = x.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.pi-btn') === x; }), true, 'Discovery action is unobscured with first-visit cookie note');
      if (viewport.width === 1440) assert.ok(await page.$eval('.brew-cover', x => x.getBoundingClientRect().height) < 650, 'Brewery hero is compact');
      await page.focus('#cookie-manage');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('#cookie-banner')?.dataset.state !== 'visible');
      await page.screenshot({ path: `${out}/${viewport.width}-reading.png`, fullPage: true });
      await page.focus('.brew-cover .pi-btn');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#producers');
      await page.focus('.brew-jumps a');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#brew-dromana');
      await page.focus('.brew-card [data-pi-save]');
      const focus = await page.$eval('.brew-card [data-pi-save]', x => ({ outline: getComputedStyle(x).outlineStyle, height: x.getBoundingClientRect().height }));
      assert.notEqual(focus.outline, 'none'); assert.ok(focus.height >= 44);
      await page.keyboard.press('Space');
      await page.waitForFunction(() => document.querySelector('.brew-card [data-pi-save]').getAttribute('aria-pressed') === 'true');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => document.querySelector('.brew-card [data-pi-save]').getAttribute('aria-pressed') === 'false');
      await page.focus('.brew-card [data-pi-share]');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => /copied/i.test(document.querySelector('.brew-card [data-pi-status]')?.textContent || '') || document.querySelector('dialog[open], [role="dialog"]'));
      await page.screenshot({ path: `${out}/${viewport.width}-controls.png`, fullPage: false });
      if (await page.$('dialog[open]')) {
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('.brew-card [data-pi-share]', x => document.activeElement === x), true);
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
