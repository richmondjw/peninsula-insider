import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { selectEventPromotions, eventPromotionEntries, refreshEventPromotions, installEventPromotionRefresh } from './event-discovery.mjs';
import { approvedEventContent, publicEventData } from './event-publication.mjs';
const now = new Date('2026-10-09T22:00:00Z');
const options = {now};
test('running overnight session keeps its original occurrence after Melbourne midnight',()=>{
  const entry=fixture({startDate:new Date('2026-12-12'),endDate:new Date('2026-12-12'),startTime:'23:00',endTime:'02:00',endsNextDay:true});
  const clock=new Date('2026-12-12T13:30:00Z'); // 00:30 Sunday AEDT
  const [hit]=selectEventPromotions([entry],{now:clock,windowDays:1});
  assert.equal(hit.day,'2026-12-12');assert.equal(hit.occurrence.phase,'running');
  assert.equal(hit.occurrence.endsAt.toISOString(),'2026-12-12T15:00:00.000Z');
  assert.equal(selectEventPromotions([entry],{now:new Date('2026-12-12T15:00:01Z')}).length,0);
  assert.equal(selectEventPromotions([entry],{now:clock,windowStart:new Date('2026-12-14'),windowDays:1}).length,0);
  for(const patch of [{cancelled:true},{postponed:true},{bookingStatus:'sold-out'},{endTime:undefined,endsNextDay:undefined},{occurrenceExceptions:[{date:'2026-12-12',status:'cancelled'}]}]) {
    assert.equal(selectEventPromotions([{...entry,data:{...entry.data,...patch}}],{now:clock}).length,0,JSON.stringify(patch));
  }
});
test('overnight weekly occurrence survives local year rollover without inventing its next session',()=>{
  const entry=fixture({startDate:new Date('2026-12-31'),endDate:new Date('2026-12-31'),recurrence:'weekly',recurrenceNote:'Every Thursday',startTime:'23:00',endTime:'02:00',endsNextDay:true});
  const [hit]=selectEventPromotions([entry],{now:new Date('2026-12-31T13:30:00Z'),windowDays:1});
  assert.equal(hit.day,'2026-12-31');assert.equal(hit.occurrence.phase,'running');
});
test('multi-day running range retains current-day selection, not the new overnight probe day',()=>{
  const entry=fixture({startDate:new Date('2026-12-10'),endDate:new Date('2026-12-14')});
  assert.equal(selectEventPromotions([entry],{now:new Date('2026-12-12T13:30:00Z'),windowDays:1})[0].day,'2026-12-13');
});
test('confirmed-only and multi-day final overnight sessions remain only until their actual finish',()=>{
  const clock=new Date('2026-12-12T13:30:00Z');
  const records=[
    fixture({startDate:new Date('2026-05-09'),endDate:new Date('2026-05-09'),nextOccurrence:new Date('2026-12-12'),occurrencePolicy:'confirmed-only',recurrence:'monthly',startTime:'23:00',endTime:'02:00',endsNextDay:true}),
    fixture({startDate:new Date('2026-12-10'),endDate:new Date('2026-12-12'),startTime:'23:00',endTime:'02:00',endsNextDay:true})
  ];
  for(const entry of records){
    const [hit]=selectEventPromotions([entry],{now:clock,windowDays:1});
    assert.equal(hit.day,'2026-12-12');assert.equal(hit.occurrence.phase,'running');
    assert.equal(selectEventPromotions([entry],{now:new Date('2026-12-12T15:00:01Z'),windowDays:1}).length,0);
    for(const patch of [{cancelled:true},{postponed:true},{endTime:undefined,endsNextDay:undefined}])assert.equal(selectEventPromotions([{...entry,data:{...entry.data,...patch}}],{now:clock,windowDays:1}).length,0);
  }
});
function fixture(extra={}) {return {id:'synthetic-session',data:{slug:'synthetic-session',title:'Synthetic session',status:'published',venueName:'Synthetic venue',suburb:'Mornington',place:{id:'mornington'},venue:{id:'synthetic-venue'},startDate:new Date('2026-10-10'),endDate:new Date('2026-10-10'),startTime:'10:00',endTime:'17:00',summary:'Synthetic fixture only',...extra}};}
function approved(extra={}) {const e=fixture({...extra,intelligence:{revision:'fixture-revision',approvedBy:'James',approvedAt:'2026-10-09T10:00:00Z',reviewedAt:'2026-10-09T10:00:00Z',factScore:100,evidenceIds:['fixture-evidence'],geography:{shireConfirmed:true,verifiedBy:'James',evidenceId:'fixture-location',checkedAt:'2026-10-09T10:00:00Z'}}});e.data.intelligence.approvedContent=approvedEventContent(e.data);return e;}

