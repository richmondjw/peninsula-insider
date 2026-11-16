import test from 'node:test';
import assert from 'node:assert/strict';
import { pageFacts, contextualMentions, targetState, catalogue } from './journal-link-audit.mjs';
import { venueHref, venueHrefForSlug, isListableVenue } from '../src/lib/editorial.ts';
const entity = { id:'venue:test', name:'Test Venue', aliases:['Test Venue'], href:'/eat/test/' };
const html = (body, tail='') => `<link rel="canonical" href="https://peninsulainsider.com.au/journal/test/"><div data-pi-prose-root>${body}</div>${tail}`;
const targets = () => new Map([['/eat/test/',pageFacts('<link rel="canonical" href="https://peninsulainsider.com.au/eat/test/"><h2 id="dining">Dining</h2>','/eat/test/')]]);
const audit = (body, es=[entity],tail='') => contextualMentions(pageFacts(html(body,tail),'/journal/test/'),es,targets());
test('first contextual occurrence, repeated names and recommendations remain distinct',()=>{
 const a=audit('<p>Test Venue for lunch.</p><p>Test Venue again.</p>',[entity],'<aside><a href="/eat/test/">Test Venue</a></aside>');
 assert.deepEqual(a.mentions.map(m=>[m.status,m.first]),[['missing',true],['missing',false]]);
 assert.equal(audit('<p>No mention.</p>',[entity],'<aside>Test Venue</aside>').mentions.length,0);
});
test('inline formatting joins into one exact name, boundaries prevent partial names',()=>{
 assert.equal(audit('<p>Test <strong>Venue</strong> today.</p>').mentions[0].status,'missing');
 assert.equal(audit('<p>Test Venues</p>').mentions.length,0);
});
test('existing internal links, wrong destinations and official references are distinct',()=>{
 for(const [href,status] of [['/eat/test/','linked'],['/stay/test/','wrong'],['https://official.test/book','external-reference']]) assert.equal(audit(`<p><a href="${href}">Test Venue</a></p>`).mentions[0].status,status);
 assert.equal(audit('<p><a href="/eat/test/">Test</a> Venue</p>').mentions[0].status,'partial-link');
});
test('same alias and explicit identity holds are ambiguous',()=>{
 assert.equal(audit('<p>Test Venue</p>',[entity,{...entity,id:'hotel:test'}]).mentions[0].status,'ambiguous');
 assert.equal(audit('<p>Test Venue</p>',[{...entity,hold:'ambiguous'}]).mentions[0].status,'ambiguous');
});
test('longest entity name wins over contained place',()=>{
 assert.equal(audit('<p>Test Venue</p>',[entity,{id:'place:test',aliases:['Test'],href:'/eat/test/'}]).mentions.length,1);
});
test('CMS override is audited without changing source; repeated analysis is idempotent',()=>{
 const raw=html('<p data-pi-block-id="b1">Old copy</p>','<script id="pi-block-overrides" type="application/json">{"b1":"Test Venue"}</script>');
 const p=pageFacts(raw,'/journal/test/'); const a=contextualMentions(p,[entity],targets());
 assert.equal(a.overrideCount,1); assert.equal(a.mentions[0].status,'missing');
 assert.deepEqual(contextualMentions(p,[entity],targets()),a);
 assert.match(raw,/Old copy/);
});
test('fragment, missing target, redirect, noindex, closed and expired fail closed',()=>{
 assert.equal(targetState({...entity,href:'/eat/test/#dining'},targets()),'eligible');
 assert.equal(targetState({...entity,href:'/eat/test/#lost'},targets()),'missing-fragment');
 assert.equal(targetState({...entity,href:'/eat/missing/'},targets()),'absent');
 for(const hold of ['closed-or-paused','expired']) assert.equal(targetState({...entity,hold},targets()),hold);
 const p=targets(); p.get('/eat/test/').noindex=true; assert.equal(targetState(entity,p),'retired-or-noindex');
 p.get('/eat/test/').stub=true; assert.equal(targetState(entity,p),'redirect-or-noncanonical');
});
test('noncanonical or noindex source is excluded',()=>{
 const p=pageFacts(html('<p>Test Venue</p>'),'/journal/other/'); assert.equal(contextualMentions(p,[entity],targets()).excluded,true);
});
test('shared routing keeps restaurant override, fragments, brewery and distillery truth',()=>{
 assert.equal(venueHref({id:'brew',data:{type:'brewery'}}),'/eat/brew/');
 assert.equal(venueHref({id:'gin',data:{type:'distillery'}}),'/eat/gin/');
 assert.equal(venueHrefForSlug('port-phillip-estate-restaurant'),'/wine/port-phillip-estate/');
 assert.equal(venueHrefForSlug('alba-thermal-springs'),'/explore/spas-and-wellness/#alba-thermal-springs');
 assert.equal(isListableVenue({status:'paused'}),false);
});

