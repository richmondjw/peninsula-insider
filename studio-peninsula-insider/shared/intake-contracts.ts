import { z } from 'zod';
import { CaptureStateSchema } from './capture-contracts.js';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const IsoDateTimeSchema = z.string().datetime();

/** How long a captured source stays fresh before its derived claims expire. */
export const CAPTURE_FRESHNESS_DAYS = 14;

export const CaptureRedirectViewSchema = z.object({
  from: z.string().url(),
  status: z.number().int().min(300).max(399),
  to: z.string().url(),
});

export const CaptureRestrictionSchema = z.object({
  code: z.enum(['price_copy', 'em_dash_copy', 'excerpt_too_short', 'excerpt_too_long', 'claim_budget']),
  detail: z.string().min(1).max(300),
  blockCount: z.number().int().positive(),
});

export const CaptureFailureViewSchema = z.object({
  stage: z.enum(['policy', 'dns', 'transport', 'body', 'extraction', 'storage', 'intake']),
  code: z.string().min(1).max(80),
  message: z.string().min(1).max(500),
});

export const CaptureOutcomeReasonSchema = z.object({
  code: z.string().min(1).max(80),
  detail: z.string().min(1).max(500),
});

/**
 * Display-safe provenance projection of one immutable capture attempt. It carries no
 * response body: captured HTML stays in the content-addressed blob store and only ever
 * reaches a reviewer as extracted plain-text evidence excerpts.
 */
export const SourceCaptureSchema = z.object({
  schemaVersion: z.literal('pi.source-capture.v1'),
  attemptId: z.string().min(1),
  state: CaptureStateSchema,
  requestedUrl: z.string().url(),
  canonicalUrl: z.string().url().optional(),
  submittedBy: z.string().min(1),
  submittedAt: IsoDateTimeSchema,
  capturedAt: IsoDateTimeSchema.optional(),
  freshUntil: IsoDateTimeSchema.optional(),
  sourceRevisionId: z.string().min(1).optional(),
  extractionRevisionId: z.string().min(1).optional(),
  httpStatus: z.number().int().min(200).max(299).optional(),
  mediaType: z.enum(['text/html', 'text/plain']).optional(),
  charset: z.enum(['utf-8', 'us-ascii']).optional(),
  contentEncoding: z.enum(['identity', 'gzip', 'deflate', 'br']).optional(),
  redirects: z.array(CaptureRedirectViewSchema).default([]),
  responseHeaders: z.record(z.string(), z.string()).default({}),
  extractedBlockCount: z.number().int().nonnegative().default(0),
  claimCount: z.number().int().nonnegative().default(0),
  restrictions: z.array(CaptureRestrictionSchema).default([]),
  contentBlobHash: Sha256Schema.optional(),
  extractedTextBlobHash: Sha256Schema.optional(),
  wireBytes: z.number().int().nonnegative().optional(),
  decodedBytes: z.number().int().nonnegative().optional(),
  outcomeReason: CaptureOutcomeReasonSchema.optional(),
  failure: CaptureFailureViewSchema.optional(),
});

export const IntakeStateSchema = z.enum(['capturing', 'extracted', 'held', 'no_story', 'failed', 'rejected']);

/**
 * One row of the local intake audit ledger. Every submission writes a `capturing` row
 * before any egress happens, so an interrupted capture stays visible after a restart and
 * a blocked submission still leaves a safe audit record with no source revision.
 */
export const IntakeAttemptSchema = z.object({
  schemaVersion: z.literal('pi.intake-attempt.v1'),
  id: z.string().min(1),
  idempotencyKeyHash: Sha256Schema,
  intent: z.enum(['new_source', 'refresh']),
  state: IntakeStateSchema,
  submittedBy: z.string().min(1),
  submittedAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  auditUrl: z.string().min(1).max(2048).optional(),
  runId: z.string().min(1).optional(),
  capture: SourceCaptureSchema.optional(),
  outcomeReason: CaptureOutcomeReasonSchema.optional(),
  failure: CaptureFailureViewSchema.optional(),
}).superRefine((attempt, context) => {
  if (attempt.state === 'failed' && !attempt.failure) {
    context.addIssue({ code: 'custom', path: ['failure'], message: 'Failed intake rows require a safe failure code' });
  }
  if (attempt.state === 'rejected' && !attempt.failure) {
    context.addIssue({ code: 'custom', path: ['failure'], message: 'Rejected intake rows require a safe rejection code' });
  }
  if (attempt.state !== 'extracted' && attempt.runId) {
    context.addIssue({ code: 'custom', path: ['runId'], message: 'Only an extracted capture may be bound to a run' });
  }
  if (attempt.state === 'rejected' && attempt.capture) {
    context.addIssue({ code: 'custom', path: ['capture'], message: 'A rejected submission never reaches the capture kernel' });
  }
  if (attempt.failure && ['policy', 'dns'].includes(attempt.failure.stage) && attempt.capture?.sourceRevisionId) {
    context.addIssue({ code: 'custom', path: ['capture', 'sourceRevisionId'], message: 'A blocked, private or redirect-to-private attempt must not record a source revision' });
  }
});

export const UrlIntakeRequestSchema = z.object({
  url: z.string().min(1).max(2048),
  actor: z.string().min(1).max(120).default('local-editor'),
  idempotencyKey: z.string().min(1).max(256).optional(),
});

export const SourceRefreshRequestSchema = z.object({
  actor: z.string().min(1).max(120).default('local-editor'),
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(256).optional(),
  // Required only when the stored source URL carries redacted query values.
  url: z.string().min(1).max(2048).optional(),
});

export type SourceCapture = z.infer<typeof SourceCaptureSchema>;
export type CaptureRestriction = z.infer<typeof CaptureRestrictionSchema>;
export type IntakeAttempt = z.infer<typeof IntakeAttemptSchema>;
export type IntakeState = z.infer<typeof IntakeStateSchema>;
export type UrlIntakeRequest = z.infer<typeof UrlIntakeRequestSchema>;
export type SourceRefreshRequest = z.infer<typeof SourceRefreshRequestSchema>;
