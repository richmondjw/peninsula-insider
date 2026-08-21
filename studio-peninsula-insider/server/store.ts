import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rename, rm } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import {
  CaptureProjectionSchema,
  FoundryRunSchema,
  QuickNoteSchema,
  type ArtifactEdit,
  type CaptureProjection,
  type FoundryRun,
  type ReviewDecision,
} from '../shared/contracts.js';
import type { CaptureRecord } from '../shared/capture-contracts.js';
import { evaluateQuickNoteGates } from './fixture-runner.js';
import {
  buildRealUrlRun,
  refreshRealUrlRun,
  staleRealUrlRunForNoStory,
  summarizeCapture,
} from './real-url-runner.js';
import { assertRealUrlContentLineage, buildRealUrlArtifactBinding } from './real-url-lineage.js';
import {
  validateRealUrlRunAgainstResolver,
  type ImmutableCaptureResolver,
} from './real-url-integrity.js';
import {
  assertReviewReceiptMatchesCurrentRun,
  buildReviewReceipt,
  FileReviewReceiptRepository,
} from './review-receipts.js';

interface StoreFile {
  schemaVersion: 'pi.foundry-file-store.v2';
  runs: FoundryRun[];
  captureProjections: CaptureProjection[];
}

function contained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return !pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot);
}

function staleCurrentReviews(run: FoundryRun, input: {
  at: string;
  reason: 'source_refreshed' | 'artifact_edited' | 'review_superseded';
  supersededByAttemptId?: string;
}) {
  return run.reviewHistory.map((entry) => entry.validity === 'current' ? {
    ...entry,
    validity: 'stale' as const,
    staledAt: input.at,
    staleReason: input.reason,
    ...(input.supersededByAttemptId ? { supersededByAttemptId: input.supersededByAttemptId } : {}),
  } : entry);
}

function normalizeDerivedStatus(run: unknown, storeSchemaVersion: 'pi.foundry-file-store.v1' | 'pi.foundry-file-store.v2'): FoundryRun {
  const candidate = run as Partial<FoundryRun> & { review?: Record<string, unknown>; reviewHistory?: Record<string, unknown>[] };
  const existingHistory = Array.isArray(candidate.reviewHistory) ? candidate.reviewHistory : [];
  let reviewHistory = candidate.review && !existingHistory.some((entry) => entry.validity === 'current'
    && entry.decision === candidate.review?.decision
    && entry.reviewer === candidate.review?.reviewer
    && entry.decidedAt === candidate.review?.decidedAt)
    ? [...existingHistory, { ...candidate.review, validity: 'current' as const }]
    : existingHistory;
  const hasUnsealedCurrentReview = Boolean(candidate.review && !candidate.review.receiptHash)
    || reviewHistory.some((entry) => entry.validity === 'current' && !entry.receiptHash);
  const hasLegacyUnsealedHistory = storeSchemaVersion === 'pi.foundry-file-store.v1'
    && reviewHistory.some((entry) => !entry.receiptHash);
  if (hasLegacyUnsealedHistory) {
    const migratedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date(0).toISOString();
    reviewHistory = reviewHistory.map((entry) => !entry.receiptHash ? {
      ...entry,
      validity: 'stale' as const,
      staledAt: typeof entry.staledAt === 'string' ? entry.staledAt : migratedAt,
      staleReason: 'legacy_unsealed' as const,
      supersededByAttemptId: undefined,
    } : entry);
  }
  const parsed = FoundryRunSchema.parse({
    ...candidate,
    ...(hasUnsealedCurrentReview ? { status: 'needs_revision', review: undefined } : {}),
    reviewHistory,
  });
  assertRealUrlContentLineage(parsed);
  const hasFailedGate = parsed.blockers.length > 0 || parsed.artifact.gateResults.some((gate) => !gate.passed);
  if (!hasFailedGate || !['ready_for_review', 'accepted'].includes(parsed.status)) return parsed;
  const normalized = FoundryRunSchema.parse({ ...parsed, status: 'needs_revision', review: undefined });
  assertRealUrlContentLineage(normalized);
  return normalized;
}

