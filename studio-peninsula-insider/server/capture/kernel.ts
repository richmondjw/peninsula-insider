import { randomUUID } from 'node:crypto';
import {
  CaptureAttemptSchema,
  CaptureRecordSchema,
  SourceRevisionSchema,
  type CaptureRecord,
  type CaptureStateEvent,
  type SourceRevision,
} from '../../shared/capture-contracts.js';
import { ContentAddressedBlobStore, sha256 } from './blob-store.js';
import { BodyReadError, readBoundedBody } from './body.js';
import { buildExtractionRevision, decodeText, extractBlocks, ExtractionError } from './extractor.js';
import {
  canonicalizeCaptureUrl,
  CapturePolicyError,
  NodeDnsResolver,
  redactCaptureUrl,
  resolveAndValidate,
  sameIpAddress,
  type DnsResolver,
} from './policy.js';
import { FileCaptureRepository } from './repository.js';
import type { CaptureTransport, TransportResponse } from './transport-contract.js';
import { createPinnedHttpsTransport } from './transport.js';

export interface CaptureLimits {
  readonly maxRedirects: number;
  readonly maxHeaderBytes: number;
  readonly maxHeaderCount: number;
  readonly maxWireBytes: number;
  readonly maxDecodedBytes: number;
  readonly bodyIdleTimeoutMs: number;
  readonly dnsTimeoutMs: number;
  readonly headerTimeoutMs: number;
  readonly totalTimeoutMs: number;
  readonly maxConcurrency: number;
}

export const DEFAULT_CAPTURE_LIMITS: CaptureLimits = Object.freeze({
  maxRedirects: 5,
  maxHeaderBytes: 32 * 1024,
  maxHeaderCount: 100,
  maxWireBytes: 2 * 1024 * 1024,
  maxDecodedBytes: 4 * 1024 * 1024,
  bodyIdleTimeoutMs: 5_000,
  dnsTimeoutMs: 3_000,
  headerTimeoutMs: 8_000,
  totalTimeoutMs: 15_000,
  maxConcurrency: 2,
});

export interface CaptureBlobStore {
  put(content: Uint8Array): Promise<{ readonly hash: string; readonly created: boolean }>;
}

export interface CaptureRepository {
  getByIdempotencyKey(key: string): Promise<CaptureRecord | undefined>;
  save(record: CaptureRecord): Promise<CaptureRecord>;
}

export interface CaptureExtractor {
  extract(
    content: Uint8Array,
    mediaType: 'text/html' | 'text/plain',
    charset: 'utf-8' | 'us-ascii',
    signal: AbortSignal,
  ): Promise<{ readonly blocks: ReturnType<typeof extractBlocks>; readonly extractedText: string }>;
}

export interface CaptureKernelDependencies {
  readonly enabled: boolean;
  readonly resolver: DnsResolver;
  readonly transport: CaptureTransport;
  readonly blobs: CaptureBlobStore;
  readonly repository: CaptureRepository;
  readonly extractor?: CaptureExtractor;
  readonly now?: () => Date;
  readonly idFactory?: () => string;
  readonly limits?: Partial<CaptureLimits>;
}

export interface CaptureInput {
  readonly url: string;
  readonly idempotencyKey: string;
}

export class CaptureDisabledError extends Error {}
export class CaptureIdempotencyConflictError extends Error {}

class CaptureStageError extends Error {
  constructor(
    readonly stage: 'policy' | 'dns' | 'transport' | 'body' | 'extraction' | 'storage',
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

class CaptureHeldError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly maximum: number) {}

  async use<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.maximum) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}

function after<T>(promise: Promise<T>, timeoutMs: number, timeout: () => Error): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(timeout()), timeoutMs); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

