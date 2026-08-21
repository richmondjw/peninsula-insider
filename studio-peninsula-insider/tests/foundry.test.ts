import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { loadRuntimeConfig } from '../server/config.js';
import { runFixture } from '../server/fixture-runner.js';
import { FileFoundryStore } from '../server/store.js';

const temporaryDirectories: string[] = [];

async function harness() {
  const directory = await mkdtemp(join(tmpdir(), 'pi-foundry-'));
  temporaryDirectories.push(directory);
  const file = join(directory, 'runs.json');
  const store = new FileFoundryStore(file, directory);
  return { file, store, app: createApp(store) };
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
    expect(first.body.artifact.payload.body).not.toMatch(/\$\s?\d|[—–]/);
    expect(first.body.artifact.gateResults.every((gate: { passed: boolean }) => gate.passed)).toBe(true);
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
    expect(edited.body.status).toBe('ready_for_review');
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
    expect(() => new FileFoundryStore('C:\\outside\\runs.json', 'C:\\allowed')).toThrow(/inside its configured data root/);
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
});
