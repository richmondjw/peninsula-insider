import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { buildExtractionRevision, extractBlocks } from '../server/capture/extractor.js';
import { captureRequestIdentity, type CaptureInput } from '../server/capture/kernel.js';
import { loadRuntimeConfig } from '../server/config.js';
import { assertArtifactPublicLineage, withArtifactHash } from '../server/fixture-runner.js';
import { RealUrlCoordinator, type CaptureKernelPort, type CaptureRepositoryPort } from '../server/real-url-coordinator.js';
import { FileFoundryStore } from '../server/store.js';
import { CaptureRecordSchema, type CaptureRecord } from '../shared/capture-contracts.js';
import { FIXTURE_ASK_PROVENANCE_TEMPLATE } from '../shared/contracts.js';

const temporaryDirectories: string[] = [];
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const csrf = { 'x-foundry-csrf': '1' };

function recordFor(input: CaptureInput, options: {
  state?: 'extracted' | 'no_story' | 'held' | 'failed';
  text?: string;
  completedAt?: string;
  failureCode?: string;
} = {}): CaptureRecord {
  const identity = captureRequestIdentity(input);
  const state = options.state ?? 'extracted';
  const createdAt = '2026-08-21T08:00:00.000Z';
  const completedAt = options.completedAt ?? '2026-08-21T08:00:01.000Z';
  if (state === 'failed') return CaptureRecordSchema.parse({
    schemaVersion: 'pi.capture-manifest.v1',
    attempt: {
      schemaVersion: 'pi.capture-attempt.v1', id: identity.attemptId,
      idempotencyKeyHash: identity.idempotencyKeyHash, requestFingerprint: identity.requestFingerprint,
      requestedUrl: identity.safeRequestedUrl, createdAt, completedAt, state,
      events: [{ state: 'queued', at: createdAt }, { state: 'capturing', at: createdAt }, { state: 'failed', at: completedAt, detail: options.failureCode ?? 'non_public_address' }],
      redirects: [], failure: { stage: 'dns', code: options.failureCode ?? 'non_public_address', message: 'private internal detail' },
    },
  });
  if (state === 'held') return CaptureRecordSchema.parse({
    schemaVersion: 'pi.capture-manifest.v1',
    attempt: {
      schemaVersion: 'pi.capture-attempt.v1', id: identity.attemptId,
      idempotencyKeyHash: identity.idempotencyKeyHash, requestFingerprint: identity.requestFingerprint,
      requestedUrl: identity.safeRequestedUrl, createdAt, completedAt, state,
      events: [{ state: 'queued', at: createdAt }, { state: 'capturing', at: createdAt }, { state: 'held', at: completedAt }],
      redirects: [], outcomeReason: { code: 'unsupported_media_type', detail: 'Unsafe raw detail' },
    },
  });
  const text = state === 'no_story' ? '' : (options.text ?? [
    'Example Domain announces a spring arts program.',
    'The program includes local artist talks and guided walks.',
    'Bookings open after the public launch.',
  ].join('\n\n'));
  const blocks = extractBlocks(text, 'text/plain');
  const sourceId = `source-${hash(`${identity.attemptId}:source`).slice(0, 24)}`;
  const extractionId = `extract-${hash(`${identity.attemptId}:extract`).slice(0, 24)}`;
  const sourceHash = hash(text);
  const extraction = buildExtractionRevision({
    id: extractionId, attemptId: identity.attemptId, sourceRevisionId: sourceId,
    extractedAt: completedAt, sourceContentBlobHash: sourceHash,
    extractedTextBlobHash: hash(blocks.map((block) => block.text).join('\n\n')), blocks,
  });
  return CaptureRecordSchema.parse({
    schemaVersion: 'pi.capture-manifest.v1',
    attempt: {
      schemaVersion: 'pi.capture-attempt.v1', id: identity.attemptId,
      idempotencyKeyHash: identity.idempotencyKeyHash, requestFingerprint: identity.requestFingerprint,
      requestedUrl: identity.safeRequestedUrl, createdAt, completedAt, state,
      events: [
        { state: 'queued', at: createdAt }, { state: 'capturing', at: createdAt },
        { state: 'captured', at: completedAt }, { state: 'extracting', at: completedAt }, { state, at: completedAt },
      ],
      redirects: [], sourceRevisionId: sourceId, extractionRevisionId: extractionId,
      outcomeReason: state === 'no_story' ? { code: 'no_extractable_text', detail: 'No extractable text' } : undefined,
    },
    sourceRevision: {
      schemaVersion: 'pi.source-revision.v1', id: sourceId, attemptId: identity.attemptId,
      requestedUrl: identity.safeRequestedUrl, canonicalUrl: identity.safeRequestedUrl, capturedAt: completedAt,
      status: 200, mediaType: 'text/plain', charset: 'utf-8', contentEncoding: 'identity',
      headers: { 'content-type': 'text/plain; charset=utf-8' }, redirects: [],
      resolvedAddresses: ['93.184.216.34'], selectedAddress: '93.184.216.34', remoteAddress: '93.184.216.34',
      wireBlobHash: sourceHash, contentBlobHash: sourceHash,
      wireBytes: Buffer.byteLength(text), decodedBytes: Buffer.byteLength(text),
    },
    extractionRevision: extraction,
  });
}

