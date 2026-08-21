import { z } from 'zod';

export const EvidenceLocatorSchema = z.object({
  sourceItemId: z.string().min(1),
  locatorType: z.enum(['selector', 'paragraph', 'timecode', 'manual']),
  locator: z.string().min(1),
  excerpt: z.string().min(1),
  excerptHash: z.string().regex(/^[a-f0-9]{64}$/),
  capturedAt: z.string().datetime(),
});

export const SourceItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['url', 'text_note', 'audio_note', 'image', 'document']),
  uri: z.string().url().optional(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  capturedAt: z.string().datetime(),
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
    kind: z.enum(['venue-site', 'phone', 'email', 'visit', 'press', 'social', 'gov', 'partner']),
    url: z.string().url().optional(),
    note: z.string().optional(),
    checkedAt: z.string().datetime().optional(),
  })),
  status: z.literal('draft'),
  body: z.string().min(1),
});

export const ArtifactSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  type: z.literal('quick_note'),
  claimIds: z.array(z.string()),
  angleId: z.string().min(1),
  payload: QuickNoteSchema,
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
  headline: z.string().min(1).max(140),
  dek: z.string().max(320).optional(),
  body: z.string().min(1),
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
  status: z.enum(['ready_for_review', 'accepted', 'rejected', 'failed']),
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
  }).optional(),
  audit: z.array(AuditEventSchema),
});

export type FoundryRun = z.infer<typeof FoundryRunSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type ArtifactEdit = z.infer<typeof ArtifactEditSchema>;
