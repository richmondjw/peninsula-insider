import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const fixedNow = '2026-10-10T00:00:00Z';
const occurrenceUrl = new URL('../src/lib/event-occurrence.mjs', import.meta.url).href;
async function loadRoute(seriesOnly=false) {
  let source = stripTypeScriptTypes(await readFile(new URL('../src/pages/whats-on/upcoming.json.ts', import.meta.url), 'utf8'));
  let stubs = `
    import {resolveOccurrence} from '${occurrenceUrl}';
    export const startOfDay = () => new Date('2026-10-10T00:00:00Z');
    export const addDays = (date,count) => new Date(date.getTime()+count*86400000);
    export const isoDate = date => date.toISOString().slice(0,10);
    export const weekendWindow = () => ({start:new Date('2026-10-10'),end:new Date('2026-10-11'),label:'Test weekend'});
    export const occursInWindow = (rule,window) => rule.end>=window.start && rule.start<=window.end;
    export const occursOnDay = (rule,date) => date>=rule.start && date<=rule.end;
    export const occurrenceStateFor = (live,date,now) => resolveOccurrence(live.event.data,date,now);
    export const loadLiveEvents = async () => ['event','experience','offer','legacy-flexible'].map(kind => ({
      href:'/whats-on/'+kind+'/',
      rule:{kind:'range',start:new Date('2026-10-10'),end:new Date('2026-10-12')},
      event:{data:{title:kind,summary:'Verified test fixture',slug:kind,status:'published',
        startDate:new Date('2026-10-10'),endDate:new Date('2026-10-12'),bookingStatus:'open',
        ...(kind==='legacy-flexible'?{dateBasis:'on-request'}:{contentKind:kind})}}
    }));`;
  if(seriesOnly) stubs=`
 import {resolveListingOccurrence} from '${new URL('../src/lib/whatson-listing.mjs',import.meta.url).href}';
 import {occurrenceSchemaStatus} from '${occurrenceUrl}';
 export const startOfDay=()=>new Date('2026-10-10');export const addDays=(d,n)=>new Date(d.getTime()+n*86400000);export const isoDate=d=>d.toISOString().slice(0,10);
 export const weekendWindow=()=>({start:new Date('2026-10-10'),end:new Date('2026-10-11'),label:'Test'});
 export const occursInWindow=()=>true;export const occursOnDay=(r,d)=>r.dates.includes(isoDate(d));
 export const occurrenceStateFor=(live,date,now)=>{const state=resolveListingOccurrence(live.event.data,live.rule,date,now);return {...state,schemaStatus:occurrenceSchemaStatus(state)};};
 export const loadLiveEvents=async()=>[{href:'/whats-on/synthetic-series/',rule:{kind:'explicit',start:new Date('2026-10-09'),end:new Date('2026-10-30'),dates:['2026-10-10']},event:{data:{title:'Synthetic series',summary:'Synthetic only',contentKind:'event',recurrence:'weekly',venueName:'Original venue',place:{id:'old-place'},venue:{id:'old-venue'},intelligence:{revision:'test-only'},seriesOccurrences:[{id:'fixture',originalDate:'2026-10-09',date:'2026-10-10',status:'rescheduled',venueName:'New venue',startTime:'14:00',endTime:'15:00',sourceUrl:'https://example.com/change'}]}}}];
 `;
 const stubUrl = `data:text/javascript;base64,${Buffer.from(stubs).toString('base64')}`;
  source = source.replace(/import \{\s*addDays,[\s\S]*?\} from ['"]\.\/_data['"];?/, `import {addDays,isoDate,loadLiveEvents,occurrenceStateFor,occursInWindow,occursOnDay,startOfDay,weekendWindow} from '${stubUrl}';`);
  source = source.replace(/from ['"]([^'"]+)['"]/g, (_, specifier) => {
    return `from '${specifier.startsWith('.') ? new URL('../src/pages/whats-on/'+specifier, import.meta.url).href : specifier}'`;
  });
  // Freeze only the route's build clock. Its real occurrence helper receives
  // the same fixed instant explicitly, and retains native timezone behavior.
  source = `const Date = class extends globalThis.Date { constructor(...args) { super(...(args.length ? args : ['${fixedNow}'])); } };\n` + source;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
test('actual upcoming route distinguishes occurrences, availability and offer validity', async () => {
  const { GET } = await loadRoute();
  const response = await GET();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.numberOfItems, 4);
  assert.equal(body.timezone, 'Australia/Melbourne');
  assert.equal(body.schemaVersion, '1.2');
  for (const event of body.events) {
    const expected = event.title === 'legacy-flexible' ? 'experience' : event.title;
    assert.equal(event.contentKind, expected);
    assert.equal(event.dateMeaning, {event:'occurrence',experience:'availability',offer:'validity'}[expected]);
    assert.equal(event.thisWeekend, true);
    if (expected === 'event') assert.equal(event.eventStatus, 'https://schema.org/EventScheduled');
    else {
      assert.equal('eventStatus' in event, false);
      for (const occurrence of event.weekendOccurrences) assert.equal('eventStatus' in occurrence, false);
    }
    const item = body.itemListElement.find(entry => entry.item.name === event.title).item;
    if (expected === 'event') assert.equal(item['@type'], 'Event');
    else {
      assert.notEqual(item['@type'], 'Event', 'Availability and validity are not Event occurrences');
      assert.equal('eventStatus' in item, false);
      assert.equal('startDate' in item, false);
      assert.equal('endDate' in item, false);
      if (expected === 'offer') {
        assert.equal(item['@type'], 'Offer');
        assert.equal(item.validFrom, event.startDate);
        assert.equal(item.validThrough, event.endDate);
      } else assert.equal(item['@type'], 'Service');
    }
  }
});

test('actual upcoming route carries rescheduled destination and moved session metadata',async()=>{
 const {GET}=await loadRoute(true);const body=await (await GET()).json();assert.equal(body.count,1);const entry=body.events[0];assert.equal(entry.startDate,'2026-10-10');assert.equal(entry.eventStatus,'https://schema.org/EventRescheduled');assert.equal(entry.venueName,'New venue');assert.equal(entry.startTime,'14:00');assert.equal(entry.endTime,'15:00');assert.equal(entry.place,null);assert.equal(entry.venue,null);assert.equal(entry.sourceUrl,'https://example.com/change');assert.deepEqual(entry.weekendOccurrences.map(o=>o.date),['2026-10-10']);assert.equal(body.itemListElement[0].item.startDate,'2026-10-10');
});
