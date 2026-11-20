// Refresh through the existing bounded GitHub worker, never a duplicate scheduler.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {STATE_DIR,REPO_ROOT,writeJson,readJson,ORIGIN} from '../lib/util.mjs';
import {assessCrawl,refreshDecision} from '../lib/crawl-evidence.mjs';
const adapter=path.join(REPO_ROOT,'ops/seo-automation/remy.py');
const call=(...args)=>JSON.parse(execFileSync('python3',[adapter,...args],{encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024}));
const file=path.join(STATE_DIR,'live-crawl.json');
const prior=readJson(file,{});
let evidence;
try {
  const response=await fetch(`${ORIGIN}/deployment.json`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Current deployment evidence unavailable');
  const deployment=await response.json();
  if(!/^[a-f0-9]{40}$/.test(deployment.sourceSha??''))throw Error('Invalid current deployment SHA');
  const runs=call('status').runs.filter(r=>['schedule','workflow_dispatch'].includes(r.event));
  const completed=runs.filter(r=>r.status==='completed').slice(0,3);
  const diagnostics=[];
  for(const run of completed){
    try {
      const report=call('report',String(run.databaseId));
      const assessment=assessCrawl(report,deployment);
      const candidate={...report,...assessment,collectedAt:new Date().toISOString(),currentDeployment:deployment};
      evidence??=candidate;
      if(assessment.diagnosticReady){evidence=candidate;break;}
    }catch(error){diagnostics.push({runId:run.databaseId,error:error.message.slice(0,300)});}
  }
  evidence??={state:'unavailable',collectedAt:new Date().toISOString(),currentDeployment:deployment};
  evidence.diagnostics=diagnostics;
  if(!evidence.diagnosticReady){
    const previousRefresh=prior.refresh?.deploymentSha===deployment.sourceSha ? prior.refresh : null;
    const decision=refreshDecision(previousRefresh,deployment.sourceSha,runs);
    if(decision.action==='wait'){
      evidence.refresh={...previousRefresh,status:'pending',runId:decision.runId??previousRefresh?.runId,deploymentSha:deployment.sourceSha};
    }else if(decision.action==='fail'){
      evidence.refresh={...previousRefresh,status:'failed',reason:decision.reason};
    }else{
      const requestedAt=new Date().toISOString();
      // Persist intent before dispatch: an uncertain response must not replay immediately.
      evidence.refresh={status:'requested',requestedAt,deploymentSha:deployment.sourceSha};
      writeJson(file,evidence);
      const result=call('run','--profile=daily');
      evidence.refresh={...evidence.refresh,status:result.submitted?'requested':'pending',receipt:result};
    }
  }
  evidence.limitation='Sample coverage and vendor findings require interpretation; a passed crawl is not proof of Google indexation.';
}catch(error){evidence={...evidence,refresh:evidence?.refresh??prior.refresh,state:'unavailable',diagnosticReady:false,accepted:false,collectedAt:new Date().toISOString(),error:error.message.slice(0,500)};}
writeJson(file,evidence);
console.log(JSON.stringify({state:evidence.state,freshness:evidence.freshness,matchesCurrentDeployment:evidence.matchesCurrentDeployment,refresh:evidence.refresh?.status,accepted:evidence.accepted}));
