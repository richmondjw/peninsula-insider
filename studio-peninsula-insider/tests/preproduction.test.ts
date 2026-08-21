import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { ArtifactVersionSchema, type ArtifactVersion, type FoundryRun } from '../shared/contracts.js';
import { isPreproductionArtifactType, parsePreproductionPayload } from '../shared/preproduction-contracts.js';
import { createApp } from '../server/app.js';
import { artifactDependenciesCurrent, evaluateArtifactGates, hashValue, resolveArtifactPath } from '../server/fixture-runner.js';
import {
  EXPLAINER_FIXTURE_ID,
  PODCAST_FIXTURE_ID,
  runPreproductionFixture,
  SHORT_VIDEO_FIXTURE_ID,
} from '../server/preproduction-fixtures.js';
import { evaluatePreproductionGates, mediaRightsBindingHash } from '../server/preproduction-policy.js';
import { FileFoundryStore } from '../server/store.js';

const temporaryDirectories: string[] = [];

async function harness() {
  const directory = await mkdtemp(join(tmpdir(), 'pi-foundry-preproduction-'));
  temporaryDirectories.push(directory);
  const file = join(directory, 'runs.json');
  const store = new FileFoundryStore(file, directory);
  return { directory, file, store, app: createApp(store) };
}

function byKey(run: FoundryRun, key: string): ArtifactVersion {
  const artifact = run.artifactPack.completed.find((candidate) => candidate.key === key);
  if (!artifact) throw new Error(`Missing artifact ${key}`);
  return artifact;
}

async function reviewArtifact(app: ReturnType<typeof createApp>, run: FoundryRun, artifact: ArtifactVersion) {
  return (await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
    artifactId: artifact.id, decision: 'accepted', reviewer: 'preproduction-reviewer',
    expectedVersion: run.version, expectedArtifactVersion: artifact.version,
  }).expect(200)).body as FoundryRun;
}

