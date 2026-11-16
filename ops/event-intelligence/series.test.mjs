import test from 'node:test';import assert from 'node:assert/strict';import {materializeSeries,seriesContract} from './series.mjs';
const fixture=()=>({fields:{title:'Art session',startTime:'10:00',venueName:'Gallery',officialEventUrl:'https://example.com/art'},series:{id:'art-weekly',frequency:'weekly',validFrom:'2026-10-02',validUntil:'2026-10-18',daysOfWeek:[0],exceptions:[]}});
test('bounded weekly series creates stable individual occurrence identities without pages or approval',()=>{const candidate=fixture(),report=materializeSeries(candidate);assert.deepEqual(report.occurrences.map(o=>o.date),['2026-10-04','2026-10-11','2026-10-18']);assert.equal(report.publicationApproved,false);assert.equal(new Set(report.occurrences.map(o=>o.id)).size,3);assert.equal(report.contract.recurrenceNote,'Every Sunday');});
test('cancellation and rescheduling are occurrence facts and retain original identity',()=>{const candidate=fixture(),before=materializeSeries(candidate);candidate.series.exceptions=[{date:'2026-10-04',status:'cancelled'},{date:'2026-10-11',status:'rescheduled',rescheduledTo:'2026-10-12',venueName:'Other gallery',sourceUrl:'https://example.com/update'}];const after=materializeSeries(candidate);assert.equal(after.occurrences[0].status,'cancelled');assert.equal(after.occurrences[1].date,'2026-10-12');assert.equal(after.occurrences[1].id,before.occurrences[1].id);assert.equal(after.occurrences[1].venueName,'Other gallery');assert.equal(after.occurrences[2].status,'scheduled');});
test('monthly last-weekday cadence crosses year boundary without duplicate dates',()=>{const candidate=fixture();candidate.series={id:'monthly',frequency:'monthly',validFrom:'2026-11-01',validUntil:'2027-02-01',weekday:0,ordinal:-1,exceptions:[]};assert.deepEqual(materializeSeries(candidate).occurrences.map(o=>o.date),['2026-11-29','2026-12-27','2027-01-31']);});
test('invalid dates, unsupported cadences, non-occurrence exceptions and capacity never pass',()=>{const candidate=fixture();assert.throws(()=>materializeSeries(candidate,{maxOccurrences:1}),/truncation/);candidate.series.exceptions=[{date:'2026-10-05',status:'cancelled'}];assert.throws(()=>materializeSeries(candidate),/does not match/);candidate.series.validUntil='2027-02-30';assert.throws(()=>seriesContract(candidate.series),/Invalid/);candidate.series.frequency='annual';assert.throws(()=>seriesContract(candidate.series),/adapter review/);});
test('reschedules beyond reviewed bounds and same-day collisions refuse publication materialisation',()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-11',status:'rescheduled',rescheduledTo:'2026-10-19'}];
 assert.throws(()=>materializeSeries(candidate),/approved series bounds/);
 candidate.series.exceptions=[{date:'2026-10-11',status:'rescheduled',rescheduledTo:'2026-10-18'}];
 assert.throws(()=>materializeSeries(candidate),/multi-session website adapter/);
});

test('empty approved bounds and malformed base or exception clocks refuse materialisation',()=>{
 const candidate=fixture();candidate.series.validUntil='2026-10-03';assert.throws(()=>materializeSeries(candidate),/no scheduled/);
 candidate.series.validUntil='2026-10-18';candidate.fields.startTime='25:00';assert.throws(()=>materializeSeries(candidate),/series clock/);
 candidate.fields.startTime='10:00';candidate.series.exceptions=[{date:'2026-10-04',status:'moved',startTime:'14:99'}];assert.throws(()=>materializeSeries(candidate),/exception clock/);
});

test('series never guesses an instant for a daylight-saving gap or repeated hour',()=>{
 const candidate=fixture();candidate.fields.startTime='02:30';assert.throws(()=>materializeSeries(candidate),/daylight-saving/);
 candidate.series.validFrom='2027-04-03';candidate.series.validUntil='2027-04-05';assert.throws(()=>materializeSeries(candidate),/daylight-saving/);
});

test('unsupported exception facts and unsafe source URLs require adapter review',()=>{
 const candidate=fixture();candidate.series.exceptions=[{date:'2026-10-04',status:'moved',venueName:'Gallery',streetAddress:'Changed address'}];assert.throws(()=>materializeSeries(candidate),/Unsupported exception field/);
 candidate.series.exceptions=[{date:'2026-10-04',status:'moved',venueName:'Gallery',sourceUrl:'javascript:alert(1)'}];assert.throws(()=>materializeSeries(candidate),/URL|HTTPS|Unsafe/i);
});
