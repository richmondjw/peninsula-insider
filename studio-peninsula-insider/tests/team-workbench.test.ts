import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';
import { loadRuntimeConfig } from '../server/config.js';
import { FileFoundryStore } from '../server/store.js';
import {
  createTeamWorkbench,
  resolveTeamWorkbenchConfig,
  TEAM_MODE_ENV_VAR,
  UNTRUSTED_IDENTITY_HEADERS,
  type TeamIdentityVerifier,
} from '../server/team-workbench.js';
import type { ArtifactVersion, FoundryRun } from '../shared/contracts.js';

const temporaryDirectories: string[] = [];

const TEAM_ENV: NodeJS.ProcessEnv = { [TEAM_MODE_ENV_VAR]: 'enabled', NODE_ENV: 'test' };
const teamConfig = () => resolveTeamWorkbenchConfig(TEAM_ENV);

/** The test-only identity injection interface: an in-process verified claim. */
const injectIdentity = (actorId: string): TeamIdentityVerifier => () => ({ actorId, displayName: 'Team Editor' });

async function harness(options: Parameters<typeof createApp>[1] = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'pi-team-workbench-'));
  temporaryDirectories.push(directory);
  const store = new FileFoundryStore(join(directory, 'runs.json'), directory);
  return { directory, store, app: createApp(store, options) };
}

function createRun(app: ReturnType<typeof createApp>, key: string, body: Record<string, unknown> = {}) {
  return request(app).post('/api/foundry/runs')
    .set('Idempotency-Key', key)
    .send({ fixtureId: 'red-hill-winter-lunch', actor: 'body-supplied-editor', ...body });
}

