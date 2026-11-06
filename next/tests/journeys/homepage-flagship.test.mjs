import test from 'node:test';
import assert from 'node:assert/strict';
import { Site, DIST } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { isOriginalIllustration } from '../../src/lib/illustration-presentation.mjs';
import { originalArtProvenance, matchesOriginalArtProvenance } from '../../src/lib/original-art-provenance.mjs';
import { hasOriginalArtProvenance } from '../../../ops/scripts/lib/original-art-figure.mjs';
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



test('homepage original vector art is static without scripts and supports pause and reduced motion',async()=>{
  const reader=await site.reader();
  try {
    await reader.load('/');
    assert.equal(await reader.page.$('.home-cover__plate img'),null);
    assert.equal(await reader.page.$('.home-cover__plate figcaption'),null);
    await reader.page.click('[data-coastal-motion]');
    assert.equal(await reader.page.$eval('[data-coastal-art]',e=>e.dataset.paused),'true');
    await reader.page.click('[data-coastal-motion]');
    assert.equal(await reader.page.$eval('[data-coastal-art]',e=>e.dataset.paused),'false');
    await reader.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await reader.waitFor(()=>document.querySelector('[data-coastal-motion]').hidden,'motion control must hide when OS motion is reduced');
    assert.equal(await reader.page.$eval('[data-coastal-art] .boat',e=>getComputedStyle(e).animationName),'none');
    await reader.page.setJavaScriptEnabled(false);
    await reader.page.goto(site.origin+'/',{waitUntil:'domcontentloaded'});
    assert.deepEqual(await reader.page.$eval('[data-coastal-art]',e=>[e.dataset.period,e.dataset.paused]),['morning','true']);
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
    assert.ok(sources.length<=6,JSON.stringify(sources));
    if(!sources.length){
      const empty=await reader.page.$eval('[data-event-promotion-empty]',node=>({hidden:node.hidden,text:node.textContent,href:node.querySelector('a')?.getAttribute('href')}));
      assert.equal(empty.hidden,false);assert.match(empty.text,/No verified event picks remain for this weekend/);assert.equal(empty.href,'/whats-on/?date=next-weekend');
      assert.equal(await reader.page.$eval('[data-event-promotion-content]',node=>node.hidden),true);return;
    }
    assert.equal(await reader.page.$eval('[data-event-promotion-empty]',node=>node.hidden),true);
    assert.ok(sources.every(s=>/Event details checked \d{1,2} \w+ \d{4}/.test(s.text??'')),JSON.stringify(sources));
    assert.ok(sources.every(s=>s.url?.startsWith('https://')&&!new URL(s.url).hostname.endsWith('peninsulainsider.com.au')),JSON.stringify(sources));
    const browse=await reader.page.$$eval('.home-weekend__browse a',els=>els.map(e=>e.getAttribute('href')));
    assert.deepEqual(browse,['/whats-on/?date=today','/whats-on/?date=tomorrow','/whats-on/?date=next-weekend','/whats-on/']);
  }finally{await reader.close();}
});


test('town markers and labels share real area links, keyboard focus and mobile tap areas',async()=>{
 const reader=await site.reader();
 try{
  for(const width of [320,390,1440]){
   await reader.page.setViewport({width,height:844});await reader.load('/');
   const links=await reader.page.$$eval('.home-orientation__town-link',els=>els.map(e=>{const hit=e.querySelector('rect').getBoundingClientRect();return {href:e.getAttribute('href'),name:e.getAttribute('aria-label'),width:hit.width,height:hit.height};}));
   const adjacent=await reader.page.$$eval('.home-orientation__areas h3 a',els=>els.map(e=>e.getAttribute('href')));
   assert.deepEqual(links.map(e=>e.href),adjacent);
   assert.ok(links.every(e=>e.name&&e.width>=44&&e.height>=44),JSON.stringify({width,links}));
   await reader.page.focus('.home-orientation__heading a');
   await reader.page.keyboard.press('Tab');
   assert.equal(await reader.page.$eval('.home-orientation__town-link',e=>e.matches(':focus-visible')),true);
  }
  await reader.page.keyboard.press('Enter');
  await reader.page.waitForFunction(()=>location.pathname==='/explore/places/mornington/');
  for(const part of ['.home-orientation__number','.home-orientation__town']){
   await reader.load('/');await reader.page.click('.home-orientation__town-link '+part);
   await reader.page.waitForFunction(()=>location.pathname==='/explore/places/mornington/');
  }
 }finally{await reader.close();}
});


