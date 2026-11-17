export function validDeployment(value) {
  return /^[a-f0-9]{40}$/.test(value?.sourceSha ?? '') &&
    /^\d+$/.test(String(value?.runId ?? '')) &&
    typeof value?.generatedAt === 'string' && Number.isFinite(Date.parse(value.generatedAt));
}

export function sameDeployment(before, after) {
  return validDeployment(before) && validDeployment(after) &&
    ['sourceSha', 'runId', 'generatedAt'].every(key => before[key] === after[key]);
}

// A changed release is evidence of an inconclusive observation, never acceptance.
// Only explicitly tagged cross-release consistency checks may permit a fresh audit.
export function classifyAudit(report) {
  if (report?.complete !== true) return 'incomplete';
  if (!validDeployment(report.deploymentBefore) || !validDeployment(report.deploymentAfter)) return 'invalid-provenance';
  const changed = !sameDeployment(report.deploymentBefore, report.deploymentAfter);
  const failures = report.failures;
  const details = report.failureDetails;
  const attempts = report.transport?.attempts;
  if (!Array.isArray(attempts) || attempts.length === 0 ||
      attempts.some(item => !item || typeof item !== 'object' || Array.isArray(item)) ||
      !Array.isArray(failures) || !Array.isArray(details) || failures.length !== details.length ||
      details.some((item, index) => item?.message !== failures[index])) return 'invalid-evidence';
  if (!changed) return failures.length ? 'gate-failure' : 'passed';
  if (!details.some(item => item.category === 'deployment-change') ||
      details.some(item => !['deployment-change', 'release-consistency'].includes(item.category)) ||
      attempts.some(item => item.error || [429, 503].includes(item.status))) return 'deployment-change-with-other-failures';
  return 'deployment-change-inconclusive';
}
