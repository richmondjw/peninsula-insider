import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir,open,unlink,readdir} from 'node:fs/promises';
import {readJson,atomicJson} from './collect.mjs';
import {fetchEvidence,hash,safeUrl,extractCandidates} from './data.mjs';
import {sourceNavigation} from './source-discovery.mjs';

/** Public source research only. Never admits a source or changes an approval. */
export async function collectSourceNavigation(captures,directory,{limit=20,now=new Date(),fetcher=fetchEvidence}={}) {
 if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Navigation budget must be 1–100');
 await mkdir(directory,{recursive:true});const lockPath=path.join(directory,'source-navigation.lock'),lock=await open(lockPath,'wx');
 try {
  const leads=new Map(),receipts=[],pending=[];
  for(const capture of captures){if(capture.status!=='captured'||!capture.evidence)continue;const host=safeUrl(capture.evidence.url).hostname;
   // Derive links from retained bytes, never trust editable proposed URLs.
   for(const link of sourceNavigation(capture.evidence)){const url=safeUrl(link.url,[host]);leads.set(url.href,{...link,host,parentEvidenceId:capture.evidence.id});}}
  for(const lead of leads.values()){const file=path.join(directory,'source-navigation',hash(lead.url).slice(0,24)+'.json');let previous;try{previous=await readJson(file);}catch(e){if(e.code!=='ENOENT')throw e;}
   const age=now-new Date(previous?.checkedAt);if(previous&&age>=0&&age<(previous.status==='failed'?1:24)*3600000){receipts.push({url:lead.url,status:'cached',lastStatus:previous.status});continue;}pending.push(lead);}
  for(const lead of pending.slice(0,limit)){const file=path.join(directory,'source-navigation',hash(lead.url).slice(0,24)+'.json');let result;
   try{const evidence=await fetcher({id:'research-'+hash(lead.url).slice(0,24),url:lead.url,hosts:[lead.host],authority:'unverified',lineage:lead.host},{now});
    result={status:'captured',checkedAt:now.toISOString(),lead,evidence,candidates:extractCandidates(evidence),identityReviewRequired:true,accessReviewRequired:true,publicationApproved:false};
   }catch(e){result={status:'failed',checkedAt:now.toISOString(),lead,error:e.message,reviewRequired:true};}
   await atomicJson(file,result);receipts.push({url:lead.url,status:result.status,candidates:result.candidates?.length??0,error:result.error});}
  const report={checkedAt:now.toISOString(),discovered:leads.size,pending:Math.max(0,pending.length-limit),receipts,regionalCompleteness:false,publicationChanges:[]};
  await atomicJson(path.join(directory,'source-navigation-receipt.json'),report);return report;
 }finally{await lock.close();await unlink(lockPath);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const directory=process.argv[2]??'ops/reports/events/intelligence',captures=[];
 for(const name of await readdir(path.join(directory,'source-leads')))captures.push(await readJson(path.join(directory,'source-leads',name)));
 console.log(JSON.stringify(await collectSourceNavigation(captures,directory,{limit:Number(process.argv[3]??20)})));
}
