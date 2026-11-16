/** Complete, pinned source export. No implicit credentials, network or writes. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {basename} from 'node:path';
import {hash,validateManifest} from './concierge-manifest.mjs';
import {readPrepared,prepareSnapshot,commitPrepared} from './concierge-snapshot.mjs';
import {connectSnapshotWriter} from './concierge-snapshot-transport.mjs';
import {projectEventInventory,validateEventSource} from '../scripts/concierge-events.mjs';
import {publicEventData} from '../../next/src/lib/event-publication.mjs';
import {ruleFor,isoDate} from '../../next/src/lib/event-schedule.ts';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const clock=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const fail=message=>{throw Error(message);};

/** Reads committed blobs, never a partly edited worktree or a moving ref. */
export function readPinnedEventSources(repo,revision) {
 if(!/^[a-f0-9]{40}$/.test(revision))fail('source revision must be a full commit SHA');
 const root=execFileSync('git',['rev-parse','--show-toplevel'],{cwd:repo,encoding:'utf8'}).trim();
 const git=(args,options={})=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024,...options});
 if(git(['cat-file','-t',revision],{encoding:'utf8'}).trim()!=='commit')fail('source revision is not a commit');
 const entries=git(['ls-tree','-rz',revision,'--','next/src/content/events/'],{encoding:'utf8'}).split('\0').filter(Boolean).map(line=>{
  const separator=line.indexOf('\t');if(separator<0)fail('source tree framing');
  const metadata=line.slice(0,separator),path=line.slice(separator+1),[mode,type,blob]=metadata.split(' ');return {mode,type,blob,path};
 }).filter(row=>row.path.endsWith('.json'));
 if(!entries.length||entries.some(r=>r.type!=='blob'||r.mode!=='100644'||!r.path.startsWith('next/src/content/events/')))fail('source tree empty or unsupported entry');
 const output=git(['cat-file','--batch'],{input:entries.map(r=>r.blob).join('\n')+'\n'});let offset=0;
 const sources=entries.map(row=>{
  const end=output.indexOf(10,offset);if(end<0)fail('source blob header truncated');
  const [id,type,length]=output.subarray(offset,end).toString('utf8').split(' '),size=Number(length);offset=end+1;
  if(id!==row.blob||type!=='blob'||!Number.isSafeInteger(size)||size<0||offset+size>=output.length)fail('source blob mismatch');
  const bytes=output.subarray(offset,offset+size);offset+=size;if(output[offset++]!==10)fail('source blob framing');
  return {slug:basename(row.path,'.json'),data:JSON.parse(bytes.toString('utf8')),blob:row.blob,path:row.path};
 });
 if(offset!==output.length)fail('unexpected source blob data');
 return {revision,sources};
}

/** The CMS RPC aggregates all published event text rows in one MVCC statement.
 * Its single envelope avoids PostgREST's row cap; count/digest detect truncation.
 */
export async function readCmsEventSnapshot(rpc) {
 const rows=await rpc('concierge_event_cms_export',{});
 if(!Array.isArray(rows)||rows.length!==1)fail('CMS snapshot envelope');
 return validateCmsEventSnapshot(rows[0]);
}
export function validateCmsEventSnapshot(receipt) {
 if(!receipt||receipt.version!==1||typeof receipt.rows_payload!=='string'||receipt.rows_payload.length>16_000_000||sha(receipt.rows_payload)!==receipt.revision||!clock(receipt.observed_at))fail('CMS snapshot integrity');
 const rows=JSON.parse(receipt.rows_payload);
 if(!Array.isArray(rows)||rows.length!==receipt.row_count)fail('CMS snapshot count');
 const ids=new Set(),keys=new Set();let last='';
 for(const row of rows){
  if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||row.id<=last||row.entity_type!=='event'||row.status!=='published'||typeof row.entity_slug!=='string'||typeof row.field_path!=='string'||!clock(row.updated_at)||(row.value!==null&&typeof row.value!=='string'))fail('CMS snapshot row');
  if(Date.parse(row.updated_at)>Date.parse(receipt.observed_at))fail('CMS revision clock is future');
  const key=JSON.stringify([row.entity_slug,row.field_path,row.locale]);if(keys.has(key))fail('CMS duplicate field');keys.add(key);ids.add(row.id);last=row.id;
 }
 return {...receipt,rows};
}