test('eligible projection preserves editorial order, window, identity and explicit filters',()=>{const a=fixture(),b=fixture({slug:'second',title:'Second'});const result=selectEventPromotions([b,a],{...options,limit:1,placeId:'mornington',venueId:'synthetic-venue'});assert.equal(result[0].slug,'second');assert.equal(result[0].day,'2026-10-10');assert.equal(result[0].href,'/whats-on/second/');assert.equal(result[0].originalEvent,b);assert.deepEqual(selectEventPromotions([a],{...options,placeId:'rye'}),[]);assert.deepEqual(selectEventPromotions([a],{...options,venueId:'another'}),[]);assert.deepEqual(selectEventPromotions([a],{...options,windowStart:new Date('2026-10-12'),windowDays:2}),[]);});
test('all disqualifying public dispositions fail closed independent of feature flags',()=>{for(const extra of [{status:'review'},{status:'scheduled'},{status:'archived'},{cancelled:true},{skipThis:true},{bookingStatus:'sold-out'},{bookingStatus:'closed'},{postponed:true},{expiresAt:'2026-10-09'},{sourceUpdatedAt:'2026-10-09',lastVerifiedAt:'2026-10-08'},{startDate:new Date('2026-09-01'),endDate:new Date('2026-09-01')}])assert.deepEqual(selectEventPromotions([fixture(extra)],options),[],JSON.stringify(extra));});
test('title text cannot establish Shire scope; unknown, conflicts and border towns omitted',()=>{for(const extra of [{place:undefined,suburb:undefined,title:'Mornington session'},{place:'frankston',suburb:'Frankston'},{place:'mornington',suburb:'Seaford'},{place:'pearcedale',suburb:'Pearcedale'}])assert.deepEqual(selectEventPromotions([fixture(extra)],options),[]);});
test('import approvals require immutable approved content and fresh James geography proof',()=>{assert.equal(selectEventPromotions([approved()],options).length,1);for(const mutate of [e=>delete e.data.intelligence.approvedContent,e=>e.data.title='Changed after approval',e=>delete e.data.intelligence.geography,e=>e.data.intelligence.geography.verifiedBy='Collector',e=>e.data.intelligence.geography.checkedAt='2026-09-01',e=>e.data.intelligence.geography.checkedAt='2026-10-11',e=>e.data.intelligence.approvedBy='Collector']){const e=approved();mutate(e);assert.deepEqual(selectEventPromotions([e],options),[]);}});
test('serialized browser catalog and repeated effective projection retain original approval binding',()=>{const a=approved();const p=selectEventPromotions([a],options)[0];assert.equal(selectEventPromotions(JSON.parse(JSON.stringify([a])),options).length,1);assert.equal(selectEventPromotions([p.event],options).length,1);p.event.data.title='consumer tamper';assert.equal(selectEventPromotions([p.event],options)[0].event.data.title,a.data.title);assert.equal(eventPromotionEntries([a],options)[0].data._promotionDay,'2026-10-10');});
test('content kind labels preserve separate session/validity meanings',()=>{for(const kind of ['event','experience','offer']){const [p]=selectEventPromotions([fixture({contentKind:kind})],options);assert.equal(p.kind,kind);if(kind==='offer')assert.match(p.dateLabel,/Offer valid/);if(kind==='experience')assert.match(p.dateLabel,/Experience session/);}});
test('series projection selects actual rescheduled day and omits unknown moved destinations',()=>{const sessions=[{id:'fixture',originalDate:'2026-10-09',date:'2026-10-10',status:'rescheduled',startTime:'12:00',endTime:'17:00',venueName:'Synthetic venue',sourceUrl:'https://example.com/session'}];const e=approved({recurrence:'weekly',seriesOccurrences:sessions});const [p]=selectEventPromotions([e],options);assert.equal(p.day,'2026-10-10');assert.equal(p.event.data.startTime,'12:00');assert.equal(p.event.data.postponedFrom,'2026-10-09');e.data.seriesOccurrences[0].venueName='Other venue';e.data.intelligence.approvedContent=approvedEventContent(e.data);assert.deepEqual(selectEventPromotions([e],options),[]);});
test('all cancelled later sessions cannot be promoted using an old series start',()=>{const e=approved({recurrence:'weekly',seriesOccurrences:[{id:'fixture',originalDate:'2026-10-10',date:'2026-10-10',status:'cancelled',venueName:'Synthetic venue'}]});assert.deepEqual(selectEventPromotions([e],options),[]);});
test('invalid bounds and malformed clock/date fail without throwing',()=>{for(const o of [{now:'bad'},{...options,windowStart:'bad'},{...options,windowDays:0},{...options,windowDays:400},{...options,limit:0}])assert.deepEqual(selectEventPromotions([fixture()],o),[]);assert.deepEqual(selectEventPromotions([fixture({startDate:'bad'})],options),[]);});
test('browser recheck removes ended promotions and empty sections rather than silently changing their dates',()=>{let removed=false,section={hidden:false,querySelectorAll:q=>q==='[data-event-promotion]'&&!removed?[{}]:[]};const e=fixture();const node={getAttribute:k=>k==='data-event-promotion'?JSON.stringify(e):'2026-10-10',remove:()=>{removed=true;}};const root={querySelectorAll:q=>q==='[data-event-promotion]'?[node]:[section]};refreshEventPromotions(root,now);assert.equal(removed,false);refreshEventPromotions(root,new Date('2026-10-11T10:00:00Z'));assert.equal(removed,true);assert.equal(section.hidden,true);});
test('browser recheck hides the swipe hint when a lunchtime pick ends but retains a later pick',()=>{const hint={hidden:false},nodes=[];for(const [slug,endTime] of [['lunch','13:00'],['afternoon','17:00']]){const event=fixture({slug,endTime});const node={getAttribute:k=>k==='data-event-promotion'?JSON.stringify(event):'2026-10-10',remove:()=>{nodes.splice(nodes.indexOf(node),1);}};nodes.push(node);}const section={hidden:false,querySelectorAll:q=>q==='[data-event-promotion]'?nodes:q==='[data-event-promotion-multi-hint]'?[hint]:[]};const root={querySelectorAll:q=>q==='[data-event-promotion]'?[...nodes]:[section]};refreshEventPromotions(root,new Date('2026-10-10T01:59:00Z'));assert.equal(nodes.length,2);assert.equal(hint.hidden,false);refreshEventPromotions(root,new Date('2026-10-10T02:01:00Z'));assert.equal(nodes.length,1);assert.equal(hint.hidden,true);assert.equal(section.hidden,false);});