function parseContentType(value: string | undefined): {
  mediaType: 'text/html' | 'text/plain';
  charset: 'utf-8' | 'us-ascii';
} {
  if (!value) throw new CaptureHeldError('missing_media_type', 'Response did not declare a supported media type');
  const [rawMediaType, ...parameters] = value.split(';').map((part) => part.trim().toLowerCase());
  if (rawMediaType !== 'text/html' && rawMediaType !== 'text/plain') {
    throw new CaptureHeldError('unsupported_media_type', 'Response media type is not safe for text extraction');
  }
  const charsetParameters = parameters.filter((parameter) => parameter.startsWith('charset='));
  if (charsetParameters.length > 1) throw new CaptureHeldError('invalid_charset', 'Response declared multiple charsets');
  const rawCharset = charsetParameters[0]?.slice('charset='.length).replace(/^['"]|['"]$/g, '') ?? 'utf-8';
  const charset = rawCharset === 'utf8' ? 'utf-8' : rawCharset;
  if (charset !== 'utf-8' && charset !== 'us-ascii') {
    throw new CaptureHeldError('unsupported_charset', 'Response charset is not supported by the inert extractor');
  }
  return { mediaType: rawMediaType, charset };
}

function parseContentEncoding(value: string | undefined): 'identity' | 'gzip' | 'deflate' | 'br' {
  const encoding = (value ?? 'identity').trim().toLowerCase();
  if (!['identity', 'gzip', 'deflate', 'br'].includes(encoding) || encoding.includes(',')) {
    throw new CaptureStageError('body', 'unsupported_content_encoding', 'Response content encoding is unsupported');
  }
  return encoding as 'identity' | 'gzip' | 'deflate' | 'br';
}

function safeHeaders(headers: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  const allowed = ['content-type', 'content-encoding', 'content-length', 'last-modified'];
  return Object.freeze(Object.fromEntries(allowed.flatMap((name) => headers[name] ? [[name, headers[name]]] : [])));
}

function event(state: CaptureStateEvent['state'], at: string, detail?: string): CaptureStateEvent {
  return Object.freeze({ state, at, ...(detail ? { detail } : {}) });
}

function failureFor(error: unknown): CaptureStageError {
  if (error instanceof CaptureStageError) return error;
  if (error instanceof BodyReadError) return new CaptureStageError('body', error.code, error.message);
  if (error instanceof ExtractionError) return new CaptureStageError('extraction', 'invalid_text', error.message);
  if (error instanceof CapturePolicyError) return new CaptureStageError('policy', error.code, error.message);
  if ((error as Error).name === 'AbortError') return new CaptureStageError('transport', 'capture_timeout', 'Capture exceeded its total timeout');
  return new CaptureStageError('storage', 'capture_failed', 'Capture failed without persisting external error details');
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

function ensureHeaderBounds(response: TransportResponse, limits: CaptureLimits): void {
  if (response.headerBytes > limits.maxHeaderBytes || response.headerCount > limits.maxHeaderCount) {
    response.abort();
    throw new CaptureStageError('transport', 'headers_oversize', 'Response headers exceeded configured limits');
  }
}

export function realUrlCaptureEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  const raw = environment.FOUNDRY_REAL_URLS_ENABLED ?? '0';
  if (raw !== '0' && raw !== '1') throw new Error('FOUNDRY_REAL_URLS_ENABLED must be 0 or 1');
  return raw === '1';
}

export class CaptureKernel {
  private readonly limits: CaptureLimits;
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private readonly extractor: CaptureExtractor;
  private readonly semaphore: Semaphore;
  private readonly inFlight = new Map<string, { readonly requestFingerprint: string; readonly promise: Promise<CaptureRecord> }>();

  constructor(private readonly dependencies: CaptureKernelDependencies) {
    this.limits = Object.freeze({ ...DEFAULT_CAPTURE_LIMITS, ...dependencies.limits });
    if (!Number.isInteger(this.limits.maxConcurrency) || this.limits.maxConcurrency < 1) {
      throw new Error('Capture maxConcurrency must be a positive integer');
    }
    this.now = dependencies.now ?? (() => new Date());
    this.idFactory = dependencies.idFactory ?? randomUUID;
    this.extractor = dependencies.extractor ?? {
      extract: async (content, mediaType, charset, signal) => {
        await new Promise<void>((resolve) => setImmediate(resolve));
        signal.throwIfAborted();
        const text = decodeText(content, charset);
        const blocks = extractBlocks(text, mediaType);
        signal.throwIfAborted();
        return { blocks, extractedText: blocks.map((block) => block.text).join('\n\n') };
      },
    };
    this.semaphore = new Semaphore(this.limits.maxConcurrency);
  }

  async capture(input: CaptureInput): Promise<CaptureRecord> {
    if (!this.dependencies.enabled) throw new CaptureDisabledError('Real URL capture is disabled');
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 256) throw new Error('A bounded idempotency key is required');
    const canonicalUrl = canonicalizeCaptureUrl(input.url);
    const requestFingerprint = sha256(canonicalUrl.href);
    const safeRequestedUrl = redactCaptureUrl(canonicalUrl);
    const keyHash = sha256(input.idempotencyKey);
    const deadlineAt = Date.now() + this.limits.totalTimeoutMs;
    const active = this.inFlight.get(keyHash);
    if (active) {
      if (active.requestFingerprint !== requestFingerprint) {
        throw new CaptureIdempotencyConflictError('Idempotency key is already bound to a different capture URL');
      }
      return active.promise;
    }
    const operation = this.semaphore.use(async () => {
      const remaining = deadlineAt - Date.now();
      if (remaining <= 0) throw new CaptureStageError('storage', 'capture_timeout', 'Capture exceeded its total timeout');
      const existing = await after(
        this.dependencies.repository.getByIdempotencyKey(input.idempotencyKey),
        remaining,
        () => new CaptureStageError('storage', 'capture_timeout', 'Capture exceeded its total timeout'),
      );
      if (existing) {
        if (existing.attempt.requestFingerprint !== requestFingerprint) {
          throw new CaptureIdempotencyConflictError('Idempotency key is already bound to a different capture URL');
        }
        return existing;
      }
      return this.captureOnce(canonicalUrl, safeRequestedUrl, requestFingerprint, keyHash, deadlineAt);
    });
    this.inFlight.set(keyHash, { requestFingerprint, promise: operation });
    try {
      return await operation;
    } finally {
      this.inFlight.delete(keyHash);
    }
  }

  private async captureOnce(
    initialUrl: URL,
    safeRequestedUrl: string,
    requestFingerprint: string,
    keyHash: string,
    deadlineAt: number,
  ): Promise<CaptureRecord> {
    const createdAt = this.now().toISOString();
    const attemptId = `capture-${keyHash.slice(0, 24)}`;
    const events: CaptureStateEvent[] = [event('queued', createdAt)];
    let sourceRevision: SourceRevision | undefined;
    const controller = new AbortController();
    const totalTimer = setTimeout(() => controller.abort(), Math.max(1, deadlineAt - Date.now()));
    const totalFailure = (stage: CaptureStageError['stage']) => new CaptureStageError(stage, 'capture_timeout', 'Capture exceeded its total timeout');
    const assertWithinDeadline = (stage: CaptureStageError['stage']): void => {
      if (Date.now() >= deadlineAt || controller.signal.aborted) {
        controller.abort();
        throw totalFailure(stage);
      }
    };
    const waitFor = <T>(
      promise: Promise<T>,
      stage: CaptureStageError['stage'],
      stageTimeoutMs = Number.POSITIVE_INFINITY,
      stageTimeout?: () => CaptureStageError,
      abort?: () => void,
    ): Promise<T> => {
      const remaining = deadlineAt - Date.now();
      if (remaining <= 0 || controller.signal.aborted) {
        controller.abort();
        abort?.();
        return Promise.reject(totalFailure(stage));
      }
      const totalWins = remaining <= stageTimeoutMs;
      return after(promise, Math.max(1, Math.min(remaining, stageTimeoutMs)), () => {
        if (totalWins || !stageTimeout) controller.abort();
        abort?.();
        return totalWins || !stageTimeout ? totalFailure(stage) : stageTimeout();
      });
    };
    const persist = (record: CaptureRecord): Promise<CaptureRecord> => {
      assertWithinDeadline('storage');
      return waitFor(this.dependencies.repository.save(record), 'storage');
    };

    try {
      let currentUrl = initialUrl;
      events.push(event('capturing', this.now().toISOString()));
      const redirects: Array<{
        url: string;
        status: number;
        location: string;
        resolvedAddresses: string[];
        selectedAddress: string;
        remoteAddress: string;
      }> = [];

      for (let redirectCount = 0; ; redirectCount += 1) {
        assertWithinDeadline('dns');
        let answers;
        const dnsController = new AbortController();
        const abortDns = () => dnsController.abort();
        controller.signal.addEventListener('abort', abortDns, { once: true });
        try {
          answers = await waitFor(
            resolveAndValidate(currentUrl, this.dependencies.resolver, dnsController.signal),
            'dns',
            this.limits.dnsTimeoutMs,
            () => new CaptureStageError('dns', 'dns_timeout', 'DNS resolution exceeded its timeout'),
            abortDns,
          );
        } catch (error) {
          if (error instanceof CaptureStageError) throw error;
          if (error instanceof CapturePolicyError) throw new CaptureStageError('dns', error.code, error.message);
          throw new CaptureStageError('dns', 'dns_failed', 'DNS resolution failed closed');
        } finally {
          controller.signal.removeEventListener('abort', abortDns);
        }
        const selected = answers[0];
        assertWithinDeadline('transport');
        let response: TransportResponse;
        const transportController = new AbortController();
        const abortTransport = () => transportController.abort();
        controller.signal.addEventListener('abort', abortTransport, { once: true });
        try {
          response = await waitFor(
            this.dependencies.transport.request({
              url: currentUrl,
              pinnedAddress: selected,
              maxHeaderBytes: this.limits.maxHeaderBytes,
              signal: transportController.signal,
            }),
            'transport',
            this.limits.headerTimeoutMs,
            () => new CaptureStageError('transport', 'header_timeout', 'Response headers exceeded their timeout'),
            abortTransport,
          );
        } catch (error) {
          if (error instanceof CaptureStageError) throw error;
          throw new CaptureStageError('transport', 'transport_failed', 'HTTPS transport failed closed');
        } finally {
          controller.signal.removeEventListener('abort', abortTransport);
        }
        ensureHeaderBounds(response, this.limits);
        if (!answers.some((answer) => sameIpAddress(answer.address, response.remoteAddress)) || !sameIpAddress(selected.address, response.remoteAddress)) {
          response.abort();
          throw new CaptureStageError('transport', 'remote_address_mismatch', 'Connected address did not match the validated DNS pin');
        }

        if (isRedirect(response.status)) {
          const location = response.headers.location;
          response.abort();
          if (!location) throw new CaptureStageError('transport', 'redirect_missing_location', 'Redirect response omitted Location');
          if (redirectCount >= this.limits.maxRedirects) throw new CaptureStageError('transport', 'redirect_limit', 'Redirect chain exceeded its configured limit');
          let nextUrl: URL;
          try {
            nextUrl = canonicalizeCaptureUrl(location, currentUrl);
          } catch (error) {
            const policy = failureFor(error);
            throw new CaptureStageError('policy', `redirect_${policy.code}`, policy.message);
          }
          redirects.push({
            url: redactCaptureUrl(currentUrl),
            status: response.status,
            location: redactCaptureUrl(nextUrl),
            resolvedAddresses: answers.map((answer) => answer.address),
            selectedAddress: selected.address,
            remoteAddress: response.remoteAddress,
          });
          currentUrl = nextUrl;
          continue;
        }

        if (response.status < 200 || response.status > 299) {
          response.abort();
          throw new CaptureStageError('transport', 'http_status', `Capture returned HTTP status ${response.status}`);
        }
        let mediaType: 'text/html' | 'text/plain';
        let charset: 'utf-8' | 'us-ascii';
        let contentEncoding: 'identity' | 'gzip' | 'deflate' | 'br';
        try {
          ({ mediaType, charset } = parseContentType(response.headers['content-type']));
          contentEncoding = parseContentEncoding(response.headers['content-encoding']);
        } catch (error) {
          response.abort();
          throw error;
        }
        assertWithinDeadline('body');
        const body = await waitFor(
          readBoundedBody(response, contentEncoding, this.limits, controller.signal),
          'body',
          Number.POSITIVE_INFINITY,
          undefined,
          response.abort,
        );
        assertWithinDeadline('storage');
        const [wireBlob, contentBlob] = await waitFor(Promise.all([
          this.dependencies.blobs.put(body.wire),
          this.dependencies.blobs.put(body.decoded),
        ]), 'storage');
        const sourceRevisionId = `source-${sha256(this.idFactory()).slice(0, 24)}`;
        sourceRevision = SourceRevisionSchema.parse({
          schemaVersion: 'pi.source-revision.v1',
          id: sourceRevisionId,
          attemptId,
          requestedUrl: safeRequestedUrl,
          canonicalUrl: redactCaptureUrl(currentUrl),
          capturedAt: this.now().toISOString(),
          status: response.status,
          mediaType,
          charset,
          contentEncoding,
          headers: safeHeaders(response.headers),
          redirects,
          resolvedAddresses: answers.map((answer) => answer.address),
          selectedAddress: selected.address,
          remoteAddress: response.remoteAddress,
          wireBlobHash: wireBlob.hash,
          contentBlobHash: contentBlob.hash,
          wireBytes: body.wire.length,
          decodedBytes: body.decoded.length,
        });
        events.push(event('captured', this.now().toISOString()));
        events.push(event('extracting', this.now().toISOString()));

        assertWithinDeadline('extraction');
        const { blocks, extractedText } = await waitFor(
          this.extractor.extract(body.decoded, mediaType, charset, controller.signal),
          'extraction',
        );
        assertWithinDeadline('extraction');
        assertWithinDeadline('storage');
        const extractedBlob = await waitFor(this.dependencies.blobs.put(Buffer.from(extractedText, 'utf8')), 'storage');
        const extractionRevisionId = `extract-${sha256(this.idFactory()).slice(0, 24)}`;
        const extractionRevision = buildExtractionRevision({
          id: extractionRevisionId,
          attemptId,
          sourceRevisionId,
          extractedAt: this.now().toISOString(),
          sourceContentBlobHash: contentBlob.hash,
          extractedTextBlobHash: extractedBlob.hash,
          blocks,
        });
        const finalState = blocks.length === 0 ? 'no_story' : 'extracted';
        events.push(event(finalState, this.now().toISOString(), blocks.length === 0 ? 'No extractable story text was found.' : undefined));
        return persist(CaptureRecordSchema.parse({
          schemaVersion: 'pi.capture-manifest.v1',
          attempt: CaptureAttemptSchema.parse({
            schemaVersion: 'pi.capture-attempt.v1',
            id: attemptId,
            idempotencyKeyHash: keyHash,
            requestFingerprint,
            requestedUrl: safeRequestedUrl,
            createdAt,
            completedAt: this.now().toISOString(),
            state: finalState,
            events,
            sourceRevisionId,
            extractionRevisionId,
            outcomeReason: blocks.length === 0 ? { code: 'no_extractable_text', detail: 'No extractable story text was found.' } : undefined,
          }),
          sourceRevision,
          extractionRevision,
        }));
      }
    } catch (error) {
      const completedAt = this.now().toISOString();
      if (['extracted', 'no_story', 'held', 'failed'].includes(events.at(-1)?.state ?? '')) throw error;
      if (error instanceof CaptureHeldError) {
        if (events.at(-1)?.state !== 'capturing' && events.at(-1)?.state !== 'captured' && events.at(-1)?.state !== 'extracting') {
          events.push(event('capturing', completedAt));
        }
        events.push(event('held', completedAt, error.message));
        return persist(CaptureRecordSchema.parse({
          schemaVersion: 'pi.capture-manifest.v1',
          attempt: {
            schemaVersion: 'pi.capture-attempt.v1', id: attemptId, idempotencyKeyHash: keyHash,
            requestFingerprint,
            requestedUrl: safeRequestedUrl, createdAt, completedAt, state: 'held', events,
            sourceRevisionId: sourceRevision?.id,
            outcomeReason: { code: error.code, detail: error.message },
          },
          sourceRevision,
        }));
      }
      const failure = failureFor(error);
      if (events.at(-1)?.state === 'queued') events.push(event('capturing', completedAt));
      events.push(event('failed', completedAt, failure.code));
      return persist(CaptureRecordSchema.parse({
        schemaVersion: 'pi.capture-manifest.v1',
        attempt: {
          schemaVersion: 'pi.capture-attempt.v1', id: attemptId, idempotencyKeyHash: keyHash,
          requestFingerprint,
          requestedUrl: safeRequestedUrl, createdAt, completedAt, state: 'failed', events,
          sourceRevisionId: sourceRevision?.id,
          failure: { stage: failure.stage, code: failure.code, message: failure.message },
        },
        sourceRevision,
      }));
    } finally {
      clearTimeout(totalTimer);
    }
  }
}

export function createCaptureKernel(root: string, environment: NodeJS.ProcessEnv = process.env): CaptureKernel {
  return new CaptureKernel({
    enabled: realUrlCaptureEnabled(environment),
    resolver: new NodeDnsResolver(),
    transport: createPinnedHttpsTransport(),
    blobs: new ContentAddressedBlobStore(root),
    repository: new FileCaptureRepository(root),
  });
}
