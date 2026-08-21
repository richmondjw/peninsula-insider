import { z } from 'zod';
import { CaptureStateSchema } from './capture-contracts.js';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
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
  capturedAt: z.string().datetime(),
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
  capturedAt: z.string().datetime(),
});

export const CaptureRevisionSummarySchema = z.object({
  attemptId: ImmutableIdSchema,
  requestFingerprint: Sha256Schema,
  requestedUrl: z.string().url(),
  state: CaptureStateSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  events: z.array(z.object({
    state: CaptureStateSchema,
    at: z.string().datetime(),
  })).min(2),
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
    capturedAt: z.string().datetime(),
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
    extractedAt: z.string().datetime(),
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
    ...(summary.sourceRevision?.redirects.flatMap((redirect, index) => [
      [`sourceRevision.redirects.${index}.url`, redirect.url] as const,
      [`sourceRevision.redirects.${index}.location`, redirect.location] as const,
    ]) ?? []),
  ];
  for (const [path, url] of urls) {
    if (!hasOnlyRedactedQueryValues(url)) context.addIssue({ code: 'custom', path: path.split('.'), message: 'Operator-visible URLs require redacted query values' });
  }
  if (summary.state === 'extracted' && (!summary.sourceRevision || !summary.extractionRevision)) {
    context.addIssue({ code: 'custom', path: ['state'], message: 'Extracted capture summaries require immutable revisions' });
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  if (hasRefreshId !== hasRefreshVersion) {
    context.addIssue({ code: 'custom', path: ['refreshRunId'], message: 'Refresh projections require both run ID and expected version' });
  }
  if (projection.operation === 'refresh' && (!hasRefreshId || !hasRefreshVersion)) {
    context.addIssue({ code: 'custom', path: ['operation'], message: 'Refresh operations require their target context' });
  }
  if (projection.operation === 'initial' && (hasRefreshId || hasRefreshVersion)) {
    context.addIssue({ code: 'custom', path: ['operation'], message: 'Initial operations cannot carry refresh context' });
  }
  if (!hasOnlyRedactedQueryValues(projection.requestedUrl)) {
    context.addIssue({ code: 'custom', path: ['requestedUrl'], message: 'Capture projections require redacted query values' });
  }
  if (projection.summary && projection.summary.attemptId !== projection.attemptId) {
    context.addIssue({ code: 'custom', path: ['summary'], message: 'Projection summary belongs to a different attempt' });
  }
  if (projection.summary && (projection.summary.state !== projection.state
      || projection.summary.requestFingerprint !== projection.requestFingerprint
      || projection.summary.requestedUrl !== projection.requestedUrl)) {
    context.addIssue({ code: 'custom', path: ['summary'], message: 'Projection summary does not match its request and terminal state' });
  }
  if (isTerminal && !projection.summary && !(projection.state === 'failed' && projection.failure)) {
    context.addIssue({ code: 'custom', path: ['summary'], message: 'Terminal capture projections require an immutable summary' });
  }
  if (!isTerminal && (projection.summary || projection.failure || projection.runId || projection.materializationFailure)) {
    context.addIssue({ code: 'custom', path: ['state'], message: 'Non-terminal projections cannot expose terminal materialization fields' });
  }
  if (projection.state === 'failed' && !projection.summary && !projection.failure) {
    context.addIssue({ code: 'custom', path: ['failure'], message: 'Interrupted projections require a safe failure' });
  }
  if (projection.materializationFailure && !projection.summary) {
    context.addIssue({ code: 'custom', path: ['materializationFailure'], message: 'Materialization failures require retained immutable capture summary' });
  }
});

export const ReviewHistoryEntrySchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  reviewer: z.string().min(1),
  note: z.string().optional(),
  decidedAt: z.string().datetime(),
  receiptHash: Sha256Schema.optional(),
  validity: z.enum(['current', 'stale']),
  staledAt: z.string().datetime().optional(),
  supersededByAttemptId: ImmutableIdSchema.optional(),
  staleReason: z.enum(['source_refreshed', 'artifact_edited', 'review_superseded', 'legacy_unsealed']).optional(),
}).superRefine((entry, context) => {
  if (entry.validity === 'current' && !entry.receiptHash) {
    context.addIssue({ code: 'custom', path: ['receiptHash'], message: 'Current review decisions require an immutable receipt' });
  }
  if (entry.validity === 'current' && (entry.staledAt || entry.staleReason || entry.supersededByAttemptId)) {
    context.addIssue({ code: 'custom', path: ['validity'], message: 'Current review decisions cannot have stale metadata' });
  }
  if (entry.validity === 'stale' && (!entry.staledAt || !entry.staleReason)) {
    context.addIssue({ code: 'custom', path: ['staledAt'], message: 'Stale review decisions require stale metadata' });
  }
  if (entry.validity === 'stale' && !entry.receiptHash && entry.staleReason !== 'legacy_unsealed') {
    context.addIssue({ code: 'custom', path: ['receiptHash'], message: 'Only explicitly migrated legacy reviews may lack an immutable receipt' });
  }
});

