import { z } from 'zod';
import { CaptureStateSchema } from './capture-contracts.js';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const IsoDateTimeSchema = z.string().datetime();
const ImmutableIdSchema = z.string().regex(/^[a-z][a-z0-9-]{7,127}$/);

function hasOnlyRedactedQueryValues(value: string): boolean {
  try {
    return [...new URL(value).searchParams.values()].every((queryValue) => queryValue === '[redacted]');
  } catch {
    return false;
  }
}

export const EvidenceLocatorSchema = z.object({
  sourceItemId: z.string().min(1),
  sourceRevisionId: ImmutableIdSchema.optional(),
  extractionRevisionId: ImmutableIdSchema.optional(),
  locatorType: z.enum(['selector', 'paragraph', 'timecode', 'manual', 'extracted_block']),
  locator: z.string().min(1),
  excerpt: z.string().min(1),
  excerptHash: Sha256Schema,
  capturedAt: IsoDateTimeSchema,
}).superRefine((locator, context) => {
  if (locator.locatorType === 'extracted_block' && (!locator.sourceRevisionId || !locator.extractionRevisionId)) {
    context.addIssue({ code: 'custom', path: ['sourceRevisionId'], message: 'Extracted evidence requires immutable revision IDs' });
  }
});

export const SourceItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['url', 'text_note', 'audio_note', 'image', 'document']),
  uri: z.string().url().optional(),
  contentHash: Sha256Schema,
  capturedAt: IsoDateTimeSchema,
});

export const CaptureRevisionSummarySchema = z.object({
  attemptId: ImmutableIdSchema,
  requestFingerprint: Sha256Schema,
  requestedUrl: z.string().url(),
  state: CaptureStateSchema,
  createdAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema,
  events: z.array(z.object({ state: CaptureStateSchema, at: IsoDateTimeSchema })).min(2),
  redirects: z.array(z.object({
    url: z.string().url(),
    status: z.number().int().min(300).max(399),
    location: z.string().url(),
  })),
  outcomeReason: z.object({ code: z.string().min(1) }).optional(),
  failure: z.object({
    stage: z.enum(['policy', 'dns', 'transport', 'body', 'extraction', 'storage']),
    code: z.string().min(1),
  }).optional(),
  sourceRevision: z.object({
    id: ImmutableIdSchema,
    canonicalUrl: z.string().url(),
    capturedAt: IsoDateTimeSchema,
    status: z.number().int().min(200).max(299),
    mediaType: z.enum(['text/html', 'text/plain']),
    charset: z.enum(['utf-8', 'us-ascii']),
    contentEncoding: z.enum(['identity', 'gzip', 'deflate', 'br']),
    redirects: z.array(z.object({
      url: z.string().url(),
      status: z.number().int().min(300).max(399),
      location: z.string().url(),
    })),
    contentHash: Sha256Schema,
    wireBytes: z.number().int().nonnegative(),
    decodedBytes: z.number().int().nonnegative(),
  }).optional(),
  extractionRevision: z.object({
    id: ImmutableIdSchema,
    extractedAt: IsoDateTimeSchema,
    extractorVersion: z.string().min(1),
    contentHash: Sha256Schema,
    blockCount: z.number().int().nonnegative(),
  }).optional(),
  restrictions: z.array(z.string().min(1)),
}).superRefine((summary, context) => {
  const urls = [
    ['requestedUrl', summary.requestedUrl] as const,
    ...(summary.sourceRevision ? [['sourceRevision.canonicalUrl', summary.sourceRevision.canonicalUrl] as const] : []),
    ...summary.redirects.flatMap((redirect, index) => [
      [`redirects.${index}.url`, redirect.url] as const,
      [`redirects.${index}.location`, redirect.location] as const,
    ]),
  ];
  for (const [path, url] of urls) {
    if (!hasOnlyRedactedQueryValues(url)) context.addIssue({ code: 'custom', path: path.split('.'), message: 'Operator-visible URLs require redacted query values' });
  }
  if (summary.state === 'extracted' && (!summary.sourceRevision || !summary.extractionRevision)) {
    context.addIssue({ code: 'custom', path: ['state'], message: 'Extracted summaries require immutable revisions' });
  }
});

