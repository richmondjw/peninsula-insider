import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvalReady} from './publication.mjs';
import {promoteCandidate} from './promotion.mjs';
import {hash,duplicateSignals} from './data.mjs';
import {approvedEventContent} from '../../next/src/lib/event-publication.mjs';
import {EVENT_AUTHORITY,EVENT_PUBLISHER} from '../../next/src/lib/event-standing-authority.mjs';

function overlaps(a,b){
 const start=x=>Date.parse(x.startDate),end=x=>Date.parse(x.endDate??x.startDate);
 return [start(a),end(a),start(b),end(b)].every(Number.isFinite)&&start(a)<=end(b)&&start(b)<=end(a);
}
function duplicate(a,b){
 const norm=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const sameInstant=Number.isFinite(Date.parse(a.fields.startDate))&&Date.parse(a.fields.startDate)===Date.parse(b.fields.startDate);
 return duplicateSignals(a,b).length>0 || (norm(a.fields.title)===norm(b.fields.title)&&norm(a.fields.venueName)===norm(b.fields.venueName)&&sameInstant) || (a.fields.officialEventUrl===b.fields.officialEventUrl&&overlaps(a.fields,b.fields));
}
/** Local content promotion only. The existing protected release pipeline owns deployment. */
export async function publishRoutineEvents(packet,{contentDirectory,historyDirectory,now=new Date(),apply=false}={}){
 if(!Array.isArray(packet.candidates)||!Array.isArray(packet.evidence))throw Error('Complete candidate/evidence packet required');
 const inventory=[];
 for(const name of await readdir(contentDirectory))if(name.endsWith('.json')){
  const bytes=await readFile(path.join(contentDirectory,name),'utf8');inventory.push({name,bytes,record:JSON.parse(bytes)});
 }
 const results=[];
 for(const candidate of packet.candidates){
  const checked=approvalReady(candidate,packet.evidence,now,{standingAuthority:true});
  let reason=!checked.ready||!checked.standingAuthority?'verification-or-routine-scope-held':null;
  if(!reason&&packet.candidates.some(other=>other!==candidate&&duplicate(candidate,other)))reason='duplicate-or-overlapping-occurrence';
  const slug=candidate.slug??candidate.id;
  const existing=inventory.find(entry=>entry.name===slug+'.json');
  if(!reason&&inventory.some(entry=>entry!==existing&&duplicate(candidate,{id:entry.record.eventId,fields:{...entry.record,officialEventUrl:entry.record.primarySourceUrl??entry.record.officialEventUrl}})))reason='public-catalogue-duplicate';
  if(!reason&&existing&&(existing.record.eventId!==candidate.id||existing.record.intelligence?.approvedBy!==EVENT_PUBLISHER||existing.record.intelligence?.standingAuthority?.id!==EVENT_AUTHORITY.id||existing.record.intelligence?.approvedContent!==approvedEventContent(existing.record)||existing.record.heroImage||existing.record.reviewHold||existing.record.factualReviewHold||(existing.record.reviewStatus&&existing.record.reviewStatus!=='published')||!['published','expired','past'].includes(existing.record.status)||existing.record.sourceReview?.required===true||existing.record.cancelled||existing.record.postponed))reason='existing-editorial-record-protected';
  // Images are deliberately omitted: the website already supports text-only details.
  // This avoids treating source image discovery as permission to redistribute it.
  if(reason){results.push({id:candidate.id,status:'held',reason});continue;}
  if(!apply){results.push({id:candidate.id,status:'eligible',treatment:'text-only'});continue;}
  const result=await promoteCandidate(candidate,packet.evidence,{contentDirectory,historyDirectory,now,standingAuthority:true,expectedHash:existing?hash(existing.bytes):null});
  results.push({id:candidate.id,...result});
 }
 return {authority:EVENT_AUTHORITY,applied:apply,deploymentStatus:'not-deployed',results};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [packetFile,contentDirectory,historyDirectory,...flags]=process.argv.slice(2);
 if(!packetFile||!contentDirectory||!historyDirectory||flags.some(flag=>flag!=='--apply'))throw Error('Usage: node routine-publisher.mjs packet.json content-directory private-history-directory [--apply]');
 console.log(JSON.stringify(await publishRoutineEvents(JSON.parse(await readFile(packetFile,'utf8')),{contentDirectory,historyDirectory,apply:flags.includes('--apply')}),null,2));
}
