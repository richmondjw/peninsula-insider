/** Synthetic GitHub CI only. Never accepts a DSN or production credentials. */
import {readPrepared,prepareRollback} from '../staged-index.mjs';
import {promote} from '../manifest.mjs';

export function assertCiTarget() {
  if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true'||process.env.ASK_PI_POSTGRES_CI!=='synthetic-only'||!/^\d+$/.test(process.env.GITHUB_RUN_ID??''))throw Error('PostgreSQL tests require isolated Linux GitHub CI');
}
export async function connect() {
  assertCiTarget();
  const {Client}=await import('pg');
  const client=new Client({host:'postgres',port:5432,database:'ask_pi_synthetic',user:'postgres',password:'synthetic-ci-only',ssl:false,connectionTimeoutMillis:5000,query_timeout:10000,statement_timeout:10000,application_name:'ask-pi-synthetic-ci'});
  client.on('error',()=>{});
  await client.connect();return client;
}
export async function query(sql,values=[]) {const c=await connect();try{return await c.query(sql,values);}finally{await c.end();}}
export function identifier(schema) {if(!/^pi_stage_[a-f0-9]{32}$/.test(schema))throw Error('invalid synthetic schema');return '"'+schema+'"';}
export async function initialize(schema) {
  const s=identifier(schema);
  await query(`CREATE SCHEMA ${s};
    CREATE TABLE ${s}.snapshots(token text PRIMARY KEY,payload text NOT NULL,CHECK(token=encode(sha256(convert_to(payload,'UTF8')),'hex')));
    CREATE TABLE ${s}.active(slot integer PRIMARY KEY CHECK(slot=1),token text REFERENCES ${s}.snapshots(token));
    INSERT INTO ${s}.active VALUES(1,NULL);
    CREATE TABLE ${s}.candidates(snapshot_token text NOT NULL REFERENCES ${s}.snapshots(token),source_id text NOT NULL,embedding vector(1024) NOT NULL,search_text text NOT NULL,PRIMARY KEY(snapshot_token,source_id));`);
}
export async function read(schema,token) {
  const s=identifier(schema);
  const result=token===undefined?await query(`SELECT s.token,s.payload FROM ${s}.active a JOIN ${s}.snapshots s ON s.token=a.token WHERE a.slot=1`):await query(`SELECT token,payload FROM ${s}.snapshots WHERE token=$1`,[token]);
  const value=result.rows[0]??null;if(value)readPrepared(value);return value;
}
export async function commit(schema,prepared,{hook=async()=>{}}={}) {
  const s=identifier(schema),candidate=readPrepared(prepared),c=await connect();let committed=false;
  try {
    await c.query('BEGIN');
    const row=(await c.query(`SELECT a.token,s.payload FROM ${s}.active a LEFT JOIN ${s}.snapshots s ON s.token=a.token WHERE a.slot=1 FOR UPDATE OF a`)).rows[0];
    if(!row)throw Error('missing active slot');
    const current=row.token?row:null,active=current?readPrepared(current):null;
    const retained=(await c.query(`SELECT token,payload FROM ${s}.snapshots WHERE token=$1`,[prepared.token])).rows[0];
    if(retained){readPrepared(retained);if(retained.payload!==prepared.payload)throw Error('stored payload mismatch');}
    if(current?.token===prepared.token){await c.query('ROLLBACK');return {committed:true,retry:true};}
    if((current?.token??null)!==prepared.expectedToken)throw Error('predecessor changed');
    if(prepared.operation==='rollback'){
      if(!retained||!current)throw Error('rollback target not retained');
      prepareRollback(current,retained,prepared.runtimeBundle);
    }else{
      if(prepared.operation!==undefined&&prepared.operation!=='forward')throw Error('unsupported operation');
      if(candidate.predecessorToken!==prepared.expectedToken)throw Error('prepared predecessor mismatch');
      const result=promote(active?.manifest??null,candidate.manifest);if(!result.promoted)throw Error(result.errors.join(','));
    }
    if(!retained){
      await c.query(`INSERT INTO ${s}.snapshots(token,payload) VALUES($1,$2)`,[prepared.token,prepared.payload]);
      await hook('after-insert');
      for(const embedding of candidate.embeddings){
        const record=candidate.records.find(r=>r.id===embedding.id);
        await c.query(`INSERT INTO ${s}.candidates VALUES($1,$2,$3::vector,$4)`,[prepared.token,embedding.id,JSON.stringify(embedding.vector),`${record.data.title}\n${record.data.summary??''}`]);
        await hook('after-row');
      }
    }
    await c.query(`UPDATE ${s}.active SET token=$1 WHERE slot=1`,[prepared.token]);
    await hook('after-pointer');
    await c.query('COMMIT');committed=true;
    await hook('after-commit');return {committed:true,retry:false};
  }catch(error){if(!committed)await c.query('ROLLBACK').catch(()=>{});throw error;}
  finally {await c.end().catch(()=>{});}
}
export function storage(schema) {return {read:()=>read(schema),readSnapshot:token=>read(schema,token),commit:prepared=>commit(schema,prepared)};}

/** Eligibility comes from the canonical context filter, before either ranking path.
 * Snapshot token remains fixed across vector/lexical calls even during promotion.
 */
export async function rankedCandidates(schema,token,eligibleIds,vector,text) {
  const s=identifier(schema);
  if(!Array.isArray(eligibleIds)||eligibleIds.some(id=>typeof id!=='string'))throw Error('invalid eligibility');
  const vectors=await query(`SELECT source_id FROM ${s}.candidates WHERE snapshot_token=$1 AND source_id=ANY($2::text[]) ORDER BY embedding <=> $3::vector,source_id LIMIT 25`,[token,eligibleIds,JSON.stringify(vector)]);
  const lexical=await query(`SELECT source_id FROM ${s}.candidates WHERE snapshot_token=$1 AND source_id=ANY($2::text[]) AND to_tsvector('simple',search_text) @@ plainto_tsquery('simple',$3) ORDER BY ts_rank(to_tsvector('simple',search_text),plainto_tsquery('simple',$3)) DESC,source_id LIMIT 25`,[token,eligibleIds,text]);
  return {vector:vectors.rows.map(r=>r.source_id),lexical:lexical.rows.map(r=>r.source_id)};
}
