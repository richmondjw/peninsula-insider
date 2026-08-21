import { createHash } from 'node:crypto';
import { chmod, link, mkdir, mkdtemp, readFile, rm, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { buildExtractionRevision, extractBlocks } from '../server/capture/extractor.js';
import { captureRequestIdentity, type CaptureInput } from '../server/capture/kernel.js';
import {
  QUICK_NOTE_RECIPE,
  URL_ARTICLE_RECIPE,
  runFixture,
  runUrlArticleFixture,
  withArtifactHash,
} from '../server/fixture-runner.js';
import {
  FileRunOriginAuthorityRepository,
  buildFixtureOriginAuthorityReceipt,
  buildRealUrlOriginAuthorityReceipt,
  originAuthorityReceiptHash,
} from '../server/origin-authority.js';
import { buildRealUrlRun, refreshRealUrlRun } from '../server/real-url-runner.js';
import { FileFoundryStore } from '../server/store.js';
import { CaptureRecordSchema, type CaptureRecord } from '../shared/capture-contracts.js';
import { FIXTURE_ASK_PROVENANCE_TEMPLATE } from '../shared/contracts.js';

const temporaryDirectories: string[] = [];
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

function captured(input: CaptureInput, completedAt = '2026-08-21T08:00:01.000Z'): CaptureRecord {
  const identity = captureRequestIdentity(input);
  const createdAt = '2026-08-21T08:00:00.000Z';
  const text = 'Example Domain announces a local arts program.\n\nBookings open after the public launch.';
  const blocks = extractBlocks(text, 'text/plain');
  const sourceId = `source-${hash(`${identity.attemptId}:source`).slice(0, 24)}`;
  const extractionId = `extract-${hash(`${identity.attemptId}:extract`).slice(0, 24)}`;
  const sourceHash = hash(text);
  return CaptureRecordSchema.parse({
    schemaVersion: 'pi.capture-manifest.v1',
    attempt: {
      schemaVersion: 'pi.capture-attempt.v1', id: identity.attemptId,
      idempotencyKeyHash: identity.idempotencyKeyHash, requestFingerprint: identity.requestFingerprint,
      requestedUrl: identity.safeRequestedUrl, createdAt, completedAt, state: 'extracted',
      events: [
        { state: 'queued', at: createdAt }, { state: 'capturing', at: createdAt },
        { state: 'captured', at: completedAt }, { state: 'extracting', at: completedAt }, { state: 'extracted', at: completedAt },
      ],
      redirects: [], sourceRevisionId: sourceId, extractionRevisionId: extractionId,
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
    extractionRevision: buildExtractionRevision({
      id: extractionId, attemptId: identity.attemptId, sourceRevisionId: sourceId,
      extractedAt: completedAt, sourceContentBlobHash: sourceHash,
      extractedTextBlobHash: hash(blocks.map((block) => block.text).join('\n\n')), blocks,
    }),
  });
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('run origin authority receipts', () => {
  it('writes one private content-addressed receipt with an internal content hash and rejects tampering and links', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-origin-repository-'));
    temporaryDirectories.push(directory);
    const root = join(directory, 'origin-authority');
    const repository = new FileRunOriginAuthorityRepository(root, directory);
    const receipt = buildFixtureOriginAuthorityReceipt(runFixture('editor', 'origin-repository'));
    const receiptHash = await repository.put(receipt);
    const path = join(root, `${receiptHash}.json`);

    expect(receiptHash).toBe(originAuthorityReceiptHash(receipt));
    expect((await repository.get(receiptHash))?.contentHash).toBe(receipt.contentHash);
    expect((await stat(path)).mode & 0o777).toBe(0o600);

    const original = await readFile(path, 'utf8');
    await writeFile(path, original.replace('Quick note', 'Changed note'), 'utf8');
    await expect(repository.get(receiptHash)).rejects.toThrow(/content hash mismatch/i);

    await unlink(path);
    const target = join(directory, 'target.json');
    await writeFile(target, original, 'utf8');
    await chmod(target, 0o600);
    await link(target, path);
    await expect(repository.get(receiptHash)).rejects.toThrow(/private regular file/i);
    await unlink(path);
    await symlink(target, path);
    await expect(repository.get(receiptHash)).rejects.toThrow(/private regular file/i);

    expect(await repository.get('a'.repeat(64))).toBeUndefined();
    await unlink(path);
    await mkdir(path);
    await expect(repository.get(receiptHash)).rejects.toThrow(/private regular file/i);

    const linkedRoot = join(directory, 'linked-origin-root');
    const realRoot = join(directory, 'real-origin-root');
    await mkdir(realRoot);
    await symlink(realRoot, linkedRoot);
    const linkedRepository = new FileRunOriginAuthorityRepository(linkedRoot, directory);
    await expect(linkedRepository.put(receipt)).rejects.toThrow(/root must not traverse a link/i);
  });

  it('seals a trusted fixture create, cross-checks reads, and rejects current v3 downgrade or missing authority', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-origin-fixture-'));
    temporaryDirectories.push(directory);
    const file = join(directory, 'runs.json');
    const store = new FileFoundryStore(file, directory);
    const created = await store.create(runFixture('editor', 'origin-fixture'));
    expect(await readFile(join(directory, 'origin-authority', `${created.originAuthorityReceiptHash}.json`), 'utf8')).toContain('pi.run-origin-authority.v1');
    expect((await store.get(created.id))?.originAuthorityReceiptHash).toBe(created.originAuthorityReceiptHash);

    const stored = JSON.parse(await readFile(file, 'utf8'));
    delete stored.runs[0].originAuthorityReceiptHash;
    await writeFile(file, `${JSON.stringify(stored)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory).get(created.id)).rejects.toThrow(/current Foundry v3.*origin authority/i);
  });

  it('seals only a deterministic frozen legacy fixture and rejects a mutable legacy impersonation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-origin-legacy-'));
    temporaryDirectories.push(directory);
    const file = join(directory, 'runs.json');
    const current = runUrlArticleFixture('legacy-editor', 'origin-legacy');
    const legacy = {
      ...current,
      schemaVersion: 'pi.foundry-run.v2',
      originAuthorityReceiptHash: undefined,
      evaluationAsOf: undefined,
      artifactPack: {
        ...current.artifactPack,
        schemaVersion: 'pi.artifact-pack.v1',
        completed: current.artifactPack.completed.map(({ publicFieldLineage: _lineage, ...artifact }) => artifact),
      },
    };
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v2', runs: [legacy], captureProjections: [] })}\n`, 'utf8');
    const migrated = await new FileFoundryStore(file, directory).get(current.id);
    expect(migrated?.originAuthorityReceiptHash).toMatch(/^[a-f0-9]{64}$/);

    legacy.bundle = { ...legacy.bundle, title: 'Mutable legacy impersonation' };
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v2', runs: [legacy], captureProjections: [] })}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory).get(current.id)).rejects.toThrow(/frozen deterministic fixture contract/i);
  });

  it('rejects every unsupported or recomputed legacy fixture recipe and bundle identity', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-origin-legacy-catalogue-'));
    temporaryDirectories.push(directory);
    const file = join(directory, 'runs.json');
    const asLegacyPack = (run: ReturnType<typeof runFixture>) => ({
      ...run,
      schemaVersion: 'pi.foundry-run.v2',
      originAuthorityReceiptHash: undefined,
      evaluationAsOf: undefined,
      artifactPack: {
        ...run.artifactPack,
        schemaVersion: 'pi.artifact-pack.v1',
        completed: run.artifactPack.completed.map(({ publicFieldLineage: _lineage, ...artifact }) => artifact),
      },
    });
    const quick = asLegacyPack(runFixture('legacy-editor', 'origin-catalogue-quick'));
    const article = asLegacyPack(runUrlArticleFixture('legacy-editor', 'origin-catalogue-article'));
    const candidates = [
      { ...article, recipe: QUICK_NOTE_RECIPE },
      { ...quick, recipe: URL_ARTICLE_RECIPE },
      { ...article, bundle: { ...article.bundle, id: `${article.bundle.id}-renamed` } },
      { ...article, recipe: { ...article.recipe, id: 'unsupported_fixture_recipe' } },
      { ...article, recipe: { ...article.recipe, label: 'Mutable recomputed recipe' } },
      { ...article, bundle: { ...article.bundle, title: 'Mutable recomputed bundle' } },
    ];

    for (const candidate of candidates) {
      await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v2', runs: [candidate], captureProjections: [] })}\n`, 'utf8');
      await expect(new FileFoundryStore(file, directory).get(candidate.id)).rejects.toThrow(/frozen deterministic fixture contract/i);
    }
  });

  it('binds the complete immutable captured origin once and preserves that anchor across refresh', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-origin-capture-'));
    temporaryDirectories.push(directory);
    const first = captured({ url: 'https://example.com/program?token=secret', idempotencyKey: 'origin-capture-1' });
    const second = captured({ url: 'https://example.com/program?token=secret', idempotencyKey: 'origin-capture-2' }, '2026-08-21T09:00:01.000Z');
    const records = new Map([[first.attempt.id, first], [second.attempt.id, second]]);
    const resolver = { get: async (attemptId: string) => records.get(attemptId) };
    const store = new FileFoundryStore(join(directory, 'runs.json'), directory, resolver);
    const initial = await store.create(buildRealUrlRun(first, 'editor', 'origin-capture-run'));
    const receipt = buildRealUrlOriginAuthorityReceipt(initial, first);
    expect(receipt.origin.mode).toBe('real_url');
    if (receipt.origin.mode !== 'real_url') throw new Error('Real URL receipt narrowing failed');
    expect(receipt.origin.sourceHead.safeRequestedUrl).not.toContain('secret');
    expect(receipt.origin.attempt.id).toBe(first.attempt.id);
    expect(receipt.origin.sourceRevision.id).toBe(first.sourceRevision?.id);
    expect(receipt.origin.extractionRevision.id).toBe(first.extractionRevision?.id);

    const refreshed = refreshRealUrlRun(initial, second, 'editor');
    expect(refreshed.originAuthorityReceiptHash).toBe(initial.originAuthorityReceiptHash);
    expect(refreshed.capture?.revisions.map((revision) => revision.attemptId)).toContain(first.attempt.id);
  });

  it('rejects run-ID and cross-mode receipt transplants', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-origin-transplant-'));
    temporaryDirectories.push(directory);
    const file = join(directory, 'runs.json');
    const store = new FileFoundryStore(file, directory);
    const first = await store.create(runFixture('editor', 'origin-transplant-a'));
    const second = await store.create(runFixture('editor', 'origin-transplant-b'));
    const persisted = JSON.parse(await readFile(file, 'utf8'));
    persisted.runs.find((run: { id: string }) => run.id === second.id).originAuthorityReceiptHash = first.originAuthorityReceiptHash;
    await writeFile(file, `${JSON.stringify(persisted)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory).get(second.id)).rejects.toThrow(/immutable run identity|exact immutable bundle/i);

    const fixtureDirectory = await mkdtemp(join(tmpdir(), 'pi-origin-cross-mode-'));
    temporaryDirectories.push(fixtureDirectory);
    const fixtureFile = join(fixtureDirectory, 'runs.json');
    const record = captured({ url: 'https://example.com/path', idempotencyKey: 'cross-mode-record' });
    const resolver = { get: async (attemptId: string) => attemptId === record.attempt.id ? record : undefined };
    const crossStore = new FileFoundryStore(fixtureFile, fixtureDirectory, resolver);
    const fixture = await crossStore.create(runFixture('editor', 'cross-mode-fixture'));
    const captureRun = await crossStore.create(buildRealUrlRun(record, 'editor', 'cross-mode-capture'));
    const crossPersisted = JSON.parse(await readFile(fixtureFile, 'utf8'));
    const fixtureStored = crossPersisted.runs.find((run: { id: string }) => run.id === fixture.id);
    const captureStored = crossPersisted.runs.find((run: { id: string }) => run.id === captureRun.id);
    fixtureStored.originAuthorityReceiptHash = captureRun.originAuthorityReceiptHash;
    await writeFile(fixtureFile, `${JSON.stringify(crossPersisted)}\n`, 'utf8');
    await expect(new FileFoundryStore(fixtureFile, fixtureDirectory, resolver).list()).rejects.toThrow(/run identity|fixture run origin|real URL run origin/i);

    fixtureStored.originAuthorityReceiptHash = fixture.originAuthorityReceiptHash;
    captureStored.originAuthorityReceiptHash = fixture.originAuthorityReceiptHash;
    await writeFile(fixtureFile, `${JSON.stringify(crossPersisted)}\n`, 'utf8');
    await expect(new FileFoundryStore(fixtureFile, fixtureDirectory, resolver).list()).rejects.toThrow(/run identity|fixture run origin|real URL run origin/i);
  });

  it('rejects a fully rehashed real-to-fixture downgrade before every read, review and export surface', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-origin-downgrade-'));
    temporaryDirectories.push(directory);
    const file = join(directory, 'runs.json');
    const record = captured({ url: 'https://example.com/program?token=secret', idempotencyKey: 'origin-downgrade-capture' });
    const resolver = { get: async (attemptId: string) => attemptId === record.attempt.id ? record : undefined };
    const store = new FileFoundryStore(file, directory, resolver, () => '2026-08-21T08:00:02.000Z');
    let run = await store.create(buildRealUrlRun(record, 'editor', 'origin-downgrade-run'));
    const claimIds = run.claimSet.claims.filter((claim) => !claim.restrictedFromArtifacts).slice(0, 2).map((claim) => claim.id);
    run = await store.confirmSource(run.id, {
      sourceKind: 'web', claimIds, angleLabel: 'Local arts program',
      angleFraming: 'A source-led local explainer.', confirmer: 'human-editor', expectedVersion: run.version,
    });
    const artifactId = run.artifactPack.completed[0].id;
    const persisted = JSON.parse(await readFile(file, 'utf8'));
    const attacked = persisted.runs.find((candidate: { id: string }) => candidate.id === run.id);
    delete attacked.capture;
    delete attacked.sourceConfirmation;
    delete attacked.artifact;
    delete attacked.review;
    attacked.artifactPack.reviews = [];
    attacked.artifactPack.completed = attacked.artifactPack.completed.map((artifact: any) => {
      const payload = artifact.type === 'ask_answer'
        ? { ...artifact.payload, provenance_footer: FIXTURE_ASK_PROVENANCE_TEMPLATE }
        : artifact.payload;
      return withArtifactHash({
        ...artifact,
        payload,
        dependencies: artifact.dependencies.filter((dependency: { kind: string }) => dependency.kind !== 'capture_source'),
        publicFieldLineage: [],
        contentHash: '0'.repeat(64),
      }, attacked.claimSet.claims);
    });
    await writeFile(file, `${JSON.stringify(persisted)}\n`, 'utf8');

    const restarted = new FileFoundryStore(file, directory, resolver);
    await expect(restarted.get(run.id)).rejects.toThrow(/origin authority/i);
    const app = createApp(restarted);
    await request(app).get(`/api/foundry/runs/${run.id}`).expect(400);
    await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
      artifactId, expectedArtifactVersion: 1, decision: 'accepted', reviewer: 'attacker', expectedVersion: run.version,
    }).expect(400);
    await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${artifactId}/handoff`).expect(400);
    await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${artifactId}/patch`).expect(400);
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);
  });
});