export class VersionConflictError extends Error {}
export class CaptureProjectionConflictError extends Error {}
export class CaptureBusyError extends Error {}
export class CaptureRefreshTargetError extends Error {}
export class RunRefreshInProgressError extends Error {}

export class FileFoundryStore {
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly filePath: string;
  private readonly root: string;
  private readonly immutableCaptureResolver?: ImmutableCaptureResolver;
  private readonly reviewReceipts: FileReviewReceiptRepository;

  constructor(filePath: string, allowedRoot = dirname(filePath), immutableCaptureResolver?: ImmutableCaptureResolver) {
    this.root = resolve(allowedRoot);
    this.filePath = resolve(filePath);
    if (!contained(this.root, this.filePath)) {
      throw new Error('Foundry store path must remain inside its configured data root');
    }
    this.immutableCaptureResolver = immutableCaptureResolver;
    this.reviewReceipts = new FileReviewReceiptRepository(resolve(this.root, 'review-receipts'), this.root);
  }

  hasImmutableCaptureResolver(): boolean { return Boolean(this.immutableCaptureResolver); }

  private async validateRealUrlRun(run: FoundryRun): Promise<CaptureRecord | undefined> {
    const immutableRecord = await validateRealUrlRunAgainstResolver(run, this.immutableCaptureResolver);
    if (!run.capture) return undefined;
    const sourceReview = run.artifact.sourceReview;
    const expectedGates = evaluateQuickNoteGates(run.artifact.payload, run.claims, run.artifact.claimIds, {
      requireSourceReview: true,
      sourceReviewComplete: Boolean(sourceReview?.angleConfirmed
        && sourceReview.confirmedClaimIds.length > 0
        && sourceReview.confirmedClaimIds.every((claimId) => run.artifact.claimIds.includes(claimId))),
    });
    if (JSON.stringify(expectedGates) !== JSON.stringify(run.artifact.gateResults)) {
      throw new Error('Mutable artifact gates do not match immutable evidence and public copy');
    }
    return immutableRecord;
  }

  async validateForExport(id: string): Promise<{ run: FoundryRun; immutableRecord?: CaptureRecord }> {
    return this.mutate(async () => {
      const data = await this.read();
      const run = data.runs.find((candidate) => candidate.id === id);
      if (!run) throw new Error('Run not found');
      if (data.captureProjections.some((projection) => projection.refreshRunId === id && ['queued', 'capturing'].includes(projection.state))) {
        throw new RunRefreshInProgressError('Source refresh is in progress');
      }
      await this.validateReviewReceipts(run);
      return { run, immutableRecord: await this.validateRealUrlRun(run) };
    });
  }

  private async validateCaptureProjection(projection: CaptureProjection): Promise<void> {
    if (!projection.summary) return;
    if (!this.immutableCaptureResolver) throw new Error('Terminal capture projections require an immutable capture resolver');
    const record = await this.immutableCaptureResolver.get(projection.attemptId);
    if (!record || JSON.stringify(summarizeCapture(record)) !== JSON.stringify(projection.summary)) {
      throw new Error('Mutable capture projection does not match the immutable manifest');
    }
  }

  private async validateReviewReceipts(run: FoundryRun): Promise<void> {
    for (const entry of run.reviewHistory) {
      if (!entry.receiptHash && entry.staleReason === 'legacy_unsealed') continue;
      if (!entry.receiptHash) throw new Error('Review history receipt is unavailable');
      const receipt = await this.reviewReceipts.get(entry.receiptHash);
      if (!receipt || receipt.runId !== run.id || receipt.decision !== entry.decision
          || receipt.reviewer !== entry.reviewer || receipt.decidedAt !== entry.decidedAt
          || receipt.note !== entry.note) {
        throw new Error('Review history receipt is unavailable or does not match its decision');
      }
    }
    if (!run.review) return;
    const receipt = await this.reviewReceipts.get(run.review.receiptHash);
    if (!receipt) throw new Error('Current review receipt is unavailable');
    assertReviewReceiptMatchesCurrentRun(run, receipt);
  }

