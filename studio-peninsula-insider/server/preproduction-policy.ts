import { createHash } from 'node:crypto';
import {
  PreproductionPayloadSchema,
  type PreproductionPayload,
} from '../shared/preproduction-contracts.js';
import type { ArtifactDependency, GateResult } from '../shared/contracts.js';

function gate(name: 'preproduction_policy' | 'timing_valid' | 'media_render_ready', passed: boolean, detail: string, blocking = true): GateResult {
  return passed
    ? { gate: name, scope: 'artifact', passed: true, blocking: false, detail, claimIds: [] }
    : { gate: name, scope: 'artifact', passed: false, blocking, detail, claimIds: [] };
}

function orderedAndBounded(items: Array<{ startMs: number; endMs: number }>, targetDurationMs: number, contiguous: boolean): boolean {
  if (items.length === 0 || items[0].startMs !== 0) return false;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.endMs <= item.startMs || item.endMs > targetDurationMs) return false;
    if (index > 0) {
      const previous = items[index - 1];
      if (item.startMs < previous.endMs || (contiguous && item.startMs !== previous.endMs)) return false;
    }
  }
  return !contiguous || items.at(-1)?.endMs === targetDurationMs;
}

function timingCurrent(payload: PreproductionPayload): boolean {
  switch (payload.kind) {
    case 'explainer_voiceover':
    case 'podcast_script':
      return payload.segments.reduce((total, segment) => total + segment.durationMs, 0) === payload.targetDurationMs;
    case 'podcast_run_sheet':
      return orderedAndBounded(payload.segments, payload.targetDurationMs, true);
    case 'podcast_chapters':
      return orderedAndBounded(payload.items, payload.targetDurationMs, false);
    case 'video_script':
      return payload.segments.reduce((total, segment) => total + segment.durationMs, 0) === payload.targetSeconds * 1_000;
    case 'video_shot_list':
      return payload.shots.reduce((total, shot) => total + shot.durationMs, 0) === payload.targetDurationMs;
    case 'video_scenes':
      return orderedAndBounded(payload.scenes, payload.targetDurationMs, true);
    case 'video_overlays':
      return orderedAndBounded(payload.items, payload.targetDurationMs, false);
    case 'video_subtitles':
      return orderedAndBounded(payload.cues, payload.targetDurationMs, false);
    default:
      return true;
  }
}

function includesSimulatedContributor(payload: PreproductionPayload): boolean {
  return JSON.stringify(payload).includes('"contentMode":"simulated_contributor"');
}

function policyCurrent(payload: PreproductionPayload): boolean {
  const boundary = payload.boundary;
  if (includesSimulatedContributor(payload)) return false;
  if (boundary.voiceMode === 'synthetic' || boundary.voiceMode === 'cloned') return false;
  if (boundary.voiceMode === 'human_cleared' && !boundary.voiceReleaseId) return false;
  if (boundary.generationMode === 'documentary') return false;
  if (boundary.generationMode === 'illustrative' && payload.kind === 'video_scenes' && payload.scenes.some((scene) => scene.treatment === 'documentary')) return false;
  if (payload.kind === 'video_shot_list' && payload.shots.some((shot) => shot.source === 'approved_illustrative') && boundary.generationMode !== 'illustrative') return false;
  if (payload.kind === 'video_scenes' && payload.scenes.some((scene) => scene.treatment === 'illustrative') && boundary.generationMode !== 'illustrative') return false;
  if (boundary.generationMode === 'illustrative' && (!boundary.generationApprovalId || !boundary.generationDisclosure)) return false;
  return true;
}

type MediaAssignment = PreproductionPayload['boundary']['mediaAssignments'][number];

