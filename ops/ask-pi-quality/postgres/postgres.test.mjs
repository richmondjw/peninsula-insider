import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixtures,baseline,input,bundle} from '../staging-fixtures.mjs';
import {prepareSnapshot,retrieveGrounded,prepareRollback,commitPrepared} from '../staged-index.mjs';
import {assertCiTarget,query,initialize,identifier,read,commit,storage,rankedCandidates} from './adapter.mjs';
const pgBundle={...bundle,embeddingModel:'synthetic-1024'};
const vector=Array.from({length:1024},(_,i)=>i===0?1:0);
const schemas=[];
async function database(){const name='pi_stage_'+randomUUID().replaceAll('-','');schemas.push(name);await initialize(name);return name;}
async function prepare(f=baseline,previous=null,id='initial'){
 const value=input(f,previous,id);value.manifest.bundle=pgBundle;
 return prepareSnapshot(previous,value.manifest,value.records,{dimensions:1024,embed:async()=>[...vector]});
}
async function worker(schema,prepared,crash){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[fileURLToPath(new URL('./crash-worker.mjs',import.meta.url))]);
 let error='';child.stderr.on('data',chunk=>error+=chunk);child.on('error',reject);
 child.on('close',status=>resolve({status,error}));child.stdin.end(JSON.stringify({schema,prepared,crash}));
});}
before(async()=>{
 assertCiTarget();
 const version=(await query("SELECT current_setting('server_version_num')::int AS version,current_database() AS database")).rows[0];
 assert(version.version>=170000&&version.version<180000,JSON.stringify(version));assert.equal(version.database,'ask_pi_synthetic');
 await query('CREATE EXTENSION IF NOT EXISTS vector');
 const extension=(await query("SELECT extversion FROM pg_extension WHERE extname='vector'")).rows[0];assert.equal(extension.extversion,'0.8.0');
 console.log(`Synthetic database only: PostgreSQL ${version.version}; pgvector ${extension.extversion}; Node ${process.version}`);
});
after(async()=>{for(const schema of schemas)await query(`DROP SCHEMA IF EXISTS ${identifier(schema)} CASCADE`);});

