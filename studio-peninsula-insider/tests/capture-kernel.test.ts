import { gzipSync } from 'node:zlib';
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CaptureAttemptSchema, CaptureRecordSchema, type CaptureRecord } from '../shared/capture-contracts.js';
import { ContentAddressedBlobStore, sha256 } from '../server/capture/blob-store.js';
import { ImmutableFileStore } from '../server/capture/filesystem.js';
import { createEvidenceLocator, resolveEvidenceLocator } from '../server/capture/extractor.js';
import { CaptureDisabledError, CaptureIdempotencyConflictError, CaptureKernel, realUrlCaptureEnabled } from '../server/capture/kernel.js';
import { canonicalizeCaptureUrl, isPublicAddress, type DnsResolver, type ResolvedAddress } from '../server/capture/policy.js';
import { FileCaptureRepository } from '../server/capture/repository.js';
import { createPinnedLookup } from '../server/capture/transport.js';
import type { CaptureTransport, TransportRequest, TransportResponse } from '../server/capture/transport-contract.js';

const temporaryDirectories: string[] = [];
const PUBLIC_V4: ResolvedAddress = { address: '93.184.216.34', family: 4 };

function bytes(value: string | Uint8Array): Uint8Array {
  return typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
}

function fakeResponse(input: {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  chunks?: Array<{ value: string | Uint8Array; delayMs?: number }>;
  remoteAddress?: string;
  headerBytes?: number;
  headerCount?: number;
} = {}): TransportResponse & { readonly wasAborted: () => boolean } {
  let aborted = false;
  const headers = Object.freeze(input.headers ?? { 'content-type': 'text/html; charset=utf-8' });
  const chunks = input.chunks ?? [{ value: input.body ?? '<p>Safe local fixture</p>' }];
  return Object.freeze({
    status: input.status ?? 200,
    headers,
    headerBytes: input.headerBytes ?? Object.entries(headers).reduce((total, [name, value]) => total + name.length + value.length + 4, 0),
    headerCount: input.headerCount ?? Object.keys(headers).length,
    remoteAddress: input.remoteAddress ?? PUBLIC_V4.address,
    body: {
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          if (chunk.delayMs) await new Promise((resolve) => setTimeout(resolve, chunk.delayMs));
          if (aborted) return;
          yield bytes(chunk.value);
        }
      },
    },
    abort: () => { aborted = true; },
    wasAborted: () => aborted,
  });
}

class FakeTransport implements CaptureTransport {
  readonly requests: TransportRequest[] = [];
  constructor(private readonly handler: (input: TransportRequest, index: number) => Promise<TransportResponse> | TransportResponse) {}
  async request(input: TransportRequest): Promise<TransportResponse> {
    this.requests.push(input);
    return this.handler(input, this.requests.length - 1);
  }
}

function resolverFor(handler: (hostname: string) => readonly ResolvedAddress[] = () => [PUBLIC_V4]): DnsResolver {
  return { resolve: async (hostname, signal) => { signal.throwIfAborted(); return handler(hostname); } };
}

async function harness(input: {
  resolver?: DnsResolver;
  transport?: CaptureTransport;
  enabled?: boolean;
  limits?: ConstructorParameters<typeof CaptureKernel>[0]['limits'];
} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'pi-capture-'));
  temporaryDirectories.push(root);
  const blobs = new ContentAddressedBlobStore(root);
  const repository = new FileCaptureRepository(root);
  const transport = input.transport ?? new FakeTransport(() => fakeResponse());
  const kernel = new CaptureKernel({
    enabled: input.enabled ?? true,
    resolver: input.resolver ?? resolverFor(),
    transport,
    blobs,
    repository,
    now: () => new Date('2026-08-21T07:00:00.000Z'),
    limits: input.limits,
  });
  return { root, blobs, repository, transport, kernel };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('pinned HTTPS transport', () => {
  it('answers both address-selection callback shapes with the one validated address', () => {
    const lookup = createPinnedLookup(PUBLIC_V4);
    const scalar: unknown[] = [];
    const all: unknown[] = [];

    lookup('news.public-site.org', {}, (...args) => scalar.push(args));
    lookup('news.public-site.org', { all: true }, (...args) => all.push(args));

    expect(scalar).toEqual([[null, PUBLIC_V4.address, 4]]);
    expect(all).toEqual([[null, [{ address: PUBLIC_V4.address, family: 4 }]]]);
  });
});

