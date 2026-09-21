import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {proposePatch,removeTrailingJsonCommas,applySourceFixes,candidatePriority} from '../lib/source-fixes.mjs';
import {checksPassed,REQUIRED_CHECKS,validateScope,verifyHtml} from '../lib/release.mjs';
import {Ledger} from '../lib/ledger.mjs';
import {ChangeSet,PLANE} from '../lib/autofix.mjs';
import {DecisionRegistry,DecisionService} from '../lib/jev.mjs';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pi-auto-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,'next/src/pages/journal/brunch.astro');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,'---\nconst fact="untouched";\n---\n<BaseLayout title="Shared title"><h1>Brunch on the Mornington Peninsula</h1></BaseLayout>\n');
  const pages={'/journal/brunch/':{urlPath:'/journal/brunch/',indexable:true,title:'Shared title',h1:'Brunch on the Mornington Peninsula'}};
  return {root,file,pages,finding:{urlPath:'/journal/brunch/',rule:'duplicate_title'}};
}
test('title repair is extractive and path traversal/dynamic source mappings fail closed',t=>{
  const f=fixture(t);const patch=proposePatch(f.finding,f);
  assert.equal(patch.expected.title,'Brunch on the Mornington Peninsula · Peninsula Insider');
  assert.ok(patch.after.includes('const fact="untouched"'));
  assert.equal(proposePatch({...f.finding,urlPath:'/../../secret/'},f),null);
  assert.equal(proposePatch({...f.finding,urlPath:'/missing/'},f),null);
});
test('static JSON repair preserves comma-like content inside strings',()=>{
  const repaired=removeTrailingJsonCommas('{"text":"x,} and \\\"quotes\\\"", "a":[1,2,],}');
  assert.deepEqual(JSON.parse(repaired),{text:'x,} and "quotes"',a:[1,2]});
});
test('all named checks plus every reported check must pass',()=>{
  const good=REQUIRED_CHECKS.map(name=>({name,state:'SUCCESS'}));
  assert.equal(checksPassed(good),true);
  assert.equal(checksPassed([]),false);
  assert.equal(checksPassed(good.slice(1)),false);
  assert.equal(checksPassed([...good,{name:'extra',state:'FAILURE'}]),false);
  assert.equal(checksPassed([...good,{name:'extra',state:'PENDING'}]),false);
});
test('release cannot edit policy, credentials, workflow, tests or unlisted source',()=>{
  for(const file of ['ops/geo-engine/policy.json','.github/workflows/content-gate.yml','next/src/pages/../../x.astro','next/src/pages/admin/x.astro']) {
    assert.throws(()=>validateScope([{file}],[file]));
  }
  validateScope([{file:'next/src/pages/journal/a.astro'}],['next/src/pages/journal/a.astro']);
  assert.throws(()=>validateScope([{file:'next/src/pages/journal/a.astro'}],['next/src/pages/journal/b.astro']));
});
test('live assertions reject wrong title, missing links, and malformed schema',()=>{
  assert.equal(verifyHtml('<title>A &amp; B</title>',{title:'A & B'}),true);
  assert.equal(verifyHtml('<title>A</title>',{title:'B'}),false);
  assert.equal(verifyHtml('<p>hello</p>',{link:'/x/'}),false);
  assert.equal(verifyHtml('<script type="application/ld+json">{bad}</script>',{validJsonLd:true}),false);
  assert.equal(verifyHtml('<p>no schema</p>',{validJsonLd:true}),false);
});
test('recommendations and locally applied patches never enter measurement or cooldown',t=>{
  const f=fixture(t),ledger=new Ledger(path.join(f.root,'ledger.json'));
  for(const mode of ['recommended','applied'])ledger.recordIntervention({runId:mode,date:'2026-01-01',urlPath:'/x/',action:'rewrite_title',mode});
  assert.equal(ledger.dueForMeasurement('2026-09-01').length,0);
  assert.equal(ledger.lastInterventionFor('/x/'),null);
  assert.equal(ledger.successRateFor('rewrite_title'),null);
});
test('overlapping measurement windows are refused; sparse outcomes do not penalise learning',t=>{
  const f=fixture(t),ledger=new Ledger(path.join(f.root,'ledger.json'));
  const r=ledger.recordIntervention({runId:'a',date:'2026-08-01',urlPath:'/x/',action:'rewrite_title',mode:'deployed',deployedSha:'abc',deployedAt:'2026-08-01T00:00:00Z',searchBefore:{clicks:0,impressions:500},searchWindowBefore:{start_date:'2026-07-01',end_date:'2026-07-28'}});
  assert.equal(ledger.measure(r.id,{window:{start_date:'2026-07-15',end_date:'2026-08-11'},searchAfter:{clicks:0,impressions:500}}),null);
  ledger.measure(r.id,{window:{start_date:'2026-08-02',end_date:'2026-08-29'},searchAfter:{clicks:0,impressions:500}});
  assert.equal(r.result,'inconclusive');assert.equal(ledger.successRateFor('rewrite_title'),null);
});
test('preview rollback restores exact bytes, but never overwrites a concurrent edit',t=>{
  const f=fixture(t),original=fs.readFileSync(f.file,'utf8');
  const set=new ChangeSet({runId:'preview',root:f.root});
  const change=set.applyTextChange({file:f.file,plane:PLANE.SOURCE,transform:s=>s.replace('Shared title','Changed title')}).change;
  assert.equal(set.revert(change).reverted,true);assert.equal(fs.readFileSync(f.file,'utf8'),original);
  const next=set.applyTextChange({file:f.file,plane:PLANE.SOURCE,transform:s=>s+'\n'}).change;
  fs.appendFileSync(f.file,'other work');
  assert.equal(set.revert(next).reverted,false);
});
test('exact patch application requires live agreement and successful JEV, not fallback confidence',async t=>{
  const f=fixture(t),policy={enabled:true,maxChangesPerRun:5,confidenceThreshold:.92,allowedActions:['rewrite_title']};
  const service={decide:async()=>({provider:'deterministic',confidence:1,value:{containsNewClaim:false}})};
  const result=await applySourceFixes({...f,findings:[f.finding],service,policy,runId:'r',fetchImpl:async()=>({status:200,text:async()=>'<title>Shared title</title>'})});
  assert.equal(result.changes.length,0);assert.equal(result.deferred.length,1);
  const unsafe=await applySourceFixes({...f,findings:[f.finding],policy,runId:'unsafe',
    service:{decide:async()=>({provider:'jev',confidence:.99,value:{containsNewClaim:true}})},
    fetchImpl:async()=>({status:200,text:async()=>'<title>Shared title</title>'})});
  assert.equal(unsafe.changes.length,0,'A confident finding of new facts is a veto, not approval');
});
test('remote failure does not cache fallback under JEV identity',async t=>{
  const f=fixture(t),registry=new DecisionRegistry();
  registry.register('a',{question:'Which?',fields:{choice:{type:'enum',values:['yes','no']}}},()=>({value:{choice:'no'},confidence:1}));
  let calls=0;
  const service=new DecisionService({registry,cacheFile:path.join(f.root,'cache.json'),env:{JEV_API_KEY:'test'},fetchImpl:async()=>{calls++;return calls===1?{ok:false,status:503}:{ok:true,json:async()=>({answers:{choice:{type:'choice',choice:'yes',confidence:1}}})};}});
  assert.equal((await service.decide('a',{x:1})).provider,'deterministic');
  assert.equal((await service.decide('a',{x:1})).provider,'jev');assert.equal(calls,2);
});

