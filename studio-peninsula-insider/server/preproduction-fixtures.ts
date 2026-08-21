import {
  FoundryRunSchema,
  RecipeDefinitionSchema,
  type ArtifactDependency,
  type ArtifactVersion,
  type Claim,
  type FoundryRun,
  type RecipeDefinition,
} from '../shared/contracts.js';
import {
  PreproductionPayloadSchema,
  requiredPreproductionLineagePaths,
  type PreproductionArtifactType,
  type PreproductionPayload,
  type ProductionBoundary,
} from '../shared/preproduction-contracts.js';
import {
  angleDependency,
  bindClaimUsage,
  claimSetDependency,
  evaluateArtifactGates,
  fixtureSource,
  hash,
  withArtifactHash,
} from './fixture-runner.js';
import { withFixtureOriginAuthority } from './origin-authority.js';
import { evaluatePreproductionGates } from './preproduction-policy.js';

export const EXPLAINER_FIXTURE_ID = 'red-hill-explainer-preproduction';
export const PODCAST_FIXTURE_ID = 'red-hill-podcast-preproduction';
export const SHORT_VIDEO_FIXTURE_ID = 'red-hill-short-video-preproduction';

export const EXPLAINER_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1', id: 'explainer_preproduction_v1', version: 1,
  label: 'Explainer pre-production', sourceKinds: ['url'], textOnlyAllowed: true, externalCalls: false,
  artifacts: [
    { key: 'explainer-core', type: 'explainer_core', required: true, dependsOnKeys: [], targetContract: 'foundry.explainer-core.v1' },
    { key: 'explainer-faq', type: 'explainer_faq', required: true, dependsOnKeys: ['explainer-core'], targetContract: 'foundry.explainer-faq.v1' },
    { key: 'explainer-carousel', type: 'explainer_carousel', required: false, dependsOnKeys: ['explainer-core'], targetContract: 'foundry.explainer-carousel.v1' },
    { key: 'explainer-voiceover', type: 'explainer_voiceover', required: true, dependsOnKeys: ['explainer-core'], targetContract: 'foundry.explainer-voiceover.v1' },
    { key: 'explainer-visualisation', type: 'explainer_visualisation', required: false, dependsOnKeys: ['explainer-core'], targetContract: 'foundry.explainer-visualisation.v1' },
  ],
});

export const PODCAST_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1', id: 'podcast_preproduction_v1', version: 1,
  label: 'Podcast pre-production', sourceKinds: ['url'], textOnlyAllowed: true, externalCalls: false,
  artifacts: [
    { key: 'podcast-evidence', type: 'podcast_evidence_dossier', required: true, dependsOnKeys: [], targetContract: 'foundry.podcast-evidence.v1' },
    { key: 'podcast-angle', type: 'podcast_angle', required: true, dependsOnKeys: ['podcast-evidence'], targetContract: 'foundry.podcast-angle.v1' },
    { key: 'podcast-run-sheet', type: 'podcast_run_sheet', required: true, dependsOnKeys: ['podcast-angle'], targetContract: 'foundry.podcast-run-sheet.v1' },
    { key: 'podcast-interview-guide', type: 'podcast_interview_guide', required: true, dependsOnKeys: ['podcast-angle'], targetContract: 'foundry.podcast-interview-guide.v1' },
    { key: 'podcast-script', type: 'podcast_script', required: true, dependsOnKeys: ['podcast-run-sheet'], targetContract: 'foundry.podcast-script.v1' },
    { key: 'podcast-show-notes', type: 'podcast_show_notes', required: false, dependsOnKeys: ['podcast-script'], targetContract: 'foundry.podcast-show-notes.v1' },
    { key: 'podcast-chapters', type: 'podcast_chapters', required: false, dependsOnKeys: ['podcast-script'], targetContract: 'foundry.podcast-chapters.v1' },
  ],
});

