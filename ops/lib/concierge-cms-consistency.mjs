/** Inactive integration policy. No transport, credentials, cache or model calls.
 * prepareAnswer must be deterministic and must not emit/stream anything.
 * Receipts must come directly from the intended CMS role, never a cached proxy.
 */
import {readPrepared} from './concierge-snapshot.mjs';
import {validateCmsEventSnapshot} from './concierge-source-export.mjs';
const unavailable=()=>({disposition:'unavailable',answer:'I cannot verify the current event listings right now. Please check the published event pages.',recommendations:[],consistency:'unverified'});
async function boundedRead(readCms,timeoutMs) {
 let timer;
 try{return await Promise.race([Promise.resolve().then(readCms),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CMS timeout')),timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
export async function answerWithCmsConsistency({prepared,readCms,prepareAnswer,clock=Date.now,timeoutMs=2000}) {
 // This function returns one buffered response. There is no partial-answer or
 // legacy retrieval fallback on missing/mismatched/error evidence.
 try{
  if(typeof readCms!=='function'||typeof prepareAnswer!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>2000)return unavailable();
  const {manifest}=readPrepared(prepared);
  if(!/^[a-f0-9]{64}$/.test(manifest.cmsRevision??''))return unavailable();
  const check=async()=>{
   const started=clock(),receipt=validateCmsEventSnapshot(await boundedRead(readCms,timeoutMs)),finished=clock();
   const observed=Date.parse(receipt.observed_at);
   // A small explicit clock-skew allowance; never a cache TTL. Managed clock
   // skew and direct/no-store transport must be verified before wiring this.
   if(!Number.isFinite(started)||!Number.isFinite(finished)||finished<started||finished-started>timeoutMs
     ||observed<started-1000||observed>finished+1000||receipt.revision!==manifest.cmsRevision)throw Error('CMS unverified');
   return receipt;
  };
  await check();
  const answer=await prepareAnswer();
  const final=await check();
  return {disposition:'verified-as-of',answer,consistency:{cmsRevision:final.revision,cmsObservedAt:final.observed_at,snapshotToken:prepared.token}};
 }catch{return unavailable();}
}
