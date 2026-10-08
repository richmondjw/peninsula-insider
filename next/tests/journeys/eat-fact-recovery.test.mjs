import test from 'node:test';
import assert from 'node:assert/strict';
import {Site} from './harness.mjs';
const paused=['johnny-ripe','peninsula-fresh-organics','via-boffe','georgie-bass','small-stone-pantry','pier-street-seafood','sourdough-kitchen','red-hill-cheese'];
const site=await Site.open();test.after(()=>site.close());
test('unverified or retail-paused entries leave discovery without pretending they closed',async()=>{
 const reader=await site.reader();try{
 await reader.load('/eat/');
 const links=await reader.page.$$eval('#directory a',els=>els.map(el=>el.getAttribute('href')));
 for(const slug of paused)assert.equal(links.includes(`/eat/${slug}/`),false,slug);
 for(const slug of paused){
 await reader.load(`/eat/${slug}/`);
 const state=await reader.page.evaluate(()=>({notice:document.querySelector('.venue-detail__closed-notice')?.textContent,actions:[...document.querySelectorAll('main a')].filter(a=>/Get directions|Reserve a table|Book direct/.test(a.textContent)).map(a=>a.href),robots:document.querySelector('meta[name=robots]')?.content,heading:document.querySelector('h1')?.textContent}));
 assert.match(state.notice,/paused|unverified/i,slug);
 assert.ok(state.heading,slug+' retains a usable page');
 assert.match(state.robots,/noindex/,slug+' stays outside search until visitor details are reliable');
 assert.deepEqual(state.actions,[],slug+' does not promise visitor directions or reservations');
 const recovery=await reader.page.$eval('main',el=>el.textContent);
 assert.match(await reader.page.title(),/listing paused/i,slug+' title does not recertify a legacy town');
 assert.equal(await reader.page.$('.venue-detail__place, .worth-knowing, .venue-actions-strip, .venue-detail__filed, .facts'),null,slug+' visitor recommendations and legacy location metadata are withheld');
 assert.doesNotMatch(recovery,/Build a day around this|Planning guides that include|Not sure how to build a day around|Keep this for later|Weekend plans that already include/,slug+' does not offer the paused venue as an itinerary stop');
 assert.equal(await reader.page.$('[data-pi-article-actions]'),null,slug+' no longer offers saving an unavailable venue as a trip stop');
 }
 await reader.load('/eat/dromana-hotel/');
 assert.doesNotMatch(await reader.page.$eval('main',el=>el.textContent),/Small Stone Pantry/);
 }finally{await reader.close();}
});
