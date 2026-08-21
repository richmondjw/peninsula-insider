import { createHash } from 'node:crypto';
import {
  QuickNoteSchema,
  RealUrlContentLineageSchema,
  type Claim,
  type FoundryRun,
} from '../shared/contracts.js';
import type { CaptureRecord } from '../shared/capture-contracts.js';
import { resolveEvidenceLocator } from './capture/extractor.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function headlineFrom(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 140) return normalized;
  const shortened = normalized.slice(0, 137).replace(/\s+\S*$/, '').trim();
  return `${shortened || normalized.slice(0, 137)}...`;
}

type ReviewedSourceKind = 'web' | 'venue-site' | 'press' | 'social' | 'gov' | 'partner';

interface ArtifactSourceBinding {
  canonicalUrl: string;
  capturedAt: string;
  contentHash: string;
}

function addDays(value: string, days: number): string {
  return new Date(new Date(value).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function sourceSlug(url: string): string {
  const hostname = new URL(url).hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return hostname || 'captured-source';
}

export function buildRealUrlArtifactBinding(
  claims: Claim[],
  claimIds: string[],
  source: ArtifactSourceBinding,
  sourceKind?: ReviewedSourceKind,
) {
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  const selected = claimIds.map((claimId) => {
    const claim = claimsById.get(claimId);
    if (!claim || claim.restrictedFromArtifacts || !['supported', 'approved'].includes(claim.verification) || claim.evidence.length === 0) {
      throw new Error('Real URL copy may use only selected, supported and unrestricted immutable claims');
    }
    return claim;
  });
  const headline = selected[0] ? headlineFrom(selected[0].text) : 'Captured source requires human framing';
  const dek = `Captured from ${new URL(source.canonicalUrl).hostname} for evidence-led human review.`;
  const body = selected.length > 0
    ? selected.map((claim) => claim.text).join('\n\n')
    : 'No publishable draft was generated from this capture.';
  const systemSegment = (value: string) => ({ source: 'system_template' as const, textHash: hash(value) });
  const payload = QuickNoteSchema.parse({
    headline,
    dek,
    section: 'note',
    tag: 'editor-note',
    publishedAt: source.capturedAt,
    expiresAt: addDays(source.capturedAt, 7),
    sources: [{
      kind: sourceKind ?? 'unclassified-web',
      url: source.canonicalUrl,
      checkedAt: source.capturedAt,
    }],
    status: 'draft',
    body,
  });
  const targetPath = `next/src/content/quick-notes/${source.capturedAt.slice(0, 10)}-${sourceSlug(source.canonicalUrl)}-${source.contentHash.slice(0, 8)}.md`;
  const lineage = RealUrlContentLineageSchema.parse({
    schemaVersion: 'pi.real-url-content-lineage.v1',
    exportBindingHash: hash(JSON.stringify({ payload, targetPath, claimIds })),
    headline: {
      contentHash: hash(headline),
      segments: selected[0]
        ? [{ source: 'claim', claimId: selected[0].id, textHash: hash(headline) }]
        : [systemSegment(headline)],
    },
    dek: { contentHash: hash(dek), segments: [systemSegment(dek)] },
    body: {
      contentHash: hash(body),
      segments: selected.length > 0
        ? selected.map((claim) => ({ source: 'claim' as const, claimId: claim.id, textHash: hash(claim.text) }))
        : [systemSegment(body)],
    },
  });
  return { headline, dek, body, payload, targetPath, lineage };
}

export function assertRealUrlContentLineage(run: FoundryRun): void {
  if (!run.capture) return;
  const dependency = run.capture.revisions.find((revision) => revision.attemptId === run.capture?.artifactAttemptId);
  const source = dependency?.sourceRevision;
  if (!source || !run.artifact.contentLineage) throw new Error('Real URL artifact lineage is incomplete');
  const sourceReview = run.artifact.sourceReview;
  if (sourceReview && (JSON.stringify(sourceReview.confirmedClaimIds) !== JSON.stringify(run.artifact.claimIds)
      || JSON.stringify(run.angle.evidenceClaimIds) !== JSON.stringify(run.artifact.claimIds))) {
    throw new Error('Real URL source review is not bound to the selected claims');
  }
  const expected = buildRealUrlArtifactBinding(run.claims, run.artifact.claimIds, {
    canonicalUrl: source.canonicalUrl,
    capturedAt: source.capturedAt,
    contentHash: source.contentHash,
  }, sourceReview?.sourceKind);
  if (JSON.stringify(run.artifact.payload) !== JSON.stringify(expected.payload)
      || run.artifact.targetPath !== expected.targetPath
      || JSON.stringify(run.artifact.contentLineage) !== JSON.stringify(expected.lineage)) {
    throw new Error('Real URL artifact does not reproduce its immutable export binding');
  }
}

export function assertRealUrlArtifactAgainstCapture(run: FoundryRun, record: CaptureRecord): void {
  if (!run.capture) return;
  if (record.attempt.id !== run.capture.artifactAttemptId
      || record.attempt.state !== 'extracted'
      || !record.sourceRevision
      || !record.extractionRevision) {
    throw new Error('Patch export requires the exact immutable artifact capture');
  }
  const dependency = run.capture.revisions.find((revision) => revision.attemptId === run.capture?.artifactAttemptId);
  if (!dependency?.sourceRevision || !dependency.extractionRevision
      || dependency.requestFingerprint !== record.attempt.requestFingerprint
      || dependency.sourceRevision.id !== record.sourceRevision.id
      || dependency.sourceRevision.canonicalUrl !== record.sourceRevision.canonicalUrl
      || dependency.sourceRevision.capturedAt !== record.sourceRevision.capturedAt
      || dependency.sourceRevision.contentHash !== record.sourceRevision.contentBlobHash
      || dependency.extractionRevision.id !== record.extractionRevision.id
      || dependency.extractionRevision.contentHash !== record.extractionRevision.extractedTextBlobHash) {
    throw new Error('Patch metadata does not match the immutable source and extraction');
  }
  const claims = new Map(run.claims.map((claim) => [claim.id, claim]));
  for (const claimId of run.artifact.claimIds) {
    const claim = claims.get(claimId);
    if (!claim || claim.evidence.length !== 1) throw new Error('Exported claim lacks exact immutable evidence');
    const evidence = claim.evidence[0];
    if (evidence.locatorType !== 'extracted_block') throw new Error('Exported claim lacks an immutable extraction locator');
    const resolved = resolveEvidenceLocator(record.extractionRevision, {
      sourceRevisionId: evidence.sourceRevisionId ?? '',
      extractionRevisionId: evidence.extractionRevisionId ?? '',
      locatorType: 'extracted_block',
      locator: evidence.locator,
      excerpt: evidence.excerpt,
      excerptHash: evidence.excerptHash,
    });
    if (claim.text !== resolved
        || evidence.sourceItemId !== record.sourceRevision.id
        || evidence.capturedAt !== record.sourceRevision.capturedAt) {
      throw new Error('Exported claim cannot be reproduced from immutable evidence');
    }
  }
  assertRealUrlContentLineage(run);
}