test('compact weekend grid uses the available row and keeps full reasons readable',async()=>{
 const reader=await site.reader();
 try{
  await reader.page.setViewport({width:1440,height:1000});await reader.load('/');
  const desktop=await reader.page.$eval('.home-weekend__scroller',e=>{const grid=e.querySelector('ul');const cards=[...grid.children].filter(c=>!c.hidden);return {count:cards.length,right:grid.getBoundingClientRect().right,lastRight:cards.at(-1)?.getBoundingClientRect().right,reasons:[...e.querySelectorAll('.pi-card__dek')].map(p=>({scroll:p.scrollHeight,client:p.clientHeight,clamp:getComputedStyle(p).webkitLineClamp}))};});
  if(desktop.count===2)assert.ok(Math.abs(desktop.right-desktop.lastRight)<2,JSON.stringify(desktop));
  assert.ok(desktop.reasons.every(p=>p.scroll<=p.client+1&&p.clamp==='none'),JSON.stringify(desktop));
  await reader.page.setViewport({width:390,height:844});
  const captions=await reader.page.$$eval('.home-orientation figcaption,.home-orientation__credit,.home-orientation__areas p',els=>els.map(e=>parseFloat(getComputedStyle(e).fontSize)));
  assert.ok(captions.every(size=>size>=15),JSON.stringify(captions));
 }finally{await reader.close();}
});


test('Explore fallback caption uses the actual source expression and preserves photo limitations', async () => {
  const source = readFileSync(new URL('../../src/pages/explore/index.astro', import.meta.url), 'utf8');
  const expression = source.match(/image=\{\{ src: item\.hero\.src, alt: item\.hero\.alt, caption: (.+) \}\}/)?.[1];
  assert.ok(expression, 'Actual Explore card caption expression must be present');
  const provenanceSource = readFileSync(new URL('../../src/lib/media-provenance.ts', import.meta.url), 'utf8');
  const { illustrativeDisclosure } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(provenanceSource)).toString('base64'));
  const actual = new Function('item', 'isOriginalIllustration', 'illustrativeDisclosure', `return (${expression});`);
  const photo = { src: '/images/sourced/context.webp', depictionStatus: 'illustrative', depicts: 'a bay beach', credit: 'Peninsula Insider' };
  const render = (image, override = undefined) => actual({ name: 'Eagle Ridge Golf Course', hero: { override }, data: { heroImage: image } }, isOriginalIllustration, illustrativeDisclosure);
  assert.equal(render(photo), 'This image shows a bay beach. It does not depict Eagle Ridge Golf Course.');
  assert.equal(render({ ...photo, depicts: undefined }), 'This image does not depict Eagle Ridge Golf Course.');
  assert.equal(render({ ...photo, src: '/images/generated/original.webp', credit: 'Illustration: Peninsula Insider' }), undefined);
  assert.equal(render(photo, { src: '/approved-cms-photo.webp' }), undefined);
  assert.equal(render({ ...photo, depictionStatus: 'unverified' }), 'Image subject unverified');
  assert.equal(render({ ...photo, depictionStatus: 'actual' }), undefined);
  assert.equal(render(undefined), undefined);
});

