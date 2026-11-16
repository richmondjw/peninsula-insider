import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { EVALUATOR_VERSION, hash, resolveFixture } from './evaluator.mjs';
const root=new URL('../../',import.meta.url),fixtureBytes=await readFile(new URL('./fixtures.v1.json',import.meta.url),'utf8');
const fixtureSet=JSON.parse(fixtureBytes);
const files=['ops/ask-pi-quality/evaluator.mjs','ops/ask-pi-quality/manifest.mjs','ops/ask-pi-quality/run.mjs','ops/ask-pi-quality/quality.test.mjs','ops/ask-pi-quality/current-corpus.test.mjs','ops/ask-pi-quality/fixtures.v1.json','ops/scripts/refresh-corpus.mjs','next/src/lib/event-discovery.mjs','next/src/lib/event-publication.mjs','next/src/lib/event-occurrence.mjs','next/src/lib/event-schedule.ts','next/src/lib/whatson-listing.mjs','next/src/lib/intelligence-series.mjs','next/src/lib/season.ts'];
const hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await readFile(new URL(file,root),'utf8'))])));
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().length>0;
let testLog='',testExitCode=0;
try {testLog=execFileSync(process.execPath,['--test','ops/ask-pi-quality/quality.test.mjs','ops/ask-pi-quality/current-corpus.test.mjs'],{cwd:root,encoding:'utf8'});}catch(error){testExitCode=Number(error.status??1);testLog=String(error.stdout??'')+String(error.stderr??'');}
const results=fixtureSet.cases.map(f=>{
  try {const observed=resolveFixture(f),actual={disposition:observed.disposition,ids:observed.matches.map(r=>r.id),season:observed.season};
    if(f.expected.durationHours!=null)actual.durationHours=(Date.parse(observed.matches[0]?.endsAt)-Date.parse(observed.matches[0]?.startsAt))/3600000;
    const pass=JSON.stringify(actual)===JSON.stringify(f.expected);
    return {id:f.id,tags:f.tags,pass,expected:f.expected,observed:actual};
  }catch(err){return {id:f.id,tags:f.tags,pass:false,error:String(err.message)};}
});
const categories={};for(const result of results)for(const tag of result.tags){categories[tag]??={total:0,passed:0};categories[tag].total++;categories[tag].passed+=Number(result.pass);}
const answerable=results.filter(r=>r.expected?.disposition==='answer'),abstention=results.filter(r=>['abstain','unavailable','clarify'].includes(r.expected?.disposition));
const report={schemaVersion:1,evaluatorVersion:EVALUATOR_VERSION,fixtureVersion:fixtureSet.fixtureVersion,candidateRevision:revision,dirty,artifactHashes:hashes,repeatTrials:1,costUsd:0,networkCalls:0,
  evaluatedSurface:'offline canonical-helper adapter with pre-resolved synthetic context; not production Ask PI',
  cases:results.length,passed:results.filter(r=>r.pass).length,answerable:{total:answerable.length,passed:answerable.filter(r=>r.pass).length},appropriateAbstention:{total:abstention.length,passed:abstention.filter(r=>r.pass).length},categories,results,
  gates:{codeTests:{exitCode:testExitCode,log:testLog,knownDefectReproductions:3},stagingInventoryIntegration:'not-run',independentExactHeadReview:'pending',liveBehaviourAndScheduledExecution:'not-run'},
  holdout:'not supplied; development fixtures are not a holdout',releaseEligible:false,
  untested:['natural-language parsing','generation/prose grounding','actual model injection resistance','live availability','database transaction/lock/crash durability','production cache invalidation','deployed API/UI','actual scheduled new implementation execution']};
const output=JSON.stringify(report,null,2)+'\n';
const at=process.argv.indexOf('--out');if(at>=0){if(!process.argv[at+1])throw new Error('--out requires a path');await writeFile(process.argv[at+1],output);}else process.stdout.write(output);
console.error(`${report.passed}/${report.cases} canonical-helper fixtures; ${report.answerable.passed}/${report.answerable.total} answerable; ${report.appropriateAbstention.passed}/${report.appropriateAbstention.total} abstention/context. Release eligible: false.`);
process.exitCode=testExitCode!==0||results.some(r=>!r.pass)?1:0;