export const SHORT_VIDEO_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1', id: 'short_video_preproduction_v1', version: 1,
  label: 'Short-video pre-production', sourceKinds: ['url'], textOnlyAllowed: true, externalCalls: false,
  artifacts: [
    { key: 'video-hooks', type: 'video_hooks', required: true, dependsOnKeys: [], targetContract: 'foundry.video-hooks.v1' },
    { key: 'video-script-30', type: 'video_script', required: true, dependsOnKeys: ['video-hooks'], targetContract: 'foundry.video-script-30.v1' },
    { key: 'video-script-60', type: 'video_script', required: true, dependsOnKeys: ['video-hooks'], targetContract: 'foundry.video-script-60.v1' },
    { key: 'video-shot-list', type: 'video_shot_list', required: true, dependsOnKeys: ['video-script-60'], targetContract: 'foundry.video-shot-list.v1' },
    { key: 'video-scenes', type: 'video_scenes', required: true, dependsOnKeys: ['video-script-60'], targetContract: 'foundry.video-scenes.v1' },
    { key: 'video-overlays', type: 'video_overlays', required: true, dependsOnKeys: ['video-script-60'], targetContract: 'foundry.video-overlays.v1' },
    { key: 'video-subtitles', type: 'video_subtitles', required: true, dependsOnKeys: ['video-script-30'], targetContract: 'foundry.video-subtitles.v1' },
    { key: 'video-thumbnail', type: 'video_thumbnail', required: false, dependsOnKeys: ['video-scenes'], targetContract: 'foundry.video-thumbnail.v1' },
    { key: 'video-platform-captions', type: 'video_platform_captions', required: false, dependsOnKeys: ['video-script-30'], targetContract: 'foundry.video-platform-captions.v1' },
  ],
});

const boundary = (): ProductionBoundary => ({
  stage: 'text_preproduction', mediaStatus: 'unassigned', rightsSnapshots: [], mediaAssignments: [], recognisablePeople: false,
  releaseIds: [], voiceMode: 'human_unassigned', generationMode: 'none',
});

type UsageSeed = { segmentId: string; path: string; claimIds: string[] };

