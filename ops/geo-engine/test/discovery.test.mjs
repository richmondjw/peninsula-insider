import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSearch,discoveryRecord} from '../lib/discovery.mjs';
import {mergeBenchmark} from '../lib/benchmark.mjs';
import {visibilitySummary} from '../lib/visibility.mjs';
test('retired benchmark questions preserve receipts and restore them on reintroduction',()=>{
  const prior={questions:[{id:'old',observations:[{id:'receipt'}]}]};
  const retired=mergeBenchmark(prior,{questions:[],generatedAt:'2026-09-21'});
  assert.equal(retired.retiredQuestions[0].observations.length,1);
  const restored=mergeBenchmark(retired,{questions:[{id:'old'}],generatedAt:'2026-09-22'});
  assert.equal(restored.questions[0].observations[0].id,'receipt');assert.equal(restored.retiredCount,0);
});
test('visibility share uses the latest sample per question and surface, not repeated observations',()=>{
  const a={questionId:'q',surface:'fixture',kind:'ai_answer',observedAt:'2026-09-20',citations:[],piCited:true};
  const b={...a,observedAt:'2026-09-21',piCited:false};
  const result=visibilitySummary({questions:[{observations:[a,b]}]},Date.parse('2026-09-22'));
  assert.equal(result.observations,1);assert.equal(result.piCitationShare,0);
});
test('only typed grounded answers become AI observations; source lists remain search results',()=>{
  const q={id:'q',query:'Local question'};
  const search={kind:'results',provider:'fixture',query:q.query,results:[{url:'https://example.com',title:'Example'}]};
  assert.equal(discoveryRecord(q,search,'fixture',new Date().toISOString()).kind,'search_results');
  const answer={kind:'answer',provider:'fixture',query:q.query,content:'An actual provider answer',citations:[{url:'https://example.com'}]};
  const r=discoveryRecord(q,answer,'fixture',new Date().toISOString());
  assert.equal(r.kind,'ai_answer');assert.equal(r.citations[0].contextScope,'answer');
  assert.throws(()=>discoveryRecord(q,{...answer,citations:undefined},'fixture','now'),/citation metadata/);
  assert.throws(()=>discoveryRecord(q,{...answer,query:'different'},'fixture','now'),/different query/);
  assert.equal(normalizeSearch({content:[{type:'text',text:JSON.stringify(answer)}]}).kind,'answer');
  assert.equal(normalizeSearch({content:[{type:'text',text:'Invented prose'}]}).kind,'error');
});