export const RealUrlCaptureSchema = z.object({
  mode: z.literal('real_url'),
  currentAttemptId: ImmutableIdSchema,
  artifactAttemptId: ImmutableIdSchema,
  revisions: z.array(CaptureRevisionSummarySchema).min(1),
});

export const CaptureProjectionSchema = z.object({
  schemaVersion: z.literal('pi.capture-projection.v1'),
  id: ImmutableIdSchema,
  sourceId: ImmutableIdSchema,
  attemptId: ImmutableIdSchema,
  actor: z.string().min(1),
  idempotencyKeyHash: Sha256Schema,
  requestFingerprint: Sha256Schema,
  operation: z.enum(['initial', 'refresh']),
  operationFingerprint: Sha256Schema,
  requestedUrl: z.string().url(),
  state: CaptureStateSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  runId: z.string().min(1).optional(),
  refreshRunId: z.string().min(1).optional(),
  expectedRunVersion: z.number().int().positive().optional(),
  summary: CaptureRevisionSummarySchema.optional(),
  failure: z.object({
    stage: z.enum(['policy', 'dns', 'transport', 'body', 'extraction', 'storage']),
    code: z.string().min(1),
  }).optional(),
  materializationFailure: z.object({
    code: z.enum(['refresh_target_missing', 'refresh_target_invalid', 'workflow_materialization_failed']),
  }).optional(),
}).superRefine((projection, context) => {
  const isTerminal = ['extracted', 'held', 'no_story', 'failed'].includes(projection.state);
  const hasRefreshId = projection.refreshRunId !== undefined;
  const hasRefreshVersion = projection.expectedRunVersion !== undefined;
  if (hasRefreshId !== hasRefreshVersion || (projection.operation === 'refresh' && !hasRefreshId)) {
    context.addIssue({ code: 'custom', path: ['refreshRunId'], message: 'Refresh operations require exact target context' });
  }
  if (projection.operation === 'initial' && (hasRefreshId || hasRefreshVersion)) {
    context.addIssue({ code: 'custom', path: ['operation'], message: 'Initial operations cannot carry refresh context' });
  }
  if (!hasOnlyRedactedQueryValues(projection.requestedUrl)) {
    context.addIssue({ code: 'custom', path: ['requestedUrl'], message: 'Capture projections require redacted query values' });
  }
  if (projection.summary && (projection.summary.attemptId !== projection.attemptId
      || projection.summary.state !== projection.state
      || projection.summary.requestFingerprint !== projection.requestFingerprint
      || projection.summary.requestedUrl !== projection.requestedUrl)) {
    context.addIssue({ code: 'custom', path: ['summary'], message: 'Projection summary does not match its immutable capture' });
  }
  if (isTerminal && !projection.summary && !(projection.state === 'failed' && projection.failure)) {
    context.addIssue({ code: 'custom', path: ['summary'], message: 'Terminal projections require immutable evidence or a safe interruption failure' });
  }
  if (!isTerminal && (projection.summary || projection.failure || projection.runId || projection.materializationFailure)) {
    context.addIssue({ code: 'custom', path: ['state'], message: 'Non-terminal projections cannot expose terminal fields' });
  }
});

export const IntakeBundleSchema = z.object({
  schemaVersion: z.literal('pi.intake-bundle.v1'),
  id: z.string().min(1),
  title: z.string().min(1),
  submittedBy: z.string().min(1),
  capturedAt: IsoDateTimeSchema,
  sourceItems: z.array(SourceItemSchema).min(1),
});

export const ClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  origin: z.enum(['external_fact', 'first_party_observation', 'opinion', 'inference']),
  verification: z.enum(['supported', 'conflicted', 'stale', 'unsupported', 'approved']),
  evidence: z.array(EvidenceLocatorSchema),
  expiresAt: IsoDateTimeSchema.optional(),
  restrictedFromArtifacts: z.boolean().default(false),
  restrictionReason: z.string().optional(),
});

export const ClaimSetVersionSchema = z.object({
  schemaVersion: z.literal('pi.claim-set.v1'),
  id: z.string().min(1),
  version: z.number().int().positive(),
  contentHash: Sha256Schema,
  createdAt: IsoDateTimeSchema,
  lockedAt: IsoDateTimeSchema,
  lockedBy: z.string().min(1),
  claims: z.array(ClaimSchema).min(1),
});

