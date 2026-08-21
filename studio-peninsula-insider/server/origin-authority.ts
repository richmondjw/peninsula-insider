import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import {
  IntakeBundleSchema,
  RecipeDefinitionSchema,
  type FoundryRun,
} from '../shared/contracts.js';
import {
  CaptureRecordSchema,
  CaptureAttemptSchema,
  ExtractionRevisionSchema,
  SourceRevisionSchema,
  type CaptureRecord,
} from '../shared/capture-contracts.js';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const digest = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');

const OriginRunIdentitySchema = z.object({
  runId: z.string().min(1),
  createdAt: z.string().datetime(),
  recipe: z.object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
    snapshot: RecipeDefinitionSchema,
  }),
  bundle: z.object({
    id: z.string().min(1),
    capturedAt: z.string().datetime(),
    contentHash: Sha256Schema,
    snapshot: IntakeBundleSchema,
  }),
}).superRefine((identity, context) => {
  if (identity.recipe.id !== identity.recipe.snapshot.id
      || identity.recipe.version !== identity.recipe.snapshot.version
      || identity.recipe.contentHash !== digest(JSON.stringify(identity.recipe.snapshot))) {
    context.addIssue({ code: 'custom', path: ['recipe', 'contentHash'], message: 'Recipe identity hash does not match its immutable snapshot' });
  }
  if (identity.bundle.id !== identity.bundle.snapshot.id
      || identity.bundle.capturedAt !== identity.bundle.snapshot.capturedAt
      || identity.bundle.contentHash !== digest(JSON.stringify(identity.bundle.snapshot))) {
    context.addIssue({ code: 'custom', path: ['bundle'], message: 'Bundle identity does not match its immutable snapshot' });
  }
});

const FixtureOriginSchema = z.object({
  mode: z.literal('fixture'),
  sourceItems: IntakeBundleSchema.shape.sourceItems,
  sourceItemsHash: Sha256Schema,
}).superRefine((origin, context) => {
  if (origin.sourceItemsHash !== digest(JSON.stringify(origin.sourceItems))) {
    context.addIssue({ code: 'custom', path: ['sourceItemsHash'], message: 'Fixture source-items hash does not bind the exact source snapshots' });
  }
});

const RealUrlOriginSchema = z.object({
  mode: z.literal('real_url'),
  sourceHead: z.object({
    id: z.string().regex(/^source-head-[a-f0-9]{20}$/),
    attemptId: z.string().min(1),
    requestFingerprint: Sha256Schema,
    safeRequestedUrl: z.string().url(),
  }),
  attempt: CaptureAttemptSchema,
  sourceRevision: SourceRevisionSchema,
  extractionRevision: ExtractionRevisionSchema,
  attemptHash: Sha256Schema,
  sourceRevisionHash: Sha256Schema,
  extractionRevisionHash: Sha256Schema,
}).superRefine((origin, context) => {
  if (origin.sourceHead.attemptId !== origin.attempt.id
      || origin.sourceHead.requestFingerprint !== origin.attempt.requestFingerprint
      || origin.sourceHead.safeRequestedUrl !== origin.attempt.requestedUrl) {
    context.addIssue({ code: 'custom', path: ['sourceHead'], message: 'Source head must bind the exact capture attempt identity' });
  }
  if (!safeOperatorUrl(origin.sourceHead.safeRequestedUrl)
      || origin.sourceHead.id !== `source-head-${digest(origin.sourceHead.safeRequestedUrl).slice(0, 20)}`) {
    context.addIssue({ code: 'custom', path: ['sourceHead', 'id'], message: 'Source head ID must derive from the exact safe requested URL' });
  }
  if (origin.sourceRevision.id !== origin.attempt.sourceRevisionId
      || origin.sourceRevision.attemptId !== origin.attempt.id
      || origin.extractionRevision.id !== origin.attempt.extractionRevisionId
      || origin.extractionRevision.attemptId !== origin.attempt.id
      || origin.extractionRevision.sourceRevisionId !== origin.sourceRevision.id
      || origin.extractionRevision.sourceContentBlobHash !== origin.sourceRevision.contentBlobHash) {
    context.addIssue({ code: 'custom', path: ['attempt'], message: 'Origin revisions must belong to the exact captured attempt' });
  }
  if (origin.attemptHash !== digest(JSON.stringify(origin.attempt))
      || origin.sourceRevisionHash !== digest(JSON.stringify(origin.sourceRevision))
      || origin.extractionRevisionHash !== digest(JSON.stringify(origin.extractionRevision))) {
    context.addIssue({ code: 'custom', path: ['attemptHash'], message: 'Origin capture hashes must bind their exact immutable snapshots' });
  }
});

