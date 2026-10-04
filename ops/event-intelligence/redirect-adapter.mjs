import {createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {safeUrl,fetchEvidence} from './data.mjs';
const mappings=new Map([
 ['https://library.mornpen.vic.gov.au/Whats-On/Storytimes','https://library.mornpen.vic.gov.au/Kids-Teens/Storytimes'],
 ['https://www.peninsulahotsprings.com/bathe/special-offers?hsLang=en-au','https://www.peninsulahotsprings.com/bathe/special-offers'],
 ['https://www.peninsulahotsprings.com/events?hsLang=en-au','https://www.peninsulahotsprings.com/events'],
 ['https://www.peninsulahotsprings.com/whats-on?hsLang=en-au','https://www.peninsulahotsprings.com/events']]);
/** Exact observed mappings only. Existing fetchEvidence retains manual redirect/DNS guards. */
export function normalizeReviewedRedirect(originalUrl,source,receipt,{bodies={},now=new Date(),maxAgeHours=168}={}){
 safeUrl(originalUrl,source.hosts??[new URL(source.url).hostname]);
 const sourceId=new URL(originalUrl).hostname==='library.mornpen.vic.gov.au'?'libraries':'hot-springs';
 if(source.id!==sourceId||receipt?.sourceId!==sourceId)throw new Error('Source identity mismatch');
 if(!Number.isFinite(maxAgeHours)||maxAgeHours<=0||maxAgeHours>168)throw new Error('Invalid freshness policy');
 const expected=mappings.get(originalUrl);if(!expected)throw new Error('No exact reviewed redirect mapping');
 if(!receipt||receipt.originalUrl!==originalUrl||!Array.isArray(receipt.captures)||receipt.captures.length<2||receipt.captures.length>3)throw new Error('Missing bounded observed chain');
 let previous=originalUrl;
 for(let i=0;i<receipt.captures.length;i++){const capture=receipt.captures[i];const age=new Date(now)-new Date(capture.checkedAt);const bytes=bodies[capture.retainedBody];if(!Number.isFinite(age)||age<0||age>maxAgeHours*3600000)throw new Error('Stale/future redirect evidence');if(!Buffer.isBuffer(bytes)||bytes.length>1048576||createHash('sha256').update(bytes).digest('hex')!==capture.bodySha256)throw new Error('Retained body hash mismatch');safeUrl(capture.url,[new URL(originalUrl).hostname]);if(capture.url!==previous||!/^[a-f0-9]{64}$/.test(capture.bodySha256??''))throw new Error('Unbound redirect evidence');if(i<receipt.captures.length-1){if(![301,302,303,307,308].includes(capture.status)||!capture.location)throw new Error('Invalid redirect receipt');previous=new URL(capture.location,capture.url).href;}else if(capture.status!==200||capture.url!==expected||!/text\/html/.test(capture.contentType??''))throw new Error('Canonical destination not observed');}
 return {originalUrl,canonicalUrl:expected,sourceId:source.id,evidenceChain:receipt.captures,reviewRequired:true,publicationChanges:[]};
}

/** Transport still enforces public DNS, manual redirects, byte cap and timeout. */
export async function fetchReviewedCanonical(source,receipt,{transport=fetchEvidence,bodies,now=new Date(),maxAgeHours=168,...options}={}) {
 const admission=normalizeReviewedRedirect(source.url,source,receipt,{bodies,now,maxAgeHours});
 const evidence=await transport({...source,url:admission.canonicalUrl},options);
 if(evidence.url!==admission.canonicalUrl)throw new Error('Unexpected transport destination');
 return {evidence,admission,reviewRequired:true,publicationChanges:[]};
}

export async function loadRetainedBodies(receipt,directory){
 const bodies={};for(const capture of receipt.captures){const name=capture.retainedBody;if(typeof name!=='string'||path.basename(name)!==name||!/^redirect-review-[a-f0-9]{64}\.html$/.test(name))throw new Error('Unsafe retained body path');const resolved=await realpath(path.join(directory,name));const boundary=await realpath(directory);if(path.dirname(resolved)!==boundary)throw new Error('Retained body escaped root');const bytes=await readFile(resolved);if(bytes.length>1048576)throw new Error('Retained body exceeds cap');bodies[name]=bytes;}return bodies;
}