export const StoryAngleSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive().default(1),
  label: z.string().min(1),
  framing: z.string().min(1),
  evidenceClaimIds: z.array(z.string()).min(1),
  selectedBy: z.string().min(1),
});

export const SourceConfirmationSchema = z.object({
  schemaVersion: z.literal('pi.source-confirmation.v1'),
  sourceKind: z.enum(['web', 'venue-site', 'press', 'social', 'gov', 'partner']),
  confirmedClaimIds: z.array(z.string().min(1)).min(1),
  confirmedClaimHashes: z.array(Sha256Schema).min(1),
  claimSetId: z.string().min(1),
  claimSetVersion: z.number().int().positive(),
  claimSetHash: Sha256Schema,
  angleId: z.string().min(1),
  angleVersion: z.number().int().positive(),
  angleHash: Sha256Schema,
  captureAttemptId: ImmutableIdSchema,
  requestFingerprint: Sha256Schema,
  sourceRevisionId: ImmutableIdSchema,
  extractionRevisionId: ImmutableIdSchema,
  confirmedBy: z.string().min(1),
  confirmedAt: IsoDateTimeSchema,
}).superRefine((confirmation, context) => {
  if (confirmation.confirmedClaimIds.length !== confirmation.confirmedClaimHashes.length) {
    context.addIssue({ code: 'custom', path: ['confirmedClaimHashes'], message: 'Each selected claim requires an exact immutable hash' });
  }
});

export const PublicFieldLineageSegmentSchema = z.object({
  source: z.enum(['claim', 'system_template']),
  claimId: z.string().min(1).optional(),
  claimHash: Sha256Schema.optional(),
  textHash: Sha256Schema,
}).superRefine((segment, context) => {
  const claimBound = segment.source === 'claim';
  if (claimBound !== Boolean(segment.claimId && segment.claimHash)) {
    context.addIssue({ code: 'custom', path: ['claimId'], message: 'Claim lineage requires exact claim identity and hash' });
  }
});

export const PublicFieldLineageSchema = z.object({
  path: z.string().min(1),
  contentHash: Sha256Schema,
  factual: z.boolean(),
  segments: z.array(PublicFieldLineageSegmentSchema).min(1),
}).superRefine((field, context) => {
  if (field.factual && !field.segments.some((segment) => segment.source === 'claim')) {
    context.addIssue({ code: 'custom', path: ['segments'], message: 'Factual fields require immutable claim lineage' });
  }
});

export const MediaRightsBindingSchema = z.object({
  schemaVersion: z.literal('pi.media-rights-binding.v1'),
  asset: z.object({ id: z.string().min(1), version: z.number().int().positive(), contentHash: Sha256Schema }),
  placementPath: z.literal('$.heroImage'),
  surface: z.literal('image'),
  rights: z.object({ id: z.string().min(1), version: z.number().int().positive() }),
  recognisablePeople: z.boolean(),
  releaseIds: z.array(z.string().min(1)),
  contentHash: Sha256Schema,
});

export const ArtifactTypeSchema = z.enum([
  'quick_note',
  'article_draft',
  'article_metadata',
  'ask_answer',
  'internal_link_plan',
  'seo_metadata_proposal',
]);

export const RecipeArtifactRequirementSchema = z.object({
  key: z.string().min(1),
  type: ArtifactTypeSchema,
  required: z.boolean(),
  dependsOnKeys: z.array(z.string()).default([]),
  targetContract: z.string().min(1),
});

export const RecipeDefinitionSchema = z.object({
  schemaVersion: z.literal('pi.recipe-definition.v1'),
  id: z.string().min(1),
  version: z.number().int().positive(),
  label: z.string().min(1),
  sourceKinds: z.array(SourceItemSchema.shape.kind).min(1),
  artifacts: z.array(RecipeArtifactRequirementSchema).min(1),
  textOnlyAllowed: z.literal(true),
  externalCalls: z.literal(false),
});

export const GateCodeSchema = z.enum([
  'no_price',
  'no_em_dash',
  'supported_claims_only',
  'claim_usage_complete',
  'dependency_current',
  'human_confirmation_current',
  'field_lineage_complete',
  'astro_article_contract',
  'ask_answer_contract',
  'astro_patch_ready',
]);

const GateResultBaseSchema = z.object({
  gate: GateCodeSchema,
  scope: z.enum(['artifact', 'pack']),
  detail: z.string().min(1),
  claimIds: z.array(z.string()).default([]),
});

