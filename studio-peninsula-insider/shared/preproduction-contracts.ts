import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const PreproductionArtifactTypeSchema = z.enum([
  'explainer_core',
  'explainer_faq',
  'explainer_carousel',
  'explainer_voiceover',
  'explainer_visualisation',
  'podcast_evidence_dossier',
  'podcast_angle',
  'podcast_run_sheet',
  'podcast_interview_guide',
  'podcast_script',
  'podcast_show_notes',
  'podcast_chapters',
  'video_hooks',
  'video_script',
  'video_shot_list',
  'video_scenes',
  'video_overlays',
  'video_subtitles',
  'video_thumbnail',
  'video_platform_captions',
]);

export const RightsSnapshotSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  contentHash: Sha256Schema,
});

export const MediaAssignmentSchema = z.object({
  id: z.string().min(1),
  placementPath: z.string().regex(/^\$\.(?:[A-Za-z][A-Za-z0-9]*)(?:\[\d+\])?(?:\.[A-Za-z][A-Za-z0-9]*)?$/),
  surface: z.enum(['audio', 'image', 'video', 'illustration']),
  asset: z.object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  rights: z.object({ id: z.string().min(1), version: z.number().int().positive() }),
  recognisablePeople: z.boolean().default(false),
  releaseIds: z.array(z.string().min(1)).default([]),
});

export const ProductionBoundarySchema = z.object({
  stage: z.literal('text_preproduction'),
  mediaStatus: z.enum(['unassigned', 'ready']),
  rightsSnapshots: z.array(RightsSnapshotSchema).default([]),
  mediaAssignments: z.array(MediaAssignmentSchema).default([]),
  recognisablePeople: z.boolean().default(false),
  releaseIds: z.array(z.string().min(1)).default([]),
  voiceMode: z.enum(['human_unassigned', 'human_cleared', 'synthetic', 'cloned']).default('human_unassigned'),
  voiceReleaseId: z.string().min(1).optional(),
  generationMode: z.enum(['none', 'illustrative', 'documentary']).default('none'),
  generationApprovalId: z.string().min(1).optional(),
  generationDisclosure: z.string().min(1).optional(),
});

const TextSegmentSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const SpokenSegmentSchema = TextSegmentSchema.extend({
  durationMs: z.number().int().positive(),
  contentMode: z.enum(['editorial_narration', 'source_quote', 'simulated_contributor']).default('editorial_narration'),
  speaker: z.string().min(1).default('host'),
});

const TimedSegmentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
});

const Boundary = { boundary: ProductionBoundarySchema };

export const ExplainerCorePayloadSchema = z.object({
  kind: z.literal('explainer_core'), title: z.string().min(1), thesis: z.string().min(1), sections: z.array(TextSegmentSchema).min(1), ...Boundary,
});
export const ExplainerFaqPayloadSchema = z.object({
  kind: z.literal('explainer_faq'), title: z.string().min(1), items: z.array(z.object({ id: z.string().min(1), question: z.string().min(1), answer: z.string().min(1) })).min(1), ...Boundary,
});
export const ExplainerCarouselPayloadSchema = z.object({
  kind: z.literal('explainer_carousel'), title: z.string().min(1), slides: z.array(z.object({ id: z.string().min(1), headline: z.string().min(1), body: z.string().min(1) })).min(2), ...Boundary,
});
export const ExplainerVoiceoverPayloadSchema = z.object({
  kind: z.literal('explainer_voiceover'), title: z.string().min(1), targetDurationMs: z.number().int().positive(), segments: z.array(SpokenSegmentSchema).min(1), ...Boundary,
});
export const ExplainerVisualisationPayloadSchema = z.object({
  kind: z.literal('explainer_visualisation'), title: z.string().min(1), chartType: z.enum(['timeline', 'comparison', 'map', 'stat_card']), points: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), valueText: z.string().min(1) })).min(1), sourceNote: z.string().min(1), ...Boundary,
});

