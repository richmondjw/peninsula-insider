import { z } from 'zod';
import {
  CaptureRecordSchema,
  type CaptureRecord,
} from '../../shared/capture-contracts.js';
import { sha256 } from './blob-store.js';
import { ImmutableFileStore } from './filesystem.js';

const IdSchema = z.string().regex(/^[a-z][a-z0-9-]{7,127}$/);
const IdempotencyIndexSchema = z.object({
  schemaVersion: z.literal('pi.capture-idempotency.v1'),
  idempotencyKeyHash: z.string().regex(/^[a-f0-9]{64}$/),
  attemptId: IdSchema,
}).readonly();

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export class FileCaptureRepository {
  private readonly files: ImmutableFileStore;

  constructor(root: string) {
    this.files = new ImmutableFileStore(root);
  }

  private async writeJson(segments: readonly string[], value: unknown): Promise<void> {
    await this.files.writeOnceAtomic(segments, jsonBytes(value));
  }

  async save(recordInput: CaptureRecord): Promise<CaptureRecord> {
    const record = CaptureRecordSchema.parse(recordInput);
    await this.files.writeOnceAtomic(['capture', 'manifests', `${record.attempt.id}.json`], jsonBytes(record));
    await this.writeJson(['capture', 'idempotency', `${record.attempt.idempotencyKeyHash}.json`], {
      schemaVersion: 'pi.capture-idempotency.v1',
      idempotencyKeyHash: record.attempt.idempotencyKeyHash,
      attemptId: record.attempt.id,
    });
    return record;
  }

  async getByIdempotencyKey(key: string): Promise<CaptureRecord | undefined> {
    const keyHash = sha256(key);
    const rawIndex = await this.files.readOptional(['capture', 'idempotency', `${keyHash}.json`]);
    if (rawIndex) {
      const index = IdempotencyIndexSchema.parse(JSON.parse(rawIndex.toString('utf8')));
      if (index.idempotencyKeyHash !== keyHash) throw new Error('Capture idempotency index hash mismatch');
      return this.get(index.attemptId);
    }
    const attemptId = `capture-${keyHash.slice(0, 24)}`;
    const recovered = await this.get(attemptId);
    if (!recovered) return undefined;
    if (recovered.attempt.idempotencyKeyHash !== keyHash) throw new Error('Recovered capture manifest hash mismatch');
    await this.writeJson(['capture', 'idempotency', `${keyHash}.json`], {
      schemaVersion: 'pi.capture-idempotency.v1',
      idempotencyKeyHash: keyHash,
      attemptId,
    });
    return recovered;
  }

  async get(attemptIdInput: string): Promise<CaptureRecord | undefined> {
    const attemptId = IdSchema.parse(attemptIdInput);
    const rawManifest = await this.files.readOptional(['capture', 'manifests', `${attemptId}.json`]);
    return rawManifest ? CaptureRecordSchema.parse(JSON.parse(rawManifest.toString('utf8'))) : undefined;
  }
}
