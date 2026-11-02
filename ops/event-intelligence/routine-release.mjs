import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,open,unlink,rm,realpath,readdir,stat,statfs} from 'node:fs/promises';
import path from 'node:path';import {randomUUID} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {publishRoutineEvents} from './routine-publisher.mjs';
import {hash} from './data.mjs';
import {verifyRoutinePublic} from './routine-public-verification.mjs';
const exec=promisify(execFile);
const MODULE_ROOT=fileURLToPath(new URL('../../',import.meta.url));
export async function assertWriterPaths(config){
 const canonical=async value=>{let current=path.resolve(value),tail=[];for(;;){try{return path.join(await realpath(current),...tail.reverse());}catch(error){if(error.code!=='ENOENT')throw error;tail.push(path.basename(current));const parent=path.dirname(current);if(parent===current)throw error;current=parent;}}};
 const source=await canonical(config.sourceCheckout),runtime=await canonical(config.runtimeDirectory),history=await canonical(config.historyDirectory),scratch=await canonical(config.releaseRoot);
 const within=(a,b)=>{const rel=path.relative(b,a);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
 if([history,scratch].some(value=>within(value,source)||within(value,runtime))||within(history,scratch)||within(scratch,history))throw Error('Writer history and scratch must be separate from collector/source and each other');
 if(source!==await realpath(MODULE_ROOT))throw Error('Configured source does not contain the executing publisher implementation');
}

export const RELEASE_GATES=[['npm',['ci','--no-audit','--no-fund']],['npm',['run','validate:content']],['npm',['run','build:search']],['npm',['run','test:discovery-journeys']],['npm',['run','test:planning-journeys']],['npm',['run','test:release-contract']]];
async function command(name,args,{cwd}={}){
 const binary=process.platform==='win32'&&name==='npm'?'npm.cmd':name;
 // npm.cmd needs cmd.exe on Windows; all arguments here are fixed repository scripts.
 const result=await exec(binary,args,{cwd,windowsHide:true,shell:process.platform==='win32'&&name==='npm',maxBuffer:32*1024**2});return result.stdout.trim();
}
export async function assertInstalledPublisher(cwd,run=command){
 const git=(...args)=>run('git',['-c','safe.directory='+path.resolve(cwd),...args],{cwd});
 await git('ls-files','--error-unmatch','--','ops/event-intelligence/routine-release.mjs','ops/event-intelligence/routine-public-verification.mjs','ops/event-intelligence/routine-publisher.mjs','next/src/lib/event-standing-authority.mjs');
 if(await git('diff','HEAD','--name-only')||await git('status','--porcelain','--untracked-files=all','--','ops/event-intelligence','next/src/lib'))throw Error('Installed publisher has tracked or untracked implementation edits');
 return git('rev-parse','HEAD');
}
export async function snapshotOutputs(cwd,files){return Promise.all(files.map(async file=>({file,hash:hash(await readFile(path.join(cwd,file),'utf8'))})));}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function completeRelease({cwd,files,baseSha,repo,now=new Date(),run=command,fetcher=fetch,wait=pause,attempts=330,onSubmitted=async()=>{}}){
 if(!files.length||files.some(file=>!/^next\/src\/content\/events\/[a-z0-9-]+\.json$/.test(file)))throw Error('Only explicit event JSON outputs may be released');
 const git=(...args)=>run('git',['-c','safe.directory='+cwd,...args],{cwd});
 const outputBefore=JSON.stringify(await snapshotOutputs(cwd,files));
 for(const [name,args] of RELEASE_GATES)await run(name,args,{cwd:path.join(cwd,'next')});
 if(JSON.stringify(await snapshotOutputs(cwd,files))!==outputBefore)throw Error('Quality gates changed event outputs; release held');
 await git('fetch','origin','main');if(await git('rev-parse','origin/main')!==baseSha)throw Error('Main advanced during validation; retry from a new snapshot');
 await git('add','--',...files);
 const staged=(await git('diff','--cached','--name-only')).split(/\r?\n/).filter(Boolean);
 if(staged.length!==files.length||staged.some(file=>!files.includes(file)))throw Error('Staged output differs from approved event-only manifest');
 if(JSON.stringify(await snapshotOutputs(cwd,files))!==outputBefore)throw Error('Event bytes changed before commit');
 await git('commit','-m','Publish verified routine events under standing authority');
 const sha=await git('rev-parse','HEAD');await onSubmitted({status:'submission-pending',sourceSha:sha,submittedAt:now.toISOString(),files});await git('push','origin','HEAD:main');
 await onSubmitted({status:'submitted',sourceSha:sha,submittedAt:now.toISOString(),files});
 for(let attempt=0;attempt<attempts;attempt++){
  const runs=JSON.parse(await run('gh',['run','list','--repo',repo,'--workflow','build-and-deploy.yml','--commit',sha,'--limit','5','--json','databaseId,status,conclusion,headSha'],{cwd}));
  const release=runs.find(item=>item.headSha===sha);
  if(release?.status==='completed'){
   if(release.conclusion!=='success')throw Error('Protected release failed: '+release.databaseId);
   const response=await fetcher('https://peninsulainsider.com.au/deployment.json',{signal:AbortSignal.timeout(20000)});
   if(response.ok&&(await response.json()).sourceSha===sha){
    const checks=[];
    for(const file of files){const slug=path.basename(file,'.json');
     const result=await run('node',['ops/scripts/post-publish-verify.mjs','https://peninsulainsider.com.au/whats-on/'+slug+'/','--expect-sha='+sha],{cwd});const record=JSON.parse(await readFile(path.join(cwd,file),'utf8'));
     const detail=await fetcher('https://peninsulainsider.com.au/whats-on/'+slug+'/',{signal:AbortSignal.timeout(20000)}),feedResponse=await fetcher('https://peninsulainsider.com.au/whats-on/upcoming.json',{signal:AbortSignal.timeout(20000)});
     if(!detail.ok||!feedResponse.ok)throw Error('Public detail/feed retrieval failed');
     verifyRoutinePublic(record,await detail.text(),await feedResponse.json());checks.push({slug,result,detailAndFeedVerified:true});
    }
    return {status:'published',sourceSha:sha,workflowRunId:release.databaseId,verifiedAt:new Date().toISOString(),checks};
   }
  }
  await wait(10000);
 }
 throw Error('Submitted release lacks completed deployment/public verification; do not label published');
}
/** Read-only collector input; all writes happen in a fresh checkout and private receipts. */
export async function runRoutineRelease(config,{run=command,fetcher=fetch,wait=pause}={}){
 const {sourceCheckout,runtimeDirectory,releaseRoot,historyDirectory,apply=false}=config;
 if(!sourceCheckout||!runtimeDirectory||!releaseRoot||!historyDirectory)throw Error('Explicit source, runtime, scratch and private history paths required');
 await assertWriterPaths(config);
 await mkdir(historyDirectory,{recursive:true});await mkdir(releaseRoot,{recursive:true});
 let retainedBytes=0,retainedFiles=0;async function measure(dir,depth=0){if(depth>4)throw Error('Private writer history depth exceeded');for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Private writer history symlink refused');const file=path.join(dir,entry.name);if(entry.isDirectory())await measure(file,depth+1);else{retainedBytes+=(await stat(file)).size;if(++retainedFiles>5000)throw Error('Private writer history file budget exhausted');}}}await measure(historyDirectory);
 if(retainedBytes>512*1024**2)throw Error('Private writer history budget exhausted; retain evidence and request archival');
 const capacity=await statfs(releaseRoot);if(capacity.bavail*capacity.bsize<2*1024**3)throw Error('Insufficient scratch reserve for isolated protected build');
 const lockFile=path.join(historyDirectory,'writer.lock'),lock=await open(lockFile,'wx');
 const id=randomUUID(),checkout=path.join(path.resolve(releaseRoot),id),receiptFile=path.join(historyDirectory,id+'.json');
 let receipt={id,status:'preparing',startedAt:new Date().toISOString(),apply};
 const persist=async value=>{receipt={...receipt,...value};await writeFile(receiptFile,JSON.stringify(receipt,null,2)+'\n');};
 try{
 for(const name of await readdir(historyDirectory))if(/^[a-f0-9-]{36}\.json$/.test(name)){const prior=JSON.parse(await readFile(path.join(historyDirectory,name),'utf8'));if(['submission-pending','submission-uncertain','submitted','submitted-unverified'].includes(prior.status))throw Error('Prior submission needs reconciliation before another writer run: '+name);}
  const sourceGit=(...args)=>run('git',['-c','safe.directory='+path.resolve(sourceCheckout),...args],{cwd:sourceCheckout});
  const implementation=await assertInstalledPublisher(sourceCheckout,run);
  const cycle=JSON.parse(await readFile(path.join(runtimeDirectory,'last-cycle.json'),'utf8'));
  const packetPath=path.join(runtimeDirectory,'review-packet.json');if((await stat(packetPath)).size>64*1024**2)throw Error('Private packet byte budget exceeded');
  const bytes=await readFile(packetPath,'utf8');
  if(cycle.state!=='complete'||cycle.packetHash!==hash(bytes))throw Error('Packet is not bound to a completed collector cycle');
  const packet=JSON.parse(bytes),cycleAgain=JSON.parse(await readFile(path.join(runtimeDirectory,'last-cycle.json'),'utf8'));
  if(cycleAgain.id!==cycle.id||cycleAgain.packetHash!==cycle.packetHash)throw Error('Collector changed while snapshotting; retry later');
  await run('git',['clone','--filter=blob:none','--single-branch','--branch','main','https://github.com/richmondjw/peninsula-insider.git',checkout]);
  const git=(...args)=>run('git',['-c','safe.directory='+checkout,...args],{cwd:checkout});
  const baseSha=await git('rev-parse','HEAD');
  await git('merge-base','--is-ancestor',implementation,'HEAD'); // No activation before the implementation is merged.
  const options={contentDirectory:path.join(checkout,'next/src/content/events'),historyDirectory:path.join(historyDirectory,id+'-promotions'),now:new Date()};
  const plan=await publishRoutineEvents(packet,options);
  await persist({implementation,baseSha,cycleId:cycle.id,packetHash:cycle.packetHash,plan:plan.results});
  if(!apply||!plan.results.some(row=>row.status==='eligible')){await persist({status:apply?'no-qualifying-output':'dry-run',deploymentStatus:'not-deployed'});return receipt;}
  // Retain full evidence only for an actual publication attempt, never rewrite collector state.
  await writeFile(path.join(historyDirectory,id+'-packet.json'),bytes,{flag:'wx'});
  const promoted=await publishRoutineEvents(packet,{...options,apply:true});
  const files=promoted.results.filter(row=>row.status==='promoted-locally').map(row=>'next/src/content/events/'+path.basename(row.target));
  if(!files.length){await persist({status:'unchanged',deploymentStatus:'not-deployed'});return receipt;}
  const result=await completeRelease({cwd:checkout,files,baseSha,repo:'richmondjw/peninsula-insider',run,fetcher,wait,onSubmitted:persist});
  await persist(result);return receipt;
 }catch(error){await persist({status:receipt.status==='submitted'?'submitted-unverified':receipt.status==='submission-pending'?'submission-uncertain':'held',error:error.message});throw error;
 }finally{
  await lock.close();await unlink(lockFile);
  // Delete only this newly created UUID scratch checkout, never the source or evidence history.
  try{const root=await realpath(releaseRoot),target=await realpath(checkout);if(path.dirname(target)!==root||path.basename(target)!==id)throw Error('Scratch cleanup path mismatch');await rm(target,{recursive:true});}catch(error){if(error.code!=='ENOENT')throw error;}
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=JSON.parse(await readFile(process.argv[2],'utf8'));console.log(JSON.stringify(await runRoutineRelease(config),null,2));
}
