import test from 'node:test';
import assert from 'node:assert/strict';
import {input,embedding,prepare} from './staging-fixtures.mjs';
import {connectSnapshotWriter,refreshConciergeSnapshot,SNAPSHOT_PROTOCOL} from '../lib/concierge-snapshot-transport.mjs';
const capabilities={protocol:SNAPSHOT_PROTOCOL,atomicCommit:true,retainedRollback:true};
test('missing atomic capability fails before source preparation or mutation',async()=>{
 const calls=[];await assert.rejects(refreshConciergeSnapshot({rpc:async(name)=>{calls.push(name);return [{...capabilities,atomicCommit:false}];},embed:()=>assert.fail('embedding')}),/incompatible/);
 assert.deepEqual(calls,['concierge_snapshot_capabilities']);
});
test('writer prepares complete data then publishes via exactly one commit; lost acknowledgement recovers',async()=>{
 const calls=[];let current=null;
 const rpc=async(name,args)=>{calls.push(name);
  if(name.endsWith('capabilities'))return [capabilities];
  if(name.endsWith('read'))return current?[current]:[];
  if(name.endsWith('commit')){assert.equal(args.expected_token,null);current={token:args.snapshot_token,payload:args.snapshot_payload};throw Error('connection lost');}
  assert.fail(name);
 };
 const value=input();const result=await refreshConciergeSnapshot({rpc,...value,...embedding});
 assert.equal(result.recovered,true);assert.equal(result.token,current.token);
 assert.equal(calls.filter(n=>n.endsWith('commit')).length,1);
 assert(calls.every(n=>n.startsWith('concierge_snapshot_')));
});
test('malformed inventory and failed embedding never reach commit',async()=>{
 for(const invalid of [true,false]){
  const calls=[];const value=input();if(invalid)value.manifest.outcomes=[];
  await assert.rejects(refreshConciergeSnapshot({...value,dimensions:2,embed:async()=>{throw Error('embedding failed');},rpc:async name=>{calls.push(name);return name.endsWith('capabilities')?[capabilities]:[];}}));
  assert(!calls.some(n=>n.endsWith('commit')));
 }
});
test('transport rejects capped/ambiguous reads, corrupted payloads and wrong retained token',async()=>{
 const p=await prepare();
 for(const rows of [[p,p],[{...p,payload:p.payload+' '}],[p]]){
  const storage=await connectSnapshotWriter(async name=>name.endsWith('capabilities')?[capabilities]:rows);
  await assert.rejects(storage.readSnapshot('f'.repeat(64)));
 }
});
test('commit acknowledgements must match the submitted token',async()=>{
 const p=await prepare();const storage=await connectSnapshotWriter(async name=>name.endsWith('capabilities')?[capabilities]:[{committed:true,retry:false,token:'wrong'}]);
 await assert.rejects(storage.commit(p),/snapshot-commit-ack/);
});