test('actual patch selection learns only after three measured deployed outcomes',()=>{
  const finding={rule:'duplicate_title'},patch={action:'rewrite_title',urlPath:'/x/'};
  const score=history=>candidatePriority(finding,patch,{}, {successRateFor:()=>history});
  assert.equal(score({samples:2,successRate:0}),3);
  assert.equal(score({samples:3,successRate:0}),2.4000000000000004);
  assert.ok(score({samples:3,successRate:1})>3);
});
test('an awaiting deployed experiment blocks another patch before any network or JEV call',async t=>{
  const f=fixture(t),ledger=new Ledger(path.join(f.root,'ledger.json'));
  ledger.recordIntervention({runId:'old',date:'2026-01-01',urlPath:'/journal/brunch/',action:'rewrite_title',mode:'deployed',deployedAt:'2026-01-01T00:00:00Z',deployedSha:'abc'});
  const result=await applySourceFixes({...f,findings:[f.finding],ledger,service:{decide:()=>{throw Error('must not call');}},policy:{enabled:true,maxChangesPerRun:5,allowedActions:['rewrite_title']},runId:'new',fetchImpl:()=>{throw Error('must not fetch');}});
  assert.equal(result.changes.length,0);assert.match(result.deferred[0].reason,/observation window/);
});

test('accepted exact JEV patch changes source and its durable manifest restores exact bytes',async t=>{
  const f=fixture(t),before=fs.readFileSync(f.file,'utf8');
  const result=await applySourceFixes({...f,findings:[f.finding],ledger:new Ledger(path.join(f.root,'ledger.json')),
    service:{decide:async()=>({provider:'jev',confidence:.99,value:{containsNewClaim:false}})},
    policy:{enabled:true,maxChangesPerRun:5,confidenceThreshold:.92,allowedActions:['rewrite_title']},runId:'accepted',
    fetchImpl:async()=>({status:200,text:async()=>'<title>Shared title</title>'})});
  assert.equal(result.changes.length,1);
  assert.notEqual(fs.readFileSync(f.file,'utf8'),before);
  const manifest=JSON.parse(fs.readFileSync(path.join(f.root,'ops/geo-engine/.rollback/accepted/manifest.json')));
  const set=new ChangeSet({root:f.root,runId:'accepted'});set.changes=manifest.changes;
  assert.equal(set.revertAll().reverted,1);assert.equal(fs.readFileSync(f.file,'utf8'),before);
});
test('preview scoped Git revert preserves an unrelated later commit',t=>{
  const f=fixture(t),original=fs.readFileSync(f.file,'utf8');
  const git=(...args)=>execFileSync('git',args,{cwd:f.root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','-b','main');git('config','user.name','Preview Test');git('config','user.email','preview@example.invalid');
  git('add','.');git('commit','-m','baseline');
  fs.writeFileSync(f.file,original.replace('Shared title','Changed title'));
  git('add','.');git('commit','-m','own patch');const own=git('rev-parse','HEAD');
  fs.writeFileSync(path.join(f.root,'unrelated.txt'),'preserve this\n');
  git('add','.');git('commit','-m','unrelated later work');
  git('revert','--no-edit',own);
  assert.equal(fs.readFileSync(f.file,'utf8'),original);
  assert.equal(fs.readFileSync(path.join(f.root,'unrelated.txt'),'utf8'),'preserve this\n');
});
