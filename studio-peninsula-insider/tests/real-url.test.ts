import { createHash } from 'node:crypto';
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { captureRequestIdentity, type CaptureInput } from '../server/capture/kernel.js';
import { FileCaptureRepository } from '../server/capture/repository.js';
import { buildExtractionRevision, extractBlocks } from '../server/capture/extractor.js';
import { loadRuntimeConfig } from '../server/config.js';
import { buildPatch, evaluateQuickNoteGates, runFixture } from '../server/fixture-runner.js';
import { RealUrlCoordinator, type CaptureKernelPort, type CaptureRepositoryPort } from '../server/real-url-coordinator.js';
import { buildRealUrlArtifactBinding } from '../server/real-url-lineage.js';
import { FileReviewReceiptRepository } from '../server/review-receipts.js';
import { FileFoundryStore } from '../server/store.js';
import { CaptureRecordSchema, type CaptureRecord } from '../shared/capture-contracts.js';

const temporaryDirectories: string[] = [];
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const csrf = { 'x-foundry-csrf': '1' };

function recordFor(input: CaptureInput, options: {
  state?: 'extracted' | 'no_story' | 'held' | 'failed';
  text?: string;
  redirect?: boolean;
  failureCode?: string;
} = {}): CaptureRecord {
  const identity = captureRequestIdentity(input);
  const state = options.state ?? 'extracted';
  const createdAt = '2026-08-21T08:00:00.000Z';
  const completedAt = '2026-08-21T08:00:01.000Z';
  const redirects = options.redirect ? [{
    url: identity.safeRequestedUrl,
    status: 302,
    location: 'https://private.invalid/',
  }] : [];
  if (state === 'failed') return CaptureRecordSchema.parse({
    schemaVersion: 'pi.capture-manifest.v1',
    attempt: {
      schemaVersion: 'pi.capture-attempt.v1',
      id: identity.attemptId,
      idempotencyKeyHash: identity.idempotencyKeyHash,
      requestFingerprint: identity.requestFingerprint,
      requestedUrl: identity.safeRequestedUrl,
      createdAt,
      completedAt,
      state,
      events: [{ state: 'queued', at: createdAt }, { state: 'capturing', at: createdAt }, { state: 'failed', at: completedAt, detail: options.failureCode ?? 'non_public_address' }],
      redirects,
      failure: { stage: 'dns', code: options.failureCode ?? 'non_public_address', message: 'blocked 169.254.169.254 internal detail' },
    },
  });
  if (state === 'held') return CaptureRecordSchema.parse({
    schemaVersion: 'pi.capture-manifest.v1',
    attempt: {
      schemaVersion: 'pi.capture-attempt.v1',
      id: identity.attemptId,
      idempotencyKeyHash: identity.idempotencyKeyHash,
      requestFingerprint: identity.requestFingerprint,
      requestedUrl: identity.safeRequestedUrl,
      createdAt,
      completedAt,
      state,
      events: [{ state: 'queued', at: createdAt }, { state: 'capturing', at: createdAt }, { state: 'held', at: completedAt, detail: 'raw event secret 10.0.0.1' }],
      redirects,
      outcomeReason: { code: 'unsupported_media_type', detail: 'Unsafe raw detail' },
    },
  });

  const text = state === 'no_story' ? '' : (options.text ?? 'Example Domain\n\nThis source assertion is safe for a human-reviewed note.');
  const blocks = extractBlocks(text, 'text/plain');
  const sourceId = `source-${hash(`${identity.attemptId}:source`).slice(0, 24)}`;
  const extractionId = `extract-${hash(`${identity.attemptId}:extract`).slice(0, 24)}`;
  const sourceHash = hash(text);
  const extraction = buildExtractionRevision({
    id: extractionId,
    attemptId: identity.attemptId,
    sourceRevisionId: sourceId,
    extractedAt: completedAt,
    sourceContentBlobHash: sourceHash,
    extractedTextBlobHash: hash(blocks.map((block) => block.text).join('\n\n')),
    blocks,
  });
  return CaptureRecordSchema.parse({
    schemaVersion: 'pi.capture-manifest.v1',
    attempt: {
      schemaVersion: 'pi.capture-attempt.v1',
      id: identity.attemptId,
      idempotencyKeyHash: identity.idempotencyKeyHash,
      requestFingerprint: identity.requestFingerprint,
      requestedUrl: identity.safeRequestedUrl,
      createdAt,
      completedAt,
      state,
      events: [
        { state: 'queued', at: createdAt },
        { state: 'capturing', at: createdAt },
        { state: 'captured', at: completedAt },
        { state: 'extracting', at: completedAt },
        { state, at: completedAt },
      ],
      redirects,
      sourceRevisionId: sourceId,
      extractionRevisionId: extractionId,
      outcomeReason: state === 'no_story' ? { code: 'no_extractable_text', detail: 'No extractable text' } : undefined,
    },
    sourceRevision: {
      schemaVersion: 'pi.source-revision.v1',
      id: sourceId,
      attemptId: identity.attemptId,
      requestedUrl: identity.safeRequestedUrl,
      canonicalUrl: identity.safeRequestedUrl,
      capturedAt: completedAt,
      status: 200,
      mediaType: 'text/plain',
      charset: 'utf-8',
      contentEncoding: 'identity',
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      redirects: [],
      resolvedAddresses: ['93.184.216.34'],
      selectedAddress: '93.184.216.34',
      remoteAddress: '93.184.216.34',
      wireBlobHash: sourceHash,
      contentBlobHash: sourceHash,
      wireBytes: Buffer.byteLength(text),
      decodedBytes: Buffer.byteLength(text),
    },
    extractionRevision: extraction,
  });
}

class FakeKernel implements CaptureKernelPort {
  calls = 0;
  constructor(private readonly factory: (input: CaptureInput, call: number) => Promise<CaptureRecord> | CaptureRecord) {}
  async capture(input: CaptureInput): Promise<CaptureRecord> {
    this.calls += 1;
    return this.factory(input, this.calls);
  }
}

class FakeRepository implements CaptureRepositoryPort {
  constructor(readonly records = new Map<string, CaptureRecord>()) {}
  async get(attemptId: string) { return this.records.get(attemptId); }
}

async function harness(kernel: FakeKernel, repository = new FakeRepository()) {
  const directory = await mkdtemp(join(tmpdir(), 'pi-real-url-'));
  temporaryDirectories.push(directory);
  const file = join(directory, 'runs.json');
  const store = new FileFoundryStore(file, directory, repository);
  const committingKernel: CaptureKernelPort = {
    capture: async (input) => {
      const record = await kernel.capture(input);
      repository.records.set(record.attempt.id, record);
      return record;
    },
  };
  const coordinator = new RealUrlCoordinator(store, committingKernel, repository);
  const app = createApp(store, { realUrlsEnabled: true, coordinator });
  return { directory, file, store, coordinator, app, repository };
}