/** Apply only text slots actually exposed on the event page. Unknown published
 * edits fail the run; they are never silently discarded or used as date/status
 * overrides. Canonical publication approval is rechecked after every CMS edit.
 */
export function exportEventManifest({pinned,cms,previous=null,bundle,now=new Date(),id}) {
 now=new Date(now);if(!Number.isFinite(+now)||typeof id!=='string'||!id)fail('export clock/id');
 if(!pinned||!/^[a-f0-9]{40}$/.test(pinned.revision)||!Array.isArray(pinned.sources)||!pinned.sources.length)fail('incomplete pinned inventory');
 cms=validateCmsEventSnapshot(cms);
 if(Date.parse(cms.observed_at)>+now||+now-Date.parse(cms.observed_at)>300000)fail('CMS snapshot too old or future');
 const old=previous?readPrepared(previous).manifest:null,slugs=new Set(),cmsOutcomes=[];
 const sources=pinned.sources.map(source=>{
  if(slugs.has(source.slug))fail('duplicate source slug');slugs.add(source.slug);validateEventSource(source.data,source.slug);
  const data=structuredClone(source.data);if(data.status===undefined)data.status='published';
  const schedule=data=>{
   const dated={...data};for(const key of ['startDate','endDate','nextOccurrence'])if(dated[key])dated[key]=new Date(dated[key]);
   return hash(ruleFor({id:source.slug,data:dated},now));
  };
  return {...source,data,rawRevision:hash(source.data),schedule,sourceRule:schedule(data)};
 });
 const bySlug=new Map(sources.map(s=>[s.slug,s]));
 for(const row of cms.rows){
  const source=bySlug.get(row.entity_slug);
  if(!source){cmsOutcomes.push({id:row.id,status:'excluded',reason:'source-deleted'});continue;}
  if(row.locale!==null||row.field_kind!=='text'||!['title','summary'].includes(row.field_path))fail(`unsupported published CMS field: ${row.id}`);
  if(!row.value){cmsOutcomes.push({id:row.id,status:'excluded',reason:'empty-display-override'});continue;}
  source.data[row.field_path]=row.value;cmsOutcomes.push({id:row.id,status:'applied',source:source.slug});
 }
 // The public page's schedule is derived from source data, not inline display
 // edits. Prose can influence legacy cadence parsing; never silently change it.
 for(const source of sources)if(source.schedule(source.data)!==source.sourceRule)fail(`CMS display edit changes source occurrence rule: ${source.slug}`);
 const inventory=projectEventInventory(sources,now);
 if(!inventory.complete)fail('canonical event source projection failed');
 const records=sources.map(source=>{
  const data=publicEventData(source.data);
  const verified=source.data.lastVerifiedAt??source.data.lastCheckedDate??null;
  const dayPrecision=typeof verified==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(verified);
  if(verified!==null&&(!clock(verified)||(dayPrecision?verified>isoDate(now):Date.parse(verified)>+now)))fail('source verification clock invalid');
  // Preserve a documented day as a day. publicEventData normalizes these fields
  // to UTC; that must not invent an instant or make today's Melbourne date future.
  if(dayPrecision)data[source.data.lastVerifiedAt!==undefined?'lastVerifiedAt':'lastCheckedDate']=verified;
  const effectiveRevision=hash([source.rawRevision,cms.rows.filter(r=>r.entity_slug===source.slug),data]);
  return {id:source.slug,revision:effectiveRevision,verifiedAt:verified===null||dayPrecision?null:new Date(verified).toISOString(),...(dayPrecision?{sourceVerificationDate:verified}:{}),...(data.expiresAt?{validUntil:new Date(data.expiresAt).toISOString()}:{}),data};
 });
 const sourceRecords=records.map((record,i)=>{
  const outcome=inventory.outcomes[i];return {id:record.id,revision:sources[i].rawRevision,effectiveRevision:record.revision,payloadDigest:hash(record),admission:outcome.status==='projected'?'index':'exclude',...(outcome.status==='excluded'?{exclusionReason:outcome.reason}:{})};
 });
 const indexRows=sourceRecords.filter(r=>r.admission==='index').map(r=>({id:r.id,revision:r.effectiveRevision}));
 const previousIndexedIds=old?.indexRows.map(r=>r.id)??[],sourceRevision=hash([pinned.revision,cms.revision]);
 const published=sources.map(s=>s.data.publishedAt).filter(clock),verified=records.map(r=>r.verifiedAt).filter(clock);
 const oldest=values=>values.length===sources.length?new Date(Math.min(...values.map(Date.parse))).toISOString():null;
 const manifest={schemaVersion:1,id,sourceRevision,sourceRecords,sourceDigest:hash(sourceRecords),bundle,
  sourceVerifiedAt:oldest(verified),contentPublishedAt:oldest(published),ingestedAt:now.toISOString(),retrievedAt:now.toISOString(),
  inventoryObservedAt:now.toISOString(),sourceCommit:pinned.revision,cmsRevision:cms.revision,cmsObservedAt:cms.observed_at,cmsOutcomes,
  state:'complete',failures:[],lockHeld:true,outcomes:sourceRecords.map(r=>r.admission==='index'?{id:r.id,status:'indexed',revision:r.effectiveRevision}:{id:r.id,status:'excluded',reason:r.exclusionReason}),indexRows,
  pages:[{cursor:null,nextCursor:null,snapshot:sourceRevision,ids:records.map(r=>r.id)}],previousIndexedIds,removedIds:previousIndexedIds.filter(id=>!indexRows.some(r=>r.id===id)),previousManifestDigest:old?hash(old):null};
 const errors=validateManifest(manifest);if(errors.length)fail(errors.join(','));
 return {manifest,records};
}