export const GateResultSchema = z.discriminatedUnion('passed', [
  GateResultBaseSchema.extend({ passed: z.literal(true), blocking: z.literal(false) }),
  GateResultBaseSchema.extend({ passed: z.literal(false), blocking: z.boolean().default(true) }),
]);

export const QUICK_SOURCE_NOTE_TEMPLATE = 'Source details are bound to the immutable evidence ledger.' as const;
export const FIXTURE_ASK_PROVENANCE_TEMPLATE = 'Drafted from a locked Peninsula Insider fixture claim set. Verify live details before visiting.' as const;
export const REAL_URL_ASK_PROVENANCE_TEMPLATE = 'Internal draft from a human-confirmed immutable source claim set. Verify current details before use.' as const;

export const QuickNoteSchema = z.object({
  headline: z.string().max(140),
  dek: z.string().max(320).optional(),
  section: z.enum(['eat', 'stay', 'wine', 'explore', 'spa', 'golf', 'whats-on', 'weather', 'note']),
  tag: z.enum(['opening-window', 'menu-change', 'closure', 'event', 'weather', 'editor-note', 'pricing', 'safety']),
  publishedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  verifiedAt: IsoDateTimeSchema.optional(),
  verifiedBy: z.string().optional(),
  sources: z.array(z.object({
    kind: z.enum(['unclassified-web', 'web', 'venue-site', 'phone', 'email', 'visit', 'press', 'social', 'gov', 'partner']),
    url: z.string().url().optional(),
    note: z.literal(QUICK_SOURCE_NOTE_TEMPLATE).optional(),
    checkedAt: IsoDateTimeSchema.optional(),
  })),
  status: z.literal('draft'),
  body: z.string().min(1),
});

export const ArticleDraftPayloadSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  body: z.string().min(1),
});

export const ArticleMetadataPayloadSchema = z.object({
  title: z.string().min(1),
  dek: z.string().min(1),
  author: z.string().min(1),
  houseByline: z.boolean(),
  publishedAt: z.string().date(),
  heroImage: z.object({
    src: z.string().min(1),
    alt: z.string().min(1),
    credit: z.string().min(1),
    license: z.enum([
      'original-commissioned',
      'venue-media-kit',
      'visit-victoria',
      'wikimedia-cc0',
      'wikimedia-cc-by',
      'wikimedia-cc-by-sa',
      'tmp-unsplash',
      'tmp-wikimedia',
      'tmp-pexels',
      'other-licensed',
    ]),
  }).optional(),
  heroBinding: MediaRightsBindingSchema.optional(),
  astroPatchReady: z.boolean(),
  format: z.enum([
    'editors-letter',
    'long-lunch-list',
    'cellar-door-dispatch',
    'stay-notes',
    'slow-peninsula',
    'insider-edit',
    'interview',
    'investigation',
    'service',
    'weekend-picker',
    'hub-guide',
    'trail-guide',
    'venue-guide',
    'peninsula-notes',
  ]),
  tags: z.array(z.string()).default([]),
  relatedVenues: z.array(z.string()).default([]),
  relatedExperiences: z.array(z.string()).default([]),
  relatedPlaces: z.array(z.string()).default([]),
  relatedArticles: z.array(z.string()).default([]),
  relatedItineraries: z.array(z.string()).default([]),
  readingTimeMinutes: z.number().positive().optional(),
  featured: z.boolean().default(false),
  status: z.literal('draft'),
  lastVerified: z.string().date().optional(),
  clusterLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
  aiSummary: z.array(z.string()).optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  sitemapExclude: z.boolean().default(false),
  section: z.enum(['journal', 'plans']).default('journal'),
  planShape: z.enum(['one-night', 'two-night', 'day-trip', 'seasonal']).optional(),
}).superRefine((payload, context) => {
  if (payload.astroPatchReady && (!payload.heroImage || !payload.heroBinding)) {
    context.addIssue({ code: 'custom', path: ['heroBinding'], message: 'An exact hero asset, placement, rights and release binding is required for an Astro patch' });
  }
  if (!payload.heroImage && payload.heroBinding) {
    context.addIssue({ code: 'custom', path: ['heroBinding'], message: 'A hero binding cannot exist without the bound image' });
  }
});

