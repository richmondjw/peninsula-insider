import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Site } from '../tests/journeys/harness.mjs';

const output = '../ops/reports/seo/openrush-2026-10/.private';
fs.mkdirSync(output, { recursive: true });
const site = await Site.open();
const results = [];
try {
  for (const width of [390, 1440]) {
    const reader = await site.reader();
    const page = reader.page;
    await page.setViewport({ width, height: 900 });
    for (const [route, section] of [
      ['/eat/best-restaurants/', '#dinner'],
      ['/explore/places/rosebud/', '#rosebud-choices'],
      ['/journal/dog-friendly-wineries-mornington-peninsula/', '.article-body'],
      ['/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/', '.article-body'],
    ]) {
      await reader.load(route);
      const measure = await page.evaluate(selector => {
        const element = document.querySelector(selector) ?? document.querySelector('main');
        const headings = [...element.querySelectorAll('h2,h3')].map(h => ({ text: h.textContent.trim(), size: parseFloat(getComputedStyle(h).fontSize) }));
        const cards = [...element.querySelectorAll('article')].map(card => ({ width: card.getBoundingClientRect().width, text: card.innerText }));
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, headings, cards, copy: element.innerText };
      }, section);
      assert.ok(measure.documentWidth <= width + 1, `${route}: overflow at ${width}`);
      if (section.startsWith('#')) {
        assert.ok(measure.headings.length > 2, `${route}: rendered choices`);
        for (const heading of measure.headings) assert.ok(heading.size >= 20, `${route}: readable heading ${heading.text}`);
        for (const card of measure.cards) assert.ok(card.width >= 260, `${route}: usable card width`);
        await page.$eval(section, element => element.scrollIntoView());
      } else {
        await page.evaluate(() => {
          const marker = [...document.querySelectorAll('main h2, main p')].find(element => element.textContent.includes('Looking for dog-friendly restaurants?') || element.textContent.includes('Looking for a dog-friendly restaurant rather than a tasting stop?'));
          marker?.scrollIntoView({ block: 'center' });
        });
      }
      await page.screenshot({ path: `${output}/${route.split('/').filter(Boolean).at(-1)}-${width}.png` });
      results.push({ route, width, ...measure });
      console.log(`PASS ${route} at ${width}px`);
    }
    // Real reader links: winery -> dining -> dinner, including client navigation.
    await reader.load('/journal/dog-friendly-wineries-mornington-peninsula/');
    await page.$eval('main a[href="/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/"]', element => element.scrollIntoView({block: 'center'}));
    await page.click('main a[href="/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/"]');
    try {
      await reader.waitFor(() => location.pathname === '/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/' && document.querySelector('main')?.textContent.includes('Looking for dog-friendly restaurants?'), 'Dining guide loaded after winery link');
    } catch (error) {
      console.log(await page.evaluate(() => ({ href: location.href, headings: [...document.querySelectorAll('main h2')].map(h => h.textContent) })));
      throw error;
    }
    await page.$eval('main a[href="/eat/best-restaurants/#dinner"]', element => element.scrollIntoView({block: 'center'}));
    await reader.waitFor(() => {
      const element = document.querySelector('main a[href="/eat/best-restaurants/#dinner"]');
      const box = element?.getClientRects()[0];
      return box && document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('a') === element;
    }, 'Dinner link interactive after the view transition');
    await page.click('main a[href="/eat/best-restaurants/#dinner"]');
    await reader.waitFor(() => location.pathname === '/eat/best-restaurants/' && Boolean(document.querySelector('#dinner')), 'Dinner comparison loaded after dining link', null, { describe: () => ({ href: location.href, title: document.title }) });
    assert.ok(await page.$('#dinner a[href="/eat/the-rocks-mornington/"]'), 'dinner choice after navigation');
    console.log(`PASS meal discovery navigation at ${width}px`);
  }
} finally {
  await site.close();
}
fs.writeFileSync(`${output}/browser-acceptance.json`, JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2));
