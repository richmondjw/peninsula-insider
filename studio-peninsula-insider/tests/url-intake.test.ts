import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { ContentAddressedBlobStore } from '../server/capture/blob-store.js';
import { createEvidenceLocator, resolveEvidenceLocator } from '../server/capture/extractor.js';
import { CaptureDisabledError, CaptureKernel, realUrlCaptureEnabled } from '../server/capture/kernel.js';
import type { DnsResolver, ResolvedAddress } from '../server/capture/policy.js';
import { FileCaptureRepository } from '../server/capture/repository.js';
import type { CaptureTransport, TransportRequest, TransportResponse } from '../server/capture/transport-contract.js';
import { loadRuntimeConfig } from '../server/config.js';
import { validateNewFilePatch } from '../server/fixture-runner.js';
import { FileIntakeLedger } from '../server/intake/ledger.js';
import { UrlIntakeService } from '../server/intake/service.js';
import { FileFoundryStore } from '../server/store.js';
import type { FoundryRun } from '../shared/contracts.js';
import type { IntakeAttempt } from '../shared/intake-contracts.js';

/**
 * The single manually selected local acceptance canary. `example.com` is IANA's reserved
 * documentation domain: a static, publicly crawlable, clearly non-sensitive page that
 * carries no personal or commercial data. Automated tests never reach it; this snapshot of
 * its bytes is replayed through an in-process transport double instead.
 */
const CANARY_URL = 'https://example.com/';
const CANARY_HTML = await readFile(fileURLToPath(new URL('./fixtures/canary-example-com.html', import.meta.url)), 'utf8');
const CANARY_HEADLINE = 'Example Domain';
const CANARY_PARAGRAPH = 'This domain is for use in documentation examples without needing permission. Avoid use in operations.';

const PUBLIC_V4: ResolvedAddress = { address: '93.184.216.34', family: 4 };
const PRIVATE_V4: ResolvedAddress = { address: '10.0.0.7', family: 4 };
const temporaryDirectories: string[] = [];

function htmlResponse(body: string, input: { status?: number; headers?: Record<string, string> } = {}): TransportResponse {
  let aborted = false;
  const headers = Object.freeze(input.headers ?? { 'content-type': 'text/html; charset=utf-8', 'last-modified': 'Thu, 21 Aug 2026 00:00:00 GMT' });
  return Object.freeze({
    status: input.status ?? 200,
    headers,
    headerBytes: Object.entries(headers).reduce((total, [name, value]) => total + name.length + value.length + 4, 0),
    headerCount: Object.keys(headers).length,
    remoteAddress: PUBLIC_V4.address,
    body: {
      async *[Symbol.asyncIterator]() {
        if (aborted) return;
        yield Buffer.from(body, 'utf8');
      },
    },
    abort: () => { aborted = true; },
  });
}

class FakeTransport implements CaptureTransport {
  readonly requests: TransportRequest[] = [];
  constructor(private readonly handler: (input: TransportRequest, index: number) => Promise<TransportResponse> | TransportResponse) {}
  async request(input: TransportRequest): Promise<TransportResponse> {
    this.requests.push(input);
    return this.handler(input, this.requests.length - 1);
  }
}

function resolverFor(handler: (hostname: string) => readonly ResolvedAddress[] = () => [PUBLIC_V4]): DnsResolver {
  return { resolve: async (hostname, signal) => { signal.throwIfAborted(); return handler(hostname); } };
}

async function harness(input: {
  enabled?: boolean;
  transport?: CaptureTransport;
  resolver?: DnsResolver;
  now?: () => Date;
  root?: string;
} = {}) {
  const root = input.root ?? await mkdtemp(join(tmpdir(), 'pi-intake-'));
  if (!input.root) temporaryDirectories.push(root);
  const transport = input.transport ?? new FakeTransport(() => htmlResponse(CANARY_HTML));
  const store = new FileFoundryStore(join(root, 'runs.json'), root);
  const ledger = new FileIntakeLedger(join(root, 'intake.json'), root);
  const kernel = new CaptureKernel({
    enabled: input.enabled ?? true,
    resolver: input.resolver ?? resolverFor(),
    transport,
    blobs: new ContentAddressedBlobStore(root),
    repository: new FileCaptureRepository(root),
    now: input.now,
  });
  const intake = new UrlIntakeService({ enabled: input.enabled ?? true, kernel, ledger, store });
  return { root, transport, store, ledger, intake, kernel, app: createApp(store, { intake }) };
}

