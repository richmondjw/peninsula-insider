import {fileURLToPath} from 'node:url';
import {mkdir,readFile,writeFile,rename,open} from 'node:fs/promises';
import path from 'node:path';
import {discoverLinks} from './discovery.mjs';
import {fetchEvidence,extractCandidates,hash} from './data.mjs';
export const readJson=async file=>JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''));
export async function atomicJson(file,value) {
 await mkdir(path.dirname(file),{recursive:true});const temp=`${file}.${process.pid}.tmp`;
 await writeFile(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});await rename(temp,file);
}
export async function collect(registry,directory,{now=new Date(),fetcher,evidenceFetcher=fetchEvidence,force=false}={}) {
 await mkdir(directory,{recursive:true});
 const lockPath=path.join(directory,'collection.lock');const lock=await open(lockPath,'wx');
 const receipts=[];
 try {
  for(const source of registry.sources) {
   const file=path.join(directory,`${source.id}.json`);
   let previous;try{previous=await readJson(file);}catch(error){if(error.code!=='ENOENT')throw error;}
   const changedUrl=previous?.requestedUrl!==source.url;
   const failureBackoff=previous?.status==='failed'&&now-new Date(previous.checkedAt)<Math.min(source.cadenceHours??24,1)*3600000;
   const due=changedUrl||(!failureBackoff&&(!previous?.lastSuccessAt||now-new Date(previous.lastSuccessAt)>source.cadenceHours*3600000));
   if(!force&&!due){receipts.push({sourceId:source.id,status:'not-due',lastStatus:previous.status,lastSuccessAt:previous.lastSuccessAt??null,checkedAt:previous.checkedAt});continue;}
   let evidence,error;
   for(let attempt=0;attempt<3;attempt++){
    try{evidence=await evidenceFetcher({...source,hosts:source.hosts??[new URL(source.url).hostname]},{now,fetcher});break;}
    catch(e){error=e;if(!/HTTP (429|5\d\d)|fetch failed|timeout/i.test(e.message))break;if(attempt<2)await new Promise(r=>setTimeout(r,1000*2**attempt));}
   }
   if(!evidence){const receipt={sourceId:source.id,requestedUrl:source.url,status:'failed',error:error.message,checkedAt:now.toISOString(),lastSuccessAt:previous?.lastSuccessAt??null};await atomicJson(file,{...previous,...receipt});receipts.push(receipt);continue;}
   const changed=previous?.evidence?.hash!==evidence.hash;
   const candidates=changed?extractCandidates(evidence):previous.candidates??[];
   const receipt={sourceId:source.id,requestedUrl:source.url,status:changed?'changed':'unchanged',checkedAt:now.toISOString(),lastSuccessAt:now.toISOString(),evidence,candidates,leads:discoverLinks(evidence),reviewRequired:candidates.length===0||source.manualReview===true,warning:candidates.length===0?'No structured events: HTML/PDF/manual adapter required; not a completeness claim':null};
   await atomicJson(file,receipt);receipts.push({...receipt,evidence:undefined,candidates:undefined,count:candidates.length});
  }
  await atomicJson(path.join(directory,'collection-receipt.json'),{checkedAt:now.toISOString(),sources:receipts,failed:receipts.filter(x=>x.status==='failed'||x.lastStatus==='failed').length});
 } finally {await lock.close();const {unlink}=await import('node:fs/promises');await unlink(lockPath);}
 return receipts;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const directory=process.argv[2]??'ops/reports/events/intelligence';
 const registry=await readJson(new URL('./sources.json',import.meta.url));
 const receipts=await collect(registry,directory,{force:process.argv.includes('--force')});
 console.log(JSON.stringify(receipts,null,2));if(receipts.some(x=>x.status==='failed'||x.lastStatus==='failed'))process.exitCode=1;
}
