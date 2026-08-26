import { createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_SHA = /^[0-9a-f]{40}$/;
const RUN_ID = /^[1-9][0-9]{1,30}$/;
const MAX_BUILD_TO_DEPLOY_MS = 15 * 60 * 1000;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function instant(value, label) {
  const parsed = new Date(value);
  invariant(!Number.isNaN(parsed.getTime()), `${label} is not an ISO timestamp`);
  return parsed;
}

export function validateDeploymentProvenance({
  repository,
  deployment,
  deploymentStatus,
  deploymentManifest,
  releaseManifest,
  artifactCommit,
  buildRun,
}) {
  invariant(repository === 'richmondjw/peninsula-insider', 'repository is not approved');
  invariant(deployment?.environment === 'github-pages', 'deployment environment is not github-pages');
  invariant(deployment?.ref === 'gh-pages', 'deployment ref is not gh-pages');
  invariant(SOURCE_SHA.test(deployment?.sha || ''), 'deployment artifact SHA is invalid');
  invariant(deploymentStatus?.state === 'success', 'deployment status is not successful');
  invariant(deploymentStatus?.environment === 'github-pages', 'deployment-status environment is not github-pages');

  invariant(SOURCE_SHA.test(deploymentManifest?.sourceSha || ''), 'deployment manifest sourceSha is invalid');
  invariant(SOURCE_SHA.test(releaseManifest?.sourceSha || ''), 'release manifest sourceSha is invalid');
  invariant(deploymentManifest.sourceSha === releaseManifest.sourceSha, 'live manifest sourceSha mismatch');
  invariant(deploymentManifest.sourceSha !== deployment.sha, 'gh-pages artifact SHA cannot be the source SHA');
  invariant(RUN_ID.test(String(deploymentManifest?.runId || '')), 'deployment manifest runId is invalid');
  invariant(String(deploymentManifest.runId) === String(releaseManifest?.buildRunId || ''), 'live manifest build run mismatch');
  invariant(releaseManifest?.schemaVersion === 1, 'release manifest schema drift');
  invariant(releaseManifest?.verification?.expectedDeploymentSha === deploymentManifest.sourceSha, 'release verification source SHA drift');

  invariant(artifactCommit?.sha === deployment.sha, 'artifact commit SHA does not match deployment');
  const sourceFromCommit = String(artifactCommit?.commit?.message || '').match(/^deploy: ([0-9a-f]{40})(?:\s|—|-)/)?.[1];
  invariant(sourceFromCommit === deploymentManifest.sourceSha, 'gh-pages commit does not bind the live source SHA');

  invariant(String(buildRun?.id || '') === String(deploymentManifest.runId), 'build run id does not match live manifests');
  invariant(buildRun?.name === 'Build and Deploy — Peninsula Insider', 'build workflow name drift');
  invariant(buildRun?.path === '.github/workflows/build-and-deploy.yml', 'build workflow path drift');
  invariant(buildRun?.head_branch === 'main', 'build run was not sourced from main');
  invariant(buildRun?.head_sha === deploymentManifest.sourceSha, 'build run source SHA mismatch');
  invariant(buildRun?.status === 'completed' && buildRun?.conclusion === 'success', 'build run did not complete successfully');
  invariant(['push', 'schedule', 'workflow_dispatch'].includes(buildRun?.event), 'build trigger is not approved');

  const statusAt = instant(deploymentStatus.created_at, 'deployment status created_at');
  const deploymentGeneratedAt = instant(deploymentManifest.generatedAt, 'deployment manifest generatedAt');
  const releaseGeneratedAt = instant(releaseManifest.generatedAt, 'release manifest generatedAt');
  const commitAt = instant(artifactCommit?.commit?.committer?.date, 'artifact commit date');
  const buildCompletedAt = instant(buildRun.updated_at, 'build run updated_at');
  for (const [label, value] of [
    ['deployment manifest', deploymentGeneratedAt],
    ['release manifest', releaseGeneratedAt],
    ['artifact commit', commitAt],
    ['build completion', buildCompletedAt],
  ]) {
    const delta = statusAt.getTime() - value.getTime();
    invariant(delta >= -60_000 && delta <= MAX_BUILD_TO_DEPLOY_MS, `${label} is outside the deployment temporal bound`);
  }

  return {
    sourceSha: deploymentManifest.sourceSha,
    artifactSha: deployment.sha,
    buildRunId: String(deploymentManifest.runId),
    deployedAt: statusAt.toISOString(),
    deploymentManifestGeneratedAt: deploymentGeneratedAt.toISOString(),
    releaseManifestGeneratedAt: releaseGeneratedAt.toISOString(),
    artifactCommitAt: commitAt.toISOString(),
    buildCompletedAt: buildCompletedAt.toISOString(),
  };
}

async function fetchJson(url, { token } = {}) {
  const headers = { accept: 'application/json', 'cache-control': 'no-cache' };
  if (token) {
    headers.authorization = `Bearer ${token}`;
    headers['x-github-api-version'] = '2022-11-28';
  }
  const response = await fetch(url, { headers, redirect: 'error' });
  if (!response.ok) throw new Error(`provenance fetch failed HTTP ${response.status}: ${new URL(url).origin}${new URL(url).pathname}`);
  return response.json();
}

export async function emitSignedDeploymentEvent(env = process.env) {
  invariant(env.PI_REPOSITORY === 'richmondjw/peninsula-insider', 'repository is not approved');
  invariant(Buffer.byteLength(env.PI_EVENT_HMAC_SECRET || '') >= 32, 'event HMAC secret must contain at least 32 bytes');
  invariant(env.GITHUB_TOKEN, 'GITHUB_TOKEN is required for provenance validation');
  const deployment = {
    id: env.PI_DEPLOYMENT_ID,
    environment: env.PI_DEPLOYMENT_ENVIRONMENT,
    ref: env.PI_DEPLOYMENT_REF,
    sha: String(env.PI_DEPLOYMENT_ARTIFACT_SHA || '').toLowerCase(),
  };
  const deploymentStatus = {
    id: env.PI_DEPLOYMENT_STATUS_ID,
    state: env.PI_DEPLOYMENT_STATUS_STATE,
    environment: env.PI_DEPLOYMENT_STATUS_ENVIRONMENT,
    created_at: env.PI_DEPLOYED_AT,
  };
  const cacheKey = encodeURIComponent(String(deploymentStatus.id || deployment.id));
  const [deploymentManifest, releaseManifest] = await Promise.all([
    fetchJson(`https://peninsulainsider.com.au/deployment.json?pi_deployment=${cacheKey}`),
    fetchJson(`https://peninsulainsider.com.au/release-manifest.json?pi_deployment=${cacheKey}`),
  ]);
  invariant(RUN_ID.test(String(deploymentManifest?.runId || '')), 'deployment manifest runId is invalid');
  const [artifactCommit, buildRun] = await Promise.all([
    fetchJson(`https://api.github.com/repos/${env.PI_REPOSITORY}/commits/${deployment.sha}`, { token: env.GITHUB_TOKEN }),
    fetchJson(`https://api.github.com/repos/${env.PI_REPOSITORY}/actions/runs/${deploymentManifest.runId}`, { token: env.GITHUB_TOKEN }),
  ]);
  const provenance = validateDeploymentProvenance({
    repository: env.PI_REPOSITORY,
    deployment,
    deploymentStatus,
    deploymentManifest,
    releaseManifest,
    artifactCommit,
    buildRun,
  });
  const event = {
    schema_version: '1.0',
    event: 'production_deploy_succeeded',
    repository: env.PI_REPOSITORY,
    environment: 'github-pages',
    deployment_ref: 'gh-pages',
    status: 'succeeded',
    deployment_id: String(deployment.id),
    deployment_status_id: String(deploymentStatus.id),
    revision: provenance.sourceSha,
    deployment_artifact_revision: provenance.artifactSha,
    build_run_id: provenance.buildRunId,
    deployed_at: provenance.deployedAt,
    provenance: {
      deployment_manifest_source_sha: provenance.sourceSha,
      release_manifest_source_sha: provenance.sourceSha,
      build_run_head_sha: provenance.sourceSha,
      deployment_manifest_generated_at: provenance.deploymentManifestGeneratedAt,
      release_manifest_generated_at: provenance.releaseManifestGeneratedAt,
      artifact_commit_at: provenance.artifactCommitAt,
      build_completed_at: provenance.buildCompletedAt,
    },
    check_definitions: [
      { url: 'https://peninsulainsider.com.au/', expected_status: 200 },
      { url: 'https://peninsulainsider.com.au/deployment.json', expected_status: 200 },
      { url: 'https://peninsulainsider.com.au/release-manifest.json', expected_status: 200 },
    ],
  };
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `sha256=${createHmac('sha256', env.PI_EVENT_HMAC_SECRET).update(`${timestamp}.${body}`).digest('hex')}`;
  const root = path.join(env.RUNNER_TEMP, 'pi-runtime-event');
  await mkdir(root, { recursive: true, mode: 0o700 });
  await writeFile(path.join(root, 'event.json'), body, { mode: 0o600, flag: 'wx' });
  await writeFile(path.join(root, 'headers'), `${timestamp}\n${signature}\n`, { mode: 0o600, flag: 'wx' });
  return { event, root };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  emitSignedDeploymentEvent().then(({ event }) => {
    process.stdout.write(`${JSON.stringify({ status: 'signed', source_revision: event.revision, artifact_revision: event.deployment_artifact_revision, build_run_id: event.build_run_id })}\n`);
  }).catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: 'rejected', error: String(error?.message || error).slice(0, 500) })}\n`);
    process.exitCode = 1;
  });
}