export const IntakeBundleSchema = z.object({
  schemaVersion: z.literal('pi.intake-bundle.v1'),
  id: z.string().min(1),
  title: z.string().min(1),
  submittedBy: z.string().min(1),
  capturedAt: z.string().datetime(),
  sourceItems: z.array(SourceItemSchema).min(1),
});

export const ClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  origin: z.enum(['external_fact', 'first_party_observation', 'opinion', 'inference']),
  verification: z.enum(['supported', 'conflicted', 'stale', 'unsupported', 'approved']),
  evidence: z.array(EvidenceLocatorSchema),
  restrictedFromArtifacts: z.boolean().default(false),
  restrictionReason: z.string().optional(),
});

export const StoryAngleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  framing: z.string().min(1),
  evidenceClaimIds: z.array(z.string()).min(1),
  selectedBy: z.string().min(1),
});

export const QuickNoteSchema = z.object({
  headline: z.string().max(140),
  dek: z.string().max(320).optional(),
  section: z.enum(['eat', 'stay', 'wine', 'explore', 'spa', 'golf', 'whats-on', 'weather', 'note']),
  tag: z.enum(['opening-window', 'menu-change', 'closure', 'event', 'weather', 'editor-note', 'pricing', 'safety']),
  publishedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  verifiedAt: z.string().datetime().optional(),
  verifiedBy: z.string().optional(),
  sources: z.array(z.object({
    kind: z.enum(['unclassified-web', 'web', 'venue-site', 'phone', 'email', 'visit', 'press', 'social', 'gov', 'partner']),
    url: z.string().url().optional(),
    note: z.string().optional(),
    checkedAt: z.string().datetime().optional(),
  })),
  status: z.literal('draft'),
  body: z.string().min(1),
});

const ContentLineageSegmentSchema = z.object({
  source: z.enum(['claim', 'system_template']),
  claimId: z.string().min(1).optional(),
  textHash: Sha256Schema,
}).superRefine((segment, context) => {
  if ((segment.source === 'claim') !== Boolean(segment.claimId)) {
    context.addIssue({ code: 'custom', path: ['claimId'], message: 'Claim lineage requires exactly one claim identity' });
  }
});

const ContentFieldLineageSchema = z.object({
  contentHash: Sha256Schema,
  segments: z.array(ContentLineageSegmentSchema).min(1),
});

export const RealUrlContentLineageSchema = z.object({
  schemaVersion: z.literal('pi.real-url-content-lineage.v1'),
  exportBindingHash: Sha256Schema,
  headline: ContentFieldLineageSchema,
  dek: ContentFieldLineageSchema,
  body: ContentFieldLineageSchema,
});

export const ArtifactSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  type: z.literal('quick_note'),
  targetPath: z.string().regex(/^next\/src\/content\/quick-notes\/[a-z0-9][a-z0-9-]{0,119}\.md$/).optional(),
  claimIds: z.array(z.string()),
  angleId: z.string().min(1),
  payload: QuickNoteSchema,
  contentLineage: RealUrlContentLineageSchema.optional(),
  sourceReview: z.object({
    sourceKind: z.enum(['web', 'venue-site', 'press', 'social', 'gov', 'partner']),
    confirmedClaimIds: z.array(z.string().min(1)).min(1),
    angleConfirmed: z.literal(true),
    confirmedBy: z.string().min(1),
    confirmedAt: z.string().datetime(),
  }).optional(),
  gateResults: z.array(z.object({
    gate: z.string(),
    passed: z.boolean(),
    detail: z.string(),
  })),
});

export const ReviewDecisionSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  reviewer: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