test('all 24 contexts remain evidence-bound through real vector and lexical queries',async()=>{
 for(const f of fixtures){
  const db=await database(),snapshot=await prepare(f);await commitPrepared(storage(db),snapshot);
  const persisted=await read(db),answer=retrieveGrounded(persisted,f,pgBundle);
  assert.equal(answer.disposition,f.expected.disposition,f.id);assert.equal(answer.season,f.expected.season,f.id);assert.deepEqual(answer.matches.map(m=>m.id),f.expected.ids,f.id);
  const ranked=await rankedCandidates(db,persisted.token,answer.matches.map(m=>m.id),vector,f.query);
  assert.deepEqual(ranked.vector.sort(),[...f.expected.ids].sort(),f.id);
  assert(ranked.lexical.every(id=>f.expected.ids.includes(id)),f.id);
 }
});
test('simultaneous bootstrap and replacement transactions have exactly one CAS winner',async()=>{
 const db=await database(),a=await prepare(baseline,null,'a'),b=await prepare(baseline,null,'b');
 const initial=await Promise.allSettled([commit(db,a),commit(db,b)]);assert.equal(initial.filter(r=>r.status==='fulfilled').length,1);
 const old=await read(db),c=await prepare(baseline,old,'c'),d=await prepare(baseline,old,'d');
 const changed=await Promise.allSettled([commit(db,c),commit(db,d)]);assert.equal(changed.filter(r=>r.status==='fulfilled').length,1);
 assert([c.token,d.token].includes((await read(db)).token));
});
test('failed inserts and abrupt writer exits roll back snapshot, rows and pointer together',async()=>{
 for(const phase of ['after-insert','after-row','after-pointer']){
  const db=await database(),old=await prepare(),next=await prepare(baseline,old,'next');await commit(db,old);
  await assert.rejects(commit(db,next,{hook:async value=>{if(value===phase)throw Error('injected failure');}}),/injected failure/);
  assert.deepEqual(await read(db),{token:old.token,payload:old.payload});
  assert.equal((await query(`SELECT count(*)::int AS n FROM ${identifier(db)}.snapshots`)).rows[0].n,1);
  const result=await worker(db,next,phase);assert.equal(result.status,75,result.error);
  assert.equal((await read(db)).token,old.token);
  await commit(db,next);assert.equal((await read(db)).token,next.token);
 }
});
test('lost post-commit acknowledgement is resolved by validated read and idempotent retry',async()=>{
 const db=await database(),old=await prepare(),next=await prepare(baseline,old,'next');await commit(db,old);
 const adapter={...storage(db),commit:async prepared=>{const result=await worker(db,prepared,'after-commit');assert.equal(result.status,75,result.error);throw Error('lost acknowledgement');}};
 assert.deepEqual(await commitPrepared(adapter,next),{committed:true,recovered:true});
 assert.deepEqual(await commit(db,next),{committed:true,retry:true});
 assert.equal((await query(`SELECT count(*)::int AS n FROM ${identifier(db)}.snapshots`)).rows[0].n,2);
});
test('readers see an entire old or new snapshot and ranking remains pinned during promotion',async()=>{
 const db=await database(),old=await prepare(),changed=structuredClone(baseline);changed.records[0].data.cancelled=true;changed.records[0].revision='cancelled-v2';
 const next=await prepare(changed,old,'next');await commit(db,old);
 let reached,release;const atPointer=new Promise(r=>reached=r),resume=new Promise(r=>release=r);
 const writing=commit(db,next,{hook:async phase=>{if(phase==='after-pointer'){reached();await resume;}}});
 await atPointer;const captured=await read(db);assert.equal(captured.token,old.token);release();await writing;
 assert.equal(retrieveGrounded(await read(db),baseline,pgBundle).disposition,'abstain');
 const before=retrieveGrounded(captured,baseline,pgBundle),ranked=await rankedCandidates(db,captured.token,before.matches.map(m=>m.id),vector,baseline.query);
 assert.deepEqual(ranked.vector,before.matches.map(m=>m.id));
 const rolled=prepareRollback(next,old,pgBundle);await commitPrepared(storage(db),rolled);assert.equal((await read(db)).token,old.token);
 assert.throws(()=>prepareRollback(next,old,{...pgBundle,appRevision:'wrong'}),/rollback-runtime/);
});
test('stale-token rebinding and rehashed stale lineage fail inside the transaction boundary',async()=>{
 const db=await database(),old=await prepare(),a=await prepare(baseline,old,'a'),b=await prepare(baseline,old,'b');await commit(db,old);await commit(db,a);
 await assert.rejects(commit(db,{...b,expectedToken:a.token}),/prepared predecessor/);
 const value=JSON.parse(b.payload);value.predecessorToken=a.token;const payload=JSON.stringify(value);
 await assert.rejects(commit(db,{...b,expectedToken:a.token,payload,token:createHash('sha256').update(payload).digest('hex')}),/predecessor-binding/);
 assert.equal((await read(db)).token,a.token);
});
test('database constraints reject corrupted payload and wrong vector dimensions without partial mutation',async()=>{
 const db=await database(),old=await prepare();await commit(db,old);
 await assert.rejects(query(`UPDATE ${identifier(db)}.snapshots SET payload=payload||' ' WHERE token=$1`,[old.token]),/check constraint/);
 await assert.rejects(query(`INSERT INTO ${identifier(db)}.candidates VALUES($1,'bad','[1,2]'::vector,'synthetic')`,[old.token]),/dimensions/);
 assert.equal((await read(db)).token,old.token);
 assert.deepEqual(await commit(db,old),{committed:true,retry:true});
});
test('1001 source rows remain complete and are not capped at one API page',async()=>{
 const f=structuredClone(baseline);f.records=Array.from({length:1001},(_,i)=>({...structuredClone(baseline.records[0]),id:`synthetic-${i}`,data:{...baseline.records[0].data,slug:`synthetic-${i}`}}));
 const db=await database(),snapshot=await prepare(f);await commitPrepared(storage(db),snapshot);
 assert.equal((await query(`SELECT count(*)::int AS n FROM ${identifier(db)}.candidates WHERE snapshot_token=$1`,[snapshot.token])).rows[0].n,1001);
 assert.equal(JSON.parse((await read(db)).payload).manifest.outcomes.length,1001);
});
