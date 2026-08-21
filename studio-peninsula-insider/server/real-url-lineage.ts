import type { CaptureRecord } from '../shared/capture-contracts.js';
import type { FoundryRun } from '../shared/contracts.js';
import { resolveEvidenceLocator } from './capture/extractor.js';
import { assertArtifactPublicLineage } from './fixture-runner.js';

export function assertRealUrlContentLineage(run: FoundryRun): void {
  if (!run.capture) return;
  for (const artifact of run.artifactPack.completed) {
    assertArtifactPublicLineage(artifact, run.claimSet.claims);
  }
}

export function assertRealUrlArtifactAgainstCapture(run: FoundryRun, record: CaptureRecord): void {
  if (!run.capture) return;
  if (record.attempt.id !== run.capture.artifactAttemptId
      || record.attempt.state !== 'extracted'
      || !record.sourceRevision
      || !record.extractionRevision) {
    throw new Error('Export requires the exact immutable artifact capture');
  }
  const summary = run.capture.revisions.find((revision) => revision.attemptId === record.attempt.id);
  if (!summary?.sourceRevision || !summary.extractionRevision
      || summary.requestFingerprint !== record.attempt.requestFingerprint
      || summary.sourceRevision.id !== record.sourceRevision.id
      || summary.sourceRevision.contentHash !== record.sourceRevision.contentBlobHash
      || summary.extractionRevision.id !== record.extractionRevision.id
      || summary.extractionRevision.contentHash !== record.extractionRevision.extractedTextBlobHash) {
    throw new Error('Run capture metadata does not match the immutable source and extraction');
  }
  for (const claim of run.claimSet.claims) {
    for (const evidence of claim.evidence) {
      if (evidence.locatorType !== 'extracted_block') continue;
      const resolved = resolveEvidenceLocator(record.extractionRevision, {
        sourceRevisionId: evidence.sourceRevisionId ?? '',
        extractionRevisionId: evidence.extractionRevisionId ?? '',
        locatorType: 'extracted_block',
        locator: evidence.locator,
        excerpt: evidence.excerpt,
        excerptHash: evidence.excerptHash,
      });
      if (claim.text !== resolved || evidence.sourceItemId !== record.sourceRevision.id || evidence.capturedAt !== record.sourceRevision.capturedAt) {
        throw new Error('Claim cannot be reproduced from immutable evidence');
      }
    }
  }
  assertRealUrlContentLineage(run);
}