export const AskRecommendationSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  href: z.string().optional(),
  why: z.string().optional(),
  signature: z.string().optional(),
  hero_image: z.string().optional(),
  venue_type: z.string().optional(),
  category: z.string().optional(),
  region: z.string().optional(),
  price_band: z.never().optional(),
});

export const AskAnswerPayloadSchema = z.object({
  answer: z.string().min(1),
  recommendations: z.array(AskRecommendationSchema).default([]),
  follow_on: z.array(z.string()).default([]),
  provenance_footer: z.enum([FIXTURE_ASK_PROVENANCE_TEMPLATE, REAL_URL_ASK_PROVENANCE_TEMPLATE]),
});

export const InternalLinkPlanPayloadSchema = z.object({
  links: z.array(z.object({
    label: z.string().min(1),
    href: z.string().regex(/^\//),
    placement: z.string().min(1),
  })),
});

export const SeoMetadataProposalPayloadSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1).max(170),
  canonicalPath: z.string().regex(/^\//),
});

export const ClaimUsageSchema = z.object({
  segmentId: z.string().min(1),
  path: z.string().min(1),
  claimIds: z.array(z.string()).min(1),
  contentHash: Sha256Schema,
});

export const ArtifactDependencySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('claim_set'),
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  z.object({
    kind: z.literal('artifact'),
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  z.object({
    kind: z.literal('angle'),
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  z.object({
    kind: z.literal('media_rights'),
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
    status: z.literal('cleared'),
  }),
  z.object({
    kind: z.literal('capture_source'),
    id: ImmutableIdSchema,
    version: z.literal(1),
    contentHash: Sha256Schema,
    attemptId: ImmutableIdSchema,
    requestFingerprint: Sha256Schema,
    sourceRevisionId: ImmutableIdSchema,
    extractionRevisionId: ImmutableIdSchema,
    selectedClaimIds: z.array(z.string().min(1)).min(1),
    selectedClaimsHash: Sha256Schema,
  }),
]);

const ArtifactVersionBaseSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  version: z.number().int().positive(),
  contentHash: Sha256Schema,
  angleId: z.string().min(1),
  angleVersion: z.number().int().positive(),
  factualSegmentIds: z.array(z.string()),
  claimUsage: z.array(ClaimUsageSchema),
  publicFieldLineage: z.array(PublicFieldLineageSchema).min(1),
  dependencies: z.array(ArtifactDependencySchema).min(1),
  gateResults: z.array(GateResultSchema),
});

export const QuickNoteArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('quick_note'),
  claimIds: z.array(z.string()),
  payload: QuickNoteSchema,
});

export const ArticleDraftArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('article_draft'),
  payload: ArticleDraftPayloadSchema,
});

export const ArticleMetadataArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('article_metadata'),
  payload: ArticleMetadataPayloadSchema,
});

export const AskAnswerArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('ask_answer'),
  payload: AskAnswerPayloadSchema,
});

export const InternalLinkPlanArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('internal_link_plan'),
  payload: InternalLinkPlanPayloadSchema,
});

export const SeoMetadataProposalArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('seo_metadata_proposal'),
  payload: SeoMetadataProposalPayloadSchema,
});

export const ArtifactVersionSchema = z.discriminatedUnion('type', [
  QuickNoteArtifactSchema,
  ArticleDraftArtifactSchema,
  ArticleMetadataArtifactSchema,
  AskAnswerArtifactSchema,
  InternalLinkPlanArtifactSchema,
  SeoMetadataProposalArtifactSchema,
]);

const LegacyArtifactVersionBaseSchema = ArtifactVersionBaseSchema.omit({ publicFieldLineage: true });
export const LegacyArtifactVersionV1Schema = z.discriminatedUnion('type', [
  LegacyArtifactVersionBaseSchema.extend({ type: z.literal('quick_note'), claimIds: z.array(z.string()), payload: QuickNoteSchema }),
  LegacyArtifactVersionBaseSchema.extend({ type: z.literal('article_draft'), payload: ArticleDraftPayloadSchema }),
  LegacyArtifactVersionBaseSchema.extend({ type: z.literal('article_metadata'), payload: z.unknown() }),
  LegacyArtifactVersionBaseSchema.extend({ type: z.literal('ask_answer'), payload: AskAnswerPayloadSchema }),
  LegacyArtifactVersionBaseSchema.extend({ type: z.literal('internal_link_plan'), payload: InternalLinkPlanPayloadSchema }),
  LegacyArtifactVersionBaseSchema.extend({ type: z.literal('seo_metadata_proposal'), payload: SeoMetadataProposalPayloadSchema }),
]);

