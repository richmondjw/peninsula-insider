import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessCrawl,refreshDecision} from '../lib/crawl-evidence.mjs';
const sha='a'.repeat(40), other='b'.repeat(40), now=Date.parse('2026-11-20T02:00:00Z');
const report=()=>({state:'available',run:{conclusion:'success'},summary:{target:'live',status:'passed',finishedAt:'2026-11-20T01:00:00Z',sourceSha:other,deploymentBefore:{sourceSha:sha},deploymentAfter:{sourceSha:sha}}});
test('accepts stable observed deployment even if worker checkout differs',()=>assert.equal(assessCrawl(report(),{sourceSha:sha},now).accepted,true));
test('rejects stale, failed, local and moving-deployment evidence',()=>{
 for(const change of [{finishedAt:'2026-11-17T00:00:00Z'},{status:'failed'},{target:'local'},{deploymentBefore:{sourceSha:other}},{deploymentAfter:{sourceSha:other}}]){
  const r=report();Object.assign(r.summary,change);assert.equal(assessCrawl(r,{sourceSha:sha},now).accepted,false);
 }
 assert.equal(assessCrawl(report(),{sourceSha:other},now).accepted,false);
 assert.equal(assessCrawl(report(),{},now).accepted,false);
});

test('failed matched crawl remains usable to plan repairs but is not live acceptance',()=>{
 const r=report();r.summary.status='failed';r.run.conclusion='failure';
 const result=assessCrawl(r,{sourceSha:sha},now);
 assert.equal(result.diagnosticReady,true);assert.equal(result.accepted,false);
});

test('persistent refresh intent never redispatches an uncertain request',()=>{
 const prior={deploymentSha:sha,requestedAt:'2026-11-20T01:59:00Z',status:'requested'};
 assert.equal(refreshDecision(prior,sha,[],now).action,'wait');
 assert.equal(refreshDecision(prior,sha,[],now+120000).action,'fail');
 assert.equal(refreshDecision(prior,sha,[{status:'completed',createdAt:'2026-11-20T01:59:10Z'}],now).action,'fail');
 assert.equal(refreshDecision(prior,other,[],now).action,'dispatch');
 assert.equal(refreshDecision(null,sha,[{status:'in_progress',databaseId:12}],now).action,'wait');
});
