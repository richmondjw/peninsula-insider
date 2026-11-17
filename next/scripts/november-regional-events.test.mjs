import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ruleFor,occursOnDay} from '../src/lib/event-schedule.ts';
import {explicitOccurrence,occurrenceData} from '../src/lib/intelligence-series.mjs';
import {hasPromotionGeography,selectEventPromotions} from '../src/lib/event-discovery.mjs';
import {isPublicEventRecord,approvedEventContent} from '../src/lib/event-publication.mjs';
const now=new Date('2026-11-17T01:00:00Z');
const specs=[['garden-designfest-mornington-peninsula-2026',[21,22]],['peninsula-studio-trail-open-studios-2026',[21,22,28,29]]];
for(const [slug,days] of specs){
 const raw=JSON.parse(await readFile(new URL('../src/content/events/'+slug+'.json',import.meta.url),'utf8'));
 const data={...raw,startDate:new Date(raw.startDate),endDate:new Date(raw.endDate)};
 test(slug+': all actual programme days, no inferred intervening days',()=>{const rule=ruleFor({data},now);assert.equal(rule.kind,'explicit');for(let d=18;d<=30;d++)assert.equal(occursOnDay(rule,new Date('2026-11-'+d)),days.includes(d));});
 test(slug+': daily calendar instants use AEDT and close that same day',()=>{for(const d of days){const o=explicitOccurrence(data,'2026-11-'+d,now);assert.equal(o.startsAt.toISOString(),'2026-11-'+(d-1)+'T23:00:00.000Z');assert.equal(o.endsAt.toISOString(),'2026-11-'+d+'T06:00:00.000Z');}});
 test(slug+': draft stays private, regional discovery blocker remains explicit',()=>{assert.equal(raw.status,'draft');assert.equal(isPublicEventRecord(data,now),false);assert.equal(hasPromotionGeography(data,now),false);assert.deepEqual(selectEventPromotions([{id:slug,data}],{now}),[]);assert.deepEqual(selectEventPromotions([{id:slug,data:{...data,status:'published'}}],{now}),[]);});
 test(slug+': no invented venue, inventory, price or approval',()=>{for(const key of ['suburb','place','venue','streetAddress','coordinates','verifiedPrice','intelligence','publishedAt'])assert.equal(raw[key],undefined,key);assert.equal(raw.bookingStatus,'unknown');assert.equal(raw.verification,'tentative');assert.match(raw.verificationNote,/Single organiser provenance chain/);assert.equal(raw.heroImage.depictionStatus,'illustrative');assert.equal(raw.heroImage.rightsStatus,'recorded');});
 test(slug+': source and exact schedule are bound by future review content',()=>{assert.notEqual(approvedEventContent(data),approvedEventContent({...data,seriesOccurrences:data.seriesOccurrences.slice(1)}));for(const session of raw.seriesOccurrences)assert.equal(session.sourceUrl,raw.primarySourceUrl);});
 test(slug+': cancelled session is not eligible for discovery',()=>{const series=data.seriesOccurrences.map(s=>({...s,status:'cancelled'}));const cancelled={...data,status:'published',suburb:'Mornington',seriesOccurrences:series};assert.deepEqual(selectEventPromotions([{id:slug,data:cancelled}],{now}),[]);assert.equal(occurrenceData(data,'2026-11-25'),null);});
}