/** Entry point for the existing refresh workflow's eventual event mode. Not
 * wired or enabled here. CMS consistency is checked again after embeddings;
 * any drift aborts before publication. Cross-project source/commit atomicity
 * is not claimed: subsequent CMS edits require the next existing refresh.
 */
export async function refreshPublishedEvents({repo,sourceCommit,cmsRpc,indexRpc,bundle,id,embed,now=new Date()}) {
 return refreshPinnedEvents({pinned:readPinnedEventSources(repo,sourceCommit),cmsRpc,indexRpc,bundle,id,embed,now});
}

/** Dependency boundary for offline orchestration tests; caller must supply an
 * inventory read from the verified published commit, never a moving worktree. */
export async function refreshPinnedEvents({pinned,cmsRpc,indexRpc,bundle,id,embed,now=new Date()}) {
 const sourceCommit=pinned.revision;
 const storage=await connectSnapshotWriter(indexRpc),previous=await storage.read();
 const cms=await readCmsEventSnapshot(cmsRpc);
 const exported=exportEventManifest({pinned,cms,previous,bundle,now,id});
 const prepared=await prepareSnapshot(previous,exported.manifest,exported.records,{embed,dimensions:1024});
 const latestCms=await readCmsEventSnapshot(cmsRpc);
 if(latestCms.revision!==cms.revision)fail('CMS changed during snapshot preparation');
 return {token:prepared.token,sourceCommit,cmsRevision:cms.revision,sourceCount:exported.records.length,indexedCount:exported.manifest.indexRows.length,...await commitPrepared(storage,prepared)};
}
