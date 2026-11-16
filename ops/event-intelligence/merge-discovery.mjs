import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdir} from 'node:fs/promises';
import {readJson,atomicJson} from './collect.mjs';
import {discoverLinks} from './discovery.mjs';
import {extractOfficialHtml} from './html-adapters.mjs';
import {hash} from './data.mjs';
export async function mergeDiscovery(registry,directory){
 const leads=new Map(),receipts=[];
 const add=e=>{for(const l of discoverLinks(e))leads.set(l.url,l);if(['libraries','mprg','shire'].includes(e.sourceId)){const result=extractOfficialHtml(e);for(const l of result.leads)leads.set(l.url,{...l,id:hash(l.url).slice(0,24),retrievalAllowed:true,format:'html',requiresReview:true});}};
 for(const source of registry.sources){try{const capture=await readJson(path.join(directory,source.id+'.json'));if(capture.evidence)add(capture.evidence);}catch(e){if(e.code!=='ENOENT')throw e;}}
 let pages=[];try{pages=await readdir(path.join(directory,'library-pages'));}catch(e){if(e.code!=='ENOENT')throw e;}
 let research=[];try{research=await readdir(path.join(directory,'source-navigation'));}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const file of research.filter(f=>f.endsWith('.json'))){const capture=await readJson(path.join(directory,'source-navigation',file));if(capture.status!=='captured'||!capture.evidence)continue;const source=registry.sources.find(s=>new URL(s.url).hostname===new URL(capture.evidence.url).hostname);if(source&&source.authority==='official'&&typeof capture.evidence.body==='string'&&capture.evidence.hash===hash(capture.evidence.body))add({...capture.evidence,sourceId:source.id,authority:source.authority});}
 for(const file of pages.filter(f=>/^page-\d+\.json$/.test(f))){const capture=await readJson(path.join(directory,'library-pages',file));add(capture.evidence);}
 try{receipts.push(await readJson(path.join(directory,'library-pages','receipt.json')));}catch(e){if(e.code!=='ENOENT')throw e;}
 await atomicJson(path.join(directory,'discovery-leads.json'),[...leads.values()]);
 const report={generatedAt:new Date().toISOString(),leads:leads.size,renderedPagination:receipts.map(r=>({sourceId:r.sourceId,complete:r.complete,pages:r.pages?.length,reason:r.reason})),coverageComplete:false,publicationChanges:[]};await atomicJson(path.join(directory,'discovery-receipt.json'),report);return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await mergeDiscovery(await readJson(new URL('./sources.json',import.meta.url)),process.argv[2]??'ops/reports/events/intelligence')));