async function submit(app: ReturnType<typeof createApp>, url = CANARY_URL, expected = 201) {
  const response = await request(app).post('/api/foundry/intake/url').send({ url, actor: 'test-editor' }).expect(expected);
  return response.body as { attempt: IntakeAttempt; run: FoundryRun | null };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('real URL intake stays inert while the flag is off', () => {
  it('keeps the capability unavailable in the API when no intake service is wired', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pi-intake-'));
    temporaryDirectories.push(root);
    const app = createApp(new FileFoundryStore(join(root, 'runs.json'), root));

    const health = await request(app).get('/api/health').expect(200);
    const capabilities = await request(app).get('/api/capabilities').expect(200);
    const ledger = await request(app).get('/api/foundry/intake').expect(200);
    const submission = await request(app).post('/api/foundry/intake/url').send({ url: CANARY_URL }).expect(404);
    const refresh = await request(app).post('/api/foundry/runs/run-anything/refresh').send({ expectedVersion: 1 }).expect(404);

    expect(health.body.mode).toBe('fixture-only');
    expect(capabilities.body).toMatchObject({ realUrlCapture: false, externalCalls: false, sourceTypes: ['frozen_fixture'] });
    expect(ledger.body).toEqual({ enabled: false, attempts: [] });
    expect(submission.body.code).toBe('real_url_capture_disabled');
    expect(refresh.body.code).toBe('real_url_capture_disabled');
  });

  it('treats a flag-off intake service as absent and never touches the kernel or the ledger', async () => {
    const { app, transport, intake, ledger } = await harness({ enabled: false });

    await request(app).post('/api/foundry/intake/url').send({ url: CANARY_URL }).expect(404);
    await expect(intake.submit({ url: CANARY_URL, actor: 'test-editor' })).rejects.toBeInstanceOf(CaptureDisabledError);

    expect((transport as FakeTransport).requests).toHaveLength(0);
    expect(await ledger.list()).toEqual([]);
  });

  it('defaults the flag off and fails closed for production and non-loopback listeners', () => {
    expect(realUrlCaptureEnabled({})).toBe(false);
    expect(loadRuntimeConfig({ FOUNDRY_DATA_ROOT: '.foundry-data' }).realUrlsEnabled).toBe(false);
    expect(loadRuntimeConfig({ FOUNDRY_REAL_URLS_ENABLED: '1' }).realUrlsEnabled).toBe(true);
    expect(() => loadRuntimeConfig({ NODE_ENV: 'production' })).toThrow(/disabled in production/);
    expect(() => loadRuntimeConfig({ FOUNDRY_REAL_URLS_ENABLED: '1', FOUNDRY_HOST: '0.0.0.0' })).toThrow(/loopback/);
    expect(() => loadRuntimeConfig({ FOUNDRY_REAL_URLS_ENABLED: 'true' })).toThrow(/must be 0 or 1/);
  });

  it('pins the flag off in the container, the compose file and CI', async () => {
    const read = async (path: string) => readFile(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
    const files = await Promise.all([read('../Dockerfile'), read('../compose.yaml')]);

    // The workflow lives above the Docker build context, so it is only checked when the
    // suite runs against a repository checkout rather than inside the built image.
    const workflow = fileURLToPath(new URL('../../.github/workflows/content-foundry-ci.yml', import.meta.url));
    if (existsSync(fileURLToPath(new URL('../../PRODUCT.md', import.meta.url)))) {
      expect(existsSync(workflow)).toBe(true);
      files.push(await readFile(workflow, 'utf8'));
    }

    for (const contents of files) {
      const assignments = contents.match(/FOUNDRY_REAL_URLS_ENABLED[:=]\s*"?[^"\s]+"?/g) ?? [];
      expect(assignments.length).toBeGreaterThan(0);
      for (const assignment of assignments) expect(assignment).toMatch(/[:=]\s*"?0"?$/);
    }
  });
});

describe('local canary capture reaches evidence, draft, review and patch', () => {
  it('turns one captured revision into a reviewable quick note with inspectable provenance', async () => {
    const { app, transport, root } = await harness();

    const created = await submit(app);
    const run = created.run as FoundryRun;

    expect((transport as FakeTransport).requests).toHaveLength(1);
    expect((transport as FakeTransport).requests[0].url.href).toBe(CANARY_URL);
    expect(created.attempt.state).toBe('extracted');
    expect(created.attempt.runId).toBe(run.id);

    // Evidence ledger: claims quote the captured blocks verbatim and stay reproducible.
    expect(run.claimSet.claims.map((claim) => claim.text)).toEqual([CANARY_HEADLINE, CANARY_PARAGRAPH]);
    const stored = await new FileCaptureRepository(root).get(created.attempt.capture?.attemptId as string);
    for (const claim of run.claimSet.claims) {
      const locator = claim.evidence[0];
      const reconstructed = createEvidenceLocator(stored?.extractionRevision as never, locator.locator);
      expect(locator.excerpt).toBe(reconstructed.excerpt);
      expect(locator.excerptHash).toBe(reconstructed.excerptHash);
      expect(resolveEvidenceLocator(stored?.extractionRevision as never, reconstructed)).toBe(claim.text);
      expect(locator.sourceItemId).toBe(run.bundle.sourceItems[0].id);
    }

    // Provenance: redirect chain, capture time, source URL, freshness and restrictions.
    const capture = run.captures?.[0];
    expect(capture).toMatchObject({
      state: 'extracted',
      requestedUrl: CANARY_URL,
      canonicalUrl: CANARY_URL,
      httpStatus: 200,
      mediaType: 'text/html',
      charset: 'utf-8',
      redirects: [],
      extractedBlockCount: 3,
      claimCount: 2,
    });
    expect(capture?.sourceRevisionId).toBe(run.bundle.sourceItems[0].id);
    expect(new Date(capture?.freshUntil as string).getTime())
      .toBeGreaterThan(new Date(capture?.capturedAt as string).getTime());
    expect(capture?.restrictions).toContainEqual(expect.objectContaining({ code: 'excerpt_too_short', blockCount: 1 }));
    expect(capture?.responseHeaders['last-modified']).toBe('Thu, 21 Aug 2026 00:00:00 GMT');

    // Draft: quoted from the source, gated by the house copy laws, never auto-verified.
    expect(run.artifact?.payload.headline).toBe(CANARY_HEADLINE);
    expect(run.artifact?.payload.body).toBe(`${CANARY_HEADLINE}\n\n${CANARY_PARAGRAPH}`);
    expect(run.artifact?.payload.status).toBe('draft');
    expect(run.artifact?.payload.verifiedBy).toBeUndefined();
    expect(run.artifact?.gateResults.every((gate) => gate.passed)).toBe(true);
    expect(run.status).toBe('ready_for_review');

    // Human review, then a downloadable patch. Nothing publishes.
    const reviewed = await request(app).put(`/api/foundry/runs/${run.id}/review`)
      .send({ decision: 'accepted', reviewer: 'test-editor', expectedVersion: run.version })
      .expect(200);
    expect(reviewed.body.status).toBe('accepted');
    expect(reviewed.body.artifactPack.reviews[0]).toMatchObject({ status: 'current', authority: 'draft_handoff_only' });

    const patch = await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(200);
    expect(validateNewFilePatch(patch.text)).toBe(true);
    expect(patch.text).toContain('next/src/content/quick-notes/');
    expect(patch.text).toContain('-example-domain.md');
    expect(patch.text).toContain(`+${CANARY_PARAGRAPH}`);
    expect(patch.text).toContain('+status: draft');
    expect(patch.text).not.toMatch(/\$\s?\d|—/);
  });

  it('keeps captured markup inert and never returns raw source HTML', async () => {
    const { app } = await harness();
    const created = await submit(app);

    const serialised = JSON.stringify(created);
    for (const marker of ['<h1', '<p>', '<style', 'background:#eee', '<!doctype']) {
      expect(serialised).not.toContain(marker);
    }

    const source = await readFile(fileURLToPath(new URL('../src/App.tsx', import.meta.url)), 'utf8');
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });
});

describe('blocked, private and redirect-to-private submissions', () => {
  it('records a safe audit row for a special-use host without reaching the network', async () => {
    const { app, transport, store } = await harness();

    const response = await request(app).post('/api/foundry/intake/url')
      .send({ url: 'https://localhost/internal', actor: 'test-editor' }).expect(200);
    const attempt = response.body.attempt as IntakeAttempt;

    expect(attempt.state).toBe('rejected');
    expect(attempt.failure).toMatchObject({ stage: 'policy', code: 'special_use_hostname' });
    expect(attempt.capture).toBeUndefined();
    expect(response.body.run).toBeNull();
    expect((transport as FakeTransport).requests).toHaveLength(0);
    expect(await store.list()).toEqual([]);
  });

  it('fails closed on a private DNS answer with an audit row and no source revision', async () => {
    const { app, transport, store } = await harness({ resolver: resolverFor(() => [PUBLIC_V4, PRIVATE_V4]) });

    const response = await request(app).post('/api/foundry/intake/url')
      .send({ url: 'https://news.public-site.org/', actor: 'test-editor' }).expect(200);
    const attempt = response.body.attempt as IntakeAttempt;

    expect(attempt.state).toBe('failed');
    expect(attempt.failure).toMatchObject({ stage: 'dns', code: 'non_public_address' });
    expect(attempt.capture?.sourceRevisionId).toBeUndefined();
    expect(attempt.runId).toBeUndefined();
    expect(response.body.run).toBeNull();
    expect((transport as FakeTransport).requests).toHaveLength(0);
    expect(await store.list()).toEqual([]);
  });

  it('fails closed when a public host redirects into private space', async () => {
    const transport = new FakeTransport(() => htmlResponse('', {
      status: 302,
      headers: { location: 'https://internal.public-site.org/admin' },
    }));
    const { app, store } = await harness({
      transport,
      resolver: resolverFor((hostname) => hostname.startsWith('internal.') ? [PRIVATE_V4] : [PUBLIC_V4]),
    });

    const response = await request(app).post('/api/foundry/intake/url')
      .send({ url: 'https://news.public-site.org/', actor: 'test-editor' }).expect(200);
    const attempt = response.body.attempt as IntakeAttempt;

    expect(attempt.state).toBe('failed');
    expect(attempt.failure).toMatchObject({ stage: 'dns', code: 'non_public_address' });
    expect(attempt.capture?.sourceRevisionId).toBeUndefined();
    expect(transport.requests).toHaveLength(1);
    expect(await store.list()).toEqual([]);
  });

  it('distinguishes held, no-story and unusable-claim outcomes without creating a run', async () => {
    const held = await harness({ transport: new FakeTransport(() => htmlResponse('{}', { headers: { 'content-type': 'application/json' } })) });
    const empty = await harness({ transport: new FakeTransport(() => htmlResponse('<html><body><style>a{color:red}</style></body></html>')) });
    const restricted = await harness({
      transport: new FakeTransport(() => htmlResponse('<p>The tasting flight is $45 for four wines poured at the cellar door.</p>')),
    });

    const heldBody = (await request(held.app).post('/api/foundry/intake/url').send({ url: CANARY_URL }).expect(200)).body;
    const emptyBody = (await request(empty.app).post('/api/foundry/intake/url').send({ url: CANARY_URL }).expect(200)).body;
    const restrictedBody = (await request(restricted.app).post('/api/foundry/intake/url').send({ url: CANARY_URL }).expect(200)).body;

    expect(heldBody.attempt).toMatchObject({ state: 'held', capture: { state: 'held' } });
    expect(heldBody.attempt.capture.outcomeReason.code).toBe('unsupported_media_type');
    expect(emptyBody.attempt).toMatchObject({ state: 'no_story' });
    expect(emptyBody.attempt.capture.outcomeReason.code).toBe('no_extractable_text');
    expect(restrictedBody.attempt).toMatchObject({ state: 'no_story' });
    expect(restrictedBody.attempt.outcomeReason.code).toBe('no_usable_claim_text');
    expect(restrictedBody.attempt.capture.restrictions).toContainEqual(expect.objectContaining({ code: 'price_copy' }));

    for (const body of [heldBody, emptyBody, restrictedBody]) expect(body.run).toBeNull();
    for (const context of [held, empty, restricted]) expect(await context.store.list()).toEqual([]);
  });
});

describe('refresh creates a new revision and stales dependent decisions', () => {
  it('appends an immutable revision, redrafts and stales the prior accepted review', async () => {
    const updated = CANARY_HTML.replace(CANARY_PARAGRAPH, `${CANARY_PARAGRAPH} Updated for the refresh check.`);
    const transport = new FakeTransport((_input, index) => htmlResponse(index === 0 ? CANARY_HTML : updated));
    const { app } = await harness({ transport });

    const created = await submit(app);
    const run = created.run as FoundryRun;
    const accepted = (await request(app).put(`/api/foundry/runs/${run.id}/review`)
      .send({ decision: 'accepted', reviewer: 'test-editor', expectedVersion: run.version })
      .expect(200)).body as FoundryRun;
    expect(accepted.status).toBe('accepted');

    const response = await request(app).post(`/api/foundry/runs/${run.id}/refresh`)
      .send({ actor: 'test-editor', expectedVersion: accepted.version }).expect(200);
    const refreshed = response.body.run as FoundryRun;

    expect(transport.requests).toHaveLength(2);
    expect(response.body.attempt.intent).toBe('refresh');

    // A new immutable revision, never an in-place edit of the previous one.
    expect(refreshed.captures).toHaveLength(2);
    expect(refreshed.captures?.[0]).toEqual(accepted.captures?.[0]);
    expect(refreshed.captures?.[1].sourceRevisionId).not.toBe(refreshed.captures?.[0].sourceRevisionId);
    expect(refreshed.claimSet.version).toBe(2);
    expect(refreshed.artifact?.version).toBe(2);
    expect(refreshed.artifact?.payload.body).toContain('Updated for the refresh check.');

    // Every decision that depended on the previous revision is stale, and the run is back
    // in review rather than exportable.
    expect(refreshed.artifactPack.reviews).toHaveLength(1);
    expect(refreshed.artifactPack.reviews[0]).toMatchObject({ status: 'stale', artifactVersion: 1, decision: 'accepted' });
    expect(refreshed.review).toBeUndefined();
    expect(refreshed.status).toBe('ready_for_review');
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);

    const reaccepted = await request(app).put(`/api/foundry/runs/${run.id}/review`)
      .send({ decision: 'accepted', reviewer: 'test-editor', expectedVersion: refreshed.version })
      .expect(200);
    expect(reaccepted.body.status).toBe('accepted');
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(200);
  });

  it('answers a missing run, a stale version and a replayed refresh without recrawling', async () => {
    const transport = new FakeTransport(() => htmlResponse(CANARY_HTML));
    const { app } = await harness({ transport });
    const run = (await submit(app)).run as FoundryRun;

    await request(app).post('/api/foundry/runs/run-missing/refresh')
      .send({ actor: 'test-editor', expectedVersion: 1 }).expect(404);
    await request(app).post(`/api/foundry/runs/${run.id}/refresh`)
      .send({ actor: 'test-editor', expectedVersion: run.version + 5 }).expect(409);
    await request(app).post(`/api/foundry/runs/${run.id}/refresh`)
      .send({ actor: 'test-editor', expectedVersion: run.version }).expect(200);
    // The refresh moved the run to the next version, so replaying the same request is a
    // conflict rather than a second capture of the same source.
    await request(app).post(`/api/foundry/runs/${run.id}/refresh`)
      .send({ actor: 'test-editor', expectedVersion: run.version }).expect(409);

    expect(transport.requests).toHaveLength(2);
  });

  it('stales an accepted review once the captured claims pass their freshness window', async () => {
    const { app } = await harness({ now: () => new Date('2020-03-01T00:00:00.000Z') });
    const run = (await submit(app)).run as FoundryRun;

    expect(run.artifact?.gateResults.find((gate) => gate.gate === 'supported_claims_only')?.passed).toBe(false);
    expect(run.status).toBe('needs_revision');
    await request(app).put(`/api/foundry/runs/${run.id}/review`)
      .send({ decision: 'accepted', reviewer: 'test-editor', expectedVersion: run.version })
      .expect(400);
  });
});

