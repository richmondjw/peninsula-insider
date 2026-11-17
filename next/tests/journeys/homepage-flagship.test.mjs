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
        journal:document.querySelector('.home-journal')?.getBoundingClientRect().top ?? Infinity,
        heroSize:parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize),
        motion:document.querySelectorAll('main video').length,
        cookie:document.querySelector('#cookie-banner')?.getAttribute('data-state'),
      }));
      assert.equal(layout.overflow,false,JSON.stringify(layout));
      assert.equal(layout.h1,1);
      assert.equal(layout.cookie,'visible');
      assert.ok(layout.action < 720,`primary action obscured at ${width}: ${JSON.stringify(layout)}`);
      assert.ok(layout.chooser < 1000,`chooser starts below first screen at ${width}`);
      // 2026-11-10 (Phase 5): orientation follows Plan your day and This weekend;
      // it must still precede the Journal feature rather than sit within two screens.
      assert.ok(layout.orientation < layout.journal,`orientation falls below the Journal feature at ${width}`);
      assert.ok(layout.heroSize <= 96); assert.ok(layout.heroSize >= (width >= 1000 ? 80 : 44));
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

test('homepage hero CTA accepts pointer clicks and mobile taps on repeated visits', async () => {
  for (const mobile of [false, true]) {
    const reader = await site.reader();
    try {
      await reader.page.setViewport({ width: mobile ? 390 : 1440, height: 844, isMobile: mobile, hasTouch: mobile });
      for (let attempt = 0; attempt < 2; attempt++) {
        await reader.load('/');
        const exposed = await reader.page.$eval('.home-cover__actions a', link => {
          const box = link.getBoundingClientRect();
          return link.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        });
        assert.equal(exposed, true, 'decorative hero layer intercepts primary CTA');
        if (mobile) await reader.page.tap('.home-cover__actions a');
        else await reader.page.click('.home-cover__actions a');
        await reader.waitFor(() => location.hash === '#home-choose', 'pointer did not activate chooser');
        const top = await reader.page.$eval('#home-choose', e => e.getBoundingClientRect().top);
        assert.ok(top >= 80 && top < 250, `chooser obscured after pointer navigation: ${top}`);
      }
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
    const before=await reader.page.$eval('.home-cover__plate',e=>({alt:e.querySelector('img').alt,caption:e.querySelector('figcaption')?.textContent??''}));
    assert.ok(await reader.page.$('.home-cover__plate source[data-pi-avif-source]'));
    await reader.page.$eval('.home-cover__plate source',e=>{e.srcset='/images/missing-avif-regression.avif 800w';});
    await reader.waitFor(()=>{const img=document.querySelector('.home-cover__media');return img.complete&&img.naturalWidth>0&&img.currentSrc.includes('.webp')&&!img.closest('picture').querySelector('source[data-pi-avif-source]');},'native WebP did not recover');
    const after=await reader.page.$eval('.home-cover__plate',e=>({alt:e.querySelector('img').alt,caption:e.querySelector('figcaption')?.textContent??''}));
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
    const sources=await reader.page.$$eval('.home-weekend [data-event-promotion]:not([hidden])',els=>els.map(card=>({text:card.querySelector('.home-weekend__source')?.textContent.trim(),url:card.querySelector('.home-weekend__source a')?.href})));
    assert.ok(sources.length<=3,JSON.stringify(sources));
    if(!sources.length){
      const empty=await reader.page.$eval('[data-event-promotion-empty]',node=>({hidden:node.hidden,text:node.textContent,href:node.querySelector('a')?.getAttribute('href')}));
      assert.equal(empty.hidden,false);assert.match(empty.text,/No verified event picks remain for these dates/);assert.equal(empty.href,'/whats-on/?date=next-weekend');
      assert.equal(await reader.page.$$eval('[data-weekend-discovery]:not([hidden])',nodes=>nodes.length),3);
      assert.equal(await reader.page.$eval('[data-event-promotion-content]',node=>node.hidden),false);return;
    }
    assert.equal(await reader.page.$eval('[data-event-promotion-empty]',node=>node.hidden),true);
    assert.ok(sources.every(s=>/Event details checked \d{1,2} \w+ \d{4}/.test(s.text??'')),JSON.stringify(sources));
    assert.ok(sources.every(s=>s.url?.startsWith('https://')&&!new URL(s.url).hostname.endsWith('peninsulainsider.com.au')),JSON.stringify(sources));
    const hint=await reader.page.$eval('[data-event-promotion-multi-hint]',el=>({hidden:el.hidden,text:el.textContent.trim()}));
    assert.equal(hint.hidden,false);
    assert.doesNotMatch(hint.text,/all three/i);
  }finally{await reader.close();}
});

test('mobile arrival surfaces a real itinerary before the native planner without duplicating it', async()=>{
  const reader=await site.reader();
  try {
    await reader.page.setViewport({width:390,height:844});
    await reader.load('/');
    const result=await reader.page.evaluate(()=>{
      const invitation=document.querySelector('.home-cover__story');
      const link=invitation;
      const image=document.querySelector('.home-cover__media');
      return {bottom:invitation.getBoundingClientRect().bottom,formTop:document.querySelector('.home-choose__form').getBoundingClientRect().top,
        credit:document.querySelector('.home-cover__plate figcaption')?.textContent.trim(), alt:image.alt,
        duplicates:[...document.querySelectorAll('.home-plan__choices a')].filter(a=>a.href===link.href).length,
        labels:document.querySelectorAll('.home-choose__form label').length};
    });
    assert.ok(result.bottom<844,JSON.stringify(result));
    assert.ok(result.bottom<result.formTop);
    assert.ok(result.credit); assert.ok(result.alt);
    assert.equal(result.duplicates,0); assert.equal(result.labels,3);
    await reader.page.focus('.home-cover__story');
    const focus=await reader.page.$eval('.home-cover__story',e=>({focused:document.activeElement===e,outline:getComputedStyle(e).outlineStyle}));
    assert.equal(focus.focused,true); assert.notEqual(focus.outline,'none');
    await reader.page.keyboard.press('Enter');
    await reader.waitFor(()=>location.pathname.startsWith('/explore/plans/'),'featured itinerary did not open');
  } finally {await reader.close();}
});

test('homepage arrival reflows under 200 percent root text sizing', async()=>{
  const reader=await site.reader();
  try {
    await reader.page.setViewport({width:390,height:844}); await reader.load('/');
    await reader.page.addStyleTag({content:'html{font-size:200%!important}'});
    const result=await reader.page.evaluate(()=>({
      pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
      coverOverflow:document.querySelector('.home-cover').scrollWidth>innerWidth+1,
      invitationOverflow:document.querySelector('.home-cover__story').scrollWidth>innerWidth,
      labelled:[...document.querySelectorAll('.home-choose__form select')].every(e=>e.labels?.length)
    }));
    assert.equal(result.pageOverflow,false); assert.equal(result.coverOverflow,false);
    assert.equal(result.invitationOverflow,false); assert.equal(result.labelled,true);
  }finally{await reader.close();}
});

test('cinematic cover keeps discovery links accessible and does not enable concierge',async()=>{
 const reader=await site.reader();
 try{for(const width of [320,390,768,1440]){
 await reader.page.setViewport({width,height:900});await reader.load('/');
 const result=await reader.page.evaluate(()=>({
 links:[...document.querySelectorAll('.home-cover-paths a')].map(a=>({href:a.getAttribute('href'),height:a.getBoundingClientRect().height,width:a.getBoundingClientRect().width})),
 caption:document.querySelector('.home-cover__plate figcaption').textContent,
 creditColor:getComputedStyle(document.querySelector('.home-cover__plate figcaption')).color,
 concierge:document.querySelectorAll('[data-ask-pi-trigger]').length,
 picture:document.querySelector('.home-cover__media').naturalWidth
 }));
 assert.equal(result.links.length,4);assert.ok(result.links.every(l=>l.width>=44&&l.height>=44));assert.match(result.caption,/Peter Tarasiuk/);assert.ok(result.picture>0);
 await reader.page.focus('.home-cover-paths a');assert.equal(await reader.page.$eval('.home-cover-paths a',e=>document.activeElement===e),true);
 }}finally{await reader.close();}
});


test('weekend keeps three visible slots and unique loaded event imagery at desktop and mobile', async () => {
  for (const width of [390,1440]) {
    const reader=await site.reader();
    try {
      await reader.page.setViewport({width,height:900,deviceScaleFactor:width===390?2:1});
      await reader.load('/');
      await reader.page.$eval('#home-weekend', el=>el.scrollIntoView());
      for(const card of await reader.page.$$('#home-weekend [data-event-promotion]:not([hidden])')) {
        await card.evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
        await reader.page.waitForFunction(el=>{const img=el.querySelector('img');return img.complete&&img.naturalWidth>0;},{},card);
      }
      await reader.page.waitForFunction(()=>[...document.querySelectorAll('#home-weekend [data-event-promotion]:not([hidden]) img')].every(img=>img.complete && img.naturalWidth>0));
      const result=await reader.page.$eval('#home-weekend',section=>{
        const events=[...section.querySelectorAll('[data-event-promotion]:not([hidden])')];
        const discovery=[...section.querySelectorAll('[data-weekend-discovery]:not([hidden])')];
        return { loadedImages:events.map(el=>el.querySelector('img').currentSrc.split(/[?#]/)[0].replace(/-\d+\.(avif|webp)$/, '')), images:events.map(el=>el.getAttribute('data-weekend-image').split(/[?#]/)[0]), count:events.length+discovery.length, overflow:document.documentElement.scrollWidth>innerWidth+1, discoveryIsDated:discovery.some(el=>el.querySelector('[data-event-promotion],time,[data-v5-save-control]')), sparseHidden:section.querySelector('[data-weekend-sparse]').hidden };
      });
      assert.equal(result.count,3);
      assert.equal(new Set(result.images).size,result.images.length);
      assert.equal(new Set(result.loadedImages).size,result.loadedImages.length);
      assert.equal(result.overflow,false);
      assert.equal(result.discoveryIsDated,false);
      assert.equal(result.sparseHidden,result.images.length===3);
    } finally { await reader.close(); }
  }
});

test('weekend replaces expired rendered cards and shows discovery after Melbourne rollover',async()=>{
  const reader=await site.reader();
  try {
    // Keep this browser fixture independent of when CI runs and of the current inventory.
    await reader.page.evaluateOnNewDocument(()=>{
      const NativeDate=Date;
      window.__weekendClock='2026-10-10T01:59:00Z';
      window.Date=class extends NativeDate { constructor(...args){super(...(args.length?args:[window.__weekendClock]));} static now(){return +new NativeDate(window.__weekendClock);} };
    });
    await reader.load('/');
    await reader.page.evaluate(()=>{
      const section=document.querySelector('#home-weekend');
      const list=section.querySelector('ul');
      section.setAttribute('data-home-weekend','2026-10-10');
      section.querySelectorAll('[data-event-promotion]').forEach(node=>node.remove());
      for(const [slug,endTime,image] of [['lunch','13:00','lunch'],['pool','17:00','pool'],['duplicate','17:00','pool'],['amp','17:00','amp'],['reserve','17:00','venue']]){
        const node=document.createElement('li');
        node.textContent=slug;
        node.setAttribute('data-weekend-slug',slug);
        node.setAttribute('data-weekend-image','/images/'+image+'.webp');
        node.setAttribute('data-event-promotion-day','2026-10-10');
        node.setAttribute('data-event-promotion',JSON.stringify({id:slug,data:{slug,title:'Synthetic browser fixture',status:'published',venueName:'Synthetic venue',suburb:'Mornington',startDate:'2026-10-10',endDate:'2026-10-10',startTime:'10:00',endTime}}));
        list.prepend(node);
      }
      // Fixture order is explicit, as an editor's ordered shortlist would be.
      for(const slug of ['lunch','pool','duplicate','amp','reserve']) list.append(section.querySelector('[data-weekend-slug="'+slug+'"]'));
      window.dispatchEvent(new Event('pageshow'));
    });
    const visible=()=>reader.page.$$eval('#home-weekend [data-event-promotion]:not([hidden])',nodes=>nodes.map(n=>n.getAttribute('data-weekend-slug')));
    assert.deepEqual(await visible(),['lunch','pool','amp']);
    await reader.page.evaluate(()=>{window.__weekendClock='2026-10-10T02:01:00Z';window.dispatchEvent(new Event('pageshow'));});
    assert.deepEqual(await visible(),['pool','amp','reserve']);
    await reader.page.evaluate(()=>{window.__weekendClock='2026-10-11T13:00:00Z';window.dispatchEvent(new Event('pageshow'));});
    assert.deepEqual(await visible(),[]);
    assert.equal(await reader.page.$$eval('[data-weekend-discovery]:not([hidden])',nodes=>nodes.length),3);
    assert.equal(await reader.page.$eval('#home-weekend-title',node=>node.textContent),'Weekend picks');
  } finally {await reader.close();}
});


test('homepage narrow masthead preserves search, menu and enlarged text without overflow',async()=>{
 const reader=await site.reader();
 try {for(const width of [320,360,390]) for(const enlarged of [false,true]) {
  await reader.page.setViewport({width,height:844});await reader.load('/');await reader.page.evaluate(()=>document.fonts.ready);
  if(enlarged)await reader.page.addStyleTag({content:'html{font-size:200%!important}'});
  const state=await reader.page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,controls:[...document.querySelectorAll('.header-actions > .search-link,.header-actions > .mobile-menu')].map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,visible:getComputedStyle(el).visibility,display:getComputedStyle(el).display};})}));
  assert.equal(state.overflow,false,JSON.stringify({width,enlarged,state}));assert.equal(state.controls.length,2);
  assert.ok(state.controls.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=width&&r.display!=='none'&&r.visible!=='hidden'),JSON.stringify({width,enlarged,state}));
  await reader.page.focus('.header-actions > .search-link');await reader.page.keyboard.press('Enter');
  await reader.waitFor(()=>document.querySelector('#siteSearchOverlayInput')===document.activeElement,'homepage search did not receive focus');
  await reader.page.keyboard.press('Escape');
  await reader.waitFor(()=>document.activeElement?.matches('.header-actions > .search-link'),'search Escape did not restore its opener');
  await reader.page.focus('.mobile-menu');await reader.page.keyboard.press('Enter');
  await reader.waitFor(()=>document.querySelector('#mobile-drawer')?.open,'mobile navigation did not open');
  await reader.page.keyboard.press('Escape');await reader.waitFor(()=>!document.querySelector('#mobile-drawer')?.open&&document.activeElement?.matches('.mobile-menu'),'menu did not close and restore focus');
 }}finally{await reader.close();}
});

