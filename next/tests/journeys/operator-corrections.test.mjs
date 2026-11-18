import test from 'node:test';
import assert from 'node:assert/strict';
import {Site, DIST} from './harness.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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

for (const width of [390, 1440]) {
  test(`Iluka facts, disclosure and booking survive rendering at ${width}px`, async () => {
    const reader = await site.reader({supabase:[{match:'cms_image_slots',body:[{field_path:'heroImage',public_url:'https://example.invalid/unreviewed-property.jpg',alt_text:null,credit:null}]}]});
    try {
      await reader.page.setViewport({width, height: 900});
      await reader.load('/stay/iluka-retreat/');
      const text = await reader.page.$eval('main', el => el.textContent);
      for (const fact of [/36 acres/, /Two group accommodation lodges/, /raised timber decks/, /tents are unpowered/, /Pets are not permitted/, /steep and uneven/, /does not mean exclusive use/, /Peninsula Insider editorial artwork. Property photography awaiting review/]) assert.match(text, fact);
      const image = await reader.page.$eval('.venue-detail__hero img', el => ({src:el.getAttribute('src'),loaded:el.complete && el.naturalWidth>0,hold:el.hasAttribute('data-pi-no-hydrate')}));
      const approvedSrc = '/images/editorial/journal-backstop.svg';
      // The build versions local assets with the first eight SHA-1 characters.
      const version = createHash('sha1').update(readFileSync(DIST + approvedSrc)).digest('hex').slice(0, 8);
      assert.ok([approvedSrc, `${approvedSrc}?v=${version}`].includes(image.src), 'approved local artwork with its actual content hash');
      assert.deepEqual({loaded:image.loaded, hold:image.hold}, {loaded:true, hold:true});
      assert.equal(await reader.page.$eval('.venue-detail__hero', el => el.hasAttribute('data-pi-no-hydrate')), true);
      const schemas = await reader.page.$$eval('script[type="application/ld+json"]', els => els.map(el => JSON.parse(el.textContent)));
      const business = schemas.flatMap(v => v['@graph'] ?? [v]).find(v => v['@type'] === 'LodgingBusiness');
      assert.ok(business);
      assert.match(business.description, /two group lodges/);
      assert.equal(Object.hasOwn(business, 'image'), false, 'illustration is not property photography in schema');
      assert.ok(await reader.page.$('main a[href="https://ilukaretreat.com.au/accommodation/glamping/"]'));
      assert.equal(await reader.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await reader.load('/stay/');
      assert.match(await reader.page.$eval('main', el => el.textContent), /Bell tents and two group lodges on 36 acres near Shoreham/);
    } finally { await reader.close(); }
  });
}
