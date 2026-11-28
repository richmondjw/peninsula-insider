import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { converse } from './ask-pi.mjs';
import { isGeneralDiscussion } from './ask-discussion.mjs';
const index=JSON.parse(fs.readFileSync(new URL('../../tests/journeys/fixtures/ask-index.json',import.meta.url)));
const routed=(q,previous)=>isGeneralDiscussion(index,q,converse(index,q).reply,previous);
test('general discussion recognises question forms and carries the topic across a follow-up',()=>{
  for(const q of ['Tell me about Paris','Explain entropy','Can missing a place be a way of belonging to it?','Imagine a city without clocks','What makes a place feel like home?','Can we talk about music?']) assert.equal(routed(q),true,q);
  assert.equal(routed('Say a little more.','discussion'),true);
  assert.equal(routed('What about when you have two homes?','discussion'),true);
});
test('local evidence and operational requests retain their existing routes, including after discussion',()=>{
  for(const q of ['Lunch in Red Hill','What source backs that recommendation?','I own a venue','What is open now?','Tell me about Tedesca Osteria','What is on this weekend?','Plan a morning in Red Hill for two','Which is better?']) assert.equal(routed(q,'discussion'),false,q);
  assert.equal(routed('How does the first one compare?','talk'),false);
});