export const ArtifactEditSchema = z.object({
  editor: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  headline: z.string().min(1).max(140).optional(),
  dek: z.string().max(320).optional(),
  body: z.string().min(1).optional(),
  sourceKind: z.enum(['web', 'venue-site', 'press', 'social', 'gov', 'partner']).optional(),
  claimIds: z.array(z.string().min(1)).min(1).optional(),
  confirmAngle: z.boolean().optional(),
}).superRefine((edit, context) => {
  const supplied = [edit.sourceKind !== undefined, edit.claimIds !== undefined, edit.confirmAngle !== undefined];
  if (supplied.some(Boolean) && !supplied.every(Boolean)) {
    context.addIssue({ code: 'custom', path: ['sourceKind'], message: 'Source classification, claim selection and angle confirmation must be saved together' });
  }
  if (edit.confirmAngle === false) {
    context.addIssue({ code: 'custom', path: ['confirmAngle'], message: 'Angle confirmation must be explicit' });
  }
});

export const AuditEventSchema = z.object({
  at: z.string().datetime(),
  actor: z.string().min(1),
  type: z.string().min(1),
  detail: z.string().min(1),
});

export const FoundryRunSchema = z.object({
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['ready_for_review', 'needs_revision', 'accepted', 'rejected', 'failed']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  bundle: IntakeBundleSchema,
  claims: z.array(ClaimSchema),
  angle: StoryAngleSchema,
  artifact: ArtifactSchema,
  blockers: z.array(z.string()),
  review: z.object({
    decision: z.enum(['accepted', 'rejected']),
    reviewer: z.string(),
    note: z.string().optional(),
    decidedAt: z.string().datetime(),
    receiptHash: Sha256Schema,
  }).optional(),
  reviewHistory: z.array(ReviewHistoryEntrySchema).default([]),
  capture: RealUrlCaptureSchema.optional(),
  audit: z.array(AuditEventSchema),
}).superRefine((run, context) => {
  const isReviewedStatus = run.status === 'accepted' || run.status === 'rejected';
  if (isReviewedStatus && (!run.review || run.review.decision !== run.status)) {
    context.addIssue({ code: 'custom', path: ['status'], message: 'Reviewed status requires a matching current immutable review decision' });
  }
  if (!isReviewedStatus && run.review) {
    context.addIssue({ code: 'custom', path: ['review'], message: 'A current review decision requires matching accepted or rejected status' });
  }
  const currentReviews = run.reviewHistory.filter((entry) => entry.validity === 'current');
  if (currentReviews.length > 1 || (run.review && !currentReviews.some((entry) => (
    entry.decision === run.review?.decision && entry.reviewer === run.review?.reviewer
    && entry.decidedAt === run.review?.decidedAt && entry.receiptHash === run.review?.receiptHash
  ))) || (!run.review && currentReviews.length > 0)) {
    context.addIssue({ code: 'custom', path: ['reviewHistory'], message: 'Current review history must match the active review decision' });
  }
  if (!run.capture) return;
  if (!run.artifact.contentLineage) {
    context.addIssue({ code: 'custom', path: ['artifact', 'contentLineage'], message: 'Real URL artifacts require field-level immutable evidence lineage' });
  }
  const current = run.capture.revisions.find((revision) => revision.attemptId === run.capture?.currentAttemptId);
  const artifactRevision = run.capture.revisions.find((revision) => revision.attemptId === run.capture?.artifactAttemptId);
  if (!current || !artifactRevision) {
    context.addIssue({ code: 'custom', path: ['capture', 'currentAttemptId'], message: 'Current capture attempt is missing from revision history' });
    return;
  }
  if (artifactRevision.state !== 'extracted' || !artifactRevision.sourceRevision || !artifactRevision.extractionRevision) {
    context.addIssue({ code: 'custom', path: ['capture'], message: 'Foundry artifacts require an extracted dependency revision' });
    return;
  }
  if (!run.bundle.sourceItems.some((source) => source.id === artifactRevision.sourceRevision?.id)) {
    context.addIssue({ code: 'custom', path: ['bundle', 'sourceItems'], message: 'Bundle must reference the current immutable source revision' });
  }
  run.claims.flatMap((claim) => claim.evidence).forEach((locator, index) => {
    if (locator.locatorType !== 'extracted_block') return;
    if (locator.sourceItemId !== artifactRevision.sourceRevision?.id
      || locator.sourceRevisionId !== artifactRevision.sourceRevision?.id
      || locator.extractionRevisionId !== artifactRevision.extractionRevision?.id) {
      context.addIssue({ code: 'custom', path: ['claims', index, 'evidence'], message: 'Evidence must resolve against the current immutable extraction revision' });
    }
  });
});

export type FoundryRun = z.infer<typeof FoundryRunSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type ArtifactEdit = z.infer<typeof ArtifactEditSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type CaptureRevisionSummary = z.infer<typeof CaptureRevisionSummarySchema>;
export type CaptureProjection = z.infer<typeof CaptureProjectionSchema>;
