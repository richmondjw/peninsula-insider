# Content Foundry local real URL orchestration

Date: 2026-08-21
Status: implemented behind a default-off local flag
Tracks: DELI-693, GitHub issue #325, stacked base `9e7e2d197db73bbbc3678103e8f201172ab3fa85`

## Decision

Add one disabled-by-default, native-loopback vertical slice around the immutable `CaptureKernel`:

```text
human HTTPS URL -> persisted capture projection -> immutable capture -> evidence-linked draft -> human review -> downloadable patch
```

The terminal capture manifest stays immutable. A separate schema-versioned projection records queued and capturing state before outbound work, then atomically materializes the safe terminal summary and any Foundry run. It stores only redacted URLs, hashes, immutable IDs and controlled codes. Exact query values exist only in the request closure. A persisted request fingerprint binds refreshes to the exact original URL identity without persisting query values. Real-URL reads fail closed unless the immutable capture repository is available: every revision summary, source item, claim, locator, excerpt and excerpt hash is reproduced from its sealed manifest and extraction. The read-only immutable resolver is wired even when capture is disabled, so turning the flag off disables routes and network authority without making previously captured work unreadable.

## Local security boundary

- `FOUNDRY_REAL_URLS_ENABLED` defaults to `0`; malformed values fail startup.
- Production startup remains rejected. Flag-on startup additionally requires native `127.0.0.1`, never `0.0.0.0`.
- Every API and SPA response requires the exact loopback Host and configured port. All flag-on API mutations require the custom CSRF header and, when Origin is present, the exact HTTP origin.
- The API permits one active capture, one submitted page, no crawl, no automatic retry and no batch input.
- Operator projections omit DNS answers, selected and remote addresses, raw exceptions and raw failure details. Redirect URLs and submitted URLs retain only redacted query values.
- Source HTML is never returned or rendered. Extracted excerpts are React text, bounded to 4,000 characters per segment, and explicitly labelled source-supported rather than independently verified.
- Idempotency binds the operation type, exact request fingerprint, refresh target and submitted target version. Only an exact retry replays; changed context conflicts before network work.

## Crash and refresh semantics

The projection is saved as queued and then capturing before the kernel is invoked. The kernel commits its immutable manifest before projection materialization. At startup, every nonterminal projection is reconciled by deterministic attempt ID:

- manifest present: materialize it idempotently without another network request;
- manifest absent: record terminal `capture_interrupted`, with no automatic refetch.

An extracted refresh appends a new revision, advances both the source head and artifact dependency, and stales every current review decision while retaining the append-only history. While it is queued or capturing, server-side storage locks reject artifact changes, review decisions and patch export for that run with `source_refresh_in_progress`. Terminal immutable provenance is retained even if workflow materialization cannot complete; restart reconciliation never refetches it. A no-story refresh still advances the source head, but retains the prior extracted artifact dependency; this visible mismatch blocks review and patch export. Held and failed refreshes create no source head and do not stale the prior review.

Freshness means only `current` or `superseded` relative to the logical source head plus the immutable capture time. No unsupported time-to-live or independent-verification claim is inferred.

## Human authority and retained gates

A real-source draft starts with source kind `unclassified-web`. Before review, a human must classify it, select immutable evidence-backed claims and explicitly confirm the source-led angle. `web` is the truthful generic classification when a more specific source kind does not apply. Every factual or fact-implying Quick Note field is a read-only, deterministic server reproduction of the selected immutable claims. Per-field content hashes, per-segment claim lineage and a full-export binding cover the complete payload, source classification and target path. They are recomputed at read, edit, review and export after resolving the immutable capture; arbitrary copy or metadata under old claim IDs fails closed.

Each accepted or rejected decision also writes a content-addressed immutable review receipt outside the mutable run store using exclusive create, file sync and directory sync. The receipt binds the exact run and artifact versions, immutable dependencies, selected claim IDs, source classification and confirmation, angle, full payload, lineage, target, gates and blockers. Current reads and export require that sealed snapshot to match; source-kind, claim or status substitution cannot self-certify by recomputing mutable hashes. Editing or refreshing stales the receipt reference without deleting its history. Legacy unsealed approvals migrate to explicit `legacy_unsealed` stale history and `needs_revision` rather than retaining export authority or bricking startup. Patch export independently rechecks current source dependency, classification, claim gates, accepted review, the shared no-price law (including cost, charge, fee, currency and free wording) and the no-em-dash law.

This decision grants no provider/model call, credentials, team-network access, production deployment, CMS/Git mutation, publication, distribution, spend or retention authority. The fixture workflow remains available unchanged.
