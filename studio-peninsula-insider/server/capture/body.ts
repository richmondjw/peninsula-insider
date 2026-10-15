import { Readable, type Transform } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import type { TransportResponse } from './transport-contract.js';

export interface BodyLimits {
  readonly maxWireBytes: number;
  readonly maxDecodedBytes: number;
  readonly bodyIdleTimeoutMs: number;
}

export class BodyReadError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'BodyReadError';
  }
}

function decoderFor(encoding: 'identity' | 'gzip' | 'deflate' | 'br'): Transform | undefined {
  if (encoding === 'gzip') return createGunzip();
  if (encoding === 'deflate') return createInflate();
  if (encoding === 'br') return createBrotliDecompress();
  return undefined;
}

async function nextWithIdleTimeout<T>(
  promise: Promise<IteratorResult<T>>,
  timeoutMs: number,
  abort: () => void,
): Promise<IteratorResult<T>> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          abort();
          reject(new BodyReadError('body_timeout', 'Response body exceeded the idle timeout'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function readBoundedBody(
  response: TransportResponse,
  encoding: 'identity' | 'gzip' | 'deflate' | 'br',
  limits: BodyLimits,
  signal: AbortSignal,
): Promise<{ readonly wire: Buffer; readonly decoded: Buffer }> {
  const contentLength = response.headers['content-length'];
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > limits.maxWireBytes) {
    response.abort();
    throw new BodyReadError('wire_oversize', 'Content-Length exceeds the wire-byte limit');
  }

  const wireChunks: Buffer[] = [];
  let wireBytes = 0;
  const boundedWire = async function* () {
    for await (const value of response.body) {
      signal.throwIfAborted();
      const chunk = Buffer.from(value);
      wireBytes += chunk.length;
      if (wireBytes > limits.maxWireBytes) {
        throw new BodyReadError('wire_oversize', 'Response exceeded the wire-byte limit');
      }
      wireChunks.push(chunk);
      yield chunk;
    }
  };

  const source = Readable.from(boundedWire());
  const decoder = decoderFor(encoding);
  const decodedStream = decoder ? source.pipe(decoder) : source;
  const decodedChunks: Buffer[] = [];
  let decodedBytes = 0;
  const iterator = decodedStream[Symbol.asyncIterator]();

  try {
    while (true) {
      signal.throwIfAborted();
      const next = await nextWithIdleTimeout(iterator.next(), limits.bodyIdleTimeoutMs, response.abort);
      if (next.done) break;
      const chunk = Buffer.from(next.value);
      decodedBytes += chunk.length;
      if (decodedBytes > limits.maxDecodedBytes) {
        throw new BodyReadError('decoded_oversize', 'Response exceeded the decoded-byte limit');
      }
      decodedChunks.push(chunk);
    }
  } catch (error) {
    response.abort();
    source.destroy();
    decoder?.destroy();
    if (error instanceof BodyReadError) throw error;
    if (signal.aborted) throw new BodyReadError('capture_timeout', 'Capture exceeded its total timeout');
    throw new BodyReadError('invalid_compression', 'Response body could not be decoded');
  }

  return Object.freeze({ wire: Buffer.concat(wireChunks), decoded: Buffer.concat(decodedChunks) });
}
