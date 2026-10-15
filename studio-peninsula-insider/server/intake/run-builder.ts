import type { CaptureRecord, ExtractionRevision, SourceRevision } from '../../shared/capture-contracts.js';
import {
  FoundryRunSchema,
  type Claim,
  type ClaimSetVersion,
  type FoundryRun,
  type QuickNote,
  type StoryAngle,
} from '../../shared/contracts.js';
import type { CaptureRestriction, SourceCapture } from '../../shared/intake-contracts.js';
import {
  angleDependency,
  bindClaimUsage,
  claimSetDependency,
  evaluateQuickNoteGates,
  hash,
  hashValue,
  QUICK_NOTE_RECIPE,
  withArtifactHash,
} from '../fixture-runner.js';
import { deriveQuickNote, deriveSourceClaims } from './derive.js';
import { captureProvenance } from './provenance.js';

export const NO_USABLE_CLAIMS = Object.freeze({
  code: 'no_usable_claim_text',
  detail: 'The capture succeeded but no extracted block could carry a usable claim, so no draft was created.',
});

export type CapturedSourceOutcome =
  | { readonly outcome: 'run'; readonly run: FoundryRun; readonly capture: SourceCapture }
  | { readonly outcome: 'no_story'; readonly capture: SourceCapture; readonly reason: typeof NO_USABLE_CLAIMS };

interface DerivedParts {
  readonly claims: Claim[];
  readonly claimIds: string[];
  readonly payload: QuickNote;
  readonly restrictions: CaptureRestriction[];
  readonly source: SourceRevision;
  readonly extraction: ExtractionRevision;
}

function requireRevisions(record: CaptureRecord): { source: SourceRevision; extraction: ExtractionRevision } {
  if (record.attempt.state !== 'extracted' || !record.sourceRevision || !record.extractionRevision) {
    throw new Error('Only an extracted capture with both immutable revisions can become a run');
  }
  return { source: record.sourceRevision, extraction: record.extractionRevision };
}

function derive(record: CaptureRecord): DerivedParts | { readonly restrictions: CaptureRestriction[] } {
  const { source, extraction } = requireRevisions(record);
  const { claims, usableClaimIds, restrictions } = deriveSourceClaims(source, extraction);
  const note = deriveQuickNote(source, claims, usableClaimIds);
  if (!note) return { restrictions };
  return { claims, claimIds: note.claimIds, payload: note.payload, restrictions, source, extraction };
}

function isDerived(value: DerivedParts | { restrictions: CaptureRestriction[] }): value is DerivedParts {
  return 'claims' in value;
}

function angleFor(claimIds: string[], version: number): StoryAngle {
  return {
    id: 'angle-captured-source',
    version,
    label: 'Captured source note',
    framing: 'A neutral quick note drawn only from text quoted from the captured source revision.',
    evidenceClaimIds: claimIds,
    selectedBy: 'url-capture-intake',
  };
}

function claimSetFor(id: string, version: number, claims: Claim[], capturedAt: string, lockedBy: string): ClaimSetVersion {
  return {
    schemaVersion: 'pi.claim-set.v1',
    id,
    version,
    contentHash: hashValue(claims),
    createdAt: capturedAt,
    lockedAt: capturedAt,
    lockedBy,
    claims,
  };
}

function sourceItemFor(source: SourceRevision) {
  return {
    id: source.id,
    kind: 'url' as const,
    uri: source.canonicalUrl,
    contentHash: source.contentBlobHash,
    capturedAt: source.capturedAt,
  };
}

function quickNoteArtifact(
  parts: DerivedParts,
  angle: StoryAngle,
  claimSet: ClaimSetVersion,
  artifactId: string,
  version: number,
) {
  return withArtifactHash({
    id: artifactId,
    key: 'quick-note',
    version,
    type: 'quick_note' as const,
    angleId: angle.id,
    angleVersion: angle.version,
    factualSegmentIds: ['quick-note-copy'],
    claimUsage: bindClaimUsage(parts.payload, [{ segmentId: 'quick-note-copy', path: '$', claimIds: parts.claimIds }]),
    claimIds: parts.claimIds,
    dependencies: [claimSetDependency(claimSet), angleDependency(angle)],
    payload: parts.payload,
    gateResults: evaluateQuickNoteGates(parts.payload, parts.claims, parts.claimIds, parts.source.capturedAt),
  });
}

export function capturedRunIdempotencyKey(attemptId: string): string {
  return `url-capture:${attemptId}`;
}

/**
 * Builds the first run for a captured source. The run reuses the shipped `quick_note_v1`
 * recipe, gate evaluation, review machinery and patch export unchanged; only the claim set
 * now comes from a real immutable capture instead of a frozen fixture.
 */
