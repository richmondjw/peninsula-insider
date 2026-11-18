import test from 'node:test';
import assert from 'node:assert/strict';
import {Site} from './harness.mjs';
const site = await Site.open();
test.after(() => site.close());

for (const width of [390, 1440]) {
  test(`operator corrections survive rendering and hydration at ${width}px`, async () => {
    const reader = await site.reader();
    try {
      await reader.page.setViewport({width, height: 900});
      for (const route of ['/stay/blue-moon-cottages/', '/stay/', '/stay/cottages/']) {
        await reader.load(route);
        const text = await reader.page.$eval('main', el => el.textContent);
        assert.match(text, /All (?:Blue Moon )?cottages (?:accept pets and )?have log fires and fully fenced courtyards/, route);
        assert.doesNotMatch(text, /Sandpiper has a log fire/, route);
        if (route === '/stay/blue-moon-cottages/') {
          const data = await reader.page.$$eval('script[type="application/ld+json"]', els => els.map(el => JSON.parse(el.textContent)));
          assert.match(JSON.stringify(data), /All cottages have log fires and fully fenced courtyards for pets/);
        }
      }
      await reader.load('/eat/flinders-sourdough/');
      assert.deepEqual(await reader.page.$$eval('main a[href^="tel:"]', els => els.map(el => el.href)), []);
      assert.doesNotMatch(await reader.page.$eval('main', el => el.textContent), /5989\s*0088/);
      const schemas = await reader.page.$$eval('script[type="application/ld+json"]', els => els.map(el => JSON.parse(el.textContent)));
      const business = schemas.flatMap(value => value['@graph'] ?? [value]).find(value => value.name === 'Flinders Sourdough');
      assert.ok(business, 'business JSON-LD exists');
      assert.equal(Object.hasOwn(business, 'telephone'), false);
      assert.ok(await reader.page.$('main a[href="https://flinderssourdough.com.au"]'), 'website remains available');
      await reader.load('/eat/');
      assert.ok(await reader.page.$('a[href="/eat/flinders-sourdough/"]'), 'bakery remains in directory');
      assert.doesNotMatch(await reader.page.$eval('main', el => el.textContent), /5989\s*0088/);
    } finally { await reader.close(); }
  });
}
