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
 const moduleSource=`import {hasExplicitSeries,hasLegacyExceptions} from '${new URL('intelligence-series.mjs',libraryBase).href}';
import {resolveListingOccurrence} from '${new URL('whatson-listing.mjs',libraryBase).href}';
import {occurrenceSchemaStatus} from '${new URL('event-occurrence.mjs',libraryBase).href}';
const USE_OCCURRENCE_MODEL=${enabled};
${actual}`;
 return (await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`)).occurrenceStateFor;
}
const now=new Date('2026-10-05T00:00:00Z');
// Consumers select the next session using the current clock. Keep these
// synthetic October fixtures anchored to their declared pre-session date.
test.beforeEach(t=>t.mock.timers.enable({apis:['Date'],now:now.getTime()}));
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
test('legacy reschedule replaces original weekday with its effective date',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',sourceUrl:'https://example.com/synthetic-change'}];
 const {ruleFor,occursOnDay}=await realSchedule();
 const record=proposedRecord(candidate),rule=ruleFor({data:record},now);
 assert.equal(materializeSeries(candidate).occurrences.find(item=>item.originalDate==='2026-10-09').date,'2026-10-10');
 assert.equal(occursOnDay(rule,new Date('2026-10-09')),false,'Original cadence must be replaced');
 assert.equal(occursOnDay(rule,new Date('2026-10-10')),true,'Effective date must be enumerated');
 assert.throws(()=>astroRecord(candidate,[],{now}),/James approval/);
});
test('legacy moved venue and exception times propagate into actual detail JSON-LD',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'moved',venueName:'New venue',startTime:'14:00',endTime:'15:00',sourceUrl:'https://example.com/synthetic-change'}];
 const record=proposedRecord(candidate);
 const resolved=resolveOccurrence(record,'2026-10-09',now);
 assert.equal(resolved.exception.venueName,'New venue');
 assert.match(resolved.label,/New venue/);
 assert.equal(resolved.startsAt.toISOString(),'2026-10-09T03:00:00.000Z');
 const {eventJsonLd}=await realEvents(true);
 const json=eventJsonLd({data:record},'https://peninsulainsider.com.au');
 assert.equal(json.location.name,'New venue');
 assert.equal(json.startDate,'2026-10-09T14:00:00+11:00');
});
test('feature rollback preserves declared occurrence booking withdrawal',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'sold-out'}];
 const record=proposedRecord(candidate),{ruleFor}=await realSchedule();
 const live={event:{data:record},rule:ruleFor({data:record},now),statusLabel:null};
 const active=await realOccurrenceState(true),rollback=await realOccurrenceState(false);
 assert.equal(active(live,'2026-10-09',now).bookable,false);
 assert.equal(rollback(live,'2026-10-09',now).bookable,false,'Rollback must retain declared sold-out withdrawal');
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
 const feedFor=new Function('isoDate','hasLegacyExceptions',actual.replace('export ','')+';return feedFor;')(schedule.isoDate,(await import('../../next/src/lib/intelligence-series.mjs')).hasLegacyExceptions);
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

test('actual homepage selects approved rescheduled sessions, omits unknown moved locations and refuses unchecked intelligence',async()=>{
 let source=stripTypeScriptTypes(await readFile(new URL('../../next/src/components/v5/home/home-data.ts',import.meta.url),'utf8'));
 source=source.replace(/import \{ USE_OCCURRENCE_MODEL \} from ['"]\.\.\/\.\.\/\.\.\/lib\/features['"];?/, 'const USE_OCCURRENCE_MODEL=false;');
 for(const name of ['event-schedule','daily-rotation']){const raw=stripTypeScriptTypes(await readFile(new URL(name+'.ts',libraryBase),'utf8'));source=source.replaceAll('../../../lib/'+name,'data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));}
 source=source.replace(/from ['"](\.\.\/\.\.\/\.\.\/lib\/[^'"]+)['"]/g,(_,specifier)=>"from '"+new URL(specifier,new URL('../../next/src/components/v5/home/',import.meta.url)).href+"'");
 const home=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',startTime:'14:00',endTime:'15:00'}];const record=explicitRecord(candidate);
 record.intelligence={revision:'synthetic-test-only',approvedBy:'James',approvedAt:'2026-10-04T00:00:00Z',reviewedAt:'2026-10-04T00:00:00Z',factScore:100,evidenceIds:['synthetic'],geography:{shireConfirmed:true,verifiedBy:'James',evidenceId:'synthetic-location',checkedAt:'2026-10-04T00:00:00Z'}};
 const {approvedEventContent}=await import('../../next/src/lib/event-publication.mjs');record.intelligence.approvedContent=approvedEventContent(record);
 const selected=home.selectWeekendPicks([],[{id:'synthetic',data:record}],now);assert.equal(selected.picks.length,1);assert.equal(selected.picks[0].event.data.venueName,'Original venue');assert.equal(selected.picks[0].event.data.startTime,'14:00');assert.equal(selected.picks[0].event.data.streetAddress,'Original address');assert.equal(home.pickDateISO(selected.picks[0].event,now),'2026-10-10');
 record.seriesOccurrences.find(session=>session.date==='2026-10-10').venueName='New venue';record.intelligence.approvedContent=approvedEventContent(record);assert.equal(home.selectWeekendPicks([],[{id:'synthetic',data:record}],now).picks.length,0);
 record.sourceUpdatedAt='2026-10-04T23:00:00Z';record.lastVerifiedAt='2026-10-04T00:00:00Z';assert.equal(home.selectWeekendPicks([],[{id:'synthetic',data:record}],now).picks.length,0);
});

test('resolving another session from a resolved card preserves original record facts',async()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',venueName:'New venue'}];const record=explicitRecord(candidate);const {occurrenceData,explicitOccurrence}=await import('../../next/src/lib/intelligence-series.mjs');
 const moved=occurrenceData(record,'2026-10-10'),later=occurrenceData(moved,'2026-10-16');assert.equal(later.venueName,'Original venue');assert.equal(later.streetAddress,'Original address');assert.equal(later.postponed,false);assert.equal(explicitOccurrence(moved,'2026-10-16',now).bookable,true);
});

// Synthetic engineering controls load the actual consumers; no public event is invented.
test('legacy calendar uses exception time and new venue without old address',async()=>{
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'moved',venueName:'New venue',startTime:'14:00',endTime:'15:00'}];
 const r=proposedRecord(c),{eventCalendarUrl}=await realEvents(true),url=new URL(eventCalendarUrl(r,'https://example.com/event'));
 assert.equal(url.searchParams.get('dates'),'20261009T030000Z/20261009T040000Z');assert.match(url.searchParams.get('location'),/New venue/);assert.ok(!url.searchParams.get('location').includes('Original address'));
});

async function actualFeed(live){
 const schedule=await realSchedule();
 const source=stripTypeScriptTypes(await readFile(new URL('../../next/src/pages/whats-on/_data.ts',import.meta.url),'utf8'));
 const fn=source.match(/export function feedFor\([\s\S]*?\n\}/)?.[0];assert.ok(fn);
 return JSON.parse(JSON.stringify(new Function('isoDate','hasLegacyExceptions',fn.replace('export ','')+';return feedFor;')(schedule.isoDate,(await import('../../next/src/lib/intelligence-series.mjs')).hasLegacyExceptions)([live])[0]));
}
function liveRecord(record,rule){return {event:{data:record},rule,slug:record.slug,href:'/whats-on/synthetic-series/',title:record.title,oneLiner:record.summary,meta:['Original venue'],appeal:50,free:false};}
for(const enabled of [true,false])test('legacy effective identity, detail and calendar agree with feature '+enabled,async()=>{
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',venueName:'New venue',startTime:'14:00',endTime:'15:00',sourceUrl:'https://example.com/change'}];
 const r=proposedRecord(c);r.coordinates={lat:-38,lng:145};r.place={id:'old-place'};r.venue={id:'old-venue'};
 const {eventJsonLd,eventCalendarUrl}=await realEvents(enabled),json=eventJsonLd({data:r},'https://peninsulainsider.com.au');
 assert.equal(json['@id'],'https://peninsulainsider.com.au/whats-on/synthetic-series/');assert.equal(json.previousStartDate,'2026-10-09T10:00:00+11:00');assert.equal(json.eventStatus,'https://schema.org/EventRescheduled');
 assert.equal(json.startDate,'2026-10-10T14:00:00+11:00');assert.equal(json.endDate,'2026-10-10T15:00:00+11:00');assert.equal(json.location.name,'New venue');assert.equal(json.location.address,undefined);assert.equal(json.location.geo,undefined);
 const cal=new URL(eventCalendarUrl(r,'https://example.com/event'));assert.equal(cal.searchParams.get('dates'),'20261010T030000Z/20261010T040000Z');assert.match(cal.searchParams.get('location'),/New venue/);assert.ok(!cal.searchParams.get('location').includes('Original address'));
 const {occurrenceData,nextSeriesData}=await import('../../next/src/lib/intelligence-series.mjs');const moved=occurrenceData(r,'2026-10-10',now),later=occurrenceData(moved,'2026-10-16',now);
 for(const key of ['streetAddress','suburb','coordinates','place','venue'])assert.equal(moved[key],undefined,key);
 assert.equal(nextSeriesData(moved,now),moved,'Already selected view must not select again');assert.equal(later.venueName,'Original venue');assert.equal(later.streetAddress,'Original address');assert.equal(later.startTime,'10:00');assert.equal(later.postponed,false);for(const key of ['streetAddress','suburb','coordinates','place','venue'])assert.deepEqual(later[key],r[key],key);assert.equal(r.venueName,'Original venue');
});
test('legacy server and compact browser rule/status preserve effective date and facts',async()=>{
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',venueName:'New venue',startTime:'14:00',endTime:'15:00'}];
 const r=proposedRecord(c),schedule=await realSchedule(),rule=schedule.ruleFor({data:r},now),live=liveRecord(r,rule),entry=await actualFeed(live);
 const browserRule={kind:entry.k,start:new Date(entry.s),end:new Date(entry.e),day:entry.wd,days:entry.wds,nth:entry.nth,months:entry.months,dates:entry.dates,reschedules:entry.reschedules};
 assert.equal(schedule.occursOnDay(browserRule,new Date('2026-10-09')),false);assert.equal(schedule.occursOnDay(browserRule,new Date('2026-10-10')),true);
 const {resolveListingOccurrence}=await import('../../next/src/lib/whatson-listing.mjs');const actual=resolveListingOccurrence(entry.statusData,browserRule,'2026-10-10',now);assert.equal(actual.data.venueName,'New venue');assert.equal(actual.data.startTime,'14:00');assert.equal(actual.startsAt.toISOString(),'2026-10-10T03:00:00.000Z');assert.equal(actual.bookable,true);assert.equal(actual.data.streetAddress,undefined);
 const source=stripTypeScriptTypes(await readFile(new URL('../../next/src/pages/whats-on/_data.ts',import.meta.url),'utf8'));const body=source.match(/export function groupByDay\([\s\S]*?\n\}/)?.[0];assert.ok(body);
 const series=await import('../../next/src/lib/intelligence-series.mjs'),listing=await import('../../next/src/lib/whatson-listing.mjs'),state=await realOccurrenceState(true);
 const dependencies={...schedule,...series,...listing,occurrenceStateFor:state,emptyDayMessage:()=>''};
 const group=new Function(...Object.keys(dependencies),body.replace('export ','')+';return groupByDay;')(...Object.values(dependencies));
 const groups=group([live],{start:new Date('2026-10-09'),end:new Date('2026-10-10')},now);assert.equal(groups[0].items.length,0);assert.equal(groups[1].items[0].live.event.data.venueName,'New venue');assert.deepEqual(groups[1].items[0].live.meta,['New venue','14:00']);
});
test('legacy monthly replacement preserves ordinal and later original session',async()=>{
 const c=fixture();c.series={id:'monthly',frequency:'monthly',validFrom:'2026-10-01',validUntil:'2027-02-01',weekday:5,ordinal:-1,exceptions:[{date:'2026-10-30',status:'rescheduled',rescheduledTo:'2026-10-31'}]};
 const r=proposedRecord(c),{ruleFor,occursOnDay}=await realSchedule(),rule=ruleFor({data:r},now);
 assert.equal(occursOnDay(rule,new Date('2026-10-30')),false);assert.equal(occursOnDay(rule,new Date('2026-10-31')),true);assert.equal(occursOnDay(rule,new Date('2026-11-27')),true);assert.equal(occursOnDay(rule,new Date('2027-02-26')),false);
});
for(const enabled of [true,false])test('legacy declared withdrawals stay closed with feature '+enabled,async()=>{
 const {ruleFor}=await realSchedule(),state=await realOccurrenceState(enabled);
 for(const status of ['sold-out','cancelled','postponed']){const c=fixture();c.series.exceptions=[{date:'2026-10-09',status}];const r=proposedRecord(c),actual=state(liveRecord(r,ruleFor({data:r},now)),'2026-10-09',now);assert.equal(actual.bookable,false,status);}
});
test('invalid or colliding legacy targets never invent a destination or restore booking',async()=>{
 const {ruleFor,occursOnDay}=await realSchedule();const {resolveListingOccurrence}=await import('../../next/src/lib/whatson-listing.mjs');const {eventCalendarUrl}=await realEvents(true);
 for(const exceptions of [
  [{date:'2026-10-09',status:'rescheduled'}],
  [{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-02-30'}],
  [{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-11-01'}],
  [{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-16'}],
  [{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10'},{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-11'}],
  [{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10'},{date:'2026-10-16',status:'rescheduled',rescheduledTo:'2026-10-10'}]
 ]){const r=proposedRecord(fixture());r.occurrenceExceptions=exceptions;const rule=ruleFor({data:r},now);assert.equal(rule.reschedules,undefined);assert.equal(occursOnDay(rule,new Date('2026-10-10')),false);const state=resolveListingOccurrence(r,rule,'2026-10-09',now);assert.equal(state.bookable,false);assert.equal(state.status,'postponed');assert.equal(eventCalendarUrl(r,'https://example.com/event'),'');}
 const r=proposedRecord(fixture());r.occurrenceExceptions=[{date:'2026-10-08',status:'rescheduled',rescheduledTo:'2026-10-10'}];const rule=ruleFor({data:r},now);assert.equal(rule.reschedules,undefined);assert.equal(occursOnDay(rule,new Date('2026-10-10')),false);
});
test('legacy missing end stays unknown and verification withdrawal stays closed',async()=>{
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'moved',venueName:'New venue',startTime:'14:00'}];const r=proposedRecord(c);delete r.endTime;
 const {eventJsonLd,eventCalendarUrl}=await realEvents(true);assert.equal(eventJsonLd({data:r},'https://example.com').endDate,undefined);assert.equal(eventCalendarUrl(r,'https://example.com/event'),'');
 r.sourceUpdatedAt='2026-10-05T01:00:00Z';r.lastVerifiedAt='2026-10-04T00:00:00Z';const {ruleFor}=await realSchedule(),state=await realOccurrenceState(false);assert.equal(state(liveRecord(r,ruleFor({data:r},now)),'2026-10-09',now).bookable,false);
});
test('unaffected multi-day range preserves its original full span despite later exception metadata',async()=>{
 const r={...proposedRecord(fixture()),recurrence:'one-off',startDate:new Date('2026-10-08'),endDate:new Date('2026-10-12'),occurrenceExceptions:[{date:'2026-10-20',status:'sold-out'}]};delete r.nextOccurrence;
 const {nextSeriesData}=await import('../../next/src/lib/intelligence-series.mjs');assert.equal(nextSeriesData(r,now),r);
 const {ruleFor}=await realSchedule();const {resolveListingOccurrence}=await import('../../next/src/lib/whatson-listing.mjs');const x=resolveListingOccurrence(r,ruleFor({data:r},now),'2026-10-09',now);assert.equal(x.startsAt.toISOString(),'2026-10-07T23:00:00.000Z');assert.equal(x.endsAt.toISOString(),'2026-10-12T00:00:00.000Z');
});

test('actual legacy eventInWindow honors the same effective date',async()=>{
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10'}];const r=proposedRecord(c),{eventInWindow}=await realEvents(true);
 assert.equal(eventInWindow({data:r},new Date('2026-10-09'),new Date('2026-10-09')),false);assert.equal(eventInWindow({data:r},new Date('2026-10-10'),new Date('2026-10-10')),true);
});
test('selected legacy exception clocks agree for Sydney and Melbourne at fixed spring/autumn instants',async()=>{
 const {occurrenceData}=await import('../../next/src/lib/intelligence-series.mjs');
 for(const [day,start,end,hours] of [['2026-10-04','2026-10-03T15:30:00.000Z','2026-10-03T16:30:00.000Z',1],['2026-04-05','2026-04-04T14:30:00.000Z','2026-04-04T17:30:00.000Z',3]]){
  const results=[];for(const timezone of ['Australia/Melbourne','Australia/Sydney']){
   const r={...proposedRecord(fixture()),timezone,recurrence:'weekly',recurrenceNote:'Every Sunday',startDate:new Date(day),endDate:new Date(day.slice(0,7)+'-28'),nextOccurrence:new Date(day),occurrenceExceptions:[{date:day,status:'as-scheduled',startTime:'01:30',endTime:'03:30'}]};
   const selected=occurrenceData(r,day,new Date(day+'T00:00:00Z')),x=resolveOccurrence(selected,day,new Date('2026-01-01T00:00:00Z'));results.push([x.startsAt.toISOString(),x.endsAt.toISOString()]);assert.deepEqual(results.at(-1),[start,end]);assert.equal((x.endsAt-x.startsAt)/3600000,hours);
  }assert.deepEqual(results[0],results[1]);
 }
});

test('actual upcoming feed selects legacy effective date time venue source and original identity',async()=>{
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',venueName:'New venue',startTime:'14:00',endTime:'15:00',sourceUrl:'https://example.com/change'}];
 const r=proposedRecord(c);r.place={id:'old-place'};r.venue={id:'old-venue'};
 const schedule=await realSchedule(),series=await import('../../next/src/lib/intelligence-series.mjs'),occ=await import('../../next/src/lib/event-occurrence.mjs'),pub=await import('../../next/src/lib/event-publication.mjs');
 const source=stripTypeScriptTypes(await readFile(new URL('../../next/src/pages/whats-on/upcoming.json.ts',import.meta.url),'utf8'));
 const body=source.slice(source.indexOf('  const upcoming = events'),source.indexOf('  const body = {'));assert.ok(body.includes('const upcoming = events'));
 const dependencies={...schedule,...series,...occ,eventContentKind:pub.eventContentKind,occurrenceStateFor:await realOccurrenceState(true),events:[liveRecord(r,schedule.ruleFor({data:r},now))],now,today:schedule.startOfDay(now),window:{start:new Date('2026-10-09'),end:new Date('2026-10-17')},weekend:schedule.weekendWindow(now),SITE:'https://peninsulainsider.com.au'};
 const result=new Function(...Object.keys(dependencies),body+';return upcoming;')(...Object.values(dependencies));assert.equal(result.length,1);const item=result[0];
 assert.equal(item.startDate,'2026-10-10');assert.equal(item.previousStartDate,'2026-10-09T10:00:00+11:00');assert.equal(item.startTime,'14:00');assert.equal(item.endTime,'15:00');assert.equal(item.venueName,'New venue');assert.equal(item.place,null);assert.equal(item.venue,null);assert.equal(item.sourceUrl,'https://example.com/change');assert.equal(item.id,'https://peninsulainsider.com.au/whats-on/synthetic-series/');assert.equal(item.eventStatus,'https://schema.org/EventRescheduled');assert.deepEqual(item.weekendOccurrences.map(x=>x.date),['2026-10-10']);
});

test('changed legacy start with no exception finish never inherits an overnight end',async()=>{
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'moved',venueName:'New venue',startTime:'14:00'}];const r=proposedRecord(c);assert.equal(r.endTime,'11:00');
 for(const enabled of [true,false]){const {eventJsonLd,eventCalendarUrl}=await realEvents(enabled);const json=eventJsonLd({data:r},'https://example.com');assert.equal(json.startDate,'2026-10-09T14:00:00+11:00');assert.equal(json.endDate,undefined);assert.equal(eventCalendarUrl(r,'https://example.com/event'),'');}
});
test('out-of-bounds and invalid legacy origins do not create target sessions',async()=>{
 const {ruleFor,occursOnDay}=await realSchedule();const {resolveListingOccurrence}=await import('../../next/src/lib/whatson-listing.mjs');
 for(const origin of ['2026-09-25','2026-11-06','2026-02-30']){const r=proposedRecord(fixture());r.occurrenceExceptions=[{date:origin,status:'rescheduled',rescheduledTo:'2026-10-10'}];const rule=ruleFor({data:r},now);assert.equal(rule.reschedules,undefined);assert.equal(occursOnDay(rule,new Date('2026-10-10')),false);assert.equal(resolveListingOccurrence(r,rule,'2026-10-10',now).bookable,false);}
});
test('legacy moved venue cannot reuse old geography promotion; later session restores it',async()=>{
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',venueName:'Unknown new venue'}];const r=proposedRecord(c);r.place={id:'mornington'};r.venue={id:'old-venue'};r.coordinates={lat:-38,lng:145};
 const {selectEventPromotions}=await import('../../next/src/lib/event-discovery.mjs');
 assert.equal(selectEventPromotions([{id:r.slug,data:r}],{now,windowStart:new Date('2026-10-10'),windowDays:1}).length,0);
 const later=selectEventPromotions([{id:r.slug,data:r}],{now,windowStart:new Date('2026-10-16'),windowDays:1});assert.equal(later.length,1);assert.equal(later[0].event.data.venueName,'Original venue');assert.deepEqual(later[0].event.data.coordinates,r.coordinates);assert.deepEqual(later[0].event.data.place,r.place);
});

async function actualBrowserFilters(selected) {
 const page=await readFile(new URL('../../next/src/pages/whats-on/index.astro',import.meta.url),'utf8');
 const script=page.slice(page.indexOf('<script>')+8,page.indexOf('</script>',page.indexOf('<script>')));
 const source=stripTypeScriptTypes(script);
 const body=source.slice(source.indexOf('const matchesFilters ='),source.indexOf('// ── feed island'));
 const {feedHasCurrentFreeEntry}=await import('../../next/src/lib/event-discovery.mjs');
 const {hasLegacyExceptions}=await import('../../next/src/lib/intelligence-series.mjs');
 return {source,matches:new Function('filters','feedHasCurrentFreeEntry','hasLegacyExceptions',body+';return matchesFilters;')(()=>selected,feedHasCurrentFreeEntry,hasLegacyExceptions)};
}
async function movedBrowserFixture() {
 const c=fixture();c.series.exceptions=[{date:'2026-10-09',status:'rescheduled',rescheduledTo:'2026-10-10',venueName:'New venue',startTime:'14:00',endTime:'15:00'}];
 const r=proposedRecord(c),schedule=await realSchedule(),entry=await actualFeed(liveRecord(r,schedule.ruleFor({data:r},now)));
 const {resolveListingOccurrence}=await import('../../next/src/lib/whatson-listing.mjs');
 const rule={kind:entry.k,start:new Date(entry.s),end:new Date(entry.e)};
 return {entry,moved:resolveListingOccurrence(entry.statusData,rule,'2026-10-10',now),later:resolveListingOccurrence(entry.statusData,rule,'2026-10-16',now)};
}
test('actual browser filters exclude old town and venue on moved day and restore later session',async()=>{
 const {entry,moved,later}=await movedBrowserFixture(),selected={town:'Mornington',q:'',category:'',free:false,kids:false};
 const {matches}=await actualBrowserFilters(selected);
 assert.equal(moved.data.suburb,undefined);assert.equal(later.data.suburb,'Mornington');
 assert.equal(matches(entry,moved),false,'moved day must not match original town');assert.equal(matches(entry,later),true);
 selected.town='';selected.q='original venue';assert.equal(matches(entry,moved),false);assert.equal(matches(entry,later),true);
 selected.q='new venue';assert.equal(matches(entry,moved),true);assert.equal(matches(entry,later),false);
 selected.q='14:00';assert.equal(matches(entry,moved),true);assert.equal(matches(entry,later),false);
 selected.q=entry.t.toLocaleLowerCase('en-AU');assert.equal(matches(entry,moved),true);assert.equal(matches(entry,later),true);
});
test('actual browser per-day render loop resolves before filtering',async()=>{
 const {source}=await actualBrowserFilters({});const loop=source.slice(source.indexOf('for (const e of entries) {'),source.indexOf('if (matches.length === 0'));
 assert.ok(loop.indexOf('const occurrence =')<loop.indexOf('matchesFilters('),'effective occurrence must be resolved first');
 assert.match(loop,/matchesFilters\(e, occurrence\)/);
});
test('actual browser effective metadata keeps category free family and unaffected filters',async()=>{
 const {entry,moved,later}=await movedBrowserFixture(),selected={town:'',q:'',category:'',free:false,kids:false};
 const {matches}=await actualBrowserFilters(selected);
 for(const occurrence of [moved,later]){
  selected.category='different';assert.equal(matches(entry,occurrence),false);selected.category=entry.c;assert.equal(matches(entry,occurrence),true);selected.category='';
  selected.kids=true;assert.equal(matches({...entry,g:false},occurrence),false);assert.equal(matches({...entry,g:true},occurrence),true);selected.kids=false;
  selected.free=true;assert.equal(matches({...entry,f:false},occurrence),false);
  const fp={label:'Free',sourceUrl:'https://example.com/source',checkedAt:new Date(Date.now()-60000).toISOString(),validUntil:new Date(Date.now()+86400000).toISOString()};
  assert.equal(matches({...entry,f:true,fp},occurrence),true);assert.equal(matches({...entry,f:true,fp:{...fp,validUntil:'2020-01-01'}},occurrence),false);selected.free=false;
 }
 selected.town=entry.p;selected.q='original venue';assert.equal(matches(entry,null),true,'unresolved ordinary metadata behavior retained');
});

for(const timezone of ['Australia/Sydney','Australia/Melbourne']) {
 for(const [day,startOffset,endOffset,dates,hours] of [
  ['2026-10-04','+10:00','+11:00','20261003T153000Z/20261003T163000Z',1],
  ['2026-04-05','+11:00','+10:00','20260404T143000Z/20260404T173000Z',3],
  ['2026-12-06','+11:00','+11:00','20261205T143000Z/20261205T163000Z',2]
 ])test(`actual rollback ordinary consumers ${timezone} ${day}`,async()=>{
  const r={title:'Ordinary event',slug:'ordinary-event',summary:'An ordinary session',venueName:'Original venue',timezone,startDate:new Date(day),endDate:new Date(day),startTime:'01:30',endTime:'03:30',recurrence:'one-off'};
  assert.equal(r.occurrenceExceptions,undefined);assert.equal(r.seriesOccurrences,undefined);
  const {eventJsonLd,eventCalendarUrl}=await realEvents(false),ld=eventJsonLd({data:r},'https://example.com');
  assert.deepEqual({start:ld.startDate,end:ld.endDate,dates:new URL(eventCalendarUrl(r,'https://example.com/event')).searchParams.get('dates')},{start:`${day}T01:30:00${startOffset}`,end:`${day}T03:30:00${endOffset}`,dates});
  assert.equal((Date.parse(ld.endDate)-Date.parse(ld.startDate))/3600000,hours);
  assert.equal(new URL(eventCalendarUrl(r,'https://example.com/event')).searchParams.get('dates'),dates);
 });
 test(`actual rollback ordinary date-only preservation ${timezone}`,async()=>{
  const r={title:'Ordinary date',slug:'ordinary-date',summary:'Date only',timezone,startDate:new Date('2026-10-03'),endDate:new Date('2026-10-04'),recurrence:'one-off'};
  const {eventJsonLd,eventCalendarUrl}=await realEvents(false),ld=eventJsonLd({data:r},'https://example.com');
  assert.equal(ld.startDate,'2026-10-03');assert.equal(ld.endDate,'2026-10-04');
  assert.equal(new URL(eventCalendarUrl(r,'https://example.com/event')).searchParams.get('dates'),'20261003/20261005');
 });
}