export const ArtifactFailureSchema = z.object({
  key: z.string().min(1),
  type: ArtifactTypeSchema,
  required: z.boolean(),
  code: z.enum(['fixture_derivative_failure', 'contract_invalid', 'blocked_claim', 'dependency_failed']),
  detail: z.string().min(1),
  attemptedAt: IsoDateTimeSchema,
});

export const ArtifactOmissionSchema = z.object({
  key: z.string().min(1),
  type: ArtifactTypeSchema,
  reason: z.enum(['not_requested', 'no_applicable_content', 'rights_not_cleared', 'awaiting_human_confirmation']),
  detail: z.string().min(1),
});

export const LegacyStoredArtifactReviewDecisionSchema = z.object({
  id: z.string().min(1),
  artifactId: z.string().min(1),
  artifactVersion: z.number().int().positive(),
  decision: z.enum(['accepted', 'rejected']),
  reviewer: z.string().min(1),
  note: z.string().max(500).optional(),
  decidedAt: IsoDateTimeSchema,
  status: z.enum(['current', 'stale']),
  dependencySnapshot: z.array(ArtifactDependencySchema),
  authority: z.literal('draft_handoff_only'),
});

export const StoredArtifactReviewDecisionSchema = LegacyStoredArtifactReviewDecisionSchema.extend({
  receiptHash: Sha256Schema.optional(),
  evaluationAsOf: IsoDateTimeSchema.optional(),
  reviewedRunVersion: z.number().int().positive().optional(),
  reviewedArtifactPackVersion: z.number().int().positive().optional(),
  staleReason: z.enum([
    'artifact_edited',
    'dependency_changed',
    'source_refreshed',
    'review_superseded',
    'legacy_unsealed',
    'schema_migrated',
    'gate_re_evaluated',
  ]).optional(),
  staledAt: IsoDateTimeSchema.optional(),
  supersededByAttemptId: ImmutableIdSchema.optional(),
}).superRefine((review, context) => {
  if (review.status === 'current' && (!review.receiptHash || !review.evaluationAsOf || !review.reviewedRunVersion || !review.reviewedArtifactPackVersion || review.staleReason || review.staledAt || review.supersededByAttemptId)) {
    context.addIssue({ code: 'custom', path: ['receiptHash'], message: 'Current artifact reviews require exactly one immutable receipt and no stale metadata' });
  }
  if (review.status === 'stale' && (!review.staleReason || !review.staledAt)) {
    context.addIssue({ code: 'custom', path: ['staledAt'], message: 'Stale artifact reviews require an attributable reason and time' });
  }
  if (review.status === 'stale' && !review.receiptHash && review.staleReason !== 'legacy_unsealed') {
    context.addIssue({ code: 'custom', path: ['receiptHash'], message: 'Only unsealed legacy reviews may lack a receipt' });
  }
});

export const ArtifactPackV1Schema = z.object({
  schemaVersion: z.literal('pi.artifact-pack.v1'),
  id: z.string().min(1),
  version: z.number().int().positive(),
  recipeId: z.string().min(1),
  recipeVersion: z.number().int().positive(),
  claimSetRef: z.object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  angleRef: z.object({ id: z.string().min(1), version: z.number().int().positive() }),
  status: z.enum(['complete', 'partial', 'failed']),
  completed: z.array(LegacyArtifactVersionV1Schema),
  failed: z.array(ArtifactFailureSchema),
  omitted: z.array(ArtifactOmissionSchema),
  reviews: z.array(LegacyStoredArtifactReviewDecisionSchema),
});

export const ArtifactPackSchema = z.object({
  schemaVersion: z.literal('pi.artifact-pack.v2'),
  id: z.string().min(1),
  version: z.number().int().positive(),
  recipeId: z.string().min(1),
  recipeVersion: z.number().int().positive(),
  claimSetRef: z.object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  angleRef: z.object({ id: z.string().min(1), version: z.number().int().positive() }),
  status: z.enum(['complete', 'partial', 'failed']),
  completed: z.array(ArtifactVersionSchema),
  failed: z.array(ArtifactFailureSchema),
  omitted: z.array(ArtifactOmissionSchema),
  reviews: z.array(StoredArtifactReviewDecisionSchema),
});

