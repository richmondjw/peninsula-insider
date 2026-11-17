import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {auditRelationships} from './audit-relationships.mjs';
const now=new Date('2026-10-09T22:00:00Z');
async function fixture(kind='mentions',override='') {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pi-relationship-'));
 for(const name of ['venues','articles','itineraries','events'])await fs.mkdir(path.join(dir,name));
 await fs.writeFile(path.join(dir,'venues/a.json'),JSON.stringify({name:'Venue A',type:'restaurant',status:'active'}));
 await fs.writeFile(path.join(dir,'articles/story.md'),'---\ntitle: Story\nstatus: published\npublishedAt: 2026-10-01\nrelatedVenues: [a]\n---\n');
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