test('homepage seasonal reading links are live local routes',async()=>{
 const reader=await site.reader();try{await reader.load('/');const links=await reader.page.$$eval('.home-season a',els=>els.map(e=>e.getAttribute('href')));assert.equal(links.length,3);for(const href of links){const response=await reader.page.goto(site.origin+href,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,href);assert.ok(await reader.page.$('main h1'),href);}}
 finally{await reader.close();}
});


test('homepage desktop masthead reflows at 200 percent root text sizing',async()=>{
 const reader=await site.reader();try{for(const enlarged of [false,true]){
 await reader.page.setViewport({width:1440,height:1000});await reader.load('/');await reader.page.evaluate(()=>document.fonts.ready);
 if(enlarged)await reader.page.addStyleTag({content:'html{font-size:200%!important}'});
 const result=await reader.page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,controls:[...document.querySelectorAll('.site-nav .pillar-menu__trigger > a,.header-actions > .search-link,.header-actions > .ask-link')].map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,width:r.width,height:r.height,left:r.left,right:r.right};})}));
 assert.equal(result.overflow,false,JSON.stringify({enlarged,result}));assert.ok(result.controls.length>=8);assert.ok(result.controls.every(r=>r.left>=0&&r.right<=1440&&r.height>=44),JSON.stringify(result));
 }}finally{await reader.close();}
});


