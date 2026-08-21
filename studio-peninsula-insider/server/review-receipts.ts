import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import {
  ArtifactVersionSchema,
  ClaimSetVersionSchema,
  SourceConfirmationSchema,
  StoryAngleSchema,
  type ArtifactVersion,
  type FoundryRun,
  type LegacySingleArtifactRealUrlRunV2,
  type ReviewDecision,
} from '../shared/contracts.js';
import { hashValue } from './fixture-runner.js';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const LegacyReviewReceiptV1Schema = z.object({
  schemaVersion: z.literal('pi.review-receipt.v1'),
  runId: z.string().min(1), runVersion: z.number().int().positive(),
  artifactId: z.string().min(1), artifactVersion: z.number().int().positive(),
  decision: z.enum(['accepted', 'rejected']), reviewer: z.string().min(1), note: z.string().optional(), decidedAt: z.string().datetime(),
  dependency: z.union([
    z.object({
      mode: z.literal('real_url'), currentAttemptId: z.string().min(1), artifactAttemptId: z.string().min(1),
      requestFingerprint: Sha256Schema, sourceRevisionId: z.string().min(1), extractionRevisionId: z.string().min(1),
    }),
    z.object({ mode: z.literal('fixture'), sourceItems: z.array(z.unknown()) }),
  ]),
  claimIds: z.array(z.string()), sourceReview: z.unknown().nullable(), angle: z.unknown(), payload: z.unknown(),
  contentLineage: z.unknown().nullable(), targetPath: z.string().nullable(), gateResults: z.array(z.unknown()), blockers: z.array(z.string()),
});

export const ArtifactReviewReceiptSchema = z.object({
  schemaVersion: z.literal('pi.review-receipt.v2'),
  runId: z.string().min(1), runVersion: z.number().int().positive(),
  artifactPackId: z.string().min(1), artifactPackVersion: z.number().int().positive(),
  artifact: ArtifactVersionSchema,
  decision: z.enum(['accepted', 'rejected']), reviewer: z.string().min(1), note: z.string().optional(), decidedAt: z.string().datetime(),
  evaluationAsOf: z.string().datetime(),
  claimSet: ClaimSetVersionSchema,
  angle: StoryAngleSchema,
  sourceConfirmation: SourceConfirmationSchema.nullable(),
  capture: z.object({
    currentAttemptId: z.string().min(1), artifactAttemptId: z.string().min(1), requestFingerprint: Sha256Schema,
    sourceRevisionId: z.string().min(1), extractionRevisionId: z.string().min(1),
  }).nullable(),
  targetContract: z.string().min(1),
  handoffBindingHash: Sha256Schema,
  patchBindingHash: Sha256Schema.nullable(),
  blockers: z.array(z.string()),
});

export const ReviewReceiptSchema = z.union([LegacyReviewReceiptV1Schema, ArtifactReviewReceiptSchema]);
export type ReviewReceipt = z.infer<typeof ReviewReceiptSchema>;
export type ArtifactReviewReceipt = z.infer<typeof ArtifactReviewReceiptSchema>;

const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

function contained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return !pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot);
}

function artifactPatchBinding(artifact: ArtifactVersion): string | null {
  if (artifact.type === 'quick_note') return hashValue({ type: artifact.type, id: artifact.id, version: artifact.version, payload: artifact.payload });
  if (artifact.type === 'article_draft') return hashValue({ type: artifact.type, id: artifact.id, version: artifact.version, slug: artifact.payload.slug, body: artifact.payload.body });
  if (artifact.type === 'article_metadata' && artifact.payload.astroPatchReady) {
    return hashValue({ type: artifact.type, id: artifact.id, version: artifact.version, payload: artifact.payload });
  }
  return null;
}

export function buildArtifactReviewReceipt(
  run: FoundryRun,
  artifact: ArtifactVersion,
  input: Pick<ReviewDecision, 'decision' | 'reviewer' | 'note'> & { decidedAt: string; runVersion?: number; packVersion?: number; evaluationAsOf?: string },
): ArtifactReviewReceipt {
  const captureRevision = run.capture?.revisions.find((revision) => revision.attemptId === run.capture?.artifactAttemptId);
  const requirement = run.recipe.artifacts.find((candidate) => candidate.key === artifact.key);
  if (!requirement) throw new Error('Artifact is not declared by the locked recipe');
  const handoffSnapshot = {
    runId: run.id,
    artifactPackId: run.artifactPack.id,
    artifact,
    evaluationAsOf: input.evaluationAsOf ?? run.evaluationAsOf,
    claimSet: run.claimSet,
    angle: run.angle,
    sourceConfirmation: run.sourceConfirmation ?? null,
    targetContract: requirement.targetContract,
  };
  return ArtifactReviewReceiptSchema.parse({
    schemaVersion: 'pi.review-receipt.v2',
    runId: run.id,
    runVersion: input.runVersion ?? run.version,
    artifactPackId: run.artifactPack.id,
    artifactPackVersion: input.packVersion ?? run.artifactPack.version,
    artifact,
    decision: input.decision,
    reviewer: input.reviewer,
    note: input.note,
    decidedAt: input.decidedAt,
    evaluationAsOf: input.evaluationAsOf ?? run.evaluationAsOf,
    claimSet: run.claimSet,
    angle: run.angle,
    sourceConfirmation: run.sourceConfirmation ?? null,
    capture: run.capture ? {
      currentAttemptId: run.capture.currentAttemptId,
      artifactAttemptId: run.capture.artifactAttemptId,
      requestFingerprint: captureRevision!.requestFingerprint,
      sourceRevisionId: captureRevision!.sourceRevision!.id,
      extractionRevisionId: captureRevision!.extractionRevision!.id,
    } : null,
    targetContract: requirement.targetContract,
    handoffBindingHash: hashValue(handoffSnapshot),
    patchBindingHash: artifactPatchBinding(artifact),
    blockers: run.blockers,
  });
}