test('nested lists retain parent text and do not count child text twice',()=>{
 const a=audit('<ul><li>Test Venue<ul><li>Test Venue again</li></ul></li></ul>');
 assert.equal(a.mentions.length,2); assert.equal(a.mentions[0].first,true); assert.equal(a.mentions[1].first,false);
});

test('all approved pilot links have exact aliases and matching canonical resolver targets',async()=>{
 const {default:policy}=await import('./journal-link-policy.json',{with:{type:'json'}});
 const entities=await catalogue(new URL('../src/content/',import.meta.url),policy);
 for(const required of Object.values(policy.required).flat()) assert.ok(entities.some(e=>e.aliases.includes(required.name) && e.href===required.href),JSON.stringify(required));
 const rare=entities.find(e=>e.slug==='rare-hare');
 const pages=new Map([[rare.href,pageFacts(`<link rel="canonical" href="${rare.href}">`,rare.href)]]);
 for(const [markup,status] of [['Rare Hare','missing'],[`<a href="${rare.href}">Rare Hare</a>`,'linked'],['<a href="/stay/hotel/">Rare Hare</a>','wrong']]) {
  const result=contextualMentions(pageFacts(html(`<p>${markup}</p>`),'/journal/test/'),[rare],pages);
  assert.equal(result.mentions[0].status,status);
 }
});

test('a hyphenated street name does not assert a town mention',()=>{
 assert.equal(audit('<p>1175 Mornington-Flinders Road</p>',[{...entity,kind:'place',aliases:['Mornington','Flinders']}]).mentions.length,0);
});

test('published prose coverage includes multiple roots and excludes cards, FAQ and active plans',()=>{
 const route='/explore/regions/test/';
 const markup=`<link rel="canonical" href="${route}"><section class="prose"><p>Test Venue</p><div class="prose"><p>Test Venue again</p></div></section><div class="prose"><p>Test Venue third</p></div><aside class="prose"><p>Test Venue card</p></aside><section class="faq-section"><div class="prose"><p>Test Venue FAQ</p></div></section>`;
 const a=contextualMentions(pageFacts(markup,route),[entity],targets());
 assert.equal(a.scope,'published-prose');assert.equal(a.mentions.length,3);assert.deepEqual(a.mentions.map(m=>m.first),[true,false,false]);
 const plans='/explore/plans/test/';assert.equal(contextualMentions(pageFacts(markup.replace(route,plans),plans),[entity],targets()).excluded,true);
});
test('place introductory text is included, metadata and own-entity mentions are not link opportunities',()=>{
 const route='/explore/places/test/';const own={...entity,href:route};
 const markup=`<link rel="canonical" href="${route}"><p class="pdv2-lede__intro">Test Venue</p><p class="hero-deck">Test Venue metadata</p>`;
 const a=contextualMentions(pageFacts(markup,route),[own],new Map([[route,pageFacts(markup,route)]]));
 assert.equal(a.mentions.length,1);assert.equal(a.mentions[0].status,'self-reference');
});
