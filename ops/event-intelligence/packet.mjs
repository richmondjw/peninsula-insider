import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {readJson,atomicJson} from './collect.mjs';
import {candidateRevision} from './data.mjs';
export async function buildPacket(directory,output=path.join(directory,'review-packet.json')){
 const evidence=new Map(),fresh=new Map();
 for(const file of (await readdir(directory)).filter(f=>f.endsWith('.json'))){const result=await readJson(path.join(directory,file));if(!result.evidence?.id||Array.isArray(result.evidence)||!Array.isArray(result.candidates))continue;evidence.set(result.evidence.id,result.evidence);for(const candidate of result.candidates)fresh.set(candidate.id,candidate);}
 for(const file of (await readdir(path.join(directory,'details'))).filter(f=>f.endsWith('.json'))){const result=await readJson(path.join(directory,'details',file));if(!result.evidence)continue;evidence.set(result.evidence.id,result.evidence);for(const candidate of result.candidates??[])fresh.set(candidate.id,candidate);}
 let previous;try{previous=await readJson(output);}catch(e){if(e.code!=='ENOENT')throw e;}
 // Retain old evidence because human proofs may still refer to that snapshot.
 for(const item of previous?.evidence??[])if(!evidence.has(item.id))evidence.set(item.id,item);
 const candidates=[],sourceChanges=[];
 for(const old of previous?.candidates??[]){const incoming=fresh.get(old.id);fresh.delete(old.id);
 const previousExtraction=previous?.extractionRevisions?.[old.id];
 if(incoming&&previousExtraction&&previousExtraction!==candidateRevision(incoming))sourceChanges.push({id:old.id,reason:'Source extraction changed; compare and reverify before approval',previousExtraction,currentExtraction:candidateRevision(incoming),incoming});
 else if(incoming&&!previousExtraction)sourceChanges.push({id:old.id,reason:'Legacy packet lacks extraction baseline; compare and reverify',incoming});
 else if(!incoming)sourceChanges.push({id:old.id,reason:'Candidate absent from current captures; withdrawal or identity change needs review'});
 // Never overwrite human edits, proofs, summaries, licences or approvals.
 const change=sourceChanges.find(item=>item.id===old.id);
 candidates.push(change?{...old,sourceReview:{required:true,reason:change.reason}}:old);
 }
 candidates.push(...fresh.values());
 const extractionRevisions={...(previous?.extractionRevisions??{})};
 for(const c of fresh.values())extractionRevisions[c.id]=candidateRevision(c);
 const packet={createdAt:new Date().toISOString(),evidence:[...evidence.values()],candidates,extractionRevisions,sourceChanges,publicationChanges:[]};
 await atomicJson(output,packet);return packet;
}
