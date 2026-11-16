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
  .filter(entry => fs.readFileSync(path.join(directory, entry.name, 'index.html'), 'utf8').includes('plan-page-frame'))
  .map(entry => `/explore/plans/${entry.name}/`);

test('every plan detail retains full-width bands and padded reading content', async () => {
  assert.ok(routes.length > 10, 'exercise the published catalogue, not a single fixture');
  const reader = await site.reader();
  try {
    for (const width of [320, 390, 768, 1440]) {
      await reader.page.setViewport({ width, height: 900 });
      for (const route of routes) {
        await reader.load(route);
        await reader.page.evaluate(() => document.fonts.ready);
        const measured = await reader.page.evaluate(() => {
          const rect = e => { const r=e.getBoundingClientRect(); return { left:r.left, right:r.right }; };
          const frame=document.querySelector('.plan-page-frame');
          return {
            viewport:innerWidth, scroll:document.documentElement.scrollWidth,
            bands:[...frame.querySelectorAll('.itinerary-detail__cover-band,.itinerary-route-band,.pl-cover')].map(rect),
            copy:[...frame.querySelectorAll('.itinerary-detail__intro,.itinerary-detail__main,.pl-cover__type,.pl-prose,.article > .container > .prose')].map(rect),
            frames:[...frame.querySelectorAll('.container,.pl-container')].map(e=>({ ...rect(e), padding:parseFloat(getComputedStyle(e).paddingLeft) })),
            brokenJumps:[...frame.querySelectorAll('.itinerary-detail__jumps a,.itinerary-route a,.pl-cover__actions a')].filter(a=>a.getAttribute('href')?.startsWith('#')).map(a=>a.getAttribute('href').slice(1)).filter(id=>!document.getElementById(decodeURIComponent(id)))
          };
        });
        const context=`${route} at ${width}px`;
        assert.ok(measured.scroll <= width, `${context}: horizontal overflow`);
        for (const band of measured.bands) {
          assert.ok(Math.abs(band.left)<1 && Math.abs(band.right-width)<1, `${context}: inset background`);
        }
        for (const copy of measured.copy) {
          assert.ok(copy.left>=23.5 && copy.right<=width-23.5, `${context}: reading gutter`);
        }
        for (const frame of measured.frames) assert.ok(frame.padding>=23.5, `${context}: unpadded inner frame`);
        assert.deepEqual(measured.brokenJumps, [], `${context}: broken cover/route anchors`);
      }
    }
  } finally { await reader.close(); }
});
