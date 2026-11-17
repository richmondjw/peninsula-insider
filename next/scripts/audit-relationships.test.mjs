import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {auditRelationships} from './audit-relationships.mjs';
const now=new Date('2026-10-09T22:00:00Z');
async function fixture(kind='mentions',override='',renamed=false,mdx=false) {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pi-relationship-'));
 for(const name of ['venues','articles','itineraries','events'])await fs.mkdir(path.join(dir,name));
 await fs.writeFile(path.join(dir,renamed?'venues/former-name.json':'venues/a.json'),JSON.stringify({...(renamed?{slug:'a',previousSlug:'former-name'}:{}),name:'Venue A',type:'restaurant',status:'active'}));
 await fs.writeFile(path.join(dir,mdx?'articles/story.mdx':'articles/story.md'),'---\ntitle: Story\nstatus: published\npublishedAt: 2026-10-01\nrelatedVenues: [a]\n---\n');
 const inventory=new Map([
 ['/journal/story/',{html:`<link rel="canonical" href="/journal/story/"><div data-pi-prose-root><p data-pi-block-id="b1"><a href="/eat/a/">Venue A</a></p></div>${override}`}],
 ['/eat/a/',{html:`<link rel="canonical" href="/eat/a/"><section data-venue-relationships="a"><div data-relationship-kind="${kind}"><div data-relationship-target="/journal/story/"><a href="/journal/story/">Story</a></div></div></section>`}],
 ]);
 const contextual={catalogue:[{id:'venue:a',name:'Venue A',aliases:['Venue A'],href:'/eat/a/'}],articles:[]};
 try{return await auditRelationships(inventory,pathToFileURL(dir+'/'),contextual,now);}finally{await fs.rm(dir,{recursive:true,force:true});}
}
test('built report reconstructs body evidence and accepts the matching rendered panel',async()=>{const r=await fixture();assert.deepEqual(r.evidenceDefects,[]);assert.deepEqual(r.invalidRenderedLinks,[]);assert.equal(r.venues[0].mentions.length,1);assert.equal(r.renderedPanels[0].edges[0].kind,'mentions');});
test('built report rejects an eligible URL misclassified as a related selection',async()=>{const r=await fixture('selections');assert.ok(r.evidenceDefects.some(x=>x.reason==='unsupported-rendered-edge'));});
test('CMS removal of a body link invalidates a stale rendered mention',async()=>{const r=await fixture('mentions','<script id="pi-block-overrides" type="application/json">{"b1":"<p>No venue link.</p>"}</script>');assert.equal(r.venues[0].mentions.length,0);assert.equal(r.venues[0].selections.length,1);assert.ok(r.evidenceDefects.some(x=>x.reason==='unsupported-rendered-edge'));});

test('renamed JSON records use the published slug rather than their historic filename',async()=>{const r=await fixture('mentions','',true);assert.deepEqual(r.evidenceDefects,[]);assert.equal(r.venues[0].id,'a');assert.equal(r.venues[0].href,'/eat/a/');assert.equal(r.venues[0].mentions.length,1);});

test('MDX actual rendered body evidence is included without parsing source prose',async()=>{const r=await fixture('mentions','',false,true);assert.deepEqual(r.evidenceDefects,[]);assert.equal(r.venues[0].mentions.length,1);assert.deepEqual(r.bodyHolds,[]);});
test('MDX CMS removal rejects a stale reverse mention',async()=>{const r=await fixture('mentions','<script id="pi-block-overrides" type="application/json">{"b1":"<p>Removed.</p>"}</script>',false,true);assert.equal(r.venues[0].mentions.length,0);assert.ok(r.evidenceDefects.some(e=>e.reason==='unsupported-rendered-edge'));});
