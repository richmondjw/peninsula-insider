import { createHash } from 'node:crypto';
import {
  CaptureRevisionSummarySchema,
  ClaimSchema,
  FoundryRunSchema,
  type CaptureRevisionSummary,
  type Claim,
  type FoundryRun,
} from '../shared/contracts.js';
import type { CaptureRecord } from '../shared/capture-contracts.js';
import { containsEmDash, containsPriceLanguage } from '../shared/editorial-laws.js';
import { createEvidenceLocator } from './capture/extractor.js';
import { evaluateQuickNoteGates } from './fixture-runner.js';
import { buildRealUrlArtifactBinding } from './real-url-lineage.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const PROMPT_PATTERN = /\b(?:ignore (?:all|any|the) previous instructions|system prompt|developer message|assistant:)\b/i;
const MAX_CLAIMS = 12;

function restrictionFor(text: string): string | undefined {
  if (containsPriceLanguage(text)) return 'PI outputs do not publish prices.';
  if (containsEmDash(text)) return 'PI outputs do not publish em dashes.';
  if (PROMPT_PATTERN.test(text)) return 'Instruction-like source text remains inert and is held from artifacts.';
  return undefined;
}

function staleReviewHistory(run: FoundryRun, supersededByAttemptId: string, staledAt: string) {
  const history = run.reviewHistory.map((entry) => entry.validity === 'current' ? {
    ...entry,
    validity: 'stale' as const,
    staledAt,
    supersededByAttemptId,
    staleReason: 'source_refreshed' as const,
  } : entry);
  if (run.review && !history.some((entry) => entry.validity === 'stale'
    && entry.decidedAt === run.review?.decidedAt && entry.reviewer === run.review?.reviewer)) {
    history.push({
      ...run.review,
      validity: 'stale',
      staledAt,
      supersededByAttemptId,
      staleReason: 'source_refreshed',
    });
  }
  return history;
}

export function summarizeCapture(record: CaptureRecord): CaptureRevisionSummary {
  const source = record.sourceRevision;
  const extraction = record.extractionRevision;
  const restrictedBlocks = extraction?.blocks.filter((block) => restrictionFor(block.text)).length ?? 0;
  const restrictions = [
    'HTTPS on port 443 only; private and special-use destinations are blocked.',
    'Only inert text extraction is retained; scripts and subresources are never executed or fetched.',
    'Extraction is bounded to 256 text segments and 4,000 characters per segment.',
    'Every stored query value is redacted from operator-visible URLs.',
    ...(restrictedBlocks > 0 ? [`${restrictedBlocks} extracted block${restrictedBlocks === 1 ? ' was' : 's were'} held from draft generation.`] : []),
  ];
  return CaptureRevisionSummarySchema.parse({
    attemptId: record.attempt.id,
    requestFingerprint: record.attempt.requestFingerprint,
    requestedUrl: record.attempt.requestedUrl,
    state: record.attempt.state,
    createdAt: record.attempt.createdAt,
    completedAt: record.attempt.completedAt,
    events: record.attempt.events.map(({ state, at }) => ({ state, at })),
    redirects: record.attempt.redirects,
    outcomeReason: record.attempt.outcomeReason ? { code: record.attempt.outcomeReason.code } : undefined,
    failure: record.attempt.failure ? { stage: record.attempt.failure.stage, code: record.attempt.failure.code } : undefined,
    sourceRevision: source ? {
      id: source.id,
      canonicalUrl: source.canonicalUrl,
      capturedAt: source.capturedAt,
      status: source.status,
      mediaType: source.mediaType,
      charset: source.charset,
      contentEncoding: source.contentEncoding,
      redirects: source.redirects.map((redirect) => ({
        url: redirect.url,
        status: redirect.status,
        location: redirect.location,
      })),
      contentHash: source.contentBlobHash,
      wireBytes: source.wireBytes,
      decodedBytes: source.decodedBytes,
    } : undefined,
    extractionRevision: extraction ? {
      id: extraction.id,
      extractedAt: extraction.extractedAt,
      extractorVersion: extraction.extractorVersion,
      contentHash: extraction.extractedTextBlobHash,
      blockCount: extraction.blocks.length,
    } : undefined,
    restrictions,
  });
}

export function deriveRealUrlClaims(record: CaptureRecord): Claim[] {
  if (!record.sourceRevision || !record.extractionRevision) return [];
  return ClaimSchema.array().parse(record.extractionRevision.blocks.slice(0, MAX_CLAIMS).map((block, index) => {
    const evidence = createEvidenceLocator(record.extractionRevision!, block.locator);
    const restrictionReason = restrictionFor(block.text);
    return {
      id: `claim-${hash(`${record.extractionRevision!.id}:${block.locator}`).slice(0, 20)}`,
      text: block.text,
      origin: 'external_fact',
      verification: 'supported',
      evidence: [{
        sourceItemId: record.sourceRevision!.id,
        sourceRevisionId: evidence.sourceRevisionId,
        extractionRevisionId: evidence.extractionRevisionId,
        locatorType: evidence.locatorType,
        locator: evidence.locator,
        excerpt: evidence.excerpt,
        excerptHash: evidence.excerptHash,
        capturedAt: record.sourceRevision!.capturedAt,
      }],
      restrictedFromArtifacts: Boolean(restrictionReason),
      restrictionReason,
      order: index,
    };
  }));
}

