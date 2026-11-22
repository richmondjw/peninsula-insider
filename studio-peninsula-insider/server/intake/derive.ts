import type { ExtractionRevision, SourceRevision } from '../../shared/capture-contracts.js';
import { ClaimSchema, QuickNoteSchema, type Claim, type QuickNote } from '../../shared/contracts.js';
import type { CaptureRestriction } from '../../shared/intake-contracts.js';
import { houseCopyRestriction } from '../fixture-runner.js';
import { freshUntil } from './provenance.js';

/**
 * Derivation budget for one captured page. The caps keep an unexpectedly large page from
 * flooding the ledger, and every excluded block is reported back as a visible restriction
 * rather than silently dropped.
 */
export const DERIVATION_LIMITS = Object.freeze({
  minExcerptChars: 12,
  maxExcerptChars: 600,
  maxClaims: 24,
  maxCopyClaims: 3,
});

export interface DerivedSource {
  readonly claims: Claim[];
  readonly usableClaimIds: string[];
  readonly restrictions: CaptureRestriction[];
}

function restrictionSummary(counts: Map<CaptureRestriction['code'], number>): CaptureRestriction[] {
  const detail: Record<CaptureRestriction['code'], string> = {
    price_copy: 'Blocks held out of artifact copy because they contain pricing.',
    em_dash_copy: 'Blocks held out of artifact copy because they contain an em dash.',
    excerpt_too_short: 'Extracted blocks skipped as too short to carry a claim.',
    excerpt_too_long: 'Extracted blocks skipped as too long to quote as a single excerpt.',
    claim_budget: 'Extracted blocks beyond this capture’s claim budget.',
  };
  return [...counts.entries()]
    .filter(([, blockCount]) => blockCount > 0)
    .map(([code, blockCount]) => ({ code, detail: detail[code], blockCount }));
}

/**
 * Turns one immutable extraction revision into claims. Nothing is invented: a claim's text
 * and evidence excerpt are the extracted block verbatim, and the excerpt hash is the block
 * hash, so every claim stays reproducible from the stored revision.
 */
export function deriveSourceClaims(source: SourceRevision, extraction: ExtractionRevision): DerivedSource {
  const counts = new Map<CaptureRestriction['code'], number>();
  const bump = (code: CaptureRestriction['code']) => counts.set(code, (counts.get(code) ?? 0) + 1);
  const expiresAt = freshUntil(source.capturedAt);
  const claims: Claim[] = [];
  const usableClaimIds: string[] = [];

  for (const block of extraction.blocks) {
    if (block.text.length < DERIVATION_LIMITS.minExcerptChars) { bump('excerpt_too_short'); continue; }
    if (block.text.length > DERIVATION_LIMITS.maxExcerptChars) { bump('excerpt_too_long'); continue; }
    if (claims.length >= DERIVATION_LIMITS.maxClaims) { bump('claim_budget'); continue; }
    const restriction = houseCopyRestriction(block.text);
    if (restriction) bump(restriction.code);
    const claim = ClaimSchema.parse({
      id: `claim-${block.locator.replace(':', '-')}`,
      text: block.text,
      origin: 'external_fact',
      verification: 'supported',
      evidence: [{
        sourceItemId: source.id,
        locatorType: 'paragraph',
        locator: block.locator,
        excerpt: block.text,
        excerptHash: block.textHash,
        capturedAt: extraction.extractedAt,
      }],
      expiresAt,
      restrictedFromArtifacts: Boolean(restriction),
      restrictionReason: restriction?.reason,
    });
    claims.push(claim);
    if (!restriction) usableClaimIds.push(claim.id);
  }

  return { claims, usableClaimIds, restrictions: restrictionSummary(counts) };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > max * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/**
 * Assembles the quick-note draft from the unrestricted claims only. Copy is quoted or
 * word-boundary truncated from the captured text, never generated, and the note is a draft
 * with no machine-asserted human verification.
 */
export function deriveQuickNote(
  source: SourceRevision,
  claims: readonly Claim[],
  usableClaimIds: readonly string[],
): { payload: QuickNote; claimIds: string[] } | undefined {
  const byId = new Map(claims.map((claim) => [claim.id, claim]));
  const used = usableClaimIds.slice(0, DERIVATION_LIMITS.maxCopyClaims)
    .flatMap((id) => byId.get(id) ? [byId.get(id) as Claim] : []);
  if (used.length === 0) return undefined;
  const payload = QuickNoteSchema.parse({
    headline: truncate(used[0].text, 140),
    dek: used[1] ? truncate(used[1].text, 320) : undefined,
    section: 'note',
    tag: 'editor-note',
    publishedAt: source.capturedAt,
    expiresAt: freshUntil(source.capturedAt),
    sources: [{ kind: 'press', url: source.canonicalUrl, checkedAt: source.capturedAt }],
    status: 'draft',
    body: used.map((claim) => claim.text).join('\n\n'),
  });
  return { payload, claimIds: used.map((claim) => claim.id) };
}
