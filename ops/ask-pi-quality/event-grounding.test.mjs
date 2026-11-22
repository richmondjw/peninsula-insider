import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './staging-fixtures.mjs';
import {groundEventRecords,eventAnswer} from '../lib/concierge-event-grounding.mjs';
import {groundEventRecords as bundled} from '../lib/generated/concierge-event-grounding.mjs';
test('source and generated canonical event runtime preserve every available-source development context',()=>{
 for(const f of fixtures){
  if(f.sourceAvailable===false)continue; // Source failure is tested at the reader capability boundary.
  const actual=groundEventRecords(f.records,f.context,new Date(f.now));
  assert.deepEqual(bundled(f.records,f.context,new Date(f.now)),actual,f.id);
  assert.equal(actual.disposition,f.expected.disposition,f.id);assert.deepEqual(actual.matches.map(r=>r.id),f.expected.ids,f.id);assert.equal(actual.season,f.expected.season,f.id);
 }
});
test('Red Hill December produces dated evidence or abstention, never a seasonal recommendation',()=>{
 const f=fixtures[0],result=eventAnswer(f.records,'What\u2019s on red hill December?',new Date(f.now));
 assert.equal(result.disposition,'answer');assert.match(result.answer,/2026-12-12/);assert.match(result.provenance_footer,/Summer in Victoria/);assert.doesNotMatch(result.answer,/truffle|Saturdays|winter/);
 assert.equal(eventAnswer([],f.query,new Date(f.now)).disposition,'abstain');
});
