import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {input} from './staging-fixtures.mjs';
import {prepareSnapshot} from '../lib/concierge-snapshot.mjs';
import {answerWithCmsConsistency} from '../lib/concierge-cms-consistency.mjs';
const now=Date.parse('2026-11-17T00:00:00Z');
const receipt=()=>({version:1,rows_payload:'[]',row_count:0,revision:createHash('sha256').update('[]').digest('hex'),observed_at:new Date(now).toISOString()});
async function options(){const value=input();value.manifest.cmsRevision=receipt().revision;return {prepared:await prepareSnapshot(null,value.manifest,value.records,{dimensions:2,embed:async()=>[1,0]}),clock:()=>now,readCms:async()=>receipt(),prepareAnswer:()=>({text:'synthetic buffered answer'})};}
test('matching uncached CMS checks return only a buffered as-of answer',async()=>{
 const o=await options();let reads=0;const result=await answerWithCmsConsistency({...o,readCms:async()=>{reads++;return receipt();}});
 assert.equal(reads,2);assert.equal(result.disposition,'verified-as-of');assert.equal(result.consistency.cmsObservedAt,receipt().observed_at);
});
test('stale index, missing adapter, invalid/capped receipts and outage abstain before answer work',async()=>{
 const o=await options();
 for(const readCms of [undefined,async()=>{throw Error('private transport details');},async()=>({...receipt(),revision:'f'.repeat(64)}),async()=>({...receipt(),row_count:1007}),async()=>({...receipt(),observed_at:new Date(now-10000).toISOString()})]){
  const result=await answerWithCmsConsistency({...o,readCms,prepareAnswer:()=>assert.fail('must not prepare')});assert.equal(result.disposition,'unavailable');assert.deepEqual(result.recommendations,[]);assert(!JSON.stringify(result).includes('private transport'));
 }
});
test('CMS drift or failure during preparation discards buffered answer without fallback',async()=>{
 const o=await options();let reads=0;
 const changed={...receipt(),rows_payload:'[ ]',revision:createHash('sha256').update('[ ]').digest('hex')};
 const result=await answerWithCmsConsistency({...o,readCms:async()=>++reads===2?changed:receipt()});
 assert.equal(reads,2);assert.equal(result.disposition,'unavailable');assert(!JSON.stringify(result).includes('synthetic buffered'));
});
test('a hanging revision request times out and cannot release an answer later',async()=>{
 const o=await options();const result=await answerWithCmsConsistency({...o,timeoutMs:5,readCms:()=>new Promise(()=>{}),prepareAnswer:()=>assert.fail('no answer')});assert.equal(result.disposition,'unavailable');
});
test('post-check edits are outside the as-of guarantee; no distributed atomicity claimed',async()=>{
 const o=await options();const result=await answerWithCmsConsistency(o);
 // A later edit cannot retract bytes already returned. Consumers must preserve
 // observedAt and must never label the answer current or booking availability.
 assert.equal(result.disposition,'verified-as-of');assert.equal(result.consistency.cmsObservedAt,new Date(now).toISOString());
});
