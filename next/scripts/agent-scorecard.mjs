import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

export const digest = (value) => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const stamp = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const positive = (value) => Number.isFinite(value) && value > 0;
const natural = (value) => Number.isInteger(value) && value >= 0;
const median = (values) => { const a = [...values].sort((x,y)=>x-y); return a.length ? (a[Math.floor((a.length-1)/2)] + a[Math.floor(a.length/2)]) / 2 : null; };

/** Pure scoring boundary. Reviewer identities are supplied by the accountable owner,
 * never trusted because a receipt names them. Raw traces still require human or
 * independent-agent adjudication; structural validation cannot establish truth. */
export function scoreEvidence({ rubric, plan, evidence, expectedSourceSha, trustedReviewerIds = [], implementerIds = [], now = new Date().toISOString(), readArtifact }) {
  const errors = [], gaps = [], allTraces = new Set(), allSessions = new Set(), runIds = new Set();
  const require = (ok, message) => { if (!ok) errors.push(message); return Boolean(ok); };
  const time = Date.parse(now), age = rubric.requirements.maxEvidenceAgeDays * 86400000;
  const recent = (value) => stamp(value) && Date.parse(value) <= time && time - Date.parse(value) <= age;
  const artifact = (ref, label, unique = false) => {
    if (!ref || !sha(ref.sha256) || typeof ref.path !== 'string' || !ref.path) { errors.push(`${label}: missing artifact path/hash`); return false; }
    try {
      const bytes = readArtifact(ref.path);
      if (digest(bytes) !== ref.sha256) throw new Error('artifact hash mismatch');
      if (unique && allTraces.has(ref.sha256)) throw new Error('trace reused across independent invocations');
      if (unique) allTraces.add(ref.sha256);
      return true;
    } catch (error) { errors.push(`${label}: ${error.message}`); return false; }
  };
  const artifacts = (refs, label) => Array.isArray(refs) && refs.length > 0 && refs.map((ref)=>artifact(ref,label)).every(Boolean);
  require(Array.isArray(implementerIds) && implementerIds.length > 0, 'Implementer identities must be supplied to check review independence');
  require(stamp(rubric.frozenAt) && stamp(plan?.frozenAt) && Date.parse(plan.frozenAt) >= Date.parse(rubric.frozenAt), 'Evaluation plan must be frozen after this rubric version');
  require(stamp(now), 'Scoring time must be an ISO timestamp');
  require(/^[a-f0-9]{40}$/.test(expectedSourceSha || ''), 'Expected release SHA must be supplied independently');
  require(rubric.schemaVersion === '1.0' && rubric.id === 'pi-agent-experience-v1', 'Unsupported rubric version');
  require(rubric.categories.length === 10 && rubric.categories.every(c=>c.checks.length === 3) && new Set(rubric.categories.flatMap(c=>c.checks.map(k=>k.id))).size === 30, 'Rubric must contain ten categories and thirty unique checks');
  require(rubric.categories.reduce((n,c)=>n+c.weight,0) === 100, 'Rubric weights must total 100');
  require(evidence?.schemaVersion === '1.0', 'Unsupported evidence schema');
  require(evidence?.rubricSha256 === digest(rubric), 'Evidence belongs to another rubric');
  require(evidence?.planSha256 === digest(plan), 'Evidence belongs to another frozen evaluation plan');
  require(evidence?.sourceSha === expectedSourceSha, 'Evidence belongs to another release SHA');
  require(stamp(plan?.frozenAt) && Date.parse(plan.frozenAt) <= time, 'Evaluation plan needs a valid prior freeze timestamp');
  require(sha(plan?.taskManifestSha256) && sha(plan?.holdoutManifestSha256), 'Frozen baseline and private holdout manifest hashes are required');
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  const main = tasks.filter((t)=>/^B\d\d$/.test(t.id)), held = tasks.filter((t)=>/^H\d\d$/.test(t.id));
  require(main.length === 30 && held.length === 10 && tasks.length === 40 && new Set(tasks.map(t=>t.id)).size === 40, 'Frozen task denominator must contain 30 unique baseline and 10 unique holdout cases');
  require(tasks.every(t=>typeof t.critical === 'boolean' && ['simple','planning'].includes(t.kind) && positive(t.latencyBudgetMs)), 'Every frozen task needs critical status, kind and measured latency budget');
  require(rubric.requiredCriticalTaskIds.every(id=>tasks.some(t=>t.id===id && t.critical)), 'Frozen critical task inventory is incomplete');
  require(rubric.requiredPlanningTaskIds.every(id=>tasks.some(t=>t.id===id && t.kind==='planning')), 'Frozen planning task inventory is incomplete');
  require(Array.from({length:30},(_,i)=>`B${String(i+1).padStart(2,'0')}`).every(id=>main.some(t=>t.id===id)) && Array.from({length:10},(_,i)=>`H${String(i+1).padStart(2,'0')}`).every(id=>held.some(t=>t.id===id)), 'Task IDs must match the frozen baseline and holdout inventories');
  const stacks = Array.isArray(plan?.stacks) ? plan.stacks : [];
  require(stacks.length === 3 && new Set(stacks.map(s=>s.id)).size === 3, 'Exactly three unique stacks must be frozen');
  require(stacks.every(s=>s.execution === 'real-agent' && ['provider','model','modelVersion','client','browser','browserVersion','documentationUrl'].every(k=>typeof s[k] === 'string' && s[k].trim())), 'Stacks need actual agent/browser versions and execution documentation');
  require(new Set(stacks.map(s=>`${s.provider}/${s.model}/${s.client}`)).size === 3, 'Relabelled copies of one agent stack are not three stacks');
  const routes = Array.isArray(plan?.routeInventory) ? plan.routeInventory : [];
  require(routes.length > 0 && new Set(routes).size === routes.length && routes.every(r=>/^https:\/\/peninsulainsider\.com\.au\//.test(r)), 'A complete unique canonical route inventory must be frozen');
  const planValid = errors.length === 0;
  const evaluations = Array.isArray(evidence?.evaluations) ? evidence.evaluations : [];
  require(evaluations.length === 2, 'Two consecutive independent evaluations are required');
  const reviews = new Set(), runs = [];
  const expectedChecks = rubric.categories.flatMap(c=>c.checks.map(x=>x.id));
  for (const [index, run] of evaluations.slice(0,2).entries()) {
    const before = errors.length, label = `Evaluation ${index+1}`, passes = new Set(), keys = new Set();
    require(typeof run.id === 'string' && run.id && !runIds.has(run.id), `${label}: duplicate or missing run identity`); runIds.add(run.id);
    require(run.sourceSha === expectedSourceSha && run.deployedSha === expectedSourceSha, `${label}: source/deployment SHA mismatch`);
    require(recent(run.startedAt) && recent(run.completedAt) && Date.parse(run.startedAt) >= Date.parse(plan.frozenAt) && Date.parse(run.completedAt) >= Date.parse(run.startedAt), `${label}: stale, future or pre-freeze evaluation`);
    if (index) require(Date.parse(run.startedAt) > Date.parse(evaluations[index-1].completedAt), `${label}: evaluations must be consecutive fresh runs`);
    const reviewer = run.reviewerId;
    require(typeof reviewer === 'string' && trustedReviewerIds.includes(reviewer) && !implementerIds.includes(reviewer) && !reviews.has(reviewer), `${label}: reviewer is untrusted, duplicated or an implementer`); reviews.add(reviewer);
    require(artifact(run.reviewReceipt, `${label} independent review`), `${label}: independent review receipt unavailable`);
    require(run.environment === 'production' && run.evidenceKind === 'observed', `${label}: fixtures, simulations and replay receipts cannot certify production`);
    require(run.denominators?.baseline === 180 && run.denominators?.holdout === 10 && run.denominators?.checks === expectedChecks.length, `${label}: forged or incomplete denominators`);
    const checks = Array.isArray(run.checks) ? run.checks : [];
    require(new Set(checks.map(c=>c.id)).size === checks.length && checks.every(c=>expectedChecks.includes(c.id)), `${label}: unknown or duplicate category checks`);
    for (const check of checks) {
      if (!['pass','fail','unknown'].includes(check.status)) { errors.push(`${label}: invalid check status ${check.id}`); continue; }
      if (check.status === 'pass' && artifacts(check.artifacts,`${label}/${check.id}`)) passes.add(check.id);
    }
    const gates = Array.isArray(run.criticalGates) ? run.criticalGates : [];
    require(gates.length === rubric.criticalGates.length && new Set(gates.map(g=>g.id)).size === gates.length && gates.every(g=>rubric.criticalGates.includes(g.id)), `${label}: missing or duplicate critical gates`);
    let criticalPass = true;
    for (const gate of rubric.criticalGates) {
      const result = gates.find(g=>g.id === gate);
      if (!result || result.status !== 'pass' || !artifacts(result.artifacts,`${label}/${gate}`)) { criticalPass = false; gaps.push(`${label}: critical gate ${gate} unverified or failed`); }
    }
    const inventory = run.routeCoverage;
    require(inventory?.expected === routes.length && inventory?.checked === routes.length && Array.isArray(inventory?.urls) && inventory.urls.length === routes.length && new Set(inventory.urls).size === routes.length && routes.every(r=>inventory.urls.includes(r)) && inventory.failures === 0 && artifacts(inventory.artifacts,`${label}/routes`), `${label}: full route coverage missing`);
    const cases = Array.isArray(run.cases) ? run.cases : [];
    const successes = [], citationResults = [], savings = [];
    let criticalCasesPass = true, holdoutPass = true, metricPass = true;
    for (const item of cases) {
      const task = tasks.find(t=>t.id === item.taskId), stack = stacks.find(s=>s.id === item.stackId), prior = errors.length;
      const isHoldout = /^H/.test(item.taskId || ''), key = isHoldout ? item.taskId : `${item.taskId}/${item.stackId}/${item.repetition}`;
      require(task && stack && !keys.has(key), `${label}: unknown or duplicate task invocation ${key}`); keys.add(key);
      require(isHoldout ? item.repetition === 1 : [1,2].includes(item.repetition), `${label}/${key}: invalid repetition`);
      require(item.mode === (item.repetition === 1 ? 'cold' : 'welcome-assisted'), `${label}/${key}: discovery mode missing or incorrect`);
      require(typeof item.sessionId === 'string' && item.sessionId && !allSessions.has(item.sessionId) && item.freshSession === true, `${label}/${key}: session reused or not fresh`); allSessions.add(item.sessionId);
      require(item.kind === 'agent-task' && item.execution === 'real-agent' && item.environment === 'production', `${label}/${key}: HTTP probes/replays are not agent executions`);
      require(stamp(item.observedAt) && Date.parse(item.observedAt) >= Date.parse(run.startedAt) && Date.parse(item.observedAt) <= Date.parse(run.completedAt), `${label}/${key}: task time outside evaluation`);
      artifact(item.trace,`${label}/${key}`,true);
      const outcomes = ['answerCorrect','constraintsRespected','sourceFaithful','freshnessCorrect'];
      require(outcomes.every(k=>typeof item[k] === 'boolean') && natural(item.unsupportedClaims), `${label}/${key}: adjudicated outcomes missing`);
      const m = item.metrics;
      require(m && ['requests','bytes','inputTokens'].every(k=>Number.isInteger(m[k]) && m[k]>0) && natural(m.retries) && positive(m.elapsedMs) && positive(m.htmlBaselineTokens) && typeof m.materialParity === 'boolean', `${label}/${key}: measured task metrics missing`);
      require(Array.isArray(item.citations) && item.citations.length > 0 && item.citations.every(c=>typeof c.supportsClaim === 'boolean' && /^https:\/\/peninsulainsider\.com\.au\//.test(c.canonicalUrl)), `${label}/${key}: citation adjudication missing`);
      const valid = errors.length === prior;
      const success = valid && outcomes.every(k=>item[k]) && item.unsupportedClaims === 0 && item.citations.every(c=>c.supportsClaim);
      successes.push(success);
      if (task?.critical && !success) criticalCasesPass = false;
      if (isHoldout && !success) holdoutPass = false;
      if (valid) {
        citationResults.push(...item.citations.map(c=>c.supportsClaim));
        savings.push(1-m.inputTokens/m.htmlBaselineTokens);
        if (m.requests > (task.kind === 'planning' ? 5 : 3) || m.elapsedMs > task.latencyBudgetMs || !m.materialParity) metricPass = false;
      } else metricPass = false;
    }
    require(cases.length === 190 && keys.size === 190 && main.every(t=>stacks.every(s=>[1,2].every(rep=>keys.has(`${t.id}/${s.id}/${rep}`)))) && held.every(t=>keys.has(t.id)), `${label}: complete 180 + 10 task matrix missing`);
    const successRate = successes.filter(Boolean).length / 190;
    const citationRate = citationResults.length ? citationResults.filter(Boolean).length / citationResults.length : 0;
    const tokenReduction = median(savings);
    if (successRate < 0.95) gaps.push(`${label}: task success ${successes.filter(Boolean).length}/190 is below 95%`);
    if (citationRate < 0.99) { passes.delete('discovery-citations'); gaps.push(`${label}: citation accuracy below 99% or unmeasured`); }
    if (!holdoutPass || held.some(t=>!keys.has(t.id))) passes.delete('discovery-holdout');
    if (!metricPass) { passes.delete('efficiency-requests'); passes.delete('efficiency-latency'); }
    if (tokenReduction === null || tokenReduction < 0.5 || !metricPass) passes.delete('efficiency-tokens');
    if (!criticalCasesPass || !holdoutPass) gaps.push(`${label}: critical or holdout task failed`);
    const valid = planValid && errors.length === before;
    // Invalid receipts never earn credit. Valid but incomplete category evidence
    // uses the full frozen denominator and therefore earns only measured credit.
    runs.push({id:run.id,valid,passes:valid ? [...passes] : [], criticalPass:valid && criticalPass && criticalCasesPass, taskGate:valid && successRate >= 0.95 && citationRate >= 0.99 && holdoutPass && metricPass && tokenReduction >= 0.5, metrics:{successfulTasks:successes.filter(Boolean).length,expectedTasks:190,citationChecks:citationResults.length,citationAccuracy:citationRate,medianInputTokenReduction:tokenReduction}});
  }
  const categories = rubric.categories.map(c=> {
    const measuredPasses = runs.reduce((n,r)=>n+c.checks.filter(k=>r.passes.includes(k.id)).length,0), denominator=c.checks.length*2;
    return {id:c.id,name:c.name,weight:c.weight,passed:measuredPasses,denominator,score:c.weight*measuredPasses/denominator,missingOrFailed:c.checks.filter(k=>runs.length!==2 || runs.some(r=>!r.passes.includes(k.id))).map(k=>k.id)};
  });
  const score = categories.reduce((n,c)=>n+c.score,0);
  const eligible = errors.length === 0 && runs.length === 2 && runs.every(r=>r.criticalPass && r.taskGate) && score >= 99;
  return {schemaVersion:'1.0',evaluatedAt:now,sourceSha:expectedSourceSha,rubricId:rubric.id,rubricSha256:digest(rubric),planSha256:digest(plan),score:Number(score.toFixed(4)),target:99,accepted:eligible,decision:eligible?'adopt':'investigate',categories,evaluations:runs.map(({passes,...r})=>r),errors,gaps,coverage:{passedChecks:categories.reduce((n,c)=>n+c.passed,0),expectedChecks:60,expectedAgentInvocations:380,validatedAgentInvocations:runs.reduce((n,r)=>n+(r.valid?190:0),0)},externalOutcomes:{scored:false,metrics:evidence?.externalOutcomes ?? null},limitations:['This is a declared-scope score, not a probability of universal task success.','Reviewer allowlists validate assigned identity labels, not cryptographic identity. Independent review must authenticate execution and adjudicate raw evidence.']};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), arg=(name)=>args[args.indexOf(name)+1];
  if (!['--rubric','--plan','--evidence','--source-sha','--reviewers','--implementers','--artifact-root'].every(k=>args.includes(k))) {
    console.error('Usage: node scripts/agent-scorecard.mjs --rubric FILE --plan FILE --evidence FILE --source-sha SHA --reviewers id1,id2 --artifact-root DIR --implementers id1,id2 [--report FILE]'); process.exitCode=2;
  } else {
    const root=realpathSync(resolve(arg('--artifact-root'))), read=(name)=>JSON.parse(readFileSync(arg(name),'utf8'));
    const report=scoreEvidence({rubric:read('--rubric'),plan:read('--plan'),evidence:read('--evidence'),expectedSourceSha:arg('--source-sha'),trustedReviewerIds:arg('--reviewers').split(','),implementerIds:args.includes('--implementers')?arg('--implementers').split(','):[],readArtifact:(path)=>{
      const target=realpathSync(resolve(root,path)), rel=relative(root,target);
      if (isAbsolute(path) || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Artifact escapes the receipt root');
      return readFileSync(target,'utf8');
    }});
    if(args.includes('--report'))writeFileSync(arg('--report'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2)); process.exitCode=report.accepted?0:1;
  }
}