export const ReviewDecisionSchema = z.object({
  artifactId: z.string().min(1).optional(),
  decision: z.enum(['accepted', 'rejected']),
  reviewer: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  expectedArtifactVersion: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});

export const ArtifactEditSchema = z.object({
  editor: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  headline: z.string().min(1).max(140),
  dek: z.string().max(320).optional(),
  body: z.string().min(1),
});

export const ArtifactUpdateSchema = z.object({
  editor: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  expectedArtifactVersion: z.number().int().positive(),
  payload: z.unknown(),
});

export const SourceConfirmationInputSchema = z.object({
  sourceKind: SourceConfirmationSchema.shape.sourceKind,
  claimIds: z.array(z.string().min(1)).min(1),
  angleLabel: z.string().min(1),
  angleFraming: z.string().min(1),
  confirmer: z.string().min(1),
  expectedVersion: z.number().int().positive(),
});

export const AuditEventSchema = z.object({
  at: IsoDateTimeSchema,
  actor: z.string().min(1),
  type: z.string().min(1),
  detail: z.string().min(1),
});

export const ArtifactPackFoundryRunV2Schema = z.object({
  schemaVersion: z.literal('pi.foundry-run.v2'),
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['ready_for_review', 'needs_revision', 'accepted', 'rejected', 'failed']),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  bundle: IntakeBundleSchema,
  recipe: RecipeDefinitionSchema,
  claimSet: ClaimSetVersionSchema,
  angle: StoryAngleSchema,
  artifactPack: ArtifactPackV1Schema,
  blockers: z.array(z.string()),
  audit: z.array(AuditEventSchema),
  // v0.1 compatibility projections. New recipes do not populate these fields.
  claims: z.array(ClaimSchema).optional(),
  artifact: QuickNoteArtifactSchema.optional(),
  review: z.object({
    decision: z.enum(['accepted', 'rejected']),
    reviewer: z.string(),
    note: z.string().optional(),
    decidedAt: IsoDateTimeSchema,
  }).optional(),
});

export const FoundryRunSchema = z.object({
  schemaVersion: z.literal('pi.foundry-run.v3'),
  id: z.string().min(1),
  originAuthorityReceiptHash: Sha256Schema,
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['ready_for_review', 'needs_revision', 'accepted', 'rejected', 'failed']),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  evaluationAsOf: IsoDateTimeSchema,
  bundle: IntakeBundleSchema,
  recipe: RecipeDefinitionSchema,
  claimSet: ClaimSetVersionSchema,
  angle: StoryAngleSchema,
  artifactPack: ArtifactPackSchema,
  blockers: z.array(z.string()),
  audit: z.array(AuditEventSchema),
  capture: RealUrlCaptureSchema.optional(),
  sourceConfirmation: SourceConfirmationSchema.optional(),
  // Compatibility projections only. Per-artifact receipts are authoritative.
  claims: z.array(ClaimSchema).optional(),
  artifact: QuickNoteArtifactSchema.optional(),
  review: z.object({
    decision: z.enum(['accepted', 'rejected']),
    reviewer: z.string(),
    note: z.string().optional(),
    decidedAt: IsoDateTimeSchema,
    receiptHash: Sha256Schema,
  }).optional(),
}).superRefine((run, context) => {
  if (run.capture && !run.claims) {
    context.addIssue({ code: 'custom', path: ['claims'], message: 'Real URL runs require immutable claim projections' });
  }
  if (run.sourceConfirmation && (!run.capture
      || run.sourceConfirmation.captureAttemptId !== run.capture.currentAttemptId
      || run.sourceConfirmation.claimSetId !== run.claimSet.id
      || run.sourceConfirmation.claimSetVersion !== run.claimSet.version
      || run.sourceConfirmation.claimSetHash !== run.claimSet.contentHash
      || run.sourceConfirmation.angleId !== run.angle.id
      || run.sourceConfirmation.angleVersion !== run.angle.version)) {
    context.addIssue({ code: 'custom', path: ['sourceConfirmation'], message: 'Human confirmation must bind the current source, claim set and angle' });
  }
  const currentReviews = run.artifactPack.reviews.filter((review) => review.status === 'current');
  const currentKeys = new Set(currentReviews.map((review) => review.artifactId));
  if (currentKeys.size !== currentReviews.length) {
    context.addIssue({ code: 'custom', path: ['artifactPack', 'reviews'], message: 'At most one current review may exist per artifact' });
  }
});

