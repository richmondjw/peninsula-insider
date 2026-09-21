// Bounded weekly sample through the already configured gateway web_search provider.
// No new credentials, account fallback, model choice or tool exposure changes.
import path from 'node:path';
import {STATE_DIR,readJson,writeJson,sha256} from '../lib/util.mjs';
import {normalizeSearch,discoveryRecord} from '../lib/discovery.mjs';
import {importObservations,visibilitySummary} from '../lib/visibility.mjs';
const file=path.join(STATE_DIR,'geo-benchmark.json');
let benchmark=readJson(file);
const statusFile=path.join(STATE_DIR,'discovery-status.json');
const status={observedAt:new Date().toISOString(),state:'unavailable',attempted:0,answers:0,searchResults:0,
  limitation:'Small rotating sample of the configured OpenClaw search provider; not all consumer AI platforms.'};
try {
  if(!benchmark?.questions?.length)throw Error('No benchmark');
  const cfg=readJson('/home/node/.openclaw/openclaw.json');
  const auth=cfg.gateway?.auth??{};
  const credential=auth.mode==='password'?(process.env.OPENCLAW_GATEWAY_PASSWORD??auth.password):(process.env.OPENCLAW_GATEWAY_TOKEN??auth.token);
  if(typeof credential!=='string'||!credential)throw Error('Existing gateway authentication unavailable');
  const selection=[...benchmark.questions].sort((a,b)=>(Date.parse(a.lastDiscoveryAttemptAt)||0)-(Date.parse(b.lastDiscoveryAttemptAt)||0)).slice(0,3);
  for(const q of selection) {
    status.attempted++;
    const at=new Date().toISOString();
    benchmark={...benchmark,questions:benchmark.questions.map(x=>x.id===q.id?{...x,lastDiscoveryAttemptAt:at}:x)};
    const response=await fetch(`http://127.0.0.1:${cfg.gateway?.port??18789}/tools/invoke`,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${credential}`},
      body:JSON.stringify({tool:'web_search',agentId:'main',args:{query:q.query}}),signal:AbortSignal.timeout(120000)});
    const envelope=await response.json();
    if(!response.ok||envelope.ok!==true)throw Error(`Configured search unavailable (HTTP ${response.status})`);
    const result=normalizeSearch(envelope.result);
    const relative=path.join('discovery-receipts',sha256(at+q.id)+'.json');
    writeJson(path.join(STATE_DIR,relative),{question:q.query,observedAt:at,result});
    const record=discoveryRecord(q,result,relative,at);
    if(record.kind==='ai_answer') {
      benchmark=importObservations(benchmark,[record]);status.answers++;
    } else {
      const history=readJson(path.join(STATE_DIR,'competitor-search.json'),{observations:[]});
      history.observations.push(record);history.observations=history.observations.slice(-1000);
      writeJson(path.join(STATE_DIR,'competitor-search.json'),history);status.searchResults++;
    }
  }
  status.state='observed';
}catch(error){status.error=error.message.startsWith('Configured search')?error.message:error.name;}
if(benchmark?.questions)writeJson(file,benchmark);
status.visibility=visibilitySummary(benchmark);
writeJson(statusFile,status);
console.log(JSON.stringify(status));
