import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const { transform } = await import(pathToFileURL(createRequire(import.meta.resolve('astro')).resolve('@astrojs/compiler').replace(/index\.cjs$/, 'index.js')).href);
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

// Render the actual Astro template and eligibility logic. Only the collection
// boundary and shared Card are fixtures; full Card styling is covered in journeys.
async function compile(source) {
  const {code} = await transform(source, {internalURL:'astro/compiler-runtime', resultScopedSlot:true});
  const runnable = code.replace('"astro/compiler-runtime"', JSON.stringify(import.meta.resolve('astro/compiler-runtime')))
    .replace(/^import "[^"\n]*\?astro&type=style[^"\n]*";$/gm, '')
    // Vite consumes compiler metadata; this isolated server render has no bundler.
    .replace(/,\s*createMetadata as \$\$createMetadata/, '')
    .replace(/^export const \$\$metadata = .*;$/gm, '');
  return (await import('data:text/javascript;base64,'+Buffer.from(runnable).toString('base64'))).default;
}
const source = readFileSync(new URL('../src/components/v5/home/HomeInsiderPicks.astro', import.meta.url),'utf8');
const component = await compile(source
  .replace("import { getCollection } from 'astro:content';", 'const getCollection = async (_name, filter) => Astro.props.venues.filter(filter);')
  .replace("'../../../lib/editorial'", JSON.stringify(new URL('../src/lib/editorial.ts', import.meta.url).href))
  .replace("import Card from '../Card.astro';", 'const Card = Astro.props.Card;'));
const Card = await compile('---\nconst {title, href, image, partnerLabel, lockImageEditing} = Astro.props;\n---\n<li data-pick data-locked={lockImageEditing}><a href={href}>{title}</a><img src={image.src} alt={image.alt}/>{partnerLabel && <span>{partnerLabel}</span>}</li>');
const slugs=['crittenden-estate','alba-thermal-springs','merricks-general-wine-store'];
const fixtures = slugs.map(slug=>({id:slug,data:{...JSON.parse(readFileSync(new URL(`../src/content/venues/${slug}.json`,import.meta.url),'utf8')), gallery:[{src:`/test/${slug}.webp`,alt:slug,rightsStatus:'recorded',provenanceReview:'verified',permittedUses:['website']}]}}));
const container = await AstroContainer.create();
const render = venues => container.renderToString(component,{props:{venues,Card}});
for (let count=0;count<=3;count++) {
  test(`Insider Picks renders truthful copy for ${count} eligible venues`,async()=>{
    const venues=structuredClone(fixtures);
    venues.forEach((v,i)=>{if(i>=count)v.data.gallery=[];});
    const html=await render(venues);
    assert.equal((html.match(/data-pick/g)||[]).length,count);
    assert.doesNotMatch(html,/\b(?:three|all three|one|two|3 places)\b/i);
    assert.equal(html.includes('home-picks-title'),count>0);
    assert.equal(html.includes('Scroll to explore'),count>1);
    assert.equal(html.includes('tabindex="0"'),count>1);
    if(count>0) assert.match(html,/aria-label="Insider Picks"/);
    if(count===1) assert.match(html,/home-picks__grid--single/);
  });
}
test('unverified rights cannot enter the picks; partner status only adds disclosure',async()=>{
  for(const change of [i=>i.rightsStatus='unknown',i=>i.provenanceReview='pending',i=>i.permittedUses=['social']]) {
    const venues=structuredClone(fixtures);venues.forEach(v=>change(v.data.gallery[0]));
    assert.doesNotMatch(await render(venues),/home-picks-title|data-pick/);
  }
  const venues=structuredClone(fixtures);venues[0].data.featuredPartner=true;
  const html=await render(venues);
  assert.equal((html.match(/data-pick/g)||[]).length,3);
  assert.match(html,/>Partner</);assert.match(html,/data-locked="true"/);
  assert.ok(html.indexOf('Crittenden')<html.indexOf('Alba'));
});
