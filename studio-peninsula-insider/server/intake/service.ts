import type { CaptureRecord } from '../../shared/capture-contracts.js';
import type { FoundryRun } from '../../shared/contracts.js';
import {
  IntakeAttemptSchema,
  type IntakeAttempt,
  type IntakeState,
} from '../../shared/intake-contracts.js';
import {
  CaptureDisabledError,
  CaptureIdempotencyConflictError,
  CapturePolicyError,
  type CaptureKernel,
} from '../capture/kernel.js';
import { VersionConflictError, type FileFoundryStore } from '../store.js';
import { FileIntakeLedger, idempotencyKeyHash, intakeAttemptId } from './ledger.js';
import { auditUrl, captureProvenance } from './provenance.js';
import { buildCapturedRun, refreshCapturedRun, type CapturedSourceOutcome } from './run-builder.js';

export class IntakeRequestError extends Error {}
export class IntakeNotFoundError extends IntakeRequestError {}

export interface UrlIntakeDependencies {
  readonly enabled: boolean;
  readonly kernel: Pick<CaptureKernel, 'capture'>;
  readonly ledger: FileIntakeLedger;
  readonly store: FileFoundryStore;
  readonly now?: () => Date;
}

export interface IntakeResult {
  readonly attempt: IntakeAttempt;
  readonly run?: FoundryRun;
  /** True when an earlier submission under the same key answered without new egress. */
  readonly replayed: boolean;
}

function safeFailure(error: unknown): IntakeAttempt['failure'] {
  if (error instanceof CapturePolicyError) {
    return { stage: 'policy', code: error.code, message: error.message };
  }
  return { stage: 'intake', code: 'submission_refused', message: 'The sealed capture kernel refused this submission.' };
}

function terminalState(record: CaptureRecord): IntakeState {
  switch (record.attempt.state) {
    case 'extracted': return 'extracted';
    case 'held': return 'held';
    case 'no_story': return 'no_story';
    default: return 'failed';
  }
}

/**
 * The private caller that finally wires the sealed capture kernel to the Workbench. It owns
 * three responsibilities the kernel deliberately does not: a persisted audit row for every
 * submission (including ones that never reach the network), the mapping from an immutable
 * capture to a reviewable run, and refresh as a new revision rather than an in-place edit.
 */
export class UrlIntakeService {
  constructor(private readonly dependencies: UrlIntakeDependencies) {}

  get enabled(): boolean {
    return this.dependencies.enabled;
  }

  private get now(): string {
    return (this.dependencies.now ?? (() => new Date()))().toISOString();
  }

  async list(): Promise<IntakeAttempt[]> {
    return this.dependencies.ledger.list();
  }

  async submit(input: { url: string; actor: string; idempotencyKey?: string }): Promise<IntakeResult> {
    const key = input.idempotencyKey ?? `url:${auditUrl(input.url) ?? input.url}`;
    return this.capture({
      intent: 'new_source',
      url: input.url,
      actor: input.actor,
      key,
      complete: (record, at) => buildCapturedRun(record, input.actor, at),
      persist: (run) => this.dependencies.store.create(run),
    });
  }

  async refresh(
    runId: string,
    input: { actor: string; expectedVersion: number; idempotencyKey?: string; url?: string },
  ): Promise<IntakeResult> {
    const previous = await this.dependencies.store.get(runId);
    if (!previous) throw new IntakeNotFoundError('Run not found');
    if (previous.version !== input.expectedVersion) {
      throw new VersionConflictError(`Expected version ${input.expectedVersion}; current version is ${previous.version}`);
    }
    const url = this.refreshTarget(previous, input.url);
    const key = input.idempotencyKey ?? `refresh:${runId}:${input.expectedVersion}`;
    return this.capture({
      intent: 'refresh',
      url,
      actor: input.actor,
      key,
      complete: (record, at) => refreshCapturedRun(previous, record, input.actor, at),
      persist: (_run, record, at) => this.dependencies.store.applySourceRefresh(
        runId,
        input.expectedVersion,
        (current) => {
          const outcome = refreshCapturedRun(current, record, input.actor, at);
          if (outcome.outcome !== 'run') throw new IntakeRequestError('The refresh capture produced no usable claims');
          return outcome.run;
        },
      ),
    });
  }