test('Explore source photographs retain their truthful subject limitation on rendered shelves', async (t) => {
  const reader = await site.reader();
  try {
    await reader.load('/explore/');
    const cards = await reader.page.$$eval('.x-shelf .pi-card', cards => cards.map(card => {
      const image = card.querySelector('img');
      return {
        slug: card.querySelector('.pi-card__link')?.dataset.entitySlug,
        source: image?.getAttribute('data-pi-image-original-src') || image?.getAttribute('src'),
        note: card.querySelector('.pi-card__image-note')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      };
    }));
    assert.ok(cards.length > 0, 'Explore shelves were not rendered');
    const sourceIdentity = value => {
      const url = new URL(value, 'https://peninsulainsider.com.au');
      if (/^[a-f0-9]{8}$/i.test(url.searchParams.get('v') || '')) url.searchParams.delete('v');
      return url.href;
    };
    let contextChecks = 0;
    for (const card of cards) {
      const record = JSON.parse(readFileSync(join(DIST, '..', 'src', 'content', 'experiences', `${card.slug}.json`), 'utf8'));
      const image = record.heroImage;
      // A CMS replacement is a different photograph. Never describe it using
      // the source record or manufacture a warning on an approved override.
      if (!image?.src || !card.source || sourceIdentity(card.source) !== sourceIdentity(image.src)) continue;
      if (isOriginalIllustration(image)) {
        assert.equal(card.note, '', `${card.slug}: original artwork must not regain a disclosure caption`);
      } else if (image.depictionStatus === 'illustrative') {
        contextChecks += 1;
        assert.ok(card.note.includes(`It does not depict ${record.name}.`) || card.note.includes(`This image does not depict ${record.name}.`), `${card.slug}: missing context-photo warning`);
        if (image.depicts?.trim()) {
          assert.ok(card.note.includes(image.depicts.trim().replace(/[.!?]+$/, '')), `${card.slug}: recorded photographed subject missing`);
        }
      } else if (image.depictionStatus === 'unverified') {
        assert.ok(card.note.includes('Image subject unverified'), `${card.slug}: unverified-image warning missing`);
      }
    }
    if (contextChecks === 0) t.skip('No source context photograph selected; CMS replacements do not exercise fallback coverage');
    else t.diagnostic(`Verified ${contextChecks} rendered source context-photo warnings`);
  } finally { await reader.close(); }
});


test('built Market hero keeps validated original-art provenance without visible art labels', async () => {
  const record = JSON.parse(readFileSync(new URL('../../src/content/events/mornington-racecourse-market.json', import.meta.url), 'utf8'));
  assert.equal(record.heroImage.src, '/images/generated/coastal-punch-mornington.webp');
  const expected = originalArtProvenance(record.heroImage);
  assert.match(expected, /^sha256:[a-f0-9]{64}$/, 'the checked-in Market record must establish original-art rights');
  const reader = await site.reader();
  try {
    for (const width of [390, 1440]) {
      await reader.page.setViewport({ width, height: 900 });
      await reader.load('/whats-on/mornington-racecourse-market/');
      for (const state of ['cold load', 'client return']) {
        if (state === 'client return') {
          await reader.navigate('/wine/');
          await reader.navigate('/whats-on/mornington-racecourse-market/');
        }
        await reader.waitFor(() => {
          const image = document.querySelector('.event-detail__image img');
          return image?.complete && image.naturalWidth > 0;
        }, 'reviewed Market artwork did not load');
        const hero = await reader.page.$eval('.event-detail__image', figure => {
          const image = figure.querySelector('img');
          const style = getComputedStyle(image);
          const box = image.getBoundingClientRect();
          return {
            html: figure.outerHTML,
            fingerprint: figure.getAttribute('data-pi-original-art'),
            currentSrc: image.currentSrc,
            alt: image.getAttribute('alt'),
            text: figure.innerText.trim(),
            displayed: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0,
          };
        });
        const context = `${width}px ${state}`;
        assert.equal(hero.fingerprint, expected, `${context}: reviewed fingerprint survives rendering/navigation`);
        assert.equal(hasOriginalArtProvenance(hero.html, record.heroImage, reader.page.url()), true, `${context}: live verifier accepts the actual built figure`);
        assert.equal(matchesOriginalArtProvenance(hero.fingerprint, { src: hero.currentSrc, alt: hero.alt }, record.heroImage, reader.page.url()), true,
          `${context}: the browser-selected image, not just a data attribute, is the reviewed artwork`);
        assert.ok(hero.displayed, `${context}: artwork is visibly rendered`);
        assert.equal(hero.text, '', `${context}: no original-art label, credit or caption is visible`);
        assert.ok(!hero.html.includes(record.heroImage.permission), `${context}: internal permission note stays out of page HTML`);
        assert.ok(!hero.html.includes(record.heroImage.creator), `${context}: internal creator record stays out of page HTML`);
      }
    }
  } finally { await reader.close(); }
});
