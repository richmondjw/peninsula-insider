import {hash} from './data.mjs';
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

test('explicit factual holds and rejections survive standing authority',()=>sandbox(async options=>{
 for(const hold of [{reviewHold:true},{factualReviewHold:true},{reviewStatus:'rejected'},{reviewStatus:'held'}]){
  const packet=fixture();Object.assign(packet.candidates[0],hold);assert.equal((await publishRoutineEvents(packet,{...options,apply:true})).results[0].status,'held');
 }
}));
test('oldest booking and price proofs bound the whole automated receipt',()=>sandbox(async options=>{
 const packet=fixture(),candidate=packet.candidates[0],old=new Date(+now-23*3600000).toISOString();candidate.fields.bookingUrl='https://example.com/book';candidate.price={label:'Free entry',checkedAt:old,validUntil:new Date(+now+3600000).toISOString()};
 packet.evidence.push({id:'booking-price',url:candidate.fields.bookingUrl,authority:'official',retrievedAt:old,body:'Booking https://example.com/book Free entry'});
 candidate.proofs.bookingUrl={evidenceId:'booking-price',value:candidate.fields.bookingUrl,quote:'Booking https://example.com/book',verified:true,verifiedBy:'James'};
 candidate.proofs.price={evidenceId:'booking-price',value:'Free entry',quote:'Free entry',verified:true,verifiedBy:'James'};
 const output=(await publishRoutineEvents(packet,{...options,apply:true})).results[0];const record=JSON.parse(await readFile(output.target,'utf8'));
 assert.equal(record.expiresAt,new Date(+now+3600000).toISOString());assert.equal(isPublicEventRecord(record,new Date(+now+2*3600000)),false);
}));
test('cross-source equivalent instants and normalized venue identities are duplicate-held',()=>sandbox(async options=>{
 const packet=fixture(),other=structuredClone(packet.candidates[0]);other.id='same-instant-event';other.fields.startDate='2026-11-01T23:00:00Z';other.fields.venueName=' gallery ';other.fields.officialEventUrl='https://example.com/other-source';
 packet.candidates.push(other);assert.equal((await publishRoutineEvents(packet,options)).results[0].reason,'duplicate-or-overlapping-occurrence');
}));

test('boundary expiry keeps its thirty-day policy and bounds a fresh event receipt',()=>sandbox(async options=>{
 const packet=fixture(),c=packet.candidates[0];c.fields.coordinates={lat:-38,lng:144.5};const quote=JSON.stringify(c.fields.coordinates);packet.evidence[0].body+=' '+quote;c.proofs.coordinates={evidenceId:'official-capture',quote,value:c.fields.coordinates,verified:true,verifiedBy:'James'};
 const body=JSON.stringify({type:'FeatureCollection',numberMatched:1,numberReturned:1,features:[{properties:{lga_official_name:'MORNINGTON PENINSULA SHIRE'},geometry:{type:'Polygon',coordinates:[[[144,-39],[146,-39],[146,-37],[144,-37],[144,-39]]]}}],crs:{properties:{name:'urn:ogc:def:crs:EPSG::4326'}}});
 packet.evidence.push({id:'boundary',url:'https://opendata.maps.vic.gov.au/geoserver/wfs',authority:'official',body,hash:hash(body),retrievedAt:new Date(+now-(30*24-1)*3600000).toISOString()});c.geography.boundaryEvidenceId='boundary';
 const output=(await publishRoutineEvents(packet,{...options,apply:true})).results[0],record=JSON.parse(await readFile(output.target,'utf8'));assert.equal(record.expiresAt,new Date(+now+3600000).toISOString());
}));

test('evidence shared by boundary and volatile facts uses the stricter fact deadline',()=>sandbox(async options=>{
 const packet=fixture(),c=packet.candidates[0];c.fields.coordinates={lat:-38,lng:144.5};const quote=JSON.stringify(c.fields.coordinates);c.proofs.coordinates={evidenceId:'official-capture',quote,value:c.fields.coordinates,verified:true,verifiedBy:'James'};c.geography.boundaryEvidenceId='official-capture';
 const body=JSON.stringify({type:'FeatureCollection',numberMatched:1,numberReturned:1,features:[{properties:{lga_official_name:'MORNINGTON PENINSULA SHIRE',facts:c.fields},geometry:{type:'Polygon',coordinates:[[[144,-39],[146,-39],[146,-37],[144,-37],[144,-39]]]}}],crs:{properties:{name:'urn:ogc:def:crs:EPSG::4326'}}});
 Object.assign(packet.evidence[0],{url:'https://opendata.maps.vic.gov.au/geoserver/wfs',body,hash:hash(body),retrievedAt:new Date(+now-23*3600000).toISOString()});
 const output=(await publishRoutineEvents(packet,{...options,apply:true})).results[0],record=JSON.parse(await readFile(output.target,'utf8'));assert.equal(record.expiresAt,new Date(+now+3600000).toISOString());
}));