  /**
   * Resolves which URL a refresh re-captures. Stored provenance redacts query values, so a
   * source with query parameters can only be refreshed by resubmitting the exact URL, which
   * is then checked against the stored redacted form.
   */
  private refreshTarget(previous: FoundryRun, provided?: string): string {
    const stored = previous.captures?.at(-1)?.requestedUrl;
    if (!stored) throw new IntakeRequestError('This run has no captured source revision to refresh');
    if (provided) {
      if (auditUrl(provided) !== stored) throw new IntakeRequestError('The supplied refresh URL does not match the stored source revision');
      return provided;
    }
    if (stored.includes('[redacted]')) {
      throw new IntakeRequestError('This source URL carries query values that are redacted at rest; resubmit the exact URL to refresh it');
    }
    return stored;
  }

  private async capture(input: {
    intent: IntakeAttempt['intent'];
    url: string;
    actor: string;
    key: string;
    complete: (record: CaptureRecord, at: string) => CapturedSourceOutcome;
    persist: (run: FoundryRun, record: CaptureRecord, at: string) => Promise<FoundryRun>;
  }): Promise<IntakeResult> {
    if (!this.dependencies.enabled) throw new CaptureDisabledError('Real URL capture is disabled');
    const { ledger, store } = this.dependencies;
    const submittedUrl = auditUrl(input.url);
    const existing = await ledger.getByIdempotencyKey(input.key);
    if (existing && existing.auditUrl !== submittedUrl) {
      throw new CaptureIdempotencyConflictError('Idempotency key is already bound to a different capture URL');
    }
    if (existing && existing.state !== 'capturing') {
      return { attempt: existing, run: existing.runId ? await store.get(existing.runId) : undefined, replayed: true };
    }

    const base = {
      schemaVersion: 'pi.intake-attempt.v1' as const,
      id: intakeAttemptId(input.key),
      idempotencyKeyHash: idempotencyKeyHash(input.key),
      intent: input.intent,
      submittedBy: input.actor,
      submittedAt: existing?.submittedAt ?? this.now,
      auditUrl: submittedUrl,
    };
    const row = (fields: Partial<IntakeAttempt> & { state: IntakeState }): IntakeAttempt => (
      IntakeAttemptSchema.parse({ ...base, updatedAt: this.now, ...fields })
    );

    // The capturing row is persisted before any egress, so an interrupted capture stays
    // visible and distinguishable after a restart.
    await ledger.upsert(row({ state: 'capturing' }));

    let record: CaptureRecord;
    try {
      record = await this.dependencies.kernel.capture({ url: input.url, idempotencyKey: input.key });
    } catch (error) {
      if (error instanceof CaptureIdempotencyConflictError || error instanceof CaptureDisabledError) throw error;
      return { attempt: await ledger.upsert(row({ state: 'rejected', failure: safeFailure(error) })), replayed: false };
    }

    const at = this.now;
    if (record.attempt.state === 'extracted') {
      const outcome = input.complete(record, at);
      if (outcome.outcome === 'run') {
        const run = await input.persist(outcome.run, record, at);
        return {
          attempt: await ledger.upsert(row({ state: 'extracted', runId: run.id, capture: outcome.capture })),
          run,
          replayed: false,
        };
      }
      return {
        attempt: await ledger.upsert(row({ state: 'no_story', capture: outcome.capture, outcomeReason: outcome.reason })),
        replayed: false,
      };
    }

    return {
      attempt: await ledger.upsert(row({
        state: terminalState(record),
        capture: captureProvenance(record, { submittedBy: input.actor, submittedAt: base.submittedAt }),
        outcomeReason: record.attempt.outcomeReason,
        failure: record.attempt.state === 'failed'
          ? record.attempt.failure
          : record.attempt.state === 'held' || record.attempt.state === 'no_story'
            ? undefined
            : { stage: 'intake', code: 'non_terminal_capture', message: 'The capture kernel returned a non-terminal state.' },
      })),
      replayed: false,
    };
  }
}