export const PodcastEvidenceDossierPayloadSchema = z.object({
  kind: z.literal('podcast_evidence_dossier'), title: z.string().min(1), evidenceItems: z.array(TextSegmentSchema).min(1), ...Boundary,
});
export const PodcastAnglePayloadSchema = z.object({
  kind: z.literal('podcast_angle'), title: z.string().min(1), promise: z.string().min(1), audience: z.string().min(1), avoidClaims: z.array(z.string()).default([]), ...Boundary,
});
export const PodcastRunSheetPayloadSchema = z.object({
  kind: z.literal('podcast_run_sheet'), title: z.string().min(1), targetDurationMs: z.number().int().positive(), segments: z.array(TimedSegmentSchema).min(1), ...Boundary,
});
export const PodcastInterviewGuidePayloadSchema = z.object({
  kind: z.literal('podcast_interview_guide'), title: z.string().min(1), questions: z.array(z.object({ id: z.string().min(1), prompt: z.string().min(1), rationale: z.string().min(1) })).min(1), prohibitedPrompts: z.array(z.string()).default([]), ...Boundary,
});
export const PodcastScriptPayloadSchema = z.object({
  kind: z.literal('podcast_script'), title: z.string().min(1), targetDurationMs: z.number().int().positive(), segments: z.array(SpokenSegmentSchema).min(1), ...Boundary,
});
export const PodcastShowNotesPayloadSchema = z.object({
  kind: z.literal('podcast_show_notes'), title: z.string().min(1), summary: z.string().min(1), bullets: z.array(TextSegmentSchema).min(1), provisional: z.literal(true), ...Boundary,
});
export const PodcastChaptersPayloadSchema = z.object({
  kind: z.literal('podcast_chapters'), title: z.string().min(1), targetDurationMs: z.number().int().positive(), items: z.array(TimedSegmentSchema).min(1), provisional: z.literal(true), ...Boundary,
});

export const VideoHooksPayloadSchema = z.object({
  kind: z.literal('video_hooks'), title: z.string().min(1), variants: z.array(SpokenSegmentSchema).min(2), ...Boundary,
});
export const VideoScriptPayloadSchema = z.object({
  kind: z.literal('video_script'), title: z.string().min(1), targetSeconds: z.union([z.literal(30), z.literal(60)]), segments: z.array(SpokenSegmentSchema).min(1), ...Boundary,
});
export const VideoShotListPayloadSchema = z.object({
  kind: z.literal('video_shot_list'), title: z.string().min(1), targetDurationMs: z.number().int().positive(), shots: z.array(z.object({ id: z.string().min(1), description: z.string().min(1), durationMs: z.number().int().positive(), source: z.enum(['unassigned', 'rights_cleared', 'approved_illustrative']) })).min(1), ...Boundary,
});
export const VideoScenesPayloadSchema = z.object({
  kind: z.literal('video_scenes'), title: z.string().min(1), targetDurationMs: z.number().int().positive(), scenes: z.array(TimedSegmentSchema.extend({ treatment: z.enum(['documentary', 'illustrative', 'text_only']) })).min(1), ...Boundary,
});
export const VideoOverlaysPayloadSchema = z.object({
  kind: z.literal('video_overlays'), title: z.string().min(1), targetDurationMs: z.number().int().positive(), items: z.array(TimedSegmentSchema).min(1), ...Boundary,
});
export const VideoSubtitlesPayloadSchema = z.object({
  kind: z.literal('video_subtitles'), title: z.string().min(1), language: z.literal('en-AU'), targetDurationMs: z.number().int().positive(), cues: z.array(TimedSegmentSchema).min(1), ...Boundary,
});
export const VideoThumbnailPayloadSchema = z.object({
  kind: z.literal('video_thumbnail'), title: z.string().min(1), variants: z.array(z.object({ id: z.string().min(1), headline: z.string().min(1), visualBrief: z.string().min(1) })).min(1), ...Boundary,
});
export const VideoPlatformCaptionsPayloadSchema = z.object({
  kind: z.literal('video_platform_captions'), title: z.string().min(1), items: z.array(z.object({ id: z.string().min(1), platform: z.enum(['instagram', 'youtube', 'tiktok', 'linkedin']), caption: z.string().min(1) })).min(1), ...Boundary,
});

