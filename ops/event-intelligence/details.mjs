import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {open,unlink} from 'node:fs/promises';
import {readJson,atomicJson} from './collect.mjs';
import {fetchEvidence,extractCandidates,hash,safeUrl} from './data.mjs';
import {balancedLeads} from './discovery.mjs';
import {extractOfficialHtml} from './html-adapters.mjs';
export function extractDetail(evidence) {
 const html=['libraries','mprg','shire'].includes(evidence.sourceId)&&/html/.test(evidence.contentType??'')?extractOfficialHtml(evidence):null;
 const structured=extractCandidates(evidence);
 // Keep conflicting methods separate for review; never merge sessions by name.
 return {evidence,candidates:[...structured,...(html?.candidates??[])],warnings:html?.warnings??[],adapter:html?.adapter??'json-ld',reviewRequired:true};
}
export async function collectDetails(registry,leads,directory,{now=new Date(),fetcher=fetchEvidence,limit=20,maxAgeHours=24,retryHours=1}={}) {
 if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Detail batch limit must be 1–100');
 const {mkdir}=await import('node:fs/promises');await mkdir(directory,{recursive:true});
 const lockPath=path.join(directory,'details.lock');const lock=await open(lockPath,'wx');
 try {
 const unique=new Map();
 for(const lead of leads){const source=registry.sources.find(s=>s.id===lead.sourceId);if(!source||!lead.retrievalAllowed||lead.format!=='html')continue;try{safeUrl(lead.url,source.hosts??[new URL(source.url).hostname]);unique.set(lead.url,lead);}catch{}}
 const pending=[],receipts=[];
 for(const lead of unique.values()){
 const file=path.join(directory,'details',hash(lead.url).slice(0,24)+'.json');let previous;
 try{previous=await readJson(file);}catch(e){if(e.code!=='ENOENT')throw e;}
 const age=previous?.evidence?now-new Date(previous.evidence.retrievedAt):Infinity;
 if(previous?.evidence&&age>=0&&age<maxAgeHours*3600000){const extracted=extractDetail(previous.evidence);await atomicJson(file,{...extracted,lead,status:'cached',checkedAt:now.toISOString()});receipts.push({url:lead.url,status:'cached',candidates:extracted.candidates.length});}
 else if(previous?.status==='failed'&&now-new Date(previous.checkedAt)>=0&&now-new Date(previous.checkedAt)<retryHours*3600000)receipts.push({url:lead.url,status:'backoff',error:previous.error});
 else pending.push(lead);
 }
 const selected=balancedLeads(pending,limit);
 for(const lead of selected){const source=registry.sources.find(s=>s.id===lead.sourceId);const file=path.join(directory,'details',hash(lead.url).slice(0,24)+'.json');
 try{const evidence=await fetcher({...source,url:lead.url,hosts:source.hosts??[new URL(source.url).hostname]},{now});const result=extractDetail(evidence);await atomicJson(file,{...result,lead,status:'fetched',checkedAt:now.toISOString()});receipts.push({url:lead.url,status:'fetched',candidates:result.candidates.length,warnings:result.warnings});}
 catch(e){await atomicJson(file,{lead,status:'failed',checkedAt:now.toISOString(),error:e.message,reviewRequired:true});receipts.push({url:lead.url,status:'failed',error:e.message});}
 }
 const remaining=pending.filter(l=>!selected.includes(l));
 const report={checkedAt:now.toISOString(),admitted:unique.size,pending:remaining.length,complete:remaining.length===0&&!receipts.some(r=>['failed','backoff'].includes(r.status)),receipts,remaining:remaining.map(l=>({sourceId:l.sourceId,url:l.url})),publicationChanges:[]};
 await atomicJson(path.join(directory,'detail-receipt.json'),report);return report;
 }finally{await lock.close();await unlink(lockPath);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const directory=process.argv[2]??'ops/reports/events/intelligence';const registry=await readJson(new URL('./sources.json',import.meta.url));const leads=await readJson(path.join(directory,'discovery-leads.json'));
 const report=await collectDetails(registry,leads,directory,{limit:Number(process.argv[3]??20)});console.log(JSON.stringify(report));
}