// Execute the actual homepage selection code with its real pure dependencies;
// only the feature switch is replaced to prove safety even when it is off.
let home = stripTypeScriptTypes(readFileSync(new URL('../components/v5/home/home-data.ts',import.meta.url),'utf8'));
home=home.replace(/import \{ USE_OCCURRENCE_MODEL \} from '[^']+';/,"const USE_OCCURRENCE_MODEL=false;");
home=home.replace(/from '([^']+)'/g,(_,path)=>`from '${new URL(path+(path.endsWith('.mjs')?'':'.ts'),new URL('../components/v5/home/home-data.ts',import.meta.url)).href}'`);
const {selectWeekendPicks,pickDateISO,weekendPickOccurrences}=await import('data:text/javascript;base64,'+Buffer.from(home).toString('base64'));
test('actual homepage selector honours editorial order only among eligible approved weekend sessions',()=>{const a=fixture(),b=fixture({slug:'second'}),cancel=fixture({slug:'cancelled',cancelled:true});const picks=[{data:{weekendStart:new Date('2026-10-10'),picks:[{eventSlug:'cancelled',position:0},{eventSlug:'second',position:1,editorVerdict:'Fixture verdict'},{eventSlug:a.id,position:2}]}}];const result=selectWeekendPicks(picks,[a,b,cancel],now);assert.deepEqual(result.picks.map(p=>p.event.data.slug),['second','synthetic-session']);assert.equal(pickDateISO(result.picks[0].event,now),'2026-10-10');});
test('actual homepage refuses post-approval public content drift even with occurrence flag off',()=>{const e=approved();e.data.summary='Changed without approval';assert.equal(selectWeekendPicks([], [e],now).picks.length,0);});


