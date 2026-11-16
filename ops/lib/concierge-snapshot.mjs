/** Snapshot preparation and commit coordination. No implicit backend or activation. */
import {createHash} from 'node:crypto';
import {hash} from './concierge-manifest.mjs';
import {validateManifest,promote,bundleKey,rollback,cacheKey} from './concierge-manifest.mjs';
import {validateEventSource} from './concierge-event-source.mjs';
const digest=text=>createHash('sha256').update(text).digest('hex');


function validateRecords(records) {
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const text=v=>typeof v==='string'&&v.trim().length>0;
 const instant=v=>text(v)&&/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v));
 if(records.some(r=>!object(r)||!text(r.id)||!text(r.revision)||!object(r.data)||(r.verifiedAt!==null&&!instant(r.verifiedAt))||(r.validUntil!==undefined&&!instant(r.validUntil))||(r.liveAvailability!==undefined&&(!object(r.liveAvailability)||typeof r.liveAvailability.available!=='boolean'||!instant(r.liveAvailability.checkedAt)||!instant(r.liveAvailability.validUntil)))))return ['record-schema'];
 if(records.some(r=>r.sourceVerificationDate!==undefined&&(
  typeof r.sourceVerificationDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.sourceVerificationDate)||!Number.isFinite(Date.parse(r.sourceVerificationDate))||new Date(r.sourceVerificationDate).toISOString().slice(0,10)!==r.sourceVerificationDate||r.verifiedAt!==null||r.sourceVerificationDate!==(r.data.lastVerifiedAt??r.data.lastCheckedDate))))return ['source-verification-day-binding'];
 return [];
}

function validateBindings(manifest,records) {
  const errors=validateManifest(manifest);
  if(errors.length)throw Error(errors.join(','));
  if(!Array.isArray(records)||records.length!==manifest.sourceRecords.length)throw Error('record-inventory');
  const invalid=validateRecords(records);
  if(invalid.length)throw Error(invalid.join(','));
  const byId=new Map(records.map(r=>[r?.id,r]));
  if(byId.size!==records.length)throw Error('duplicate-record');
  for(const source of manifest.sourceRecords){
    const record=byId.get(source.id);
    if(!record||record.revision!==source.effectiveRevision||source.payloadDigest!==hash(record))throw Error('source-payload-binding');
    // The synthetic transport represents unknown clocks as null; raw CMS JSON
    // omits them. Validate that equivalent view without rewriting stored evidence.
    const data={...record.data};
    for(const key of ['startTime','endTime'])if(data[key]===null)delete data[key];
    validateEventSource(data,data.slug??record.id);
  }
}

export function readPrepared(prepared) {
  if(!prepared||typeof prepared.payload!=='string'||prepared.token!==digest(prepared.payload))throw Error('prepared-digest');
  const value=JSON.parse(prepared.payload);
  if(value.version!==1)throw Error('prepared-version');
  if(value.predecessorToken!==null&&!/^[a-f0-9]{64}$/.test(value.predecessorToken??''))throw Error('prepared-predecessor');
  if(!Number.isInteger(value.dimensions)||value.dimensions<1||value.dimensions>4096)throw Error('embedding-dimensions');
  validateBindings(value.manifest,value.records);
  const ids=value.manifest.indexRows.map(r=>r.id);
  if(!Array.isArray(value.embeddings)||value.embeddings.length!==ids.length)throw Error('embedding-inventory');
  const embedded=new Set();
  for(const row of value.embeddings){
    if(!ids.includes(row.id)||embedded.has(row.id)||!Array.isArray(row.vector)||row.vector.length!==value.dimensions||!row.vector.every(Number.isFinite))throw Error('embedding-shape');
    embedded.add(row.id);
    const source=value.records.find(r=>r.id===row.id);
    if(row.textDigest!==hash(`${source.data.title}\n${source.data.summary??''}`))throw Error('embedding-text-binding');
  }
  return value;
}

