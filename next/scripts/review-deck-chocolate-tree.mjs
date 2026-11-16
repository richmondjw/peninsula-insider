import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Site} from '../tests/journeys/harness.mjs';
const head=process.env.REVIEW_HEAD_SHA;
assert.match(head??'',/^[a-f0-9]{40}$/,'Exact reviewed head required');
const out='review/deck-chocolate-tree';
await fs.mkdir(out,{recursive:true});
const slug='deck-the-chocolate-tree-2026-12-05';
const duplicate='deck-the-chocolate-tree-at-the-chocolateries-mornington-peninsula-2026-12-05';
const route=`/whats-on/${slug}/`, oldRoute=`/whats-on/${duplicate}/`;
const expected=[5,6,...Array.from({length:13},(_,i)=>i+12)].map(n=>`2026-12-${String(n).padStart(2,'0')}`);
const report={head,startedAt:new Date().toISOString(),mode:'Exact-head built site; existing journey harness supplies empty CMS fixtures and blocks external requests. Live CMS acceptance is separate.',pages:[],checks:[],status:'running'};
let site;
async function capture(page,name){
 await page.evaluate(async()=>{document.querySelectorAll('main img,article img').forEach(i=>i.loading='eager');await document.fonts.ready;});
 await page.waitForFunction(()=>[...document.querySelectorAll('main img,article img')].filter(i=>i.getBoundingClientRect().width>0).every(i=>i.complete&&i.naturalWidth>0));
 const facts=await page.evaluate(()=>({url:location.pathname+location.search,title:document.querySelector('h1')?.textContent.trim(),canonical:document.querySelector('link[rel=canonical]')?.href,overflow:document.documentElement.scrollWidth>innerWidth,text:document.querySelector('main')?.innerText??document.body.innerText,schemas:[...document.querySelectorAll('script[type="application/ld+json"]')].map(n=>JSON.parse(n.textContent)),calendar:[...document.querySelectorAll('a[href*="calendar.google.com"]')].map(a=>a.href)}));
 await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
 report.pages.push({name,...facts});
 assert.equal(facts.overflow,false,`${name}: horizontal overflow`);
 return facts;
}
try{
 assert.ok(Date.now()<Date.parse('2026-12-05T05:00:00Z'),'This pre-first-session review must be revised after the first session, never time-forged');
 site=await Site.open();
 const feed=JSON.parse(await fs.readFile('dist/whats-on/feed.json','utf8'));
 const entries=feed.events.filter(e=>e.slug===slug||e.slug===duplicate);
 assert.equal(entries.length,1,'Exactly one canonical feed record');
 assert.equal(entries[0].slug,slug);assert.equal(entries[0].k,'explicit');
 assert.deepEqual(entries[0].dates,expected);assert.equal(entries[0].statusData.occurrencePolicy,'confirmed-only');
 await fs.writeFile(`${out}/feed-entry.json`,JSON.stringify({generated:feed.generated,event:entries[0]},null,2));
 report.checks.push('feed: one canonical record and all 15 exact dates');
 for(const width of [390,1440]){
  const reader=await site.reader();const {page}=reader;
  try{
   await page.setViewport({width,height:900});
   await reader.load(route);
   const facts=await capture(page,`canonical-${width}`);
   assert.equal(facts.title,'Deck the Chocolate Tree');
   assert.equal(new URL(facts.canonical).pathname,route);
   assert.match(facts.text,/5[–-]6 December|5[–-]6 and 12[–-]24/);
   assert.match(facts.text,/12[–-]24 December/);
   assert.match(facts.text,/subject to availability|depends on availability/i);
   const schemas=facts.schemas.flatMap(s=>s['@graph']??[s]);
   const events=schemas.filter(s=>[].concat(s['@type']).some(t=>String(t).endsWith('Event')));
   assert.equal(events.length,1,'One occurrence Event schema');
   assert.ok(events[0].startDate.startsWith('2026-12-05'));
   assert.ok(events[0].endDate.startsWith('2026-12-05'),'Schema must not span closed dates');
   assert.equal(facts.calendar.length,1,'One calendar action');
   assert.equal(new URL(facts.calendar[0]).searchParams.get('dates'),'20261204T220000Z/20261205T050000Z');
   // Static redirect with scripting disabled proves canonical/meta fallback;
   // then a normal navigation proves the reader lands on the retained URL.
   await page.setJavaScriptEnabled(false);
   const oldHtml=await (await fetch(site.origin+oldRoute)).text();
   assert.match(oldHtml,new RegExp(`rel="canonical"[^>]*${slug}|${slug}[^>]*rel="canonical"`));
   assert.match(oldHtml,/http-equiv="refresh"/i);
   assert.doesNotMatch(oldHtml,/<meta[^>]*name="robots"[^>]*noindex/i);
   await fs.writeFile(`${out}/redirect.html`,oldHtml);
   await page.goto(site.origin+oldRoute,{waitUntil:'networkidle0'});
   await page.waitForFunction(p=>location.pathname===p,{},route);
   await capture(page,`redirect-noscript-destination-${width}`);
   await page.setJavaScriptEnabled(true);
   await page.goto(site.origin+oldRoute,{waitUntil:'networkidle0'});
   await page.waitForFunction(p=>location.pathname===p,{},route);
   await capture(page,`redirect-destination-${width}`);
   // The public selected-date URL drives the real client feed renderer.
   for(const day of [...expected,'2026-12-07','2026-12-08','2026-12-09','2026-12-10','2026-12-11','2026-12-25']){
    await reader.load(`/whats-on/?date=${day}..${day}&q=chocolate`);
    await page.waitForFunction(()=>document.querySelector('#pi-results-status')?.textContent.includes('your dates'));
    const rows=await page.$$eval('[data-wo-days] a[href*="deck-the-chocolate-tree"]',as=>as.map(a=>({href:a.getAttribute('href'),text:a.textContent.trim()})));
    assert.equal(rows.length,expected.includes(day)?1:0,`${width} ${day}: duplicate or wrong-date card`);
    if(rows.length)assert.equal(new URL(rows[0].href,site.origin).pathname,route);
    report.checks.push({width,selectedDate:day,rows});
    if(['2026-12-05','2026-12-07','2026-12-11','2026-12-12','2026-12-24','2026-12-25'].includes(day))await capture(page,`selected-${day}-${width}`);
   }
  }finally{await reader.close();}
 }
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack??error);throw error;}
finally{
 report.finishedAt=new Date().toISOString();
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
 const files=await fs.readdir(out);const hashes=[];
 for(const file of files.sort()){const bytes=await fs.readFile(`${out}/${file}`);hashes.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
 await fs.writeFile(`${out}/manifest.json`,JSON.stringify({head,files:hashes},null,2));
 await site?.close();
}
