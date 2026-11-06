import fs from 'node:fs/promises';
import path from 'node:path';
import { Site } from '../tests/journeys/harness.mjs';
const output = path.resolve('../../review-assets');
await fs.mkdir(output,{recursive:true});
const site = await Site.open();
const reader = await site.reader();
const label = process.env.PI_REVIEW_LABEL || 'after';
const report = [];
try {
 for(const width of [1440,390]){
  await reader.page.setViewport({width,height:width===1440?1000:844});
  await reader.load('/');await reader.page.evaluate(()=>document.fonts.ready);
  await reader.page.evaluate(()=>{const b=document.querySelector('#cookie-banner');if(b)b.remove();});
  await reader.page.screenshot({path:path.join(output,`${label}-${width}-first-screen.png`)});
  await reader.page.evaluate(()=>document.querySelectorAll('body *').forEach(e=>{if(['fixed','sticky'].includes(getComputedStyle(e).position)&&!e.closest('main'))e.style.visibility='hidden';}));
  for(const section of ['.home-cover','.home-orientation','#home-weekend']){
   const element=await reader.page.$(section);if(!element)continue;
   await element.screenshot({path:path.join(output,`${label}-${width}-${section.replace(/[.#]/g,'')}.png`)});
  }
  if(label==='after'){
   for(const period of ['morning','afternoon','evening']){
    await reader.page.$eval('[data-coastal-art]',(e,period)=>{e.dataset.period=period;e.dataset.paused='true';},period);
    await (await reader.page.$('.home-cover')).screenshot({path:path.join(output,`${label}-${width}-hero-${period}.png`)});
   }
  }
  report.push(await reader.page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,cards:document.querySelectorAll('#home-weekend [data-event-promotion]').length,heroHeight:document.querySelector('.home-cover').getBoundingClientRect().height,gameLinks:[...document.querySelectorAll('a[href*="play.peninsulainsider.com.au"]')].map(e=>({text:e.textContent.trim(),href:e.href})),mapCredit:document.querySelector('.home-orientation__credit').textContent.trim(),eventCredits:[...document.querySelectorAll('#home-weekend .pi-card__image-note')].map(e=>e.textContent.trim()),eventLinks:[...document.querySelectorAll('#home-weekend .pi-card__title a')].map(e=>e.getAttribute('href'))})));
 }
 await fs.writeFile(path.join(output,`${label}-layout.json`),JSON.stringify(report,null,2));
}finally{await reader.close();await site.close();}