export const RunOriginAuthorityReceiptSchema = z.object({
  schemaVersion: z.literal('pi.run-origin-authority.v1'),
  run: OriginRunIdentitySchema,
  origin: z.discriminatedUnion('mode', [FixtureOriginSchema, RealUrlOriginSchema]),
  contentHash: Sha256Schema,
}).superRefine((receipt, context) => {
  const binding = { schemaVersion: receipt.schemaVersion, run: receipt.run, origin: receipt.origin };
  if (receipt.contentHash !== digest(JSON.stringify(binding))) {
    context.addIssue({ code: 'custom', path: ['contentHash'], message: 'Origin authority content hash does not bind the exact receipt payload' });
  }
  if (receipt.origin.mode === 'fixture'
      && JSON.stringify(receipt.origin.sourceItems) !== JSON.stringify(receipt.run.bundle.snapshot.sourceItems)) {
    context.addIssue({ code: 'custom', path: ['origin', 'sourceItems'], message: 'Fixture authority must bind the exact immutable intake sources' });
  }
});

export type RunOriginAuthorityReceipt = z.infer<typeof RunOriginAuthorityReceiptSchema>;
type OriginRun = Pick<FoundryRun, 'id' | 'createdAt' | 'bundle' | 'recipe'>;

function bytesFor(receipt: RunOriginAuthorityReceipt): string {
  return `${JSON.stringify(RunOriginAuthorityReceiptSchema.parse(receipt))}\n`;
}

function contained(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return !pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot);
}

function safeOperatorUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.username === '' && url.password === ''
      && [...url.searchParams.values()].every((queryValue) => queryValue === '[redacted]');
  } catch {
    return false;
  }
}

function assertSafeCaptureUrls(record: CaptureRecord): void {
  const values = [
    record.attempt.requestedUrl,
    record.sourceRevision?.requestedUrl,
    record.sourceRevision?.canonicalUrl,
    ...record.attempt.redirects.flatMap((redirect) => [redirect.url, redirect.location]),
    ...(record.sourceRevision?.redirects.flatMap((redirect) => [redirect.url, redirect.location]) ?? []),
  ].filter((value): value is string => Boolean(value));
  if (values.some((value) => !safeOperatorUrl(value))) {
    throw new Error('Run origin authority may contain only credential-free URLs with redacted query values');
  }
}

function runIdentity(run: OriginRun) {
  return OriginRunIdentitySchema.parse({
    runId: run.id,
    createdAt: run.createdAt,
    recipe: {
      id: run.recipe.id,
      version: run.recipe.version,
      contentHash: digest(JSON.stringify(RecipeDefinitionSchema.parse(run.recipe))),
      snapshot: RecipeDefinitionSchema.parse(run.recipe),
    },
    bundle: {
      id: run.bundle.id,
      capturedAt: run.bundle.capturedAt,
      contentHash: digest(JSON.stringify(IntakeBundleSchema.parse(run.bundle))),
      snapshot: IntakeBundleSchema.parse(run.bundle),
    },
  });
}

