# Content Foundry V1 integration

Status: accepted implementation boundary for GitHub issue #331; V1 release-candidate extension for #332

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

## V1 release-candidate multi-format boundary

The `#332` release candidate extends the same v3 run, v2 artifact-pack, permanent origin-authority and immutable review-receipt model to deterministic newsletter/social, explainer, podcast and short-video fixtures. It does not expand real-source generation beyond Quick Note, Article, metadata and Ask.

`newsletter_social_v1` preserves the exact 11-position Insider Note contract, honest omission of optional positions, a separate James-only subject set and draft-only social artifacts. Newsletter fixtures remain text-only because V1 cannot bind the old lane's image input to an exact asset/version/content hash, email placement, rights version and releases. Any newsletter image use therefore fails closed. Social recognisable-person state binds exact sorted release IDs into both the rights hash and dependency: `none` requires no release IDs, `released` requires at least one, and `unknown` or `unreleased` blocks review and handoff.

The pre-production recipes preserve five explainer, seven podcast and nine short-video artifacts with exact public-field claim/evidence lineage and independent reviews. Text, script and storyboard handoffs may pass while `media_render_ready` remains a visible nonblocking wait. Assigning media changes the boundary: readiness then fails closed unless every placement has the exact asset, version, content hash, surface, rights version, releases and disclosures. V1 grants no record, render, documentary-generation, cloned-voice or synthetic-voice authority.

Client edits may change payloads but cannot create lineage, dependencies or rights. Existing exact factual paths retain their immutable claim hashes so altered claims become stale; appended fact-implying paths without server-owned lineage are rejected. One sampled operation clock still governs gate, review, restart and export reconciliation. Recursive staleness remains selective across exact artifact dependencies.

## Compatibility

The store reads v0.1, artifact-pack v1/v2, #325 single-artifact v2 and the accepted newsletter/social and pre-production v2 fixture snapshots. The first mutation atomically persists v3. Valid legacy sealed receipts are preserved only as stale historical evidence (`schema_migrated`); unsealed reviews are stale as `legacy_unsealed`. Accepted multi-format snapshots are not trusted wholesale: the server reconstructs the exact current deterministic fixture only for these final frozen pairs, retains old reviews as stale historical records, and reseals the reconstructed origin:

- `newsletter_social_v1` with `bundle-red-hill-newsletter-social`;
- `explainer_preproduction_v1` with `bundle-red-hill-explainer-preproduction`;
- `podcast_preproduction_v1` with `bundle-red-hill-podcast-preproduction`;
- `short_video_preproduction_v1` with `bundle-red-hill-short-video-preproduction`.

Cross-paired, renamed, unsupported or altered legacy origins fail closed and cannot gain review or export authority.

The mandatory Impeccable context helper was attempted before V1 release-candidate visual decisions. It was unavailable in the execution environment with `MODULE_NOT_FOUND` for `/home/node/.agents/skills/impeccable/scripts/context.mjs` on Node 22.22.3. The UI therefore makes no new visual-direction decision: it reuses the existing PI tokens and components, adds accessible recipe and artifact tablists with full arrow/Home/End behavior, preserves hidden native scrollbars with an edge-fade/swipe affordance, and adds deduplicated polite launch, review and media-WAIT status.

Windows screen-reader speech remains explicitly unobserved. NVDA was not installed. Windows Narrator launched and Chrome was selected, but the permitted control surface could not establish the local browser URL with sufficient confidence, so no announcement claim was made and Narrator was stopped. Automated tests prove each run-scoped launch, review and media-WAIT event changes the single polite operation-status state once, exact duplicates are suppressed, and every distinct event increments the token rendered into the live-region text. Browser evidence proves the accessibility-tree roles, labels, focus, keyboard behavior and live-region text. A human NVDA or Narrator smoke on the local 44332 candidate remains a release-environment acceptance step, not evidence supplied by this implementation.
