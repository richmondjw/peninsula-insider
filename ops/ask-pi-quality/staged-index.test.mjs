import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {hash} from './evaluator.mjs';
import {prepareSnapshot,readPrepared,retrieveGrounded,prepareRollback,commitPrepared} from './staged-index.mjs';
import {fixtures,baseline,bundle,embedding,input,prepare} from './staging-fixtures.mjs';
async function database(){return join(await mkdtemp(join(tmpdir(),'pi-atomic-stage-')),'index.sqlite');}
function call(db,request){
 const result=spawnSync(process.platform==='win32'?'python':'python3',[fileURLToPath(new URL('./sqlite-stage.py',import.meta.url)),db],{input:JSON.stringify(request),encoding:'utf8'});
 if(result.error)throw result.error;
 return {status:result.status,value:result.stdout.trim()?JSON.parse(result.stdout):null,stderr:result.stderr};
}
function commit(db,prepared,extra={}) {return call(db,{action:'commit',prepared,...extra});}
function active(db){const r=call(db,{action:'read'});assert.equal(r.status,0,r.stderr);return r.value;}
function storageFor(db){return {read:async()=>active(db),readSnapshot:async token=>call(db,{action:'read-snapshot',token}).value,commit:async prepared=>{const r=commit(db,prepared);if(r.status)throw Error(r.value?.error);return r.value;}};}
function concurrentCommit(db,prepared){return new Promise((resolve,reject)=>{
 const child=spawn(process.platform==='win32'?'python':'python3',[fileURLToPath(new URL('./sqlite-stage.py',import.meta.url)),db]);
 let output='';child.stdout.on('data',chunk=>output+=chunk);child.on('error',reject);
 child.on('close',status=>resolve({status,value:output.trim()?JSON.parse(output):null}));child.stdin.end(JSON.stringify({action:'commit',prepared}));
});}