async function assertStaleLineageRejected(
  app: ReturnType<typeof createApp>,
  run: FoundryRun,
  artifact: ArtifactVersion,
  payload: unknown,
): Promise<FoundryRun> {
  const edited = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${artifact.id}`).send({
    editor: 'lineage-adversary', expectedVersion: run.version, expectedArtifactVersion: artifact.version,
    payload, factualSegmentIds: artifact.factualSegmentIds, claimUsage: artifact.claimUsage,
  }).expect(200)).body as FoundryRun;
  const updatedArtifact = byKey(edited, artifact.key);
  expect(updatedArtifact.gateResults.find((gate) => gate.gate === 'claim_usage_complete')).toMatchObject({ passed: false, blocking: true });
  await request(app).put(`/api/foundry/runs/${edited.id}/review`).send({
    artifactId: updatedArtifact.id, decision: 'accepted', reviewer: 'lineage-adversary',
    expectedVersion: edited.version, expectedArtifactVersion: updatedArtifact.version,
  }).expect(400);
  return edited;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('governed pre-production recipes', () => {
  it('builds complete explainer, podcast and short-video packs with exact lineage and upstream versions', () => {
    const fixtures = [
      runPreproductionFixture('explainer', 'test-editor', 'explainer-complete-v1'),
      runPreproductionFixture('podcast', 'test-editor', 'podcast-complete-v1'),
      runPreproductionFixture('short_video', 'test-editor', 'video-complete-v1'),
    ];
    expect(fixtures.map((run) => run.artifactPack.completed.length)).toEqual([5, 7, 9]);
    for (const run of fixtures) {
      expect(run.artifactPack.status).toBe('complete');
      expect(run.status).toBe('ready_for_review');
      expect(JSON.stringify(run.artifactPack.completed)).not.toMatch(/\$\s?\d|—|price_band/);
      const completedById = new Map(run.artifactPack.completed.map((artifact) => [artifact.id, artifact]));
      for (const artifact of run.artifactPack.completed) {
        expect(isPreproductionArtifactType(artifact.type)).toBe(true);
        expect(artifactDependenciesCurrent(run, artifact)).toBe(true);
        expect(artifact.gateResults.some((gate) => !gate.passed && gate.blocking)).toBe(false);
        expect(artifact.gateResults.find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: false });
        expect(artifact.factualSegmentIds).toHaveLength(artifact.claimUsage.length);
        for (const usage of artifact.claimUsage) {
          expect(artifact.factualSegmentIds).toContain(usage.segmentId);
          expect(usage.contentHash).toBe(hashValue(resolveArtifactPath(artifact.payload, usage.path)));
          expect(usage.claimIds.length).toBeGreaterThan(0);
          for (const claimId of usage.claimIds) {
            expect(run.claimSet.claims.find((claim) => claim.id === claimId)?.evidence.length).toBeGreaterThan(0);
          }
        }
        for (const dependency of artifact.dependencies.filter((candidate) => candidate.kind === 'artifact')) {
          const upstream = completedById.get(dependency.id);
          expect(upstream).toBeDefined();
          expect(dependency).toMatchObject({ version: upstream?.version, contentHash: upstream?.contentHash });
        }
      }
    }
    expect(fixtures[2].artifactPack.completed.flatMap((artifact) => (
      'kind' in artifact.payload && artifact.payload.kind === 'video_script' ? [artifact.payload.targetSeconds] : []
    ))).toEqual([30, 60]);
  });

  it('detects appended spoken, scene and overlay segments that do not have atomic lineage', () => {
    const podcast = runPreproductionFixture('podcast', 'test-editor', 'lineage-podcast-v1');
    const script = structuredClone(byKey(podcast, 'podcast-script'));
    if (script.type !== 'podcast_script' || script.payload.kind !== 'podcast_script') throw new Error('Podcast script narrowing failed');
    script.payload.segments.push({
      id: 'invented-speaker', text: 'A contributor says this is the Peninsula favourite.', durationMs: 1_000,
      contentMode: 'source_quote', speaker: 'contributor',
    });
    const scriptGates = evaluateArtifactGates(script.payload, podcast.claimSet.claims, script.factualSegmentIds, script.claimUsage, podcast.updatedAt);
    expect(scriptGates.find((gate) => gate.gate === 'claim_usage_complete')).toMatchObject({ passed: false, blocking: true });

    const video = runPreproductionFixture('short_video', 'test-editor', 'lineage-video-v1');
    const scenes = structuredClone(byKey(video, 'video-scenes'));
    if (scenes.type !== 'video_scenes' || scenes.payload.kind !== 'video_scenes') throw new Error('Video scenes narrowing failed');
    scenes.payload.scenes.push({ id: 'invented-scene', title: 'Crowd', text: 'A full dining room.', startMs: 60_000, endMs: 61_000, treatment: 'documentary' });
    const sceneGates = evaluateArtifactGates(scenes.payload, video.claimSet.claims, scenes.factualSegmentIds, scenes.claimUsage, video.updatedAt);
    expect(sceneGates.find((gate) => gate.gate === 'claim_usage_complete')).toMatchObject({ passed: false, blocking: true });

    const overlays = structuredClone(byKey(video, 'video-overlays'));
    if (overlays.type !== 'video_overlays' || overlays.payload.kind !== 'video_overlays') throw new Error('Video overlay narrowing failed');
    overlays.payload.items.push({ id: 'invented-overlay', title: 'Claim', text: 'Open every day', startMs: 55_000, endMs: 59_000 });
    const overlayGates = evaluateArtifactGates(overlays.payload, video.claimSet.claims, overlays.factualSegmentIds, overlays.claimUsage, video.updatedAt);
    expect(overlayGates.find((gate) => gate.gate === 'claim_usage_complete')).toMatchObject({ passed: false, blocking: true });
  });

  it('fails closed through the API when a question, label, prompt, title or appended guidance lacks fresh lineage', async () => {
    const { app } = await harness();
    let explainer = (await request(app).post('/api/foundry/runs').send({
      fixtureId: EXPLAINER_FIXTURE_ID, actor: 'test-editor', idempotencyKey: 'lineage-surfaces-explainer-v1',
    }).expect(201)).body as FoundryRun;
    let artifact = byKey(explainer, 'explainer-faq');
    if (artifact.type !== 'explainer_faq' || artifact.payload.kind !== 'explainer_faq') throw new Error('FAQ narrowing failed');
    const faqPayload = structuredClone(artifact.payload);
    faqPayload.items[0].question = 'Why is this venue open seven days a week?';
    explainer = await assertStaleLineageRejected(app, explainer, artifact, faqPayload);
    artifact = byKey(explainer, 'explainer-visualisation');
    if (artifact.type !== 'explainer_visualisation' || artifact.payload.kind !== 'explainer_visualisation') throw new Error('Visualisation narrowing failed');
    const visualisationPayload = structuredClone(artifact.payload);
    visualisationPayload.points[0].label = 'Open every day';
    await assertStaleLineageRejected(app, explainer, artifact, visualisationPayload);

    let podcast = (await request(app).post('/api/foundry/runs').send({
      fixtureId: PODCAST_FIXTURE_ID, actor: 'test-editor', idempotencyKey: 'lineage-surfaces-podcast-v1',
    }).expect(201)).body as FoundryRun;
    artifact = byKey(podcast, 'podcast-interview-guide');
    if (artifact.type !== 'podcast_interview_guide' || artifact.payload.kind !== 'podcast_interview_guide') throw new Error('Interview guide narrowing failed');
    const guidePayload = structuredClone(artifact.payload);
    guidePayload.questions[0].prompt = 'Why does every local recommend this venue?';
    podcast = await assertStaleLineageRejected(app, podcast, artifact, guidePayload);
    artifact = byKey(podcast, 'podcast-angle');
    if (artifact.type !== 'podcast_angle' || artifact.payload.kind !== 'podcast_angle') throw new Error('Podcast angle narrowing failed');
    const anglePayload = structuredClone(artifact.payload);
    anglePayload.avoidClaims.push('The venue is open seven days a week.');
    await assertStaleLineageRejected(app, podcast, artifact, anglePayload);

    const video = (await request(app).post('/api/foundry/runs').send({
      fixtureId: SHORT_VIDEO_FIXTURE_ID, actor: 'test-editor', idempotencyKey: 'lineage-surfaces-video-v1',
    }).expect(201)).body as FoundryRun;
    artifact = byKey(video, 'video-overlays');
    if (artifact.type !== 'video_overlays' || artifact.payload.kind !== 'video_overlays') throw new Error('Overlay narrowing failed');
    const overlayPayload = structuredClone(artifact.payload);
    overlayPayload.items[0].title = 'Open every day';
    await assertStaleLineageRejected(app, video, artifact, overlayPayload);
  });

  it('applies price and em-dash laws to nested pre-production payloads', () => {
    const video = runPreproductionFixture('short_video', 'test-editor', 'nested-style-law-v1');
    const captions = structuredClone(byKey(video, 'video-platform-captions'));
    if (captions.type !== 'video_platform_captions' || captions.payload.kind !== 'video_platform_captions') throw new Error('Caption narrowing failed');
    captions.payload.items[0].caption = 'Book the $95 lunch.';
    captions.payload.items[1].caption = 'Covered dining — useful in rain.';
    const gates = evaluateArtifactGates(captions.payload, video.claimSet.claims, captions.factualSegmentIds, captions.claimUsage, video.updatedAt);
    expect(gates.find((gate) => gate.gate === 'no_price')).toMatchObject({ passed: false, blocking: true });
    expect(gates.find((gate) => gate.gate === 'no_em_dash')).toMatchObject({ passed: false, blocking: true });
  });

  it('validates deterministic timing for narration, run sheets, scenes, overlays and subtitles', () => {
    const video = runPreproductionFixture('short_video', 'test-editor', 'timing-video-v1');
    const script = structuredClone(byKey(video, 'video-script-30'));
    if (script.type !== 'video_script' || script.payload.kind !== 'video_script') throw new Error('Video script narrowing failed');
    script.payload.segments[0].durationMs += 1_000;
    expect(evaluatePreproductionGates(script.payload, script.dependencies).find((gate) => gate.gate === 'timing_valid')).toMatchObject({ passed: false, blocking: true });

    const podcast = runPreproductionFixture('podcast', 'test-editor', 'timing-podcast-v1');
    const runSheet = structuredClone(byKey(podcast, 'podcast-run-sheet'));
    if (runSheet.type !== 'podcast_run_sheet' || runSheet.payload.kind !== 'podcast_run_sheet') throw new Error('Run sheet narrowing failed');
    runSheet.payload.segments[1].startMs = 50_000;
    expect(evaluatePreproductionGates(runSheet.payload, runSheet.dependencies).find((gate) => gate.gate === 'timing_valid')).toMatchObject({ passed: false, blocking: true });

    const subtitles = structuredClone(byKey(video, 'video-subtitles'));
    if (subtitles.type !== 'video_subtitles' || subtitles.payload.kind !== 'video_subtitles') throw new Error('Subtitle narrowing failed');
    subtitles.payload.cues[2].endMs = 31_000;
    expect(evaluatePreproductionGates(subtitles.payload, subtitles.dependencies).find((gate) => gate.gate === 'timing_valid')).toMatchObject({ passed: false, blocking: true });
  });

  it('blocks simulated contributors, synthetic or cloned voice and unsafe generated treatments', () => {
    const podcast = runPreproductionFixture('podcast', 'test-editor', 'policy-podcast-v1');
    const script = structuredClone(byKey(podcast, 'podcast-script'));
    if (script.type !== 'podcast_script' || script.payload.kind !== 'podcast_script') throw new Error('Podcast script narrowing failed');
    script.payload.segments[0].contentMode = 'simulated_contributor';
    expect(evaluatePreproductionGates(script.payload, script.dependencies).find((gate) => gate.gate === 'preproduction_policy')).toMatchObject({ passed: false, blocking: true });

    for (const voiceMode of ['synthetic', 'cloned'] as const) {
      const unsafeVoice = structuredClone(script.payload);
      unsafeVoice.segments[0].contentMode = 'editorial_narration';
      unsafeVoice.boundary.voiceMode = voiceMode;
      expect(evaluatePreproductionGates(unsafeVoice, script.dependencies).find((gate) => gate.gate === 'preproduction_policy')).toMatchObject({ passed: false, blocking: true });
    }

    const video = runPreproductionFixture('short_video', 'test-editor', 'policy-video-v1');
    const scenes = structuredClone(byKey(video, 'video-scenes'));
    if (scenes.type !== 'video_scenes' || scenes.payload.kind !== 'video_scenes') throw new Error('Video scenes narrowing failed');
    scenes.payload.boundary.generationMode = 'documentary';
    expect(evaluatePreproductionGates(scenes.payload, scenes.dependencies).find((gate) => gate.gate === 'preproduction_policy')).toMatchObject({ passed: false, blocking: true });
    scenes.payload.boundary.generationMode = 'illustrative';
    expect(evaluatePreproductionGates(scenes.payload, scenes.dependencies).find((gate) => gate.gate === 'preproduction_policy')).toMatchObject({ passed: false, blocking: true });
    scenes.payload.boundary.generationApprovalId = 'approval-illustrative-1';
    scenes.payload.boundary.generationDisclosure = 'Illustrative generated scene, not documentary footage.';
    expect(evaluatePreproductionGates(scenes.payload, scenes.dependencies).find((gate) => gate.gate === 'preproduction_policy')).toMatchObject({ passed: true });
  });

  it('requires exact asset, placement, surface, rights and release bindings before media readiness can pass', () => {
    const run = runPreproductionFixture('short_video', 'test-editor', 'media-ready-v1');
    const shots = structuredClone(byKey(run, 'video-shot-list'));
    if (shots.type !== 'video_shot_list' || shots.payload.kind !== 'video_shot_list') throw new Error('Video shot-list narrowing failed');
    shots.payload.boundary.mediaStatus = 'ready';
    expect(evaluatePreproductionGates(shots.payload, shots.dependencies).find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: true });

    shots.payload.boundary.mediaAssignments = shots.payload.shots.map((_, index) => ({
      id: `assignment-shot-${index + 1}`,
      placementPath: `$.shots[${index}]`,
      surface: 'video' as const,
      asset: { id: `asset-shot-${index + 1}`, version: 1, contentHash: hashValue({ asset: `shot-${index + 1}` }) },
      rights: { id: `rights-shot-${index + 1}`, version: 1 },
      recognisablePeople: index === 0,
      releaseIds: index === 0 ? ['release-person-fixture'] : [],
    }));
    const boundSnapshots = shots.payload.boundary.mediaAssignments.map((assignment) => ({
      ...assignment.rights, contentHash: mediaRightsBindingHash(assignment),
    }));
    shots.payload.boundary.rightsSnapshots = boundSnapshots;
    shots.payload.boundary.recognisablePeople = true;
    shots.payload.boundary.releaseIds = ['release-person-fixture'];
    shots.dependencies.push(...boundSnapshots.map((snapshot) => ({ kind: 'media_rights' as const, ...snapshot, status: 'cleared' as const })));
    expect(evaluatePreproductionGates(shots.payload, shots.dependencies).find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: true });
    shots.payload.shots.forEach((shot) => { shot.source = 'rights_cleared'; });

    const missingPlacement = structuredClone(shots.payload);
    missingPlacement.boundary.mediaAssignments.pop();
    expect(evaluatePreproductionGates(missingPlacement, shots.dependencies).find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: true });
    const swappedAsset = structuredClone(shots.payload);
    swappedAsset.boundary.mediaAssignments[0].asset.id = 'asset-never-cleared';
    expect(evaluatePreproductionGates(swappedAsset, shots.dependencies).find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: true });
    const unrelatedRights = structuredClone(shots.payload);
    const unrelatedDependencies = structuredClone(shots.dependencies);
    const unrelatedHash = hashValue({ unrelated: 'asset' });
    unrelatedRights.boundary.rightsSnapshots[0].contentHash = unrelatedHash;
    const unrelatedDependency = unrelatedDependencies.find((dependency) => dependency.kind === 'media_rights' && dependency.id === unrelatedRights.boundary.rightsSnapshots[0].id);
    if (!unrelatedDependency) throw new Error('Expected media dependency');
    unrelatedDependency.contentHash = unrelatedHash;
    expect(evaluatePreproductionGates(unrelatedRights, unrelatedDependencies).find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: true });
    const releaseMismatch = structuredClone(shots.payload);
    releaseMismatch.boundary.mediaAssignments[0].releaseIds = ['release-different-person'];
    expect(evaluatePreproductionGates(releaseMismatch, shots.dependencies).find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: true });

    shots.contentHash = hashValue(shots.payload);
    shots.gateResults = shots.gateResults.filter((gate) => !['media_render_ready', 'preproduction_policy', 'timing_valid'].includes(gate.gate));
    shots.gateResults.push(...evaluatePreproductionGates(shots.payload, shots.dependencies));
    const parsed = ArtifactVersionSchema.parse(shots);
    const replaced = structuredClone(run);
    replaced.artifactPack.completed = replaced.artifactPack.completed.map((artifact) => artifact.id === parsed.id ? parsed : artifact);
    expect(artifactDependenciesCurrent(replaced, parsed)).toBe(true);
    expect(parsed.gateResults.find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: true, blocking: false });

    const podcast = runPreproductionFixture('podcast', 'test-editor', 'voice-ready-v1');
    const podcastScript = structuredClone(byKey(podcast, 'podcast-script'));
    if (podcastScript.type !== 'podcast_script' || podcastScript.payload.kind !== 'podcast_script') throw new Error('Podcast script narrowing failed');
    podcastScript.payload.boundary.mediaStatus = 'ready';
    expect(evaluatePreproductionGates(podcastScript.payload, podcastScript.dependencies).find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: true });
    podcastScript.payload.boundary.voiceMode = 'human_cleared';
    podcastScript.payload.boundary.voiceReleaseId = 'release-host-fixture';
    podcastScript.payload.boundary.releaseIds = ['release-host-fixture'];
    podcastScript.payload.boundary.mediaAssignments = podcastScript.payload.segments.map((_, index) => ({
      id: `assignment-audio-${index + 1}`,
      placementPath: `$.segments[${index}]`,
      surface: 'audio' as const,
      asset: { id: `asset-audio-${index + 1}`, version: 1, contentHash: hashValue({ asset: `audio-${index + 1}` }) },
      rights: { id: `rights-audio-${index + 1}`, version: 1 },
      recognisablePeople: false,
      releaseIds: ['release-host-fixture'],
    }));
    podcastScript.payload.boundary.rightsSnapshots = podcastScript.payload.boundary.mediaAssignments.map((assignment) => ({
      ...assignment.rights, contentHash: mediaRightsBindingHash(assignment),
    }));
    podcastScript.dependencies.push(...podcastScript.payload.boundary.rightsSnapshots.map((snapshot) => ({
      kind: 'media_rights' as const, ...snapshot, status: 'cleared' as const,
    })));
    expect(evaluatePreproductionGates(podcastScript.payload, podcastScript.dependencies).find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: true, blocking: false });
  });

  it('does not let an artifact update self-assert media readiness without server-held rights dependencies', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: SHORT_VIDEO_FIXTURE_ID, actor: 'test-editor', idempotencyKey: 'media-api-bypass-v1',
    }).expect(201)).body as FoundryRun;
    const shots = byKey(run, 'video-shot-list');
    if (shots.type !== 'video_shot_list' || shots.payload.kind !== 'video_shot_list') throw new Error('Video shot-list narrowing failed');
    const payload = structuredClone(shots.payload);
    payload.boundary.mediaStatus = 'ready';
    payload.shots.forEach((shot) => { shot.source = 'rights_cleared'; });
    payload.boundary.mediaAssignments = payload.shots.map((_, index) => ({
      id: `client-assignment-${index + 1}`, placementPath: `$.shots[${index}]`, surface: 'video' as const,
      asset: { id: `client-asset-${index + 1}`, version: 1, contentHash: hashValue({ client: index }) },
      rights: { id: `client-rights-${index + 1}`, version: 1 }, recognisablePeople: false, releaseIds: [],
    }));
    payload.boundary.rightsSnapshots = payload.boundary.mediaAssignments.map((assignment) => ({
      ...assignment.rights, contentHash: mediaRightsBindingHash(assignment),
    }));
    run = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${shots.id}`).send({
      editor: 'media-adversary', expectedVersion: run.version, expectedArtifactVersion: shots.version,
      payload, factualSegmentIds: shots.factualSegmentIds, claimUsage: shots.claimUsage,
    }).expect(200)).body as FoundryRun;
    const edited = byKey(run, 'video-shot-list');
    expect(edited.dependencies.some((dependency) => dependency.kind === 'media_rights')).toBe(false);
    expect(edited.gateResults.find((gate) => gate.gate === 'media_render_ready')).toMatchObject({ passed: false, blocking: true });
    await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
      artifactId: edited.id, decision: 'accepted', reviewer: 'media-adversary',
      expectedVersion: run.version, expectedArtifactVersion: edited.version,
    }).expect(400);
  });

  it('keeps required siblings reviewable when one optional derivative fails', async () => {
    const { app } = await harness();
    for (const fixtureId of [EXPLAINER_FIXTURE_ID, PODCAST_FIXTURE_ID, SHORT_VIDEO_FIXTURE_ID]) {
      const response = await request(app).post('/api/foundry/runs').send({
        fixtureId, fixtureVariant: 'partial_optional_failure', actor: 'test-editor', idempotencyKey: `partial-${fixtureId}`,
      }).expect(201);
      const run = response.body as FoundryRun;
      expect(run.artifactPack.status).toBe('partial');
      expect(run.artifactPack.failed).toEqual([expect.objectContaining({ required: false })]);
      expect(run.status).toBe('ready_for_review');
      expect(run.artifactPack.completed.every((artifact) => !artifact.gateResults.some((gate) => !gate.passed && gate.blocking))).toBe(true);
    }
  });

  it('cascades exact upstream staleness while preserving an unrelated script branch', async () => {
    const { app, file, directory } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: SHORT_VIDEO_FIXTURE_ID, actor: 'test-editor', idempotencyKey: 'video-staleness-v1',
    }).expect(201)).body as FoundryRun;
    for (const key of ['video-script-30', 'video-subtitles', 'video-platform-captions', 'video-script-60', 'video-scenes']) {
      run = await reviewArtifact(app, run, byKey(run, key));
    }
    const script = byKey(run, 'video-script-30');
    if (script.type !== 'video_script' || script.payload.kind !== 'video_script') throw new Error('Video script narrowing failed');
    const payload = structuredClone(script.payload);
    payload.segments[0].text = 'Wet day in Red Hill? Start with a covered lunch.';
    const claimUsage = script.claimUsage.map((usage) => usage.segmentId === 'script30-1'
      ? { ...usage, contentHash: hashValue(payload.segments[0].text) }
      : usage);
    const edited = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${script.id}`).send({
      editor: 'test-editor', expectedVersion: run.version, expectedArtifactVersion: script.version,
      payload, factualSegmentIds: script.factualSegmentIds, claimUsage,
    }).expect(200)).body as FoundryRun;
    const status = (key: string) => edited.artifactPack.reviews.find((review) => review.artifactId === byKey(edited, key).id)?.status;
    expect(status('video-script-30')).toBe('stale');
    expect(status('video-subtitles')).toBe('stale');
    expect(status('video-platform-captions')).toBe('stale');
    expect(status('video-script-60')).toBe('current');
    expect(status('video-scenes')).toBe('current');
    expect(byKey(edited, 'video-subtitles').gateResults.find((gate) => gate.gate === 'dependency_current')).toMatchObject({ passed: false, blocking: true });

    const restarted = new FileFoundryStore(file, directory);
    const persisted = await restarted.get(run.id);
    expect(persisted?.artifactPack.reviews.find((review) => review.artifactId === byKey(edited, 'video-scenes').id)?.status).toBe('current');
    expect(persisted?.artifactPack.reviews.find((review) => review.artifactId === byKey(edited, 'video-subtitles').id)?.status).toBe('stale');
  });

  it('rejects policy-violating edits and exposes no record, render, schedule, send or publish endpoint', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: PODCAST_FIXTURE_ID, actor: 'test-editor', idempotencyKey: 'podcast-negative-capability-v1',
    }).expect(201)).body as FoundryRun;
    const script = byKey(run, 'podcast-script');
    if (script.type !== 'podcast_script' || script.payload.kind !== 'podcast_script') throw new Error('Podcast script narrowing failed');
    const payload = structuredClone(script.payload);
    payload.segments[0].contentMode = 'simulated_contributor';
    run = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${script.id}`).send({
      editor: 'test-editor', expectedVersion: run.version, expectedArtifactVersion: script.version,
      payload, factualSegmentIds: script.factualSegmentIds, claimUsage: script.claimUsage,
    }).expect(200)).body as FoundryRun;
    const edited = byKey(run, 'podcast-script');
    expect(edited.gateResults.find((gate) => gate.gate === 'preproduction_policy')).toMatchObject({ passed: false, blocking: true });
    await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
      artifactId: edited.id, decision: 'accepted', reviewer: 'unsafe-reviewer',
      expectedVersion: run.version, expectedArtifactVersion: edited.version,
    }).expect(400);
    await request(app).get(`/api/foundry/runs/${run.id}/patch`).expect(400);
    for (const capability of ['record', 'render', 'schedule', 'send', 'publish']) {
      await request(app).post(`/api/foundry/${capability}`).send({ runId: run.id }).expect(404);
    }
  });
});
