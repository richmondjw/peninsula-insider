import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { IntakeAttemptSchema, type IntakeAttempt } from '../../shared/intake-contracts.js';

interface LedgerFile {
  schemaVersion: 'pi.foundry-intake-ledger.v1';
  attempts: IntakeAttempt[];
}

export function intakeAttemptId(idempotencyKey: string): string {
  return `intake-${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 24)}`;
}

export function idempotencyKeyHash(idempotencyKey: string): string {
  return createHash('sha256').update(idempotencyKey).digest('hex');
}

/**
 * Atomic file-backed audit ledger for URL intake, using the same single-process
 * development adapter pattern as the run store: serialised mutations, a temporary file,
 * an fsync and a rename. Rows are keyed by the idempotency key, so a replay or a restart
 * updates the existing row instead of appending a duplicate.
 */
export class FileIntakeLedger {
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly filePath: string;

  constructor(filePath: string, allowedRoot = dirname(filePath)) {
    const root = resolve(allowedRoot);
    this.filePath = resolve(filePath);
    const candidate = relative(root, this.filePath);
    if (candidate.startsWith('..') || isAbsolute(candidate)) {
      throw new Error('Foundry intake ledger path must remain inside its configured data root');
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

  private async read(): Promise<LedgerFile> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as { schemaVersion?: string; attempts?: unknown[] };
      if (parsed.schemaVersion !== 'pi.foundry-intake-ledger.v1' || !Array.isArray(parsed.attempts)) {
        throw new Error('Unsupported Foundry intake ledger schema');
      }
      return { schemaVersion: parsed.schemaVersion, attempts: parsed.attempts.map((item) => IntakeAttemptSchema.parse(item)) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 'pi.foundry-intake-ledger.v1', attempts: [] };
      throw error;
    }
  }

  private async write(data: LedgerFile): Promise<void> {
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

  async list(): Promise<IntakeAttempt[]> {
    return (await this.read()).attempts;
  }

  async getByIdempotencyKey(key: string): Promise<IntakeAttempt | undefined> {
    const id = intakeAttemptId(key);
    return (await this.read()).attempts.find((attempt) => attempt.id === id);
  }

  /** Inserts or replaces one row in place, keeping the ledger free of duplicate rows. */
  async upsert(input: IntakeAttempt): Promise<IntakeAttempt> {
    const attempt = IntakeAttemptSchema.parse(input);
    return this.mutate(async () => {
      const data = await this.read();
      const index = data.attempts.findIndex((candidate) => candidate.id === attempt.id);
      if (index < 0) data.attempts.unshift(attempt);
      else data.attempts[index] = attempt;
      await this.write(data);
      return attempt;
    });
  }
}
