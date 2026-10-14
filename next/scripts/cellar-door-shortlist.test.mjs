import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { reviewedCellarPhoto, resolveCellarHero } from '../src/lib/cellar-door-media.mjs';
import { inlineCellarStyles, rebaseCssUrls } from '../src/lib/cellar-door-styles-integration.mjs';
const guide=JSON.parse(readFileSync('src/data/cellar-door-shortlist.json'));
test('public tasting selection excludes non-visitable producers and duplicates',()=>{
 assert.equal(new Set(guide.selections.map(p=>p.slug)).size,guide.selections.length);
 for (const pick of guide.selections) {
  const venue=JSON.parse(readFileSync(`src/content/venues/${pick.slug}.json`));
  assert.equal(venue.type,'winery');
  assert.doesNotMatch(venue.signature,/not open to (the )?public/i);
  assert.ok(!guide.excluded.some(p=>p.slug===pick.slug));
  assert.ok(pick.reason && pick.fit && pick.planning && pick.sourceNote);
  assert.match(pick.source,/^https:\/\//);
 }
 assert.ok(guide.excluded.some(p=>p.slug==='dexter-wines'));
});
test('every selection has a reviewed actual photo or an explicit rights blocker',()=>{
 for (const p of guide.selections) {
  const venue=JSON.parse(readFileSync(`src/content/venues/${p.photoVenue ?? p.slug}.json`));
  const image=reviewedCellarPhoto(venue);
  if(!image){assert.equal(p.imageStatus,'rights-unverified',p.slug);assert.ok(guide.imageBlockers.some(b=>b.slug===p.slug));continue;} assert.ok(existsSync('public'+image.src),image.src);
  assert.ok(image.credit && image.permission && image.sourceUrl && image.license);
 }
});
test('generic, unreviewed and unpermitted images cannot silently fill a winery slot',()=>{
 assert.equal(reviewedCellarPhoto({heroImage:{src:'/images/grapes.webp',depictionStatus:'illustrative'}}),undefined);
 const photo={src:'/images/actual.webp',alt:'Actual venue',credit:'Creator',sourceUrl:'Source',permission:'Permission',license:'Licence',depictionStatus:'actual',rightsStatus:'recorded',provenanceReview:'verified',permittedUses:['website']};
 assert.equal(reviewedCellarPhoto({heroImage:photo}),photo);
 assert.equal(reviewedCellarPhoto({heroImage:{...photo,rightsStatus:'unknown'}}),undefined);
 assert.equal(reviewedCellarPhoto({heroImage:{...photo,permittedUses:['social']}}),undefined);
});
test('guide preserves credits during hydration and uses responsive opt-in',()=>{
 const photo=readFileSync('src/components/CellarDoorPhoto.astro','utf8');
 assert.match(photo,/resolveHero\(/); assert.match(photo,/ignoreOverride:true/);
 assert.match(photo,/data-pi-no-hydrate/); assert.match(photo,/data-pi-responsive/);
 assert.doesNotMatch(photo,/hero--placeholder/);
});
test('inline styles preserve shared CSS source and do not inline third-party URLs',async()=>{
 const input='<link rel="stylesheet" href="/_astro/shared.css"><link rel="stylesheet" href="https://example.org/x.css">';
 const calls=[];
 const result=await inlineCellarStyles(input,async href=>{calls.push(href);return '.body{color:navy}';});
 assert.deepEqual(calls,['/_astro/shared.css']);
 assert.match(result,/<style data-cellar-bundled-style>\.body/);
 assert.match(result,/href="https:\/\/example.org\/x.css"/);
});
test('relative CSS URLs retain their original stylesheet base',()=>{
 const css='.a{background:url(../images/icon.svg)}.b{src:url(font.woff2)}.c{background:url(data:image/png;base64,AAAA)}';
 const out=rebaseCssUrls(css,'/_astro/shared.css');
 assert.ok(out.includes('/images/icon.svg'));assert.ok(out.includes('/_astro/font.woff2'));assert.ok(out.includes('data:image/png;base64,AAAA'));
});
test('hero venue, image and caption remain aligned after selection reorder',()=>{
 const venue={data:JSON.parse(readFileSync(`src/content/venues/${guide.hero.venueSlug}.json`))};
 const before=resolveCellarHero(guide,[venue]);
 const after=resolveCellarHero({...guide,selections:[...guide.selections].reverse()},[venue]);
 assert.equal(after.photo.src,before.photo.src);assert.equal(after.caption,before.caption);
 assert.ok(after.caption.startsWith(venue.data.name));
});
test('quoted imports rebase and responsive preload matches the actual hero source',async()=>{
 assert.equal(rebaseCssUrls('@import "../theme.css" screen;','/_astro/layout.css'),'@import "/theme.css" screen;');
 const source='<source data-pi-avif-source type="image/avif" srcset="/_media/a-480.avif 480w, /_media/a-800.avif 800w" sizes="100vw">';
 const html=await inlineCellarStyles('<head><meta name="viewport" content="width=device-width"></head><body>'+source+'</body>',async()=>null);
 assert.ok(html.includes('imagesrcset="/_media/a-480.avif 480w, /_media/a-800.avif 800w"'));
 assert.ok(html.includes('imagesizes="100vw"'));assert.ok(html.indexOf('name="viewport"')<html.indexOf('data-cellar-hero-preload'));
 assert.equal((await inlineCellarStyles('<head></head>'+source,async()=>null)).includes('data-cellar-hero-preload'),false);
 assert.equal((await inlineCellarStyles(html,async()=>null)).match(/data-cellar-hero-preload/g).length,1);
});

test('conditional and switchable stylesheets keep their link semantics',async()=>{
 const conditional=['<link rel="stylesheet" href="/_astro/print.css" media="print">','<link rel="alternate stylesheet" href="/_astro/alternate.css" title="Alternative">','<link rel="stylesheet" href="/_astro/disabled.css" disabled>','<link rel="stylesheet" href="/_astro/titled.css" title="Preferred">'];
 const calls=[];const html=await inlineCellarStyles(conditional.join('')+'<link rel="stylesheet" href="/_astro/plain.css">',async href=>{calls.push(href);return '.a{color:navy}';});
 assert.deepEqual(calls,['/_astro/plain.css']);for(const tag of conditional)assert.ok(html.includes(tag));
});
