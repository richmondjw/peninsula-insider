import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { imageCaption, imageCaptionText, imageCreditText, captionIssues, hasCaptionDistinction } from './image-presentation.mjs';
import { checkImages } from '../../scripts/check-image-captions.mjs';
import { figureCaptionIssues } from '../../scripts/assert-image-captions.mjs';

const art={src:'/images/a.webp',imageKind:'illustration',depictionStatus:'illustrative',alt:'Coffee and a croissant by a bay',caption:'Coffee and a croissant by the bay.',credit:'Illustration: Peninsula Insider'};
test('selected listing admission requires a real caption/credit distinction, not a word in prose',()=>{
 assert.equal(hasCaptionDistinction(art),true);
 assert.equal(hasCaptionDistinction({...art,credit:'Peninsula Insider'}),false);
 assert.equal(hasCaptionDistinction({...art,imageKind:undefined}),false);
 assert.equal(hasCaptionDistinction({...art,caption:''}),false);
 assert.equal(hasCaptionDistinction({...art,caption:'Editorial illustration.'}),false);
 assert.equal(hasCaptionDistinction({...art,caption:'Editorial illustration.',credit:''}),false);
 assert.equal(hasCaptionDistinction({...art,imageKind:'photograph',credit:'Photographer'}),true);
});
test('the actual weekend-planning illustration retains its map warning in public display',()=>{
 const source=fs.readFileSync(new URL('../content/articles/how-to-plan-a-peninsula-weekend.md',import.meta.url),'utf8');
 const caption=source.match(/  caption: "([^"]+)"/)[1];
 const credit=source.match(/  credit: "([^"]+)"/)[1];
 assert.match(caption,/Two travellers looking over a map by the coast/);
 assert.match(imageCaption({caption,credit,imageKind:'illustration',depictionStatus:'illustrative'}),/Illustrated map, not for navigation\./);
 assert.equal(credit,'Illustration: Peninsula Insider');
 assert.match(source,/Original AI-assisted artwork/);
});
test('one useful art caption, with stored history unchanged',()=>{
 const copy=structuredClone(art); assert.equal(imageCaption(art),art.caption); assert.deepEqual(art,copy); assert.deepEqual(captionIssues(art),[]);
});
test('context photography remains distinct and never becomes a venue claim',()=>{
 assert.equal(imageCaption({caption:'Montalto vineyard.',imageKind:'photograph',depictionStatus:'illustrative',credit:'Visit Victoria'}),'Context photograph: Montalto vineyard.');
 assert.equal(imageCaption({depictionStatus:'illustrative'}),'Context image.');
 assert.equal(imageCaption({caption:'A conceptual memory map. Not geographic or navigational.',credit:'Illustration: PI'}),'A conceptual memory map. Not geographic or navigational.');
});
test('string-only CMS captions keep medium, context and navigational warnings',()=>{
 for(const caption of ['Original editorial illustration. Coastal hills.', 'Editorial illustration. A coastal scene; not a depiction of a named cafe.', 'Montalto. Regional context photograph, not a depiction of every place named in the story.', 'Illustrated map, not for navigation.']){
  assert.equal(imageCaptionText(caption),caption);
  assert.equal(imageCaption({caption,credit:'Peninsula Insider'}),caption);
 }
 assert.equal(imageCreditText('Peninsula Insider'),'Credit: Peninsula Insider');
 assert.equal(imageCreditText('Illustration: Peninsula Insider'),'Illustration: Peninsula Insider');
 assert.equal(imageCreditText('Photo courtesy of Visit Victoria'),'Photo courtesy of Visit Victoria');
 assert.equal(imageCreditText('Photographer / CC BY-SA 4.0'),'Photographer / CC BY-SA 4.0');
 assert.equal(imageCaption({caption:'Editorial illustration. Coastal hills.',credit:'Illustration: Peninsula Insider'}),'Coastal hills.');
});
test('actual itinerary CMS consumers retain captions and do not assume photography',()=>{
 const card=fs.readFileSync(new URL('../components/ItineraryCard.astro',import.meta.url),'utf8');
 assert.ok(card.includes('hero.override.caption'));assert.ok(card.includes('imageCreditText('));assert.ok(!card.includes('caption} Photo:'));
 const detail=fs.readFileSync(new URL('../pages/explore/plans/[slug].astro',import.meta.url),'utf8');
 assert.ok(detail.includes('articleHero.override.caption'));assert.ok(detail.includes('{articlePhotoCredit}'));assert.ok(detail.includes('const articlePhotoCredit = imageCreditText('));
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
 for(const className of ['event-image-credit','pi-card__image-note','itinerary-card__photo-credit','itinerary-detail__image-credit']) assert.ok(figureCaptionIssues(`<p class="${className}">This image shows Conceptual oversized cup.</p>`).length);
 assert.deepEqual(figureCaptionIssues('<p class="article-copy">This image shows a documented process.</p>'),[]);
 assert.deepEqual(figureCaptionIssues('<script>const template = `<p class="pi-card__image-note">This image shows Conceptual oversized cup.</p>`;</script>'),[]);
});
