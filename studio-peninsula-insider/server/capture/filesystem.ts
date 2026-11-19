import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, rm } from 'node:fs/promises';
import { rename } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

export class ImmutableStorageError extends Error {}

function assertSegment(segment: string): void {
  if (!segment || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')) {
    throw new ImmutableStorageError('Immutable storage path contains an invalid segment');
  }
}

function assertContained(root: string, candidate: string): void {
  const pathFromRoot = relative(root, candidate);
  if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new ImmutableStorageError('Immutable storage path escaped its configured root');
  }
}

export class ImmutableFileStore {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private pathFor(segments: readonly string[]): string {
    segments.forEach(assertSegment);
    const candidate = resolve(this.root, ...segments);
    assertContained(this.root, candidate);
    return candidate;
  }

  private async prepare(segments: readonly string[]): Promise<string> {
    const candidate = this.pathFor(segments);
    await mkdir(this.root, { recursive: true });
    await mkdir(dirname(candidate), { recursive: true });
    const [realRoot, realParent] = await Promise.all([realpath(this.root), realpath(dirname(candidate))]);
    assertContained(realRoot, realParent);
    return candidate;
  }

  private async syncParent(candidate: string): Promise<void> {
    let directoryHandle;
    try {
      directoryHandle = await open(dirname(candidate), 'r');
      await directoryHandle.sync();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['EACCES', 'EINVAL', 'EISDIR', 'ENOTSUP', 'EPERM'].includes(code ?? '')) throw error;
    } finally {
      await directoryHandle?.close().catch(() => undefined);
    }
  }

  private async validatedRegularFile(candidate: string): Promise<string> {
    const metadata = await lstat(candidate);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) {
      throw new ImmutableStorageError('Immutable record is not a private regular file');
    }
    const [realRoot, realCandidate] = await Promise.all([realpath(this.root), realpath(candidate)]);
    assertContained(realRoot, realCandidate);
    return realCandidate;
  }

  async writeOnce(segments: readonly string[], content: Uint8Array): Promise<'created' | 'existing'> {
    const candidate = await this.prepare(segments);
    let handle;
    try {
      handle = await open(candidate, 'wx', 0o600);
      await handle.writeFile(content);
      await handle.sync();
      await handle.close();
      await this.syncParent(candidate);
      return 'created';
    } catch (error) {
      const createdByThisCall = Boolean(handle);
      await handle?.close().catch(() => undefined);
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        if (createdByThisCall) await rm(candidate, { force: true }).catch(() => undefined);
        throw error;
      }
      const existing = await readFile(await this.validatedRegularFile(candidate));
      if (!existing.equals(Buffer.from(content))) {
        throw new ImmutableStorageError('Immutable record already exists with different content');
      }
      return 'existing';
    }
  }

  async writeOnceAtomic(segments: readonly string[], content: Uint8Array): Promise<'created' | 'existing'> {
    const candidate = await this.prepare(segments);
    const temporary = join(dirname(candidate), `.${basename(candidate)}.${process.pid}.${randomUUID()}.tmp`);
    let handle;
    try {
      handle = await open(temporary, 'wx', 0o600);
      await handle.writeFile(content);
      await handle.sync();
      await handle.close();
      handle = undefined;
      try {
        const existing = await readFile(await this.validatedRegularFile(candidate));
        if (!existing.equals(Buffer.from(content))) {
          throw new ImmutableStorageError('Immutable record already exists with different content');
        }
        await rm(temporary, { force: true });
        return 'existing';
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      await rename(temporary, candidate);
      await this.syncParent(candidate);
      return 'created';
    } catch (error) {
      await handle?.close().catch(() => undefined);
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async read(segments: readonly string[]): Promise<Buffer> {
    const candidate = this.pathFor(segments);
    return readFile(await this.validatedRegularFile(candidate));
  }

  async readOptional(segments: readonly string[]): Promise<Buffer | undefined> {
    try {
      return await this.read(segments);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }
}
