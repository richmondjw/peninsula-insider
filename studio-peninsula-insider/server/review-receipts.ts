import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import type { FoundryRun, ReviewDecision } from '../shared/contracts.js';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

const ReviewReceiptSchema = z.object({
  schemaVersion: z.literal('pi.review-receipt.v1'),
  runId: z.string().min(1),
  runVersion: z.number().int().positive(),
  artifactId: z.string().min(1),
  artifactVersion: z.number().int().positive(),
  decision: z.enum(['accepted', 'rejected']),
  reviewer: z.string().min(1),
  note: z.string().optional(),
  decidedAt: z.string().datetime(),
  dependency: z.union([
    z.object({
      mode: z.literal('real_url'),
      currentAttemptId: z.string().min(1),
      artifactAttemptId: z.string().min(1),
      requestFingerprint: Sha256Schema,
      sourceRevisionId: z.string().min(1),
      extractionRevisionId: z.string().min(1),
    }),
    z.object({
      mode: z.literal('fixture'),
      sourceItems: z.array(z.unknown()),
    }),
  ]),
  claimIds: z.array(z.string()),
  sourceReview: z.unknown().nullable(),
  angle: z.unknown(),
  payload: z.unknown(),
  contentLineage: z.unknown().nullable(),
  targetPath: z.string().nullable(),
  gateResults: z.array(z.unknown()),
  blockers: z.array(z.string()),
});

export type ReviewReceipt = z.infer<typeof ReviewReceiptSchema>;

const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

function contained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return !pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot);
}

export function buildReviewReceipt(
  run: FoundryRun,
  input: Pick<ReviewDecision, 'decision' | 'reviewer' | 'note'> & { decidedAt: string; runVersion?: number },
): ReviewReceipt {
  const artifactRevision = run.capture?.revisions.find((revision) => revision.attemptId === run.capture?.artifactAttemptId);
  const dependency = run.capture ? {
    mode: 'real_url' as const,
    currentAttemptId: run.capture.currentAttemptId,
    artifactAttemptId: run.capture.artifactAttemptId,
    requestFingerprint: artifactRevision!.requestFingerprint,
    sourceRevisionId: artifactRevision!.sourceRevision!.id,
    extractionRevisionId: artifactRevision!.extractionRevision!.id,
  } : {
    mode: 'fixture' as const,
    sourceItems: run.bundle.sourceItems,
  };
  return ReviewReceiptSchema.parse({
    schemaVersion: 'pi.review-receipt.v1',
    runId: run.id,
    runVersion: input.runVersion ?? run.version,
    artifactId: run.artifact.id,
    artifactVersion: run.artifact.version,
    decision: input.decision,
    reviewer: input.reviewer,
    note: input.note,
    decidedAt: input.decidedAt,
    dependency,
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

  private pathFor(hash: string): string {
    return resolve(this.root, `${Sha256Schema.parse(hash)}.json`);
  }

  private async syncRoot(): Promise<void> {
    let handle;
    try {
      handle = await open(this.root, 'r');
      await handle.sync();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['EACCES', 'EINVAL', 'EISDIR', 'ENOTSUP', 'EPERM'].includes(code ?? '')) throw error;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  async put(receipt: ReviewReceipt): Promise<string> {
    const parsed = ReviewReceiptSchema.parse(receipt);
    const bytes = `${JSON.stringify(parsed)}\n`;
    const hash = digest(bytes);
    await mkdir(this.root, { recursive: true });
    const realRoot = await realpath(this.root);
    if (realRoot !== this.root) throw new Error('Review receipt root must not traverse a link');
    const path = this.pathFor(hash);
    let handle;
    try {
      handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      await handle.writeFile(bytes, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await this.syncRoot();
      return hash;
    } catch (error) {
      await handle?.close().catch(() => undefined);
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await this.get(hash);
      if (!existing || `${JSON.stringify(existing)}\n` !== bytes) throw new Error('Review receipt hash collision');
      return hash;
    }
  }

  async get(hash: string): Promise<ReviewReceipt | undefined> {
    const path = this.pathFor(hash);
    try {
      const metadata = await lstat(path);
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) {
        throw new Error('Review receipt must be a private regular file');
      }
      const [realRoot, realFile] = await Promise.all([realpath(this.root), realpath(path)]);
      if (realRoot !== this.root) throw new Error('Review receipt root must not traverse a link');
      if (!contained(realRoot, realFile)) throw new Error('Review receipt escaped its repository root');
      const bytes = await readFile(realFile, 'utf8');
      if (digest(bytes) !== hash) throw new Error('Review receipt content hash mismatch');
      return ReviewReceiptSchema.parse(JSON.parse(bytes));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }
}

export function assertReviewReceiptMatchesCurrentRun(run: FoundryRun, receipt: ReviewReceipt): void {
  if (!run.review) throw new Error('Current review receipt has no active review');
  const expected = buildReviewReceipt(run, {
    decision: run.review.decision,
    reviewer: run.review.reviewer,
    note: run.review.note,
    decidedAt: run.review.decidedAt,
    runVersion: run.version - 1,
  });
  if (JSON.stringify(expected) !== JSON.stringify(receipt)) {
    throw new Error('Current review receipt does not match the exact reviewed artifact snapshot');
  }
}