describe('sealed CaptureKernel policy', () => {
  it('defaults the real-URL flag off and rejects malformed flag values', async () => {
    expect(realUrlCaptureEnabled({})).toBe(false);
    expect(realUrlCaptureEnabled({ FOUNDRY_REAL_URLS_ENABLED: '1' })).toBe(true);
    expect(() => realUrlCaptureEnabled({ FOUNDRY_REAL_URLS_ENABLED: 'yes' })).toThrow(/must be 0 or 1/);
    const { kernel } = await harness({ enabled: false });
    await expect(kernel.capture({ url: 'https://public.example.org/', idempotencyKey: 'disabled' })).rejects.toBeInstanceOf(CaptureDisabledError);
  });

  it('allows only public IP space and rejects literal, mapped and metadata ranges', () => {
    for (const address of [
      '0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1',
      '192.168.0.1', '224.0.0.1', '::', '::1', 'fe80::1', 'fc00::1', '::ffff:127.0.0.1', '::ffff:93.184.216.34',
    ]) expect(isPublicAddress(address), address).toBe(false);
    expect(isPublicAddress(PUBLIC_V4.address)).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });

  it('rejects unsafe schemes, ports, credentials, special-use hosts and malformed IDNs before transport', () => {
    for (const url of [
      'http://public.example.org/', 'https://public.example.org:444/', 'https://user:pass@public.example.org/',
      'https://localhost/', 'https://service.local/', 'https://service.internal/', 'https://router.home.arpa/',
      'https://hidden.onion/', 'https://fixture.test/', 'https://reserved.example/', 'https://reserved.invalid/', 'https://xn--/',
    ]) expect(() => canonicalizeCaptureUrl(url), url).toThrow();
  });

  it('fails closed when any A or AAAA answer or literal target is non-public', async () => {
    const transport = new FakeTransport(() => fakeResponse());
    const { kernel } = await harness({
      resolver: resolverFor(() => [PUBLIC_V4, { address: '10.0.0.7', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }]),
      transport,
    });
    const record = await kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: 'mixed-dns' });
    expect(record.attempt.state).toBe('failed');
    expect(record.attempt.failure).toMatchObject({ stage: 'dns', code: 'non_public_address' });
    expect(transport.requests).toHaveLength(0);
    for (const literal of ['https://127.0.0.1/', 'https://169.254.169.254/latest', 'https://[::ffff:127.0.0.1]/']) {
      const literalRecord = await kernel.capture({ url: literal, idempotencyKey: `literal-${literal}` });
      expect(literalRecord.attempt.failure).toMatchObject({ stage: 'dns', code: 'non_public_address' });
    }
  });

  it('pins a validated answer and rejects DNS rebinding at the connected socket', async () => {
    const transport = new FakeTransport(() => fakeResponse({ remoteAddress: '93.184.216.35' }));
    const { kernel } = await harness({ transport });
    const record = await kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: 'rebind' });
    expect(transport.requests[0].pinnedAddress).toEqual(PUBLIC_V4);
    expect(record.attempt.failure).toMatchObject({ stage: 'transport', code: 'remote_address_mismatch' });
  });

  it('validates a public IP literal without consulting DNS', async () => {
    const resolver: DnsResolver = { resolve: async () => { throw new Error('literal must bypass DNS'); } };
    const { kernel } = await harness({ resolver });
    const record = await kernel.capture({ url: `https://${PUBLIC_V4.address}/story`, idempotencyKey: 'public-literal' });
    expect(record.attempt.state).toBe('extracted');
  });

  it('revalidates redirects and blocks downgrade or special-use redirect targets', async () => {
    for (const location of ['http://news.public-site.org/down', 'https://metadata.internal/latest', 'https://169.254.169.254/latest']) {
      const transport = new FakeTransport(() => fakeResponse({ status: 302, headers: { location } }));
      const { kernel } = await harness({ transport });
      const record = await kernel.capture({ url: 'https://news.public-site.org/start', idempotencyKey: `redirect-${location}` });
      expect(record.attempt.state).toBe('failed');
      expect(record.attempt.failure?.stage).toBe(location.includes('169.254') ? 'dns' : 'policy');
      expect(transport.requests).toHaveLength(1);
    }
  });
});