class FakeKernel implements CaptureKernelPort {
  calls = 0;
  constructor(private readonly factory: (input: CaptureInput, call: number) => Promise<CaptureRecord> | CaptureRecord) {}
  async capture(input: CaptureInput): Promise<CaptureRecord> { this.calls += 1; return this.factory(input, this.calls); }
}

class FakeRepository implements CaptureRepositoryPort {
  constructor(readonly records = new Map<string, CaptureRecord>()) {}
  async get(attemptId: string) { return this.records.get(attemptId); }
}

async function harness(kernel: FakeKernel, options: { evaluationClock?: () => string } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'pi-real-url-v1-'));
  temporaryDirectories.push(directory);
  const file = join(directory, 'runs.json');
  const repository = new FakeRepository();
  const store = new FileFoundryStore(file, directory, repository, options.evaluationClock ?? (() => '2026-08-21T08:00:02.000Z'));
  const committingKernel: CaptureKernelPort = {
    capture: async (input) => {
      const record = await kernel.capture(input);
      repository.records.set(record.attempt.id, record);
      return record;
    },
  };
  const coordinator = new RealUrlCoordinator(store, committingKernel, repository, () => new Date('2026-08-21T08:00:00.500Z'));
  const app = createApp(store, { realUrlsEnabled: true, coordinator });
  return { directory, file, store, coordinator, app, repository };
}

async function captureRun(app: ReturnType<typeof createApp>, coordinator: RealUrlCoordinator, key: string) {
  const started = await request(app).post('/api/foundry/captures').set(csrf).send({
    url: 'https://example.com/program?token=secret', actor: 'editor', idempotencyKey: key,
  }).expect(202);
  await coordinator.waitForIdle(started.body.id);
  const projection = (await request(app).get(`/api/foundry/captures/${started.body.id}`).expect(200)).body;
  if (!projection.runId) throw new Error(`Capture did not materialise: ${JSON.stringify(projection)}`);
  return (await request(app).get(`/api/foundry/runs/${projection.runId}`).expect(200)).body;
}

async function confirmRun(app: ReturnType<typeof createApp>, run: any) {
  const claimIds = run.claimSet.claims.filter((claim: any) => !claim.restrictedFromArtifacts).slice(0, 3).map((claim: any) => claim.id);
  return (await request(app).put(`/api/foundry/runs/${run.id}/source-confirmation`).set(csrf).send({
    sourceKind: 'web', claimIds, angleLabel: 'Spring arts program',
    angleFraming: 'A source-led explainer for local readers.', confirmer: 'human-editor', expectedVersion: run.version,
  }).expect(200)).body;
}

