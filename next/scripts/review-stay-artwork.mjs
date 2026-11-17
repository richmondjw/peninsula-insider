import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Site } from '../tests/journeys/harness.mjs';
const out='review/stay-artwork';
await fs.mkdir(out,{recursive:true});
const slugs=['arthurs-views','birch-creek','blue-moon-cottages','plantation-house-whitecliffs'];
const relatedSlugs=['blue-moon-cottages','plantation-house-whitecliffs','birch-creek'];
const routes=['kanasta-retro-caravans',...slugs];
const report={head:process.env.REVIEW_HEAD_SHA,scope:'Rendered original artwork; synthetic CMS override fixtures, not production CMS evidence',checks:[]};
const site=await Site.open();
try {
 // Capture all actual routes before acceptance assertions so a changed related
 // selection remains inspectable rather than leaving an empty failure artifact.
 for (const viewport of [{width:390,height:844,deviceScaleFactor:1},{width:390,height:844,deviceScaleFactor:2},{width:1440,height:1000,deviceScaleFactor:1}]) {
  const reader=await site.reader();
  try {
   await reader.page.setViewport(viewport);
   for(const slug of routes) {
    await reader.load(`/stay/${slug}/`);
    await reader.page.evaluate(()=>document.fonts.ready);
    await reader.page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight){scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}scrollTo(0,0)});
    await reader.page.waitForNetworkIdle({idleTime:300,timeout:10000});
    await reader.page.screenshot({path:`${out}/observed-${slug}-${viewport.width}-${viewport.deviceScaleFactor}x.png`,fullPage:true});
    await fs.writeFile(`${out}/observed-${slug}-${viewport.width}-${viewport.deviceScaleFactor}x.html`,await reader.page.content());
   }
  } finally { await reader.close(); }
 }
 for(const viewport of [{width:390,height:844,deviceScaleFactor:1},{width:390,height:844,deviceScaleFactor:2},{width:1440,height:1000,deviceScaleFactor:1}]) {
  const reader=await site.reader({supabase:[{match:'/cms_image_slots',body:slugs.map(entity_slug=>({entity_type:'venue',entity_slug,field_path:'heroImage',public_url:'/images/sourced/home-cover.webp',alt_text:'Unreviewed replacement',credit:'Synthetic fixture'}))}]});
  try {
   await reader.page.setViewport(viewport);
   for(const slug of routes){
    const route=`/stay/${slug}/`;await reader.load(route);
    await reader.page.evaluate(()=>document.fonts.ready);
    const selector=slug==='kanasta-retro-caravans'?'.venue-card__hero[href="/stay/blue-moon-cottages/"]':'.venue-detail__hero';
    await reader.page.$eval(selector,e=>e.scrollIntoView({block:'center'}));
    if(slug==='kanasta-retro-caravans') for(const name of relatedSlugs){await reader.page.$eval(`.venue-card__hero[href="/stay/${name}/"]`,e=>e.scrollIntoView({block:'center'}));await new Promise(r=>setTimeout(r,200));}
    await reader.page.waitForFunction((names,isCards)=>names.every(name=>{const img=document.querySelector(isCards?`.venue-card__hero[href="/stay/${name}/"] img`:'.venue-detail__hero img');return img?.complete&&img.naturalWidth>0}),{},slug==='kanasta-retro-caravans'?relatedSlugs:[slug],slug==='kanasta-retro-caravans');
    const observed=await reader.page.evaluate((names,isCards)=>({overflow:document.documentElement.scrollWidth>innerWidth+1,canonical:document.querySelector('link[rel="canonical"]')?.href,images:names.map(name=>{const frame=document.querySelector(isCards?`.venue-card__hero[href="/stay/${name}/"]`:'.venue-detail__hero');const img=frame.querySelector('img');const box=frame.getBoundingClientRect();return {name,src:img.getAttribute('src'),currentSrc:img.currentSrc,alt:img.alt,width:box.width,height:box.height,naturalWidth:img.naturalWidth,credit:isCards?(frame.closest('.venue-card')?.querySelector('.venue-card__photo-credit')?.textContent||''):(document.querySelector('.venue-detail__hero-credit')?.textContent||''),placeholder:frame.classList.contains('venue-card__hero--placeholder')};})}),slug==='kanasta-retro-caravans'?relatedSlugs:[slug],slug==='kanasta-retro-caravans');
    report.checks.push({route,viewport,...observed});
    assert.equal(observed.overflow,false,route+' no horizontal overflow');
    assert.equal(observed.canonical,'https://peninsulainsider.com.au'+route);
    for(const i of observed.images){assert.equal(new URL(i.src,site.origin).pathname,`/images/generated/stays/${i.name}-regional-illustration.webp`);assert.ok(i.width>100&&i.height>50);assert.equal(new URL(i.currentSrc).pathname,`/images/generated/stays/${i.name}-regional-illustration.webp`);assert.ok(i.naturalWidth>=Math.max(i.width,i.height*1.5)*viewport.deviceScaleFactor,'sufficient source resolution');assert.equal(i.placeholder,false);assert.equal(i.credit.trim(),'','own artwork has no photo credit');if(slug!=='kanasta-retro-caravans')assert.match(i.alt,/^Graphic illustration/);}
    await reader.page.screenshot({path:`${out}/${slug}-${viewport.width}-${viewport.deviceScaleFactor}x.png`,fullPage:true});
    // A later hydration pass must not swap in the synthetic unreviewed CMS photo.
    await reader.page.evaluate(()=>document.dispatchEvent(new Event('astro:page-load')));
    await reader.page.waitForNetworkIdle({idleTime:300,timeout:5000});
    for(const i of observed.images){const checkSelector=slug==='kanasta-retro-caravans'?`.venue-card__hero[href="/stay/${i.name}/"] img`:'.venue-detail__hero img';assert.equal(await reader.page.$eval(checkSelector,e=>e.getAttribute('src')),i.src);assert.equal(await reader.page.$eval(checkSelector,e=>getComputedStyle(e.parentElement).backgroundImage),'none','hydration must not add an unreviewed background');}
    report.checks.at(-1).syntheticHydration='passed';
   }
  }finally{await reader.close();}
 }
 report.result='passed';
}finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await site.close();}
