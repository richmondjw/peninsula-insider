import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Site } from '../tests/journeys/harness.mjs';
const out='../review-emma'; await fs.mkdir(out,{recursive:true});
const paths=['/explore/plans/the-family-day-out/','/explore/plans/','/eat/laura-pt-leo/','/whats-on/will-rounds-live-at-peppers-moonah-links-resort-2026-11-20/','/whats-on/culinary-garden-experience-at-laura-pt-leo-estate-2026-11-22/','/whats-on/create-pottery-for-your-table/'];
const site=await Site.open(), report={head:process.env.REVIEW_HEAD_SHA??null,mode:'Local built candidate; offline CMS fixtures; no live acceptance',pages:[]};
try {
 for(const path of paths) for(const width of [390,1440]) {
  const reader=await site.reader(); const {page}=reader;
  try {
   await page.setViewport({width,height:900}); await reader.load(path);
   const facts=await page.evaluate(()=>({title:document.querySelector('h1')?.textContent,text:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth,links:[...document.querySelectorAll('.correction-note a')].map(a=>({text:a.textContent,href:a.getAttribute('href')}))}));
   assert.ok(facts.title,path); assert.equal(facts.overflow,false,`${path} ${width} overflow`);
   if(path.includes('the-family-day-out')) {
    assert.doesNotMatch(facts.text,/Oktoberfest|24 October 2026/); assert.match(facts.text,/Starting locality/i); assert.match(facts.text,/does not confirm a patrol/);
    assert.match(facts.text,/Arthurs Seat/); assert.match(facts.text,/Mount Martha/);
   }
   if(path.includes('will-rounds')) {assert.match(facts.text,/Friday 20 November/);assert.doesNotMatch(facts.text,/each Saturday/);}
   if(path.includes('culinary-garden')) {assert.match(facts.text,/Ella Swann/);assert.match(facts.text,/vegetarian lunch/);assert.doesNotMatch(facts.text,/Once a year, Pt\./);}
   if(path.includes('create-pottery')) {assert.match(facts.text,/hands-on pottery workshop/);assert.doesNotMatch(facts.text,/\bExhibition\b/);}
   if(path.includes('laura-pt-leo/') && path.startsWith('/eat')) {
    assert.ok(facts.links.some(l=>l.text==='hello@peninsulainsider.com.au'));
    assert.ok(facts.links.some(l=>l.href==='/contact/?type=correction'));
    assert.ok(!facts.links.some(l=>/corrections@/.test(l.text)));
   }
   const stem=path.split('/').filter(Boolean).at(-1)+'-'+width;
   await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}scrollTo(0,0);await new Promise(r=>setTimeout(r,300));});
   await page.screenshot({path:`${out}/${stem}.png`,fullPage:true});
   report.pages.push({path,width,title:facts.title,overflow:facts.overflow,correctionLinks:facts.links});
  } finally {await reader.close();}
 }
} finally {await fs.writeFile(`${out}/rendered.json`,JSON.stringify(report,null,2)); await site.close();}
console.log(JSON.stringify(report));
