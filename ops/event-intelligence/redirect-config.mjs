import {readFile,realpath} from 'node:fs/promises';import path from 'node:path';import {loadRetainedBodies,normalizeReviewedRedirect} from './redirect-adapter.mjs';
const originals=['https://library.mornpen.vic.gov.au/Whats-On/Storytimes','https://www.peninsulahotsprings.com/bathe/special-offers?hsLang=en-au','https://www.peninsulahotsprings.com/events?hsLang=en-au','https://www.peninsulahotsprings.com/whats-on?hsLang=en-au'];
export async function loadRedirectConfig(configFile,{root,now=new Date()}={}){
 if(!root||!configFile)throw Error('Explicit private runtime root/config required');
 const boundary=await realpath(root),resolved=await realpath(configFile);const relative=path.relative(boundary,resolved);if(relative.startsWith('..')||path.isAbsolute(relative)||!relative)throw Error('Redirect config escaped private runtime root');
 const bytes=await readFile(resolved);if(bytes.length>131072)throw Error('Redirect config exceeds cap');const config=JSON.parse(bytes);if(config.enabled!==true||config.schemaVersion!==1||config.maxAgeHours!==168||!Array.isArray(config.reviews)||config.reviews.length!==4)throw Error('Explicit four reviewed receipts required');
 if(new Set(config.reviews.map(r=>r.originalUrl)).size!==4||originals.some(url=>!config.reviews.some(r=>r.originalUrl===url)))throw Error('Exact four mapping census required');
 // Bodies reside beside config; no arbitrary directory/path or credentials accepted.
 const directory=path.dirname(resolved);for(const receipt of config.reviews){const bodies=await loadRetainedBodies(receipt,directory),source={id:receipt.sourceId,url:receipt.originalUrl,hosts:[new URL(receipt.originalUrl).hostname]};normalizeReviewedRedirect(source.url,source,receipt,{bodies,now,maxAgeHours:168});}
 return {enabled:true,reviews:config.reviews,directory,maxAgeHours:168};
}