test('homepage first-visit enlarged text keeps consent, footer and carousels within the viewport', async () => {
  for (const width of [320, 390, 768, 1440]) {
    const reader = await site.reader();
    try {
      await reader.page.setViewport({width,height:1000});
      await reader.page.evaluateOnNewDocument(() => localStorage.removeItem('pi-consent-v1'));
      await reader.load('/');
      await reader.page.evaluate(() => document.fonts.ready);
      await reader.page.addStyleTag({content:'html{font-size:200%!important}'});
      const measure = () => reader.page.evaluate(() => {
        const bounds = selector => [...document.querySelectorAll(selector)].map(e => {
          const r=e.getBoundingClientRect();
          return {selector:e.id || e.className,left:r.left,right:r.right,width:r.width,height:r.height};
        }).filter(r=>r.width&&r.height);
        return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
          cookie:document.querySelector('#cookie-banner').dataset.state,
          bounds:bounds('#cookie-accept-all, #cookie-manage, .footer-lead, .footer-group, .home-plan__choices, .home-weekend__scroller')};
      });
      let layout=await measure();
      assert.equal(layout.cookie,'visible');
      assert.equal(layout.bounds.filter(r=>r.selector.startsWith('cookie-')).length,2);
      assert.ok(layout.scrollWidth<=width+1,JSON.stringify(layout));
      for(const r of layout.bounds) {
        assert.ok(r.left>=-1&&r.right<=width+1,JSON.stringify({width,...r}));
        if(r.selector.startsWith('cookie-')) assert.ok(r.height>=44,JSON.stringify(r));
      }
      await reader.page.focus('#cookie-manage');
      await reader.page.keyboard.press('Enter');
      await reader.waitFor(()=>!document.querySelector('.cookie-banner__manage').hidden,'preferences did not open');
      layout=await measure();
      assert.ok(layout.scrollWidth<=width+1,JSON.stringify(layout));
      assert.equal(await reader.page.evaluate(()=>localStorage.getItem('pi-consent-v1')),null,'opening preferences must not grant consent');
    } finally { await reader.close(); }
  }
});
