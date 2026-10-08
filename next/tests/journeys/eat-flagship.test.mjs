import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';
const site = await Site.open();
test.after(() => site.close());
const visibleRows = () => [...document.querySelectorAll('#directory .v5-directory__row')].filter(el => el.getBoundingClientRect().height > 0).length;

test('Eat search composes with category and town, survives reload and clears', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/eat/');
    await reader.page.select('#eat-category', 'cafe');
    await reader.page.select('#eat-town', 'mornington');
    await reader.page.type('#eat-find', 'commonfolk');
    await reader.waitFor(() => [...document.querySelectorAll('#directory .v5-directory__row')].filter(el => !el.hidden && el.getBoundingClientRect().height > 0).length === 1, 'combined search');
    assert.match(await reader.page.$eval('#directory .v5-directory__row:not([hidden]):not([data-page-hidden])', el => el.textContent), /Commonfolk/);
    await reader.page.reload({ waitUntil: 'networkidle0' });
    assert.equal(await reader.page.$eval('#eat-find', el => el.value), 'commonfolk');
    assert.equal(await reader.page.evaluate(visibleRows), 1);
    await reader.page.$eval('#eat-find', el => { el.value='no-such-place'; el.dispatchEvent(new Event('input', {bubbles:true})); });
    assert.equal(await reader.page.evaluate(visibleRows), 0);
    await reader.page.$eval('[data-filter-clear]', el => el.click());
    await reader.waitFor(() => document.querySelector('#eat-find').value === '' && !location.search.includes('find='), 'clear search');
    assert.equal(await reader.page.evaluate(visibleRows), 8);
  } finally { await reader.close(); }
});

test('progressive directory exposes every place and preserves keyboard context', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/eat/');
    assert.equal(await reader.page.evaluate(visibleRows), 8);
    await reader.page.$eval('[data-directory-more]', el => el.click());
    assert.equal(await reader.page.evaluate(visibleRows), 16);
    await reader.page.$eval('[data-directory-all]', el => el.click());
    assert.equal(await reader.page.evaluate(visibleRows), 52);
    assert.equal(await reader.page.evaluate(() => document.activeElement.id), 'directory-heading');
    await reader.page.setJavaScriptEnabled(false);
    await reader.page.reload({waitUntil:'networkidle0'});
    assert.equal(await reader.page.evaluate(visibleRows), 52);
  } finally { await reader.close(); }
});

test('all eight anchor pages share readable mobile typography without overflow', async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({width:390,height:844});
    for (const route of ['/', '/eat/', '/stay/', '/wine/', '/explore/', '/plans/', '/whats-on/', '/journal/']) {
      await reader.load(route);
      const style = await reader.page.evaluate(() => {
        const title=getComputedStyle(document.querySelector('main h1'));
        return {font:title.fontFamily,size:parseFloat(title.fontSize),weight:title.fontWeight,body:getComputedStyle(document.querySelector('main')).fontFamily,overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      assert.match(style.font,/Sora/,route);
      assert.match(style.body,/Figtree/,route);
      assert.equal(style.weight,'600',route);
      assert.equal(style.overflow,false,route);
      assert.ok(await reader.page.$$eval('main h2', hs => hs.every(h => parseFloat(getComputedStyle(h).fontSize) <= 28)), `${route}: mobile section hierarchy`);
      const proseFonts = await reader.page.$$eval('main p', ps => ps.filter(p => p.getBoundingClientRect().height > 0).map(p => getComputedStyle(p).fontFamily));
      assert.ok(proseFonts.every(font => font.includes('Figtree')), `${route}: ${proseFonts.join(', ')}`);
      if(route !== '/') assert.equal(style.size,32,route);
      if(route === '/eat/') assert.ok(await reader.page.$eval('.eat-finder__form button', el => el.getBoundingClientRect().bottom <= innerHeight), 'first-visit finder action fits the mobile screen');
    }
  } finally { await reader.close(); }
});

test('desktop section headings remain below the common anchor title scale', async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({width:1440,height:1000});
    for(const route of ['/', '/eat/', '/stay/', '/wine/', '/explore/', '/plans/', '/whats-on/', '/journal/']) {
      await reader.load(route);
      if(route !== '/') assert.equal(await reader.page.$eval('main h1', h => parseFloat(getComputedStyle(h).fontSize)),48,route);
      assert.ok(await reader.page.$$eval('main h2', hs => hs.every(h => parseFloat(getComputedStyle(h).fontSize) <= 32)), `${route}: desktop section hierarchy`);
    }
  } finally { await reader.close(); }
});
