import {normalizeReviewedRedirect,loadRetainedBodies} from './redirect-adapter.mjs';
import {fetchEvidence,hash} from './data.mjs';
/** Run-local adapter. Disabled means original manual-redirect transport, never a generic follow. */
export function createReviewedEvidenceFetcher({reviews=[],directory,enabled=false,transport=fetchEvidence,maxAgeHours=168}={}) {
 const cache=new Map();
 return async function reviewedFetch(source,options={}) {
  if(!enabled)return transport(source,options);
  const matches=reviews.filter(r=>r.originalUrl===source.url&&r.sourceId===source.id);
  if(matches.length===0)return transport(source,options);
  if(matches.length!==1)throw new Error('Ambiguous reviewed redirect receipt');
  const receipt=matches[0],bodies=await loadRetainedBodies(receipt,directory),now=options.now??new Date();
  const admission=normalizeReviewedRedirect(source.url,source,receipt,{bodies,now,maxAgeHours});
  const key=source.id+'|'+admission.canonicalUrl+'|'+new Date(now).toISOString();
  if(!cache.has(key))cache.set(key,(async()=>{
   const evidence=await transport({...source,url:admission.canonicalUrl},options);
   if(evidence.url!==admission.canonicalUrl||evidence.sourceId!==source.id||typeof evidence.body!=='string'||hash(evidence.body)!==evidence.hash||!/text\/html/.test(evidence.contentType??'')||new Date(evidence.retrievedAt).getTime()!==new Date(now).getTime())throw new Error('Unbound current canonical capture');
   return evidence;
  })());
  try{return {...await cache.get(key),redirectReview:{originalUrl:source.url,canonicalUrl:admission.canonicalUrl,sourceId:source.id,evidenceChain:receipt.captures,reviewRequired:true,publicationChanges:[]}};}catch(error){cache.delete(key);throw error;}
 };
}
