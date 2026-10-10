import test from 'node:test';
import assert from 'node:assert/strict';
import { Site } from './harness.mjs';
const site = await Site.open();
test.after(() => site.close());

test('homepage first visit offers a visible action, early orientation and no motion download at 320, 390 and 1440', async () => {
  for (const width of [320, 390, 1440]) {
    const reader = await site.reader();
    const videos = [];
    try {
      await reader.page.setViewport({width,height:844});
      await reader.page.evaluateOnNewDocument(() => localStorage.removeItem('pi-consent-v1'));
      reader.page.on('request', request => { if (/\.(mp4|webm)(\?|$)/i.test(request.url())) videos.push(request.url()); });
      await reader.load('/');
      await reader.page.evaluate(() => document.fonts.ready);
      const layout = await reader.page.evaluate(() => ({
        overflow:document.documentElement.scrollWidth > innerWidth + 1,
        h1:document.querySelectorAll('main h1').length,
        action:document.querySelector('.home-cover__actions a').getBoundingClientRect().bottom,
        chooser:document.querySelector('#home-choose').getBoundingClientRect().top,
        orientation:document.querySelector('.home-orientation').getBoundingClientRect().top,
        heroSize:parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize),
        motion:document.querySelectorAll('main video').length,
        cookie:document.querySelector('#cookie-banner')?.getAttribute('data-state'),
      }));
      assert.equal(layout.overflow,false,JSON.stringify(layout));
      assert.equal(layout.h1,1);
      assert.equal(layout.cookie,'visible');
      assert.ok(layout.action < 720,`primary action obscured at ${width}: ${JSON.stringify(layout)}`);
      assert.ok(layout.chooser < 844,`chooser starts below first screen at ${width}`);
      assert.ok(layout.orientation < 1688,`orientation starts beyond two screens at ${width}`);
      assert.ok(layout.heroSize <= 64);
      assert.equal(layout.motion,0);
      assert.deepEqual(videos,[]);
      await reader.page.focus('.home-cover__actions a');
      await reader.page.keyboard.press('Enter');
      await reader.waitFor(() => location.hash === '#home-choose','chooser anchor did not activate');
      const top=await reader.page.$eval('#home-choose',e=>e.getBoundingClientRect().top);
      assert.ok(top>=80 && top<250,`chooser is obscured by sticky navigation at ${width}: ${top}`);
    } finally { await reader.close(); }
  }
});

test('native homepage chooser carries independent choices to the existing matcher and its usable family itinerary',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/');
    await reader.page.select('.home-choose select[name="length"]','one-day');
    await reader.page.select('.home-choose select[name="who"]','family');
    await reader.page.focus('.home-choose button');
    await reader.page.keyboard.press('Enter');
    await reader.waitFor(()=>location.pathname==='/explore/plans/'&&document.querySelector('[data-plan-card="0"] [data-slot="title"]')?.textContent.toLowerCase().includes('family'),'family plan not selected');
    assert.equal(new URL(reader.page.url()).searchParams.get('length'),'one-day');
    assert.equal(new URL(reader.page.url()).searchParams.get('who'),'family');
    assert.equal(await reader.page.$eval('select[name="length"]',e=>e.value),'one-day');
    assert.equal(await reader.page.$eval('select[name="who"]',e=>e.value),'family');
    assert.match(await reader.page.$eval('[data-plan-card="0"] .plan-recommendation__preview',e=>e.textContent),/Eagle tickets/);
    assert.equal(reader.supabaseCalls().filter(call=>['POST','PUT','PATCH','DELETE'].includes(call.method)).length,0);
  }finally{await reader.close();}
});

test('homepage chooser remains a usable HTML form without JavaScript',async()=>{
  const reader=await site.reader();
  try {
    await reader.page.setJavaScriptEnabled(false);
    await reader.page.goto(site.origin+'/',{waitUntil:'domcontentloaded'});
    await reader.page.select('.home-choose select[name="length"]','one-day');
    await Promise.all([reader.page.waitForNavigation({waitUntil:'domcontentloaded'}),reader.page.click('.home-choose button')]);
    assert.equal(new URL(reader.page.url()).pathname,'/explore/plans/');
    assert.equal(new URL(reader.page.url()).searchParams.get('length'),'one-day');
    assert.ok(await reader.page.$$eval('[data-plan-row]',rows=>rows.length)>0,'published catalogue unavailable without scripts');
  }finally{await reader.close();}
});

test('homepage Journal photograph failure recovers both image and matching caption',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/');
    const original=await reader.page.$eval('.home-journal img',e=>e.getAttribute('src'));
    await reader.page.$eval('.home-journal img',e=>{e.scrollIntoView();e.removeAttribute('srcset');e.src='/images/missing-home-journal-regression.webp';});
    await reader.waitFor(()=>{const image=document.querySelector('.home-journal img');return image.complete&&image.naturalWidth>0&&image.getAttribute('src')!=='/images/missing-home-journal-regression.webp';},'Journal failed to recover');
    const result=await reader.page.$eval('.home-journal__media',e=>({src:e.querySelector('img').getAttribute('src'),alt:e.querySelector('img').alt,caption:e.querySelector('[data-journal-image-caption]').textContent,credit:e.querySelector('[data-journal-image-credit]').textContent}));
    assert.notEqual(result.src,original);
    assert.ok(result.alt.trim());assert.ok(result.caption.trim());assert.ok(result.credit.trim());
    assert.doesNotMatch(result.caption,/Montalto/,'failed photograph caption retained on recovery');
  }finally{await reader.close();}
});

