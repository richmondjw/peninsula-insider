import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {isPublishableTour} from '../src/lib/tour-admission.mjs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('known source holds fail closed; ordinary tours remain listed',()=>{
 assert.equal(isPublishableTour({sourceStatus:'unsourced'}),false);
 assert.equal(isPublishableTour({sourceStatus:'disputed'}),false);
 assert.equal(isPublishableTour({}),true);
});
test('held correction page has no product rendering or CMS overlay',()=>{
 const p=read('src/pages/tour/[slug].astro');
 assert.match(p,/noindex=\{held\}/);
 assert.match(p,/searchExclude=\{held\}/);
 assert.match(p,/suppressImageMeta=\{held\}/);
 assert.match(p,/held \? null : buildTourSchema/);
 assert.match(p,/held \? \{ image: \{\} \} : await loadOverrides/);
 const hold=p.split('{held ? (')[1].split(') : (')[0];
 for(const forbidden of ['SubpageHero','editableText','At a glance','Book this tour','application/ld+json','NewsletterBlock']) assert.ok(!hold.includes(forbidden),forbidden);
 assert.match(hold,/data-pagefind-ignore/);
});
test('all tour recommendation collections and sitemap apply admission',()=>{
 const paths=['src/pages/sitemap.xml.ts','src/pages/tour-packages/[slug].astro','src/pages/tour/operators/[slug].astro',...readdirSync(new URL('src/pages/tour/',root)).filter(n=>n.endsWith('.astro')&&n!=='[slug].astro').map(n=>'src/pages/tour/'+n)];
 for(const p of paths){const s=read(p);if(s.includes("getCollection('tours'"))assert.match(s,/getCollection\('tours', \(\{ data \}\) => isPublishableTour\(data\)\)/,p);}
});
test('Plunge hold carries no unsupported commercial fields or package references',()=>{
 const t=JSON.parse(read('src/content/tours/plunge-hot-springs-wine-tour.json'));
 assert.equal(t.sourceStatus,'unsourced');
 for(const k of ['bookingUrl','priceLow','priceHigh','durationHours','departsFrom','maxGroupSize'])assert.equal(t[k],undefined);
 for(const slug of ['adventure-weekend','thermal-springs-wine-weekend'])assert.ok(!JSON.parse(read('src/content/tour-packages/'+slug+'.json')).componentTourSlugs.includes(t.slug));
 assert.equal(JSON.parse(read('src/content/tour-operators/mornington-peninsula-plunge.json')).maxCapacity,7);
});

test('package schema only receives admitted component slugs',()=>{
 assert.match(read('src/pages/tour-packages/[slug].astro'),/buildTourPackageSchema\(\{ \.\.\.data, componentTourSlugs: componentTours.map/);
});
