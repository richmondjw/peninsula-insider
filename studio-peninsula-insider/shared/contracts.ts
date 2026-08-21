import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const IsoDateTimeSchema = z.string().datetime();

export const EvidenceLocatorSchema = z.object({
  sourceItemId: z.string().min(1),
  locatorType: z.enum(['selector', 'paragraph', 'timecode', 'manual']),
  locator: z.string().min(1),
  excerpt: z.string().min(1),
  excerptHash: Sha256Schema,
  capturedAt: IsoDateTimeSchema,
});

export const SourceItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['url', 'text_note', 'audio_note', 'image', 'document']),
  uri: z.string().url().optional(),
  contentHash: Sha256Schema,
  capturedAt: IsoDateTimeSchema,
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
    kind: z.enum(['venue-site', 'phone', 'email', 'visit', 'press', 'social', 'gov', 'partner']),
    url: z.string().url().optional(),
    note: z.string().optional(),
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
}).refine((payload) => !payload.astroPatchReady || Boolean(payload.heroImage), {
  message: 'A rights-cleared hero image is required when astroPatchReady is true.',
  path: ['heroImage'],
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
  provenance_footer: z.string().default(''),
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
  reason: z.enum(['not_requested', 'no_applicable_content', 'rights_not_cleared']),
  detail: z.string().min(1),
});

export const StoredArtifactReviewDecisionSchema = z.object({
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

export const ArtifactPackSchema = z.object({
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
  factualSegmentIds: z.array(z.string().min(1)).optional(),
  claimUsage: z.array(ClaimUsageSchema).optional(),
});

export const AuditEventSchema = z.object({
  at: IsoDateTimeSchema,
  actor: z.string().min(1),
  type: z.string().min(1),
  detail: z.string().min(1),
});

export const FoundryRunSchema = z.object({
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
  artifactPack: ArtifactPackSchema,
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