test('public browser payload excludes unknown internal fields and still validates approval',()=>{const e=approved();e.data.internalNotes='PRIVATE';e.data.provenance={secret:'PRIVATE'};e.data.cmsDraft='PRIVATE';const entry={id:e.id,data:publicEventData(e.data)};assert.doesNotMatch(JSON.stringify(entry),/PRIVATE|internalNotes|cmsDraft/);assert.equal(selectEventPromotions([entry],options).length,1);});
test('freshness installer has one timer/listener set across duplicate components and navigation',()=>{const documentListeners=new Map(),windowListeners=new Map();let active=0;const document={querySelectorAll:()=>[],addEventListener:(k,f)=>documentListeners.set(k,f),removeEventListener:k=>documentListeners.delete(k)};const window={addEventListener:(k,f)=>windowListeners.set(k,f),removeEventListener:k=>windowListeners.delete(k),setInterval:()=>{active++;return 1;},clearInterval:()=>active--};const first=installEventPromotionRefresh(window,document);assert.equal(installEventPromotionRefresh(window,document),first);assert.equal(active,1);assert.equal(documentListeners.size,2);documentListeners.get('astro:before-swap')();assert.equal(active,0);documentListeners.get('astro:page-load')();assert.equal(active,1);first.dispose();assert.equal(active,0);assert.equal(documentListeners.size,0);assert.equal(windowListeners.size,0);});
test('actual EventStrip frontmatter filters raw props before its cap and label projection',()=>{let source=readFileSync(new URL('../components/EventStrip.astro',import.meta.url),'utf8').split('---')[1];source=stripTypeScriptTypes(source).replace(/^import[^;]*;s*/gm,'');const visible=new Function('Astro','selectEventPromotions',source+'; return visible;')({props:{events:[fixture({cancelled:true}),fixture({contentKind:'offer'})],now,limit:1}},selectEventPromotions);assert.equal(visible.length,1);assert.equal(visible[0].kind,'offer');assert.match(visible[0].dateLabel,/Offer valid/);});
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
for(const type of ['eat','wine','stay'])test('actual '+type+' venue selector rejects wrong venue and unpublished events',async()=>{const text=readFileSync(new URL('../pages/'+type+'/[slug].astro',import.meta.url),'utf8');const expression=text.match(/const venueEvents = ([^]*?);/)[1];const result=await new AsyncFunction('getCollection','eventPromotionEntries','slug', 'return '+expression.replace('new Date()','new Date("2026-10-09T22:00:00Z")'))(async()=>[fixture({slug:'wrong',venue:'other'}),fixture({slug:'draft',status:'review'}),fixture()],eventPromotionEntries,'synthetic-venue');assert.deepEqual(result.map(e=>e.data.slug),['synthetic-session']);});
test('actual place selector omits unknown/out-of-place records and uses bounded current sessions',()=>{const text=readFileSync(new URL('../pages/explore/places/[slug].astro',import.meta.url),'utf8');const expression=text.match(/const eventsForMap = ([^]*?);/)[1];const result=new Function('eventPromotionEntries','allEvents','placeSlug','return '+expression.replace('new Date()','new Date("2026-10-09T22:00:00Z")'))(eventPromotionEntries,[fixture({slug:'wrong',place:'rye',suburb:'Rye'}),fixture({slug:'expired',expiresAt:'2026-10-01'}),fixture()],'mornington');assert.deepEqual(result.map(e=>e.data.slug),['synthetic-session']);});
test('actual Journal contextual selector uses explicit references, never title substring',async()=>{const text=readFileSync(new URL('../pages/journal/[slug].astro',import.meta.url),'utf8');let fragment=text.slice(text.indexOf('const contextPlaceIds'),text.indexOf('const allItineraries'));fragment=stripTypeScriptTypes(fragment).replace('new Date()','new Date("2026-10-09T22:00:00Z")');const run=new AsyncFunction('article','getCollection','selectEventPromotions',fragment+'return relatedEvents;');const collection=async()=>[fixture()];assert.equal((await run({data:{title:'Mornington',relatedPlaces:[],relatedVenues:[]}},collection,selectEventPromotions)).length,0);assert.equal((await run({data:{relatedPlaces:[{id:'mornington'}]}},collection,selectEventPromotions)).length,1);});

