import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect,destination,score,SITE} from './internal-link-quality.mjs';
import {rewrites,apply} from './canonicalize-internal-links.mjs';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {articleLinkRelevance} from '../src/lib/article-link-relevance.mjs';
import {pickRelatedArticles} from '../src/lib/related.ts';
const page=(route,body='',head='')=>({...inspect(`<html><head><link href="${SITE+route}" rel="canonical">${head}</head><body>${body}</body></html>`,route),html:body});
test('DOM parser handles reordered attributes, image alt and semantic article headers',()=>{
 const p=page('/','<header class="article-hero"><a href="/story"><img alt="Red Hill guide" src="x"></a></header><nav><a href="/wine/">Wine</a></nav>');
 assert.equal(p.links[0].text,'Red Hill guide');assert.equal(p.links[0].chrome,false);assert.equal(p.links[0].url.pathname,'/story/');assert.equal(p.links[1].chrome,true);
});
test('canonical chains preserve queries and fragments and reject cycles',()=>{
 const pages=new Map([['/old/',page('/old/','','<meta http-equiv="refresh" content="0;url=/middle/">')],['/middle/',page('/middle/','','<meta http-equiv="refresh" content="0;url=/new/">')],['/new/',page('/new/','<h2 id="map">Map</h2>')]]);
 assert.equal(destination(new URL(SITE+'/old/?source=guide#map'),pages).href,SITE+'/new/?source=guide#map');
 pages.set('/new/',page('/new/','','<meta http-equiv="refresh" content="0;url=/old/">'));
 assert.throws(()=>destination(new URL(SITE+'/old/'),pages),/cycle/);
});
test('rewrites only internal href attributes and refuses missing destination fragments',()=>{
 const source=page('/','<a href="/old/?a=1#map">Guide</a><a href="/old/#lost">Other section</a><a href="https://example.com/old/">External</a>');
 const pages=new Map([['/',source],['/old/',page('/old/','','<meta http-equiv="refresh" content="0;url=/new/">')],['/new/',page('/new/','<h2 id="map">Map</h2>')]]);
 assert.deepEqual(rewrites(source,pages).map(e=>e.href),['/new/?a=1#map']);
});
test('gate detects orphan, broken target, fragment and empty link without exempting public pages',()=>{
 const pages=new Map([['/',page('/','<a href="/missing/">Missing</a><a href="/guide/#bad">Guide</a><a href="/guide/"></a>')],['/guide/',page('/guide/')],['/orphan/',page('/orphan/')]]);
 const r=score(pages);assert.equal(r.broken.length,1);assert.equal(r.missingFragments.length,1);assert.deepEqual(r.orphans,['/orphan/']);assert.deepEqual(r.unreachable,['/orphan/']);
});
test('duplicate decorative image anchor is supported by its named destination link',()=>{
 const pages=new Map([['/',page('/','<a aria-hidden="true" href="/guide/"><img src="x" alt=""></a><a href="/guide/">Guide</a>')],['/guide/',page('/guide/','<a href="/">Home</a>')]]);
 assert.equal(score(pages).empty.length,0);assert.equal(score(pages).score,100);
});
test('related reading prioritises real topics and recorded places over matching format',()=>{
 const source={id:'wine',data:{format:'hub-guide',tags:['wine','weekly'],relatedPlaces:[{id:'red-hill'}]}};
 const unrelated={id:'beach',data:{format:'hub-guide',tags:['beaches','weekly']}};
 const place={id:'red-hill-lunch',data:{format:'service',tags:['dining'],relatedPlaces:['red-hill']}};
 assert.equal(articleLinkRelevance(source,unrelated),0);assert.ok(articleLinkRelevance(source,place)>0);
 assert.deepEqual(pickRelatedArticles(source,[source,unrelated,place],{limit:6,relevantOnly:true}).map(x=>x.id),['red-hill-lunch']);
 assert.deepEqual(pickRelatedArticles(source,[source,unrelated,place],{explicit:['beach'],limit:6,relevantOnly:true}).map(x=>x.id),['beach','red-hill-lunch']);
});
test('rewiring preserves every byte except href and is idempotent',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'pi-link-rewire-'));
 try {
  const source='<html><head><link rel="canonical" href="'+SITE+'/"></head><body><a class="keep" href="/old/?a=1&amp;b=2#map" onclick="track()">Editorial copy</a><script>const href="/old/";</script></body></html>';
  await mkdir(path.join(root,'old'));await mkdir(path.join(root,'new'));
  await writeFile(path.join(root,'index.html'),source);
  await writeFile(path.join(root,'old/index.html'),'<meta http-equiv="refresh" content="0;url=/new/">');
  await writeFile(path.join(root,'new/index.html'),'<link rel="canonical" href="'+SITE+'/new/"><h2 id="map">Map</h2>');
  assert.equal((await apply(root)).length,1);
  assert.equal(await readFile(path.join(root,'index.html'),'utf8'),source.replace('href="/old/?a=1&amp;b=2#map"','href="/new/?a=1&amp;b=2#map"'));
  assert.equal((await apply(root)).length,0);
 }finally{assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir())+path.sep+'pi-link-rewire-'));await rm(root,{recursive:true,force:true});}
});
test('local fragments are checked while consent controls and the browser top fragment are distinguished',()=>{
 const p=page('/','<a href="#missing">Missing section</a><a href="#top">Top</a><a href="#cookie-settings" data-pi-consent="open">Cookie settings</a>');
 const r=score(new Map([['/',p]]));assert.equal(r.missingFragments.length,1);assert.equal(r.missingFragments[0].fragment,'#missing');
});