/** Prepare everything before any commit. The caller supplies an embedding stub in tests.
 * Production would require a reviewed atomic PostgreSQL implementation of the CAS protocol.
 */
export async function prepareSnapshot(previous,manifest,records,{embed,dimensions}={}) {
  if(!Number.isInteger(dimensions)||dimensions<1||dimensions>4096||typeof embed!=='function')throw Error('embedding-contract');
  const old=previous?readPrepared(previous):null;
  manifest=structuredClone(manifest);records=structuredClone(records);
  validateBindings(manifest,records);
  const decision=promote(old?.manifest??null,manifest);
  if(!decision.promoted)throw Error(decision.errors.join(','));
  if(old&&hash(old.manifest)===hash(manifest)&&hash(old.records)===hash(records)){
    if(old.dimensions!==dimensions)throw Error('retry-dimensions-mismatch');
    return {...previous};
  }
  const embeddings=[];
  for(const row of manifest.indexRows){
    const record=records.find(r=>r.id===row.id);
    const text=`${record.data.title}\n${record.data.summary??''}`,textDigest=hash(text);
    const reuse=old?.manifest.bundle.embeddingModel===manifest.bundle.embeddingModel&&old.dimensions===dimensions
      ? old.embeddings.find(e=>e.id===row.id&&e.textDigest===textDigest):null;
    const vector=reuse?reuse.vector:await embed(text);
    if(!Array.isArray(vector)||vector.length!==dimensions||!vector.every(Number.isFinite))throw Error('embedding-shape');
    embeddings.push({id:row.id,textDigest,vector});
  }
  const payload=JSON.stringify({version:1,predecessorToken:previous?.token??null,manifest,records,dimensions,embeddings});
  const result={expectedToken:previous?.token??null,token:digest(payload),payload};
  readPrepared(result);
  return result;
}

export function prepareRollback(current,previous,runtimeBundle) {
  const active=readPrepared(current),target=readPrepared(previous);
  if(bundleKey(runtimeBundle)!==bundleKey(target.manifest.bundle))throw Error('rollback-runtime-bundle');
  const result=rollback(active.manifest,target.manifest,{bundleKey:bundleKey(runtimeBundle),manifestDigest:hash(target.manifest),invalidateCacheKey:cacheKey(active.manifest)});
  if(!result.rolledBack)throw Error('rollback-receipt');
  return {...previous,expectedToken:current.token,operation:'rollback',runtimeBundle};
}

/** Application-side adapter boundary. The storage CAS must itself be atomic.
 * An interrupted acknowledgement is resolved by reading, never by deleting or
 * blindly promoting another generation. This adapter is not wired to production.
 */
export async function commitPrepared(storage,prepared) {
  const candidate=readPrepared(prepared);
  const current=await storage.read();
  const active=current?readPrepared(current):null;
  if(current?.token===prepared.token){
    if(current.payload!==prepared.payload)throw Error('stored-payload-mismatch');
  }else{
    if((current?.token??null)!==prepared.expectedToken)throw Error('predecessor-changed');
    if(prepared.operation==='rollback'){
      const retained=await storage.readSnapshot(prepared.token);
      if(!retained||retained.payload!==prepared.payload)throw Error('rollback-snapshot-not-retained');
      readPrepared(retained);
      prepareRollback(current,retained,prepared.runtimeBundle);
    }else{
      if(prepared.operation!==undefined&&prepared.operation!=='forward')throw Error('unsupported-operation');
      if(candidate.predecessorToken!==prepared.expectedToken)throw Error('prepared-predecessor-mismatch');
      const transition=promote(active?.manifest??null,candidate.manifest);
      if(!transition.promoted)throw Error(transition.errors.join(','));
    }
  }
  try {return await storage.commit(prepared);}
  catch(error){
    const current=await storage.read();
    if(current?.token===prepared.token){readPrepared(current);return {committed:true,recovered:true};}
    throw error;
  }
}

