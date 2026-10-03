import type { ResolvedAddress } from './policy.js';

export interface TransportRequest {
  readonly url: URL;
  readonly pinnedAddress: ResolvedAddress;
  readonly maxHeaderBytes: number;
  readonly signal: AbortSignal;
}

export interface TransportResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly headerBytes: number;
  readonly headerCount: number;
  readonly remoteAddress: string;
  readonly body: AsyncIterable<Uint8Array>;
  abort(): void;
}

export interface CaptureTransport {
  request(input: TransportRequest): Promise<TransportResponse>;
}