function makeArtifact(
  type: PreproductionArtifactType,
  key: string,
  payloadInput: unknown,
  usageSeeds: UsageSeed[],
  dependencies: ArtifactDependency[],
  claims: Claim[],
  asOf: string,
): ArtifactVersion {
  const payload = PreproductionPayloadSchema.parse(payloadInput);
  if (payload.kind !== type) throw new Error(`Fixture payload ${payload.kind} does not match ${type}`);
  const titleClaimIds = [...new Set(usageSeeds.flatMap((usage) => usage.claimIds))];
  const titleBoundSeeds = usageSeeds.some((usage) => usage.path === '$.title')
    ? usageSeeds
    : [{ segmentId: `${key}-title`, path: '$.title', claimIds: titleClaimIds }, ...usageSeeds];
  const allUsageSeeds = requiredPreproductionLineagePaths(payload).reduce<UsageSeed[]>((seeds, path) => {
    if (seeds.some((usage) => usage.path === path)) return seeds;
    const container = path.replace(/\.[A-Za-z][A-Za-z0-9]*$/, '');
    const related = seeds.filter((usage) => usage.path.startsWith(`${container}.`));
    const claimIds = [...new Set((related.length > 0 ? related : seeds).flatMap((usage) => usage.claimIds))];
    return [...seeds, {
      segmentId: `${key}-lineage-${path.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      path,
      claimIds,
    }];
  }, titleBoundSeeds);
  const claimUsage = bindClaimUsage(payload, allUsageSeeds);
  return withArtifactHash({
    id: `artifact-${key}-red-hill`, key, version: 1, type,
    angleId: 'angle-rainy-lunch', angleVersion: 1,
    factualSegmentIds: allUsageSeeds.map((usage) => usage.segmentId), claimUsage, dependencies, payload,
    gateResults: [
      ...evaluateArtifactGates(payload, claims, allUsageSeeds.map((usage) => usage.segmentId), claimUsage, asOf, undefined, type),
      ...evaluatePreproductionGates(payload, dependencies),
    ],
  }, claims);
}

const artifactDependency = (artifact: ArtifactVersion): ArtifactDependency => ({
  kind: 'artifact', id: artifact.id, version: artifact.version, contentHash: artifact.contentHash,
});

function buildExplainer(claims: Claim[], dependencies: ArtifactDependency[], capturedAt: string): ArtifactVersion[] {
  const core = makeArtifact('explainer_core', 'explainer-core', {
    kind: 'explainer_core', title: 'Why covered dining matters on a wet Peninsula day',
    thesis: 'A covered Red Hill lunch can anchor a rainy-day plan.',
    sections: [
      { id: 'core-location', text: 'The venue is in Red Hill.' },
      { id: 'core-service', text: 'The winter lunch is listed for Saturday 29 August, with booking required.' },
      { id: 'core-weather', text: 'The covered dining room suits a wet-weather lunch.' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'core-thesis', path: '$.thesis', claimIds: ['claim-location', 'claim-observation'] },
    { segmentId: 'core-location', path: '$.sections[0].text', claimIds: ['claim-location'] },
    { segmentId: 'core-service', path: '$.sections[1].text', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'core-weather', path: '$.sections[2].text', claimIds: ['claim-observation'] },
  ], dependencies, claims, capturedAt);
  const upstream = [...dependencies, artifactDependency(core)];
  const faq = makeArtifact('explainer_faq', 'explainer-faq', {
    kind: 'explainer_faq', title: 'Wet-weather lunch questions', items: [
      { id: 'faq-when', question: 'When is the winter lunch listed?', answer: 'Saturday 29 August, with booking required.' },
      { id: 'faq-why', question: 'Why does it work in wet weather?', answer: 'The dining room is covered.' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'faq-when', path: '$.items[0].answer', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'faq-why', path: '$.items[1].answer', claimIds: ['claim-observation'] },
  ], upstream, claims, capturedAt);
  const carousel = makeArtifact('explainer_carousel', 'explainer-carousel', {
    kind: 'explainer_carousel', title: 'A rainy-day Red Hill anchor', slides: [
      { id: 'slide-1', headline: 'Start in Red Hill', body: 'The venue is in Red Hill.' },
      { id: 'slide-2', headline: 'Stay under cover', body: 'The dining room is covered.' },
      { id: 'slide-3', headline: 'Book the listed lunch', body: 'The winter lunch is listed for Saturday 29 August, with booking required.' },
    ], boundary: boundary(),
  }, [0, 1, 2].map((index) => ({
    segmentId: `slide-${index + 1}`, path: `$.slides[${index}].body`,
    claimIds: index === 0 ? ['claim-location'] : index === 1 ? ['claim-observation'] : ['claim-date', 'claim-booking'],
  })).flatMap((bodyUsage, index) => [
    { segmentId: `slide-${index + 1}-headline`, path: `$.slides[${index}].headline`, claimIds: bodyUsage.claimIds },
    bodyUsage,
  ]), upstream, claims, capturedAt);
  const voiceover = makeArtifact('explainer_voiceover', 'explainer-voiceover', {
    kind: 'explainer_voiceover', title: 'Wet-weather explainer voiceover', targetDurationMs: 60_000,
    segments: [
      { id: 'voice-1', text: 'A rainy Peninsula day does not have to stop in Red Hill.', durationMs: 20_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'voice-2', text: 'This covered dining room gives lunch a practical indoor anchor.', durationMs: 20_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'voice-3', text: 'The winter lunch is listed for Saturday 29 August, with booking required.', durationMs: 20_000, contentMode: 'editorial_narration', speaker: 'host' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'voice-1', path: '$.segments[0].text', claimIds: ['claim-location'] },
    { segmentId: 'voice-2', path: '$.segments[1].text', claimIds: ['claim-observation'] },
    { segmentId: 'voice-3', path: '$.segments[2].text', claimIds: ['claim-date', 'claim-booking'] },
  ], upstream, claims, capturedAt);
  const visualisation = makeArtifact('explainer_visualisation', 'explainer-visualisation', {
    kind: 'explainer_visualisation', title: 'Red Hill rainy-day sequence', chartType: 'timeline',
    points: [
      { id: 'point-place', label: 'Place', valueText: 'Red Hill' },
      { id: 'point-date', label: 'Listed service', valueText: 'Saturday 29 August' },
      { id: 'point-booking', label: 'Planning note', valueText: 'Booking required' },
    ], sourceNote: 'Fixture claim set only.', boundary: boundary(),
  }, [
    { segmentId: 'point-place', path: '$.points[0].valueText', claimIds: ['claim-location'] },
    { segmentId: 'point-date', path: '$.points[1].valueText', claimIds: ['claim-date'] },
    { segmentId: 'point-booking', path: '$.points[2].valueText', claimIds: ['claim-booking'] },
  ], upstream, claims, capturedAt);
  return [core, faq, carousel, voiceover, visualisation];
}

function buildPodcast(claims: Claim[], dependencies: ArtifactDependency[], capturedAt: string): ArtifactVersion[] {
  const evidence = makeArtifact('podcast_evidence_dossier', 'podcast-evidence', {
    kind: 'podcast_evidence_dossier', title: 'Red Hill wet-weather evidence', evidenceItems: [
      { id: 'evidence-place', text: 'The venue is in Red Hill.' },
      { id: 'evidence-service', text: 'The winter lunch is listed for Saturday 29 August, with booking required.' },
      { id: 'evidence-observation', text: 'The covered dining room suits a wet-weather lunch.' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'evidence-place', path: '$.evidenceItems[0].text', claimIds: ['claim-location'] },
    { segmentId: 'evidence-service', path: '$.evidenceItems[1].text', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'evidence-observation', path: '$.evidenceItems[2].text', claimIds: ['claim-observation'] },
  ], dependencies, claims, capturedAt);
  const angle = makeArtifact('podcast_angle', 'podcast-angle', {
    kind: 'podcast_angle', title: 'A practical rainy-day lunch', promise: 'Explain how covered dining can anchor a wet Red Hill day.',
    audience: 'Peninsula visitors and locals planning around rain.', avoidClaims: ['Do not claim this is the best lunch.'], boundary: boundary(),
  }, [{ segmentId: 'angle-promise', path: '$.promise', claimIds: ['claim-location', 'claim-observation'] }],
  [...dependencies, artifactDependency(evidence)], claims, capturedAt);
  const angleUpstream = [...dependencies, artifactDependency(angle)];
  const runSheet = makeArtifact('podcast_run_sheet', 'podcast-run-sheet', {
    kind: 'podcast_run_sheet', title: 'Three-minute fixture run sheet', targetDurationMs: 180_000, segments: [
      { id: 'run-1', title: 'Set-up', text: 'Locate the lunch in Red Hill.', startMs: 0, endMs: 60_000 },
      { id: 'run-2', title: 'Evidence', text: 'Explain the covered dining observation.', startMs: 60_000, endMs: 120_000 },
      { id: 'run-3', title: 'Service note', text: 'State the listed date and booking requirement.', startMs: 120_000, endMs: 180_000 },
    ], boundary: boundary(),
  }, [
    { segmentId: 'run-1', path: '$.segments[0].text', claimIds: ['claim-location'] },
    { segmentId: 'run-2', path: '$.segments[1].text', claimIds: ['claim-observation'] },
    { segmentId: 'run-3', path: '$.segments[2].text', claimIds: ['claim-date', 'claim-booking'] },
  ], angleUpstream, claims, capturedAt);
  const guide = makeArtifact('podcast_interview_guide', 'podcast-interview-guide', {
    kind: 'podcast_interview_guide', title: 'Interview guide', questions: [
      { id: 'question-cover', prompt: 'How does the covered dining room change a rainy-day visit?', rationale: 'The source observation identifies covered dining.' },
      { id: 'question-booking', prompt: 'What should a guest confirm before visiting?', rationale: 'The listed winter lunch requires booking.' },
    ], prohibitedPrompts: ['Do not ask a contributor to repeat unverified superlatives.'], boundary: boundary(),
  }, [
    { segmentId: 'question-cover', path: '$.questions[0].rationale', claimIds: ['claim-observation'] },
    { segmentId: 'question-booking', path: '$.questions[1].rationale', claimIds: ['claim-booking'] },
  ], angleUpstream, claims, capturedAt);
  const script = makeArtifact('podcast_script', 'podcast-script', {
    kind: 'podcast_script', title: 'Three-minute host script', targetDurationMs: 180_000, segments: [
      { id: 'podcast-1', text: 'Today we are in Red Hill, planning lunch around a wet Peninsula day.', durationMs: 60_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'podcast-2', text: 'The covered dining room gives the visit a practical indoor anchor.', durationMs: 60_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'podcast-3', text: 'The winter lunch is listed for Saturday 29 August, with booking required.', durationMs: 60_000, contentMode: 'editorial_narration', speaker: 'host' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'podcast-1', path: '$.segments[0].text', claimIds: ['claim-location'] },
    { segmentId: 'podcast-2', path: '$.segments[1].text', claimIds: ['claim-observation'] },
    { segmentId: 'podcast-3', path: '$.segments[2].text', claimIds: ['claim-date', 'claim-booking'] },
  ], [...dependencies, artifactDependency(evidence), artifactDependency(runSheet)], claims, capturedAt);
  const scriptUpstream = [...dependencies, artifactDependency(script)];
  const showNotes = makeArtifact('podcast_show_notes', 'podcast-show-notes', {
    kind: 'podcast_show_notes', title: 'Provisional show notes', summary: 'A Red Hill wet-weather lunch plan based on a covered dining room and a listed Saturday service.',
    bullets: [{ id: 'note-date', text: 'Listed for Saturday 29 August.' }, { id: 'note-booking', text: 'Booking is required.' }], provisional: true, boundary: boundary(),
  }, [
    { segmentId: 'notes-summary', path: '$.summary', claimIds: ['claim-location', 'claim-date', 'claim-observation'] },
    { segmentId: 'note-date', path: '$.bullets[0].text', claimIds: ['claim-date'] },
    { segmentId: 'note-booking', path: '$.bullets[1].text', claimIds: ['claim-booking'] },
  ], scriptUpstream, claims, capturedAt);
  const chapters = makeArtifact('podcast_chapters', 'podcast-chapters', {
    kind: 'podcast_chapters', title: 'Provisional chapters', targetDurationMs: 180_000, provisional: true, items: [
      { id: 'chapter-1', title: 'Red Hill', text: 'Place and rainy-day framing.', startMs: 0, endMs: 60_000 },
      { id: 'chapter-2', title: 'Covered dining', text: 'The covered-room observation.', startMs: 60_000, endMs: 120_000 },
      { id: 'chapter-3', title: 'Service details', text: 'The listed date and booking requirement.', startMs: 120_000, endMs: 180_000 },
    ], boundary: boundary(),
  }, [
    { segmentId: 'chapter-1', path: '$.items[0].text', claimIds: ['claim-location'] },
    { segmentId: 'chapter-2', path: '$.items[1].text', claimIds: ['claim-observation'] },
    { segmentId: 'chapter-3', path: '$.items[2].text', claimIds: ['claim-date', 'claim-booking'] },
  ], scriptUpstream, claims, capturedAt);
  return [evidence, angle, runSheet, guide, script, showNotes, chapters];
}

function buildVideo(claims: Claim[], dependencies: ArtifactDependency[], capturedAt: string): ArtifactVersion[] {
  const hooks = makeArtifact('video_hooks', 'video-hooks', {
    kind: 'video_hooks', title: 'Short-video hooks', variants: [
      { id: 'hook-1', text: 'Rain in Red Hill? Start with a covered lunch.', durationMs: 3_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'hook-2', text: 'This covered dining room can anchor a wet Peninsula day.', durationMs: 3_000, contentMode: 'editorial_narration', speaker: 'host' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'hook-1', path: '$.variants[0].text', claimIds: ['claim-location', 'claim-observation'] },
    { segmentId: 'hook-2', path: '$.variants[1].text', claimIds: ['claim-observation'] },
  ], dependencies, claims, capturedAt);
  const hooksUpstream = [...dependencies, artifactDependency(hooks)];
  const script30 = makeArtifact('video_script', 'video-script-30', {
    kind: 'video_script', title: '30-second script', targetSeconds: 30, segments: [
      { id: 'script30-1', text: 'Rain in Red Hill? Start with a covered lunch.', durationMs: 10_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'script30-2', text: 'The covered dining room gives the day an indoor anchor.', durationMs: 10_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'script30-3', text: 'The winter lunch is listed for Saturday 29 August, with booking required.', durationMs: 10_000, contentMode: 'editorial_narration', speaker: 'host' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'script30-1', path: '$.segments[0].text', claimIds: ['claim-location'] },
    { segmentId: 'script30-2', path: '$.segments[1].text', claimIds: ['claim-observation'] },
    { segmentId: 'script30-3', path: '$.segments[2].text', claimIds: ['claim-date', 'claim-booking'] },
  ], hooksUpstream, claims, capturedAt);
  const script60 = makeArtifact('video_script', 'video-script-60', {
    kind: 'video_script', title: '60-second script', targetSeconds: 60, segments: [
      { id: 'script60-1', text: 'A wet Peninsula day can still have a useful Red Hill anchor.', durationMs: 20_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'script60-2', text: 'The dining room is covered, which suits a rainy-day lunch.', durationMs: 20_000, contentMode: 'editorial_narration', speaker: 'host' },
      { id: 'script60-3', text: 'The winter lunch is listed for Saturday 29 August, with booking required.', durationMs: 20_000, contentMode: 'editorial_narration', speaker: 'host' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'script60-1', path: '$.segments[0].text', claimIds: ['claim-location'] },
    { segmentId: 'script60-2', path: '$.segments[1].text', claimIds: ['claim-observation'] },
    { segmentId: 'script60-3', path: '$.segments[2].text', claimIds: ['claim-date', 'claim-booking'] },
  ], hooksUpstream, claims, capturedAt);
  const script60Upstream = [...dependencies, artifactDependency(script60)];
  const shots = makeArtifact('video_shot_list', 'video-shot-list', {
    kind: 'video_shot_list', title: 'Unassigned shot list', targetDurationMs: 60_000, shots: [
      { id: 'shot-1', description: 'Establish Red Hill without implying current conditions.', durationMs: 20_000, source: 'unassigned' },
      { id: 'shot-2', description: 'Show the covered dining observation only after rights clearance.', durationMs: 20_000, source: 'unassigned' },
      { id: 'shot-3', description: 'Use a text card for the listed date and booking requirement.', durationMs: 20_000, source: 'unassigned' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'shot-1', path: '$.shots[0].description', claimIds: ['claim-location'] },
    { segmentId: 'shot-2', path: '$.shots[1].description', claimIds: ['claim-observation'] },
    { segmentId: 'shot-3', path: '$.shots[2].description', claimIds: ['claim-date', 'claim-booking'] },
  ], script60Upstream, claims, capturedAt);
  const scenes = makeArtifact('video_scenes', 'video-scenes', {
    kind: 'video_scenes', title: 'Scene manifest', targetDurationMs: 60_000, scenes: [
      { id: 'scene-1', title: 'Red Hill', text: 'Red Hill location card.', startMs: 0, endMs: 20_000, treatment: 'text_only' },
      { id: 'scene-2', title: 'Under cover', text: 'Covered dining observation card.', startMs: 20_000, endMs: 40_000, treatment: 'text_only' },
      { id: 'scene-3', title: 'Plan ahead', text: 'Saturday 29 August and booking-required card.', startMs: 40_000, endMs: 60_000, treatment: 'text_only' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'scene-1', path: '$.scenes[0].text', claimIds: ['claim-location'] },
    { segmentId: 'scene-2', path: '$.scenes[1].text', claimIds: ['claim-observation'] },
    { segmentId: 'scene-3', path: '$.scenes[2].text', claimIds: ['claim-date', 'claim-booking'] },
  ], script60Upstream, claims, capturedAt);
  const overlays = makeArtifact('video_overlays', 'video-overlays', {
    kind: 'video_overlays', title: 'Overlay ledger', targetDurationMs: 60_000, items: [
      { id: 'overlay-1', title: 'Location', text: 'Red Hill', startMs: 0, endMs: 8_000 },
      { id: 'overlay-2', title: 'Service', text: 'Saturday 29 August', startMs: 24_000, endMs: 34_000 },
      { id: 'overlay-3', title: 'Planning', text: 'Booking required', startMs: 44_000, endMs: 54_000 },
    ], boundary: boundary(),
  }, [
    { segmentId: 'overlay-1', path: '$.items[0].text', claimIds: ['claim-location'] },
    { segmentId: 'overlay-2', path: '$.items[1].text', claimIds: ['claim-date'] },
    { segmentId: 'overlay-3', path: '$.items[2].text', claimIds: ['claim-booking'] },
  ], script60Upstream, claims, capturedAt);
  const script30Upstream = [...dependencies, artifactDependency(script30)];
  const subtitles = makeArtifact('video_subtitles', 'video-subtitles', {
    kind: 'video_subtitles', title: '30-second subtitles', language: 'en-AU', targetDurationMs: 30_000, cues: [
      { id: 'subtitle-1', title: 'Hook', text: 'Rain in Red Hill? Start with a covered lunch.', startMs: 0, endMs: 10_000 },
      { id: 'subtitle-2', title: 'Reason', text: 'The covered dining room gives the day an indoor anchor.', startMs: 10_000, endMs: 20_000 },
      { id: 'subtitle-3', title: 'Service', text: 'Saturday 29 August. Booking required.', startMs: 20_000, endMs: 30_000 },
    ], boundary: boundary(),
  }, [
    { segmentId: 'subtitle-1', path: '$.cues[0].text', claimIds: ['claim-location'] },
    { segmentId: 'subtitle-2', path: '$.cues[1].text', claimIds: ['claim-observation'] },
    { segmentId: 'subtitle-3', path: '$.cues[2].text', claimIds: ['claim-date', 'claim-booking'] },
  ], script30Upstream, claims, capturedAt);
  const thumbnail = makeArtifact('video_thumbnail', 'video-thumbnail', {
    kind: 'video_thumbnail', title: 'Thumbnail copy', variants: [
      { id: 'thumbnail-1', headline: 'A rainy-day Red Hill lunch', visualBrief: 'Use a text-led Red Hill treatment until rights-cleared media is assigned.' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'thumbnail-1-headline', path: '$.variants[0].headline', claimIds: ['claim-location', 'claim-observation'] },
    { segmentId: 'thumbnail-1-brief', path: '$.variants[0].visualBrief', claimIds: ['claim-location'] },
  ],
  [...dependencies, artifactDependency(scenes)], claims, capturedAt);
  const captions = makeArtifact('video_platform_captions', 'video-platform-captions', {
    kind: 'video_platform_captions', title: 'Platform caption drafts', items: [
      { id: 'caption-instagram', platform: 'instagram_reel', caption: 'A covered dining room can anchor a rainy Red Hill lunch. The winter lunch is listed for Saturday 29 August, with booking required.' },
      { id: 'caption-facebook', platform: 'facebook_reel', caption: 'Plan a wet-weather Red Hill lunch around covered dining and a listed Saturday service.' },
      { id: 'caption-linkedin', platform: 'linkedin_video', caption: 'A covered Red Hill dining room gives a wet Peninsula day a practical lunch anchor.' },
    ], boundary: boundary(),
  }, [
    { segmentId: 'caption-instagram', path: '$.items[0].caption', claimIds: ['claim-location', 'claim-date', 'claim-booking', 'claim-observation'] },
    { segmentId: 'caption-facebook', path: '$.items[1].caption', claimIds: ['claim-location', 'claim-date', 'claim-observation'] },
    { segmentId: 'caption-linkedin', path: '$.items[2].caption', claimIds: ['claim-location', 'claim-observation'] },
  ], script30Upstream, claims, capturedAt);
  return [hooks, script30, script60, shots, scenes, overlays, subtitles, thumbnail, captions];
}

export type PreproductionFamily = 'explainer' | 'podcast' | 'short_video';

export function runPreproductionFixture(
  family: PreproductionFamily,
  actor: string,
  idempotencyKey: string,
  options: { failOptionalDerivative?: boolean } = {},
): FoundryRun {
  const { capturedAt, claims, claimSet, bundle, angle } = fixtureSource(actor);
  const dependencies: ArtifactDependency[] = [claimSetDependency(claimSet), angleDependency(angle)];
  const recipe = family === 'explainer' ? EXPLAINER_RECIPE : family === 'podcast' ? PODCAST_RECIPE : SHORT_VIDEO_RECIPE;
  const fixtureId = family === 'explainer' ? EXPLAINER_FIXTURE_ID : family === 'podcast' ? PODCAST_FIXTURE_ID : SHORT_VIDEO_FIXTURE_ID;
  let completed = family === 'explainer'
    ? buildExplainer(claims, dependencies, capturedAt)
    : family === 'podcast'
      ? buildPodcast(claims, dependencies, capturedAt)
      : buildVideo(claims, dependencies, capturedAt);
  const failed = [];
  if (options.failOptionalDerivative) {
    const failedType = family === 'explainer' ? 'explainer_visualisation' : family === 'podcast' ? 'podcast_show_notes' : 'video_platform_captions';
    const failedArtifact = completed.find((artifact) => artifact.type === failedType);
    if (!failedArtifact) throw new Error(`Optional fixture derivative ${failedType} missing`);
    completed = completed.filter((artifact) => artifact.id !== failedArtifact.id);
    failed.push({
      key: failedArtifact.key, type: failedArtifact.type, required: false as const, code: 'fixture_derivative_failure' as const,
      detail: 'The deterministic optional derivative failed without invalidating its completed siblings.', attemptedAt: capturedAt,
    });
  }
  return FoundryRunSchema.parse(withFixtureOriginAuthority({
    schemaVersion: 'pi.foundry-run.v3', id: `run-${hash(idempotencyKey).slice(0, 12)}`, idempotencyKey, version: 1,
    status: 'ready_for_review', createdAt: capturedAt, updatedAt: capturedAt,
    evaluationAsOf: capturedAt,
    bundle: { ...bundle, id: `bundle-${fixtureId}`, title: `${recipe.label} fixture` }, recipe, claimSet, angle,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v2', id: `pack-${hash(idempotencyKey).slice(0, 12)}`, version: 1,
      recipeId: recipe.id, recipeVersion: recipe.version, claimSetRef: claimSetDependency(claimSet),
      angleRef: { id: angle.id, version: angle.version }, status: failed.length ? 'partial' : 'complete',
      completed, failed, omitted: [], reviews: [],
    },
    blockers: [],
    audit: [{ at: capturedAt, actor, type: 'fixture_run_created', detail: `${recipe.label} reached text review without recording, rendering or external calls.` }],
  }));
}
