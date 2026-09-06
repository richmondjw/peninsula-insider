import { createHash } from 'node:crypto';
import { ImmutableFileStore, ImmutableStorageError } from './filesystem.js';

const SHA256 = /^[a-f0-9]{64}$/;

export function sha256(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

export class ContentAddressedBlobStore {
  private readonly files: ImmutableFileStore;
  private readonly inFlight = new Map<string, Promise<{ readonly hash: string; readonly created: boolean }>>();

  constructor(root: string) {
    this.files = new ImmutableFileStore(root);
  }

  private segments(hash: string): readonly string[] {
    if (!SHA256.test(hash)) {
      throw new ImmutableStorageError('Blob hash must be a lowercase SHA-256 digest');
    }
    return ['blobs', 'sha256', hash.slice(0, 2), hash];
  }

  async put(content: Uint8Array): Promise<{ readonly hash: string; readonly created: boolean }> {
    const hash = sha256(content);
    const active = this.inFlight.get(hash);
    if (active) {
      await active;
      return Object.freeze({ hash, created: false });
    }
    const operation = (async () => {
      const result = await this.files.writeOnce(this.segments(hash), content);
      const persisted = await this.files.read(this.segments(hash));
      if (sha256(persisted) !== hash) {
        throw new ImmutableStorageError('Existing blob content does not match its address');
      }
      return Object.freeze({ hash, created: result === 'created' });
    })();
    this.inFlight.set(hash, operation);
    try {
      return await operation;
    } finally {
      this.inFlight.delete(hash);
    }
  }

  async get(hash: string): Promise<Buffer> {
    const content = await this.files.read(this.segments(hash));
    if (sha256(content) !== hash) {
      throw new ImmutableStorageError('Stored blob failed content-address verification');
    }
    return content;
  }
}
