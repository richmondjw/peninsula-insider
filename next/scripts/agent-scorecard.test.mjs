import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreEvidence, digest } from './agent-scorecard.mjs';

const rubric = JSON.parse(readFileSync(new URL('../../ops/agent-experience/rubric-v1.json',import.meta.url),'utf8'));
rubric.frozenAt='2026-10-01T00:00:00.000Z';
// These invented traces exercise validator branches only. They are never saved as
// site evidence, never submitted for acceptance and do not measure real agents.
function fixture() {
  const files = new Map(), sourceSha='a'.repeat(40);
  const ref=(name)=>{ const body=`Synthetic test trace only: ${name}`; files.set(name,body); return {path:name,sha256:digest(body)}; };
  const plan={frozenAt:'2026-10-01T00:00:00.000Z',taskManifestSha256:'b'.repeat(64),holdoutManifestSha256:'c'.repeat(64),routeInventory:['https://peninsulainsider.com.au/agents/'],
    tasks:[...Array.from({length:30},(_,i)=>({id:`B${String(i+1).padStart(2,'0')}`,critical:rubric.requiredCriticalTaskIds.includes(`B${String(i+1).padStart(2,'0')}`),kind:[25,26].includes(i)?'planning':'simple',latencyBudgetMs:10000})),...Array.from({length:10},(_,i)=>({id:`H${String(i+1).padStart(2,'0')}`,critical:true,kind:'simple',latencyBudgetMs:10000}))],
    stacks:Array.from({length:3},(_,i)=>({id:`stack-${i}`,execution:'real-agent',provider:`provider-${i}`,model:`model-${i}`,modelVersion:'1',client:`client-${i}`,browser:'browser',browserVersion:'1',documentationUrl:`https://example.com/stack-${i}`}))};
  const evaluations=[0,1].map(n=> {
    const cases=[];
    for(const task of plan.tasks)for(const stack of (task.id.startsWith('H')?[plan.stacks[0]]:plan.stacks))for(const repetition of (task.id.startsWith('H')?[1]:[1,2])) {
      const id=`${n}-${task.id}-${stack.id}-${repetition}`;
      cases.push({taskId:task.id,stackId:stack.id,repetition,mode:repetition===1?'cold':'welcome-assisted',sessionId:id,freshSession:true,kind:'agent-task',execution:'real-agent',environment:'production',observedAt:`2026-10-01T0${n+1}:30:00.000Z`,trace:ref(`${id}.txt`),answerCorrect:true,constraintsRespected:true,sourceFaithful:true,freshnessCorrect:true,unsupportedClaims:0,citations:[{canonicalUrl:'https://peninsulainsider.com.au/agents/',supportsClaim:true}],metrics:{requests:2,bytes:500,inputTokens:100,htmlBaselineTokens:1000,elapsedMs:100,retries:0,materialParity:true}});
    }
    return {id:`run-${n}`,sourceSha,deployedSha:sourceSha,startedAt:`2026-10-01T0${n+1}:00:00.000Z`,completedAt:`2026-10-01T0${n+1}:59:00.000Z`,reviewerId:`reviewer-${n}`,reviewReceipt:ref(`review-${n}`),environment:'production',evidenceKind:'observed',denominators:{baseline:180,holdout:10,checks:30},checks:rubric.categories.flatMap(c=>c.checks.map(k=>({id:k.id,status:'pass',artifacts:[ref(`check-${n}-${k.id}`)]}))),criticalGates:rubric.criticalGates.map(id=>({id,status:'pass',artifacts:[ref(`gate-${n}-${id}`)]})),routeCoverage:{expected:1,checked:1,urls:[...plan.routeInventory],failures:0,artifacts:[ref(`routes-${n}`)]},cases};
  });
  const evidence={schemaVersion:'1.0',rubricSha256:digest(rubric),planSha256:digest(plan),sourceSha,evaluations};
  const input={rubric,plan,evidence,expectedSourceSha:sourceSha,trustedReviewerIds:['reviewer-0','reviewer-1'],implementerIds:['builder'],now:'2026-10-01T04:00:00.000Z',readArtifact:p=>{if(!files.has(p))throw new Error('missing');return files.get(p);}};
  return {input,files,run:evaluations[0]};
}

