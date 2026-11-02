import test from 'node:test';import assert from 'node:assert/strict';
import {routineFixture} from './routine-test-fixtures.mjs';import {verifyRoutinePublic} from './routine-public-verification.mjs';
import {astroRecord} from './publication.mjs';import {publicEventData} from '../../next/src/lib/event-publication.mjs';import {htmlEscape} from './data.mjs';
const now=new Date('2026-11-01T11:00:00Z');
test('actual routine receipt, source and next-date feed verify without an image requirement',()=>{
 const f=routineFixture(now);assert.equal(verifyRoutinePublic(f.record,f.html,f.feed,now).feed,true);
 assert.throws(()=>verifyRoutinePublic(f.record,f.html,{...f.feed,events:[]},now),/next active occurrence/);
 assert.throws(()=>verifyRoutinePublic(f.record,f.html.replace('data-routine-event','data-other'),f.feed,now),/Missing public routine receipt/);
 assert.throws(()=>verifyRoutinePublic(f.record,f.html.replace('<h1>','<figure class="event-detail__image"></figure><h1>'),f.feed,now),/redistributed an image/);
});
test('ongoing range validates its next active day rather than the original opening date',()=>{
 const f=routineFixture(now),c=f.packet.candidates[0];c.fields.startDate='2026-10-31T10:00:00+11:00';c.proofs.startDate.value=c.fields.startDate;c.proofs.startDate.quote=c.fields.startDate;f.packet.evidence[0].body+=' '+c.fields.startDate;
 const record=astroRecord(c,f.packet.evidence,{now,standingAuthority:true});record.status='published';
 const html='<article data-routine-event="'+htmlEscape(JSON.stringify(publicEventData(record)))+'"><a href="'+record.primarySourceUrl+'">Source</a></article>';
 const feed={...f.feed,events:[{...f.feed.events[0],startDate:'2026-11-01'}]};assert.equal(verifyRoutinePublic(record,html,feed,now).feed,true);
});

test('missing, inverted, invalid and stale feed windows cannot bypass occurrence presence checks',()=>{
 const f=routineFixture(now);for(const window of [null,{start:'2026-11-01',end:'2026-10-31'},{start:'2026-02-30',end:'2026-11-30'},{start:'2026-10-31',end:'2027-01-30'},{start:'2026-11-01',end:'2029-01-30'}])assert.throws(()=>verifyRoutinePublic(f.record,f.html,{window,events:[]},now),/window/);
});

test('a recurring series verifies the next non-cancelled occurrence',()=>{
 const f=routineFixture(now),c=f.packet.candidates[0];c.series={id:'synthetic-weekly',frequency:'weekly',validFrom:'2026-11-02',validUntil:'2026-11-16',daysOfWeek:[1],exceptions:[{date:'2026-11-02',status:'cancelled'}]};
 c.fields.startTime='10:00';c.fields.endTime='12:00';f.packet.evidence[0].body+=' '+JSON.stringify(c.series);c.proofs.series={evidenceId:'fixture-official',value:c.series,quote:JSON.stringify(c.series),verified:true,verifiedBy:'James'};
 for(const key of ['startTime','endTime']){f.packet.evidence[0].body+=' '+c.fields[key];c.proofs[key]={evidenceId:'fixture-official',value:c.fields[key],quote:c.fields[key],verified:true,verifiedBy:'James'};}
 const record=astroRecord(c,f.packet.evidence,{now,standingAuthority:true});record.status='published';const html='<article data-routine-event="'+htmlEscape(JSON.stringify(publicEventData(record)))+'"><a href="'+record.primarySourceUrl+'">Source</a></article>';
 const feed={...f.feed,events:[{...f.feed.events[0],startDate:'2026-11-09'}]};assert.equal(verifyRoutinePublic(record,html,feed,now).feed,true);
});