  private async mutate<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationQueue;
    let release = () => {};
    this.mutationQueue = new Promise<void>((resolveQueue) => { release = resolveQueue; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async safeExistingFile(): Promise<string> {
    const metadata = await lstat(this.filePath);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) {
      throw new Error('Foundry store must be a private regular file');
    }
    const [realRoot, realFile] = await Promise.all([realpath(this.root), realpath(this.filePath)]);
    if (!contained(realRoot, realFile)) throw new Error('Foundry store escaped its configured data root');
    return realFile;
  }

  private async read(): Promise<StoreFile> {
    try {
      const raw = await readFile(await this.safeExistingFile(), 'utf8');
      const parsed = JSON.parse(raw) as { schemaVersion?: string; runs?: unknown[]; captureProjections?: unknown[] };
      if (!['pi.foundry-file-store.v1', 'pi.foundry-file-store.v2'].includes(parsed.schemaVersion ?? '')) {
        throw new Error('Unsupported Foundry store schema');
      }
      const storeSchemaVersion = parsed.schemaVersion as 'pi.foundry-file-store.v1' | 'pi.foundry-file-store.v2';
      const runs = (parsed.runs ?? []).map((run) => normalizeDerivedStatus(run, storeSchemaVersion));
      await Promise.all(runs.map((run) => this.validateRealUrlRun(run)));
      await Promise.all(runs.map((run) => this.validateReviewReceipts(run)));
      const captureProjections = (parsed.captureProjections ?? []).map((projection) => CaptureProjectionSchema.parse(projection));
      await Promise.all(captureProjections.map((projection) => this.validateCaptureProjection(projection)));
      return {
        schemaVersion: 'pi.foundry-file-store.v2',
        runs,
        captureProjections,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { schemaVersion: 'pi.foundry-file-store.v2', runs: [], captureProjections: [] };
      }
      throw error;
    }
  }

  private async syncParent(): Promise<void> {
    let handle;
    try {
      handle = await open(dirname(this.filePath), 'r');
      await handle.sync();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['EACCES', 'EINVAL', 'EISDIR', 'ENOTSUP', 'EPERM'].includes(code ?? '')) throw error;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  private async write(data: StoreFile): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await mkdir(dirname(this.filePath), { recursive: true });
    const [realRoot, realParent] = await Promise.all([realpath(this.root), realpath(dirname(this.filePath))]);
    if (!contained(realRoot, realParent)) throw new Error('Foundry store parent escaped its configured data root');
    try {
      await this.safeExistingFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    let handle;
    try {
      handle = await open(temporary, 'wx', 0o600);
      await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(temporary, this.filePath);
      await this.syncParent();
    } catch (error) {
      await handle?.close().catch(() => undefined);
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async list(): Promise<FoundryRun[]> { return (await this.read()).runs; }
  async get(id: string): Promise<FoundryRun | undefined> { return (await this.read()).runs.find((run) => run.id === id); }
  async getByIdempotencyKey(key: string): Promise<FoundryRun | undefined> {
    return (await this.read()).runs.find((run) => run.idempotencyKey === key);
  }
  async listCaptureProjections(): Promise<CaptureProjection[]> { return (await this.read()).captureProjections; }
  async getCaptureProjection(id: string): Promise<CaptureProjection | undefined> {
    return (await this.read()).captureProjections.find((projection) => projection.id === id);
  }
  async getCaptureProjectionByIdempotencyKeyHash(keyHash: string): Promise<CaptureProjection | undefined> {
    return (await this.read()).captureProjections.find((projection) => projection.idempotencyKeyHash === keyHash);
  }

  async createCaptureProjection(input: CaptureProjection): Promise<{ projection: CaptureProjection; created: boolean }> {
    return this.mutate(async () => {
      const projection = CaptureProjectionSchema.parse(input);
      const data = await this.read();
      const existing = data.captureProjections.find((item) => item.idempotencyKeyHash === projection.idempotencyKeyHash);
      if (existing) {
        if (existing.requestFingerprint !== projection.requestFingerprint
            || existing.operationFingerprint !== projection.operationFingerprint) {
          throw new CaptureProjectionConflictError('Idempotency key is bound to a different capture operation');
        }
        return { projection: existing, created: false };
      }
      if (data.captureProjections.some((item) => ['queued', 'capturing'].includes(item.state))) {
        throw new CaptureBusyError('Only one local URL capture may run at a time');
      }
      if (projection.operation === 'refresh') {
        const run = data.runs.find((item) => item.id === projection.refreshRunId);
        if (!run?.capture) throw new CaptureRefreshTargetError('Refresh target is not a real URL run');
        if (run.version !== projection.expectedRunVersion) {
          throw new VersionConflictError(`Expected version ${projection.expectedRunVersion}; current version is ${run.version}`);
        }
        const current = run.capture.revisions.find((revision) => revision.attemptId === run.capture?.currentAttemptId);
        if (!current || current.requestFingerprint !== projection.requestFingerprint) {
          throw new CaptureRefreshTargetError('Refresh request does not match the exact source identity');
        }
      }
      data.captureProjections.unshift(projection);
      await this.write(data);
      return { projection, created: true };
    });
  }

  async markCaptureProjectionCapturing(id: string, at: string): Promise<CaptureProjection> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.captureProjections.findIndex((projection) => projection.id === id);
      if (index < 0) throw new Error('Capture projection not found');
      const current = data.captureProjections[index];
      if (current.summary) return current;
      if (current.state !== 'queued') return current;
      const updated = CaptureProjectionSchema.parse({ ...current, state: 'capturing', updatedAt: at });
      data.captureProjections[index] = updated;
      await this.write(data);
      return updated;
    });
  }

  async failCaptureProjection(id: string, code: string, at: string): Promise<CaptureProjection> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.captureProjections.findIndex((projection) => projection.id === id);
      if (index < 0) throw new Error('Capture projection not found');
      const current = data.captureProjections[index];
      if (current.summary) return current;
      const updated = CaptureProjectionSchema.parse({
        ...current,
        state: 'failed',
        updatedAt: at,
        failure: { stage: 'storage', code },
      });
      data.captureProjections[index] = updated;
      await this.write(data);
      return updated;
    });
  }

  async finalizeCaptureProjection(id: string, record: CaptureRecord): Promise<{ projection: CaptureProjection; run?: FoundryRun }> {
    return this.mutate(async () => {
      const data = await this.read();
      const projectionIndex = data.captureProjections.findIndex((projection) => projection.id === id);
      if (projectionIndex < 0) throw new Error('Capture projection not found');
      const projection = data.captureProjections[projectionIndex];
      if (projection.attemptId !== record.attempt.id
        || projection.requestFingerprint !== record.attempt.requestFingerprint
        || projection.idempotencyKeyHash !== record.attempt.idempotencyKeyHash) {
        throw new CaptureProjectionConflictError('Immutable capture record does not match its projection');
      }
      if (projection.summary) {
        return { projection, run: projection.runId ? data.runs.find((run) => run.id === projection.runId) : undefined };
      }

      const summary = summarizeCapture(record);
      let run: FoundryRun | undefined;
      let materializationFailure: CaptureProjection['materializationFailure'];
      if (projection.refreshRunId) {
        const runIndex = data.runs.findIndex((item) => item.id === projection.refreshRunId);
        if (runIndex < 0) {
          materializationFailure = { code: 'refresh_target_missing' };
        } else {
          const current = data.runs[runIndex];
          if (!current.capture) {
            materializationFailure = { code: 'refresh_target_invalid' };
          } else if (current.capture.currentAttemptId === record.attempt.id) {
            run = current;
          } else {
            try {
              if (record.attempt.state === 'extracted') run = refreshRealUrlRun(current, record, projection.actor);
              if (record.attempt.state === 'no_story') run = staleRealUrlRunForNoStory(current, record, projection.actor);
              if (run) {
                await this.validateRealUrlRun(run);
                data.runs[runIndex] = run;
              }
            } catch {
              materializationFailure = { code: 'workflow_materialization_failed' };
            }
          }
        }
      } else if (record.attempt.state === 'extracted') {
        try {
          const candidate = buildRealUrlRun(record, projection.actor, `real-url:${projection.idempotencyKeyHash}`);
          const materialized = data.runs.find((item) => item.idempotencyKey === candidate.idempotencyKey) ?? candidate;
          await this.validateRealUrlRun(materialized);
          if (!data.runs.some((item) => item.id === materialized.id)) data.runs.unshift(materialized);
          run = materialized;
        } catch {
          materializationFailure = { code: 'workflow_materialization_failed' };
        }
      }

      const updated = CaptureProjectionSchema.parse({
        ...projection,
        state: record.attempt.state,
        updatedAt: record.attempt.completedAt,
        summary,
        runId: run?.id ?? projection.refreshRunId,
        failure: undefined,
        materializationFailure,
      });
      data.captureProjections[projectionIndex] = updated;
      await this.write(data);
      return { projection: updated, run };
    });
  }

  async create(run: FoundryRun): Promise<FoundryRun> {
    return this.mutate(async () => {
      const data = await this.read();
      const existing = data.runs.find((item) => item.idempotencyKey === run.idempotencyKey);
      if (existing) return existing;
      const parsed = FoundryRunSchema.parse(run);
      await this.validateRealUrlRun(parsed);
      data.runs.unshift(parsed);
      await this.write(data);
      return parsed;
    });
  }

  async review(id: string, decision: ReviewDecision): Promise<FoundryRun> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const run = data.runs[index];
      if (data.captureProjections.some((projection) => projection.refreshRunId === id && ['queued', 'capturing'].includes(projection.state))) {
        throw new RunRefreshInProgressError('Source refresh is in progress');
      }
      if (run.version !== decision.expectedVersion) {
        throw new VersionConflictError(`Expected version ${decision.expectedVersion}; current version is ${run.version}`);
      }
      if (decision.decision === 'accepted' && (run.blockers.length > 0 || run.artifact.gateResults.some((gate) => !gate.passed))) {
        throw new Error('Artifact has unresolved blockers or failed gates');
      }
      if (decision.decision === 'accepted' && run.capture && run.capture.currentAttemptId !== run.capture.artifactAttemptId) {
        throw new Error('Artifact evidence is stale against the current source head');
      }
      assertRealUrlContentLineage(run);
      const now = new Date().toISOString();
      const receiptHash = await this.reviewReceipts.put(buildReviewReceipt(run, {
        decision: decision.decision,
        reviewer: decision.reviewer,
        note: decision.note,
        decidedAt: now,
      }));
      const review = { decision: decision.decision, reviewer: decision.reviewer, note: decision.note, decidedAt: now, receiptHash };
      const updated = FoundryRunSchema.parse({
        ...run,
        version: run.version + 1,
        status: decision.decision,
        updatedAt: now,
        review,
        reviewHistory: [...staleCurrentReviews(run, { at: now, reason: 'review_superseded' }), { ...review, validity: 'current' }],
        audit: [...run.audit, {
          at: now,
          actor: decision.reviewer,
          type: 'review_decision',
          detail: `${decision.decision} artifact ${run.artifact.id}`,
        }],
      });
      data.runs[index] = updated;
      await this.validateRealUrlRun(updated);
      await this.write(data);
      return updated;
    });
  }

  async updateArtifact(id: string, edit: ArtifactEdit): Promise<FoundryRun> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const run = data.runs[index];
      if (data.captureProjections.some((projection) => projection.refreshRunId === id && ['queued', 'capturing'].includes(projection.state))) {
        throw new RunRefreshInProgressError('Source refresh is in progress');
      }
      if (run.version !== edit.expectedVersion) {
        throw new VersionConflictError(`Expected version ${edit.expectedVersion}; current version is ${run.version}`);
      }
      const claimIds = edit.claimIds ?? run.artifact.claimIds;
      const claimsById = new Map(run.claims.map((claim) => [claim.id, claim]));
      if (claimIds.some((claimId) => !claimsById.has(claimId))) throw new Error('Selected claim does not exist');
      const now = new Date().toISOString();
      const sourceReview = edit.sourceKind && edit.claimIds && edit.confirmAngle ? {
        sourceKind: edit.sourceKind,
        confirmedClaimIds: edit.claimIds,
        angleConfirmed: true as const,
        confirmedBy: edit.editor,
        confirmedAt: now,
      } : run.artifact.sourceReview;
      const dependency = run.capture?.revisions.find((revision) => revision.attemptId === run.capture?.artifactAttemptId);
      const bound = run.capture && dependency?.sourceRevision
        ? buildRealUrlArtifactBinding(run.claims, claimIds, {
          canonicalUrl: dependency.sourceRevision.canonicalUrl,
          capturedAt: dependency.sourceRevision.capturedAt,
          contentHash: dependency.sourceRevision.contentHash,
        }, sourceReview?.sourceKind)
        : undefined;
      if (bound && ((edit.headline !== undefined && edit.headline !== bound.headline)
          || (edit.dek !== undefined && edit.dek !== bound.dek)
          || (edit.body !== undefined && edit.body !== bound.body))) {
        throw new Error('Real URL public copy must reproduce selected immutable evidence');
      }
      if (!bound && (!edit.headline || !edit.body)) throw new Error('Fixture artifact edits require headline and body');
      const payload = bound?.payload ?? QuickNoteSchema.parse({
        ...run.artifact.payload,
        headline: edit.headline!,
        dek: edit.dek,
        body: edit.body!,
      });
      const gateResults = evaluateQuickNoteGates(payload, run.claims, claimIds, run.capture ? {
        requireSourceReview: true,
        sourceReviewComplete: Boolean(sourceReview?.angleConfirmed
          && sourceReview.confirmedClaimIds.length > 0
          && sourceReview.confirmedClaimIds.every((claimId) => claimIds.includes(claimId))),
      } : {});
      const staleDependency = Boolean(run.capture && run.capture.currentAttemptId !== run.capture.artifactAttemptId);
      const updated = FoundryRunSchema.parse({
        ...run,
        version: run.version + 1,
        status: staleDependency || run.blockers.length > 0 || gateResults.some((gate) => !gate.passed) ? 'needs_revision' : 'ready_for_review',
        updatedAt: now,
        review: undefined,
        reviewHistory: staleCurrentReviews(run, { at: now, reason: 'artifact_edited' }),
        angle: { ...run.angle, evidenceClaimIds: claimIds, selectedBy: sourceReview ? edit.editor : run.angle.selectedBy },
        artifact: {
          ...run.artifact,
          version: run.artifact.version + 1,
          claimIds,
          payload,
          targetPath: bound?.targetPath ?? run.artifact.targetPath,
          contentLineage: bound?.lineage ?? run.artifact.contentLineage,
          sourceReview,
          gateResults,
        },
        audit: [...run.audit, {
          at: now,
          actor: edit.editor,
          type: 'artifact_edited',
          detail: `Edited artifact ${run.artifact.id}; any prior decision was retained as stale.`,
        }],
      });
      data.runs[index] = updated;
      await this.validateRealUrlRun(updated);
      await this.write(data);
      return updated;
    });
  }
}