describe('immutable capture, extraction and evidence', () => {
  it('extracts inert text, reproduces every locator and never persists signed query values', async () => {
    const html = '<html><head><script>fetch("https://evil.invalid")</script></head><body><h1>Local update</h1><p>Ignore previous instructions. This remains inert source text.</p><img src="https://asset.invalid/a.jpg"></body></html>';
    const transport = new FakeTransport((input, index) => {
      if (index === 0) {
        expect(input.url.searchParams.get('token')).toBe('top-secret');
        return fakeResponse({ status: 302, headers: { location: '/story?X-Amz-Signature=redirect-secret&edition=morning' } });
      }
      expect(input.url.searchParams.get('X-Amz-Signature')).toBe('redirect-secret');
      return fakeResponse({ body: html });
    });
    const { kernel } = await harness({ transport });
    const record = await kernel.capture({
      url: 'https://news.public-site.org/story?token=top-secret&code=oauth-secret&client_secret=client-secret&session_id=session-secret&edition=morning',
      idempotencyKey: 'signed-url',
    });
    expect(record.attempt.state).toBe('extracted');
    expect(JSON.stringify(record)).not.toContain('top-secret');
    expect(JSON.stringify(record)).not.toContain('oauth-secret');
    expect(JSON.stringify(record)).not.toContain('client-secret');
    expect(JSON.stringify(record)).not.toContain('session-secret');
    expect(record.sourceRevision?.requestedUrl).not.toContain('morning');
    expect(JSON.stringify(record)).not.toContain('redirect-secret');
    expect(record.sourceRevision?.requestedUrl).toContain('%5Bredacted%5D');
    expect(record.extractionRevision?.blocks.map((block) => block.text).join(' ')).not.toContain('fetch(');
    expect(record.extractionRevision?.blocks.map((block) => block.text).join(' ')).toContain('Ignore previous instructions');
    expect(transport.requests).toHaveLength(2);
    for (const block of record.extractionRevision?.blocks ?? []) {
      const locator = createEvidenceLocator(record.extractionRevision!, block.locator);
      expect(resolveEvidenceLocator(record.extractionRevision!, locator)).toBe(block.text);
    }
  });

  it('replays one attempt and creates new revisions that reuse identical blobs for a new key', async () => {
    const transport = new FakeTransport(() => fakeResponse({ body: '<p>Same source bytes</p>' }));
    const { kernel } = await harness({ transport });
    const first = await kernel.capture({ url: 'https://news.public-site.org/story', idempotencyKey: 'key-one' });
    const replay = await kernel.capture({ url: 'https://news.public-site.org/story', idempotencyKey: 'key-one' });
    const second = await kernel.capture({ url: 'https://news.public-site.org/story', idempotencyKey: 'key-two' });
    expect(replay.attempt.id).toBe(first.attempt.id);
    expect(second.attempt.id).not.toBe(first.attempt.id);
    expect(second.sourceRevision?.id).not.toBe(first.sourceRevision?.id);
    expect(second.sourceRevision?.wireBlobHash).toBe(first.sourceRevision?.wireBlobHash);
    expect(second.sourceRevision?.contentBlobHash).toBe(first.sourceRevision?.contentBlobHash);
    expect(second.extractionRevision?.extractedTextBlobHash).toBe(first.extractionRevision?.extractedTextBlobHash);
    expect(transport.requests).toHaveLength(2);
  });

  it('binds each idempotency key to the exact request fingerprint', async () => {
    const { kernel } = await harness();
    await kernel.capture({ url: 'https://news.public-site.org/one?token=first', idempotencyKey: 'bound-key' });
    await expect(kernel.capture({ url: 'https://news.public-site.org/two?token=second', idempotencyKey: 'bound-key' }))
      .rejects.toBeInstanceOf(CaptureIdempotencyConflictError);
  });

  it('persists stage-valid extracted, held, no-story and failed attempts', async () => {
    const extracted = await (await harness()).kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: 'state-extracted' });
    const held = await (await harness({ transport: new FakeTransport(() => fakeResponse({ headers: { 'content-type': 'application/pdf' } })) })).kernel
      .capture({ url: 'https://news.public-site.org/', idempotencyKey: 'state-held' });
    const noStory = await (await harness({ transport: new FakeTransport(() => fakeResponse({ body: '<script>nothing()</script>' })) })).kernel
      .capture({ url: 'https://news.public-site.org/', idempotencyKey: 'state-no-story' });
    const failed = await (await harness({ resolver: resolverFor(() => [{ address: '127.0.0.1', family: 4 }]) })).kernel
      .capture({ url: 'https://news.public-site.org/', idempotencyKey: 'state-failed' });
    expect([extracted.attempt.state, held.attempt.state, noStory.attempt.state, failed.attempt.state]).toEqual(['extracted', 'held', 'no_story', 'failed']);
    expect(() => CaptureAttemptSchema.parse({ ...extracted.attempt, state: 'held' })).toThrow(/Final event/);
  });

  it('keeps blobs append-only, verifies existing hashes and rejects path escape', async () => {
    const { root, blobs } = await harness();
    const content = Buffer.from('immutable');
    const first = await blobs.put(content);
    const replay = await blobs.put(content);
    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    await expect(blobs.get('../../escape')).rejects.toThrow(/SHA-256/);
    const blobPath = join(root, 'blobs', 'sha256', first.hash.slice(0, 2), first.hash);
    await writeFile(blobPath, 'corrupt', 'utf8');
    await expect(blobs.get(first.hash)).rejects.toThrow(/verification/);
  });

  it('recovers an atomic manifest when its rebuildable idempotency index is missing', async () => {
    const { root, kernel } = await harness();
    const input = { url: 'https://news.public-site.org/recovery', idempotencyKey: 'manifest-recovery' };
    const first = await kernel.capture(input);
    const indexPath = join(root, 'capture', 'idempotency', `${sha256(input.idempotencyKey)}.json`);
    await rm(indexPath);
    const transport = new FakeTransport(() => { throw new Error('recovery must not recapture'); });
    const recoveredKernel = new CaptureKernel({
      enabled: true,
      resolver: resolverFor(),
      transport,
      blobs: new ContentAddressedBlobStore(root),
      repository: new FileCaptureRepository(root),
      now: () => new Date('2026-08-21T08:00:00.000Z'),
    });
    const recovered = await recoveredKernel.capture(input);
    expect(recovered.attempt.id).toBe(first.attempt.id);
    expect(transport.requests).toHaveLength(0);
    expect(JSON.parse(await readFile(indexPath, 'utf8')).attemptId).toBe(first.attempt.id);
  });

  it('exercises traversal, symlink or junction, hardlink and file-type containment', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pi-immutable-root-'));
    const outside = await mkdtemp(join(tmpdir(), 'pi-immutable-outside-'));
    temporaryDirectories.push(root, outside);
    const files = new ImmutableFileStore(root);
    await expect(files.writeOnce(['..', 'escape'], Buffer.from('no'))).rejects.toThrow(/invalid segment/);

    await mkdir(join(root, 'records'), { recursive: true });
    await writeFile(join(outside, 'secret.txt'), 'secret', 'utf8');
    await link(join(outside, 'secret.txt'), join(root, 'records', 'hardlink.txt'));
    await expect(files.read(['records', 'hardlink.txt'])).rejects.toThrow(/private regular file/);

    await mkdir(join(root, 'records', 'directory.json'));
    await expect(files.read(['records', 'directory.json'])).rejects.toThrow(/private regular file/);

    if (process.platform !== 'win32') {
      await symlink(join(outside, 'secret.txt'), join(root, 'records', 'symlink.txt'), 'file');
      await expect(files.read(['records', 'symlink.txt'])).rejects.toThrow(/private regular file/);
    }
    await symlink(outside, join(root, 'junction'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(files.writeOnce(['junction', 'escaped.txt'], Buffer.from('no'))).rejects.toThrow(/escaped/);
  });

  it('rejects cross-linked immutable provenance from unrelated attempts or sources', async () => {
    const { kernel } = await harness();
    const record = await kernel.capture({ url: 'https://news.public-site.org/cross-link', idempotencyKey: 'cross-link' });
    expect(() => CaptureRecordSchema.parse({
      ...record,
      sourceRevision: { ...record.sourceRevision!, attemptId: 'capture-aaaaaaaaaaaaaaaaaaaaaaaa' },
    })).toThrow(/different attempt/);
    expect(() => CaptureRecordSchema.parse({
      ...record,
      extractionRevision: { ...record.extractionRevision!, sourceRevisionId: 'source-aaaaaaaaaaaaaaaaaaaaaaaa' },
    })).toThrow(/different source revision/);
    expect(() => CaptureRecordSchema.parse({
      ...record,
      extractionRevision: { ...record.extractionRevision!, sourceContentBlobHash: 'a'.repeat(64) },
    })).toThrow(/does not match its source blob/);
  });
});

