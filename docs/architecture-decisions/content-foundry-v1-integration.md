# Content Foundry V1 integration

Status: accepted implementation boundary for GitHub issue #331

## Decision

The V1 workbench uses `pi.foundry-run.v3`, `pi.artifact-pack.v2`, `pi.review-receipt.v2` and `pi.foundry-file-store.v3`. A real URL is captured into immutable source and extraction records before any public artifact exists. Quick Note may materialise from that capture; Article, metadata and Ask require a human lock over source classification, selected claim hashes and the exact angle.

The server owns the exhaustive public-field lineage policy. Clients cannot assert factual segments or claim usage. Every factual or fact-implying field binds an exact JSON path, value hash and immutable evidence IDs. Per-artifact dependencies, reviews and content-addressed receipts allow unrelated artifacts to remain current after a selective source refresh.

Text-only Article and Ask handoffs are valid after receipt-backed acceptance. Article Astro patch export is an independent boundary requiring an exact hero placement binding across asset ID/version/content hash, rights ID/version and applicable people releases. No review or client payload can manufacture that server-held dependency.

One injected evaluation timestamp is sampled per public store operation and reused for gate reconciliation, review decisions, status derivation and handoff validation. This prevents mixed-clock acceptance around expiring claims.

The shared editorial law prohibits literal and HTML-encoded em dashes and all prices or price implications, including zero-cost language. It applies during materialisation, editing, re-evaluation, review and every export. Quick source-note and Ask provenance public fields are exact server-derived, hash-bound templates and cannot be rewritten by clients.

Patch export is artifact-specific. A Quick Note adapter validates only the exact current Quick Note receipt and gates. The Article adapter validates the current Article and metadata receipts together and separately requires the exact current hero-rights binding.

Every run also references a `pi.run-origin-authority.v1` receipt in a hardened, content-addressed repository outside `runs.json`. The stable creation-time receipt binds the run, recipe and intake bundle to either the exact deterministic fixture contract or the original immutable capture attempt, request fingerprint, safe source head, source revision and extraction revision. It is checked on create, read, restart and every mutation or export path. Refresh retains this original anchor while current capture projections continue to resolve independently, so mutable run state cannot upgrade a fixture origin or downgrade a captured origin.

## Authority boundary

V1 has no provider/model calls and no publish, send, schedule or production mutation capability. External URL capture is default-off and remains protected by loopback Host/Origin/CSRF checks. Human review grants draft-handoff authority only.

## Compatibility

The store reads v0.1, artifact-pack v1/v2 and #325 single-artifact v2 snapshots. The first mutation atomically persists v3. Valid legacy sealed receipts are preserved only as stale historical evidence (`schema_migrated`); unsealed reviews are stale as `legacy_unsealed`. Legacy origin authority is sealed only when one exact server-owned recipe-and-bundle fixture pair can be reconstructed or a captured run resolves its complete immutable capture record. Cross-paired, renamed, unsupported or altered legacy origins fail closed and cannot gain review or export authority.
