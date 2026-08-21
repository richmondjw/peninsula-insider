import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { evaluateQuickNoteGates, withArtifactHash } from '../server/fixture-runner.js';
import { FileFoundryStore } from '../server/store.js';
import { containsEmDash } from '../shared/editorial-laws.js';
import { REAL_URL_ASK_PROVENANCE_TEMPLATE, type ArtifactVersion, type FoundryRun } from '../shared/contracts.js';

const temporaryDirectories: string[] = [];

async function harness() {
  const directory = await mkdtemp(join(tmpdir(), 'pi-v1-integrity-'));
  temporaryDirectories.push(directory);
  const file = join(directory, 'runs.json');
  const store = new FileFoundryStore(file, directory);
  return { directory, file, store, app: createApp(store) };
}

function artifact<T extends ArtifactVersion['type']>(run: FoundryRun, type: T): Extract<ArtifactVersion, { type: T }> {
  const found = run.artifactPack.completed.find((candidate) => candidate.type === type);
  if (!found) throw new Error(`Missing ${type}`);
  return found as Extract<ArtifactVersion, { type: T }>;
}

async function createPack(app: ReturnType<typeof createApp>, key: string): Promise<FoundryRun> {
  return (await request(app).post('/api/foundry/runs').send({
    fixtureId: 'red-hill-url-article', fixtureVariant: 'complete', actor: 'integrity-editor', idempotencyKey: key,
  }).expect(201)).body as FoundryRun;
}

async function accept(app: ReturnType<typeof createApp>, run: FoundryRun, selected: ArtifactVersion): Promise<FoundryRun> {
  return (await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
    artifactId: selected.id, expectedArtifactVersion: selected.version, expectedVersion: run.version,
    decision: 'accepted', reviewer: 'integrity-editor',
  }).expect(200)).body as FoundryRun;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('V1 public output integrity', () => {
  it('keeps Quick source notes and Ask provenance exact server-owned templates across restart and export', async () => {
    const { directory, store, app } = await harness();
    let run = await createPack(app, 'immutable-public-templates');
    const quick = artifact(run, 'quick_note');
    await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${quick.id}`).send({
      editor: 'attacker', expectedVersion: run.version, expectedArtifactVersion: quick.version,
      payload: { ...quick.payload, sources: quick.payload.sources.map((source) => ({ ...source, note: 'Verified and cleared for publication.' })) },
    }).expect(400);
    const ask = artifact(run, 'ask_answer');
    await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${ask.id}`).send({
      editor: 'attacker', expectedVersion: run.version, expectedArtifactVersion: ask.version,
      payload: { ...ask.payload, provenance_footer: 'Independently verified and approved for publication.' },
    }).expect(400);

    const restarted = new FileFoundryStore(join(directory, 'runs.json'), directory);
    const restored = await restarted.get(run.id);
    expect(artifact(restored!, 'quick_note').payload).toEqual(quick.payload);
    expect(artifact(restored!, 'ask_answer').payload).toEqual(ask.payload);
    run = await accept(app, restored!, artifact(restored!, 'ask_answer'));
    const handoff = await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${ask.id}/handoff`).expect(200);
    expect(handoff.text).toContain(ask.payload.provenance_footer);
    expect(handoff.text).not.toContain('approved for publication');
  });

  it('rejects a self-consistent fixture-to-real Ask template swap after restart', async () => {
    const { directory, file, app } = await harness();
    const run = await createPack(app, 'fixture-mode-template-binding');
    const stored = JSON.parse(await readFile(file, 'utf8'));
    const persistedRun = stored.runs.find((candidate: FoundryRun) => candidate.id === run.id) as FoundryRun;
    const askIndex = persistedRun.artifactPack.completed.findIndex((candidate) => candidate.type === 'ask_answer');
    const ask = artifact(persistedRun, 'ask_answer');
    const forged = withArtifactHash({
      ...ask,
      payload: { ...ask.payload, provenance_footer: REAL_URL_ASK_PROVENANCE_TEMPLATE },
      gateResults: ask.gateResults,
    }, persistedRun.claimSet.claims);
    persistedRun.artifactPack.completed[askIndex] = forged;
    await writeFile(file, `${JSON.stringify(stored)}\n`, 'utf8');
    await expect(new FileFoundryStore(file, directory).get(run.id)).rejects.toThrow(/provenance template.*source authority/i);
  });

  it('rejects literal and encoded em dashes before review or export', async () => {
    for (const token of ['—', '&mdash;', '&MDASH;', '&#8212;', '&#0008212;', '&#x2014;', '&#X02014;']) {
      expect(containsEmDash(token)).toBe(true);
    }
    const { app } = await harness();
    let run = await createPack(app, 'encoded-em-dash');
    const quick = artifact(run, 'quick_note');
    const payload = { ...quick.payload, headline: `Blocked ${'&mdash;'} copy` };
    expect(evaluateQuickNoteGates(payload, run.claimSet.claims, quick.claimIds).find((gate) => gate.gate === 'no_em_dash')?.passed).toBe(false);
    run = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${quick.id}`).send({
      editor: 'integrity-editor', expectedVersion: run.version, expectedArtifactVersion: quick.version, payload,
    }).expect(200)).body as FoundryRun;
    const edited = artifact(run, 'quick_note');
    await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
      artifactId: edited.id, expectedArtifactVersion: edited.version, expectedVersion: run.version,
      decision: 'accepted', reviewer: 'integrity-editor',
    }).expect(400);
    await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${edited.id}/handoff`).expect(400);
    await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${edited.id}/patch`).expect(400);
  });

  it('exports the exact accepted Quick adapter inside an Article pack and keeps Article patch rights-composite', async () => {
    const { app } = await harness();
    let run = await createPack(app, 'artifact-specific-patches');
    const quick = artifact(run, 'quick_note');
    run = await accept(app, run, quick);
    const quickPatch = await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${quick.id}/patch`).expect(200);
    expect(quickPatch.text).toContain('next/src/content/quick-notes/');
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);

    run = await accept(app, run, artifact(run, 'article_draft'));
    const metadata = artifact(run, 'article_metadata');
    run = await accept(app, run, metadata);
    const articlePatch = await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${metadata.id}/patch`).expect(200);
    expect(articlePatch.text).toContain('next/src/content/articles/');
  });
});