export const PreproductionPayloadSchema = z.discriminatedUnion('kind', [
  ExplainerCorePayloadSchema,
  ExplainerFaqPayloadSchema,
  ExplainerCarouselPayloadSchema,
  ExplainerVoiceoverPayloadSchema,
  ExplainerVisualisationPayloadSchema,
  PodcastEvidenceDossierPayloadSchema,
  PodcastAnglePayloadSchema,
  PodcastRunSheetPayloadSchema,
  PodcastInterviewGuidePayloadSchema,
  PodcastScriptPayloadSchema,
  PodcastShowNotesPayloadSchema,
  PodcastChaptersPayloadSchema,
  VideoHooksPayloadSchema,
  VideoScriptPayloadSchema,
  VideoShotListPayloadSchema,
  VideoScenesPayloadSchema,
  VideoOverlaysPayloadSchema,
  VideoSubtitlesPayloadSchema,
  VideoThumbnailPayloadSchema,
  VideoPlatformCaptionsPayloadSchema,
]);

export type PreproductionArtifactType = z.infer<typeof PreproductionArtifactTypeSchema>;
export type PreproductionPayload = z.infer<typeof PreproductionPayloadSchema>;
export type ProductionBoundary = z.infer<typeof ProductionBoundarySchema>;

export function isPreproductionArtifactType(value: string): value is PreproductionArtifactType {
  return PreproductionArtifactTypeSchema.safeParse(value).success;
}

export function parsePreproductionPayload(type: PreproductionArtifactType, payload: unknown): PreproductionPayload {
  const parsed = PreproductionPayloadSchema.parse(payload);
  if (parsed.kind !== type) throw new Error(`Artifact type ${type} does not match payload kind ${parsed.kind}`);
  return parsed;
}

export function requiredPreproductionLineagePaths(payload: PreproductionPayload): string[] {
  const paths = (() => {
    switch (payload.kind) {
    case 'explainer_core':
      return ['$.thesis', ...payload.sections.map((_, index) => `$.sections[${index}].text`)];
    case 'explainer_faq':
      return payload.items.flatMap((_, index) => [`$.items[${index}].question`, `$.items[${index}].answer`]);
    case 'explainer_carousel':
      return payload.slides.flatMap((_, index) => [`$.slides[${index}].headline`, `$.slides[${index}].body`]);
    case 'explainer_voiceover':
    case 'podcast_script':
    case 'video_script':
      return payload.segments.flatMap((_, index) => [`$.segments[${index}].text`, `$.segments[${index}].speaker`]);
    case 'explainer_visualisation':
      return [...payload.points.flatMap((_, index) => [`$.points[${index}].label`, `$.points[${index}].valueText`]), '$.sourceNote'];
    case 'podcast_evidence_dossier':
      return payload.evidenceItems.map((_, index) => `$.evidenceItems[${index}].text`);
    case 'podcast_angle':
      return ['$.promise', '$.audience', ...payload.avoidClaims.map((_, index) => `$.avoidClaims[${index}]`)];
    case 'podcast_run_sheet':
      return payload.segments.flatMap((_, index) => [`$.segments[${index}].title`, `$.segments[${index}].text`]);
    case 'podcast_interview_guide':
      return [
        ...payload.questions.flatMap((_, index) => [`$.questions[${index}].prompt`, `$.questions[${index}].rationale`]),
        ...payload.prohibitedPrompts.map((_, index) => `$.prohibitedPrompts[${index}]`),
      ];
    case 'podcast_show_notes':
      return ['$.summary', ...payload.bullets.map((_, index) => `$.bullets[${index}].text`)];
    case 'podcast_chapters':
      return payload.items.flatMap((_, index) => [`$.items[${index}].title`, `$.items[${index}].text`]);
    case 'video_hooks':
      return payload.variants.flatMap((_, index) => [`$.variants[${index}].text`, `$.variants[${index}].speaker`]);
    case 'video_shot_list':
      return payload.shots.map((_, index) => `$.shots[${index}].description`);
    case 'video_scenes':
      return payload.scenes.flatMap((_, index) => [`$.scenes[${index}].title`, `$.scenes[${index}].text`]);
    case 'video_overlays':
      return payload.items.flatMap((_, index) => [`$.items[${index}].title`, `$.items[${index}].text`]);
    case 'video_subtitles':
      return payload.cues.flatMap((_, index) => [`$.cues[${index}].title`, `$.cues[${index}].text`]);
    case 'video_thumbnail':
      return payload.variants.flatMap((_, index) => [`$.variants[${index}].headline`, `$.variants[${index}].visualBrief`]);
    case 'video_platform_captions':
      return payload.items.map((_, index) => `$.items[${index}].caption`);
    }
  })();
  return ['$.title', ...paths];
}
