import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSearch,discoveryRecord} from '../lib/discovery.mjs';
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
