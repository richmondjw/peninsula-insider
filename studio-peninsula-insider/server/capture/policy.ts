import { resolve4, resolve6 } from 'node:dns/promises';
import { isIP } from 'node:net';
import { domainToUnicode } from 'node:url';
import ipaddr from 'ipaddr.js';

export interface ResolvedAddress {
  readonly address: string;
  readonly family: 4 | 6;
}

export interface DnsResolver {
  resolve(hostname: string, signal: AbortSignal): Promise<readonly ResolvedAddress[]>;
}

export class CapturePolicyError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'CapturePolicyError';
  }
}

const BLOCKED_HOST_SUFFIXES = ['localhost', 'local', 'internal', 'home.arpa', 'onion', 'test', 'example', 'invalid'];

function isNoData(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ENODATA' || code === 'ENOTFOUND';
}

export class NodeDnsResolver implements DnsResolver {
  async resolve(hostname: string, signal: AbortSignal): Promise<readonly ResolvedAddress[]> {
    signal.throwIfAborted();
    const [v4, v6] = await Promise.all([
      resolve4(hostname).catch((error: unknown) => {
        if (isNoData(error)) return [];
        throw error;
      }),
      resolve6(hostname).catch((error: unknown) => {
        if (isNoData(error)) return [];
        throw error;
      }),
    ]);
    signal.throwIfAborted();
    return [
      ...v4.map((address): ResolvedAddress => ({ address, family: 4 })),
      ...v6.map((address): ResolvedAddress => ({ address, family: 6 })),
    ];
  }
}

export function canonicalizeCaptureUrl(input: string, base?: URL): URL {
  let url: URL;
  try {
    url = base ? new URL(input, base) : new URL(input);
  } catch {
    throw new CapturePolicyError('invalid_url', 'Capture URL is invalid');
  }
  if (url.protocol !== 'https:') {
    throw new CapturePolicyError('https_required', 'Capture URLs must use HTTPS');
  }
  if (url.port && url.port !== '443') {
    throw new CapturePolicyError('port_blocked', 'Capture URLs may use only port 443');
  }
  if (url.username || url.password) {
    throw new CapturePolicyError('credentials_blocked', 'Capture URLs may not contain credentials');
  }
  if (!url.hostname) {
    throw new CapturePolicyError('hostname_required', 'Capture URL requires a hostname');
  }
  const literal = unbracket(url.hostname);
  if (!isIP(literal)) {
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!hostname || !domainToUnicode(hostname) || hostname.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
      throw new CapturePolicyError('invalid_hostname', 'Capture hostname is not a valid DNS name');
    }
    if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) {
      throw new CapturePolicyError('special_use_hostname', `Capture hostname uses blocked suffix .${hostname.split('.').at(-1)}`);
    }
    url.hostname = hostname;
  }
  url.port = '';
  url.hash = '';
  return url;
}

export function redactCaptureUrl(url: URL): string {
  const redacted = new URL(url.href);
  for (const name of [...new Set(redacted.searchParams.keys())]) {
    redacted.searchParams.set(name, '[redacted]');
  }
  return redacted.href;
}

function unbracket(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

export function normalizeIpAddress(address: string): string {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(unbracket(address));
  } catch {
    throw new CapturePolicyError('invalid_ip', `DNS returned an invalid address: ${address}`);
  }
  return parsed.toNormalizedString();
}

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.parse(unbracket(address));
    if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) return false;
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

export function sameIpAddress(left: string, right: string): boolean {
  try {
    return normalizeIpAddress(left) === normalizeIpAddress(right);
  } catch {
    return false;
  }
}

export async function resolveAndValidate(
  url: URL,
  resolver: DnsResolver,
  signal: AbortSignal,
): Promise<readonly ResolvedAddress[]> {
  const hostname = unbracket(url.hostname);
  const literalFamily = isIP(hostname);
  const answers = literalFamily
    ? [{ address: hostname, family: literalFamily as 4 | 6 }]
    : await resolver.resolve(hostname, signal);

  if (answers.length === 0) {
    throw new CapturePolicyError('dns_empty', 'DNS returned no A or AAAA answers');
  }
  const normalized = answers.map((answer): ResolvedAddress => ({
    address: normalizeIpAddress(answer.address),
    family: answer.family,
  }));
  const blocked = normalized.filter((answer) => !isPublicAddress(answer.address));
  if (blocked.length > 0) {
    throw new CapturePolicyError('non_public_address', `DNS included blocked address ${blocked[0].address}`);
  }

  const unique = new Map(normalized.map((answer) => [`${answer.family}:${answer.address}`, answer]));
  return [...unique.values()].sort((left, right) => left.family - right.family || left.address.localeCompare(right.address));
}
