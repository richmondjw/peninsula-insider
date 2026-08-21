import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { loadRuntimeConfig } from '../server/config.js';
import { evaluateQuickNoteGates, runFixture } from '../server/fixture-runner.js';
import { FileFoundryStore } from '../server/store.js';

const temporaryDirectories: string[] = [];

async function harness() {
  const directory = await mkdtemp(join(tmpdir(), 'pi-foundry-'));
  temporaryDirectories.push(directory);
  const file = join(directory, 'runs.json');
  const store = new FileFoundryStore(file, directory);
  return { directory, file, store, app: createApp(store) };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('deterministic Foundry fixture', () => {
  it('creates one evidence-backed run and reuses its idempotency key', async () => {
    const { app } = await harness();
    const payload = { fixtureId: 'red-hill-winter-lunch', actor: 'test-editor', idempotencyKey: 'same-source-v1' };
    const first = await request(app).post('/api/foundry/runs').send(payload).expect(201);
    const replay = await request(app).post('/api/foundry/runs').send(payload).expect(200);

    expect(replay.body.id).toBe(first.body.id);
    expect(first.body.claims).toHaveLength(5);
    expect(first.body.artifact.claimIds).not.toContain('claim-unsupported');
    expect(first.body.artifact.claimIds).not.toContain('claim-price');
    expect(first.body.artifact.payload.body).not.toMatch(/\$\s?\d|—/);
    expect(first.body.artifact.gateResults.every((gate: { passed: boolean }) => gate.passed)).toBe(true);
  });

  it('derives the claim gate and permits en dashes while blocking em dashes', () => {
    const run = runFixture('test-editor', 'style-law-v1');
    const enDash = evaluateQuickNoteGates({ headline: 'Open 9–11am', body: 'A supported range.' }, run.claims, run.artifact.claimIds);
    const emDash = evaluateQuickNoteGates({ headline: 'Open today — bookings required', body: 'A supported note.' }, run.claims, run.artifact.claimIds);
    const restricted = evaluateQuickNoteGates(run.artifact.payload, run.claims, [...run.artifact.claimIds, 'claim-price']);

    expect(enDash.find((gate) => gate.gate === 'no_em_dash')?.passed).toBe(true);
    expect(emDash.find((gate) => gate.gate === 'no_em_dash')?.passed).toBe(false);
    expect(restricted.find((gate) => gate.gate === 'supported_claims_only')?.passed).toBe(false);
  });

  it.each([
    'Tickets cost 20 dollars.',
    'An entry fee applies.',
    'Admission costs USD 20.',
    'Tickets are $20.',
    'Tickets are EUR 20.',
    'Tickets are twenty dollars.',
    'Admission is complimentary.',
    'Admission is available at no charge.',
    'An entry charge applies.',
    'The venue charges for entry.',
    'Guests are charged on arrival.',
    'A booking surcharge applies.',
    'The operator is charging admission.',
  ])('blocks all public price wording: %s', (body) => {
    const run = runFixture('test-editor', `price-law-${body}`);
    const gates = evaluateQuickNoteGates({ headline: 'Event details', body }, run.claims, run.artifact.claimIds);
    expect(gates.find((gate) => gate.gate === 'no_price')?.passed).toBe(false);
  });

  it('requires idempotency and serializes concurrent mutations', async () => {
    const { app, store } = await harness();
    await request(app).post('/api/foundry/runs').send({ fixtureId: 'red-hill-winter-lunch', actor: 'test-editor' }).expect(400);

    const runs = Array.from({ length: 8 }, (_, index) => runFixture('test-editor', `concurrent-${index}`));
    await Promise.all(runs.map((run) => store.create(run)));
    expect(await store.list()).toHaveLength(8);
  });

  it('persists review decisions and rejects stale versions', async () => {
    const { app, file } = await harness();
    const created = await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-winter-lunch', actor: 'test-editor', idempotencyKey: 'review-v1',
    }).expect(201);

    const accepted = await request(app).put(`/api/foundry/runs/${created.body.id}/review`).send({
      decision: 'accepted', reviewer: 'test-editor', expectedVersion: 1,
    }).expect(200);
    expect(accepted.body.version).toBe(2);

    await request(app).put(`/api/foundry/runs/${created.body.id}/review`).send({
      decision: 'rejected', reviewer: 'other-editor', expectedVersion: 1,
    }).expect(409);

    const restartedStore = new FileFoundryStore(file, file.replace(/[\\/]runs\.json$/, ''));
    const persisted = await restartedStore.get(created.body.id);
    expect(persisted?.status).toBe('accepted');
    expect(JSON.parse(await readFile(file, 'utf8')).runs).toHaveLength(1);
  });

  it('normalizes legacy ready state to needs revision when a persisted gate failed', async () => {
    const { directory, file } = await harness();
    const legacy = runFixture('legacy-editor', 'legacy-gate-v1');
    legacy.artifact.gateResults[0] = { gate: 'no_price', passed: false, detail: 'Legacy failed gate.' };
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v1', runs: [legacy] })}\n`, 'utf8');

    const restarted = new FileFoundryStore(file, directory);
    expect((await restarted.get(legacy.id))?.status).toBe('needs_revision');
  });

  it('migrates legacy unsealed acceptance to stale review history and permits a sealed re-review', async () => {
    const { directory, file } = await harness();
    const legacy = runFixture('legacy-editor', 'legacy-unsealed-review');
    const decidedAt = '2026-08-20T10:00:00.000Z';
    const legacyReview = { decision: 'accepted', reviewer: 'legacy-reviewer', note: 'Legacy approval', decidedAt };
    const raw = {
      ...legacy,
      version: 2,
      status: 'accepted',
      updatedAt: decidedAt,
      review: legacyReview,
      reviewHistory: [{ ...legacyReview, validity: 'current' }],
    };
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v1', runs: [raw] })}\n`, 'utf8');

    const restarted = new FileFoundryStore(file, directory);
    const migrated = await restarted.get(legacy.id);
    expect(migrated).toMatchObject({ status: 'needs_revision', review: undefined });
    expect(migrated?.reviewHistory).toEqual([expect.objectContaining({
      decision: 'accepted', reviewer: 'legacy-reviewer', note: 'Legacy approval',
      validity: 'stale', staleReason: 'legacy_unsealed', staledAt: decidedAt,
    })]);
    expect(migrated?.reviewHistory[0].receiptHash).toBeUndefined();
    const resealed = await restarted.review(legacy.id, {
      decision: 'accepted', reviewer: 'current-reviewer', expectedVersion: 2,
    });
    expect(resealed.status).toBe('accepted');
    expect(resealed.review?.receiptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(resealed.reviewHistory).toHaveLength(2);
  });

  it('migrates every receipt-less v1 stale review without changing its non-reviewed status', async () => {
    const { directory, file } = await harness();
    const legacy = runFixture('legacy-editor', 'legacy-unsealed-stale-review');
    const decidedAt = '2026-08-19T10:00:00.000Z';
    const staledAt = '2026-08-20T10:00:00.000Z';
    const raw = {
      ...legacy,
      status: 'ready_for_review',
      updatedAt: staledAt,
      review: undefined,
      reviewHistory: [{
        decision: 'accepted', reviewer: 'legacy-reviewer', note: 'Superseded legacy approval', decidedAt,
        validity: 'stale', staledAt, staleReason: 'artifact_edited',
      }],
    };
    await writeFile(file, `${JSON.stringify({ schemaVersion: 'pi.foundry-file-store.v1', runs: [raw] })}\n`, 'utf8');

    const migrated = await new FileFoundryStore(file, directory).get(legacy.id);
    expect(migrated?.status).toBe('ready_for_review');
    expect(migrated?.review).toBeUndefined();
    expect(migrated?.reviewHistory).toEqual([expect.objectContaining({
      decision: 'accepted', reviewer: 'legacy-reviewer', note: 'Superseded legacy approval', decidedAt,
      validity: 'stale', staledAt, staleReason: 'legacy_unsealed',
    })]);
    expect(migrated?.reviewHistory[0].receiptHash).toBeUndefined();
  });

  it('fails closed when a v2 review loses its immutable receipt reference', async () => {
    const { directory, file, store } = await harness();
    const created = await store.create(runFixture('editor', 'v2-missing-review-receipt'));
    await store.review(created.id, { decision: 'accepted', reviewer: 'reviewer', expectedVersion: created.version });
    const persisted = JSON.parse(await readFile(file, 'utf8'));
    delete persisted.runs[0].review.receiptHash;
    delete persisted.runs[0].reviewHistory[0].receiptHash;
    await writeFile(file, `${JSON.stringify(persisted)}\n`, 'utf8');

    await expect(new FileFoundryStore(file, directory).get(created.id)).rejects.toThrow(/immutable receipt/);
  });

  it('versions edits, invalidates approval and blocks restricted copy', async () => {
    const { app } = await harness();
    const created = await request(app).post('/api/foundry/runs').set('Idempotency-Key', 'edit-v1').send({
      fixtureId: 'red-hill-winter-lunch', actor: 'test-editor',
    }).expect(201);

    const accepted = await request(app).put(`/api/foundry/runs/${created.body.id}/review`).send({
      decision: 'accepted', reviewer: 'test-editor', expectedVersion: 1,
    }).expect(200);
    const edited = await request(app).put(`/api/foundry/runs/${created.body.id}/artifact`).send({
      editor: 'test-editor', expectedVersion: accepted.body.version,
      headline: accepted.body.artifact.payload.headline,
      dek: accepted.body.artifact.payload.dek,
      body: `${accepted.body.artifact.payload.body} Tickets are priced at $20.`,
    }).expect(200);

    expect(edited.body.version).toBe(3);
    expect(edited.body.artifact.version).toBe(2);
    expect(edited.body.status).toBe('needs_revision');
    expect(edited.body.review).toBeUndefined();
    expect(edited.body.artifact.gateResults.find((gate: { gate: string }) => gate.gate === 'no_price').passed).toBe(false);

    await request(app).put(`/api/foundry/runs/${created.body.id}/review`).send({
      decision: 'accepted', reviewer: 'test-editor', expectedVersion: edited.body.version,
    }).expect(400);
    await request(app).put(`/api/foundry/runs/${created.body.id}/artifact`).send({
      editor: 'stale-editor', expectedVersion: accepted.body.version,
      headline: 'Stale overwrite', dek: '', body: 'This must not win.',
    }).expect(409);
  });

  it('fails closed for production fixture mode and path escape', () => {
    expect(() => loadRuntimeConfig({ NODE_ENV: 'production' })).toThrow(/disabled in production/);
    expect(() => loadRuntimeConfig({ NODE_ENV: 'test', FOUNDRY_HOST: 'public.example' })).toThrow(/FOUNDRY_HOST/);
    expect(() => new FileFoundryStore('C:\\outside\\runs.json', 'C:\\allowed')).toThrow(/inside its configured data root/);
  });

  it('serves the built Workbench from the same loopback service', async () => {
    const { directory, store } = await harness();
    await writeFile(join(directory, 'index.html'), '<!doctype html><title>Foundry container marker</title>', 'utf8');
    const app = createApp(store, { staticDir: directory });

    const page = await request(app).get('/').expect(200).expect('Content-Type', /html/).expect('Content-Security-Policy', /default-src 'self'/);
    expect(page.text).toContain('Foundry container marker');
    await request(app).get('/api/health').expect(200).expect('Content-Type', /json/).expect('Cache-Control', 'no-store');
  });

  it('exports a patch only after acceptance', async () => {
    const { app } = await harness();
    const created = await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-winter-lunch', actor: 'test-editor', idempotencyKey: 'patch-v1',
    }).expect(201);

    await request(app).get(`/api/foundry/runs/${created.body.id}/patch`).expect(400);
    await request(app).put(`/api/foundry/runs/${created.body.id}/review`).send({
      decision: 'accepted', reviewer: 'test-editor', expectedVersion: 1,
    }).expect(200);
    const patch = await request(app).get(`/api/foundry/runs/${created.body.id}/patch`).expect(200);
    expect(patch.text).toContain('next/src/content/quick-notes/2026-08-21-red-hill-wet-weather-lunch.md');
    expect(patch.text).toContain('status: draft');
  });

  it('preserves every physical line in multiline Markdown patches', async () => {
    const { app } = await harness();
    const created = await request(app).post('/api/foundry/runs').set('Idempotency-Key', 'multiline-v1').send({
      fixtureId: 'red-hill-winter-lunch', actor: 'test-editor',
    }).expect(201);
    const edited = await request(app).put(`/api/foundry/runs/${created.body.id}/artifact`).send({
      editor: 'test-editor', expectedVersion: 1,
      headline: created.body.artifact.payload.headline,
      dek: created.body.artifact.payload.dek,
      body: 'First paragraph.\n\nSecond paragraph.',
    }).expect(200);
    await request(app).put(`/api/foundry/runs/${created.body.id}/review`).send({
      decision: 'accepted', reviewer: 'test-editor', expectedVersion: edited.body.version,
    }).expect(200);

    const patch = await request(app).get(`/api/foundry/runs/${created.body.id}/patch`).expect(200);
    expect(patch.text).toContain('+First paragraph.\n+\n+Second paragraph.');
  });
});
