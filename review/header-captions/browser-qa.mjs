import { createRequire } from 'node:module';
const require = createRequire(new URL('../../next/package.json', import.meta.url));
const puppeteer = require('puppeteer');
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()});
const base = process.env.PI_CAPTION_PREVIEW_URL || 'http://127.0.0.1:4322';
const receipts=[];
try{
 for(const width of [320,390,768,1024,1440]){
  const page=await browser.newPage();await page.setViewport({width,height:1000});
  await page.goto(base + '/whats-on/',{waitUntil:'networkidle0'});
  await page.waitForSelector('.wo-head__figure img');
  const result=await page.evaluate(()=>{
   const img=document.querySelector('.wo-head__figure img'),caption=document.querySelector('.wo-head__figure figcaption'),link=document.querySelector('.wo-head__calendar-link');
   const ir=img.getBoundingClientRect(),cr=caption.getBoundingClientRect();link.focus();
   const rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number);
   const lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const bg=lum(getComputedStyle(document.querySelector('.wo-head')).backgroundColor);
   const contrasts=['.wo-head__title','.wo-head__context','.wo-head__rule','.wo-head__calendar-link','.wo-head__figure figcaption'].map(selector=>{const fg=lum(getComputedStyle(document.querySelector(selector)).color);return {selector,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};});
   return {overflow:document.documentElement.scrollWidth>innerWidth,loaded:img.complete&&img.naturalWidth>0,captionBelow:cr.top>=ir.bottom,focusOutline:getComputedStyle(link).outlineWidth,caption:caption.textContent.trim(),title:getComputedStyle(document.querySelector('.wo-head__title')).fontSize,contrasts};
  });
  assert.equal(result.overflow,false);assert.equal(result.loaded,true);assert.equal(result.captionBelow,true);assert.notEqual(result.focusOutline,'0px');
  assert.ok(result.contrasts.every(c=>c.ratio>=4.5));
  // Enter follows the in-page discovery action, rather than a decorative control.
  await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#wo-calendar');
  if(width<=1024){
   const toggle=await page.$('.mobile-menu');
   for(let i=0;i<3;i++){
    await toggle.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.mobile-menu').getAttribute('aria-expanded')==='true');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.querySelector('#mobile-drawer').contains(document.activeElement)),true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.querySelector('.mobile-menu').getAttribute('aria-expanded')==='false');
    assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.mobile-menu')),true);
   }
   await toggle.click();await page.click('[data-mobile-drawer-close]');
   assert.equal(await toggle.evaluate(el=>el.getAttribute('aria-expanded')),'false');
  }
  receipts.push({width,...result,menuRepeated:width<=1024?'3 keyboard cycles + close button':'desktop'});
  await page.close();
 }
 const retina=await browser.newPage();await retina.setViewport({width:390,height:900,deviceScaleFactor:2});await retina.goto(base + '/whats-on/',{waitUntil:'networkidle0'});
 const pixels=await retina.$eval('.wo-head__figure img',async img=>{const probe=new Image();probe.src=img.currentSrc;await probe.decode();return {width:probe.naturalWidth,rendered:img.getBoundingClientRect().width};});
 assert.ok(pixels.width>=pixels.rendered*2);receipts.push({retina:pixels});await retina.close();
 for(const [name,route] of [['breakfast','/journal/breakfast-before-the-crowds/'],['event','/whats-on/bass-flinders-gin-masterclass/'],['context','/journal/waterfront-restaurants-mornington-peninsula/']]){
  const page=await browser.newPage();await page.setViewport({width:390,height:900});
  await page.goto(base+route,{waitUntil:'networkidle0'});
  const figure=await page.$('figure');if(!figure)throw new Error(`No figure on ${route}`);
  await figure.evaluate(el=>el.scrollIntoView({block:'start'}));
  const caption=await figure.evaluate(el=>el.textContent.trim());
  assert.ok(!/This image shows|Conceptual oversized/.test(caption));
  if(name==='breakfast'){assert.ok(caption.includes('Coffee and a croissant by the bay.'));assert.equal(await figure.$('[data-pi-media-disclosure]'),null);}
  await page.screenshot({path:`../review/header-captions/after-${name}-figure-390.png`});
  receipts.push({route,caption});await page.close();
 }
 fs.writeFileSync('../review/header-captions/browser-qa.json',JSON.stringify(receipts,null,2)+'\n');console.log(JSON.stringify(receipts,null,2));
}finally{await browser.close();}