function completed(run: FoundryRun, type: ArtifactVersion['type']): ArtifactVersion {
  const artifact = run.artifactPack.completed.find((candidate) => candidate.type === type);
  if (!artifact) throw new Error(`Missing ${type}`);
  return artifact;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('Team Workbench mode resolution', () => {
  it('defaults to local single-operator mode and preserves fixture behaviour', async () => {
    expect(resolveTeamWorkbenchConfig({})).toMatchObject({ mode: 'local', teamModeEnabled: false });
    for (const raw of ['', 'true', '1', 'ENABLED', 'Enabled', 'team', 'enabled ']) {
      expect(resolveTeamWorkbenchConfig({ [TEAM_MODE_ENV_VAR]: raw }).mode).toBe('local');
    }
    expect(resolveTeamWorkbenchConfig({ [TEAM_MODE_ENV_VAR]: 'enabled' }).mode).toBe('team');

    const { app, store } = await harness();
    const created = (await createRun(app, 'local-default-mode').expect(201)).body as FoundryRun;
    expect(created.audit[0]?.actor).toBe('body-supplied-editor');
    expect((await store.list()).length).toBe(1);

    const capabilities = (await request(app).get('/api/capabilities').expect(200)).body;
    expect(capabilities.teamMode).toBe('local');
    expect(capabilities.teamWorkbench).toEqual({
      mode: 'local',
      enabled: false,
      identitySource: 'local_single_operator',
      trustsIdentityHeaders: false,
      protectedMethods: 'none',
      sharedTenancy: false,
      remoteAccess: false,
    });
    expect(capabilities.directReleaseAdapters).toEqual([]);
    expect(capabilities.publicationAdapters).toEqual(['downloadable_patch']);
    expect(capabilities).toMatchObject({ publishing: false, sending: false, scheduling: false, recording: false, rendering: false, productionMutation: false });
  });

  it('resolves team mode from the non-secret toggle and refuses a public bind', () => {
    expect(loadRuntimeConfig({ NODE_ENV: 'test' }).teamWorkbench.mode).toBe('local');
    expect(loadRuntimeConfig(TEAM_ENV).teamWorkbench).toMatchObject({ mode: 'team', teamModeEnabled: true });
    expect(() => loadRuntimeConfig({ ...TEAM_ENV, FOUNDRY_HOST: '0.0.0.0' })).toThrow(/loopback/);
    expect(() => loadRuntimeConfig({ ...TEAM_ENV, NODE_ENV: 'production' })).toThrow(/disabled in production/);
  });

  it('keeps the test-only identity injector out of non-test runtimes', () => {
    const developmentTeam = resolveTeamWorkbenchConfig({ [TEAM_MODE_ENV_VAR]: 'enabled', NODE_ENV: 'development' });
    expect(developmentTeam.testOnlyIdentityAllowed).toBe(false);
    expect(() => createTeamWorkbench(developmentTeam, { testOnlyIdentity: injectIdentity('sneaky-editor') }))
      .toThrow(/test-only/);
    expect(() => createTeamWorkbench(resolveTeamWorkbenchConfig({}), { verifyIdentity: injectIdentity('editor') }))
      .toThrow(/requires team mode/);
    expect(() => createTeamWorkbench(teamConfig(), { verifyIdentity: injectIdentity('a'), testOnlyIdentity: injectIdentity('b') }))
      .toThrow(/either the server-owned identity verifier or the test-only/);
  });
});

describe('Team mode authenticated-session boundary', () => {
  it('fails closed when team mode is requested without verified identity', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pi-team-workbench-'));
    temporaryDirectories.push(directory);
    const store = new FileFoundryStore(join(directory, 'runs.json'), directory);
    expect(() => createApp(store, { teamWorkbench: teamConfig() })).toThrow(/verified identity/);

    const unresolved = await harness({ teamWorkbench: teamConfig(), identity: { testOnlyIdentity: () => null } });
    expect((await createRun(unresolved.app, 'team-no-identity').expect(401)).body)
      .toEqual({ error: { code: 'team_identity_required' } });

    const failing = await harness({
      teamWorkbench: teamConfig(),
      identity: { testOnlyIdentity: () => { throw new Error('session lookup failed'); } },
    });
    expect((await createRun(failing.app, 'team-verifier-error').expect(401)).body)
      .toEqual({ error: { code: 'team_identity_unverified' } });

    // A malformed claim is not an identity either.
    const malformed = await harness({
      teamWorkbench: teamConfig(),
      identity: { testOnlyIdentity: () => ({ actorId: '' }) as never },
    });
    await createRun(malformed.app, 'team-malformed-claim').expect(401);

    expect(await unresolved.store.list()).toEqual([]);
    expect(await failing.store.list()).toEqual([]);
    expect(await malformed.store.list()).toEqual([]);

    // Reads stay available; only mutations are gated.
    await request(unresolved.app).get('/api/foundry/runs').expect(200);
    const capabilities = (await request(unresolved.app).get('/api/capabilities').expect(200)).body;
    expect(capabilities.teamWorkbench).toEqual({
      mode: 'team',
      enabled: true,
      identitySource: 'test_injected_identity',
      trustsIdentityHeaders: false,
      protectedMethods: 'all_non_get',
      sharedTenancy: false,
      remoteAccess: false,
    });
    expect(capabilities.directReleaseAdapters).toEqual([]);
  });

  it('rejects spoofed identity headers rather than reading them', async () => {
    const { app, store } = await harness({
      teamWorkbench: teamConfig(),
      identity: { testOnlyIdentity: injectIdentity('verified-editor') },
    });
    for (const [index, header] of UNTRUSTED_IDENTITY_HEADERS.entries()) {
      const response = await createRun(app, `spoof-${index}`).set(header, 'editor-in-chief').expect(403);
      expect(response.body).toEqual({ error: { code: 'untrusted_identity_header' } });
    }
    expect(await store.list()).toEqual([]);

    // The same request without the forged header is accepted by the verifier.
    const created = (await createRun(app, 'spoof-control').expect(201)).body as FoundryRun;
    expect(created.audit[0]?.actor).toBe('verified-editor');
  });

  it('accepts a verified injected identity and owns the recorded actor', async () => {
    const { app, store } = await harness({
      teamWorkbench: teamConfig(),
      identity: { testOnlyIdentity: injectIdentity('verified-editor') },
    });
    const run = (await createRun(app, 'team-verified-create', { actor: 'impersonated-editor' }).expect(201)).body as FoundryRun;
    expect(run.audit[0]?.actor).toBe('verified-editor');

    const quickNote = completed(run, 'quick_note');
    const reviewed = (await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
      artifactId: quickNote.id,
      decision: 'accepted',
      reviewer: 'impersonated-editor',
      expectedVersion: run.version,
      expectedArtifactVersion: quickNote.version,
    }).expect(200)).body as FoundryRun;
    expect(reviewed.audit.some((entry) => entry.actor === 'verified-editor')).toBe(true);
    expect(reviewed.audit.every((entry) => entry.actor !== 'impersonated-editor')).toBe(true);

    const persisted = await store.get(run.id);
    expect(persisted?.audit.every((entry) => entry.actor !== 'impersonated-editor')).toBe(true);
  });
});
