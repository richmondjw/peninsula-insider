import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { Site } from '../tests/journeys/harness.mjs';
import quarantine from '../src/data/cms-image-quarantine.json' with { type: 'json' };
import { eatFeaturedRestoration } from '../src/lib/eat-featured-restoration.mjs';

const historical = JSON.parse(await fs.readFile(new URL('../../ops/page-quality/assessments/eat-image-inventory-2026-10-03.json', import.meta.url), 'utf8'));
const restoredSlugs = ['commonfolk-coffee', 'tedesca-osteria', 'barragunda-dining', 'portsea-hotel'];
const originals = new Map(restoredSlugs.map(slug => [slug, historical.rows.find(row => row.slug === slug).renderedImageSrc]));
const heldOriginal = slug => {
  const src = originals.get(slug);
  return src && quarantine.quarantined.some(hold => hold.storagePath === src.split('/cms-assets/')[1]);
};
const out = 'review/eat-featured-restoration';
await fs.mkdir(out, { recursive: true });
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(head, process.env.REVIEW_HEAD_SHA, 'Capture must use the exact PR head');
const report = { head, route: '/eat/', viewports: [], passed: false };
let site;
try {
  site = await Site.open();
  for (const viewport of [
    { width: 1440, height: 1000, deviceScaleFactor: 1 },
    { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  ]) {
    const reader = await site.reader({ seedStorage: { 'pi-consent-v1': '' } });
    const { page } = reader;
    const observed = { viewport, cards: [] };
    report.viewports.push(observed);
    try {
      await page.setViewport(viewport);
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await reader.load('/eat/');
      assert.equal(await page.$eval('#cookie-banner', el => el.dataset.state), 'visible', 'First-visit cookie note remains present');
      await page.evaluate(async () => {
        document.querySelectorAll('#the-six img').forEach(img => { img.loading = 'eager'; });
        await document.fonts.ready;
      });
      await page.waitForFunction(() => {
        const images = [...document.querySelectorAll('#the-six .pi-card__media img')];
        return images.every(img => img.complete && img.naturalWidth > 0);
      });
      const slugs = await page.$$eval('#the-six .pi-card__title a', links => links.map(a => a.getAttribute('href').split('/')[2]));
      assert.equal(slugs.length, 6);
      assert.deepEqual(slugs, ['merricks-general-wine-store', 'commonfolk-coffee', 'tedesca-osteria', 'doot-doot-doot', 'barragunda-dining', 'portsea-hotel']);
      for (const slug of slugs) {
        const card = `#the-six .v5-six__item:has(a[href="/eat/${slug}/"])`;
        await page.$eval(card, el => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
        const held = heldOriginal(slug);
        let result;
        if (held) {
          const sources = await page.$$eval(card + ' img', images => images.map(img => img.getAttribute('data-pi-image-original-src') ?? img.getAttribute('src')));
          assert.ok(!sources.includes(originals.get(slug)), 'Quarantined original must not render');
          result = { slug, quarantined: true, sources };
          observed.cards.push(result);
        } else {
          await page.waitForFunction(selector => {
            const img = document.querySelector(selector + ' .pi-card__media img');
            return img?.complete && img.naturalWidth > 0;
          }, {}, card);
          const image = await page.$eval(card, el => {
            const img = el.querySelector('.pi-card__media img');
            return { src: img.getAttribute('src'), currentSrc: img.currentSrc,
              original: img.getAttribute('data-pi-image-original-src'), alt: img.alt,
              naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
              noHydrate: img.dataset.piNoHydrate, text: el.innerText };
          });
          result = { slug, ...image };
          observed.cards.push(result);
          assert.equal(image.noHydrate, 'true');
          if (originals.has(slug)) {
            assert.equal(image.original ?? image.src, originals.get(slug), 'Exact historical original retained');
            const restored = eatFeaturedRestoration(slug, '/eat/#the-six');
            assert.ok(restored, 'Unheld owner exception remains available');
            assert.equal(image.alt, restored.alt);
          }
          if (slug === 'commonfolk-coffee') assert.match(image.text, /Coffee production/);
        }
        const save = card + ' [data-v5-save-btn]';
        const activate = selector => viewport.hasTouch ? page.tap(selector) : page.click(selector);
        await activate(save);
        await page.waitForFunction(selector => document.querySelector(selector).getAttribute('aria-pressed') === 'true', {}, save);
        assert.equal(new URL(page.url()).pathname, '/eat/', 'Save must not trigger the card link');
        await activate(save);
        await page.waitForFunction(selector => document.querySelector(selector).getAttribute('aria-pressed') === 'false', {}, save);
        result.saveToggle = true;
        if (viewport.width === 390) await page.screenshot({ path: `${out}/390-${slug}.png` });
        await activate(card + ' .pi-card__title a');
        await page.waitForFunction(path => location.pathname === path, {}, `/eat/${slug}/`);
        result.cardNavigation = true;
        await reader.load('/eat/');
      }
      observed.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(observed.overflow, false, 'No horizontal page overflow');
      await page.$eval('#the-six', el => el.scrollIntoView({ behavior: 'instant' }));
      await page.evaluate(async () => {
        document.querySelectorAll('#the-six img').forEach(img => { img.loading = 'eager'; });
        await document.fonts.ready;
      });
      await page.waitForFunction(() => [...document.querySelectorAll('#the-six .pi-card__media img')].every(img => img.complete && img.naturalWidth > 0));
      if (viewport.width === 1440) await (await page.$('#the-six')).screenshot({ path: `${out}/1440-six.png` });
      else await page.screenshot({ path: `${out}/390-six.png` });
    } finally { await reader.close(); }
  }
  report.passed = true;
} catch (error) {
  report.error = String(error.stack ?? error);
  throw error;
} finally {
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  if (site) await site.close();
}

