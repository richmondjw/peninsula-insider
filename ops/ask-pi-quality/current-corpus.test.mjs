/** These passing assertions reproduce known defects in the unchanged writer. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { resolveFixture } from './evaluator.mjs';
const fixtures=JSON.parse(await readFile(new URL('./fixtures.v1.json',import.meta.url),'utf8'));
const source=await readFile(new URL('../scripts/refresh-corpus.mjs',import.meta.url),'utf8');
const start=source.indexOf('function chunkEvent('),end=source.indexOf('\nfunction chunkEditorialBlock',start);
assert(start>0&&end>start,'writer structure changed: re-audit baseline extraction');
const clock='2026-11-16T19:30:00Z';
const context=vm.createContext({Date,EVENT_GRACE_DAYS:14,eventId:s=>`event_${s.replace(/-/g,'_')}`,isoDate:d=>new Date(d).toISOString().slice(0,10),daysAgo:n=>new Date(Date.parse(clock)-n*86400000)});
vm.runInContext(source.slice(start,end),context,{timeout:1000});
test('KNOWN DEFECT: writer drops approved future recurrence when original date is past',()=>{
  const f=fixtures.cases.find(f=>f.id==='recurring-original-date-past');
  assert.equal(resolveFixture(f).matches.length,1);
  const result=context.chunkEvent(f.records[0].data,'synthetic-market',new Date(clock));
  assert.equal(result.expired,true);assert.equal(result.chunks.length,0);
});
test('KNOWN DEFECT: writer indexes suburb-only Red Hill as other',()=>{
  const f=fixtures.cases[0];
  assert.equal(context.chunkEvent(f.records[0].data,'synthetic-market',new Date(clock)).chunks[0].region,'other');
});
test('KNOWN DEFECT: writer admits a future published cancelled event',()=>{
  const f=fixtures.cases.find(f=>f.id==='cancelled');assert.equal(resolveFixture(f).matches.length,0);
  assert(context.chunkEvent(f.records[0].data,'synthetic-market',new Date(clock)).chunks.length>0);
});