export function buildLegacyReviewReceipt(run: LegacySingleArtifactRealUrlRunV2, review = run.review) {
  if (!review) throw new Error('Legacy current review is unavailable');
  const revision = run.capture?.revisions.find((candidate) => candidate.attemptId === run.capture?.artifactAttemptId);
  return LegacyReviewReceiptV1Schema.parse({
    schemaVersion: 'pi.review-receipt.v1', runId: run.id, runVersion: run.version - 1,
    artifactId: run.artifact.id, artifactVersion: run.artifact.version,
    decision: review.decision, reviewer: review.reviewer, note: review.note, decidedAt: review.decidedAt,
    dependency: run.capture ? {
      mode: 'real_url', currentAttemptId: run.capture.currentAttemptId, artifactAttemptId: run.capture.artifactAttemptId,
      requestFingerprint: revision!.requestFingerprint, sourceRevisionId: revision!.sourceRevision!.id,
      extractionRevisionId: revision!.extractionRevision!.id,
    } : { mode: 'fixture', sourceItems: run.bundle.sourceItems },
    claimIds: run.artifact.claimIds,
    sourceReview: run.artifact.sourceReview ?? null,
    angle: run.angle,
    payload: run.artifact.payload,
    contentLineage: run.artifact.contentLineage ?? null,
    targetPath: run.artifact.targetPath ?? null,
    gateResults: run.artifact.gateResults,
    blockers: run.blockers,
  });
}

export class FileReviewReceiptRepository {
  private readonly root: string;

  constructor(root: string, allowedRoot: string) {
    this.root = resolve(root);
    const resolvedAllowedRoot = resolve(allowedRoot);
    if (!contained(resolvedAllowedRoot, this.root)) throw new Error('Review receipt root escaped the configured data root');
  }

  private pathFor(hash: string): string { return resolve(this.root, `${Sha256Schema.parse(hash)}.json`); }

  private async syncRoot(): Promise<void> {
    let handle;
    try { handle = await open(this.root, 'r'); await handle.sync(); }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['EACCES', 'EINVAL', 'EISDIR', 'ENOTSUP', 'EPERM'].includes(code ?? '')) throw error;
    } finally { await handle?.close().catch(() => undefined); }
  }

  async put(receipt: ReviewReceipt): Promise<string> {
    const parsed = ReviewReceiptSchema.parse(receipt);
    const bytes = `${JSON.stringify(parsed)}\n`;
    const receiptHash = digest(bytes);
    await mkdir(this.root, { recursive: true });
    const realRoot = await realpath(this.root);
    if (realRoot !== this.root) throw new Error('Review receipt root must not traverse a link');
    const path = this.pathFor(receiptHash);
    let handle;
    try {
      handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      await handle.writeFile(bytes, 'utf8'); await handle.sync(); await handle.close(); handle = undefined;
      await this.syncRoot();
      return receiptHash;
    } catch (error) {
      await handle?.close().catch(() => undefined);
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await this.get(receiptHash);
      if (!existing || `${JSON.stringify(existing)}\n` !== bytes) throw new Error('Review receipt hash collision');
      return receiptHash;
    }
  }

  async get(receiptHash: string): Promise<ReviewReceipt | undefined> {
    const path = this.pathFor(receiptHash);
    try {
      const metadata = await lstat(path);
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) throw new Error('Review receipt must be a private regular file');
      const [realRoot, realFile] = await Promise.all([realpath(this.root), realpath(path)]);
      if (realRoot !== this.root) throw new Error('Review receipt root must not traverse a link');
      if (!contained(realRoot, realFile)) throw new Error('Review receipt escaped its repository root');
      const bytes = await readFile(realFile, 'utf8');
      if (digest(bytes) !== receiptHash) throw new Error('Review receipt content hash mismatch');
      return ReviewReceiptSchema.parse(JSON.parse(bytes));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }
}

export function assertArtifactReceiptMatchesCurrentRun(run: FoundryRun, artifact: ArtifactVersion, receipt: ReviewReceipt): void {
  if (receipt.schemaVersion !== 'pi.review-receipt.v2') throw new Error('A migrated legacy receipt cannot authorise a current artifact');
  const review = run.artifactPack.reviews.find((candidate) => candidate.artifactId === artifact.id && candidate.status === 'current');
  if (!review) throw new Error('Current artifact review is unavailable');
  const expected = buildArtifactReviewReceipt(run, artifact, {
    decision: review.decision, reviewer: review.reviewer, note: review.note, decidedAt: review.decidedAt,
    runVersion: review.reviewedRunVersion, packVersion: review.reviewedArtifactPackVersion, evaluationAsOf: review.evaluationAsOf,
  });
  if (JSON.stringify(expected) !== JSON.stringify(receipt)) throw new Error('Current review receipt does not match the exact artifact snapshot');
}