test('an emptied homepage retains a truthful dated fallback instead of fabricated picks',()=>{
 const empty={hidden:true},content={hidden:false},section={hidden:false,querySelectorAll:q=>q==='[data-event-promotion-empty]'?[empty]:q==='[data-event-promotion-content]'?[content]:[]};
 const root={querySelectorAll:q=>q==='[data-event-promotions-section]'?[section]:[]};refreshEventPromotions(root,now);assert.equal(section.hidden,false);assert.equal(empty.hidden,false);assert.equal(content.hidden,true);
});


// Homepage-specific selection is re-evaluated after the shared fail-closed gate.
const { homeWeekendWindow, distinctWeekendCards, weekendImageIdentity } = await import('./home-weekend.mjs');
function homeDOM(entries, edition = '2026-10-10') {
  const nodes = entries.map(([event, image, day = '2026-10-10']) => ({
    hidden: false,
    getAttribute: key => ({'data-event-promotion': JSON.stringify(event), 'data-event-promotion-day': day, 'data-weekend-slug':event.data.slug, 'data-weekend-image':image})[key],
    remove() { nodes.splice(nodes.indexOf(this), 1); },
  }));
  const discoveries = Array.from({length:3}, () => ({hidden:true}));
  const empty = {hidden:true}, sparse = {hidden:true}, content = {hidden:false}, heading = {textContent:'This weekend'};
  const section = {
    hidden:false, hasAttribute: key => key === 'data-home-weekend', getAttribute: () => edition,
    querySelectorAll: key => ({'[data-event-promotion]':nodes, '[data-weekend-discovery]':discoveries, '[data-event-promotion-empty]':[empty], '[data-weekend-sparse]':[sparse], '[data-event-promotion-content]':[content], '[data-weekend-heading]':[heading]})[key] ?? [],
  };
  return { nodes, discoveries, empty, sparse, content, heading, section, querySelectorAll:key => key === '[data-event-promotion]' ? [...nodes] : [section] };
}

test('Melbourne weekend rolls on Monday midnight including DST and year boundaries', () => {
  for (const [stamp, expected] of [
    ['2026-11-15T12:59:59Z','2026-11-14'], ['2026-11-15T13:00:00Z','2026-11-21'],
    ['2026-10-03T15:59:59Z','2026-10-03'], ['2026-10-03T16:00:00Z','2026-10-03'],
    ['2026-04-04T15:59:59Z','2026-04-04'], ['2026-04-04T16:00:00Z','2026-04-04'],
    ['2026-12-31T13:00:00Z','2027-01-02'],
  ]) assert.equal(homeWeekendWindow(new Date(stamp)).satISO, expected);
});

test('image identity ignores cache versions, fragments and responsive sizes', () => {
  const card = (slug, src) => ({slug,image:{src}});
  assert.deepEqual(distinctWeekendCards([
    card('one','/images/pool.webp?v=1'), card('two','https://peninsulainsider.com.au/images/pool.webp?v=2#crop'),
    card('three','/images/amp.webp'), card('four','/images/venue.webp'),
  ]).map(c => c.slug), ['one','three','four']);
  assert.equal(weekendImageIdentity('/_media/abc-480.webp'), weekendImageIdentity('/_media/abc-1280.avif'));
});

