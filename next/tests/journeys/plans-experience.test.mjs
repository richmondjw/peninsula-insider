import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';
const site = await Site.open();
test.after(() => site.close());

test('matcher retains independent constraints and explains each partial recommendation', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/explore/plans/');
    await reader.page.click('[data-plan-matcher] summary');
    await reader.page.select('select[name="length"]','one-day');
    await reader.page.select('select[name="who"]','family');
    await reader.page.select('select[name="weather"]','rainy-day');
    await reader.page.click('[data-build-go]');
    await reader.waitFor(() => document.querySelector('[data-plan-results-heading]')?.textContent === 'Your closest itineraries','expected partial matches');
    assert.equal(await reader.page.$eval('select[name="length"]',e=>e.value),'one-day');
    assert.equal(await reader.page.$eval('select[name="who"]',e=>e.value),'family');
    assert.equal(await reader.page.$eval('select[name="weather"]',e=>e.value),'rainy-day');
    const first = await reader.page.$eval('[data-plan-card="0"]',e=>({ title:e.querySelector('[data-slot="title"]').textContent, matched:e.querySelector('[data-slot="matched"]').textContent, missing:e.querySelector('[data-slot="missing"]').textContent }));
    assert.match(first.title,/family/i);
    assert.match(first.matched,/One day/);
    assert.match(first.missing,/Wet-weather/);
    assert.equal(await reader.page.evaluate(()=>document.activeElement?.id),'plan-engine-heading');
    assert.equal(new URL(reader.page.url()).searchParams.get('weather'),'rainy-day');
    await reader.page.click('[data-build-clear]');
    await reader.waitFor(()=>document.querySelector('[data-plan-results-heading]')?.textContent==='A good place to start','reset did not restore editorial picks');
    assert.equal(await reader.page.$eval('select[name="weather"]',e=>e.value),'');
    assert.equal(new URL(reader.page.url()).search,'');
    await reader.page.goBack();
    await reader.waitFor(()=>document.querySelector('select[name="weather"]')?.value==='rainy-day','back did not restore matcher state');
    assert.match(await reader.page.$eval('[data-plan-card="0"] [data-slot="missing"]',e=>e.textContent),/Wet-weather/);
  } finally { await reader.close(); }
});

test('legacy context links are restored into the single matcher and an honest empty answer',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/explore/plans/?context=rainy-day');
    assert.equal(await reader.page.$eval('select[name="weather"]',e=>e.value),'rainy-day');
    assert.equal(await reader.page.$eval('[data-plan-matcher]',e=>e.open),true);
    assert.equal(await reader.page.$eval('[data-plan-empty]',e=>e.hidden),false);
    assert.equal(await reader.page.$$eval('[data-plan-card]:not([hidden])',els=>els.length),0);
    assert.ok(await reader.page.$$eval('[data-plan-row]',els=>els.length)>0,'the complete catalogue remains available');
    assert.equal(await reader.page.$$eval('[data-plan-context]',els=>els.length),0,'no competing context strip');
    assert.equal(await reader.page.$eval('[data-plan-guide-suggestion]',e=>e.hidden),false);
    assert.match(await reader.page.$eval('[data-plan-guide-suggestion]',e=>e.textContent),/does not include a ready-made itinerary/);
  } finally { await reader.close(); }
});

test('a legacy season choice is visible, survives submit and can be cleared',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/explore/plans/?context=this-season');
    assert.equal(await reader.page.$eval('[data-plan-season-control]',e=>e.hidden),false);
    assert.equal(await reader.page.$eval('input[name="season"]',e=>e.checked),true);
    await reader.page.click('[data-build-go]');
    assert.equal(new URL(reader.page.url()).searchParams.get('season'),'current');
    await reader.page.click('input[name="season"]');
    await reader.page.click('[data-build-go]');
    assert.equal(new URL(reader.page.url()).searchParams.has('season'),false);
  } finally { await reader.close(); }
});

test('guide disclosure is native and works without JavaScript',async()=>{
  const reader=await site.reader();
  try {
    await reader.page.setJavaScriptEnabled(false);
    // The regular harness load waits for Astro's JavaScript page-load event.
    // This case deliberately checks native HTML with scripts disabled.
    await reader.page.goto(site.origin + '/explore/plans/', { waitUntil: 'domcontentloaded' });
    assert.equal(await reader.page.$eval('.plan-guides__more',e=>e.open),false);
    await reader.page.click('.plan-guides__more summary');
    assert.equal(await reader.page.$eval('.plan-guides__more',e=>e.open),true);
    assert.ok(await reader.page.$$eval('.plan-guides__more [data-plan-guide] a[href]',els=>els.length)>0);
  } finally { await reader.close(); }
});

test('recommendation image swaps preserve the right original and never retain another plan srcset',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/explore/plans/');
    const initial=await reader.page.$$eval('[data-plan-card] [data-slot="image"]',els=>els.map(image=>({slug:image.dataset.piEntitySlug,original:image.dataset.piImageOriginalSrc,srcset:image.srcset})));
    assert.ok(initial[0].srcset,'featured image should have responsive build variants');
    const familyImage=initial.find(image=>image.slug==='the-family-day-out');
    assert.ok(familyImage?.srcset,'family image should be available for reuse in another card slot');
    await reader.page.click('[data-plan-matcher] summary');
    await reader.page.click('input[name="into"][value="golf"]');
    await reader.page.click('[data-build-go]');
    await reader.waitFor(()=>document.querySelector('[data-plan-card="0"] img')?.dataset.piEntitySlug==='the-peninsula-golf-weekend','golf image did not replace the default');
    assert.equal(await reader.page.$eval('[data-plan-card="0"] img',image=>image.srcset),'','uncached golf image must not keep the previous image variants');
    await reader.page.click('[data-build-clear]');
    await reader.page.select('select[name="length"]','one-day');
    await reader.page.select('select[name="who"]','family');
    await reader.page.click('[data-build-go]');
    const image=await reader.page.$eval('[data-plan-card="0"] img',image=>({slug:image.dataset.piEntitySlug,original:image.dataset.piImageOriginalSrc,srcset:image.srcset,sizes:image.sizes}));
    assert.equal(image.slug,'the-family-day-out');
    assert.equal(image.original,familyImage.original);
    assert.equal(image.srcset,familyImage.srcset);
    assert.match(image.sizes,/520px/,'the family image uses the featured slot size, not its original thumbnail size');
  } finally { await reader.close(); }
});

test('guide actions stay read-only and itinerary route previews show the actual stops',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/explore/plans/');
    const count=await reader.page.$eval('#pi-plans-data',e=>{ const plans=Object.values(JSON.parse(e.textContent).plans);return {guides:plans.filter(p=>p.kind==='guide').length,itineraries:plans.filter(p=>p.kind==='itinerary').length}; });
    assert.equal(await reader.page.$$eval('[data-plan-guide]',els=>els.length),count.guides);
    assert.equal(await reader.page.$$eval('[data-plan-guide] [data-plan-fork]',els=>els.length),0);
    assert.equal(await reader.page.$$eval('[data-plan-row]',els=>els.length),count.itineraries);
    await reader.page.click('[data-plan-card="0"] [data-slot="route"] summary');
    const days=await reader.page.$$eval('[data-plan-card="0"] [data-slot="days"] li',els=>els.map(e=>e.textContent));
    assert.ok(days.length>=1);
    assert.ok(days.every(text=>text.includes('Day')));
    assert.deepEqual(await reader.errors(),[]);
  } finally { await reader.close(); }
});
