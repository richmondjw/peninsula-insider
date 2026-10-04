/** Compatibility evidence. Passing blocker tests do NOT approve series export. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {materializeSeries} from './series.mjs';
import {astroRecord} from './publication.mjs';
import {resolveOccurrence} from '../../next/src/lib/event-occurrence.mjs';
const libraryBase=new URL('../../next/src/lib/',import.meta.url);
async function realSchedule(){
 const source=stripTypeScriptTypes(await readFile(new URL('event-schedule.ts',libraryBase),'utf8'));
 return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
async function realEvents(enabled){
 let source=stripTypeScriptTypes(await readFile(new URL('events.ts',libraryBase),'utf8'));
 source=source.replace(/import \{ USE_OCCURRENCE_MODEL \} from ['"]\.\/features['"];?/,`const USE_OCCURRENCE_MODEL=${enabled};`);
 source=source.replace(/from ['"]([^'"]+)['"]/g,(_,specifier)=>`from '${specifier.startsWith('.')?new URL(specifier,libraryBase).href:specifier}'`);
 return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
async function realOccurrenceState(enabled){
 const source=stripTypeScriptTypes(await readFile(new URL('../../next/src/pages/whats-on/_data.ts',import.meta.url),'utf8'));
 const actual=source.match(/export function occurrenceStateFor\([\s\S]*?\n\}/)?.[0];
 assert.ok(actual,'Actual website occurrenceStateFor must be present');
 const moduleSource=`import {hasExplicitSeries} from '${new URL('intelligence-series.mjs',libraryBase).href}';
import {resolveListingOccurrence} from '${new URL('whatson-listing.mjs',libraryBase).href}';
import {occurrenceSchemaStatus} from '${new URL('event-occurrence.mjs',libraryBase).href}';
const USE_OCCURRENCE_MODEL=${enabled};
${actual}`;
 return (await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`)).occurrenceStateFor;
}
const now=new Date('2026-10-05T00:00:00Z');
function fixture(){return {fields:{title:'Synthetic series fixture',startTime:'10:00',endTime:'11:00',venueName:'Original venue',officialEventUrl:'https://example.com/synthetic-series'},series:{id:'synthetic-weekly',frequency:'weekly',validFrom:'2026-10-02',validUntil:'2026-10-30',daysOfWeek:[5],exceptions:[]}};}
function proposedRecord(candidate){const materialized=materializeSeries(candidate);return {slug:'synthetic-series',title:candidate.fields.title,summary:'Synthetic compatibility test only',venueName:candidate.fields.venueName,streetAddress:'Original address',suburb:'Mornington',startDate:new Date(candidate.series.validFrom),endDate:new Date(candidate.series.validUntil),startTime:candidate.fields.startTime,endTime:candidate.fields.endTime,nextOccurrence:new Date('2026-10-09'),recurrence:materialized.contract.recurrence,recurrenceNote:materialized.contract.recurrenceNote,occurrenceExceptions:materialized.contract.occurrenceExceptions,status:'published',timezone:'Australia/Melbourne'};}
test('bounded unexceptional weekly/monthly contracts match actual website enumeration',async()=>{
 const {ruleFor,occursOnDay}=await realSchedule();
 for(const frequency of ['weekly','monthly']){
  const candidate=fixture();
  if(frequency==='monthly')candidate.series={id:'synthetic-monthly',frequency:'monthly',validFrom:'2026-10-01',validUntil:'2027-02-01',weekday:5,ordinal:-1,exceptions:[]};
  const expected=materializeSeries(candidate).occurrences.map(item=>item.date);
  const rule=ruleFor({data:proposedRecord(candidate)},now),actual=[];
  for(let day=new Date(candidate.series.validFrom);day<=new Date(candidate.series.validUntil);day.setUTCDate(day.getUTCDate()+1))if(occursOnDay(rule,day))actual.push(day.toISOString().slice(0,10));
  assert.deepEqual(actual,expected);
  assert.equal(occursOnDay(rule,new Date('2027-03-05')),false);
 }
});
test('BLOCKER: actual website cadence loses a rescheduled occurrence on a different weekday',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',sourceUrl:'https://example.com/synthetic-change'}];
 const {ruleFor,occursOnDay}=await realSchedule();
 const record=proposedRecord(candidate),rule=ruleFor({data:record},now);
 assert.equal(materializeSeries(candidate).occurrences.find(item=>item.originalDate==='2026-10-09').date,'2026-10-10');
 assert.equal(occursOnDay(rule,new Date('2026-10-09')),true,'Original cadence remains enumerated');
 assert.equal(occursOnDay(rule,new Date('2026-10-10')),false,'Destination date is currently missing from actual site enumeration');
 assert.throws(()=>astroRecord(candidate,[],{now}),/James approval/);
});
test('BLOCKER: moved venue and exception times do not propagate into actual detail JSON-LD',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'moved',venueName:'New venue',startTime:'14:00',endTime:'15:00',sourceUrl:'https://example.com/synthetic-change'}];
 const record=proposedRecord(candidate);
 const resolved=resolveOccurrence(record,'2026-10-09',now);
 assert.equal(resolved.exception.venueName,'New venue');
 assert.match(resolved.label,/New venue/);
 assert.equal(resolved.startsAt.toISOString(),'2026-10-09T03:00:00.000Z');
 const {eventJsonLd}=await realEvents(true);
 const json=eventJsonLd({data:record},'https://peninsulainsider.com.au');
 assert.equal(json.location.name,'Original venue','Actual schema currently retains the base venue');
 assert.equal(json.startDate,'2026-10-09T10:00:00+11:00','Actual schema currently retains the base time');
});
test('BLOCKER: feature rollback can restore a booking action for a sold-out series occurrence',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'sold-out'}];
 const record=proposedRecord(candidate),{ruleFor}=await realSchedule();
 const live={event:{data:record},rule:ruleFor({data:record},now),statusLabel:null};
 const active=await realOccurrenceState(true),rollback=await realOccurrenceState(false);
 assert.equal(active(live,'2026-10-09',now).bookable,false);
 assert.equal(rollback(live,'2026-10-09',now).bookable,true,'Legacy rollback currently disregards occurrence booking withdrawal');
});

function explicitRecord(candidate){return {...proposedRecord(candidate), intelligence:{revision:'synthetic-test-only'},seriesOccurrences:materializeSeries(candidate).occurrences};}
test('explicit weekly reschedule enumerates effective date on server and compact browser contract',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10'}];
 const record=explicitRecord(candidate),{ruleFor,occursOnDay}=await realSchedule();const rule=ruleFor({data:record},now);
 assert.equal(rule.kind,'explicit');assert.equal(occursOnDay(rule,new Date('2026-10-09')),false);assert.equal(occursOnDay(rule,new Date('2026-10-10')),true);
 const browserRule=JSON.parse(JSON.stringify({...rule,start:undefined,end:undefined}));browserRule.start=new Date(candidate.series.validFrom);browserRule.end=new Date(candidate.series.validUntil);
 assert.equal(occursOnDay(browserRule,new Date('2026-10-10')),true);
 const resolve=await realOccurrenceState(false);const state=resolve({event:{data:record},rule},'2026-10-10',now);
 assert.equal(state.bookable,true);assert.equal(state.schemaStatus,'https://schema.org/EventRescheduled');
});
test('explicit moved session updates detail schema and calendar while discarding unverified old address',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'moved',venueName:'New venue',startTime:'14:00',endTime:'15:00'}];
 const record=explicitRecord(candidate),{eventJsonLd,eventCalendarUrl}=await realEvents(false);const json=eventJsonLd({data:record},'https://peninsulainsider.com.au');
 assert.equal(json.location.name,'New venue');assert.equal(json.location.address,undefined);assert.equal(json.location.geo,undefined);
 assert.equal(json.startDate,'2026-10-09T14:00:00+11:00');assert.equal(json.endDate,'2026-10-09T15:00:00+11:00');
 const calendar=new URL(eventCalendarUrl(record,'https://example.com/event'));
 assert.equal(calendar.searchParams.get('dates'),'20261009T030000Z/20261009T040000Z');assert.match(calendar.searchParams.get('location'),/New venue/);assert.ok(!calendar.searchParams.get('location').includes('Original address'));
});
test('explicit sold-out cancellation and postponement enforce booking safety even under rollback',async()=>{
 const {ruleFor}=await realSchedule();const resolve=await realOccurrenceState(false);
 for(const status of ['sold-out','cancelled','postponed']){const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status}];const record=explicitRecord(candidate);const state=resolve({event:{data:record},rule:ruleFor({data:record},now)},'2026-10-09',now);assert.equal(state.bookable,false,status);}
});

test('actual compact feed preserves explicit sessions and verification withdrawal in browser resolution',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10'}];const record=explicitRecord(candidate);
 const schedule=await realSchedule();const rule=schedule.ruleFor({data:record},now);
 const source=stripTypeScriptTypes(await readFile(new URL('../../next/src/pages/whats-on/_data.ts',import.meta.url),'utf8'));
 const actual=source.match(/export function feedFor\([\s\S]*?\n\}/)?.[0];assert.ok(actual);
 const feedFor=new Function('isoDate',actual.replace('export ','')+';return feedFor;')(schedule.isoDate);
 const live={event:{data:record},rule,slug:record.slug,href:'/whats-on/synthetic-series/',title:record.title,oneLiner:record.summary,meta:['Original venue'],free:false};
 const entry=JSON.parse(JSON.stringify(feedFor([live])[0]));assert.deepEqual(entry.dates,rule.dates);assert.equal(entry.statusData.seriesOccurrences[1].date,'2026-10-10');assert.ok(entry.statusData.intelligence);
 const {resolveListingOccurrence}=await import('../../next/src/lib/whatson-listing.mjs');assert.equal(resolveListingOccurrence(entry.statusData,{kind:entry.k},'2026-10-10',now).bookable,true);
 for(const mutation of [{cancelled:true},{sourceUpdatedAt:'2026-10-04T23:00:00Z',lastVerifiedAt:'2026-10-04T00:00:00Z'}]){
  Object.assign(record,mutation);const withdrawn=JSON.parse(JSON.stringify(feedFor([live])[0]));assert.equal(resolveListingOccurrence(withdrawn.statusData,{kind:withdrawn.k},'2026-10-10',now).bookable,false);delete record.cancelled;
 }
});
test('all later sessions cancelled choose the last factual cancellation without a booking action',async()=>{
 const candidate=fixture();candidate.series.exceptions=['2026-10-09','2026-10-16','2026-10-23','2026-10-30'].map(date=>({date,status:'cancelled'}));
 const {nextSeriesData,explicitOccurrence}=await import('../../next/src/lib/intelligence-series.mjs');const record=explicitRecord(candidate),actual=nextSeriesData(record,now);assert.equal(actual.nextOccurrence.toISOString().slice(0,10),'2026-10-30');assert.equal(actual.cancelled,true);assert.equal(explicitOccurrence(record,'2026-10-30',now).bookable,false);
});

test('explicit monthly session uses exact target date across a changed weekday',async()=>{
 const candidate=fixture();candidate.series={id:'synthetic-monthly',frequency:'monthly',validFrom:'2026-10-01',validUntil:'2027-02-01',weekday:5,ordinal:-1,exceptions:[{date:'2026-10-30',status:'rescheduled',rescheduledTo:'2026-10-31'}]};
 const record=explicitRecord(candidate),{ruleFor,occursOnDay}=await realSchedule();const rule=ruleFor({data:record},now);assert.equal(occursOnDay(rule,new Date('2026-10-30')),false);assert.equal(occursOnDay(rule,new Date('2026-10-31')),true);assert.equal(occursOnDay(rule,new Date('2027-02-26')),false);
});

test('actual homepage selects the effective moved weekend session and refuses unchecked intelligence',async()=>{
 let source=stripTypeScriptTypes(await readFile(new URL('../../next/src/components/v5/home/home-data.ts',import.meta.url),'utf8'));
 source=source.replace(/import \{ USE_OCCURRENCE_MODEL \} from ['"]\.\.\/\.\.\/\.\.\/lib\/features['"];?/, 'const USE_OCCURRENCE_MODEL=false;');
 for(const name of ['event-schedule','daily-rotation']){const raw=stripTypeScriptTypes(await readFile(new URL(name+'.ts',libraryBase),'utf8'));source=source.replaceAll('../../../lib/'+name,'data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));}
 source=source.replace(/from ['"](\.\.\/\.\.\/\.\.\/lib\/[^'"]+)['"]/g,(_,specifier)=>"from '"+new URL(specifier,new URL('../../next/src/components/v5/home/',import.meta.url)).href+"'");
 const home=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',venueName:'New venue',startTime:'14:00',endTime:'15:00'}];const record=explicitRecord(candidate);
 record.intelligence={revision:'synthetic-test-only',approvedBy:'James',approvedAt:'2026-10-04T00:00:00Z',reviewedAt:'2026-10-04T00:00:00Z',factScore:100,evidenceIds:['synthetic']};
 const selected=home.selectWeekendPicks([],[{id:'synthetic',data:record}],now);assert.equal(selected.picks.length,1);assert.equal(selected.picks[0].event.data.venueName,'New venue');assert.equal(selected.picks[0].event.data.startTime,'14:00');assert.equal(selected.picks[0].event.data.streetAddress,undefined);assert.equal(home.pickDateISO(selected.picks[0].event,now),'2026-10-10');
 record.sourceUpdatedAt='2026-10-04T23:00:00Z';record.lastVerifiedAt='2026-10-04T00:00:00Z';assert.equal(home.selectWeekendPicks([],[{id:'synthetic',data:record}],now).picks.length,0);
});

test('resolving another session from a resolved card preserves original record facts',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',venueName:'New venue'}];const record=explicitRecord(candidate);const {occurrenceData,explicitOccurrence}=await import('../../next/src/lib/intelligence-series.mjs');
 const moved=occurrenceData(record,'2026-10-10'),later=occurrenceData(moved,'2026-10-16');assert.equal(later.venueName,'Original venue');assert.equal(later.streetAddress,'Original address');assert.equal(later.postponed,false);assert.equal(explicitOccurrence(moved,'2026-10-16',now).bookable,true);
});
