import { request as httpsRequest, type RequestOptions } from 'node:https';
import type { LookupFunction } from 'node:net';
import { sameIpAddress } from './policy.js';
import type { CaptureTransport, TransportRequest, TransportResponse } from './transport-contract.js';

function normalizeHeaders(rawHeaders: readonly string[]): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index].toLowerCase();
    const value = rawHeaders[index + 1] ?? '';
    headers[name] = headers[name] ? `${headers[name]}, ${value}` : value;
  }
  return Object.freeze(headers);
}

class PinnedHttpsTransport implements CaptureTransport {
  request(input: TransportRequest): Promise<TransportResponse> {
    return new Promise((resolve, reject) => {
      const lookup: LookupFunction = (_hostname, _options, callback) => {
        callback(null, input.pinnedAddress.address, input.pinnedAddress.family);
      };
      const options: RequestOptions & { autoSelectFamily: false } = {
        method: 'GET',
        agent: false,
        autoSelectFamily: false,
        lookup,
        maxHeaderSize: input.maxHeaderBytes,
        signal: input.signal,
        headers: {
          accept: 'text/html, text/plain;q=0.9',
          'accept-encoding': 'gzip, deflate, br',
          'user-agent': 'PeninsulaInsider-CaptureKernel/0.1',
        },
      };
      const request = httpsRequest(input.url, options, (response) => {
        const remoteAddress = response.socket.remoteAddress;
        if (!remoteAddress || !sameIpAddress(remoteAddress, input.pinnedAddress.address)) {
          response.destroy();
          reject(new Error('Connected remote address did not match the DNS-pinned address'));
          return;
        }
        const headerBytes = response.rawHeaders.reduce((total, value) => total + Buffer.byteLength(value) + 2, 0);
        resolve(Object.freeze({
          status: response.statusCode ?? 0,
          headers: normalizeHeaders(response.rawHeaders),
          headerBytes,
          headerCount: response.rawHeaders.length / 2,
          remoteAddress,
          body: response,
          abort: () => response.destroy(),
        }));
      });
      request.once('error', reject);
      request.end();
    });
  }
}

export function createPinnedHttpsTransport(): CaptureTransport {
  return new PinnedHttpsTransport();
}
