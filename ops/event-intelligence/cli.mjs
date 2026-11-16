import {readdir,readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {readJson,atomicJson} from './collect.mjs';
import {buildPacket} from './packet.mjs';
import {hash,candidateRevision} from './data.mjs';
import {astroRecord,approvalReady,reviewHtml} from './publication.mjs';
import {verifyCandidate} from './verify.mjs';
import {sourceCoverage} from './coverage.mjs';
import {operationalReport} from './operations.mjs';
const [command,input,extra]=process.argv.slice(2);
async function packet(file){const p=await readJson(file);if(!Array.isArray(p.candidates)||!Array.isArray(p.evidence))throw new Error('Packet must contain candidate and evidence arrays');return p;}
if(command==='coverage'){
 const directory=input??'ops/reports/events/intelligence';const registry=await readJson(new URL('./sources.json',import.meta.url));const venues=[];
 for(const entry of await readdir('next/src/content/venues')){if(entry.endsWith('.json'))venues.push(await readJson(path.join('next/src/content/venues',entry)));}
 const p=await packet(path.join(directory,'review-packet.json'));let boundaryEvidence=null,boundaryReview=null;try{boundaryEvidence=(await readJson(path.join(directory,'shire-boundary.json'))).evidence;boundaryReview=await readJson(path.join(directory,'boundary-review.json'));}catch(e){if(e.code!=='ENOENT')throw e;}const report=sourceCoverage({venues,sources:registry.sources,...p,boundaryEvidence,boundaryReview});await atomicJson(extra??path.join(directory,'coverage.json'),report);console.log(JSON.stringify({venues:venues.length,seededHosts:report.sourceLeads.length,towns:report.towns.length,registeredSources:registry.sources.length,completeness:report.completeness}));
}else if(command==='health'){
 const directory=input??'ops/reports/events/intelligence';const registry=await readJson(new URL('./sources.json',import.meta.url));const receipts=[];
 for(const source of registry.sources){try{receipts.push(await readJson(path.join(directory,source.id+'.json')));}catch(error){if(error.code!=='ENOENT')throw error;}}
 const p=await packet(path.join(directory,'review-packet.json'));const report=operationalReport({sources:registry.sources,receipts,...p});await atomicJson(extra??path.join(directory,'health.json'),report);console.log(JSON.stringify(report.counts));
}else if(command==='review'){
 const p=await packet(input);const output=extra??'ops/reports/events/intelligence/review.html';await mkdir(path.dirname(output),{recursive:true});const health={};for(const name of ['health','coverage','detail-receipt','source-network']){try{health[name]=await readJson(path.join(path.dirname(input),name+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}}await writeFile(output,reviewHtml(p.candidates,p.evidence,health));console.log(`Private review: ${output}`);
}else if(command==='verify'){
 const p=await packet(input);const reports=p.candidates.map(c=>({id:c.id,...verifyCandidate(c,p.evidence)}));console.log(JSON.stringify(reports,null,2));if(reports.some(r=>!r.ready))process.exitCode=1;
}else if(command==='export-drafts'){
 const p=await packet(input);const output=path.resolve(extra??'ops/reports/events/intelligence/drafts');await mkdir(output,{recursive:true});
 for(const c of p.candidates){const record=astroRecord(c,p.evidence);const file=path.join(output,record.slug+'.json');let existing;try{existing=await readFile(file,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 const serialized=JSON.stringify(record,null,2)+'\n';if(existing){const old=JSON.parse(existing);if(old.intelligence?.revision===record.intelligence.revision){console.log(`Unchanged ${record.slug}`);continue;}await atomicJson(path.join(output,'history',record.slug+'-'+hash(existing)+'.json'),{record:old,recordHash:hash(existing),replacedBy:hash(serialized)});}
 await atomicJson(file,record);console.log(`Review-only draft: ${file}`);}
}else if(command==='packet'){
 const directory=input??'ops/reports/events/intelligence';const p=await buildPacket(directory,extra);console.log(`${p.candidates.length} quarantined candidates; ${p.evidence.length} evidence snapshots; ${p.sourceChanges.length} source changes requiring review; no new approvals`);
}else{
 console.error('Usage: node ops/event-intelligence/cli.mjs packet [directory] [output] | review packet.json [output.html] | verify packet.json | export-drafts approved-packet.json [output-directory]');process.exitCode=1;
}