async function acceptArtifact(app: ReturnType<typeof createApp>, run: any, type: string) {
  const artifact = run.artifactPack.completed.find((candidate: any) => candidate.type === type);
  if (!artifact) throw new Error(`Missing ${type}`);
  return (await request(app).put(`/api/foundry/runs/${run.id}/review`).set(csrf).send({
    artifactId: artifact.id, expectedArtifactVersion: artifact.version,
    decision: 'accepted', reviewer: 'human-editor', expectedVersion: run.version,
  }).expect(200)).body;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('real URL V1 artifact-pack integration', () => {
  it('is default-off, loopback guarded and advertises explicit negative capabilities', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-real-url-off-'));
    temporaryDirectories.push(directory);
    const store = new FileFoundryStore(join(directory, 'runs.json'), directory);
    const app = createApp(store);
    const capabilities = await request(app).get('/api/capabilities').expect(200);
    expect(capabilities.body).toMatchObject({
      sourceTypes: ['frozen_fixture'], externalCalls: false, providerCalls: false, modelCalls: false,
      publishing: false, sending: false, scheduling: false, productionMutation: false,
      realUrlCapture: { enabled: false },
    });
    await request(app).post('/api/foundry/captures').send({ url: 'https://example.com/' }).expect(404);
    expect(() => loadRuntimeConfig({ NODE_ENV: 'test', FOUNDRY_REAL_URLS_ENABLED: '1', FOUNDRY_HOST: '0.0.0.0' })).toThrow(/native loopback/);

    const { store: enabledStore, coordinator } = await harness(new FakeKernel((input) => recordFor(input)));
    const guarded = createApp(enabledStore, { realUrlsEnabled: true, coordinator, expectedHost: '127.0.0.1:4311' });
    const body = { url: 'https://example.com/', actor: 'editor', idempotencyKey: 'origin-gate' };
    await request(guarded).post('/api/foundry/captures').set('Host', 'evil.example').set(csrf).send(body).expect(403);
    await request(guarded).post('/api/foundry/captures').set('Host', '127.0.0.1:4311').set('Origin', 'https://evil.example').set(csrf).send(body).expect(403);
    await request(guarded).post('/api/foundry/captures').set('Host', '127.0.0.1:4311').send(body).expect(403);
  });

  it('locks Article and Ask until human classification, claim-set selection and angle confirmation', async () => {
    const { app, coordinator } = await harness(new FakeKernel((input) => recordFor(input)));
    const initial = await captureRun(app, coordinator, 'full-pack');
    expect(initial.schemaVersion).toBe('pi.foundry-run.v3');
    expect(initial.artifactPack.schemaVersion).toBe('pi.artifact-pack.v2');
    expect(initial.artifactPack.completed.map((item: any) => item.type)).toEqual(['quick_note']);
    expect(initial.artifactPack.omitted.filter((item: any) => item.reason === 'awaiting_human_confirmation').map((item: any) => item.type).sort())
      .toEqual(['article_draft', 'article_metadata', 'ask_answer']);
    await request(app).put(`/api/foundry/runs/${initial.id}/review`).set(csrf).send({
      artifactId: initial.artifact.id, expectedArtifactVersion: initial.artifact.version,
      decision: 'accepted', reviewer: 'editor', expectedVersion: initial.version,
    }).expect(400);

    const confirmed = await confirmRun(app, initial);
    expect(confirmed.sourceConfirmation).toMatchObject({ sourceKind: 'web', confirmedBy: 'human-editor' });
    expect(confirmed.artifactPack.completed.map((item: any) => item.type).sort())
      .toEqual(['article_draft', 'article_metadata', 'ask_answer', 'quick_note']);
    for (const artifact of confirmed.artifactPack.completed) {
      assertArtifactPublicLineage(artifact, confirmed.claimSet.claims);
      expect(artifact.dependencies.some((dependency: any) => dependency.kind === 'capture_source')).toBe(true);
      expect(artifact.gateResults.find((gate: any) => gate.gate === 'human_confirmation_current').passed).toBe(true);
    }
    const sourceDependency = confirmed.artifactPack.completed[0].dependencies.find((dependency: any) => dependency.kind === 'capture_source');
    expect(sourceDependency).toMatchObject({
      attemptId: confirmed.capture.artifactAttemptId,
      sourceRevisionId: confirmed.sourceConfirmation.sourceRevisionId,
      extractionRevisionId: confirmed.sourceConfirmation.extractionRevisionId,
      selectedClaimIds: confirmed.sourceConfirmation.confirmedClaimIds,
    });
  });

  it('keeps per-artifact receipts independently current and allows text handoffs while the Astro patch remains rights-blocked', async () => {
    const { app, coordinator, store } = await harness(new FakeKernel((input) => recordFor(input)));
    let run = await confirmRun(app, await captureRun(app, coordinator, 'independent-reviews'));
    run = await acceptArtifact(app, run, 'article_draft');
    const articleReview = run.artifactPack.reviews.find((review: any) => review.artifactId === run.artifactPack.completed.find((a: any) => a.type === 'article_draft').id);
    run = await acceptArtifact(app, run, 'ask_answer');
    run = await acceptArtifact(app, run, 'article_metadata');
    const current = run.artifactPack.reviews.filter((review: any) => review.status === 'current');
    expect(current).toHaveLength(3);
    expect(current.every((review: any) => review.receiptHash && review.reviewedRunVersion && review.reviewedArtifactPackVersion)).toBe(true);
    expect((await store.get(run.id))?.artifactPack.reviews.find((review) => review.id === articleReview.id)?.status).toBe('current');

    const article = run.artifactPack.completed.find((item: any) => item.type === 'article_draft');
    const ask = run.artifactPack.completed.find((item: any) => item.type === 'ask_answer');
    const articleHandoff = await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${article.id}/handoff`).expect(200);
    const askHandoff = await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${ask.id}/handoff`).expect(200);
    expect(articleHandoff.body).toMatchObject({ authority: 'draft_handoff_only', publicationAuthority: false, artifactType: 'article_draft' });
    expect(askHandoff.body).toMatchObject({ authority: 'draft_handoff_only', publicationAuthority: false, artifactType: 'ask_answer' });
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);
  });

  it('fails closed on public-field, lineage and receipt tampering across restart and export', async () => {
    const { app, coordinator, file, directory, repository } = await harness(new FakeKernel((input) => recordFor(input)));
    let run = await confirmRun(app, await captureRun(app, coordinator, 'tamper-proof'));
    run = await acceptArtifact(app, run, 'article_draft');
    const original = JSON.parse(await readFile(file, 'utf8'));
    const persistedRun = original.runs.find((candidate: any) => candidate.id === run.id);
    const article = persistedRun.artifactPack.completed.find((item: any) => item.type === 'article_draft');

    const payloadForgery = structuredClone(original);
    payloadForgery.runs[0].artifactPack.completed.find((item: any) => item.type === 'article_draft').payload.body = 'Fabricated public assertion.';
    await writeFile(file, `${JSON.stringify(payloadForgery)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory, repository).get(run.id)).rejects.toThrow(/content hash/);

    const lineageForgery = structuredClone(original);
    lineageForgery.runs[0].artifactPack.completed.find((item: any) => item.type === 'article_draft').publicFieldLineage[0].contentHash = hash('substituted');
    await writeFile(file, `${JSON.stringify(lineageForgery)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory, repository).get(run.id)).rejects.toThrow(/lineage/i);

    await writeFile(file, `${JSON.stringify(original)}\n`, 'utf8');
    const receiptHash = persistedRun.artifactPack.reviews.find((review: any) => review.artifactId === article.id).receiptHash;
    const receiptPath = join(directory, 'review-receipts', `${receiptHash}.json`);
    const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
    receipt.artifact.payload.body = 'Receipt substitution.';
    await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`, 'utf8');
    const restarted = new FileFoundryStore(file, directory, repository);
    await expect(restarted.get(run.id)).rejects.toThrow(/content hash mismatch/);
    await request(createApp(restarted, { realUrlsEnabled: true, coordinator: new RealUrlCoordinator(restarted, new FakeKernel(() => { throw new Error('no capture'); }), repository) }))
      .get(`/api/foundry/runs/${run.id}/artifacts/${article.id}/handoff`).expect(400);
  });

  it('rejects a self-consistent confirmed-real-to-fixture Ask template swap after restart', async () => {
    const { app, coordinator, file, directory, repository } = await harness(new FakeKernel((input) => recordFor(input)));
    const run = await confirmRun(app, await captureRun(app, coordinator, 'real-mode-template-binding'));
    const stored = JSON.parse(await readFile(file, 'utf8'));
    const persistedRun = stored.runs.find((candidate: any) => candidate.id === run.id);
    const askIndex = persistedRun.artifactPack.completed.findIndex((candidate: any) => candidate.type === 'ask_answer');
    const ask = persistedRun.artifactPack.completed[askIndex];
    persistedRun.artifactPack.completed[askIndex] = withArtifactHash({
      ...ask,
      payload: { ...ask.payload, provenance_footer: FIXTURE_ASK_PROVENANCE_TEMPLATE },
      gateResults: ask.gateResults,
    }, persistedRun.claimSet.claims);
    await writeFile(file, `${JSON.stringify(stored)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory, repository).get(run.id)).rejects.toThrow(/provenance template.*source authority/i);
  });

  it('refreshes exact source dependencies and stales dependent artifact reviews without losing immutable receipt history', async () => {
    const kernel = new FakeKernel((input, call) => recordFor(input, {
      text: call === 1 ? 'First source assertion.\n\nFirst supporting detail.' : 'Second source assertion.\n\nSecond supporting detail.',
      completedAt: call === 1 ? '2026-08-21T08:00:01.000Z' : '2026-08-21T09:00:01.000Z',
    }));
    const { app, coordinator, directory } = await harness(kernel);
    let run = await confirmRun(app, await captureRun(app, coordinator, 'refresh-first'));
    run = await acceptArtifact(app, run, 'article_draft');
    run = await acceptArtifact(app, run, 'ask_answer');
    const receiptHashes = run.artifactPack.reviews.map((review: any) => review.receiptHash);
    const refresh = await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send({
      url: 'https://example.com/program?token=secret', actor: 'editor', idempotencyKey: 'refresh-second', expectedVersion: run.version,
    }).expect(202);
    await coordinator.waitForIdle(refresh.body.id);
    const current = (await request(app).get(`/api/foundry/runs/${run.id}`).expect(200)).body;
    expect(current.capture.revisions).toHaveLength(2);
    expect(current.sourceConfirmation).toBeUndefined();
    expect(current.artifactPack.completed.map((artifact: any) => artifact.type)).toEqual(['quick_note']);
    expect(current.artifactPack.reviews.filter((review: any) => review.status === 'stale')).toHaveLength(2);
    expect(current.artifactPack.reviews.every((review: any) => review.staleReason === 'source_refreshed')).toBe(true);
    for (const receiptHash of receiptHashes) {
      expect(JSON.parse(await readFile(join(directory, 'review-receipts', `${receiptHash}.json`), 'utf8')).schemaVersion).toBe('pi.review-receipt.v2');
    }
  });

  it('applies the shared zero-price and zero-em-dash law before materialisation', async () => {
    const text = [
      'Tickets cost 20 dollars.', 'An entry fee applies.', 'Admission costs AUD 20.', 'Tickets are $20.',
      'Admission is available at no charge.', 'A booking surcharge applies.', 'Complimentary entry is available.',
      'This source uses an em dash — in public copy.', 'A safe local statement remains.',
    ].join('\n\n');
    const { app, coordinator } = await harness(new FakeKernel((input) => recordFor(input, { text })));
    const run = await captureRun(app, coordinator, 'editorial-law');
    const restricted = run.claimSet.claims.filter((claim: any) => claim.restrictedFromArtifacts);
    expect(restricted).toHaveLength(8);
    expect(run.artifact.claimIds).toHaveLength(1);
    expect(JSON.stringify(run.artifact.payload)).toContain('safe local statement');
    expect(JSON.stringify(run.artifact.payload)).not.toMatch(/cost|fee|AUD|\$20|no charge|surcharge|complimentary|—/i);
  });
});
