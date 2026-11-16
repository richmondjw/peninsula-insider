import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Site, DIST } from './harness.mjs';

const site = await Site.open();
test.after(() => site.close());
const directory = path.join(DIST, 'explore/plans');
const routes = fs.readdirSync(directory, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .filter(entry => /class="[^\"]*\bitinerary-detail__cover-band\b[^\"]*"/.test(fs.readFileSync(path.join(directory, entry.name, 'index.html'), 'utf8')))
  .map(entry => `/explore/plans/${entry.name}/`);

test('itinerary time labels keep clear of stop titles across the tablet breakpoints', async () => {
  assert.ok(routes.length >= 6, 'exercise every structured itinerary');
  const reader = await site.reader();
  try {
    const viewports = [390, 600, 601, 640, 768, 769, 1440].map(width => ({ width, scale: 1 }));
    viewports.push({ width: 768, scale: 3 });
    for (const { width, scale } of viewports) {
      await reader.page.setViewport({ width, height: 900 });
      for (const route of routes) {
        await reader.load(route);
        if (scale === 3) await reader.page.evaluate(() => { document.documentElement.dataset.textScale = '3'; });
        await reader.page.evaluate(() => document.fonts.ready);
        const pairs = await reader.page.$$eval('.itinerary-detail .stop-item', stops => stops.map(stop => {
          const time = stop.querySelector('.stop-item__time');
          const title = stop.querySelector('.stop-item__name');
          if (!time || !title) return null;
          // Measure the printed label, not its grid box: the reported defect
          // lets the text overflow a correctly separated but undersized cell.
          const range = document.createRange();
          range.selectNodeContents(time);
          const label = range.getBoundingClientRect();
          const heading = title.getBoundingClientRect();
          return { label: time.textContent.trim(), title: title.textContent.trim(),
            horizontalGap: heading.left - label.right, verticalGap: heading.top - label.bottom };
        }).filter(Boolean));
        assert.ok(pairs.length, `${route}: no labelled stops tested`);
        for (const pair of pairs) assert.ok(pair.horizontalGap >= 8 || pair.verticalGap >= 0,
          `${route} at ${width}px, text scale ${scale}: ${pair.label} collides with ${pair.title} (${JSON.stringify(pair)})`);
      }
    }
  } finally { await reader.close(); }
});