async function waitForTerminal(coordinator: RealUrlCoordinator, projectionId: string) {
  await coordinator.waitForIdle(projectionId);
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('local real URL vertical slice', () => {
  it('fails closed when disabled and requires loopback when enabled', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-real-url-off-'));
    temporaryDirectories.push(directory);
    const store = new FileFoundryStore(join(directory, 'runs.json'), directory);
    const app = createApp(store);
    const capabilities = await request(app).get('/api/capabilities').expect(200);
    expect(capabilities.body.realUrlCapture.enabled).toBe(false);
    expect(capabilities.body.externalCalls).toBe(false);
    await request(app).post('/api/foundry/captures').send({ url: 'https://example.com/' }).expect(404);
    expect(() => loadRuntimeConfig({ NODE_ENV: 'test', FOUNDRY_REAL_URLS_ENABLED: '1', FOUNDRY_HOST: '0.0.0.0' })).toThrow(/native loopback/);
    expect(() => loadRuntimeConfig({ NODE_ENV: 'production', FOUNDRY_REAL_URLS_ENABLED: '1' })).toThrow(/disabled in production/);
    expect(() => loadRuntimeConfig({ NODE_ENV: 'test', FOUNDRY_REAL_URLS_ENABLED: 'yes' })).toThrow(/must be 0 or 1/);
    expect(() => createApp(store, {
      realUrlsEnabled: true,
      coordinator: {} as RealUrlCoordinator,
    })).toThrow(/immutable manifest validation/);
  });

  it('requires loopback Host, same origin and a CSRF header before capture', async () => {
    const { store, coordinator } = await harness(new FakeKernel((input) => recordFor(input)));
    const app = createApp(store, { realUrlsEnabled: true, coordinator, expectedHost: '127.0.0.1:4310' });
    const body = { url: 'https://example.com/', actor: 'editor', idempotencyKey: 'origin-gate' };
    await request(app).post('/api/foundry/captures').set('Host', 'evil.example').set(csrf).send(body).expect(403);
    await request(app).post('/api/foundry/captures').set('Host', '127.0.0.1:4310').set('Origin', 'https://evil.example').set(csrf).send(body).expect(403);
    await request(app).post('/api/foundry/captures').set('Host', '127.0.0.1:4310').send(body).expect(403);
    await request(app).get('/api/health').set('Host', '127.0.0.1:4310').expect(200);
    for (const path of ['/api/health', '/api/capabilities', '/api/foundry/captures', '/api/foundry/runs', '/']) {
      await request(app).get(path).set('Host', 'evil.example').expect(403);
    }
    await request(app).get('/api/health').set('Host', '127.0.0.1:9999').expect(403);
    await request(app).post('/api/foundry/runs').set('Host', '127.0.0.1:4310').send({ fixtureId: 'red-hill-winter-lunch' }).expect(403);
  });

  it('binds each idempotency key to one URL and allows only one active capture', async () => {
    let release!: (record: CaptureRecord) => void;
    const deferred = new Promise<CaptureRecord>((resolve) => { release = resolve; });
    const kernel = new FakeKernel(() => deferred);
    const { app, coordinator } = await harness(kernel);
    const first = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'one-key',
    }).expect(202);
    await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'one-key',
    }).expect(200);
    await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.org/', actor: 'editor', idempotencyKey: 'one-key',
    }).expect(409).expect(({ body }) => expect(body.error.code).toBe('idempotency_conflict'));
    await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.org/', actor: 'editor', idempotencyKey: 'second-key',
    }).expect(409).expect(({ body }) => expect(body.error.code).toBe('capture_busy'));
    release(recordFor({ url: 'https://example.com/', idempotencyKey: 'one-key' }));
    await waitForTerminal(coordinator, first.body.id);
    const projection = (await request(app).get(`/api/foundry/captures/${first.body.id}`).expect(200)).body;
    const run = (await request(app).get(`/api/foundry/runs/${projection.runId}`).expect(200)).body;
    await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'one-key', expectedVersion: run.version,
    }).expect(409).expect(({ body }) => expect(body.error.code).toBe('idempotency_conflict'));
    expect(kernel.calls).toBe(1);
  });

  it('persists capturing before outbound completion, then materializes one run', async () => {
    let release!: (record: CaptureRecord) => void;
    const deferred = new Promise<CaptureRecord>((resolve) => { release = resolve; });
    const kernel = new FakeKernel(() => deferred);
    const { app, store, coordinator } = await harness(kernel);
    const started = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/?token=secret', actor: 'editor', idempotencyKey: 'persisted-capturing',
    }).expect(202);
    expect(started.body.state).toBe('capturing');
    expect((await store.getCaptureProjection(started.body.id))?.state).toBe('capturing');
    release(recordFor({ url: 'https://example.com/?token=secret', idempotencyKey: 'persisted-capturing' }));
    await waitForTerminal(coordinator, started.body.id);
    const terminal = await request(app).get(`/api/foundry/captures/${started.body.id}`).expect(200);
    expect(terminal.body.state).toBe('extracted');
    expect(terminal.body.requestedUrl).not.toContain('secret');
    expect(terminal.text).not.toContain('93.184.216.34');
    expect(await store.list()).toHaveLength(1);
    expect(kernel.calls).toBe(1);
  });

  it('keeps safe held, no-story and redirect-private outcomes visible without leaking internals', async () => {
    const kernel = new FakeKernel((input, call) => call === 1
      ? recordFor(input, { state: 'held' })
      : call === 2
        ? recordFor(input, { state: 'no_story' })
        : recordFor(input, { state: 'failed', redirect: true, failureCode: 'redirect_non_public_address' }));
    const { app, coordinator } = await harness(kernel);
    for (const key of ['held-outcome', 'no-story-outcome', 'redirect-private-outcome']) {
      const started = await request(app).post('/api/foundry/captures').set(csrf).send({
        url: 'https://example.com/', actor: 'editor', idempotencyKey: key,
      }).expect(202);
      await waitForTerminal(coordinator, started.body.id);
    }
    const listed = await request(app).get('/api/foundry/captures').expect(200);
    expect(listed.body.captures.map((item: { state: string }) => item.state).sort()).toEqual(['failed', 'held', 'no_story']);
    expect(listed.text).toContain('redirect_non_public_address');
    expect(listed.text).toContain('https://private.invalid/');
    expect(listed.text).not.toContain('169.254.169.254');
    expect(listed.text).not.toContain('raw event secret');
    expect(listed.text).not.toContain('10.0.0.1');
    expect(listed.text).not.toContain('Unsafe raw detail');
    expect(listed.body.captures.every((item: { runId?: string }) => !item.runId)).toBe(true);
  });

  it('marks ordinary price, fee, currency-code and symbol assertions restricted at ingestion', async () => {
    const kernel = new FakeKernel((input) => recordFor(input, {
      text: 'Tickets cost 20 dollars.\n\nAn entry fee applies.\n\nAdmission costs AUD 20.\n\nTickets are $20.\n\nAdmission is available at no charge.\n\nA booking surcharge applies.',
    }));
    const { app, coordinator } = await harness(kernel);
    const started = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'restricted-price-copy',
    }).expect(202);
    await waitForTerminal(coordinator, started.body.id);
    const projection = (await request(app).get(`/api/foundry/captures/${started.body.id}`)).body;
    const run = (await request(app).get(`/api/foundry/runs/${projection.runId}`)).body;
    expect(run.claims).toHaveLength(6);
    expect(run.claims.every((claim: { restrictedFromArtifacts: boolean; restrictionReason?: string }) => claim.restrictedFromArtifacts
      && claim.restrictionReason === 'PI outputs do not publish prices.')).toBe(true);
    expect(run.artifact.claimIds).toEqual([]);
  });

  it('requires human source classification and claim/angle confirmation before review and patch', async () => {
    const kernel = new FakeKernel((input) => recordFor(input));
    const { app, coordinator, repository } = await harness(kernel);
    const started = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/?signature=top-secret', actor: 'editor', idempotencyKey: 'reviewed-url',
    }).expect(202);
    await waitForTerminal(coordinator, started.body.id);
    const projection = (await request(app).get(`/api/foundry/captures/${started.body.id}`).expect(200)).body;
    const created = (await request(app).get(`/api/foundry/runs/${projection.runId}`).expect(200)).body;
    expect(created.status).toBe('needs_revision');
    expect(created.artifact.gateResults.find((gate: { gate: string }) => gate.gate === 'human_source_review').passed).toBe(false);
    for (const unsupported of [
      { headline: 'The venue seats 500 guests' },
      { dek: 'It opens seven days a week.' },
      { body: 'The venue seats 500 guests and opens seven days a week.' },
    ]) {
      await request(app).put(`/api/foundry/runs/${created.id}/artifact`).set(csrf).send({
        editor: 'editor', expectedVersion: created.version,
        sourceKind: 'web', claimIds: created.artifact.claimIds, confirmAngle: true,
        ...unsupported,
      }).expect(400).expect(({ body, text }) => {
        expect(body.error.code).toBe('request_failed');
        expect(text).not.toContain(Object.values(unsupported)[0]);
      });
    }
    const edited = await request(app).put(`/api/foundry/runs/${created.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: created.version,
      sourceKind: 'web', claimIds: created.artifact.claimIds, confirmAngle: true,
    }).expect(200);
    expect(edited.body.status).toBe('ready_for_review');
    const accepted = await request(app).put(`/api/foundry/runs/${created.id}/review`).set(csrf).send({
      decision: 'accepted', reviewer: 'editor', expectedVersion: edited.body.version,
    }).expect(200);
    const patch = await request(app).get(`/api/foundry/runs/${created.id}/patch`).expect(200);
    expect(patch.text).toContain('kind: web');
    expect(patch.text).toContain('url: "https://example.com/?signature=%5Bredacted%5D"');
    expect(patch.text).not.toContain('top-secret');
    expect(accepted.body.reviewHistory.at(-1).validity).toBe('current');
    expect(() => buildPatch({
      ...accepted.body,
      artifact: {
        ...accepted.body.artifact,
        payload: { ...accepted.body.artifact.payload, body: 'The venue seats 500 guests.' },
      },
    }, repository.records.get(accepted.body.capture.artifactAttemptId))).toThrow(/binding/i);
  });

  it('rejects persisted real-source copy that no longer matches immutable lineage at review', async () => {
    const kernel = new FakeKernel((input) => recordFor(input));
    const { app, coordinator, file } = await harness(kernel);
    const started = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'tampered-lineage',
    }).expect(202);
    await waitForTerminal(coordinator, started.body.id);
    const projection = (await request(app).get(`/api/foundry/captures/${started.body.id}`)).body;
    const created = (await request(app).get(`/api/foundry/runs/${projection.runId}`)).body;
    const edited = (await request(app).put(`/api/foundry/runs/${created.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: created.version,
      sourceKind: 'web', claimIds: [created.artifact.claimIds[0]], confirmAngle: true,
    }).expect(200)).body;
    const persisted = JSON.parse(await readFile(file, 'utf8'));
    persisted.runs[0].artifact.payload.body = 'Unsupported persisted factual copy.';
    await writeFile(file, `${JSON.stringify(persisted)}\n`, 'utf8');
    await request(app).put(`/api/foundry/runs/${created.id}/review`).set(csrf).send({
      decision: 'accepted', reviewer: 'editor', expectedVersion: edited.version,
    }).expect(400).expect(({ body, text }) => {
      expect(body.error.code).toBe('request_failed');
      expect(text).not.toContain('Unsupported persisted factual copy');
    });
  });

  it('rejects forged export metadata, immutable summaries, source items, claims and evidence on every persisted path', async () => {
    const kernel = new FakeKernel((input) => recordFor(input, {
      text: 'First immutable source assertion.\n\nSecond immutable source assertion.',
    }));
    const { app, coordinator, file, directory, repository } = await harness(kernel);
    const started = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'immutable-integrity',
    }).expect(202);
    await waitForTerminal(coordinator, started.body.id);
    const projection = (await request(app).get(`/api/foundry/captures/${started.body.id}`)).body;
    const created = (await request(app).get(`/api/foundry/runs/${projection.runId}`)).body;
    const edited = (await request(app).put(`/api/foundry/runs/${created.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: created.version,
      sourceKind: 'web', claimIds: [created.artifact.claimIds[0]], confirmAngle: true,
    }).expect(200)).body;
    await request(app).put(`/api/foundry/runs/${created.id}/review`).set(csrf).send({
      decision: 'accepted', reviewer: 'editor', expectedVersion: edited.version,
    }).expect(200);
    const original = JSON.parse(await readFile(file, 'utf8'));
    const findRun = (data: typeof original) => data.runs.find((run: { id: string }) => run.id === created.id);

    const flagOffStore = new FileFoundryStore(file, directory, repository);
    const flagOffApp = createApp(flagOffStore);
    await request(flagOffApp).get('/api/capabilities').expect(200).expect(({ body }) => {
      expect(body.realUrlCapture.enabled).toBe(false);
      expect(body.externalCalls).toBe(false);
    });
    await request(flagOffApp).get('/api/foundry/runs').expect(200)
      .expect(({ body }) => expect(body.runs.some((run: { id: string }) => run.id === created.id)).toBe(true));
    await request(flagOffApp).get('/api/foundry/captures').expect(404);

    const unavailableResolver: CaptureRepositoryPort = { get: async () => { throw new Error('resolver unavailable internal detail'); } };
    const unavailableStore = new FileFoundryStore(file, directory, unavailableResolver);
    const unavailableApp = createApp(unavailableStore, {
      realUrlsEnabled: true,
      coordinator: new RealUrlCoordinator(unavailableStore, new FakeKernel(() => { throw new Error('must not capture'); }), unavailableResolver),
    });
    await request(unavailableApp).get(`/api/foundry/runs/${created.id}/patch`).expect(400).expect(({ body, text }) => {
      expect(body.error.code).toBe('request_failed');
      expect(text).not.toContain('resolver unavailable internal detail');
    });

    const projectionForgery = structuredClone(original);
    projectionForgery.captureProjections.find((item: { id: string }) => item.id === started.body.id)
      .summary.sourceRevision.contentHash = hash('fabricated-projection');
    await writeFile(file, `${JSON.stringify(projectionForgery)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory, repository).getCaptureProjection(started.body.id))
      .rejects.toThrow(/capture projection/);

    const metadataForgery = structuredClone(original);
    const forgedMetadata = findRun(metadataForgery);
    forgedMetadata.artifact.payload = {
      ...forgedMetadata.artifact.payload,
      section: 'eat', tag: 'event',
      publishedAt: '2039-01-01T00:00:00.000Z', expiresAt: '2039-01-08T00:00:00.000Z',
      verifiedAt: '2039-01-01T00:00:00.000Z', verifiedBy: 'attacker',
      sources: [{ kind: 'partner', url: 'https://attacker.example/fabricated-source', checkedAt: '2039-01-01T00:00:00.000Z', note: 'fabricated' }],
    };
    forgedMetadata.artifact.targetPath = 'next/src/content/quick-notes/2039-01-01-fabricated-source.md';
    forgedMetadata.artifact.contentLineage.exportBindingHash = hash(JSON.stringify({
      payload: forgedMetadata.artifact.payload,
      targetPath: forgedMetadata.artifact.targetPath,
      claimIds: forgedMetadata.artifact.claimIds,
    }));
    await writeFile(file, `${JSON.stringify(metadataForgery)}\n`, 'utf8');
    const metadataStore = new FileFoundryStore(file, directory, repository);
    const metadataApp = createApp(metadataStore, {
      realUrlsEnabled: true,
      coordinator: new RealUrlCoordinator(metadataStore, new FakeKernel(() => { throw new Error('must not capture'); }), repository),
    });
    await expect(metadataStore.get(created.id)).rejects.toThrow(/export binding/);
    await request(metadataApp).put(`/api/foundry/runs/${created.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: 3, sourceKind: 'web', claimIds: created.artifact.claimIds, confirmAngle: true,
    }).expect(400).expect(({ body }) => expect(body.error.code).toBe('request_failed'));
    await request(metadataApp).put(`/api/foundry/runs/${created.id}/review`).set(csrf).send({
      decision: 'accepted', reviewer: 'editor', expectedVersion: 3,
    }).expect(400).expect(({ body }) => expect(body.error.code).toBe('request_failed'));
    await request(metadataApp).get(`/api/foundry/runs/${created.id}/patch`).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('request_failed'));

    const sourceReviewForgery = structuredClone(original);
    const forgedReview = findRun(sourceReviewForgery);
    forgedReview.artifact.sourceReview = {
      ...forgedReview.artifact.sourceReview,
      sourceKind: 'partner', confirmedBy: 'attacker', confirmedAt: '2039-01-01T00:00:00.000Z',
    };
    const reviewDependency = forgedReview.capture.revisions.find((revision: { attemptId: string }) => revision.attemptId === forgedReview.capture.artifactAttemptId);
    const reviewBinding = buildRealUrlArtifactBinding(forgedReview.claims, forgedReview.artifact.claimIds, {
      canonicalUrl: reviewDependency.sourceRevision.canonicalUrl,
      capturedAt: reviewDependency.sourceRevision.capturedAt,
      contentHash: reviewDependency.sourceRevision.contentHash,
    }, 'partner');
    forgedReview.artifact.payload = reviewBinding.payload;
    forgedReview.artifact.targetPath = reviewBinding.targetPath;
    forgedReview.artifact.contentLineage = reviewBinding.lineage;
    forgedReview.artifact.gateResults = evaluateQuickNoteGates(
      forgedReview.artifact.payload, forgedReview.claims, forgedReview.artifact.claimIds,
      { requireSourceReview: true, sourceReviewComplete: true },
    );
    await writeFile(file, `${JSON.stringify(sourceReviewForgery)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory, repository).get(created.id)).rejects.toThrow(/review receipt/);

    const statusOnlyForgery = structuredClone(original);
    const statusOnly = findRun(statusOnlyForgery);
    statusOnly.status = 'accepted';
    statusOnly.review = undefined;
    statusOnly.reviewHistory = [];
    await writeFile(file, `${JSON.stringify(statusOnlyForgery)}\n`, 'utf8');
    const statusOnlyStore = new FileFoundryStore(file, directory, repository);
    const statusOnlyApp = createApp(statusOnlyStore, {
      realUrlsEnabled: true,
      coordinator: new RealUrlCoordinator(statusOnlyStore, new FakeKernel(() => { throw new Error('must not capture'); }), repository),
    });
    await expect(statusOnlyStore.get(created.id)).rejects.toThrow(/matching current immutable review/);
    await request(statusOnlyApp).get(`/api/foundry/runs/${created.id}/patch`).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('invalid_request'));

    await writeFile(file, `${JSON.stringify(original)}\n`, 'utf8');
    const rejectedStore = new FileFoundryStore(file, directory, repository);
    const rejectedRun = await rejectedStore.review(created.id, {
      decision: 'rejected', reviewer: 'second-reviewer', expectedVersion: findRun(original).version,
    });
    const rejectedStatusForgery = JSON.parse(await readFile(file, 'utf8'));
    findRun(rejectedStatusForgery).status = 'accepted';
    await writeFile(file, `${JSON.stringify(rejectedStatusForgery)}\n`, 'utf8');
    const forgedRejectedStore = new FileFoundryStore(file, directory, repository);
    const forgedRejectedApp = createApp(forgedRejectedStore, {
      realUrlsEnabled: true,
      coordinator: new RealUrlCoordinator(forgedRejectedStore, new FakeKernel(() => { throw new Error('must not capture'); }), repository),
    });
    expect(rejectedRun.status).toBe('rejected');
    await expect(forgedRejectedStore.get(created.id)).rejects.toThrow(/matching current immutable review/);
    await request(forgedRejectedApp).get(`/api/foundry/runs/${created.id}/patch`).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('invalid_request'));

    const claimSwitchForgery = structuredClone(original);
    const switched = findRun(claimSwitchForgery);
    const alternateClaim = switched.claims.find((claim: { id: string; restrictedFromArtifacts?: boolean }) => !switched.artifact.claimIds.includes(claim.id)
      && !claim.restrictedFromArtifacts);
    expect(alternateClaim).toBeTruthy();
    if (!alternateClaim) throw new Error('Expected an alternate immutable claim');
    switched.artifact.claimIds = [alternateClaim.id];
    switched.angle.evidenceClaimIds = [alternateClaim.id];
    switched.artifact.sourceReview.confirmedClaimIds = [alternateClaim.id];
    const switchDependency = switched.capture.revisions.find((revision: { attemptId: string }) => revision.attemptId === switched.capture.artifactAttemptId);
    const switchBinding = buildRealUrlArtifactBinding(switched.claims, switched.artifact.claimIds, {
      canonicalUrl: switchDependency.sourceRevision.canonicalUrl,
      capturedAt: switchDependency.sourceRevision.capturedAt,
      contentHash: switchDependency.sourceRevision.contentHash,
    }, switched.artifact.sourceReview.sourceKind);
    switched.artifact.payload = switchBinding.payload;
    switched.artifact.targetPath = switchBinding.targetPath;
    switched.artifact.contentLineage = switchBinding.lineage;
    switched.artifact.gateResults = evaluateQuickNoteGates(
      switched.artifact.payload, switched.claims, switched.artifact.claimIds,
      { requireSourceReview: true, sourceReviewComplete: true },
    );
    await writeFile(file, `${JSON.stringify(claimSwitchForgery)}\n`, 'utf8');
    const switchedStore = new FileFoundryStore(file, directory, repository);
    await expect(switchedStore.get(created.id)).rejects.toThrow(/review receipt/);
    const switchedApp = createApp(switchedStore, {
      realUrlsEnabled: true,
      coordinator: new RealUrlCoordinator(switchedStore, new FakeKernel(() => { throw new Error('must not capture'); }), repository),
    });
    await request(switchedApp).get(`/api/foundry/runs/${created.id}/patch`).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('request_failed'));

    for (const mutate of [
      (run: typeof forgedMetadata) => { run.claims[0].evidence[0].locator = 'block:999999'; },
      (run: typeof forgedMetadata) => { run.claims[0].evidence[0].excerpt = 'Fabricated excerpt.'; },
      (run: typeof forgedMetadata) => { run.claims[0].evidence[0].excerptHash = hash('Fabricated excerpt.'); },
    ]) {
      const evidenceForgery = structuredClone(original);
      mutate(findRun(evidenceForgery));
      await writeFile(file, `${JSON.stringify(evidenceForgery)}\n`, 'utf8');
      await expect(new FileFoundryStore(file, directory, repository).get(created.id)).rejects.toThrow(/immutable extraction/);
    }

    const ledgerForgery = structuredClone(original);
    const forgedLedger = findRun(ledgerForgery);
    const claim = forgedLedger.claims.find((item: { id: string }) => item.id === forgedLedger.artifact.claimIds[0]);
    claim.text = 'The venue seats 500 guests.';
    claim.evidence[0].locator = 'block:999999';
    claim.evidence[0].excerpt = claim.text;
    claim.evidence[0].excerptHash = hash(claim.text);
    const artifactDependency = forgedLedger.capture.revisions.find((revision: { attemptId: string }) => revision.attemptId === forgedLedger.capture.artifactAttemptId);
    const rebound = buildRealUrlArtifactBinding(forgedLedger.claims, forgedLedger.artifact.claimIds, {
      canonicalUrl: artifactDependency.sourceRevision.canonicalUrl,
      capturedAt: artifactDependency.sourceRevision.capturedAt,
      contentHash: artifactDependency.sourceRevision.contentHash,
    }, forgedLedger.artifact.sourceReview.sourceKind);
    forgedLedger.artifact.payload = rebound.payload;
    forgedLedger.artifact.targetPath = rebound.targetPath;
    forgedLedger.artifact.contentLineage = rebound.lineage;
    await writeFile(file, `${JSON.stringify(ledgerForgery)}\n`, 'utf8');
    const ledgerStore = new FileFoundryStore(file, directory, repository);
    await expect(ledgerStore.get(created.id)).rejects.toThrow(/immutable extraction/);
    const ledgerApp = createApp(ledgerStore, {
      realUrlsEnabled: true,
      coordinator: new RealUrlCoordinator(ledgerStore, new FakeKernel(() => { throw new Error('must not capture'); }), repository),
    });
    await request(ledgerApp).get(`/api/foundry/runs/${created.id}/patch`).expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('request_failed'));

    const summaryForgery = structuredClone(original);
    const forgedSummary = findRun(summaryForgery);
    const summaryDependency = forgedSummary.capture.revisions.find((revision: { attemptId: string }) => revision.attemptId === forgedSummary.capture.artifactAttemptId);
    summaryDependency.sourceRevision.canonicalUrl = 'https://attacker.example/fabricated-source';
    summaryDependency.sourceRevision.capturedAt = '2039-01-01T00:00:00.000Z';
    summaryDependency.sourceRevision.contentHash = hash('fabricated-source');
    summaryDependency.extractionRevision.contentHash = hash('fabricated-extraction');
    forgedSummary.bundle.sourceItems[0] = {
      ...forgedSummary.bundle.sourceItems[0],
      uri: summaryDependency.sourceRevision.canonicalUrl,
      contentHash: summaryDependency.sourceRevision.contentHash,
      capturedAt: summaryDependency.sourceRevision.capturedAt,
    };
    const summaryBinding = buildRealUrlArtifactBinding(forgedSummary.claims, forgedSummary.artifact.claimIds, {
      canonicalUrl: summaryDependency.sourceRevision.canonicalUrl,
      capturedAt: summaryDependency.sourceRevision.capturedAt,
      contentHash: summaryDependency.sourceRevision.contentHash,
    }, forgedSummary.artifact.sourceReview.sourceKind);
    forgedSummary.artifact.payload = summaryBinding.payload;
    forgedSummary.artifact.targetPath = summaryBinding.targetPath;
    forgedSummary.artifact.contentLineage = summaryBinding.lineage;
    await writeFile(file, `${JSON.stringify(summaryForgery)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory, repository).get(created.id)).rejects.toThrow(/immutable manifest/);
  });

  it('refresh creates a new immutable revision and retains the prior review as stale', async () => {
    const kernel = new FakeKernel((input, call) => recordFor(input, { text: call === 1 ? 'First source assertion.' : 'Second source assertion.' }));
    const { app, coordinator, directory } = await harness(kernel);
    const first = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'refresh-first',
    }).expect(202);
    await waitForTerminal(coordinator, first.body.id);
    const firstProjection = (await request(app).get(`/api/foundry/captures/${first.body.id}`)).body;
    let run = (await request(app).get(`/api/foundry/runs/${firstProjection.runId}`)).body;
    run = (await request(app).put(`/api/foundry/runs/${run.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: run.version,
      headline: run.artifact.payload.headline, dek: run.artifact.payload.dek, body: run.artifact.payload.body,
      sourceKind: 'web', claimIds: run.artifact.claimIds, confirmAngle: true,
    })).body;
    run = (await request(app).put(`/api/foundry/runs/${run.id}/review`).set(csrf).send({ decision: 'accepted', reviewer: 'editor', expectedVersion: run.version })).body;
    const firstReceiptHash = run.review.receiptHash;
    const refreshed = await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'refresh-second', expectedVersion: run.version,
    }).expect(202);
    await waitForTerminal(coordinator, refreshed.body.id);
    const current = (await request(app).get(`/api/foundry/runs/${run.id}`).expect(200)).body;
    expect(current.capture.revisions).toHaveLength(2);
    expect(current.capture.currentAttemptId).toBe(current.capture.artifactAttemptId);
    expect(current.review).toBeUndefined();
    expect(current.reviewHistory.at(-1)).toMatchObject({
      validity: 'stale', staleReason: 'source_refreshed', receiptHash: firstReceiptHash,
    });
    expect(JSON.parse(await readFile(join(directory, 'review-receipts', `${firstReceiptHash}.json`), 'utf8'))).toMatchObject({
      runId: run.id, decision: 'accepted', reviewer: 'editor',
    });
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);

    let reviewedAgain = (await request(app).put(`/api/foundry/runs/${run.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: current.version,
      headline: current.artifact.payload.headline, dek: current.artifact.payload.dek, body: current.artifact.payload.body,
      sourceKind: 'web', claimIds: current.artifact.claimIds, confirmAngle: true,
    }).expect(200)).body;
    reviewedAgain = (await request(app).put(`/api/foundry/runs/${run.id}/review`).set(csrf).send({
      decision: 'accepted', reviewer: 'editor', expectedVersion: reviewedAgain.version,
    }).expect(200)).body;
    const third = await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'refresh-third', expectedVersion: reviewedAgain.version,
    }).expect(202);
    await waitForTerminal(coordinator, third.body.id);
    const afterThird = (await request(app).get(`/api/foundry/runs/${run.id}`).expect(200)).body;
    expect(afterThird.reviewHistory).toHaveLength(2);
    expect(afterThird.reviewHistory.every((entry: { validity: string }) => entry.validity === 'stale')).toBe(true);
    expect(afterThird.reviewHistory.map((entry: { decidedAt: string }) => entry.decidedAt)).toEqual([
      run.reviewHistory.at(-1).decidedAt,
      reviewedAgain.reviewHistory.at(-1).decidedAt,
    ]);
  });

  it('rejects refreshes for a different logical URL before another network call', async () => {
    const kernel = new FakeKernel((input) => recordFor(input));
    const { app, coordinator } = await harness(kernel);
    const first = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/?id=1', actor: 'editor', idempotencyKey: 'source-match-first',
    }).expect(202);
    await waitForTerminal(coordinator, first.body.id);
    const projection = (await request(app).get(`/api/foundry/captures/${first.body.id}`)).body;
    const run = (await request(app).get(`/api/foundry/runs/${projection.runId}`)).body;
    await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send({
      url: 'https://example.com/?id=2', actor: 'editor', idempotencyKey: 'source-match-second', expectedVersion: run.version,
    }).expect(400).expect(({ body }) => expect(body.error.code).toBe('source_mismatch'));
    expect(kernel.calls).toBe(1);
  });

  it('binds refresh idempotency to exact operation context and locks run mutations in flight', async () => {
    let releaseRefresh!: (record: CaptureRecord) => void;
    const refreshDeferred = new Promise<CaptureRecord>((resolve) => { releaseRefresh = resolve; });
    const kernel = new FakeKernel((input, call) => call === 1 ? recordFor(input) : refreshDeferred);
    const { app, coordinator } = await harness(kernel);
    const first = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/?id=1', actor: 'editor', idempotencyKey: 'refresh-context-first',
    }).expect(202);
    await waitForTerminal(coordinator, first.body.id);
    const projection = (await request(app).get(`/api/foundry/captures/${first.body.id}`)).body;
    let run = (await request(app).get(`/api/foundry/runs/${projection.runId}`)).body;
    run = (await request(app).put(`/api/foundry/runs/${run.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: run.version,
      sourceKind: 'web', claimIds: run.artifact.claimIds, confirmAngle: true,
    }).expect(200)).body;
    run = (await request(app).put(`/api/foundry/runs/${run.id}/review`).set(csrf).send({
      decision: 'accepted', reviewer: 'editor', expectedVersion: run.version,
    }).expect(200)).body;
    const refreshBody = {
      url: 'https://example.com/?id=1', actor: 'editor', idempotencyKey: 'refresh-context-second', expectedVersion: run.version,
    };
    const refresh = await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send(refreshBody).expect(202);
    const exactRetry = await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send(refreshBody).expect(200);
    expect(exactRetry.body.id).toBe(refresh.body.id);
    await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send({ ...refreshBody, expectedVersion: run.version + 1 })
      .expect(409).expect(({ body }) => expect(body.error.code).toBe('idempotency_conflict'));
    await request(app).put(`/api/foundry/runs/${run.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: run.version,
      sourceKind: 'web', claimIds: run.artifact.claimIds, confirmAngle: true,
    }).expect(409).expect(({ body }) => expect(body.error.code).toBe('source_refresh_in_progress'));
    await request(app).put(`/api/foundry/runs/${run.id}/review`).set(csrf).send({
      decision: 'rejected', reviewer: 'editor', expectedVersion: run.version,
    }).expect(409).expect(({ body }) => expect(body.error.code).toBe('source_refresh_in_progress'));
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(409)
      .expect(({ body }) => expect(body.error.code).toBe('source_refresh_in_progress'));
    releaseRefresh(recordFor({ url: refreshBody.url, idempotencyKey: refreshBody.idempotencyKey }, { text: 'Second immutable assertion.' }));
    await waitForTerminal(coordinator, refresh.body.id);
    const completedRetry = await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send(refreshBody).expect(200);
    expect(completedRetry.body.id).toBe(refresh.body.id);
    expect((await request(app).get(`/api/foundry/runs/${run.id}`)).body.capture.revisions).toHaveLength(2);
    expect(kernel.calls).toBe(2);
  });

  it('a no-story refresh advances the source head, keeps the prior artifact dependency, and blocks patch', async () => {
    const kernel = new FakeKernel((input, call) => recordFor(input, call === 1 ? {} : { state: 'no_story' }));
    const { app, coordinator } = await harness(kernel);
    const first = await request(app).post('/api/foundry/captures').set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'no-story-first',
    }).expect(202);
    await waitForTerminal(coordinator, first.body.id);
    const projection = (await request(app).get(`/api/foundry/captures/${first.body.id}`)).body;
    let run = (await request(app).get(`/api/foundry/runs/${projection.runId}`)).body;
    run = (await request(app).put(`/api/foundry/runs/${run.id}/artifact`).set(csrf).send({
      editor: 'editor', expectedVersion: run.version,
      headline: run.artifact.payload.headline, dek: run.artifact.payload.dek, body: run.artifact.payload.body,
      sourceKind: 'web', claimIds: run.artifact.claimIds, confirmAngle: true,
    })).body;
    run = (await request(app).put(`/api/foundry/runs/${run.id}/review`).set(csrf).send({ decision: 'accepted', reviewer: 'editor', expectedVersion: run.version })).body;
    const refreshed = await request(app).post(`/api/foundry/runs/${run.id}/refresh`).set(csrf).send({
      url: 'https://example.com/', actor: 'editor', idempotencyKey: 'no-story-second', expectedVersion: run.version,
    }).expect(202);
    await waitForTerminal(coordinator, refreshed.body.id);
    const current = (await request(app).get(`/api/foundry/runs/${run.id}`)).body;
    expect(current.capture.currentAttemptId).not.toBe(current.capture.artifactAttemptId);
    expect(current.capture.revisions.at(-1).state).toBe('no_story');
    expect(current.status).toBe('needs_revision');
    expect(current.reviewHistory.at(-1).validity).toBe('stale');
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);
  });

  it('reconciles manifest-before-mapping once and marks missing manifests interrupted without refetch', async () => {
    const kernel = new FakeKernel(() => { throw new Error('must not refetch'); });
    const { store, repository, file } = await harness(kernel);
    const input = { url: 'https://example.com/', idempotencyKey: 'crash-manifest' };
    const identity = captureRequestIdentity(input);
    const timestamp = '2026-08-21T08:00:00.000Z';
    await store.createCaptureProjection({
      schemaVersion: 'pi.capture-projection.v1', id: `projection-${identity.idempotencyKeyHash.slice(0, 24)}`,
      sourceId: `source-head-${hash(identity.safeRequestedUrl).slice(0, 20)}`, attemptId: identity.attemptId,
      actor: 'editor', idempotencyKeyHash: identity.idempotencyKeyHash, requestFingerprint: identity.requestFingerprint,
      operation: 'initial', operationFingerprint: hash('crash-manifest-operation'),
      requestedUrl: identity.safeRequestedUrl, state: 'queued', createdAt: timestamp, updatedAt: timestamp,
    });
    await store.markCaptureProjectionCapturing(`projection-${identity.idempotencyKeyHash.slice(0, 24)}`, timestamp);
    repository.records.set(identity.attemptId, recordFor(input));
    const recovered = new RealUrlCoordinator(store, kernel, repository);
    await recovered.reconcile();
    await recovered.reconcile();
    expect((await store.list()).length).toBe(1);
    expect((await store.getCaptureProjection(`projection-${identity.idempotencyKeyHash.slice(0, 24)}`))?.state).toBe('extracted');
    expect(kernel.calls).toBe(0);

    const missingInput = { url: 'https://example.org/', idempotencyKey: 'crash-no-manifest' };
    const missing = captureRequestIdentity(missingInput);
    await store.createCaptureProjection({
      schemaVersion: 'pi.capture-projection.v1', id: `projection-${missing.idempotencyKeyHash.slice(0, 24)}`,
      sourceId: `source-head-${hash(missing.safeRequestedUrl).slice(0, 20)}`, attemptId: missing.attemptId,
      actor: 'editor', idempotencyKeyHash: missing.idempotencyKeyHash, requestFingerprint: missing.requestFingerprint,
      operation: 'initial', operationFingerprint: hash('crash-missing-operation'),
      requestedUrl: missing.safeRequestedUrl, state: 'queued', createdAt: timestamp, updatedAt: timestamp,
    });
    await recovered.reconcile();
    expect((await store.getCaptureProjection(`projection-${missing.idempotencyKeyHash.slice(0, 24)}`))?.failure?.code).toBe('capture_interrupted');
    expect(kernel.calls).toBe(0);
    expect(JSON.parse(await readFile(file, 'utf8')).schemaVersion).toBe('pi.foundry-file-store.v2');
  });

  it('recovers a real immutable manifest across the capture and projection stores without refetch', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-real-crash-'));
    temporaryDirectories.push(directory);
    const repository = new FileCaptureRepository(directory);
    const store = new FileFoundryStore(join(directory, 'runs.json'), directory, repository);
    const kernel = new FakeKernel(() => { throw new Error('must not refetch'); });
    const input = { url: 'https://example.com/', idempotencyKey: 'real-repository-crash' };
    const identity = captureRequestIdentity(input);
    const projectionId = `projection-${identity.idempotencyKeyHash.slice(0, 24)}`;
    const timestamp = '2026-08-21T08:00:00.000Z';
    await store.createCaptureProjection({
      schemaVersion: 'pi.capture-projection.v1', id: projectionId,
      sourceId: `source-head-${hash(identity.safeRequestedUrl).slice(0, 20)}`, attemptId: identity.attemptId,
      actor: 'editor', idempotencyKeyHash: identity.idempotencyKeyHash, requestFingerprint: identity.requestFingerprint,
      operation: 'initial', operationFingerprint: hash('real-repository-operation'),
      requestedUrl: identity.safeRequestedUrl, state: 'queued', createdAt: timestamp, updatedAt: timestamp,
    });
    await store.markCaptureProjectionCapturing(projectionId, timestamp);
    await repository.save(recordFor(input));
    const restarted = new RealUrlCoordinator(store, kernel, repository);
    await restarted.reconcile();
    await restarted.reconcile();
    expect((await store.getCaptureProjection(projectionId))?.state).toBe('extracted');
    expect(await store.list()).toHaveLength(1);
    expect(kernel.calls).toBe(0);
  });

  it('materializes a terminal refresh after a legacy version race and retains summaries for missing targets', async () => {
    const kernel = new FakeKernel((input) => recordFor(input));
    const repository = new FakeRepository();
    const { app, coordinator, store, file } = await harness(kernel, repository);
    const initialInput = { url: 'https://example.com/?id=1', idempotencyKey: 'legacy-race-initial' };
    const first = await request(app).post('/api/foundry/captures').set(csrf).send({
      ...initialInput, actor: 'editor',
    }).expect(202);
    await waitForTerminal(coordinator, first.body.id);
    const initialProjection = (await request(app).get(`/api/foundry/captures/${first.body.id}`)).body;
    const run = (await store.get(initialProjection.runId))!;

    const refreshInput = { url: initialInput.url, idempotencyKey: 'legacy-race-refresh' };
    const refreshIdentity = captureRequestIdentity(refreshInput);
    const refreshProjectionId = `projection-${refreshIdentity.idempotencyKeyHash.slice(0, 24)}`;
    const timestamp = '2026-08-21T09:00:00.000Z';
    await store.createCaptureProjection({
      schemaVersion: 'pi.capture-projection.v1', id: refreshProjectionId,
      sourceId: initialProjection.sourceId, attemptId: refreshIdentity.attemptId,
      actor: 'editor', idempotencyKeyHash: refreshIdentity.idempotencyKeyHash,
      requestFingerprint: refreshIdentity.requestFingerprint,
      operation: 'refresh', operationFingerprint: hash('legacy-refresh-operation'),
      requestedUrl: refreshIdentity.safeRequestedUrl, state: 'queued', createdAt: timestamp, updatedAt: timestamp,
      refreshRunId: run.id, expectedRunVersion: run.version,
    });
    await store.markCaptureProjectionCapturing(refreshProjectionId, timestamp);
    const raced = JSON.parse(await readFile(file, 'utf8'));
    raced.runs[0].version += 1;
    await writeFile(file, `${JSON.stringify(raced)}\n`, 'utf8');
    repository.records.set(refreshIdentity.attemptId, recordFor(refreshInput, { text: 'Recovered immutable assertion.' }));
    const restarted = new RealUrlCoordinator(store, new FakeKernel(() => { throw new Error('must not refetch'); }), repository);
    await restarted.reconcile();
    await restarted.reconcile();
    const recoveredProjection = await store.getCaptureProjection(refreshProjectionId);
    expect(recoveredProjection?.state).toBe('extracted');
    expect(recoveredProjection?.summary?.sourceRevision).toBeTruthy();
    expect(recoveredProjection?.materializationFailure).toBeUndefined();
    const recoveredRun = (await store.get(run.id))!;
    expect(recoveredRun.version).toBe(run.version + 2);
    expect(recoveredRun.capture?.revisions).toHaveLength(2);

    const orphanInput = { url: initialInput.url, idempotencyKey: 'missing-target-refresh' };
    const orphanIdentity = captureRequestIdentity(orphanInput);
    const orphanProjectionId = `projection-${orphanIdentity.idempotencyKeyHash.slice(0, 24)}`;
    await store.createCaptureProjection({
      schemaVersion: 'pi.capture-projection.v1', id: orphanProjectionId,
      sourceId: initialProjection.sourceId, attemptId: orphanIdentity.attemptId,
      actor: 'editor', idempotencyKeyHash: orphanIdentity.idempotencyKeyHash,
      requestFingerprint: orphanIdentity.requestFingerprint,
      operation: 'refresh', operationFingerprint: hash('missing-target-operation'),
      requestedUrl: orphanIdentity.safeRequestedUrl, state: 'queued', createdAt: timestamp, updatedAt: timestamp,
      refreshRunId: recoveredRun.id, expectedRunVersion: recoveredRun.version,
    });
    await store.markCaptureProjectionCapturing(orphanProjectionId, timestamp);
    const orphaned = JSON.parse(await readFile(file, 'utf8'));
    orphaned.runs = [];
    await writeFile(file, `${JSON.stringify(orphaned)}\n`, 'utf8');
    repository.records.set(orphanIdentity.attemptId, recordFor(orphanInput, { text: 'Terminal orphan assertion.' }));
    await restarted.reconcile();
    await restarted.reconcile();
    const retained = await store.getCaptureProjection(orphanProjectionId);
    expect(retained?.state).toBe('extracted');
    expect(retained?.summary?.sourceRevision).toBeTruthy();
    expect(retained?.materializationFailure?.code).toBe('refresh_target_missing');
    expect(kernel.calls).toBe(1);
  });

  it('rejects mutable store hardlinks, directories and escaping junctions', async () => {
    const hardlinkRoot = await mkdtemp(join(tmpdir(), 'pi-foundry-hardlink-'));
    const outside = await mkdtemp(join(tmpdir(), 'pi-foundry-outside-'));
    temporaryDirectories.push(hardlinkRoot, outside);
    const file = join(hardlinkRoot, 'runs.json');
    const store = new FileFoundryStore(file, hardlinkRoot);
    await store.create(runFixture('editor', 'store-hardlink'));
    await link(file, join(hardlinkRoot, 'mirror.json'));
    await expect(store.list()).rejects.toThrow(/private regular file/);

    const directoryRoot = await mkdtemp(join(tmpdir(), 'pi-foundry-directory-'));
    temporaryDirectories.push(directoryRoot);
    await mkdir(join(directoryRoot, 'runs.json'));
    await expect(new FileFoundryStore(join(directoryRoot, 'runs.json'), directoryRoot).list()).rejects.toThrow(/private regular file/);

    await writeFile(join(outside, 'runs.json'), '{"schemaVersion":"pi.foundry-file-store.v2","runs":[],"captureProjections":[]}', 'utf8');
    const junctionRoot = await mkdtemp(join(tmpdir(), 'pi-foundry-junction-'));
    temporaryDirectories.push(junctionRoot);
    await symlink(outside, join(junctionRoot, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(new FileFoundryStore(join(junctionRoot, 'escape', 'runs.json'), junctionRoot).list()).rejects.toThrow(/escaped/);
  });

  it('fails closed when immutable review receipts are missing or changed into links and non-files', async () => {
    const reviewedFixture = async (prefix: string) => {
      const root = await mkdtemp(join(tmpdir(), prefix));
      temporaryDirectories.push(root);
      const store = new FileFoundryStore(join(root, 'runs.json'), root);
      const created = await store.create(runFixture('editor', `${prefix}-fixture`));
      const reviewed = await store.review(created.id, {
        decision: 'accepted', reviewer: 'reviewer', expectedVersion: created.version,
      });
      const receiptHash = reviewed.review!.receiptHash;
      return { root, store, runId: created.id, receiptPath: join(root, 'review-receipts', `${receiptHash}.json`) };
    };

    const hardlinked = await reviewedFixture('pi-review-hardlink-');
    await link(hardlinked.receiptPath, join(hardlinked.root, 'receipt-mirror.json'));
    await expect(hardlinked.store.get(hardlinked.runId)).rejects.toThrow(/private regular file/);

    const linked = await reviewedFixture('pi-review-junction-');
    const outside = await mkdtemp(join(tmpdir(), 'pi-review-outside-'));
    temporaryDirectories.push(outside);
    const outsideReceipts = join(outside, 'receipts');
    await mkdir(outsideReceipts);
    const outsideReceipt = join(outsideReceipts, linked.receiptPath.split(/[\\/]/).at(-1)!);
    await writeFile(outsideReceipt, await readFile(linked.receiptPath));
    await rm(join(linked.root, 'review-receipts'), { recursive: true });
    await symlink(outsideReceipts, join(linked.root, 'review-receipts'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(linked.store.get(linked.runId)).rejects.toThrow(/must not traverse a link/);

    const nonFile = await reviewedFixture('pi-review-directory-');
    await rm(nonFile.receiptPath);
    await mkdir(nonFile.receiptPath);
    await expect(nonFile.store.get(nonFile.runId)).rejects.toThrow(/private regular file/);

    const missing = await reviewedFixture('pi-review-missing-');
    await rm(missing.receiptPath);
    await expect(missing.store.get(missing.runId)).rejects.toThrow(/receipt is unavailable/);

    expect(() => new FileReviewReceiptRepository(join(outside, 'escape'), linked.root)).toThrow(/escaped/);
  });
});
