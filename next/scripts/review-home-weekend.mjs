import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {Site} from '../tests/journeys/harness.mjs';
const out='review/home-weekend';
await fs.mkdir(out,{recursive:true});
const publicBase=process.env.REVIEW_BASE_URL;
const expected=process.env.REVIEW_HEAD_SHA;
if(publicBase) assert.ok(expected, 'Public acceptance requires an exact deployment SHA');
const browser=publicBase ? await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']}) : null;
// Public acceptance uses a fresh browser with no harness interception or CMS fixtures.
const site=browser ? {
 reader:async()=>{const page=await browser.newPage();return {page,load:async route=>{
  const response=await page.goto(new URL(route,publicBase).href,{waitUntil:'networkidle2',timeout:45000});
  assert.equal(response.status(),200);
  await page.waitForNetworkIdle({concurrency:0,idleTime:500,timeout:20000});
 },close:()=>page.close()};},close:()=>browser.close(),
} : await Site.open();
const report={observedAt:new Date().toISOString(),candidate:expected,base:publicBase??'built-site',views:[],ok:false};
async function verifyRevision(){
 if(!publicBase) return;
 const response=await fetch(new URL('/deployment.json',publicBase),{cache:'no-store',signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200);
 const manifest=await response.json();assert.equal(manifest.sourceSha,expected,'Public screenshot must match the reviewed deployment');
 report.deployment=manifest;
}
try {
 await verifyRevision();
 for(const width of [390,1440]) {
  const reader=await site.reader();
  try {
   await reader.page.setViewport({width,height:1000,deviceScaleFactor:width===390?2:1});
   await reader.load('/');
   await reader.page.$eval('#home-weekend',el=>el.scrollIntoView({block:'center'}));
   const eventCards=await reader.page.$$('#home-weekend [data-event-promotion]:not([hidden])');
   for (const [index,card] of eventCards.entries()) {
    await card.evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
    await reader.page.waitForFunction(el=>{const img=el.querySelector('img');return img.complete&&img.naturalWidth>0;},{},card);
    await card.screenshot({path:`${out}/${width}-card-${index+1}.png`});
   }
   await reader.page.$eval('#home-weekend ul',el=>{el.scrollLeft=0;});
   await reader.page.waitForFunction(()=>[...document.querySelectorAll('#home-weekend [data-event-promotion]:not([hidden]) img')].every(i=>i.complete&&i.naturalWidth>0));
   const observed=await reader.page.$eval('#home-weekend',section=>({text:section.innerText,edition:section.getAttribute('data-home-weekend'),overflow:document.documentElement.scrollWidth>innerWidth+1,cards:[...section.querySelectorAll('[data-event-promotion]:not([hidden])')].map(el=>({slug:el.getAttribute('data-weekend-slug'),image:el.getAttribute('data-weekend-image'),src:el.querySelector('img')?.currentSrc,alt:el.querySelector('img')?.alt,loaded:el.querySelector('img')?.naturalWidth,credit:el.querySelector('.pi-card__image-note')?.textContent})),discovery:section.querySelectorAll('[data-weekend-discovery]:not([hidden])').length}));
   assert.equal(observed.overflow,false);assert.equal(observed.cards.length+observed.discovery,3);assert.equal(new Set(observed.cards.map(c=>c.image.split(/[?#]/)[0])).size,observed.cards.length);assert.equal(new Set(observed.cards.map(c=>c.src.split(/[?#]/)[0].replace(/-\d+\.(avif|webp)$/, ''))).size,observed.cards.length);
   await reader.page.screenshot({path:`${out}/${width}.png`});
   const section=await reader.page.$('#home-weekend');await section.screenshot({path:`${out}/${width}-section.png`});
   report.views.push({width,...observed});
   await reader.page.evaluate(()=>{
     const edition=document.querySelector('#home-weekend').getAttribute('data-home-weekend');
     const NativeDate=Date;
     const afterWeekend=new NativeDate(edition+'T00:00:00Z').getTime()+3*86400000;
     window.Date=class extends NativeDate { constructor(...args){super(...(args.length?args:[afterWeekend]));} static now(){return afterWeekend;} };
     window.dispatchEvent(new Event('pageshow'));
   });
   const rollover=await reader.page.$eval('#home-weekend',section=>({text:section.innerText,events:section.querySelectorAll('[data-event-promotion]:not([hidden])').length,discovery:section.querySelectorAll('[data-weekend-discovery]:not([hidden])').length,overflow:document.documentElement.scrollWidth>innerWidth+1}));
   assert.equal(rollover.events,0);assert.equal(rollover.discovery,3);assert.equal(rollover.overflow,false);assert.match(rollover.text,/not dated event picks/);
   await section.screenshot({path:`${out}/${width}-rollover.png`});
   report.views.push({width,scenario:'after-edition',...rollover});
  } finally {await reader.close();}
 }
 await verifyRevision();
 report.ok=true;
} catch(error) {report.error=String(error);throw error;}
finally {await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await site.close();}
console.log(JSON.stringify(report,null,2));
