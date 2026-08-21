import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { loadRuntimeConfig } from '../server/config.js';
import { artifactDependenciesCurrent, assertArtifactPublicLineage, buildArtifactHandoff, buildPatch, evaluateArtifactGates, evaluateQuickNoteGates, hashValue, runFixture, runUrlArticleFixture, validateNewFilePatch, withArtifactHash } from '../server/fixture-runner.js';
import { FileFoundryStore } from '../server/store.js';
import { buildLegacyReviewReceipt, FileReviewReceiptRepository } from '../server/review-receipts.js';
import { ClaimSchema, LegacySingleArtifactRealUrlRunV2Schema, StoryAngleSchema, type ArtifactVersion, type FoundryRun } from '../shared/contracts.js';
import { patchReadiness } from '../shared/patch-readiness.js';
import { nextArtifactTabIndex } from '../shared/artifact-tabs.js';

const temporaryDirectories: string[] = [];

async function harness() {
  const directory = await mkdtemp(join(tmpdir(), 'pi-foundry-'));
  temporaryDirectories.push(directory);
  const file = join(directory, 'runs.json');
  const store = new FileFoundryStore(file, directory);
  return { directory, file, store, app: createApp(store) };
}

function completed(run: FoundryRun, type: ArtifactVersion['type']): ArtifactVersion {
  const artifact = run.artifactPack.completed.find((candidate) => candidate.type === type);
  if (!artifact) throw new Error(`Missing ${type}`);
  return artifact;
}

async function expectGitApplyCheck(patch: string) {
  const repositoryRoot = await mkdtemp(join(tmpdir(), 'pi-foundry-git-apply-'));
  temporaryDirectories.push(repositoryRoot);
  const initialised = spawnSync('git', ['init', '--quiet'], { cwd: repositoryRoot, encoding: 'utf8' });
  expect(initialised.status, initialised.stderr || initialised.stdout).toBe(0);
  const targets = [...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((match) => match[1]);
  expect(targets.length).toBeGreaterThan(0);
  await Promise.all(targets.map((target) => mkdir(dirname(join(repositoryRoot, target)), { recursive: true })));
  const result = spawnSync('git', ['apply', '--check', '--whitespace=error-all', '-'], { cwd: repositoryRoot, input: patch, encoding: 'utf8' });
  expect(result.status, result.stderr || result.stdout).toBe(0);
}

async function reviewArtifact(app: ReturnType<typeof createApp>, run: FoundryRun, artifact: ArtifactVersion, decision: 'accepted' | 'rejected' = 'accepted') {
  const response = await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
    artifactId: artifact.id,
    decision,
    reviewer: 'test-editor',
    expectedVersion: run.version,
    expectedArtifactVersion: artifact.version,
  }).expect(200);
  return response.body as FoundryRun;
}