export function buildRealUrlRun(
  record: CaptureRecord,
  actor: string,
  workflowIdempotencyKey: string,
): FoundryRun {
  if (record.attempt.state !== 'extracted' || !record.sourceRevision || !record.extractionRevision) {
    throw new Error('Only extracted captures can create a Foundry run');
  }
  const summary = summarizeCapture(record);
  const claims = deriveRealUrlClaims(record);
  const usableClaims = claims.filter((claim) => !claim.restrictedFromArtifacts).slice(0, 3);
  const selectedClaims = usableClaims.length > 0 ? usableClaims : claims.slice(0, 1);
  const blockers = usableClaims.length > 0 ? [] : ['No extracted block is safe for artifact generation; inspect restrictions and edit from verified evidence.'];
  const capturedAt = record.sourceRevision.capturedAt;
  const claimIds = usableClaims.map((claim) => claim.id);
  const bound = buildRealUrlArtifactBinding(claims, claimIds, {
    canonicalUrl: record.sourceRevision.canonicalUrl,
    capturedAt,
    contentHash: record.sourceRevision.contentBlobHash,
  });
  const payload = bound.payload;
  const gateResults = evaluateQuickNoteGates(payload, claims, claimIds, { requireSourceReview: true, sourceReviewComplete: false });

  return FoundryRunSchema.parse({
    id: `run-${hash(record.attempt.id).slice(0, 24)}`,
    idempotencyKey: workflowIdempotencyKey,
    version: 1,
    status: blockers.length > 0 || gateResults.some((gate) => !gate.passed) ? 'needs_revision' : 'ready_for_review',
    createdAt: record.attempt.createdAt,
    updatedAt: record.attempt.completedAt,
    bundle: {
      schemaVersion: 'pi.intake-bundle.v1',
      id: `bundle-${record.sourceRevision.id}`,
      title: `Captured source: ${new URL(record.sourceRevision.canonicalUrl).hostname}`,
      submittedBy: actor,
      capturedAt,
      sourceItems: [{
        id: record.sourceRevision.id,
        kind: 'url',
        uri: record.sourceRevision.canonicalUrl,
        contentHash: record.sourceRevision.contentBlobHash,
        capturedAt,
      }],
    },
    claims,
    angle: {
      id: `angle-${record.extractionRevision.id}`,
      label: 'Source-led quick note',
      framing: 'A bounded first draft assembled from source assertions in the current immutable extraction; independent verification remains a human decision.',
      evidenceClaimIds: selectedClaims.map((claim) => claim.id),
      selectedBy: 'deterministic-real-url-policy',
    },
    artifact: {
      id: `artifact-${hash(record.attempt.id).slice(0, 20)}`,
      version: 1,
      type: 'quick_note',
      targetPath: bound.targetPath,
      claimIds,
      angleId: `angle-${record.extractionRevision.id}`,
      payload,
      contentLineage: bound.lineage,
      gateResults,
    },
    blockers,
    capture: {
      mode: 'real_url',
      currentAttemptId: record.attempt.id,
      artifactAttemptId: record.attempt.id,
      revisions: [summary],
    },
    audit: [{
      at: record.attempt.completedAt,
      actor,
      type: 'real_url_capture_created',
      detail: `Created a draft from immutable attempt ${record.attempt.id}; source HTML remained inert.`,
    }],
  });
}

export function refreshRealUrlRun(run: FoundryRun, record: CaptureRecord, actor: string): FoundryRun {
  if (!run.capture) throw new Error('Only real URL runs can be refreshed');
  if (run.capture.currentAttemptId === record.attempt.id) return run;
  const refreshed = buildRealUrlRun(record, actor, run.idempotencyKey);
  const staledAt = record.attempt.completedAt;
  return FoundryRunSchema.parse({
    ...refreshed,
    id: run.id,
    idempotencyKey: run.idempotencyKey,
    version: run.version + 1,
    createdAt: run.createdAt,
    updatedAt: staledAt,
    artifact: {
      ...refreshed.artifact,
      id: run.artifact.id,
      version: run.artifact.version + 1,
      targetPath: refreshed.artifact.targetPath,
    },
    capture: {
      mode: 'real_url',
      currentAttemptId: record.attempt.id,
      artifactAttemptId: record.attempt.id,
      revisions: [...run.capture.revisions, summarizeCapture(record)],
    },
    review: undefined,
    reviewHistory: staleReviewHistory(run, record.attempt.id, staledAt),
    audit: [...run.audit, {
      at: staledAt,
      actor,
      type: 'source_refreshed',
      detail: `Source refresh created immutable attempt ${record.attempt.id}; every dependent review decision was invalidated.`,
    }],
  });
}

export function staleRealUrlRunForNoStory(run: FoundryRun, record: CaptureRecord, actor: string): FoundryRun {
  if (!run.capture) throw new Error('Only real URL runs can be refreshed');
  if (record.attempt.state !== 'no_story' || !record.sourceRevision || !record.extractionRevision) {
    throw new Error('No-story staleness requires a complete immutable source and extraction revision');
  }
  if (run.capture.currentAttemptId === record.attempt.id) return run;
  const staledAt = record.attempt.completedAt;
  const blocker = 'The refreshed source contained no extractable story text; the prior artifact remains visible but is stale.';
  return FoundryRunSchema.parse({
    ...run,
    version: run.version + 1,
    status: 'needs_revision',
    updatedAt: staledAt,
    blockers: [...new Set([...run.blockers, blocker])],
    capture: {
      ...run.capture,
      currentAttemptId: record.attempt.id,
      revisions: [...run.capture.revisions, summarizeCapture(record)],
    },
    review: undefined,
    reviewHistory: staleReviewHistory(run, record.attempt.id, staledAt),
    audit: [...run.audit, {
      at: staledAt,
      actor,
      type: 'source_refreshed_no_story',
      detail: `Source head advanced to no-story attempt ${record.attempt.id}; every dependent review decision was invalidated.`,
    }],
  });
}