export function buildCapturedRun(
  record: CaptureRecord,
  submittedBy: string,
  submittedAt: string,
): CapturedSourceOutcome {
  const parts = derive(record);
  if (!isDerived(parts)) {
    return {
      outcome: 'no_story',
      capture: captureProvenance(record, { submittedBy, submittedAt, claimCount: 0, restrictions: parts.restrictions }),
      reason: NO_USABLE_CLAIMS,
    };
  }
  const capture = captureProvenance(record, {
    submittedBy,
    submittedAt,
    claimCount: parts.claims.length,
    restrictions: parts.restrictions,
  });
  const attemptId = record.attempt.id;
  const angle = angleFor(parts.claimIds, 1);
  const claimSet = claimSetFor(`claim-set-${attemptId}`, 1, parts.claims, parts.source.capturedAt, submittedBy);
  const artifact = quickNoteArtifact(parts, angle, claimSet, `artifact-quick-note-${attemptId}`, 1);
  const idempotencyKey = capturedRunIdempotencyKey(attemptId);
  const run = FoundryRunSchema.parse({
    schemaVersion: 'pi.foundry-run.v2',
    id: `run-${hash(idempotencyKey).slice(0, 12)}`,
    idempotencyKey,
    version: 1,
    status: 'ready_for_review',
    createdAt: parts.source.capturedAt,
    updatedAt: submittedAt,
    bundle: {
      schemaVersion: 'pi.intake-bundle.v1',
      id: `bundle-${attemptId}`,
      title: `Captured source ${new URL(parts.source.canonicalUrl).hostname}`,
      submittedBy,
      capturedAt: parts.source.capturedAt,
      sourceItems: [sourceItemFor(parts.source)],
    },
    recipe: QUICK_NOTE_RECIPE,
    claimSet,
    claims: parts.claims,
    angle,
    artifact,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v1',
      id: `pack-${hash(idempotencyKey).slice(0, 12)}`,
      version: 1,
      recipeId: QUICK_NOTE_RECIPE.id,
      recipeVersion: QUICK_NOTE_RECIPE.version,
      claimSetRef: claimSetDependency(claimSet),
      angleRef: { id: angle.id, version: angle.version },
      status: 'complete',
      completed: [artifact],
      failed: [],
      omitted: [],
      reviews: [],
    },
    blockers: [],
    captures: [capture],
    audit: [{
      at: submittedAt,
      actor: submittedBy,
      type: 'url_capture_ingested',
      detail: `Source revision ${parts.source.id} captured from ${parts.source.canonicalUrl} produced ${parts.claims.length} claims with no provider calls.`,
    }],
  });
  return { outcome: 'run', run, capture };
}

/**
 * Applies a refresh capture to an existing run. The previous source revision is never
 * mutated: a new immutable revision is appended, the claim set and angle move to the next
 * version, and the redrafted artifact leaves every prior review decision stale.
 */
export function refreshCapturedRun(
  previous: FoundryRun,
  record: CaptureRecord,
  submittedBy: string,
  submittedAt: string,
): CapturedSourceOutcome {
  const parts = derive(record);
  if (!isDerived(parts)) {
    return {
      outcome: 'no_story',
      capture: captureProvenance(record, { submittedBy, submittedAt, claimCount: 0, restrictions: parts.restrictions }),
      reason: NO_USABLE_CLAIMS,
    };
  }
  const priorArtifact = previous.artifactPack.completed.find((artifact) => artifact.type === 'quick_note');
  if (!priorArtifact) throw new Error('Only a quick-note capture run can be refreshed');
  const capture = captureProvenance(record, {
    submittedBy,
    submittedAt,
    claimCount: parts.claims.length,
    restrictions: parts.restrictions,
  });
  const angle = angleFor(parts.claimIds, previous.angle.version + 1);
  const claimSet = claimSetFor(
    previous.claimSet.id,
    previous.claimSet.version + 1,
    parts.claims,
    parts.source.capturedAt,
    submittedBy,
  );
  const artifact = quickNoteArtifact(parts, angle, claimSet, priorArtifact.id, priorArtifact.version + 1);
  const run = FoundryRunSchema.parse({
    ...previous,
    version: previous.version + 1,
    updatedAt: submittedAt,
    bundle: {
      ...previous.bundle,
      capturedAt: parts.source.capturedAt,
      sourceItems: [sourceItemFor(parts.source)],
    },
    claimSet,
    claims: parts.claims,
    angle,
    artifact,
    artifactPack: {
      ...previous.artifactPack,
      version: previous.artifactPack.version + 1,
      claimSetRef: claimSetDependency(claimSet),
      angleRef: { id: angle.id, version: angle.version },
      status: 'complete',
      completed: [artifact],
      // Prior decisions are retained and read-time reconciliation marks them stale.
      reviews: previous.artifactPack.reviews,
    },
    captures: [...(previous.captures ?? []), capture],
    audit: [...previous.audit, {
      at: submittedAt,
      actor: submittedBy,
      type: 'url_capture_refreshed',
      detail: `Source revision ${parts.source.id} replaced revision ${previous.captures?.at(-1)?.sourceRevisionId ?? 'unknown'}; claim set moved to version ${claimSet.version} and every dependent review decision is stale.`,
    }],
  });
  return { outcome: 'run', run, capture };
}