test('homepage fills three distinct images from reserves after an occurrence ends', () => {
  const dom = homeDOM([
    [fixture({slug:'lunch',endTime:'13:00'}),'/images/lunch.webp'],
    [fixture({slug:'pool-one'}),'/images/pool.webp?v=1'],
    [fixture({slug:'pool-two'}),'/images/pool.webp?v=2'],
    [fixture({slug:'amp'}),'/images/amp.webp'],
    [fixture({slug:'venue'}),'/images/venue.webp'],
  ]);
  refreshEventPromotions(dom,new Date('2026-10-10T01:59:00Z'));
  assert.deepEqual(dom.nodes.filter(n=>!n.hidden).map(n=>n.getAttribute('data-weekend-slug')),['lunch','pool-one','amp']);
  refreshEventPromotions(dom,new Date('2026-10-10T02:01:00Z'));
  assert.deepEqual(dom.nodes.filter(n=>!n.hidden).map(n=>n.getAttribute('data-weekend-slug')),['pool-one','amp','venue']);
  assert.equal(dom.discoveries.filter(n=>!n.hidden).length,0);
});

test('zero, one and two eligible cards get labelled discovery slots, never fabricated events', () => {
  for (let count=0;count<3;count++) {
    const dom = homeDOM(Array.from({length:count},(_,i)=>[fixture({slug:'event-'+i}),'/images/'+i+'.webp']));
    refreshEventPromotions(dom,now);
    assert.equal(dom.nodes.filter(n=>!n.hidden).length,count);
    assert.equal(dom.discoveries.filter(n=>!n.hidden).length,3-count);
    assert.equal(dom.sparse.hidden,false);
    assert.equal(dom.empty.hidden,count>0);
    assert.equal(dom.content.hidden,false);
  }
});

test('old edition cannot relabel a continuing event as next weekend at Melbourne Monday rollover', () => {
  const dom = homeDOM([[fixture({endDate:new Date('2026-10-13')}),'/images/pool.webp']]);
  refreshEventPromotions(dom,new Date('2026-10-11T13:00:00Z'));
  assert.equal(dom.nodes.filter(n=>!n.hidden).length,0);
  assert.equal(dom.discoveries.filter(n=>!n.hidden).length,3);
  assert.equal(dom.heading.textContent,'Weekend picks');
});

test('reserve selection retains more than nine candidates without admitting next-weekend or draft events', () => {
  const entries=Array.from({length:12},(_,i)=>fixture({slug:'eligible-'+i}));
  const result=selectWeekendPicks([], [...entries, fixture({slug:'draft',status:'review'}), fixture({slug:'later',startDate:new Date('2026-10-17'),endDate:new Date('2026-10-17')})], now, Infinity);
  assert.equal(result.picks.length,12);
  assert.ok(result.picks.every(p=>p.event.data.slug.startsWith('eligible-')));
});


test('Saturday to Sunday keeps a continuing approved event with its Sunday date and no duplicate slot', () => {
  const event=fixture({endDate:new Date('2026-10-11')});
  const picks=weekendPickOccurrences(selectWeekendPicks([], [event], now, Infinity).picks, now);
  assert.deepEqual(picks.map(p=>p.event.data._promotionDay),['2026-10-10','2026-10-11']);
  const dom=homeDOM(picks.map(p=>[p.event.data._promotionOriginal,'/images/pool.webp',p.event.data._promotionDay]));
  refreshEventPromotions(dom,now);
  assert.equal(dom.nodes.filter(n=>!n.hidden).length,1);
  assert.equal(dom.nodes.find(n=>!n.hidden).getAttribute('data-event-promotion-day'),'2026-10-10');
  refreshEventPromotions(dom,new Date('2026-10-10T23:00:00Z'));
  assert.equal(dom.nodes.filter(n=>!n.hidden).length,1);
  assert.equal(dom.nodes.find(n=>!n.hidden).getAttribute('data-event-promotion-day'),'2026-10-11');
});
