import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const ImmutableIdSchema = z.string().regex(/^[a-z][a-z0-9-]{7,127}$/);
const IpAddressSchema = z.union([z.ipv4(), z.ipv6()]);

export const AttemptRedirectSchema = z.object({
  url: z.string().url(),
  status: z.number().int().min(300).max(399),
  location: z.string().url(),
}).readonly();

export const CaptureStateSchema = z.enum([
  'queued',
  'capturing',
  'captured',
  'extracting',
  'extracted',
  'held',
  'no_story',
  'failed',
]);

export const CaptureStateEventSchema = z.object({
  state: CaptureStateSchema,
  at: z.string().datetime(),
  detail: z.string().max(500).optional(),
}).readonly();

const ALLOWED_TRANSITIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  queued: ['capturing'],
  capturing: ['captured', 'held', 'failed'],
  captured: ['extracting', 'held', 'failed'],
  extracting: ['extracted', 'held', 'no_story', 'failed'],
  extracted: [],
  held: [],
  no_story: [],
  failed: [],
});

export const CaptureAttemptSchema = z.object({
  schemaVersion: z.literal('pi.capture-attempt.v1'),
  id: ImmutableIdSchema,
  idempotencyKeyHash: Sha256Schema,
  requestFingerprint: Sha256Schema,
  requestedUrl: z.string().url(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  state: CaptureStateSchema,
  events: z.array(CaptureStateEventSchema).min(2),
  redirects: z.array(AttemptRedirectSchema).default([]),
  sourceRevisionId: ImmutableIdSchema.optional(),
  extractionRevisionId: ImmutableIdSchema.optional(),
  outcomeReason: z.object({
    code: z.string().min(1).max(80),
    detail: z.string().min(1).max(500),
  }).readonly().optional(),
  failure: z.object({
    stage: z.enum(['policy', 'dns', 'transport', 'body', 'extraction', 'storage']),
    code: z.string().min(1).max(80),
    message: z.string().min(1).max(500),
  }).readonly().optional(),
}).superRefine((attempt, context) => {
  if (attempt.events[0]?.state !== 'queued') {
    context.addIssue({ code: 'custom', path: ['events', 0], message: 'Capture attempts must begin queued' });
  }
  for (let index = 1; index < attempt.events.length; index += 1) {
    const previous = attempt.events[index - 1].state;
    const current = attempt.events[index].state;
    if (!ALLOWED_TRANSITIONS[previous]?.includes(current)) {
      context.addIssue({ code: 'custom', path: ['events', index], message: `Invalid capture transition ${previous} -> ${current}` });
    }
  }
  if (attempt.events.at(-1)?.state !== attempt.state) {
    context.addIssue({ code: 'custom', path: ['state'], message: 'Final event must match attempt state' });
  }
  if (attempt.state === 'extracted' && (!attempt.sourceRevisionId || !attempt.extractionRevisionId)) {
    context.addIssue({ code: 'custom', path: ['state'], message: 'Extracted attempts require both immutable revisions' });
  }
  if (attempt.state === 'failed' && !attempt.failure) {
    context.addIssue({ code: 'custom', path: ['failure'], message: 'Failed attempts require failure details' });
  }
  if (attempt.state !== 'failed' && attempt.failure) {
    context.addIssue({ code: 'custom', path: ['failure'], message: 'Only failed attempts may carry failure details' });
  }
  if (['held', 'no_story'].includes(attempt.state) !== Boolean(attempt.outcomeReason)) {
    context.addIssue({ code: 'custom', path: ['outcomeReason'], message: 'Held and no-story outcomes require one structured reason' });
  }
}).readonly();

export const RedirectHopSchema = z.object({
  url: z.string().url(),
  status: z.number().int().min(300).max(399),
  location: z.string().min(1),
  resolvedAddresses: z.array(IpAddressSchema).min(1),
  selectedAddress: IpAddressSchema,
  remoteAddress: IpAddressSchema,
}).readonly();

export const SourceRevisionSchema = z.object({
  schemaVersion: z.literal('pi.source-revision.v1'),
  id: ImmutableIdSchema,
  attemptId: ImmutableIdSchema,
  requestedUrl: z.string().url(),
  canonicalUrl: z.string().url(),
  capturedAt: z.string().datetime(),
  status: z.number().int().min(200).max(299),
  mediaType: z.enum(['text/html', 'text/plain']),
  charset: z.enum(['utf-8', 'us-ascii']),
  contentEncoding: z.enum(['identity', 'gzip', 'deflate', 'br']),
  headers: z.record(z.string(), z.string()),
  redirects: z.array(RedirectHopSchema),
  resolvedAddresses: z.array(IpAddressSchema).min(1),
  selectedAddress: IpAddressSchema,
  remoteAddress: IpAddressSchema,
  wireBlobHash: Sha256Schema,
  contentBlobHash: Sha256Schema,
  wireBytes: z.number().int().nonnegative(),
  decodedBytes: z.number().int().nonnegative(),
}).readonly();

export const ExtractedBlockSchema = z.object({
  locator: z.string().regex(/^block:\d{6}$/),
  text: z.string().min(1),
  textHash: Sha256Schema,
}).readonly();

export const ExtractionRevisionSchema = z.object({
  schemaVersion: z.literal('pi.extraction-revision.v1'),
  id: ImmutableIdSchema,
  attemptId: ImmutableIdSchema,
  sourceRevisionId: ImmutableIdSchema,
  extractedAt: z.string().datetime(),
  extractorVersion: z.enum(['pi.parse5-text.v1', 'pi.parse5-text.v2']),
  sourceContentBlobHash: Sha256Schema,
  extractedTextBlobHash: Sha256Schema,
  blocks: z.array(ExtractedBlockSchema),
}).superRefine((revision, context) => {
  if (revision.extractorVersion === 'pi.parse5-text.v2') {
    if (revision.blocks.length > 256) context.addIssue({ code: 'custom', path: ['blocks'], message: 'Extractor v2 block limit exceeded' });
    revision.blocks.forEach((block, index) => {
      if (block.text.length > 4_000) context.addIssue({ code: 'custom', path: ['blocks', index, 'text'], message: 'Extractor v2 segment limit exceeded' });
    });
  }
}).readonly();

export const CaptureEvidenceLocatorSchema = z.object({
  sourceRevisionId: ImmutableIdSchema,
  extractionRevisionId: ImmutableIdSchema,
  locatorType: z.literal('extracted_block'),
  locator: z.string().regex(/^block:\d{6}$/),
  excerpt: z.string().min(1),
  excerptHash: Sha256Schema,
}).readonly();

export const CaptureRecordSchema = z.object({
  schemaVersion: z.literal('pi.capture-manifest.v1'),
  attempt: CaptureAttemptSchema,
  sourceRevision: SourceRevisionSchema.optional(),
  extractionRevision: ExtractionRevisionSchema.optional(),
}).superRefine((record, context) => {
  if (record.attempt.sourceRevisionId !== record.sourceRevision?.id) {
    context.addIssue({ code: 'custom', path: ['sourceRevision'], message: 'Source revision does not match attempt' });
  }
  if (record.attempt.extractionRevisionId !== record.extractionRevision?.id) {
    context.addIssue({ code: 'custom', path: ['extractionRevision'], message: 'Extraction revision does not match attempt' });
  }
  if (record.sourceRevision && record.sourceRevision.attemptId !== record.attempt.id) {
    context.addIssue({ code: 'custom', path: ['sourceRevision', 'attemptId'], message: 'Source revision belongs to a different attempt' });
  }
  if (record.sourceRevision && record.sourceRevision.requestedUrl !== record.attempt.requestedUrl) {
    context.addIssue({ code: 'custom', path: ['sourceRevision', 'requestedUrl'], message: 'Source revision request does not match attempt' });
  }
  if (record.extractionRevision && record.extractionRevision.attemptId !== record.attempt.id) {
    context.addIssue({ code: 'custom', path: ['extractionRevision', 'attemptId'], message: 'Extraction revision belongs to a different attempt' });
  }
  if (record.extractionRevision && record.extractionRevision.sourceRevisionId !== record.sourceRevision?.id) {
    context.addIssue({ code: 'custom', path: ['extractionRevision', 'sourceRevisionId'], message: 'Extraction revision belongs to a different source revision' });
  }
  if (record.extractionRevision && record.extractionRevision.sourceContentBlobHash !== record.sourceRevision?.contentBlobHash) {
    context.addIssue({ code: 'custom', path: ['extractionRevision', 'sourceContentBlobHash'], message: 'Extraction revision content does not match its source blob' });
  }
}).readonly();

export type CaptureState = z.infer<typeof CaptureStateSchema>;
export type CaptureStateEvent = z.infer<typeof CaptureStateEventSchema>;
export type CaptureAttempt = z.infer<typeof CaptureAttemptSchema>;
export type SourceRevision = z.infer<typeof SourceRevisionSchema>;
export type ExtractionRevision = z.infer<typeof ExtractionRevisionSchema>;
export type CaptureEvidenceLocator = z.infer<typeof CaptureEvidenceLocatorSchema>;
export type CaptureRecord = z.infer<typeof CaptureRecordSchema>;
