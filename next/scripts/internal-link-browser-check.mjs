import puppeteer from 'puppeteer';
import {mkdir,writeFile} from 'node:fs/promises';
const out='../ops/reports/seo/internal-linking';await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true});const checks=[];
try {
 for(const width of [390,1440]) {
  const page=await browser.newPage();await page.setCacheEnabled(false);await page.setViewport({width,height:900,deviceScaleFactor:1});
  for(const route of ['/site-index/','/picks/','/whats-on/this-weekend/archive/','/about/','/events/main-street-mornington-festival/','/journal/breakfast-before-the-crowds/']) {
   const response=await page.goto('http://127.0.0.1:4327'+route,{waitUntil:'networkidle2'});
   if(response.status()!==200)throw new Error(`HTTP ${response.status()} on ${route}`);
   const result=await page.evaluate(()=>({title:document.title,h1:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1,bodyVisible:getComputedStyle(document.body).display!=='none',links:[...document.querySelectorAll('main a[href],.legal__body a[href]')].length,archiveLinks:[...document.querySelectorAll('a[href*="/whats-on/this-weekend/archive/2026-"]')].length,pickLinks:[...document.querySelectorAll('.legal__body a[href*="/journal/insider-picks-"]')].length}));
   checks.push({width,route,...result});
   if(!result.h1||result.overflow||!result.bodyVisible)throw new Error(`Reader check failed: ${width} ${route}`);
   if(route==='/whats-on/this-weekend/archive/'&&result.archiveLinks<10)throw new Error('Incomplete archive');
   if(route==='/picks/'&&result.pickLinks<=12)throw new Error('Picks still capped');
   if(route==='/picks/'||route==='/whats-on/this-weekend/archive/')await page.screenshot({path:`${out}/${route.includes('picks')?'picks':'weekend-archive'}-${width}.png`,fullPage:true});
  }
  await page.close();
 }
 await writeFile(`${out}/browser-acceptance.json`,JSON.stringify({generatedAt:new Date().toISOString(),checks},null,2)+'\n');
 console.log(`Browser acceptance passed: ${checks.length} desktop/mobile page checks.`);
}finally{await browser.close();}
