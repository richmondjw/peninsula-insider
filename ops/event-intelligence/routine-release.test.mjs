import {readFileSync,existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';
import {routineFixture} from './routine-test-fixtures.mjs';import {hash,htmlEscape} from './data.mjs';import {publicEventData} from '../../next/src/lib/event-publication.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
import test from 'node:test';import assert from 'node:assert/strict';
import {completeRelease,RELEASE_GATES,assertInstalledPublisher,runRoutineRelease} from './routine-release.mjs';
const file='next/src/content/events/synthetic-event.json';
function fixture({failedGate=false,advanced=false,workflow='failure'}={}){
 const cwd=mkdtempSync(path.join(os.tmpdir(),'pi-release-test-'));test.after(()=>rmSync(cwd,{recursive:true,force:true}));mkdirSync(path.join(cwd,'next/src/content/events'),{recursive:true});writeFileSync(path.join(cwd,file),'{}\n');
 const calls=[];const run=async(name,args)=>{calls.push({name,args});
  if(name==='npm'){if(failedGate)throw Error('Quality gate failed');return '';}
  if(name==='gh')return JSON.stringify([{headSha:'published-sha',databaseId:42,status:'completed',conclusion:workflow}]);
  if(args.includes('rev-parse'))return args.includes('origin/main')?(advanced?'new-main':'base-main'):'published-sha';
  if(args.includes('--name-only'))return file;return '';
 };return {calls,options:{cwd,files:[file],baseSha:'base-main',repo:'synthetic/repo',run,wait:async()=>{},attempts:1}};
}
test('failed protected gate never stages, commits or pushes event content',async()=>{
 const {calls,options}=fixture({failedGate:true});await assert.rejects(completeRelease(options),/Quality gate failed/);assert.ok(!calls.some(call=>call.args.includes('push')||call.args.includes('add')));
});
test('changed main is held after all protected gates without a push',async()=>{
 const {calls,options}=fixture({advanced:true});await assert.rejects(completeRelease(options),/Main advanced/);assert.equal(calls.filter(call=>call.name==='npm').length,RELEASE_GATES.length);assert.ok(!calls.some(call=>call.args.includes('push')));
});
test('non-event output is rejected before any release operation',async()=>{
 const {calls,options}=fixture();await assert.rejects(completeRelease({...options,files:['next/src/content.config.ts']}),/Only explicit event JSON/);assert.equal(calls.length,0);
});
test('successful non-force push is recorded as submitted, failed workflow is never published',async()=>{
 const {calls,options}=fixture();let receipt;await assert.rejects(completeRelease({...options,onSubmitted:async value=>{receipt=value;}}),/Protected release failed/);
 assert.equal(receipt.status,'submitted');assert.equal(receipt.sourceSha,'published-sha');const push=calls.find(call=>call.args.includes('push'));assert.ok(push);assert.ok(!push.args.some(arg=>arg.includes('force')));
});

test('a quality gate mutating a new untracked event is held before staging',async()=>{
 const {calls,options}=fixture();const original=options.run;options.run=async(name,args,opts)=>{if(name==='npm')writeFileSync(path.join(options.cwd,file),'Changed by a gate');return original(name,args,opts);};
 await assert.rejects(completeRelease(options),/changed event outputs/);assert.ok(!calls.some(call=>call.args.includes('add')||call.args.includes('push')));
});
test('untracked or tampered installed implementation cannot attest an accepted revision',async()=>{
 for(const mode of ['untracked','tracked','missing']){
  const run=async(name,args)=>{if(args.includes('ls-files')&&mode==='missing')throw Error('not tracked');if(args.includes('status')&&mode==='untracked')return '?? routine-release.mjs';if(args.includes('diff')&&mode==='tracked')return 'routine-release.mjs';return '';};
  await assert.rejects(assertInstalledPublisher('C:/synthetic',run),/not tracked|implementation edits/);
 }
});
test('positive writer orchestration promotes real fixture bytes, runs every gate and verifies actual detail/feed before published',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'pi-writer-positive-'));const runtime=path.join(root,'runtime'),history=path.join(root,'history'),scratch=path.join(root,'scratch');mkdirSync(runtime);const f=routineFixture(),packet=JSON.stringify(f.packet);writeFileSync(path.join(runtime,'review-packet.json'),packet);writeFileSync(path.join(runtime,'last-cycle.json'),JSON.stringify({id:'fixture-cycle',state:'complete',packetHash:hash(packet)}));
 const source=fileURLToPath(new URL('../../',import.meta.url));let checkout,committed=false;const calls=[];
 const run=async(name,args,{cwd}={})=>{calls.push({name,args});if(name==='git'&&args[0]==='clone'){checkout=args.at(-1);mkdirSync(path.join(checkout,'next/src/content/events'),{recursive:true});return '';}
  if(name==='git'){if(args.includes('rev-parse'))return cwd===source?'accepted-implementation':args.includes('origin/main')?'base-main':committed?'published-sha':'base-main';if(args.includes('commit')){committed=true;return '';}
   if(args.includes('--cached'))return file;return '';}
  if(name==='gh')return JSON.stringify([{headSha:'published-sha',databaseId:42,status:'completed',conclusion:'success'}]);return 'PASS';};
 const fetcher=async url=>{const record=JSON.parse(readFileSync(path.join(checkout,file),'utf8'));return {ok:true,json:async()=>url.endsWith('deployment.json')?{sourceSha:'published-sha'}:{...f.feed,events:[{...f.feed.events[0],startDate:record.startDate}]},text:async()=>'<article data-routine-event="'+htmlEscape(JSON.stringify(publicEventData(record)))+'"><a href="'+record.primarySourceUrl+'">Source</a></article>'};};
 try{const result=await runRoutineRelease({sourceCheckout:source,runtimeDirectory:runtime,releaseRoot:scratch,historyDirectory:history,apply:true},{run,fetcher,wait:async()=>{}});assert.equal(result.status,'published');assert.equal(result.workflowRunId,42);assert.equal(calls.filter(call=>call.name==='npm').length,RELEASE_GATES.length);assert.ok(calls.some(call=>call.args.includes('HEAD:main')));assert.equal(existsSync(checkout),false);}finally{rmSync(root,{recursive:true,force:true});}
});