describe('restart persistence', () => {
  it('reloads attempts, revisions, evidence and review state without duplication', async () => {
    const first = await harness();
    const run = (await submit(first.app)).run as FoundryRun;
    await request(first.app).put(`/api/foundry/runs/${run.id}/review`)
      .send({ decision: 'accepted', reviewer: 'test-editor', expectedVersion: run.version })
      .expect(200);

    // A fresh process reading the same data root: new store, ledger, kernel and app.
    const restarted = await harness({ root: first.root, transport: first.transport });

    const runs = (await request(restarted.app).get('/api/foundry/runs').expect(200)).body.runs as FoundryRun[];
    const ledger = (await request(restarted.app).get('/api/foundry/intake').expect(200)).body as { attempts: IntakeAttempt[] };

    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe(run.id);
    expect(runs[0].status).toBe('accepted');
    expect(runs[0].captures).toHaveLength(1);
    expect(runs[0].claimSet.claims).toEqual(run.claimSet.claims);
    expect(ledger.attempts).toHaveLength(1);
    expect(ledger.attempts[0].state).toBe('extracted');

    // Replaying the same submission returns the same run and performs no second capture.
    const replay = await submit(restarted.app, CANARY_URL, 200);
    expect(replay.run?.id).toBe(run.id);
    expect((first.transport as FakeTransport).requests).toHaveLength(1);
    expect((await restarted.store.list())).toHaveLength(1);
    expect(await restarted.ledger.list()).toHaveLength(1);
  });

  it('persists the capturing state before any egress so an interrupted capture stays visible', async () => {
    let midFlight: IntakeAttempt[] = [];
    const context = await harness({
      transport: new FakeTransport(async () => {
        midFlight = await context.ledger.list();
        return htmlResponse(CANARY_HTML);
      }),
    });

    await submit(context.app);

    expect(midFlight).toHaveLength(1);
    expect(midFlight[0].state).toBe('capturing');
    expect(midFlight[0].capture).toBeUndefined();
    expect((await context.ledger.list())[0].state).toBe('extracted');
  });
});
