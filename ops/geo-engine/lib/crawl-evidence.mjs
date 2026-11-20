// Acceptance is tied to the observed deployment, not the workflow checkout SHA.
export function assessCrawl(report, deployment, now = Date.now()) {
  const summary = report?.summary;
  const age = now - Date.parse(summary?.finishedAt);
  const freshness = Number.isFinite(age) && age >= 0 && age < 36 * 3600000 ? 'fresh' : 'stale';
  const sha = deployment?.sourceSha;
  const matchesCurrentDeployment = Boolean(/^[a-f0-9]{40}$/.test(sha ?? '') &&
    summary?.target === 'live' && summary?.deploymentBefore?.sourceSha === sha &&
    summary?.deploymentAfter?.sourceSha === sha);
  const diagnosticReady = report?.state === 'available' && freshness === 'fresh' && matchesCurrentDeployment;
  const accepted = diagnosticReady && report?.run?.conclusion === 'success' && summary?.status === 'passed';
  return {freshness, matchesCurrentDeployment, diagnosticReady, accepted};
}

export function refreshDecision(prior, deploymentSha, runs, now = Date.now()) {
  const active = runs.find(r => r.status !== 'completed');
  if (active) return {action:'wait', runId:active.databaseId};
  if (prior?.deploymentSha !== deploymentSha || !prior?.requestedAt) return {action:'dispatch'};
  if (prior.status === 'failed' || runs.some(r => r.status === 'completed' && Date.parse(r.createdAt) >= Date.parse(prior.requestedAt)))
    return {action:'fail', reason:'Refreshed audit did not produce deployment-matched evidence'};
  if (now - Date.parse(prior.requestedAt) < 120000) return {action:'wait'};
  return {action:'fail', reason:'Dispatch receipt not visible; inspect original intent before retrying'};
}
