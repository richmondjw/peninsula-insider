// Reuse SiteOne/Lighthouse evidence; do not schedule another crawler.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {STATE_DIR,REPO_ROOT,writeJson,ORIGIN} from '../lib/util.mjs';
const adapter=path.join(REPO_ROOT,'ops/seo-automation/remy.py');
const call=(...args)=>JSON.parse(execFileSync('python3',[adapter,...args],{encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024}));
let evidence;
try {
  const status=call('status');
  const latest=status.runs.find(r=>['schedule','workflow_dispatch'].includes(r.event));
  if(!latest)throw Error('No scheduled/manual crawl run');
  const report=call('report',String(latest.databaseId));
  const response=await fetch(`${ORIGIN}/deployment.json`,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Current deployment evidence unavailable');
  const deployment=await response.json();
  const age=Date.now()-Date.parse(report.summary?.finishedAt);
  evidence={...report,collectedAt:new Date().toISOString(),currentDeployment:deployment,
    freshness:Number.isFinite(age)&&age>=0&&age<36*3600000?'fresh':'stale',
    matchesCurrentDeployment:report.summary?.deploymentAfter?.sourceSha===deployment.sourceSha,
    limitation:'Sample coverage and vendor findings require interpretation; a passed crawl is not proof of Google indexation.'};
}catch(error) { evidence={state:'unavailable',collectedAt:new Date().toISOString(),error:error.message.slice(0,500)}; }
writeJson(path.join(STATE_DIR,'live-crawl.json'),evidence);
console.log(JSON.stringify({state:evidence.state,freshness:evidence.freshness,matchesCurrentDeployment:evidence.matchesCurrentDeployment}));