test('homepage newsletter explains invalid input and recovers from a rejected subscription using a network fixture',async()=>{
  const reader=await site.reader({supabase:[{match:'/functions/v1/pi-newsletter-subscribe',method:'POST',status:503,body:{ok:false}}]});
  try {
    await reader.load('/');
    const form='.home-dispatch .v2-newsletter__form';
    await reader.page.focus(form+' button');await reader.page.keyboard.press('Enter');
    await reader.waitFor(()=>document.querySelector('.home-dispatch [aria-invalid="true"]'),'missing invalid email feedback');
    assert.equal(reader.supabaseCalls().filter(call=>call.method==='POST').length,0);
    await reader.page.type(form+' input[type="email"]','homepage-fixture@example.test');
    await reader.page.focus(form+' button');await reader.page.keyboard.press('Enter');
    await reader.waitFor(()=>document.querySelector('.home-dispatch .v2-newsletter__status')?.textContent==='Something went wrong. Please try again.','missing recoverable server error');
    assert.equal(await reader.page.$eval(form+' button',e=>e.disabled),false);
    assert.equal(await reader.page.$eval(form+' input[type="email"]',e=>e.value),'homepage-fixture@example.test');
    reader.setSupabase([{match:'/functions/v1/pi-newsletter-subscribe',method:'POST',status:200,body:{ok:true}}]);
    await reader.page.focus(form+' button');await reader.page.keyboard.press('Enter');
    await reader.waitFor(()=>document.querySelector('.home-dispatch .v2-newsletter__status')?.textContent.startsWith("You're in."),'fixture success feedback missing');
    assert.equal(await reader.page.$eval(form+' input[type="email"]',e=>e.disabled),true);
    assert.equal(reader.supabaseCalls().filter(call=>call.method==='POST'&&call.url.includes('pi-newsletter-subscribe')).length,2);
  }finally{await reader.close();}
});



test('failed AVIF download falls back to the original WebP variants without changing credits',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/');
    const before=await reader.page.$eval('.home-cover__plate',e=>({alt:e.querySelector('img').alt,caption:e.querySelector('figcaption').textContent}));
    assert.ok(await reader.page.$('.home-cover__plate source[data-pi-avif-source]'));
    await reader.page.$eval('.home-cover__plate source',e=>{e.srcset='/images/missing-avif-regression.avif 800w';});
    await reader.waitFor(()=>{const img=document.querySelector('.home-cover__media');return img.complete&&img.naturalWidth>0&&img.currentSrc.includes('.webp')&&!img.closest('picture').querySelector('source[data-pi-avif-source]');},'native WebP did not recover');
    const after=await reader.page.$eval('.home-cover__plate',e=>({alt:e.querySelector('img').alt,caption:e.querySelector('figcaption').textContent}));
    assert.deepEqual(after,before);
  }finally{await reader.close();}
});

test('homepage town labels remain legible and inside their diagram at narrow widths',async()=>{
  const reader=await site.reader();
  try {
    for(const width of [320,390,768,1440]){
      await reader.page.setViewport({width,height:844});await reader.load('/');await reader.page.evaluate(()=>document.fonts.ready);
      const labels=await reader.page.$$eval('.home-orientation__town',els=>els.map(e=>{const diagram=e.closest('svg').getBoundingClientRect(),box=e.getBoundingClientRect();return {name:e.textContent,font:parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a,inside:box.left>=diagram.left-1&&box.right<=diagram.right+1&&box.top>=diagram.top-1&&box.bottom<=diagram.bottom+1};}));
      assert.equal(labels.length,3);assert.ok(labels.every(l=>l.font>=12&&l.inside),JSON.stringify({width,labels}));
      const layout=await reader.page.$eval('.home-orientation__diagram',figure=>{const svg=figure.querySelector('svg').getBoundingClientRect(),caption=figure.querySelector('figcaption').getBoundingClientRect(),nodes=[...figure.querySelectorAll('text')].map(e=>({name:e.textContent,box:e.getBoundingClientRect()}));const overlaps=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i].box,b=nodes[j].box,area=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));if(area>0)overlaps.push([nodes[i].name,nodes[j].name,area]);}return {captionBelow:caption.top>=svg.bottom-1,overlaps};});
      assert.ok(layout.captionBelow,JSON.stringify({width,layout}));assert.deepEqual(layout.overlaps,[],JSON.stringify({width,layout}));
    }
  }finally{await reader.close();}
});

test('homepage weekend picks show the recorded check dates and direct official source links',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/');
    const sources=await reader.page.$$eval('.home-weekend [data-event-promotion]',els=>els.map(card=>({text:card.querySelector('.home-weekend__source')?.textContent.trim(),url:card.querySelector('.home-weekend__source a')?.href})));
    assert.ok(sources.length>=1&&sources.length<=3,JSON.stringify(sources));
    assert.ok(sources.every(s=>/Event details checked \d{1,2} \w+ \d{4}/.test(s.text??'')),JSON.stringify(sources));
    assert.ok(sources.every(s=>s.url?.startsWith('https://')&&!new URL(s.url).hostname.endsWith('peninsulainsider.com.au')),JSON.stringify(sources));
    const hint=await reader.page.$eval('[data-event-promotion-multi-hint]',el=>({hidden:el.hidden,text:el.textContent.trim()}));
    assert.equal(hint.hidden,sources.length<2);
    assert.doesNotMatch(hint.text,/all three/i);
  }finally{await reader.close();}
});
