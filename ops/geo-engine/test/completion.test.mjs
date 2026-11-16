import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessCoverage} from '../lib/benchmark.mjs';
import {findGaps} from '../lib/gaps.mjs';
import {adjudicate} from '../lib/links.mjs';
import {searchTrends,attachEngagement,researchQueue} from '../lib/intelligence.mjs';
import {validateObservation,importObservations,visibilitySummary} from '../lib/visibility.mjs';
import {renderReport,computeHealth} from '../lib/report.mjs';
import {entityIntelligence} from '../lib/intelligence.mjs';

test('entity checks flag missing evidence without inventing venue freshness or deleting events',()=>{
  const out=entityIntelligence({events:[{slug:'old',startDate:'2020-01-01'}],venues:[{slug:'v',name:'V'}]}, {edges:[]},'2026-09-21');
  assert.equal(out.events[0].timing,'past');assert.match(out.events[0].action,/never delete/);
  assert.equal(out.venues[0].freshness,'unverified');
});

test('event expiry follows Melbourne calendar at the 05:30 cron, not the previous UTC day',()=>{
  const out=entityIntelligence({events:[{slug:'yesterday',startDate:'2026-09-21',endDate:'2026-09-21'},
    {slug:'unknown',startDate:'TBC'}],venues:[]},{edges:[]},'2026-09-21T19:30:00Z');
  assert.equal(out.events[0].timing,'past');assert.equal(out.events[1].timing,'unknown');
});

test('source change report renders nested JEV verdict and pending release honestly',()=>{
  const run={runId:'x',health:{label:'fair',score:80},inventory:{total:1,newOrChanged:1},priorities:{},target:{label:'source'},
    changes:{applied:[{urlPath:'/a/',action:'rewrite_title',verdict:{confidence:.93,provider:'jev'}}],releaseStatus:'pending_validation'},
    search:{available:false},geo:{citationTiers:{},aiVisibility:{state:'not_yet_measurable',reason:'none'}},
    topOpportunities:[],contentOpportunities:[],needsJames:[],system:{usage:{},errors:[]}};
  const text=renderReport(run);assert.match(text,/Confidence: 0.93 \(jev\)/);
  assert.match(text,/Validation: pending_validation/);assert.doesNotMatch(text,/Reason: undefined|Confidence: undefined|Validation: undefined/);
});

test('quiet reports retain unavailable systems and uncertain scores never claim perfect health',()=>{
  const report=renderReport({noMaterialAction:true,discovery:{error:'Provider unavailable'},
    engagement:{available:true,attached:35},system:{usage:{providerFailures:[{}],budgetExhausted:true},errors:[]}});
  assert.match(report,/Discovery unavailable/);assert.match(report,/35 pages joined/);
  assert.match(report,/Decision provider failures: 1/);assert.match(report,/allowance exhausted/);
  assert.equal(computeHealth([{severity:'noise',confidence:.13}],100).score,null);
});

test('search results are not AI citations and valid observation imports are idempotent',()=>{
  const b={questions:[{id:'q',query:'A question',observations:[]}]};
  const raw={questionId:'q',query:'A question',surface:'test fixture only',kind:'search_results',answer:'See Peninsula Insider.',
    receipt:'fixture:1',observedAt:new Date().toISOString(),citations:[{url:'https://peninsulainsider.com.au/a/',context:'Peninsula Insider'}]};
  assert.throws(()=>validateObservation(raw,b),/Actual answer/);
  raw.kind='ai_answer';const first=importObservations(b,[raw]);const second=importObservations(first,[raw]);
  assert.equal(second.questions[0].observations.length,1);assert.equal(visibilitySummary(second).piCitationShare,1);
  assert.equal(visibilitySummary(b).piCitationShare,null);
  assert.throws(()=>validateObservation({...raw,citations:[{url:'https://x.com',context:'invented'}]},b),/exact answer context/);
});

test('incremental benchmark retains every question and observation and rotates selection',async()=>{
  const b={total:3,questions:[{id:'a',query:'a',observations:[{citation:'x'}],measurement:'observed'},
    {id:'b',query:'b'},{id:'c',query:'c'}]};
  const service={decideBatch:async(n,inputs)=>inputs.map(()=>({value:{fit:'none',score:0},confidence:1,provider:'jev',decidedAt:new Date().toISOString()}))};
  const first=await assessCoverage(b,{},service,{limit:1});
  assert.equal(first.questions.length,3);assert.deepEqual(first.questions[0].observations,b.questions[0].observations);
  assert.equal(first.questions[0].measurement,'observed');
  const next=await assessCoverage(first,{},service,{limit:1});
  assert.ok(next.questions[1].coverage);assert.equal(next.total,3);
});
test('GSC poor fit opportunities reach gap scoring and low confidence cannot commission',async()=>{
  const service={decideBatch:async(n,x)=>x.map(()=>({value:{verdict:'create',score:1},confidence:.39,provider:'jev'}))};
  const gaps=await findGaps({benchmark:{questions:[]},graph:{nodes:{},edges:[]},pages:{},service,
    searchDemand:{opportunities:{queriesWithoutGoodPage:[{query:'local test',impressions:100,fit:0}]}}});
  assert.equal(gaps.summary.proposed,1);assert.equal(gaps.candidates[0].verdict,'watch');
});
test('link evidence reaches JEV and weak recommendations are rejected',async()=>{
  let received;
  const service={decideBatch:async(n,x)=>{received=x;return [{value:{legitimate:true},provider:'jev',confidence:.13}];}};
  const result=await adjudicate([{sourcePassage:'real source',targetPassage:'real target'}],service);
  assert.equal(received[0].sourcePassage,'real source');assert.equal(result.accepted.length,0);
});
test('search movement and multiple landing pages retain evidence caveats',()=>{
  const doc={gsc:{status:'observed',current:{page_queries:{rows:[{keys:['/a','wine'],impressions:40},{keys:['/b','wine'],impressions:30}]}},previous:{page_queries:{rows:[{keys:['/a','wine'],impressions:20}]}}}};
  const trends=searchTrends(doc);assert.equal(trends.rising[0].impressionDelta,50);
  assert.equal(trends.possibleCannibalisation.length,1);assert.match(trends.possibleCannibalisation[0].caveat,/not proof/);
});
test('GA4 joins query variants without adding non-additive users',()=>{
  const pages={'/a/':{}};
  const result=attachEngagement(pages,{ga4:{status:'observed',current:{organic_pages:{rows:[
    {dimension_values:[{value:'/a?x=1'}],metric_values:[{value:'3'},{value:'2'},{value:'2'}]},
    {dimension_values:[{value:'/a?x=2'}],metric_values:[{value:'2'},{value:'1'},{value:'2'}]}
  ]}}},ranges:{current:{}}});
  assert.equal(result.attached,1);assert.equal(pages['/a/'].analytics.organicSessions,5);
  assert.equal(pages['/a/'].analytics.engagementRate,.6);assert.equal(pages['/a/'].analytics.totalUsers,undefined);
});
test('research queue preserves handoff and rejection rather than recommissioning',()=>{
  const gaps={candidates:[{label:'Question',verdict:'create',provider:'jev',confidence:.9}]};
  const first=researchQueue(gaps);first.items[0].status='rejected';first.items[0].externalWorkItem='real-id';
  const second=researchQueue(gaps,first);assert.equal(second.items.length,1);
  assert.equal(second.items[0].status,'rejected');assert.equal(second.items[0].externalWorkItem,'real-id');
});