test('complete synthetic contract exercises 100-point success path without being real site evidence',()=>{
  const report=scoreEvidence(fixture().input); assert.equal(report.accepted,true,report.errors.join('\n')); assert.equal(report.score,100); assert.equal(report.coverage.expectedAgentInvocations,380);
});
test('empty evidence and partial denominator cannot obtain 99',()=>{
  const f=fixture();f.input.evidence.evaluations=[];const empty=scoreEvidence(f.input);assert.equal(empty.score,0);assert.equal(empty.accepted,false);
  const g=fixture();g.run.cases=g.run.cases.slice(0,1);g.run.denominators.baseline=1;const partial=scoreEvidence(g.input);assert.equal(partial.accepted,false);assert.ok(partial.errors.some(x=>x.includes('denominator')));
});
test('duplicate cases, traces and session identities fail independent evaluation',()=>{
  for(const mutate of [r=>r.cases[1]={...r.cases[0]},r=>r.cases[1].trace=r.cases[0].trace,r=>r.cases[1].sessionId=r.cases[0].sessionId]) {
    const f=fixture();mutate(f.run);assert.equal(scoreEvidence(f.input).accepted,false);
  }
});
test('wrong release, modified rubric or plan, stale receipt and untrusted reviewer fail',()=>{
  for(const mutate of [f=>f.run.deployedSha='d'.repeat(40),f=>f.input.evidence.rubricSha256='d'.repeat(64),f=>f.input.plan.tasks[0].latencyBudgetMs=999999,f=>f.run.startedAt='2026-09-01T00:00:00.000Z',f=>f.run.reviewerId='builder',f=>f.input.evidence.evaluations[1].reviewerId='reviewer-0']) {
    const f=fixture();mutate(f);assert.equal(scoreEvidence(f.input).accepted,false);
  }
});
test('missing and altered raw artifact bytes invalidate claimed passes',()=>{
  for(const mutate of [f=>f.files.delete(f.run.cases[0].trace.path),f=>f.files.set(f.run.reviewReceipt.path,'changed')]){const f=fixture();mutate(f);assert.equal(scoreEvidence(f.input).accepted,false);}
});
test('critical failure overrides high score and unknown category evidence gets zero credit',()=>{
  const f=fixture();f.run.criticalGates[0].status='fail';const failed=scoreEvidence(f.input);assert.equal(failed.score,100);assert.equal(failed.accepted,false);
  const g=fixture();g.run.checks[0].status='unknown';const unknown=scoreEvidence(g.input);assert.ok(unknown.score<99);assert.equal(unknown.accepted,false);assert.equal(unknown.categories[0].passed,5);
});
test('probes and replays are rejected as real stack evidence',()=>{
  for(const mutate of [f=>f.run.cases[0].kind='http-probe',f=>f.run.evidenceKind='fixture',f=>f.input.plan.stacks[0].execution='replay']) {const f=fixture();mutate(f);assert.equal(scoreEvidence(f.input).accepted,false);}
});
test('unmeasured citations, byte-only efficiency and failed holdout cannot satisfy gates',()=>{
  for(const mutate of [f=>f.run.cases[0].citations=[],f=>delete f.run.cases[0].metrics.inputTokens,f=>f.run.cases.find(c=>c.taskId==='H01').answerCorrect=false]){const f=fixture();mutate(f);assert.equal(scoreEvidence(f.input).accepted,false);}
});
test('external outcome claims do not add score',()=>{
 const f=fixture();f.input.evidence.externalOutcomes={repeatAgentLove:100};f.run.checks=[];const report=scoreEvidence(f.input);assert.equal(report.score,50);assert.equal(report.externalOutcomes.scored,false);assert.equal(report.accepted,false);
});