export function buildFixtureOriginAuthorityReceipt(run: OriginRun): RunOriginAuthorityReceipt {
  const sourceItems = IntakeBundleSchema.shape.sourceItems.parse(run.bundle.sourceItems);
  const binding = {
    schemaVersion: 'pi.run-origin-authority.v1',
    run: runIdentity(run),
    origin: {
      mode: 'fixture',
      sourceItems,
      sourceItemsHash: digest(JSON.stringify(sourceItems)),
    },
  } as const;
  return RunOriginAuthorityReceiptSchema.parse({ ...binding, contentHash: digest(JSON.stringify(binding)) });
}

export function sourceHeadId(safeRequestedUrl: string): string {
  if (!safeOperatorUrl(safeRequestedUrl)) throw new Error('Source head URL is not safe for an origin authority receipt');
  return `source-head-${digest(safeRequestedUrl).slice(0, 20)}`;
}

export function buildRealUrlOriginAuthorityReceipt(run: OriginRun, recordInput: CaptureRecord): RunOriginAuthorityReceipt {
  const record = CaptureRecordSchema.parse(recordInput);
  if (record.attempt.state !== 'extracted' || !record.sourceRevision || !record.extractionRevision) {
    throw new Error('Real URL origin authority requires one fully extracted immutable capture');
  }
  assertSafeCaptureUrls(record);
  const expectedRunId = `run-${digest(record.attempt.id).slice(0, 24)}`;
  const expectedBundle = IntakeBundleSchema.parse({
    schemaVersion: 'pi.intake-bundle.v1',
    id: `bundle-${record.sourceRevision.id}`,
    title: `Captured source: ${new URL(record.sourceRevision.canonicalUrl).hostname}`,
    submittedBy: run.bundle.submittedBy,
    capturedAt: record.sourceRevision.capturedAt,
    sourceItems: [{
      id: record.sourceRevision.id,
      kind: 'url',
      uri: record.sourceRevision.canonicalUrl,
      contentHash: record.sourceRevision.contentBlobHash,
      capturedAt: record.sourceRevision.capturedAt,
    }],
  });
  if (run.id !== expectedRunId || run.createdAt !== record.attempt.createdAt
      || JSON.stringify(IntakeBundleSchema.parse(run.bundle)) !== JSON.stringify(expectedBundle)) {
    throw new Error('Real URL origin authority does not reproduce its immutable capture identity');
  }
  const binding = {
    schemaVersion: 'pi.run-origin-authority.v1',
    run: runIdentity(run),
    origin: {
      mode: 'real_url',
      sourceHead: {
        id: sourceHeadId(record.attempt.requestedUrl),
        attemptId: record.attempt.id,
        requestFingerprint: record.attempt.requestFingerprint,
        safeRequestedUrl: record.attempt.requestedUrl,
      },
      attempt: record.attempt,
      sourceRevision: record.sourceRevision,
      extractionRevision: record.extractionRevision,
      attemptHash: digest(JSON.stringify(record.attempt)),
      sourceRevisionHash: digest(JSON.stringify(record.sourceRevision)),
      extractionRevisionHash: digest(JSON.stringify(record.extractionRevision)),
    },
  } as const;
  return RunOriginAuthorityReceiptSchema.parse({ ...binding, contentHash: digest(JSON.stringify(binding)) });
}

export function originAuthorityReceiptHash(receipt: RunOriginAuthorityReceipt): string {
  return digest(bytesFor(receipt));
}

export function withFixtureOriginAuthority<T extends OriginRun>(run: T): T & { originAuthorityReceiptHash: string } {
  return { ...run, originAuthorityReceiptHash: originAuthorityReceiptHash(buildFixtureOriginAuthorityReceipt(run)) };
}

export function withRealUrlOriginAuthority<T extends OriginRun>(run: T, record: CaptureRecord): T & { originAuthorityReceiptHash: string } {
  return { ...run, originAuthorityReceiptHash: originAuthorityReceiptHash(buildRealUrlOriginAuthorityReceipt(run, record)) };
}