function sameStringSet(left: string[], right: string[]): boolean {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function requiredMediaPlacements(payload: PreproductionPayload): Array<{ path: string; surface: MediaAssignment['surface'] }> {
  switch (payload.kind) {
    case 'explainer_carousel':
      return payload.slides.map((_, index) => ({ path: `$.slides[${index}]`, surface: payload.boundary.generationMode === 'illustrative' ? 'illustration' : 'image' }));
    case 'explainer_visualisation':
      return payload.points.map((_, index) => ({ path: `$.points[${index}]`, surface: 'illustration' }));
    case 'explainer_voiceover':
    case 'podcast_script':
    case 'video_script':
      return payload.segments.map((_, index) => ({ path: `$.segments[${index}]`, surface: 'audio' }));
    case 'video_hooks':
      return payload.variants.map((_, index) => ({ path: `$.variants[${index}]`, surface: 'audio' }));
    case 'video_shot_list':
      return payload.shots.map((shot, index) => ({
        path: `$.shots[${index}]`,
        surface: shot.source === 'approved_illustrative' ? 'illustration' : 'video',
      }));
    case 'video_scenes':
      return payload.scenes.flatMap((scene, index) => scene.treatment === 'text_only' ? [] : [{
        path: `$.scenes[${index}]`,
        surface: scene.treatment === 'illustrative' ? 'illustration' as const : 'video' as const,
      }]);
    case 'video_thumbnail':
      return payload.variants.map((_, index) => ({ path: `$.variants[${index}]`, surface: payload.boundary.generationMode === 'illustrative' ? 'illustration' : 'image' }));
    default:
      return [];
  }
}

export function mediaRightsBindingHash(assignment: MediaAssignment): string {
  return createHash('sha256').update(JSON.stringify({
    asset: assignment.asset,
    placementPath: assignment.placementPath,
    surface: assignment.surface,
    rights: assignment.rights,
    recognisablePeople: assignment.recognisablePeople,
    releaseIds: [...assignment.releaseIds].sort(),
  })).digest('hex');
}

export function mediaReadinessCurrent(payload: PreproductionPayload, dependencies: ArtifactDependency[]): boolean {
  const boundary = payload.boundary;
  const mediaDependencies = dependencies.filter((dependency) => dependency.kind === 'media_rights');
  if (boundary.mediaStatus === 'unassigned') {
    return boundary.rightsSnapshots.length === 0 && boundary.mediaAssignments.length === 0 && mediaDependencies.length === 0;
  }
  const requiredPlacements = requiredMediaPlacements(payload);
  if (requiredPlacements.length === 0 || boundary.mediaAssignments.length !== requiredPlacements.length) return false;
  if (boundary.rightsSnapshots.length !== boundary.mediaAssignments.length || mediaDependencies.length !== boundary.mediaAssignments.length) return false;
  if (new Set(boundary.mediaAssignments.map((assignment) => assignment.placementPath)).size !== boundary.mediaAssignments.length) return false;
  const assignmentRightsRefs = boundary.mediaAssignments.map((assignment) => `${assignment.rights.id}@${assignment.rights.version}`);
  const snapshotRightsRefs = boundary.rightsSnapshots.map((snapshot) => `${snapshot.id}@${snapshot.version}`);
  const dependencyRightsRefs = mediaDependencies.map((dependency) => `${dependency.id}@${dependency.version}`);
  if (new Set(assignmentRightsRefs).size !== assignmentRightsRefs.length
    || new Set(snapshotRightsRefs).size !== snapshotRightsRefs.length
    || new Set(dependencyRightsRefs).size !== dependencyRightsRefs.length) return false;
  if (!requiredPlacements.every((required) => boundary.mediaAssignments.some((assignment) => (
    assignment.placementPath === required.path && assignment.surface === required.surface
  )))) return false;
  if (payload.kind === 'video_shot_list' && payload.shots.some((shot) => shot.source === 'unassigned')) return false;
  const assignedReleaseIds = [...new Set(boundary.mediaAssignments.flatMap((assignment) => assignment.releaseIds))];
  if (!sameStringSet(boundary.releaseIds, assignedReleaseIds)) return false;
  if (boundary.recognisablePeople !== boundary.mediaAssignments.some((assignment) => assignment.recognisablePeople)) return false;
  if (boundary.mediaAssignments.some((assignment) => assignment.recognisablePeople && assignment.releaseIds.length === 0)) return false;
  if (['explainer_voiceover', 'podcast_script', 'video_hooks', 'video_script'].includes(payload.kind)
    && (boundary.voiceMode !== 'human_cleared' || !boundary.voiceReleaseId)) return false;
  if (boundary.voiceMode === 'human_cleared' && !boundary.voiceReleaseId) return false;
  if (boundary.voiceReleaseId && !boundary.mediaAssignments.every((assignment) => assignment.surface !== 'audio' || assignment.releaseIds.includes(boundary.voiceReleaseId!))) return false;
  if (boundary.generationMode === 'illustrative' && (!boundary.generationApprovalId || !boundary.generationDisclosure)) return false;
  if (boundary.generationMode === 'documentary' || boundary.voiceMode === 'synthetic' || boundary.voiceMode === 'cloned') return false;
  return boundary.mediaAssignments.every((assignment) => {
    const bindingHash = mediaRightsBindingHash(assignment);
    const snapshot = boundary.rightsSnapshots.find((candidate) => candidate.id === assignment.rights.id && candidate.version === assignment.rights.version);
    const dependency = mediaDependencies.find((candidate) => candidate.id === assignment.rights.id && candidate.version === assignment.rights.version);
    return snapshot?.contentHash === bindingHash
      && dependency?.kind === 'media_rights'
      && dependency.contentHash === bindingHash
      && dependency.status === 'cleared';
  });
}

export function evaluatePreproductionGates(payloadInput: unknown, dependencies: ArtifactDependency[]): GateResult[] {
  const payload = PreproductionPayloadSchema.parse(payloadInput);
  const policyPassed = policyCurrent(payload);
  const timingPassed = timingCurrent(payload);
  const mediaPassed = mediaReadinessCurrent(payload, dependencies);
  return [
    gate(
      'preproduction_policy',
      policyPassed,
      policyPassed
        ? 'No simulated contributor, cloned voice, synthetic voice or generated documentary treatment is authorised.'
        : 'Simulated contributors, cloned or synthetic voice, generated documentary treatment, or undisclosed illustrative generation are blocked.',
    ),
    gate(
      'timing_valid',
      timingPassed,
      timingPassed ? 'Timed segments are ordered and match the declared duration.' : 'Timed segments overlap, leave an invalid boundary or do not match the declared duration.',
    ),
    gate(
      'media_render_ready',
      mediaPassed && payload.boundary.mediaStatus === 'ready',
      mediaPassed && payload.boundary.mediaStatus === 'ready'
        ? 'Every assigned medium has matching rights, releases and required disclosure.'
        : payload.boundary.mediaStatus === 'unassigned' && mediaPassed
          ? 'Text pre-production is reviewable; media and render readiness remain deliberately unassigned.'
          : 'Media or render readiness lacks exact rights, releases, approval or disclosure.',
      payload.boundary.mediaStatus === 'ready',
    ),
  ];
}
