import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { isArtwork, cleanCaption } from '../src/lib/image-caption.mjs';
const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
for (const slug of ['arthurs-views', 'birch-creek', 'blue-moon-cottages', 'plantation-house-whitecliffs']) {
 test(`${slug}: original regional artwork has honest recorded provenance and usable derivatives`, async () => {
  const {heroImage:i} = JSON.parse(read(`../src/content/venues/${slug}.json`));
  assert.equal(i.depictionStatus,'illustrative'); assert.equal(i.rightsStatus,'recorded');
  assert.equal(i.provenanceReview,'verified'); assert.ok(i.permittedUses.includes('website'));
  assert.match(i.alt,/^Graphic illustration/); assert.ok(isArtwork(i)); assert.equal(cleanCaption(i.caption),'');
  assert.match(i.permission,/No third-party photographs/);
  for(const width of [1536,960,480]) {
   const src=width===1536?i.src:i.src.replace('.webp',`-${width}.webp`);
   const meta=await sharp(new URL('../public'+src,import.meta.url).pathname).metadata();
   assert.equal(meta.width,width); assert.equal(meta.height,width*2/3); assert.equal(meta.format,'webp');
  }
 });
}
test('card does not mislabel original artwork as a photograph and keeps existing rights safeguards',()=>{
 const card=read('../src/components/VenueCard.astro');
 assert.match(card,/photoCredit && !isArtwork\(hero.override \?\? data.heroImage\)/);
 assert.match(card,/ignoreOverride: href.startsWith\('\/stay\/'\)/);
 assert.match(card,/rightsStatus === 'recorded'/); assert.match(card,/provenanceReview === 'verified'/);
 assert.match(read('../src/layouts/BaseLayout.astro'),/window.location.pathname.startsWith\('\/stay\/'\) && slot.entity_type === 'venue'\) return/);
});
