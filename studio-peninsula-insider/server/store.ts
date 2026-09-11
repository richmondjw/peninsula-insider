import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { FoundryRunSchema, QuickNoteSchema, type ArtifactEdit, type FoundryRun, type ReviewDecision } from '../shared/contracts.js';
import { evaluateQuickNoteGates } from './fixture-runner.js';

interface StoreFile {
  schemaVersion: 'pi.foundry-file-store.v1';
  runs: FoundryRun[];
}

function normalizeDerivedStatus(run: FoundryRun): FoundryRun {
  const hasFailedGate = run.blockers.length > 0 || run.artifact.gateResults.some((gate) => !gate.passed);
  if (!hasFailedGate || !['ready_for_review', 'accepted'].includes(run.status)) return run;
  return FoundryRunSchema.parse({ ...run, status: 'needs_revision', review: undefined });
}

export class VersionConflictError extends Error {}

export class FileFoundryStore {
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly filePath: string;

  constructor(filePath: string, allowedRoot = dirname(filePath)) {
    const root = resolve(allowedRoot);
    this.filePath = resolve(filePath);
    const candidate = relative(root, this.filePath);
    if (candidate.startsWith('..') || isAbsolute(candidate)) {
      throw new Error('Foundry store path must remain inside its configured data root');
    }
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

  private async read(): Promise<StoreFile> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as StoreFile;
      if (parsed.schemaVersion !== 'pi.foundry-file-store.v1') throw new Error('Unsupported Foundry store schema');
      return { schemaVersion: parsed.schemaVersion, runs: parsed.runs.map((run) => normalizeDerivedStatus(FoundryRunSchema.parse(run))) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 'pi.foundry-file-store.v1', runs: [] };
      throw error;
    }
  }

  private async write(data: StoreFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      await rename(temporary, this.filePath);
    } catch (error) {
      await handle.close().catch(() => undefined);
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async list(): Promise<FoundryRun[]> {
    return (await this.read()).runs;
  }

  async get(id: string): Promise<FoundryRun | undefined> {
    return (await this.read()).runs.find((run) => run.id === id);
  }

  async getByIdempotencyKey(key: string): Promise<FoundryRun | undefined> {
    return (await this.read()).runs.find((run) => run.idempotencyKey === key);
  }

  async create(run: FoundryRun): Promise<FoundryRun> {
    return this.mutate(async () => {
      const data = await this.read();
      const existing = data.runs.find((item) => item.idempotencyKey === run.idempotencyKey);
      if (existing) return existing;
      data.runs.unshift(FoundryRunSchema.parse(run));
      await this.write(data);
      return run;
    });
  }

  async review(id: string, decision: ReviewDecision): Promise<FoundryRun> {
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.runs.findIndex((run) => run.id === id);
      if (index < 0) throw new Error('Run not found');
      const run = data.runs[index];
      if (run.version !== decision.expectedVersion) {
        throw new VersionConflictError(`Expected version ${decision.expectedVersion}; current version is ${run.version}`);
      }
      if (decision.decision === 'accepted' && (run.blockers.length > 0 || run.artifact.gateResults.some((gate) => !gate.passed))) {
        throw new Error('Artifact has unresolved blockers or failed gates');
      }
      const now = new Date().toISOString();
      const updated = FoundryRunSchema.parse({
        ...run,
        version: run.version + 1,
        status: decision.decision,
        updatedAt: now,
        review: {
          decision: decision.decision,
          reviewer: decision.reviewer,
          note: decision.note,
          decidedAt: now,
        },
        audit: [...run.audit, {
          at: now,
          actor: decision.reviewer,
          type: 'review_decision',
          detail: `${decision.decision} artifact ${run.artifact.id}`,
        }],
      });
      data.runs[index] = updated;
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
      if (run.version !== edit.expectedVersion) {
        throw new VersionConflictError(`Expected version ${edit.expectedVersion}; current version is ${run.version}`);
      }

      const payload = QuickNoteSchema.parse({
        ...run.artifact.payload,
        headline: edit.headline,
        dek: edit.dek,
        body: edit.body,
      });
      const now = new Date().toISOString();
      const gateResults = evaluateQuickNoteGates(payload, run.claims, run.artifact.claimIds);
      const updated = FoundryRunSchema.parse({
        ...run,
        version: run.version + 1,
        status: gateResults.some((gate) => !gate.passed) ? 'needs_revision' : 'ready_for_review',
        updatedAt: now,
        review: undefined,
        artifact: {
          ...run.artifact,
          version: run.artifact.version + 1,
          payload,
          gateResults,
        },
        audit: [...run.audit, {
          at: now,
          actor: edit.editor,
          type: 'artifact_edited',
          detail: `Edited artifact ${run.artifact.id}; any prior decision was invalidated.`,
        }],
      });
      data.runs[index] = updated;
      await this.write(data);
      return updated;
    });
  }
}
