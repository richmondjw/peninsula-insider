import test from 'node:test';
import assert from 'node:assert/strict';
import {Site} from './harness.mjs';
const anchors=['/','/eat/','/stay/','/wine/','/explore/','/explore/plans/','/whats-on/','/journal/'];
const site=await Site.open();
test.after(()=>site.close());

test('shared header and footer use the publication fonts on every anchor',async()=>{
 const reader=await site.reader();try{
 await reader.page.setViewport({width:1440,height:1000});
 for(const route of anchors){
 await reader.load(route);
 await reader.page.evaluate(()=>document.fonts.ready);
 const fonts=await reader.page.evaluate(()=>({
 search:getComputedStyle(document.querySelector('.site-header .search-link')).fontFamily,
 navigation:[...document.querySelectorAll('.site-header .site-nav a,.site-header .personal-menu summary,.edition-ribbon')].map(e=>getComputedStyle(e).fontFamily),
 wordmark:getComputedStyle(document.querySelector('.site-header .brand')).fontFamily,
 footer:[...document.querySelectorAll('.pi-shell.footer p,.pi-shell.footer a:not(.brand)')].map(e=>getComputedStyle(e).fontFamily),
 headings:[...document.querySelectorAll('.pi-shell.footer h2')].map(e=>getComputedStyle(e).fontFamily),
 overflow:document.documentElement.scrollWidth>innerWidth+1,
 loaded:[...document.fonts].filter(face=>face.status==='loaded').map(face=>face.family),
 }));
 assert.ok(fonts.loaded.some(f=>f.includes('Figtree'))&&fonts.loaded.some(f=>f.includes('Sora')),route+' self-hosted font faces actually loaded');
 assert.match(fonts.search,/Figtree/,route+' header controls');
 assert.match(fonts.wordmark,/Sora/,route+' wordmark');
 assert.ok(fonts.navigation.length&&fonts.navigation.every(f=>f.includes('Figtree')),route+' navigation and personal controls');
 assert.ok(fonts.loaded.every(f=>/Sora|Figtree/.test(f)),route+' loaded font families stay within the shared design contract');
 assert.ok(fonts.footer.length&&fonts.footer.every(f=>f.includes('Figtree')),route+' footer prose and links');
 assert.ok(fonts.headings.length&&fonts.headings.every(f=>f.includes('Sora')),route+' footer headings');
 assert.equal(fonts.overflow,false,route+' desktop overflow');
 }
 }finally{await reader.close();}
});

test('mobile navigation keeps shared fonts, fits and returns keyboard focus after closing',async()=>{
 const reader=await site.reader();try{
 await reader.page.setViewport({width:390,height:844});
 const failedFonts=[];reader.page.on('response',r=>{if(/\.woff2/.test(r.url())&&r.status()>=400)failedFonts.push(r.url());});
 const oldFonts=[];reader.page.on('request',r=>{if(/\/fonts\/font-\d+\.woff2/.test(r.url()))oldFonts.push(r.url());});
 for(const width of [390,320]){
 await reader.page.setViewport({width,height:844});
 for(let i=0;i<anchors.length;i++){
 const route=anchors[i];if(i===0)await reader.load(route);else await reader.navigate(route);
 const footerFonts=await reader.page.$$eval('.pi-shell.footer p,.pi-shell.footer h2',els=>els.map(e=>({font:getComputedStyle(e).fontFamily,heading:e.tagName==='H2'})));
 assert.ok(footerFonts.every(e=>e.font.includes(e.heading?'Sora':'Figtree')),route+' mobile footer typography');
 await reader.waitFor(()=>document.querySelector('.site-header')?.dataset.bound==='true',route+' '+width+'px menu has bound its controls');
 await reader.page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 await reader.waitFor(()=>{const button=document.querySelector('.site-header .mobile-menu');const r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.mobile-menu')===button;},route+' '+width+'px menu opener is unobscured',null,{describe:()=>{const button=document.querySelector('.site-header .mobile-menu');const r=button.getBoundingClientRect();return {bound:document.querySelector('.site-header').dataset.bound,topmost:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML,viewport:innerWidth,button:button.outerHTML};}});
 await reader.page.click('.site-header .mobile-menu');
 await reader.waitFor(()=>document.querySelector('#mobile-drawer').open,route+' '+width+'px menu opens after a real click',null,{describe:()=>({bound:document.querySelector('.site-header').dataset.bound,expanded:document.querySelector('.mobile-menu').getAttribute('aria-expanded'),viewport:innerWidth,drawer:document.querySelector('#mobile-drawer').outerHTML.slice(0,250),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)})});
 await reader.page.evaluate(()=>document.fonts.ready);
 const menu=await reader.page.evaluate(()=>({
 title:getComputedStyle(document.querySelector('.mobile-drawer__title')).fontFamily,
 links:[...document.querySelectorAll('.mobile-drawer__primary a,.mobile-drawer__secondary a,.mobile-drawer__search')].map(e=>({font:getComputedStyle(e).fontFamily,height:e.getBoundingClientRect().height,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})),
 dispatch:getComputedStyle(document.querySelector('.mobile-drawer__dispatch strong')).fontFamily,
 controls:[...document.querySelectorAll('.mobile-drawer__dispatch,.mobile-drawer__close,.site-header .mobile-menu')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),
 overflow:document.querySelector('#mobile-drawer').scrollWidth>innerWidth+1,
 }));
 assert.match(menu.title,/Sora/,route+' menu title');assert.match(menu.dispatch,/Sora/,route+' menu dispatch title');
 assert.ok(menu.links.length&&menu.links.every(e=>e.font.includes('Figtree')&&e.height>=44&&e.left>=0&&e.right<=width+1),route+' menu links retain body font and touch targets');
 assert.ok(menu.controls.every(e=>e.width>=44&&e.height>=44),route+' dispatch/close/opener targets');
 assert.equal(menu.overflow,false,route+' menu overflow');
 await reader.page.keyboard.press('Escape');
 await reader.page.waitForFunction(()=>!document.querySelector('#mobile-drawer').open);
 assert.equal(await reader.page.evaluate(()=>document.activeElement===document.querySelector('.site-header .mobile-menu')),true,route+' focus returns to opener');
 }
 }
 assert.deepEqual(failedFonts,[],'self-hosted font requests succeed');
 assert.deepEqual(oldFonts,[],'anchor navigation does not download the obsolete Inter/Source Serif font files');
 }finally{await reader.close();}
});
