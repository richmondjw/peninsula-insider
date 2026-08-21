# Content Foundry sealed capture kernel

Date: 2026-08-21
Status: implemented behind a default-off flag; no caller exposed
Tracks: DELI-693, GitHub issue #324, stacked base `ebe0702bd369641f3235dc7c54955c678b54eb8e`

## Decision

Real URL ingestion must pass through one sealed `CaptureKernel`. The kernel is backend-only, has no Express route, UI action or provider adapter, and remains disabled unless `FOUNDRY_REAL_URLS_ENABLED=1`. The local Compose runtime explicitly sets the flag to `0`.

The kernel owns URL policy, DNS validation, the pinned HTTPS connection, redirect handling, byte and time bounds, immutable storage and inert extraction. CI rejects direct HTTP clients or socket-opening imports outside the single pinned transport module.

## Network boundary

- Parse with WHATWG URL and allow only HTTPS on port 443.
- Reject credentials, malformed hostnames and special-use suffixes including `.localhost`, `.local`, `.internal`, `.home.arpa`, `.onion`, `.test`, `.example` and `.invalid`.
- Resolve both A and AAAA answers. Every answer must be public unicast; one private, loopback, link-local, CGNAT, metadata, multicast, reserved or IPv4-mapped IPv6 answer rejects the hop.
- Pin one member of the validated set into the TLS connection. The connected `remoteAddress` must equal that pin and remain a member of the validated set.
- Follow redirects manually, at most five. Reapply URL, DNS, pin and remote-address checks on every hop; an HTTPS downgrade fails closed.
- Bound header bytes and count, wire and decoded body bytes, DNS/header/body/total time and concurrent captures.

All query values may be used only in memory for the outbound request. Persisted attempt, source and redirect URLs replace every query value with `[redacted]`; request headers with credential or cookie value are never persisted. A SHA-256 request fingerprint binds the exact canonical request to its idempotency key without storing the URL value, and reuse with a different request fails closed. Failure records use controlled messages rather than raw transport errors.

## Immutable records

`CaptureAttempt`, `SourceRevision` and `ExtractionRevision` are independently schema-versioned contracts with enforced attempt/source/extraction cross-links. They are committed together in one immutable `pi.capture-manifest.v1`. Attempt event histories enforce legal transitions through capture, extraction, held, no-story and failure outcomes. Idempotency keys are stored only as SHA-256 hashes.

Blobs are addressed by SHA-256 under a root-contained path. Writes use `wx`, file `fsync`, supported-platform parent-directory `fsync`, and exact-byte verification when an address already exists. Manifest commit uses a same-directory private temporary file, file `fsync`, atomic rename and parent-directory `fsync`; the rebuildable idempotency index is written only after the manifest. A crash before manifest commit leaves only reusable blobs. A crash after manifest commit is recovered from the deterministic attempt ID and recreates the missing index. Replaying an idempotency key returns one attempt; a new key produces new immutable revisions while identical source and extracted blobs are reused.

## Extraction and evidence

Only `text/html` and `text/plain` with UTF-8 or US-ASCII enter extraction. Gzip, deflate and Brotli are decoded under separate wire and decoded limits. DNS, headers, body idle time, total capture time and concurrency are independently bounded; the total deadline wraps extraction, blob writes and manifest persistence as well as network work. `parse5` parses HTML without script execution or subresource fetching; script, style, template, SVG and similar non-story nodes are excluded. Prompt-like text in ordinary content remains inert evidence text.

Every extracted block has a stable locator and hash. A capture evidence locator names both the source and extraction revision and resolves only when its excerpt and hash reproduce from that immutable revision.

## Gates retained

This decision grants no production deployment, team-network exposure, credentials, provider spend, CMS or Git mutation, publication, email/social distribution or publication-ledger authority. PI public artifacts still prohibit prices and em dashes, and Workbench review remains distinct from source verification and publication.
