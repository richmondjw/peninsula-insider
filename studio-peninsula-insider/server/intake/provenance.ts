import {
  CAPTURE_FRESHNESS_DAYS,
  SourceCaptureSchema,
  type CaptureRestriction,
  type SourceCapture,
} from '../../shared/intake-contracts.js';
import type { CaptureRecord } from '../../shared/capture-contracts.js';

/**
 * Best-effort redaction for a submission the sealed kernel refused before it produced an
 * attempt. Credentials and query values never reach the audit ledger; an unparsable
 * submission is recorded with no URL at all rather than echoed back verbatim.
 */
export function auditUrl(raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  url.username = '';
  url.password = '';
  url.hash = '';
  for (const name of [...new Set(url.searchParams.keys())]) url.searchParams.set(name, '[redacted]');
  return url.href.slice(0, 2048);
}

export function freshUntil(capturedAt: string): string {
  return new Date(new Date(capturedAt).getTime() + CAPTURE_FRESHNESS_DAYS * 86_400_000).toISOString();
}

/**
 * Projects one immutable capture manifest into the display-safe provenance the reviewer
 * sees. Response bodies are deliberately absent: only hashes, headers the kernel already
 * allow-listed, the redirect chain and the safe failure code cross this boundary.
 */
export function captureProvenance(
  record: CaptureRecord,
  context: {
    readonly submittedBy: string;
    readonly submittedAt: string;
    readonly claimCount?: number;
    readonly restrictions?: readonly CaptureRestriction[];
  },
): SourceCapture {
  const { attempt, sourceRevision, extractionRevision } = record;
  return SourceCaptureSchema.parse({
    schemaVersion: 'pi.source-capture.v1',
    attemptId: attempt.id,
    state: attempt.state,
    requestedUrl: attempt.requestedUrl,
    canonicalUrl: sourceRevision?.canonicalUrl,
    submittedBy: context.submittedBy,
    submittedAt: context.submittedAt,
    capturedAt: sourceRevision?.capturedAt,
    freshUntil: sourceRevision ? freshUntil(sourceRevision.capturedAt) : undefined,
    sourceRevisionId: attempt.sourceRevisionId,
    extractionRevisionId: attempt.extractionRevisionId,
    httpStatus: sourceRevision?.status,
    mediaType: sourceRevision?.mediaType,
    charset: sourceRevision?.charset,
    contentEncoding: sourceRevision?.contentEncoding,
    redirects: (sourceRevision?.redirects ?? []).map((hop) => ({ from: hop.url, status: hop.status, to: hop.location })),
    responseHeaders: sourceRevision?.headers ?? {},
    extractedBlockCount: extractionRevision?.blocks.length ?? 0,
    claimCount: context.claimCount ?? 0,
    restrictions: context.restrictions ?? [],
    contentBlobHash: sourceRevision?.contentBlobHash,
    extractedTextBlobHash: extractionRevision?.extractedTextBlobHash,
    wireBytes: sourceRevision?.wireBytes,
    decodedBytes: sourceRevision?.decodedBytes,
    outcomeReason: attempt.outcomeReason,
    failure: attempt.failure,
  });
}
