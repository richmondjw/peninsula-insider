/** Production event projection regression tests; no network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {chunkEvent,projectEventInventory} from '../scripts/concierge-events.mjs';
const fixtures=JSON.parse(await readFile(new URL('./fixtures.v1.json',import.meta.url),'utf8'));
const fixture=id=>fixtures.cases.find(f=>f.id===id);
test('writer retains future recurrence after original date passes',()=>{
 const f=fixture('recurring-original-date-past');
 const result=chunkEvent(f.records[0].data,'synthetic-market',f.now);
 assert.equal(result.excluded,null);assert.equal(result.chunks[0].event_date,'2026-12-12');
});
test('writer preserves exact suburb and does not mutate CMS source',()=>{
 const f=fixtures.cases[0],data=structuredClone(f.records[0].data),before=structuredClone(data);
 const result=chunkEvent(data,'synthetic-market',f.now);
 assert.equal(result.chunks[0].region,'red-hill');assert.deepEqual(data,before);
});
test('writer excludes published cancelled records',()=>{
 const f=fixture('cancelled');assert.equal(chunkEvent(f.records[0].data,'synthetic-market',f.now).chunks.length,0);
});
test('malformed input is a failed inventory item, never an exclusion',()=>{
 for(const data of [null,[],{}, {title:'Broken',startDate:'2026-02-30'}, {title:'Broken',startDate:'2026-12-01',nextOccurrence:'invalid'}]){
  const result=projectEventInventory([{slug:'broken',data}],fixtures.cases[0].now);
  assert.equal(result.complete,false);assert.equal(result.outcomes[0].status,'failed');assert.equal(result.chunks.length,0);
 }
});
test('writer preserves occurrence cancellation, confirmed-only and postponed boundaries',()=>{
 for(const id of ['confirmed-only-no-date','cancelled','postponed-no-date','cms-cancelled-override']){
  const f=fixture(id);
  for(const record of f.records)assert.equal(chunkEvent(record.data,record.data.slug??record.id,f.now).chunks.length,0,id);
 }
 const f=fixture('overnight-still-running'),record=f.records[0];
 assert.equal(chunkEvent(record.data,record.data.slug??record.id,f.now).excluded,null);
});
test('omitted legacy status matches Astro default; explicit draft and archive never regain admission',async()=>{
 const f=fixture('recurring-original-date-past'),data=structuredClone(f.records[0].data);delete data.status;
 const schema=await readFile(new URL('../../next/src/content.config.ts',import.meta.url),'utf8');
 assert.match(schema.slice(schema.indexOf('const events =')),/status: z\s*\.enum\(\['draft', 'review', 'scheduled', 'published', 'expired', 'past', 'archived'\]\)\s*\.default\('published'\)/);
 assert.equal(chunkEvent(data,'synthetic-market',f.now).excluded,null);assert.equal(data.status,undefined);
 for(const status of ['draft','archived','review','scheduled','expired','past'])assert.equal(chunkEvent({...data,status},'synthetic-market',f.now).chunks.length,0);
});
test('every synthetic source has a revision and explicit projection or exclusion',()=>{
 for(const f of fixtures.cases){
  const records=f.records.map((r,i)=>({slug:r.data.slug??`synthetic-${i}`,data:r.data}));
  const result=projectEventInventory(records,f.now);
  assert.equal(result.outcomes.length,records.length,f.id);
  assert(result.outcomes.every(r=>r.revision.length===64&&(r.status==='projected'||r.reason)),f.id);
 }
});
test('CMS withdrawal changes revision and removes projected chunks without source mutation',()=>{
 const f=fixture('recurring-original-date-past'),data=structuredClone(f.records[0].data);
 delete data.slug;
 const original=projectEventInventory([{slug:'market',data}],f.now);data.cancelled=true;
 const changed=projectEventInventory([{slug:'market',data}],f.now);
 assert.notEqual(original.outcomes[0].revision,changed.outcomes[0].revision);
 assert.equal(changed.chunks.length,0);assert.equal(changed.outcomes[0].status,'excluded');
 assert.throws(()=>projectEventInventory([{slug:'market',data},{slug:'market',data}],f.now),/Duplicate/);
});
