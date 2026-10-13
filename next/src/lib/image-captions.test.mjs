import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { imageCaption, captionIssues } from './image-presentation.mjs';
import { checkImages } from '../../scripts/check-image-captions.mjs';
import { figureCaptionIssues } from '../../scripts/assert-image-captions.mjs';

const art={src:'/images/a.webp',imageKind:'illustration',depictionStatus:'illustrative',alt:'Coffee and a croissant by a bay',caption:'Coffee and a croissant by the bay.',credit:'Illustration: Peninsula Insider'};
test('one useful art caption, with stored history unchanged',()=>{
 const copy=structuredClone(art); assert.equal(imageCaption(art),art.caption); assert.deepEqual(art,copy); assert.deepEqual(captionIssues(art),[]);
});
test('context photography remains distinct and never becomes a venue claim',()=>{
 assert.equal(imageCaption({caption:'Montalto vineyard.',depictionStatus:'illustrative',credit:'Visit Victoria'}),'Context photograph: Montalto vineyard.');
 assert.equal(imageCaption({depictionStatus:'illustrative'}),'Context photograph.');
 assert.equal(imageCaption({caption:'A conceptual memory map. Not geographic or navigational.',credit:'Illustration: PI'}),'A conceptual memory map. Not geographic or navigational.');
});
test('admission refuses unknown kind, unverified identity, missing description and credit',()=>{
 const issues=captionIssues({depictionStatus:'unverified',caption:'This image shows Conceptual oversized coffee.'});
 assert.ok(issues.some(x=>x.includes('editorial review')));assert.ok(issues.some(x=>x.includes('imageKind')));assert.ok(issues.some(x=>x.includes('attribution')));assert.ok(issues.some(x=>x.includes('boilerplate')));
 assert.ok(captionIssues({...art,depictionStatus:'actual'}).some(x=>x.includes('documentary')));
});
test('unchanged legacy images are inventoried; edited and new images are gated',()=>{
 const old=[{key:'$.hero',image:{src:'/images/legacy.webp'}}];
 assert.deepEqual(checkImages(old,old),[]);
 assert.ok(checkImages([{key:'$.hero',image:{src:'/images/new.webp'}}],old).length);
 assert.deepEqual(checkImages([{key:'$.hero',image:art}],old),[]);
});
test('journal detail and card render one caption rather than duplicate disclosure',()=>{
 for(const path of ['../pages/journal/[slug].astro','../components/journal/JournalStory.astro']) {
  const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
  assert.ok(source.includes('data-journal-image-caption'));assert.ok(!source.includes('<MediaProvenanceNote'));
 }
});
test('event detail and cards use one credited description, without a second disclosure',()=>{
 for(const path of ['../pages/whats-on/[slug].astro','../components/EventCard.astro']){
  const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');assert.ok(source.includes('<EventImageCredit'));assert.ok(!source.includes('<MediaProvenanceNote'));
 }
 const credit=fs.readFileSync(new URL('../components/EventImageCredit.astro',import.meta.url),'utf8');
 assert.ok(credit.includes('imageCaption(image)'));assert.ok(!credit.includes("startsWith('/images/generated/')"));assert.ok(credit.includes('licenceUrl'));
});
test('rendered gate rejects duplicate descriptions and boilerplate, ignores alt and provenance',()=>{
 assert.deepEqual(figureCaptionIssues('<figure><img alt="Conceptual oversized cup"><figcaption>Coffee by the bay. Illustration: PI</figcaption></figure>'),[]);
 assert.ok(figureCaptionIssues('<figure><figcaption>This image shows Conceptual oversized cup.</figcaption></figure>').length);
 assert.ok(figureCaptionIssues('<figure><figcaption data-journal-image-caption>Coffee.</figcaption><p data-pi-media-disclosure>Illustration</p></figure>').length);
 assert.ok(figureCaptionIssues('<figure><figcaption>Coffee.</figcaption><figcaption>Coffee.</figcaption></figure>').length);
});