export function assertOriginAuthorityMatches(
  run: OriginRun & { originAuthorityReceiptHash: string; capture?: FoundryRun['capture'] },
  receipt: RunOriginAuthorityReceipt,
  immutableRecord?: CaptureRecord,
): void {
  if (run.originAuthorityReceiptHash !== originAuthorityReceiptHash(receipt)) {
    throw new Error('Run origin authority receipt hash does not match the stored authority');
  }
  const receiptRun = receipt.run;
  const exactRecipe = RecipeDefinitionSchema.parse(run.recipe);
  if (receiptRun.runId !== run.id || receiptRun.createdAt !== run.createdAt
      || JSON.stringify(receiptRun.recipe.snapshot) !== JSON.stringify(exactRecipe)) {
    throw new Error('Run origin authority receipt does not match the immutable run identity');
  }
  if (!run.capture) {
    const expected = buildFixtureOriginAuthorityReceipt(run);
    if (receipt.origin.mode !== 'fixture' || JSON.stringify(receipt) !== JSON.stringify(expected)) {
      throw new Error('Fixture run origin authority does not match its exact immutable bundle');
    }
    return;
  }
  if (receipt.origin.mode !== 'real_url' || !immutableRecord
      || immutableRecord.attempt.id !== receipt.origin.sourceHead.attemptId
      || !run.capture.revisions.some((revision) => revision.attemptId === immutableRecord.attempt.id)) {
    throw new Error('Real URL run origin authority cannot resolve its original immutable capture');
  }
  const originalIdentity = {
    id: run.id,
    createdAt: run.createdAt,
    recipe: run.recipe,
    bundle: receipt.run.bundle.snapshot,
  };
  const expected = buildRealUrlOriginAuthorityReceipt(originalIdentity, immutableRecord);
  if (JSON.stringify(receipt) !== JSON.stringify(expected)) {
    throw new Error('Run origin authority receipt does not match the exact run origin');
  }
}

export class FileRunOriginAuthorityRepository {
  private readonly root: string;

  constructor(root: string, allowedRoot: string) {
    this.root = resolve(root);
    const resolvedAllowedRoot = resolve(allowedRoot);
    if (!contained(resolvedAllowedRoot, this.root)) throw new Error('Run origin authority root escaped the configured data root');
  }

  private pathFor(hash: string): string {
    const candidate = resolve(this.root, `${Sha256Schema.parse(hash)}.json`);
    if (!contained(this.root, candidate)) throw new Error('Run origin authority path escaped its repository root');
    return candidate;
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

  async put(receiptInput: RunOriginAuthorityReceipt): Promise<string> {
    const receipt = RunOriginAuthorityReceiptSchema.parse(receiptInput);
    const bytes = bytesFor(receipt);
    const receiptHash = digest(bytes);
    await mkdir(this.root, { recursive: true });
    const realRoot = await realpath(this.root);
    if (realRoot !== this.root) throw new Error('Run origin authority root must not traverse a link');
    const path = this.pathFor(receiptHash);
    let handle;
    try {
      handle = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      await handle.writeFile(bytes, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await this.syncRoot();
      return receiptHash;
    } catch (error) {
      await handle?.close().catch(() => undefined);
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await this.get(receiptHash);
      if (!existing || bytesFor(existing) !== bytes) throw new Error('Run origin authority receipt hash collision');
      return receiptHash;
    }
  }

  async get(receiptHash: string): Promise<RunOriginAuthorityReceipt | undefined> {
    const path = this.pathFor(receiptHash);
    try {
      const metadata = await lstat(path);
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) {
        throw new Error('Run origin authority receipt must be a private regular file');
      }
      const [realRoot, realFile] = await Promise.all([realpath(this.root), realpath(path)]);
      if (realRoot !== this.root) throw new Error('Run origin authority root must not traverse a link');
      if (!contained(realRoot, realFile)) throw new Error('Run origin authority receipt escaped its repository root');
      const bytes = await readFile(realFile, 'utf8');
      if (digest(bytes) !== receiptHash) throw new Error('Run origin authority receipt content hash mismatch');
      return RunOriginAuthorityReceiptSchema.parse(JSON.parse(bytes));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }
}
