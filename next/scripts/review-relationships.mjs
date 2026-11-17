import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Site} from '../tests/journeys/harness.mjs';
import {pageFacts,targetState} from './journal-link-audit.mjs';
const out='review/journal-links/relationships';await fs.mkdir(out,{recursive:true});
const graph=JSON.parse(await fs.readFile('review/journal-link-graph.json','utf8'));
assert.equal(graph.relationships.evidenceDefects.length,0,'Rendered relationships must match evidence');
assert.equal(graph.relationships.invalidRenderedLinks.length,0,'Every relationship destination must be eligible');
const producerIds=['bass-and-flinders','red-hill-brewery','st-andrews-beach-brewery','mornington-peninsula-brewery','two-bays-brewing','jetty-road-brewery'];
for(const id of producerIds){const row=graph.relationships.venues.find(v=>v.id===id);assert.equal(row.href,`/wine/${id}/`);assert.ok(row.selections.length+row.mentions.length>0,`${id} recovered editorial references`);assert.ok(!graph.relationships.holds.some(h=>h.id===id&&h.reason==='canonical-route-conflict'));}
const cases=[['/eat/flinders-sourdough/','flinders-sourdough'],['/wine/montalto/','montalto'],['/stay/kanasta-retro-caravans/','kanasta-retro-caravans'],['/explore/spas-and-wellness/','alba-thermal-springs'],...producerIds.map(id=>[`/wine/${id}/`,id])];
const site=await Site.open();const report={head:process.env.REVIEW_HEAD_SHA??null,mode:'Built candidate with harness CMS fixtures; not live acceptance',pages:[],coverage:graph.relationships.coverage,holds:graph.relationships.holds};
try {
 for(const [path,id] of cases)for(const width of [390,1440]){
  const reader=await site.reader();const {page}=reader;
  try{
   await page.setViewport({width,height:900});if(producerIds.includes(id)){const alias=await fetch(new URL(`/eat/${id}/`,site.origin));const facts=pageFacts(await alias.text(),`/eat/${id}/`);assert.equal(facts.canonical,path);assert.equal(facts.stub,true);const dest=await fetch(new URL(path,site.origin));assert.equal(targetState({href:path},new Map([[path,pageFacts(await dest.text(),path)]])),'eligible');}await reader.load(path);await page.evaluate(()=>document.fonts.ready);
   const selector=`[data-venue-relationships="${id}"]`;
   assert.ok(await page.$(selector),`${path} relationship panel`);
   const observed=await page.$eval(selector,root=>({headings:[...root.querySelectorAll('h2,h3')].map(h=>h.textContent),links:[...root.querySelectorAll('a[href]')].map(a=>({text:(a.getAttribute('aria-label')||a.textContent).trim(),href:a.getAttribute('href'),decorative:a.getAttribute('aria-hidden')==='true'&&a.getAttribute('tabindex')==='-1'})),text:root.textContent,overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.equal(observed.overflow,false);assert.ok(observed.links.length>0);
   for(const {href,text,decorative} of observed.links){if(decorative)assert.ok(observed.links.some(a=>a.href===href&&!a.decorative&&a.text),'Decorative link needs a labelled accessible counterpart');else assert.ok(text,`Accessible link needs a name: ${href}`);const u=new URL(href,site.origin);assert.equal(u.origin,site.origin);const res=await fetch(u);assert.equal(res.status,200,href);const facts=pageFacts(await res.text(),u.pathname);assert.equal(targetState({href},new Map([[u.pathname,facts]])),'eligible',href);}
   if(observed.headings.includes('Nearby places'))assert.match(observed.text,/straight-line/);
   const summary=await page.$(`${selector} details summary`);
   if(summary){await summary.focus();await page.keyboard.press('Enter');assert.equal(await page.$eval(`${selector} details`,d=>d.open),true);}
   await page.$eval(selector,root=>root.scrollIntoView());
   await page.screenshot({path:`${out}/${id}-${width}.png`,fullPage:true});
   const first=observed.links.find(a=>!a.decorative);assert.ok(first);await page.focus(`${selector} a:not([aria-hidden="true"])`);await page.keyboard.press('Enter');await page.waitForFunction(h=>location.pathname===new URL(h,location.origin).pathname,{},first.href);
   report.pages.push({path,id,width,...observed,keyboard:'First relationship link opened correct internal destination'});
  }finally{await reader.close();}
 }
}finally{await fs.writeFile(`${out}/rendered.json`,JSON.stringify(report,null,2));await site.close();}
