import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {publishRoutineEvents} from './routine-publisher.mjs';
import {isPublicEventRecord,publicEventData} from '../../next/src/lib/event-publication.mjs';
const now=new Date('2026-11-01T11:00:00Z');
function fixture(){
 const fields={title:'Verified art day',venueName:'Gallery',officialEventUrl:'https://example.com/art',status:'scheduled',startDate:'2026-11-02T10:00:00+11:00',endDate:'2026-11-02T12:00:00+11:00'};
 const evidence={id:'official-capture',url:fields.officialEventUrl,body:Object.values(fields).join(' '),authority:'official',retrievedAt:now.toISOString()};
 const candidate={id:'verified-art-day',kind:'event',fields,summary:'A local art session.',category:'Arts & Culture',geography:{shireConfirmed:true,evidenceId:evidence.id,quote:'Gallery',verified:true,verifiedBy:'James'},proofs:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,{value,quote:value,evidenceId:evidence.id,verified:true,verifiedBy:'James'}]))};
 return {candidates:[candidate],evidence:[evidence]};
}
async function sandbox(fn){const dir=await mkdtemp(path.join(os.tmpdir(),'pi-routine-'));try{const options={contentDirectory:path.join(dir,'events'),historyDirectory:path.join(dir,'history'),now};await mkdir(options.contentDirectory);await fn(options);}finally{await rm(dir,{recursive:true,force:true});}}
test('standing authority promotes a fact-checked event without per-event approval, with truthful receipt and text-only public content',()=>sandbox(async options=>{
 const packet=fixture();assert.equal((await publishRoutineEvents(packet,options)).results[0].status,'eligible');
 const result=await publishRoutineEvents(packet,{...options,apply:true});assert.equal(result.deploymentStatus,'not-deployed');
 const row=result.results[0],record=JSON.parse(await readFile(row.target,'utf8'));
 assert.equal(record.intelligence.approvedBy,'PI routine event publisher');assert.equal(record.intelligence.standingAuthority.by,'James');assert.equal(record.heroImage,undefined);assert.equal(isPublicEventRecord(record,now),true);
 assert.equal(isPublicEventRecord(publicEventData(record),now),true);
 assert.equal(isPublicEventRecord(record,new Date(+now+86400000)),false);
 record.intelligence.standingAuthority.scope='all-content';assert.equal(isPublicEventRecord(record,now),false);
}));
test('raw, stale, cancelled, conflicting, out-of-scope and sponsored candidates remain held',()=>sandbox(async options=>{
 const mutations=[p=>{p.candidates[0].proofs.title.verified=false;},p=>{p.evidence[0].retrievedAt='2026-10-30T00:00:00Z';},p=>{p.candidates[0].fields.status='cancelled';},p=>{p.candidates[0].conflicts=[{resolved:false}];},p=>{p.candidates[0].geography.shireConfirmed=false;},p=>{p.candidates[0].sponsored=true;},p=>{p.candidates[0].sourceReview={required:true};}];
 for(const mutate of mutations){const p=fixture();mutate(p);assert.equal((await publishRoutineEvents(p,{...options,apply:true})).results[0].status,'held');}
}));
test('overlapping duplicate source identities are held; legacy and edited records cannot be overwritten',()=>sandbox(async options=>{
 const packet=fixture(),other=structuredClone(packet.candidates[0]);other.id='conflicting-art-day';other.fields.startDate='2026-11-02T11:00:00+11:00';packet.candidates.push(other);
 assert.ok((await publishRoutineEvents(packet,options)).results.every(x=>x.status==='held'));
 const legacy=fixture().candidates[0];await writeFile(path.join(options.contentDirectory,legacy.id+'.json'),JSON.stringify({...legacy.fields,eventId:legacy.id}));
 assert.equal((await publishRoutineEvents(fixture(),{...options,apply:true})).results[0].reason,'existing-editorial-record-protected');
}));
test('ended events and future authority cannot publish',()=>sandbox(async options=>{
 assert.equal((await publishRoutineEvents(fixture(),{...options,now:new Date('2026-11-03T00:00:00Z')})).results[0].status,'held');
 assert.equal((await publishRoutineEvents(fixture(),{...options,now:new Date('2026-11-01T10:00:00Z')})).results[0].status,'held');
}));

test('fresh verified updates renew authority while edited publication bytes are held',()=>sandbox(async options=>{
 const packet=fixture();const first=(await publishRoutineEvents(packet,{...options,apply:true})).results[0];
 const later=new Date(+now+3600000);packet.evidence[0].retrievedAt=later.toISOString();
 const second=(await publishRoutineEvents(packet,{...options,now:later,apply:true})).results[0];
 assert.equal(second.status,'promoted-locally');let record=JSON.parse(await readFile(first.target,'utf8'));
 assert.equal(record.intelligence.reviewedAt,later.toISOString());record.summary='Independent editorial edit';await writeFile(first.target,JSON.stringify(record));
 assert.equal((await publishRoutineEvents(packet,{...options,now:later,apply:true})).results[0].reason,'existing-editorial-record-protected');
}));
