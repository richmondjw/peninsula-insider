import { createHash } from 'node:crypto';
import type { CaptureProjection } from '../shared/contracts.js';
import type { CaptureRecord } from '../shared/capture-contracts.js';
import {
  CaptureDisabledError,
  CaptureIdempotencyConflictError,
  captureRequestIdentity,
  type CaptureInput,
} from './capture/kernel.js';
import type { FileFoundryStore } from './store.js';
import { CaptureProjectionConflictError, VersionConflictError } from './store.js';

export interface CaptureKernelPort {
  capture(input: CaptureInput): Promise<CaptureRecord>;
}

export interface CaptureRepositoryPort {
  get(attemptId: string): Promise<CaptureRecord | undefined>;
}

export class CaptureSourceMismatchError extends Error {}

function bindOperationContext(input: {
  requestFingerprint: string;
  refreshRunId?: string;
  expectedRunVersion?: number;
}): string {
  return createHash('sha256').update(JSON.stringify({
    operation: input.refreshRunId ? 'refresh' : 'initial',
    requestFingerprint: input.requestFingerprint,
    refreshRunId: input.refreshRunId ?? null,
    expectedRunVersion: input.expectedRunVersion ?? null,
  })).digest('hex');
}

export class RealUrlCoordinator {
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(
    private readonly store: FileFoundryStore,
    private readonly kernel: CaptureKernelPort,
    private readonly repository: CaptureRepositoryPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async submit(input: {
    url: string;
    actor: string;
    idempotencyKey: string;
    refreshRunId?: string;
    expectedRunVersion?: number;
  }): Promise<{ projection: CaptureProjection; created: boolean }> {
    const identity = captureRequestIdentity({ url: input.url, idempotencyKey: input.idempotencyKey });
    const operationFingerprint = bindOperationContext({
      requestFingerprint: identity.requestFingerprint,
      refreshRunId: input.refreshRunId,
      expectedRunVersion: input.expectedRunVersion,
    });
    const existing = await this.store.getCaptureProjectionByIdempotencyKeyHash(identity.idempotencyKeyHash);
    if (existing) {
      if (existing.requestFingerprint !== identity.requestFingerprint || existing.operationFingerprint !== operationFingerprint) {
        throw new CaptureProjectionConflictError('Idempotency key is bound to a different capture operation');
      }
      return { projection: existing, created: false };
    }
    if (input.refreshRunId) {
      const run = await this.store.get(input.refreshRunId);
      if (!run?.capture) throw new CaptureSourceMismatchError('Refresh target is not a real URL run');
      if (run.version !== input.expectedRunVersion) {
        throw new VersionConflictError(`Expected version ${input.expectedRunVersion}; current version is ${run.version}`);
      }
      const current = run.capture.revisions.find((revision) => revision.attemptId === run.capture?.currentAttemptId);
      if (!current || current.requestedUrl !== identity.safeRequestedUrl || current.requestFingerprint !== identity.requestFingerprint) {
        throw new CaptureSourceMismatchError('Refresh URL does not match the existing redacted source identity');
      }
    }
    const timestamp = this.now().toISOString();
    const sourceId = `source-head-${createHash('sha256').update(identity.safeRequestedUrl).digest('hex').slice(0, 20)}`;
    const projection = {
      schemaVersion: 'pi.capture-projection.v1' as const,
      id: `projection-${identity.idempotencyKeyHash.slice(0, 24)}`,
      sourceId,
      attemptId: identity.attemptId,
      actor: input.actor,
      idempotencyKeyHash: identity.idempotencyKeyHash,
      requestFingerprint: identity.requestFingerprint,
      operation: input.refreshRunId ? 'refresh' as const : 'initial' as const,
      operationFingerprint,
      requestedUrl: identity.safeRequestedUrl,
      state: 'queued' as const,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(input.refreshRunId ? {
        refreshRunId: input.refreshRunId,
        expectedRunVersion: input.expectedRunVersion,
      } : {}),
    };
    const created = await this.store.createCaptureProjection(projection);
    if (!created.created) return created;
    const capturing = await this.store.markCaptureProjectionCapturing(projection.id, this.now().toISOString());
    const operation = this.execute(projection.id, { url: input.url, idempotencyKey: input.idempotencyKey });
    this.inFlight.set(projection.id, operation);
    void operation.finally(() => this.inFlight.delete(projection.id));
    return { projection: capturing, created: true };
  }

  private async execute(projectionId: string, input: CaptureInput): Promise<void> {
    let record: CaptureRecord;
    try {
      record = await this.kernel.capture(input);
    } catch (error) {
      let code = 'capture_failed_before_manifest';
      if (error instanceof CaptureDisabledError) code = 'capture_disabled';
      if (error instanceof CaptureIdempotencyConflictError) code = 'idempotency_conflict';
      if (error instanceof VersionConflictError) code = 'workflow_version_conflict';
      await this.store.failCaptureProjection(projectionId, code, this.now().toISOString()).catch(() => undefined);
      return;
    }
    try {
      await this.store.finalizeCaptureProjection(projectionId, record);
    } catch {
      const committed = await this.repository.get(record.attempt.id).catch(() => undefined);
      if (committed) await this.store.finalizeCaptureProjection(projectionId, committed).catch(() => undefined);
    }
  }

  async reconcile(): Promise<void> {
    const pending = (await this.store.listCaptureProjections()).filter((projection) => ['queued', 'capturing'].includes(projection.state));
    for (const projection of pending) {
      const record = await this.repository.get(projection.attemptId);
      if (record) {
        try {
          await this.store.finalizeCaptureProjection(projection.id, record);
        } catch { /* Keep pending so a later restart can retry manifest-only materialization. */ }
      } else {
        await this.store.failCaptureProjection(projection.id, 'capture_interrupted', this.now().toISOString());
      }
    }
  }

  async waitForIdle(projectionId: string): Promise<void> {
    await this.inFlight.get(projectionId);
  }
}
