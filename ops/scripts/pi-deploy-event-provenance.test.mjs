import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDeploymentEvent, validateAdapterAcknowledgement, validateDeploymentProvenance,
} from './pi-deploy-event-provenance.mjs';

const SOURCE = '5b9a7f14d42a6b9db1f12fc38a94209a8825ebb3';
const ARTIFACT = '7496a0d1d2df86e496148994bf207b6270b8ac0a';

function fixture() {
  return {
    repository: 'richmondjw/peninsula-insider',
    deployment: { id: 6092420891, environment: 'github-pages', ref: 'gh-pages', sha: ARTIFACT },
    deploymentStatus: { id: 17326998599, state: 'success', environment: 'github-pages', created_at: '2026-08-25T21:25:21Z' },
    deploymentManifest: { sourceSha: SOURCE, runId: '32900519849', generatedAt: '2026-08-25T21:24:28.722Z' },
    releaseManifest: {
      schemaVersion: 1, sourceSha: SOURCE, buildRunId: '32900519849', generatedAt: '2026-08-25T21:24:29.107Z',
      verification: { expectedDeploymentSha: SOURCE },
    },
    artifactCommit: {
      sha: ARTIFACT,
      commit: { message: `deploy: ${SOURCE} — approved source`, committer: { date: '2026-08-25T21:24:38Z' } },
    },
    buildRun: {
      id: 32900519849, name: 'Build and Deploy — Peninsula Insider', path: '.github/workflows/build-and-deploy.yml',
      event: 'push', status: 'completed', conclusion: 'success', head_branch: 'main', head_sha: SOURCE,
      updated_at: '2026-08-25T21:24:44Z',
    },
  };
}

test('accepts the observed GitHub Pages chain and returns source separate from artifact', () => {
  const result = validateDeploymentProvenance(fixture());
  assert.equal(result.sourceSha, SOURCE);
  assert.equal(result.artifactSha, ARTIFACT);
  assert.notEqual(result.sourceSha, result.artifactSha);
});

test('never mistakes the gh-pages artifact commit for the source revision', () => {
  const value = fixture();
  value.deploymentManifest.sourceSha = ARTIFACT;
  value.releaseManifest.sourceSha = ARTIFACT;
  value.releaseManifest.verification.expectedDeploymentSha = ARTIFACT;
  value.buildRun.head_sha = ARTIFACT;
  value.artifactCommit.commit.message = `deploy: ${ARTIFACT} — forged`;
  assert.throws(() => validateDeploymentProvenance(value), /artifact SHA cannot be the source SHA/);
});

test('rejects manifest, commit and build-run provenance mismatches', () => {
  const manifestMismatch = fixture();
  manifestMismatch.releaseManifest.sourceSha = 'a'.repeat(40);
  assert.throws(() => validateDeploymentProvenance(manifestMismatch), /manifest sourceSha mismatch/);
  const commitMismatch = fixture();
  commitMismatch.artifactCommit.commit.message = `deploy: ${'a'.repeat(40)} — wrong`;
  assert.throws(() => validateDeploymentProvenance(commitMismatch), /commit does not bind/);
  const runMismatch = fixture();
  runMismatch.buildRun.head_sha = 'a'.repeat(40);
  assert.throws(() => validateDeploymentProvenance(runMismatch), /build run source SHA mismatch/);
});

test('rejects non-pages environments, refs, failed runs and stale provenance', () => {
  const wrongEnvironment = fixture();
  wrongEnvironment.deployment.environment = 'production';
  assert.throws(() => validateDeploymentProvenance(wrongEnvironment), /github-pages/);
  const wrongRef = fixture();
  wrongRef.deployment.ref = 'main';
  assert.throws(() => validateDeploymentProvenance(wrongRef), /gh-pages/);
  const failedRun = fixture();
  failedRun.buildRun.conclusion = 'failure';
  assert.throws(() => validateDeploymentProvenance(failedRun), /successfully/);
  const stale = fixture();
  stale.deploymentManifest.generatedAt = '2026-08-25T20:24:28Z';
  assert.throws(() => validateDeploymentProvenance(stale), /temporal bound/);
});

test('emits deterministic d792-compatible checks pinned to the source revision', () => {
  const value = fixture();
  const provenance = validateDeploymentProvenance(value);
  const event = buildDeploymentEvent({
    env: { PI_REPOSITORY: value.repository },
    deployment: value.deployment,
    deploymentStatus: value.deploymentStatus,
    provenance,
  });
  assert.deepEqual(event.check_definitions, [
    { id: 'homepage', url: 'https://peninsulainsider.com.au/', expected_status: 200 },
    { id: 'deployment-provenance', url: 'https://peninsulainsider.com.au/deployment.json', expected_status: 200, required_text: `"sourceSha": "${SOURCE}"` },
    { id: 'release-provenance', url: 'https://peninsulainsider.com.au/release-manifest.json', expected_status: 200, required_text: `"sourceSha": "${SOURCE}"` },
  ]);
});

test('requires the exact newly-admitted adapter acknowledgement', () => {
  assert.deepEqual(
    validateAdapterAcknowledgement('202', '{"status":"ignored_binding_disabled","replayed":false}'),
    { status: 'ignored_binding_disabled', replayed: false },
  );
  assert.deepEqual(
    validateAdapterAcknowledgement('202', '{"status":"invoked_succeeded","replayed":false}'),
    { status: 'invoked_succeeded', replayed: false },
  );
  assert.throws(() => validateAdapterAcknowledgement('200', '{"status":"invoked_succeeded","replayed":false}'), /must be 202/);
  assert.throws(() => validateAdapterAcknowledgement('202', '{"status":"processing","replayed":true}'), /newly admitted/);
  assert.throws(() => validateAdapterAcknowledgement('202', '{"status":"ignored_binding_disabled","replayed":false,"extra":1}'), /shape drift/);
});
