import {readFile} from 'node:fs/promises';
import {hash} from './evaluator.mjs';
import {prepareSnapshot,readPrepared} from './staged-index.mjs';
export const fixtures=JSON.parse(await readFile(new URL('./fixtures.v1.json',import.meta.url),'utf8')).cases;
export const baseline=fixtures[0];
export const bundle={indexSchema:'synthetic-v1',embeddingModel:'stub-2d',promptRevision:'template-v1',appRevision:'staging-v1'};
export const embedding={dimensions:2,embed:async()=>[0.25,0.75]};
export function input(f=baseline,previous=null,id='snapshot-1') {
 const records=structuredClone(f.records),old=previous?readPrepared(previous).manifest:null;
 const sourceRecords=records.map(r=>({id:r.id,revision:r.revision,effectiveRevision:r.revision,payloadDigest:hash(r),admission:r.data.cancelled?'exclude':'index',...(r.data.cancelled?{exclusionReason:'cancelled'}:{})}));
 const indexRows=sourceRecords.filter(r=>r.admission==='index').map(r=>({id:r.id,revision:r.effectiveRevision}));
 const previousIndexedIds=old?.indexRows.map(r=>r.id)??[];
 return {records,manifest:{schemaVersion:1,id,sourceRevision:'source-'+id,sourceRecords,sourceDigest:hash(sourceRecords),bundle,
 sourceVerifiedAt:f.now,contentPublishedAt:f.now,ingestedAt:f.now,retrievedAt:f.now,state:'complete',failures:[],lockHeld:true,
 outcomes:sourceRecords.map(r=>r.admission==='index'?{id:r.id,status:'indexed',revision:r.effectiveRevision}:{id:r.id,status:'excluded',reason:r.exclusionReason}),indexRows,
 pages:[{cursor:null,nextCursor:null,snapshot:'source-'+id,ids:records.map(r=>r.id)}],previousIndexedIds,removedIds:previousIndexedIds.filter(id=>!indexRows.some(r=>r.id===id)),previousManifestDigest:old?hash(old):null}};
}
export async function prepare(f=baseline,previous=null,id='snapshot-1',options=embedding) {const i=input(f,previous,id);return prepareSnapshot(previous,i.manifest,i.records,options);}
