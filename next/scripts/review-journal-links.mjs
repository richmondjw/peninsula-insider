import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Site } from '../tests/journeys/harness.mjs';
import policy from './journal-link-policy.json' with {type:'json'};
const out='review/journal-links';
await fs.mkdir(out,{recursive:true});
const report={head:process.env.REVIEW_HEAD_SHA ?? null,mode:'built-site with harness CMS fixtures; live CMS acceptance still required',pages:[]};
const site=await Site.open();
try {
 for(const slug of policy.pilots) for(const width of [390,1440]) {
  const reader=await site.reader(); const {page}=reader;
  try {
   await page.setViewport({width,height:900}); await reader.load(`/journal/${slug}/`);
   await page.evaluate(()=>document.fonts.ready);
   const observed=await page.evaluate(()=>({canonical:document.querySelector('link[rel=canonical]')?.href, overflow:document.documentElement.scrollWidth>innerWidth,
    overrides:document.querySelector('#pi-block-overrides')?.textContent ?? null,
    links:[...document.querySelectorAll('[data-pi-prose-root] a')].map(a=>({text:a.textContent,href:a.getAttribute('href')}))}));
   assert.equal(observed.overflow,false);
   const internal=observed.links.filter(a=>a.href.startsWith('/'));
   for (const required of policy.required[slug]) assert.ok(internal.some(a=>a.text===required.name && a.href===required.href), `Missing approved link: ${slug}: ${required.name}`);
   for(const link of internal) {
    assert.ok(link.text.trim(),'Descriptive link text');
    const url=new URL(link.href,site.origin); const response=await fetch(url); assert.equal(response.status,200,link.href);
    const html=await response.text(); assert.doesNotMatch(html,/<title>Redirecting/i,link.href);
    assert.ok(html.includes(`https://peninsulainsider.com.au${url.pathname}`),'Destination canonical present');
   }
   await page.screenshot({path:`${out}/${slug}-${width}.png`,fullPage:true});
   const first=internal[0];
   await page.focus('[data-pi-prose-root] a[href^="/"]');
   assert.equal(await page.$eval('[data-pi-prose-root] a[href^="/"]',a=>document.activeElement===a),true);
   await page.keyboard.press('Enter');
   await page.waitForFunction(href=>location.pathname===new URL(href,location.origin).pathname,{},first.href);
   report.pages.push({slug,width,...observed,keyboard:'Enter navigated to first contextual destination'});
  } finally {await reader.close();}
 }
} finally {await fs.writeFile(`${out}/rendered.json`,JSON.stringify(report,null,2));await site.close();}
