import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertCiTarget,identifier,query,connect} from './adapter.mjs';
import {install,invoke,asArgs} from './rpc-backend.mjs';
import {baseline,input,bundle} from '../staging-fixtures.mjs';
import {prepareSnapshot,prepareRollback,commitPrepared} from '../../lib/concierge-snapshot.mjs';
import {connectSnapshotWriter} from '../../lib/concierge-snapshot-transport.mjs';
import {readCmsEventSnapshot,exportEventManifest} from '../../lib/concierge-source-export.mjs';
const schemas=[],pgBundle={...bundle,embeddingModel:'synthetic-1024'},vector=Array.from({length:1024},(_,i)=>i?0:1);
let createdCms=false;
before(()=>assertCiTarget());
after(async()=>{for(const name of schemas)await query(`DROP SCHEMA IF EXISTS ${identifier(name)} CASCADE`);if(createdCms)await query('DROP SCHEMA pi CASCADE');});
async function database(){const name='pi_stage_'+randomUUID().replaceAll('-','');schemas.push(name);await query(`CREATE SCHEMA ${identifier(name)}`);await install(name);return name;}
async function prepare(previous=null,id='initial',f=baseline){const value=input(f,previous,id);value.manifest.bundle=pgBundle;return prepareSnapshot(previous,value.manifest,value.records,{dimensions:1024,embed:async()=>[...vector]});}
const storage=async schema=>connectSnapshotWriter((name,args)=>invoke(schema,name,args));
async function crash(schema,prepared,phase){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[fileURLToPath(new URL('./rpc-crash-worker.mjs',import.meta.url))]);let error='';
 const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('SQL crash worker timeout'));},15000);
 child.stderr.on('data',chunk=>error+=chunk);child.on('error',e=>{clearTimeout(timer);reject(e);});child.stdin.on('error',e=>{clearTimeout(timer);child.kill('SIGKILL');reject(e);});
 child.on('close',status=>{clearTimeout(timer);resolve({status,error});});child.stdin.end(JSON.stringify({schema,prepared,phase}));
});}
test('actual SQL capabilities, bootstrap, read, retry and retained compatible rollback',async()=>{
 const db=await database(),adapter=await storage(db),first=await prepare();assert.equal(await adapter.read(),null);
 assert.deepEqual(await commitPrepared(adapter,first),{committed:true,retry:false});assert.equal((await adapter.read()).token,first.token);
 assert.deepEqual(await commitPrepared(adapter,first),{committed:true,retry:true});
 const next=await prepare(first,'next');await commitPrepared(adapter,next);await commitPrepared(adapter,prepareRollback(next,first,pgBundle));assert.equal((await adapter.read()).token,first.token);
 await assert.rejects(invoke(db,'concierge_snapshot_commit',{...asArgs(prepareRollback(first,next,pgBundle)),runtime_bundle:{...pgBundle,appRevision:'wrong'}}),/runtime bundle/);
});
test('SQL concurrent bootstrap and replacement publish exactly one candidate',async()=>{
 const db=await database();
 for(const previous of [null,undefined]){
  const current=previous===undefined?await (await storage(db)).read():null,a=await prepare(current,'a-'+Boolean(current)),b=await prepare(current,'b-'+Boolean(current));
  const result=await Promise.allSettled([invoke(db,'concierge_snapshot_commit',asArgs(a)),invoke(db,'concierge_snapshot_commit',asArgs(b))]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 }
});
test('database-side pointer failure rolls back insert and active token together',async()=>{
 const db=await database(),adapter=await storage(db),old=await prepare(),next=await prepare(old,'next');await commitPrepared(adapter,old);
 await query(`CREATE FUNCTION ${identifier(db)}.synthetic_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected pointer failure'; END; $$; CREATE TRIGGER synthetic_failure BEFORE UPDATE ON ${identifier(db)}.concierge_snapshot_active FOR EACH ROW EXECUTE FUNCTION ${identifier(db)}.synthetic_fail();`);
 await assert.rejects(invoke(db,'concierge_snapshot_commit',asArgs(next)),/injected pointer/);assert.equal((await adapter.read()).token,old.token);assert.equal((await query(`SELECT count(*)::int AS n FROM ${identifier(db)}.concierge_snapshots`)).rows[0].n,1);
 await query(`DROP TRIGGER synthetic_failure ON ${identifier(db)}.concierge_snapshot_active`);await commitPrepared(adapter,next);
});
test('actual SQL call survives process crashes before commit and lost acknowledgement after commit',async()=>{
 const db=await database(),adapter=await storage(db),old=await prepare(),next=await prepare(old,'next');await commitPrepared(adapter,old);
 const before=await crash(db,next,'before-commit');assert.equal(before.status,75,before.error);assert.equal((await adapter.read()).token,old.token);
 const uncertain={...adapter,commit:async prepared=>{const result=await crash(db,prepared,'after-commit');assert.equal(result.status,75,result.error);throw Error('lost SQL commit acknowledgement');}};
 assert.deepEqual(await commitPrepared(uncertain,next),{committed:true,recovered:true});assert.deepEqual(await commitPrepared(adapter,next),{committed:true,retry:true});
});
test('SQL rejects rehashed corrupt bindings, incomplete pages, deletion drift and stale predecessor',async()=>{
 const db=await database(),adapter=await storage(db),old=await prepare(),next=await prepare(old,'next');await commitPrepared(adapter,old);
 for(const mutate of [d=>d.records.push(d.records[0]),d=>d.records[0].data.title='Unapproved',d=>d.manifest.pages[0].ids=[],d=>d.manifest.removedIds=['ghost'],d=>d.embeddings[0].vector=[1,0],d=>d.manifest.previousManifestDigest='f'.repeat(64)]){
  const d=JSON.parse(next.payload);mutate(d);const payload=JSON.stringify(d),token=createHash('sha256').update(payload).digest('hex');
  await assert.rejects(invoke(db,'concierge_snapshot_commit',{...asArgs(next),snapshot_token:token,snapshot_payload:payload}));assert.equal((await adapter.read()).token,old.token);
 }
 await commitPrepared(adapter,next);const stale=await prepare(old,'stale');await assert.rejects(invoke(db,'concierge_snapshot_commit',{...asArgs(stale),expected_token:next.token}),/predecessor/);
});
test('read-only role cannot invoke commit or read rows through new RLS tables',async()=>{
 const db=await database(),old=await prepare();await invoke(db,'concierge_snapshot_commit',asArgs(old));const c=await connect();
 try{await c.query('BEGIN');await c.query('SET LOCAL ROLE pg_read_all_data');await assert.rejects(c.query(`SELECT * FROM ${identifier(db)}.concierge_snapshot_commit($1,$2,$3)`,[null,old.token,old.payload]),/permission denied/);await c.query('ROLLBACK');await c.query('BEGIN');await c.query('SET LOCAL ROLE pg_read_all_data');assert.equal((await c.query(`SELECT * FROM ${identifier(db)}.concierge_snapshots`)).rows.length,0);}finally{await c.query('ROLLBACK');await c.end();}
});
test('single-statement CMS export and full writer snapshot account for 1007 rows without REST pagination',async()=>{
 const db=await database(),s=identifier(db);assert.equal((await query("SELECT to_regnamespace('pi') AS existing")).rows[0].existing,null);
 await query("CREATE SCHEMA pi; CREATE TABLE pi.cms_text_fields(id text PRIMARY KEY,entity_type text,entity_slug text,field_path text,field_kind text,locale text,value text,status text,updated_at timestamptz);");createdCms=true;
 await query("INSERT INTO pi.cms_text_fields SELECT lpad(i::text,5,'0'),'event','synthetic-'||i,'title','text',NULL,'Published CMS '||i,'published',statement_timestamp() FROM generate_series(1,1007) i");
 const sql=(await readFile(new URL('../../backend/concierge-event-cms-export.sql',import.meta.url),'utf8')).replaceAll('__SCHEMA__',db);await query(sql);
 const cms=await readCmsEventSnapshot(async()=>JSON.parse(JSON.stringify((await query(`SELECT * FROM ${s}.concierge_event_cms_export()`)).rows)));
 assert.equal(cms.rows.length,1007);
 const now=new Date(),date=new Date(+now+7*86400000).toISOString().slice(0,10);
 const sources=Array.from({length:1007},(_,i)=>({slug:`synthetic-${i+1}`,data:{...structuredClone(baseline.records[0].data),slug:`synthetic-${i+1}`,startDate:date,endDate:date,lastVerifiedAt:new Date(+now-3600000).toISOString()}}));
 const exported=exportEventManifest({pinned:{revision:'c'.repeat(40),sources},cms,bundle:pgBundle,id:'cms-export',now});
 assert.equal(exported.manifest.cmsOutcomes.length,1007);assert.equal(exported.records[0].data.title,'Published CMS 1');
 const prepared=await prepareSnapshot(null,exported.manifest,exported.records,{dimensions:1024,embed:async()=>[...vector]});await commitPrepared(await storage(db),prepared);assert.equal(JSON.parse((await (await storage(db)).read()).payload).manifest.outcomes.length,1007);
});
