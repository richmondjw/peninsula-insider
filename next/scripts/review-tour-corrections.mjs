import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Site} from '../tests/journeys/harness.mjs';
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(head,process.env.REVIEW_HEAD_SHA,'exact head required');
const out='review/tour-corrections';await fs.mkdir(out,{recursive:true});
const report={head,basis:'Built candidate; harness stubs Supabase and Pagefind. Not production CMS verification.',observations:[],passed:false};
const mode=process.env.TOUR_REVIEW_MODE;
assert.ok(['facts','hold'].includes(mode));
const paths=mode==='facts'?['ricks-mornington-peninsula-wine-tour','amour-of-the-grape-boutique-wine-tour']:['plunge-hot-springs-wine-tour'];
let site;
try{
 site=await Site.open();
 for(const width of [390,1440])for(const slug of paths){
  const reader=await site.reader();const page=reader.page;
  try{
   await page.setViewport({width,height:900,isMobile:width===390,hasTouch:width===390});
   await reader.load(`/tour/${slug}/`);
   await page.evaluate(()=>document.fonts.ready);
   const obs=await page.evaluate(()=>({text:document.querySelector('main')?.innerText??document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth+1,hold:!!document.querySelector('[data-tour-hold="true"]'),booking:!!document.querySelector('[data-pi-book="booking"]'),robots:document.querySelector('meta[name="robots"]')?.content,pagefind:!!document.querySelector('[data-pagefind-body]')}));
   assert.equal(obs.overflow,false,`${slug} overflow at${width}`);
   if(mode==='hold'){assert.equal(obs.hold,true);assert.equal(obs.booking,false);assert.match(obs.robots,/noindex/);assert.equal(obs.pagefind,false);assert.doesNotMatch(obs.text,/At a glance/);}
   else if(slug.startsWith('ricks')){assert.match(obs.text,/overlapping refund provisions/);assert.doesNotMatch(obs.text,/Free cancellation within 24 hours of departure applies|undercuts most competitors/);}
   else{assert.match(obs.text,/includes a multi-course tapas lunch/);assert.match(obs.text,/up to eleven available by request on Saturdays/);}
   await page.screenshot({path:`${out}/${slug}-${width}.png`,fullPage:true});
   report.observations.push({slug,width,...obs});
  }finally{await reader.close();}
 }
 report.passed=true;
}catch(e){report.error=String(e.stack??e);throw e;}
finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));if(site)await site.close();}
