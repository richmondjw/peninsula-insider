import path from 'node:path';
import {submitRelease,advanceRelease} from '../lib/release.mjs';
import {STATE_DIR,readJson,writeJson,writeText} from '../lib/util.mjs';
const mode=process.argv[2]??'resume';
let receipt;
if(mode==='submit') {
  const latest=readJson(path.join(STATE_DIR,'latest-run.json'));
  if(!latest || latest.errors.length || Date.now()-Date.parse(latest.completedAt)>2*3600000) throw Error('No fresh successful audit');
  const run=readJson(path.join(latest.runDir,'summary.json'));
  receipt=submitRelease(run,readJson(process.env.GSC_ANALYTICS_JSON));
}
const deadline=Date.now()+Number(process.env.PI_GEO_RELEASE_WAIT_MS??900000);
do {
  receipt=await advanceRelease()??receipt;
  console.log(JSON.stringify({at:new Date().toISOString(),release:receipt?.status??'none',pr:receipt?.prUrl}));
  if(!receipt || ['verified','rolled_back','rejected','no_changes'].includes(receipt.status)) break;
  if(['rollback_failed','prepared'].includes(receipt.status)) throw Error(`Release needs reconciliation: ${receipt.status}`);
  if(Date.now()>=deadline) break;
  await new Promise(resolve=>setTimeout(resolve,30000));
}while(true);
writeJson(path.join(STATE_DIR,'latest-outcome.json'),{observedAt:new Date().toISOString(),release:receipt??null});
writeText(path.join(STATE_DIR,'latest-outcome.txt'),`Peninsula Insider autonomous SEO\nStatus: ${receipt?.status??'no pending release'}\nChanges: ${receipt?.changes?.length??0}\nPR: ${receipt?.prUrl??'none'}\nDeployed SHA: ${receipt?.mergeSha??'not deployed'}\nLive verified: ${receipt?.deployedAt??'not yet'}\nSearch effects require a complete post-deployment measurement window.\n`);
if(receipt && (receipt.status==='rollback_failed' || mode==='submit' && ['rejected','rolled_back'].includes(receipt.status))) process.exitCode=2;
else if(receipt && !['verified','no_changes','rejected','rolled_back'].includes(receipt.status)) process.exitCode=10;