function legacySnapshot(run: FoundryRun) {
  if (!run.artifact || !run.claims) throw new Error('Quick-note compatibility projection missing');
  return {
    id: run.id,
    idempotencyKey: run.idempotencyKey,
    version: run.version,
    status: run.status,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    bundle: run.bundle,
    claims: run.claims,
    angle: {
      id: run.angle.id,
      label: run.angle.label,
      framing: run.angle.framing,
      evidenceClaimIds: run.angle.evidenceClaimIds,
      selectedBy: run.angle.selectedBy,
    },
    artifact: {
      id: run.artifact.id,
      version: run.artifact.version,
      type: 'quick_note',
      claimIds: run.artifact.claimIds,
      angleId: run.artifact.angleId,
      payload: run.artifact.payload,
      gateResults: run.artifact.gateResults
        .filter((gate) => ['no_price', 'no_em_dash', 'supported_claims_only'].includes(gate.gate))
        .map(({ gate, passed, detail }) => ({ gate, passed, detail })),
    },
    blockers: run.blockers,
    review: run.review,
    audit: run.audit,
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('generic Content Foundry contracts', () => {
  it('implements wrapping arrow and boundary keyboard movement for artifact tabs', () => {
    expect(nextArtifactTabIndex(0, 6, 'ArrowLeft')).toBe(5);
    expect(nextArtifactTabIndex(5, 6, 'ArrowRight')).toBe(0);
    expect(nextArtifactTabIndex(3, 6, 'Home')).toBe(0);
    expect(nextArtifactTabIndex(1, 6, 'End')).toBe(5);
  });
  it('preserves the v0.1 quick-note API projection and idempotency', async () => {
    const { app } = await harness();
    const payload = { fixtureId: 'red-hill-winter-lunch', actor: 'test-editor', idempotencyKey: 'same-source-v2' };
    const first = await request(app).post('/api/foundry/runs').send(payload).expect(201);
    const replay = await request(app).post('/api/foundry/runs').send(payload).expect(200);

    expect(replay.body.id).toBe(first.body.id);
    expect(first.body.schemaVersion).toBe('pi.foundry-run.v3');
    expect(first.body.recipe.id).toBe('quick_note_v1');
    expect(first.body.claims).toEqual(first.body.claimSet.claims);
    expect(first.body.artifact.type).toBe('quick_note');
    expect(first.body.artifact.claimIds).not.toContain('claim-unsupported');
    expect(first.body.artifact.claimIds).not.toContain('claim-expired');
    expect(first.body.artifact.claimIds).not.toContain('claim-price');
    expect(first.body.artifactPack.completed).toHaveLength(1);
  });

  it('derives price, style, claim-support and expiry gates', () => {
    const run = runFixture('test-editor', 'style-law-v2');
    if (!run.artifact) throw new Error('Quick-note artifact missing');
    const claims = run.claimSet.claims;
    const enDash = evaluateQuickNoteGates({ headline: 'Open 9–11am', body: 'A supported range.' }, claims, run.artifact.claimIds);
    const emDash = evaluateQuickNoteGates({ headline: 'Open today — bookings required', body: 'A supported note.' }, claims, run.artifact.claimIds);
    const restricted = evaluateQuickNoteGates(run.artifact.payload, claims, [...run.artifact.claimIds, 'claim-price']);
    const expired = evaluateArtifactGates(
      { answer: 'The preview ran on Friday 14 August.' },
      claims,
      ['expired-answer'],
      [{ segmentId: 'expired-answer', path: '$.answer', claimIds: ['claim-expired'], contentHash: hashValue('The preview ran on Friday 14 August.') }],
      '2026-08-21T05:00:00.000Z',
    );

    expect(enDash.find((gate) => gate.gate === 'no_em_dash')?.passed).toBe(true);
    expect(emDash.find((gate) => gate.gate === 'no_em_dash')?.passed).toBe(false);
    expect(restricted.find((gate) => gate.gate === 'no_price')?.passed).toBe(true);
    expect(restricted.find((gate) => gate.gate === 'supported_claims_only')?.passed).toBe(false);
    expect(expired.find((gate) => gate.gate === 'supported_claims_only')?.passed).toBe(false);
  });

  it('loads legacy v0.1 persisted snapshots into deterministic artifact packs across restart', async () => {
    const { directory, file } = await harness();
    const legacy = legacySnapshot(runFixture('legacy-editor', 'legacy-store-v1'));
    const legacyPriceGate = legacy.artifact.gateResults.find((gate) => gate.gate === 'no_price');
    if (!legacyPriceGate) throw new Error('Legacy price gate missing');
    legacyPriceGate.passed = false;
    legacy.status = 'ready_for_review';
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v1', runs: [legacy] })}\n`, 'utf8');

    const firstRestart = new FileFoundryStore(file, directory);
    const migrated = await firstRestart.get(legacy.id);
    const secondRestart = new FileFoundryStore(file, directory);
    const migratedAgain = await secondRestart.get(legacy.id);

    expect(migrated?.schemaVersion).toBe('pi.foundry-run.v3');
    expect(migrated?.status).toBe('needs_revision');
    expect(migrated?.artifactPack.completed[0].id).toBe(legacy.artifact.id);
    expect(migrated?.claimSet.contentHash).toBe(migratedAgain?.claimSet.contentHash);
    expect(migrated?.artifactPack.completed[0].contentHash).toBe(migratedAgain?.artifactPack.completed[0].contentHash);
    expect(migrated?.audit.at(-1)?.type).toMatch(/(?:legacy_run|single_artifact_schema)_migrated/);
  });

  it('reads artifact-pack v2 and writes explicit file-store v3 on the first mutation', async () => {
    const { directory, file } = await harness();
    const current = runUrlArticleFixture('legacy-editor', 'legacy-pack-v2', { omitPlans: true });
    const legacyPack = {
      ...current,
      schemaVersion: 'pi.foundry-run.v2',
      evaluationAsOf: undefined,
      artifactPack: {
        ...current.artifactPack,
        schemaVersion: 'pi.artifact-pack.v1',
        completed: current.artifactPack.completed.map(({ publicFieldLineage: _lineage, ...artifact }) => artifact),
      },
    };
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v1', runs: [legacyPack] })}\n`, 'utf8');
    const store = new FileFoundryStore(file, directory, undefined, () => '2026-08-21T06:00:00.000Z');
    const migrated = await store.get(current.id);
    expect(migrated).toMatchObject({ schemaVersion: 'pi.foundry-run.v3', artifactPack: { schemaVersion: 'pi.artifact-pack.v2' } });
    expect(migrated?.artifactPack.completed.every((artifact) => artifact.publicFieldLineage.length > 0)).toBe(true);
    if (!migrated) throw new Error('Migrated pack missing');
    const article = completed(migrated, 'article_draft');
    await store.review(migrated.id, {
      artifactId: article.id, expectedArtifactVersion: article.version,
      decision: 'accepted', reviewer: 'migration-reviewer', expectedVersion: migrated.version,
    });
    expect(JSON.parse(await readFile(file, 'utf8')).schemaVersion).toBe('pi.foundry-file-store.v3');
  });

  it('migrates #325 sealed receipts as historical and unsealed reviews as legacy stale', async () => {
    const { directory, file } = await harness();
    const snapshot = legacySnapshot(runFixture('legacy-editor', 'legacy-single-v2'));
    snapshot.version = 2;
    const decidedAt = '2026-08-21T05:30:00.000Z';
    const sealedDraft = LegacySingleArtifactRealUrlRunV2Schema.parse({
      ...snapshot,
      review: { decision: 'accepted', reviewer: 'legacy-reviewer', decidedAt, receiptHash: '0'.repeat(64) },
      reviewHistory: [{ decision: 'accepted', reviewer: 'legacy-reviewer', decidedAt, receiptHash: '0'.repeat(64), validity: 'current' }],
    });
    const receipts = new FileReviewReceiptRepository(join(directory, 'review-receipts'), directory);
    const receiptHash = await receipts.put(buildLegacyReviewReceipt(sealedDraft));
    const sealed = LegacySingleArtifactRealUrlRunV2Schema.parse({
      ...sealedDraft,
      review: { ...sealedDraft.review, receiptHash },
      reviewHistory: sealedDraft.reviewHistory.map((review) => ({ ...review, receiptHash })),
    });
    const unsealedSnapshot = legacySnapshot(runFixture('legacy-editor', 'legacy-single-v2-unsealed'));
    const unsealed = LegacySingleArtifactRealUrlRunV2Schema.parse({
      ...unsealedSnapshot,
      review: undefined,
      reviewHistory: [{ decision: 'accepted', reviewer: 'legacy-reviewer', decidedAt, validity: 'current' }],
    });
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v2', runs: [sealed, unsealed], captureProjections: [] })}\n`, 'utf8');

    const store = new FileFoundryStore(file, directory, undefined, () => '2026-08-21T06:00:00.000Z');
    const [migratedSealed, migratedUnsealed] = await Promise.all([store.get(sealed.id), store.get(unsealed.id)]);
    expect(migratedSealed?.artifactPack.reviews[0]).toMatchObject({ status: 'stale', staleReason: 'schema_migrated', receiptHash });
    expect(migratedUnsealed?.artifactPack.reviews[0]).toMatchObject({ status: 'stale', staleReason: 'legacy_unsealed' });
    expect(migratedUnsealed?.artifactPack.reviews[0].receiptHash).toBeUndefined();
  });

  it('preserves a sealed artifact v1 review when the legacy current artifact is v2', async () => {
    const { directory, file } = await harness();
    const snapshot = legacySnapshot(runFixture('legacy-editor', 'legacy-stale-v1-current-v2'));
    snapshot.version = 2;
    const decidedAt = '2026-08-21T05:10:00.000Z';
    const reviewed = LegacySingleArtifactRealUrlRunV2Schema.parse({
      ...snapshot,
      artifact: { ...snapshot.artifact, version: 1 },
      review: { decision: 'accepted', reviewer: 'legacy-reviewer', decidedAt, receiptHash: '0'.repeat(64) },
      reviewHistory: [],
    });
    const receipts = new FileReviewReceiptRepository(join(directory, 'review-receipts'), directory);
    const receiptHash = await receipts.put(buildLegacyReviewReceipt(reviewed));
    const currentPayload = { ...snapshot.artifact.payload, body: `${snapshot.artifact.payload.body}\n\nEditor clarification.` };
    const current = LegacySingleArtifactRealUrlRunV2Schema.parse({
      ...snapshot,
      version: 3,
      status: 'ready_for_review',
      artifact: { ...snapshot.artifact, version: 2, payload: currentPayload },
      review: undefined,
      reviewHistory: [{
        decision: 'accepted', reviewer: 'legacy-reviewer', decidedAt, receiptHash,
        validity: 'stale', staleReason: 'artifact_edited', staledAt: '2026-08-21T05:20:00.000Z',
      }],
    });
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v2', runs: [current], captureProjections: [] })}\n`, 'utf8');

    const store = new FileFoundryStore(file, directory, undefined, () => '2026-08-21T06:00:00.000Z');
    const migrated = await store.get(current.id);
    const historicalReview = migrated?.artifactPack.reviews[0];
    expect(historicalReview).toMatchObject({
      artifactVersion: 1, receiptHash, status: 'stale', staleReason: 'schema_migrated',
      staledAt: '2026-08-21T05:20:00.000Z',
    });
    const historicalAngle = StoryAngleSchema.parse({ ...reviewed.angle, version: 1 });
    expect(historicalReview?.dependencySnapshot).toEqual([{
      kind: 'angle', id: reviewed.angle.id, version: 1, contentHash: hashValue(historicalAngle),
    }]);
    expect(historicalReview?.dependencySnapshot).not.toEqual(migrated?.artifactPack.completed[0].dependencies);

    await store.create(runFixture('migration-writer', 'persist-migrated-v3'));
    const persisted = JSON.parse(await readFile(file, 'utf8')) as { schemaVersion: string; runs: FoundryRun[] };
    expect(persisted.schemaVersion).toBe('pi.foundry-file-store.v3');
    const persistedLegacy = persisted.runs.find((run) => run.id === current.id);
    if (!persistedLegacy) throw new Error('Persisted migrated run missing');
    persistedLegacy.artifactPack.reviews[0].artifactVersion = 2;
    await writeFile(file, `${JSON.stringify(persisted)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory).get(current.id)).rejects.toThrow(/historical review/i);
  });

  it('rejects legacy sealed history newer than the current artifact or conflicting at the same version', async () => {
    const { directory, file } = await harness();
    const base = legacySnapshot(runFixture('legacy-editor', 'legacy-unreconcilable-history'));
    base.version = 3;
    const decidedAt = '2026-08-21T05:10:00.000Z';
    const receipts = new FileReviewReceiptRepository(join(directory, 'review-receipts'), directory);
    const sealedHistory = async (artifactVersion: number, payload = base.artifact.payload) => {
      const reviewed = LegacySingleArtifactRealUrlRunV2Schema.parse({
        ...base,
        artifact: { ...base.artifact, version: artifactVersion, payload },
        review: { decision: 'accepted', reviewer: 'legacy-reviewer', decidedAt, receiptHash: '0'.repeat(64) },
        reviewHistory: [],
      });
      return receipts.put(buildLegacyReviewReceipt(reviewed));
    };
    const assertRejected = async (receiptHash: string, artifactVersion: number, payload = base.artifact.payload) => {
      const stored = LegacySingleArtifactRealUrlRunV2Schema.parse({
        ...base,
        version: 4,
        artifact: { ...base.artifact, version: artifactVersion, payload },
        review: undefined,
        reviewHistory: [{ decision: 'accepted', reviewer: 'legacy-reviewer', decidedAt, receiptHash, validity: 'stale', staleReason: 'artifact_edited' }],
      });
      await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v2', runs: [stored], captureProjections: [] })}\n`, 'utf8');
      await expect(new FileFoundryStore(file, directory).get(stored.id)).rejects.toThrow(/migration validation|same artifact version/i);
    };

    await assertRejected(await sealedHistory(3), 2);
    const reviewedPayload = { ...base.artifact.payload, body: `${base.artifact.payload.body}\n\nReviewed wording.` };
    await assertRejected(await sealedHistory(2, reviewedPayload), 2, base.artifact.payload);
  });

  it('uses one injected evaluation time per operation and stales an expired reviewed artifact deterministically', async () => {
    const { directory, file } = await harness();
    let asOf = '2026-08-21T06:00:00.000Z';
    const base = runFixture('clock-editor', 'clock-v3');
    const claims = base.claimSet.claims.map((claim) => ClaimSchema.parse(claim.id === 'claim-location'
      ? { ...claim, expiresAt: '2026-08-22T00:00:00.000Z' }
      : claim));
    const claimSet = { ...base.claimSet, claims, contentHash: hashValue(claims) };
    if (!base.artifact) throw new Error('Quick Note missing');
    const dependencies = base.artifact.dependencies.map((dependency) => dependency.kind === 'claim_set'
      ? { ...dependency, contentHash: claimSet.contentHash }
      : dependency);
    const artifact = withArtifactHash({
      ...base.artifact,
      dependencies,
      gateResults: evaluateQuickNoteGates(base.artifact.payload, claims, base.artifact.claimIds, asOf),
    }, claims);
    if (artifact.type !== 'quick_note') throw new Error('Quick Note narrowing failed');
    assertArtifactPublicLineage(artifact, claims);
    const candidate = {
      ...base, evaluationAsOf: asOf, claimSet, claims, artifact,
      artifactPack: {
        ...base.artifactPack,
        claimSetRef: { id: claimSet.id, version: claimSet.version, contentHash: claimSet.contentHash },
        completed: [artifact],
      },
    };
    const store = new FileFoundryStore(file, directory, undefined, () => asOf);
    let run = await store.create(candidate);
    run = await store.review(run.id, {
      artifactId: artifact.id, expectedArtifactVersion: artifact.version,
      decision: 'accepted', reviewer: 'clock-reviewer', expectedVersion: run.version,
    });
    expect(run.evaluationAsOf).toBe(asOf);
    expect(run.artifactPack.reviews[0].status).toBe('current');
    asOf = '2026-08-23T06:00:00.000Z';
    const expired = await store.get(run.id);
    expect(expired?.evaluationAsOf).toBe(asOf);
    expect(expired?.artifactPack.reviews[0]).toMatchObject({ status: 'stale', staleReason: 'gate_re_evaluated', staledAt: asOf });
    if (!expired) throw new Error('Expired run missing');
    expect(() => buildArtifactHandoff(expired, artifact.id)).toThrow(/review|gates/i);
  });

  it('keeps a text-only Article and Ask pack valid without inventing media', async () => {
    const { app } = await harness();
    const created = await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-url-article', fixtureVariant: 'text_only', actor: 'test-editor', idempotencyKey: 'article-text-only-v1',
    }).expect(201);
    const run = created.body as FoundryRun;
    const metadata = completed(run, 'article_metadata');
    if (metadata.type !== 'article_metadata') throw new Error('Metadata narrowing failed');

    expect(run.status).toBe('ready_for_review');
    expect(run.artifactPack.status).toBe('partial');
    expect(metadata.payload.heroImage).toBeUndefined();
    expect(metadata.payload.astroPatchReady).toBe(false);
    expect(metadata.gateResults.find((gate) => gate.gate === 'astro_patch_ready')).toMatchObject({ passed: false, blocking: false });
    expect(JSON.stringify(run.artifactPack.completed)).not.toContain('placeholder');
    await reviewArtifact(app, run, completed(run, 'article_draft'));
  });

  it('keeps required artifacts reviewable when one optional derivative fails', async () => {
    const { app } = await harness();
    const created = await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-url-article', fixtureVariant: 'partial_optional_failure', actor: 'test-editor', idempotencyKey: 'article-partial-v1',
    }).expect(201);
    let run = created.body as FoundryRun;
    expect(run.artifactPack.status).toBe('partial');
    expect(run.artifactPack.failed).toEqual([expect.objectContaining({ type: 'seo_metadata_proposal', required: false })]);
    expect(run.status).toBe('ready_for_review');
    expect(JSON.stringify(run.artifactPack.completed)).not.toMatch(/\$\s?\d|—|price_band/);
    expect(run.artifactPack.completed.every((artifact) => artifact.factualSegmentIds.every((segmentId) => (
      artifact.claimUsage.some((usage) => usage.segmentId === segmentId && usage.claimIds.length > 0)
    )))).toBe(true);

    run = await reviewArtifact(app, run, completed(run, 'article_draft'));
    expect(run.artifactPack.reviews.at(-1)).toMatchObject({ artifactId: 'artifact-article-red-hill', decision: 'accepted', authority: 'draft_handoff_only' });
    expect(run.status).toBe('ready_for_review');
  });

  it('fails closed when non-quick payload edits omit or reuse stale factual lineage', async () => {
    const { app } = await harness();
    const run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-url-article', actor: 'test-editor', idempotencyKey: 'article-lineage-v1',
    }).expect(201)).body as FoundryRun;
    const article = completed(run, 'article_draft');
    if (article.type !== 'article_draft') throw new Error('Article narrowing failed');
    const appended = { ...article.payload, body: `${article.payload.body}\n\nThe venue seats 500 guests and opens seven days a week.` };

    await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${article.id}`).send({
      editor: 'test-editor', expectedVersion: run.version, expectedArtifactVersion: article.version, payload: appended,
    }).expect(400);
    await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${article.id}`).send({
      editor: 'test-editor', expectedVersion: run.version, expectedArtifactVersion: article.version, payload: appended,
      factualSegmentIds: article.factualSegmentIds, claimUsage: article.claimUsage,
    }).expect(400);

    const second = runUrlArticleFixture('test-editor', 'article-invalid-locator-v1');
    const secondArticle = completed(second, 'article_draft');
    if (secondArticle.type !== 'article_draft') throw new Error('Article narrowing failed');
    secondArticle.claimUsage[0] = { ...secondArticle.claimUsage[0], path: '$.body[0]' };
    const invalidLocator = evaluateArtifactGates(
      secondArticle.payload, second.claimSet.claims, secondArticle.factualSegmentIds, secondArticle.claimUsage, second.updatedAt,
    );
    expect(invalidLocator.find((gate) => gate.gate === 'claim_usage_complete')).toMatchObject({ passed: false, blocking: true });
    const changedSegment = { ...article.payload, body: article.payload.body.replace('covered dining room', 'large dining room') };
    const removedSegment = { ...article.payload, body: article.payload.body.split(/\n\s*\n/).slice(0, 2).join('\n\n') };
    for (const payload of [changedSegment, removedSegment]) {
      const gates = evaluateArtifactGates(payload, run.claimSet.claims, article.factualSegmentIds, article.claimUsage, run.updatedAt);
      expect(gates.find((gate) => gate.gate === 'claim_usage_complete')).toMatchObject({ passed: false, blocking: true });
    }
  });

  it('derives claim-set, angle and media-rights freshness instead of trusting stored flags', async () => {
    const base = runUrlArticleFixture('test-editor', 'freshness-unit-v1', { includeClearedHero: true });
    const article = completed(base, 'article_draft');
    const metadata = completed(base, 'article_metadata');

    const claimDrift = structuredClone(base);
    claimDrift.claimSet.version += 1;
    claimDrift.claimSet.claims[0].text += ' Updated.';
    claimDrift.claimSet.contentHash = hashValue(claimDrift.claimSet.claims);
    expect(artifactDependenciesCurrent(claimDrift, completed(claimDrift, 'article_draft'))).toBe(false);

    const angleDrift = structuredClone(base);
    angleDrift.angle.version += 1;
    expect(artifactDependenciesCurrent(angleDrift, completed(angleDrift, 'article_draft'))).toBe(false);

    const mediaDrift = structuredClone(base);
    const driftedMetadata = completed(mediaDrift, 'article_metadata');
    if (driftedMetadata.type !== 'article_metadata' || !driftedMetadata.payload.heroImage) throw new Error('Cleared metadata missing');
    driftedMetadata.payload.heroImage.src = '/images/sourced/never-cleared.webp';
    driftedMetadata.contentHash = hashValue(driftedMetadata.payload);
    expect(artifactDependenciesCurrent(mediaDrift, driftedMetadata)).toBe(false);
    expect(artifactDependenciesCurrent(base, article)).toBe(true);
    expect(artifactDependenciesCurrent(base, metadata)).toBe(true);
  });

  it('reconciles stored review snapshots on restart and blocks stale export', async () => {
    const { app, file, directory } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-url-article', fixtureVariant: 'complete', actor: 'test-editor', idempotencyKey: 'freshness-restart-v1',
    }).expect(201)).body as FoundryRun;
    run = await reviewArtifact(app, run, completed(run, 'article_draft'));
    run = await reviewArtifact(app, run, completed(run, 'article_metadata'));
    const stored = JSON.parse(await readFile(file, 'utf8')) as { runs: FoundryRun[] };
    stored.runs[0].claimSet.version += 1;
    stored.runs[0].claimSet.claims[0].text += ' Updated.';
    stored.runs[0].claimSet.contentHash = hashValue(stored.runs[0].claimSet.claims);
    stored.runs[0].angle.version += 1;
    const storedMetadata = completed(stored.runs[0], 'article_metadata');
    if (storedMetadata.type !== 'article_metadata' || !storedMetadata.payload.heroImage) throw new Error('Cleared metadata missing');
    storedMetadata.payload.heroImage.src = '/images/sourced/never-cleared.webp';
    storedMetadata.contentHash = hashValue(storedMetadata.payload);
    await writeFile(file, `${JSON.stringify(stored)}\n`, 'utf8');

    const restarted = new FileFoundryStore(file, directory);
    await expect(restarted.get(run.id)).rejects.toThrow(/lineage|content hash/i);
  });

  it('cascades A to B to C review invalidation while preserving an unrelated sibling', async () => {
    const { app, store } = await harness();
    let run = runUrlArticleFixture('test-editor', 'transitive-stale-v1', { includeClearedHero: true });
    const initialMetadata = completed(run, 'article_metadata');
    const initialSeo = completed(run, 'seo_metadata_proposal');
    initialSeo.dependencies = initialSeo.dependencies.map((dependency) => dependency.kind === 'artifact'
      ? { ...dependency, id: initialMetadata.id, version: initialMetadata.version, contentHash: initialMetadata.contentHash }
      : dependency);
    run = await store.create(run);
    run = await reviewArtifact(app, run, completed(run, 'article_draft'));
    run = await reviewArtifact(app, run, completed(run, 'article_metadata'));
    run = await reviewArtifact(app, run, completed(run, 'seo_metadata_proposal'));
    run = await reviewArtifact(app, run, completed(run, 'ask_answer'));
    const article = completed(run, 'article_draft');
    if (article.type !== 'article_draft') throw new Error('Article narrowing failed');
    const editedPayload = { ...article.payload, body: article.payload.body.replace('genuine wet-weather utility', 'real wet-weather utility') };
    const editedUsage = article.claimUsage.map((usage) => usage.segmentId === 'article-location'
      ? { ...usage, contentHash: hashValue(editedPayload.body.split(/\n\s*\n/)[0]) }
      : usage);
    const edited = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${article.id}`).send({
      editor: 'test-editor', expectedVersion: run.version, expectedArtifactVersion: article.version,
      payload: editedPayload, factualSegmentIds: article.factualSegmentIds, claimUsage: editedUsage,
    }).expect(200)).body as FoundryRun;
    const reviewStatus = (type: ArtifactVersion['type']) => edited.artifactPack.reviews.find((review) => review.artifactId === completed(edited, type).id)?.status;
    expect(reviewStatus('article_draft')).toBe('stale');
    expect(reviewStatus('article_metadata')).toBe('stale');
    expect(reviewStatus('seo_metadata_proposal')).toBe('stale');
    expect(reviewStatus('ask_answer')).toBe('current');
  });

  it('cannot assert media clearance by replacing the hero payload', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-url-article', fixtureVariant: 'complete', actor: 'test-editor', idempotencyKey: 'media-bypass-v1',
    }).expect(201)).body as FoundryRun;
    run = await reviewArtifact(app, run, completed(run, 'article_draft'));
    run = await reviewArtifact(app, run, completed(run, 'article_metadata'));
    const metadata = completed(run, 'article_metadata');
    if (metadata.type !== 'article_metadata' || !metadata.payload.heroImage) throw new Error('Cleared metadata missing');
    const replaced = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${metadata.id}`).send({
      editor: 'test-editor', expectedVersion: run.version, expectedArtifactVersion: metadata.version,
      payload: { ...metadata.payload, heroImage: { ...metadata.payload.heroImage, src: '/images/sourced/never-cleared.webp' }, astroPatchReady: true },
      factualSegmentIds: metadata.factualSegmentIds, claimUsage: metadata.claimUsage,
    }).expect(200)).body as FoundryRun;
    const replacedMetadata = completed(replaced, 'article_metadata');
    if (replacedMetadata.type !== 'article_metadata') throw new Error('Metadata narrowing failed');
    expect(replacedMetadata.payload.astroPatchReady).toBe(false);
    expect(replacedMetadata.dependencies.some((dependency) => dependency.kind === 'media_rights')).toBe(false);
    run = await reviewArtifact(app, replaced, replacedMetadata);
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);
  });

  it('stales only an edited artifact and its direct dependents', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-url-article', actor: 'test-editor', idempotencyKey: 'article-stale-v1',
    }).expect(201)).body as FoundryRun;
    const originalArticle = completed(run, 'article_draft');
    const originalMetadata = completed(run, 'article_metadata');
    const originalAsk = completed(run, 'ask_answer');
    run = await reviewArtifact(app, run, originalArticle);
    run = await reviewArtifact(app, run, originalMetadata);
    run = await reviewArtifact(app, run, originalAsk);

    const article = completed(run, 'article_draft');
    if (article.type !== 'article_draft') throw new Error('Article narrowing failed');
    const editedPayload = { ...article.payload, body: article.payload.body.replace('genuine wet-weather utility', 'real wet-weather utility') };
    const editedUsage = article.claimUsage.map((usage) => usage.segmentId === 'article-location'
      ? { ...usage, contentHash: hashValue(editedPayload.body.split(/\n\s*\n/)[0]) }
      : usage);
    const edited = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${article.id}`).send({
      editor: 'test-editor',
      expectedVersion: run.version,
      expectedArtifactVersion: article.version,
      payload: editedPayload,
      factualSegmentIds: article.factualSegmentIds,
      claimUsage: editedUsage,
    }).expect(200)).body as FoundryRun;

    expect(edited.artifactPack.reviews.find((review) => review.artifactId === article.id)?.status).toBe('stale');
    expect(edited.artifactPack.reviews.find((review) => review.artifactId === originalMetadata.id)?.status).toBe('stale');
    expect(edited.artifactPack.reviews.find((review) => review.artifactId === originalAsk.id)?.status).toBe('current');
    expect(completed(edited, 'article_metadata').gateResults.find((gate) => gate.gate === 'dependency_current')).toMatchObject({ passed: false, blocking: true });
    expect(completed(edited, 'ask_answer').gateResults.find((gate) => gate.gate === 'dependency_current')).toMatchObject({ passed: true });
    expect(edited.status).toBe('needs_revision');
  });

  it('persists independent artifact reviews across restart and rejects stale run versions', async () => {
    const { app, file, directory } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-url-article', actor: 'test-editor', idempotencyKey: 'article-restart-v1',
    }).expect(201)).body as FoundryRun;
    const ask = completed(run, 'ask_answer');
    run = await reviewArtifact(app, run, ask);
    await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
      artifactId: ask.id, decision: 'rejected', reviewer: 'stale-editor', expectedVersion: 1, expectedArtifactVersion: 1,
    }).expect(409);

    const restarted = new FileFoundryStore(file, directory);
    const persisted = await restarted.get(run.id);
    expect(persisted?.artifactPack.reviews).toHaveLength(1);
    expect(persisted?.artifactPack.reviews[0]).toMatchObject({ artifactId: ask.id, decision: 'accepted', status: 'current' });
    expect(JSON.parse(await readFile(file, 'utf8')).runs).toHaveLength(1);
  });

  it('exports a rights-cleared Astro article patch only after the two patch artifacts are accepted', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-url-article', fixtureVariant: 'complete', actor: 'test-editor', idempotencyKey: 'article-patch-v1',
    }).expect(201)).body as FoundryRun;
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);
    run = await reviewArtifact(app, run, completed(run, 'article_draft'));
    expect(patchReadiness(run, false)).toMatchObject({ ready: false, reason: expect.stringMatching(/metadata/i) });
    run = await reviewArtifact(app, run, completed(run, 'article_metadata'));
    expect(patchReadiness(run, false)).toMatchObject({ ready: true });
    expect(patchReadiness(run, true)).toMatchObject({ ready: false, reason: expect.stringMatching(/refresh/i) });
    const patch = await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(200);

    expect(patch.text).toContain('next/src/content/articles/red-hill-wet-weather-lunch.md');
    expect(patch.text).toContain('+status: draft');
    expect(patch.text).toContain('+clusterLinks: [{"label":"Explore Red Hill","href":"/explore/places/red-hill/"}]');
    expect(patch.text).not.toMatch(/\$\s?\d|—|price_band/);
    expect(validateNewFilePatch(patch.text)).toBe(true);
    await expectGitApplyCheck(patch.text);
  });

  it('preserves quick-note review, edit and multiline patch compatibility', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').set('Idempotency-Key', 'quick-edit-v2').send({
      fixtureId: 'red-hill-winter-lunch', actor: 'test-editor',
    }).expect(201)).body as FoundryRun;
    if (!run.artifact) throw new Error('Quick-note artifact missing');
    run = await reviewArtifact(app, run, run.artifact);
    const acceptedVersion = run.version;
    const edited = (await request(app).put(`/api/foundry/runs/${run.id}/artifact`).send({
      editor: 'test-editor', expectedVersion: run.version,
      headline: run.artifact?.payload.headline,
      dek: run.artifact?.payload.dek,
      body: 'First paragraph.\n\nSecond paragraph.',
    }).expect(200)).body as FoundryRun;
    expect(edited.status).toBe('ready_for_review');
    expect(edited.review).toBeUndefined();
    expect(edited.artifactPack.reviews[0].status).toBe('stale');

    await request(app).put(`/api/foundry/runs/${run.id}/artifact`).send({
      editor: 'stale-editor', expectedVersion: acceptedVersion,
      headline: 'Stale overwrite', dek: '', body: 'This must not win.',
    }).expect(409);
    if (!edited.artifact) throw new Error('Edited quick-note artifact missing');
    const reaccepted = await reviewArtifact(app, edited, edited.artifact);
    const patch = await request(app).get(`/api/foundry/runs/${reaccepted.id}/patch`).expect(200);
    expect(patch.text).toContain('+First paragraph.\n+\n+Second paragraph.');
    await expectGitApplyCheck(patch.text);
  });

  it('requires idempotency, serializes mutations and fails closed outside local fixture mode', async () => {
    const { app, store } = await harness();
    await request(app).post('/api/foundry/runs').send({ fixtureId: 'red-hill-winter-lunch', actor: 'test-editor' }).expect(400);
    const runs = Array.from({ length: 8 }, (_, index) => runFixture('test-editor', `concurrent-v2-${index}`));
    await Promise.all(runs.map((run) => store.create(run)));
    expect(await store.list()).toHaveLength(8);
    expect(() => loadRuntimeConfig({ NODE_ENV: 'production' })).toThrow(/disabled in production/);
    expect(() => loadRuntimeConfig({ NODE_ENV: 'test', FOUNDRY_HOST: 'public.example' })).toThrow(/FOUNDRY_HOST/);
    expect(() => new FileFoundryStore('C:\\outside\\runs.json', 'C:\\allowed')).toThrow(/inside its configured data root/);
  });

  it('serves capabilities and the built Workbench from the same loopback service', async () => {
    const { directory, store } = await harness();
    await writeFile(join(directory, 'index.html'), '<!doctype html><title>Foundry container marker</title>', 'utf8');
    const app = createApp(store, { staticDir: directory });
    const page = await request(app).get('/').expect(200).expect('Content-Type', /html/).expect('Content-Security-Policy', /default-src 'self'/);
    expect(page.text).toContain('Foundry container marker');
    const capabilities = await request(app).get('/api/capabilities').expect(200).expect('Cache-Control', 'no-store');
    expect(capabilities.body.recipes).toEqual(['quick_note_v1', 'url_article_v1']);
    expect(capabilities.body.externalCalls).toBe(false);
  });
});