const LegacyGateResultSchema = z.object({
  gate: z.string().min(1),
  passed: z.boolean(),
  detail: z.string().min(1),
});

export const LegacyQuickNoteArtifactSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  type: z.literal('quick_note'),
  claimIds: z.array(z.string()),
  angleId: z.string().min(1),
  payload: QuickNoteSchema,
  gateResults: z.array(LegacyGateResultSchema),
});

export const LegacyFoundryRunSchema = z.object({
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['ready_for_review', 'needs_revision', 'accepted', 'rejected', 'failed']),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  bundle: IntakeBundleSchema,
  claims: z.array(ClaimSchema),
  angle: StoryAngleSchema.omit({ version: true }),
  artifact: LegacyQuickNoteArtifactSchema,
  blockers: z.array(z.string()),
  review: z.object({
    decision: z.enum(['accepted', 'rejected']),
    reviewer: z.string(),
    note: z.string().optional(),
    decidedAt: IsoDateTimeSchema,
  }).optional(),
  audit: z.array(AuditEventSchema),
});

export const LegacySingleArtifactRealUrlRunV2Schema = z.object({
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['ready_for_review', 'needs_revision', 'accepted', 'rejected', 'failed']),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  bundle: IntakeBundleSchema,
  claims: z.array(ClaimSchema),
  angle: StoryAngleSchema.omit({ version: true }),
  artifact: z.object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    type: z.literal('quick_note'),
    targetPath: z.string().optional(),
    claimIds: z.array(z.string()),
    angleId: z.string().min(1),
    payload: QuickNoteSchema,
    contentLineage: z.unknown().optional(),
    sourceReview: z.unknown().optional(),
    gateResults: z.array(LegacyGateResultSchema),
  }),
  blockers: z.array(z.string()),
  review: z.object({
    decision: z.enum(['accepted', 'rejected']),
    reviewer: z.string(),
    note: z.string().optional(),
    decidedAt: IsoDateTimeSchema,
    receiptHash: Sha256Schema,
  }).optional(),
  reviewHistory: z.array(z.object({
    decision: z.enum(['accepted', 'rejected']),
    reviewer: z.string(),
    note: z.string().optional(),
    decidedAt: IsoDateTimeSchema,
    receiptHash: Sha256Schema.optional(),
    validity: z.enum(['current', 'stale']),
    staledAt: IsoDateTimeSchema.optional(),
    supersededByAttemptId: ImmutableIdSchema.optional(),
    staleReason: z.enum(['source_refreshed', 'artifact_edited', 'review_superseded', 'legacy_unsealed']).optional(),
  })).default([]),
  capture: RealUrlCaptureSchema.optional(),
  audit: z.array(AuditEventSchema),
});

export type FoundryRun = z.infer<typeof FoundryRunSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type ArtifactEdit = z.infer<typeof ArtifactEditSchema>;
export type ArtifactUpdate = z.infer<typeof ArtifactUpdateSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ClaimSetVersion = z.infer<typeof ClaimSetVersionSchema>;
export type ArtifactVersion = z.infer<typeof ArtifactVersionSchema>;
export type ArtifactDependency = z.infer<typeof ArtifactDependencySchema>;
export type ArtifactPack = z.infer<typeof ArtifactPackSchema>;
export type GateResult = z.infer<typeof GateResultSchema>;
export type RecipeDefinition = z.infer<typeof RecipeDefinitionSchema>;
export type LegacyFoundryRun = z.infer<typeof LegacyFoundryRunSchema>;
export type ArtifactPackFoundryRunV2 = z.infer<typeof ArtifactPackFoundryRunV2Schema>;
export type LegacySingleArtifactRealUrlRunV2 = z.infer<typeof LegacySingleArtifactRealUrlRunV2Schema>;
export type CaptureRevisionSummary = z.infer<typeof CaptureRevisionSummarySchema>;
export type CaptureProjection = z.infer<typeof CaptureProjectionSchema>;
export type SourceConfirmationInput = z.infer<typeof SourceConfirmationInputSchema>;