describe('bounded deterministic transport processing', () => {
  it('fails closed on wire oversize, compressed expansion, slow bodies and malformed compression', async () => {
    const cases: Array<{ name: string; response: TransportResponse; limits: ConstructorParameters<typeof CaptureKernel>[0]['limits']; code: string }> = [
      { name: 'wire', response: fakeResponse({ body: 'x'.repeat(32) }), limits: { maxWireBytes: 8 }, code: 'wire_oversize' },
      { name: 'decoded', response: fakeResponse({ headers: { 'content-type': 'text/plain', 'content-encoding': 'gzip' }, body: gzipSync('x'.repeat(1_000)) }), limits: { maxDecodedBytes: 64 }, code: 'decoded_oversize' },
      { name: 'slow', response: fakeResponse({ chunks: [{ value: 'late', delayMs: 30 }] }), limits: { bodyIdleTimeoutMs: 5 }, code: 'body_timeout' },
      { name: 'compression', response: fakeResponse({ headers: { 'content-type': 'text/plain', 'content-encoding': 'gzip' }, body: 'not-gzip' }), limits: {}, code: 'invalid_compression' },
    ];
    for (const scenario of cases) {
      const { kernel } = await harness({ transport: new FakeTransport(() => scenario.response), limits: scenario.limits });
      const record = await kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: `bounded-${scenario.name}` });
      expect(record.attempt.failure?.code, scenario.name).toBe(scenario.code);
    }
  });

  it('holds invalid media or charset and fails invalid text without extracting it', async () => {
    const cases = [
      { key: 'media', response: fakeResponse({ headers: { 'content-type': 'image/png' } }), state: 'held', code: undefined },
      { key: 'charset', response: fakeResponse({ headers: { 'content-type': 'text/html; charset=shift_jis' } }), state: 'held', code: undefined },
      { key: 'utf8', response: fakeResponse({ body: Uint8Array.from([0xc3, 0x28]) }), state: 'failed', code: 'invalid_text' },
    ];
    for (const scenario of cases) {
      const response = scenario.response;
      const { kernel } = await harness({ transport: new FakeTransport(() => response) });
      const record = await kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: scenario.key });
      expect(record.attempt.state).toBe(scenario.state);
      expect(record.attempt.failure?.code).toBe(scenario.code);
      expect(response.wasAborted()).toBe(scenario.state === 'held');
    }
  });

  it('aborts unsupported content encodings and bounds extraction, blob and manifest waits by the total deadline', async () => {
    const unsupported = fakeResponse({ headers: { 'content-type': 'text/plain', 'content-encoding': 'compress' } });
    const unsupportedHarness = await harness({ transport: new FakeTransport(() => unsupported) });
    const unsupportedRecord = await unsupportedHarness.kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: 'unsupported-encoding' });
    expect(unsupportedRecord.attempt.failure?.code).toBe('unsupported_content_encoding');
    expect(unsupported.wasAborted()).toBe(true);

    const root = await mkdtemp(join(tmpdir(), 'pi-capture-timeout-'));
    temporaryDirectories.push(root);
    const hanging = <T>() => new Promise<T>(() => undefined);
    const base = {
      enabled: true,
      resolver: resolverFor(),
      transport: new FakeTransport(() => fakeResponse()),
      repository: new FileCaptureRepository(root),
      blobs: new ContentAddressedBlobStore(root),
      now: () => new Date('2026-08-21T09:00:00.000Z'),
      limits: { totalTimeoutMs: 15 },
    };
    const extractionKernel = new CaptureKernel({ ...base, extractor: { extract: () => hanging() } });
    await expect(extractionKernel.capture({ url: 'https://news.public-site.org/extract', idempotencyKey: 'timeout-extract' })).rejects.toThrow(/total timeout/);

    const blobKernel = new CaptureKernel({ ...base, blobs: { put: () => hanging() } });
    await expect(blobKernel.capture({ url: 'https://news.public-site.org/blob', idempotencyKey: 'timeout-blob' })).rejects.toThrow(/total timeout/);

    const manifestKernel = new CaptureKernel({
      ...base,
      repository: { getByIdempotencyKey: async () => undefined, save: () => hanging() },
    });
    await expect(manifestKernel.capture({ url: 'https://news.public-site.org/manifest', idempotencyKey: 'timeout-manifest' })).rejects.toThrow(/total timeout/);

    const lookupKernel = new CaptureKernel({
      ...base,
      repository: { getByIdempotencyKey: () => hanging(), save: async (record) => record },
    });
    await expect(lookupKernel.capture({ url: 'https://news.public-site.org/lookup', idempotencyKey: 'timeout-lookup' })).rejects.toThrow(/total timeout/);
  });

  it('bounds headers, redirects and concurrent captures', async () => {
    const headers = await harness({ transport: new FakeTransport(() => fakeResponse({ headerCount: 101 })) });
    expect((await headers.kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: 'headers' })).attempt.failure?.code).toBe('headers_oversize');
    const headerBytes = await harness({ transport: new FakeTransport(() => fakeResponse({ headerBytes: 40_000 })) });
    expect((await headerBytes.kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: 'header-bytes' })).attempt.failure?.code).toBe('headers_oversize');

    const redirectTransport = new FakeTransport((_input, index) => fakeResponse({ status: 302, headers: { location: `/hop-${index + 1}` } }));
    const redirectHarness = await harness({ transport: redirectTransport });
    expect((await redirectHarness.kernel.capture({ url: 'https://news.public-site.org/start', idempotencyKey: 'redirect-limit' })).attempt.failure?.code).toBe('redirect_limit');
    expect(redirectTransport.requests).toHaveLength(6);

    let active = 0;
    let maximumActive = 0;
    const concurrencyTransport = new FakeTransport(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return fakeResponse();
    });
    const concurrency = await harness({ transport: concurrencyTransport, limits: { maxConcurrency: 1 } });
    await Promise.all([
      concurrency.kernel.capture({ url: 'https://news.public-site.org/a', idempotencyKey: 'concurrency-a' }),
      concurrency.kernel.capture({ url: 'https://news.public-site.org/b', idempotencyKey: 'concurrency-b' }),
    ]);
    expect(maximumActive).toBe(1);
  });

  it('enforces deterministic DNS and response-header timeouts', async () => {
    const slowResolver: DnsResolver = {
      resolve: async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return [PUBLIC_V4];
      },
    };
    const dns = await harness({ resolver: slowResolver, limits: { dnsTimeoutMs: 5 } });
    expect((await dns.kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: 'dns-timeout' })).attempt.failure?.code).toBe('dns_timeout');

    const slowHeaders = new FakeTransport(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return fakeResponse();
    });
    const headers = await harness({ transport: slowHeaders, limits: { headerTimeoutMs: 5 } });
    expect((await headers.kernel.capture({ url: 'https://news.public-site.org/', idempotencyKey: 'header-timeout' })).attempt.failure?.code).toBe('header_timeout');
  });
});