test('all 24 synthetic retrieval tasks run against a prepared snapshot with no broadened fallback',async()=>{
 for(const f of fixtures){
  const snapshot=await prepare(f),response=retrieveGrounded(snapshot,f,bundle);
  assert.equal(response.disposition,f.expected.disposition,f.id);assert.equal(response.season,f.expected.season,f.id);
  assert.deepEqual(response.matches.map(m=>m.id),f.expected.ids,f.id);
  assert(response.claims.every(c=>c.revision&&c.href&&c.occurrence),f.id);
 }
});
test('embedding preparation failure never touches the active durable snapshot',async()=>{
 const db=await database(),old=await prepare();assert.equal(commit(db,old).status,0);
 const changed=structuredClone(baseline);changed.records[0].data.title='Changed synthetic title';changed.records[0].revision='v2';
 await assert.rejects(prepare(changed,old,'next',{dimensions:2,embed:async()=>{throw Error('injected embedding failure');}}),/embedding failure/);
 assert.equal(active(db).token,old.token);
 const partial=structuredClone(changed);partial.records.push({...structuredClone(partial.records[0]),id:'second',data:{...partial.records[0].data,slug:'second',title:'Second'}});
 let attempts=0;
 await assert.rejects(prepare(partial,old,'partial',{dimensions:2,embed:async()=>{if(++attempts===2)throw Error('second embedding failed');return [0,1];}}),/second embedding/);
 assert.equal(attempts,2);assert.equal(active(db).token,old.token);
 await assert.rejects(prepare(changed,old,'next',{dimensions:2,embed:async()=>[NaN]}),/embedding-shape/);
 assert.equal(active(db).token,old.token);
});
test('native SQLite rollback and process crashes before commit retain the complete previous snapshot',async()=>{
 for(const extra of [{fail:true},{crash:'after-insert'},{crash:'after-pointer'}]){
  const db=await database(),old=await prepare(),next=await prepare(baseline,old,'next');
  assert.equal(commit(db,old).status,0);assert.notEqual(commit(db,next,extra).status,0);
  assert.deepEqual(active(db),{token:old.token,payload:old.payload});
  assert.equal(commit(db,next).status,0);assert.equal(active(db).token,next.token);
 }
});
test('crash after commit is an uncertain success: reread and identical retry do not duplicate work',async()=>{
 const db=await database(),old=await prepare(),next=await prepare(baseline,old,'next');commit(db,old);
 assert.equal(commit(db,next,{crash:'after-commit'}).status,75);assert.equal(active(db).token,next.token);
 assert.deepEqual(commit(db,next).value,{committed:true,retry:true});
});
test('concurrent prepared candidates compare predecessor atomically; stale writer cannot overwrite winner',async()=>{
 const db=await database(),old=await prepare(),a=await prepare(baseline,old,'a'),b=await prepare(baseline,old,'b');commit(db,old);
 const results=await Promise.all([concurrentCommit(db,a),concurrentCommit(db,b)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[0,1]);
 const winner=results[0].status===0?a:b;
 assert.deepEqual(active(db),{token:winner.token,payload:winner.payload});
});
test('cancellation/delete promotes complete inventory and compatible rollback changes retrieval/cache identity',async()=>{
 const db=await database(),old=await prepare();commit(db,old);
 const changed=structuredClone(baseline);changed.records[0].data.cancelled=true;changed.records[0].revision='cancelled-v2';
 const next=await prepare(changed,old,'cancelled');commit(db,next);
 assert.equal(retrieveGrounded(active(db),baseline,bundle).disposition,'abstain');
 const before=retrieveGrounded(old,baseline,bundle);assert.equal(before.disposition,'answer');
 const rolled=prepareRollback(next,old,bundle);assert.equal(commit(db,rolled).status,0);assert.equal(active(db).token,old.token);
 assert.throws(()=>prepareRollback(next,old,{...bundle,promptRevision:'wrong'}),/rollback-runtime/);
 assert.notEqual(before.cacheKey,retrieveGrounded(next,baseline,bundle).cacheKey);
 const deleted={...baseline,records:[]},empty=await prepare(deleted,old,'deleted');assert.equal(commit(db,empty).status,0);
 assert.equal(retrieveGrounded(active(db),baseline,bundle).disposition,'abstain');
});
test('tampered payload, source revision, incomplete inventory and incompatible runtime fail closed',async()=>{
 const old=await prepare(),i=input(baseline,old,'next');i.records[0].revision='tampered';
 await assert.rejects(prepareSnapshot(old,i.manifest,i.records,embedding),/source-payload-binding/);
 const partial=input(baseline,old,'next');partial.manifest.outcomes=[];
 await assert.rejects(prepareSnapshot(old,partial.manifest,partial.records,embedding),/unaccounted-source/);
 assert.equal(retrieveGrounded({...old,payload:old.payload+' '},baseline,bundle).disposition,'unavailable');
 assert.equal(retrieveGrounded(old,baseline,{...bundle,embeddingModel:'different'}).disposition,'unavailable');
});
test('retrieval rechecks source expiry and clock without treating ingestion as verification',async()=>{
 const f=structuredClone(baseline);f.records[0].validUntil='2026-11-17T00:00:00Z';
 const old=await prepare(f);assert.equal(retrieveGrounded(old,f,bundle).disposition,'answer');
 const later={...f,now:'2026-11-17T00:00:00Z'};assert.equal(retrieveGrounded(old,later,bundle).disposition,'abstain');
 const unverified=structuredClone(f);unverified.records[0].verifiedAt=null;
 assert.equal(retrieveGrounded(await prepare(unverified),unverified,bundle).disposition,'abstain');
});
test('integration coordinator validates before storage and resolves lost commit acknowledgements by reread',async()=>{
 const db=await database(),old=await prepare(),next=await prepare(baseline,old,'next');commit(db,old);
 let calls=0;
 const storage={read:async()=>active(db),commit:async candidate=>{calls++;const r=commit(db,candidate,{crash:'after-commit'});if(r.status!==0)throw Error('lost acknowledgement');return r.value;}};
 await assert.rejects(commitPrepared(storage,{...next,payload:next.payload+' '}),/prepared-digest/);assert.equal(calls,0);
 assert.deepEqual(await commitPrepared(storage,next),{committed:true,recovered:true});assert.equal(calls,1);
 assert.equal(active(db).token,next.token);
});
test('external token rebinding and rehashed stale-manifest forgery cannot replace a committed winner',async()=>{
 const db=await database(),old=await prepare(),a=await prepare(baseline,old,'a'),b=await prepare(baseline,old,'b');commit(db,old);commit(db,a);
 const rebound={...b,expectedToken:a.token};
 await assert.rejects(commitPrepared(storageFor(db),rebound),/prepared-predecessor/);
 assert.equal(commit(db,rebound).status,1);
 const value=JSON.parse(b.payload);value.predecessorToken=a.token;
 const payload=JSON.stringify(value),forged={...rebound,payload,token:createHash('sha256').update(payload).digest('hex')};
 await assert.rejects(commitPrepared(storageFor(db),forged),/predecessor-binding/);
 assert.equal(active(db).token,a.token);
});
test('corrupted retained payload never receives a successful identical retry or rollback acknowledgement',async()=>{
 const corrupt=(db,target)=>{const r=spawnSync(process.platform==='win32'?'python':'python3',['-c',"import sqlite3,json,sys; v=json.load(sys.stdin); c=sqlite3.connect(sys.argv[1]); c.execute('UPDATE snapshots SET payload=? WHERE token=?',(v['payload']+' ',v['token'])); c.commit()",db],{input:JSON.stringify(target),encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
 const db=await database(),old=await prepare();commit(db,old);corrupt(db,old);
 assert.equal(commit(db,old).status,1);
 await assert.rejects(commitPrepared(storageFor(db),old),/prepared-digest/);
 const other=await database(),next=await prepare(baseline,old,'next');commit(other,old);commit(other,next);corrupt(other,old);
 const rolled=prepareRollback(next,old,bundle);assert.equal(commit(other,rolled).status,1);
 await assert.rejects(commitPrepared(storageFor(other),rolled),/rollback-snapshot-not-retained/);
 assert.equal(active(other).token,next.token);
});
test('identical snapshot retry preserves its embedding dimensions and performs no embedding call',async()=>{
 const old=await prepare(),value=readPrepared(old);let calls=0;
 const embed=async()=>{calls++;return [0,1,0];};
 const same=await prepareSnapshot(old,value.manifest,value.records,{dimensions:2,embed});
 assert.deepEqual(same,old);assert.equal(calls,0);
 await assert.rejects(prepareSnapshot(old,value.manifest,value.records,{dimensions:3,embed}),/retry-dimensions-mismatch/);
 assert.equal(calls,0);
});
