# Ask PI quality: offline milestone A, v1

Implements the bounded offline milestone in [the operating contract](https://app.asana.com/1/233540066981051/project/1219341217074661/task/1220589333197842), read 16 November 2026. The quality oracle remains offline. The production writer now imports ops/scripts/concierge-events.mjs, which reuses the website publication and occurrence helpers. No new scheduler, paid request, production write, query capture, profile, security configuration or private knowledge source is introduced.

## Run

From the website repository root, with Node 22.18+ or Node 24 (native TypeScript stripping is needed by the existing helpers):

```sh
node --test ops/ask-pi-quality/quality.test.mjs ops/ask-pi-quality/current-corpus.test.mjs
node ops/ask-pi-quality/run.mjs --out /path/outside/repository/report.json
node ops/ask-pi-quality/validate-manifest.mjs /path/to/manifest.json
```

No install or network call is needed. The report records exact Git HEAD, dirty state, fixture/evaluator versions, input hashes, frozen clocks, category denominators, one trial, separate answerable and abstention results, code-test output and untested surfaces. Code-test durations are observational and vary; expectations, fixture observations and hashes are reproducible. Do not count overlapping category totals as independent samples. The report exits nonzero on a fixture failure. It deliberately always declares releaseEligible=false: this offline package cannot certify the other gates.

The original development baseline at c7fe845f154 was 23/24: overnight-still-running expected a still-running event after local midnight, but the promotion helper skipped its previous start day. The candidate now fixes that shared helper while preserving the original fixture expectation; rerun the report to verify the exact candidate. The production projection now has regression assertions for the three former writer defects: recurrence dropped, suburb lost and cancellation admitted. This is code-level evidence, not a live index refresh or answer-quality result.

## Fixture schema and evaluator limits

`fixtures.v1.json` is a versioned synthetic development set, not a protected holdout and not the proposed 200-case evaluation. Each case has schemaVersion=1, stable id, tags, literal query, frozen UTC now, pre-resolved Melbourne context, a synthetic source snapshot, and literal expected disposition/IDs/season. Revision IDs and verifiedAt/validUntil belong to the synthetic source record; source verification is not inferred from a fresh index timestamp. Context carries explicit yearBasis; unresolved years must clarify. Conversation histories are synthetic and not persisted beyond these committed test cases.

The adapter reuses selectEventPromotions, publication, occurrence, recurrence and Australian season helpers. Its task is to expose disagreements with a specified oracle. It does not parse natural language or evaluate the actual API's generation. A matched occurrence is not proof of live booking availability. Unknown clocks remain null. Locality is exact; Red Hill South and Main Ridge do not become Red Hill. No truffle keyword is prohibited: the wrong-region offering fails geography and the synthetic verified Red Hill December occurrence succeeds.

`evaluateClaims` checks structured claim bindings (entity, occurrence, content revision, URL, locality, time, live availability) and rejects unknown claim types. It also checks answerable task success rather than rewarding blanket abstention. It cannot determine whether arbitrary prose contains unsupported facts. The malicious-text case demonstrates that data is not executed by this adapter and that a structured side-effect claim is rejected; it is not evidence of model prompt-injection resistance or actual action enforcement.

## Inventory/manifest v1

The manifest is caller-supplied evidence, not a trusted source fetched by this package. Its top-level fields are:

- schemaVersion=1, id, sourceRevision, sourceDigest (the exported hash(sourceRecords)).
- sourceVerifiedAt, contentPublishedAt, ingestedAt, retrievedAt: four separate timestamps. No proposed freshness SLO is claimed as measured.
- bundle: indexSchema, embeddingModel, promptRevision, appRevision. Exact whole-bundle identity is required for simulated rollback.
- state=complete, failures=[], lockHeld=true. These are test assertions, not proof of a real process lock or transaction.
- sourceRecords: every source id, revision, effectiveRevision (including the CMS override), admission=index|exclude; excluded sources require exclusionReason.
- outcomes: exactly one per source id, status=indexed|excluded|failed. Indexed outcomes carry effective revision; exclusions match the canonical reason. Failed records block promotion.
- indexRows: exact admitted id/revision parity, no duplicates or deleted/unexpected IDs.
- pages: cursor, nextCursor, snapshot, ids. Initial cursor and terminal nextCursor are null; pages chain without repeats, share sourceRevision, and exhaust the ordered source inventory. This detects truncated/capped snapshots, including the 1,007-record test.
- previousIndexedIds and removedIds: exact removal accounting, including deletion and cancellation overrides. A failed source snapshot never justifies destructive pruning.

`promote` and `rollback` are pure state-transition simulations. They never operate a database or cache. Promotion binds previousManifestDigest and previousIndexedIds to the actual supplied active snapshot; bootstrap requires null digest and an empty predecessor inventory. Rejection retains the same last-known-good object; success returns a detached snapshot; an identical active snapshot is an idempotent retry and changed bytes cannot reuse its ID. Rollback requires a matching previous manifest digest and bundle identity plus invalidation of the current cache key. This models a compatibility requirement; it does not prove production atomicity, durable crash recovery, a real cache purge, or semantically compatible provider embeddings.

## Four independent release gates

1. Code/fixture tests: retain failures and exact artifact versions.
2. Staging inventory and end-to-end integration: canonical source enumeration and revisions, actual storage, publication parity, real crash/retry/lock/cache behavior. Not run by this package.
3. Independent exact-head review: reviewer inspects the diff and reproduces tests, records candidate SHA, fixture version, findings and decision. Specification approval is not implementation approval.
4. Live behavior and subsequent actual scheduled execution: verify deployed app/prompt/index bundle and public answer behavior, then the actual scheduled job. Manual invocation, merge or green build is insufficient.

Protected holdout must be authored and retained by the independent reviewer outside this development set, with custody and hashes. The author receives aggregate findings, not examples to tune against. No holdout was accessed or assessed here. No tuning or paraphrase-copying from it is allowed. Semantic/human evaluation remains pending and paid models are outside this milestone.

September trip/map and intent-analytics work stays held. This candidate neither repairs production indexing nor activates autonomous governance. The original daily Ask PI workflow remains unchanged.

## Production event projection candidate

`ops/scripts/concierge-events.mjs` reads all JSON event sources recursively, preserves source bytes, hashes each effective repository record and emits one projected or excluded outcome per source. Malformed/unreadable input or duplicate source identities blocks the writer before network calls. Canonical publication, geography, status and occurrence helpers govern admission; the legacy omitted-status default matches the Astro collection. Explicit CMS lifecycle decisions win. No source content is rewritten.

The projection deliberately represents only the next verified occurrence within 366 days. It does not certify every occurrence or live ticket availability. Exact locality is retained, and the occurrence date is included in the existing event_date fingerprint. The existing writer continues to use its current schema and embedding model. Pagination now orders by chunk_id; this is not a database snapshot transaction.

Run `node --test ops/scripts/concierge-events.integration.test.mjs` for the actual CLI with all network calls intercepted, including 2001 existing rows and a failed write that suppresses pruning. Run `node ops/scripts/audit-concierge-events.mjs --now ISO_INSTANT --out OUTSIDE_REPO.json` to account for current local source records without credentials, database access or model calls. A projected outcome is NOT an indexed receipt.

The writer remains sequential and is not an atomic last-known-good system. Suppressing prune after an error does not roll back earlier writes or a crash. This candidate is held from release until staged inventory/retrieval evidence, exact-head independent review and CI pass. Live calls that incur embedding/model cost are not authorised by this package. No post-publish trigger or duplicate job is added, and no live freshness or answer-grounding improvement is claimed.

## Failure-safe staging prototype

[STAGING.md](./STAGING.md) describes the isolated SQLite crash/retry integration, snapshot-bound synthetic retrieval and supported staging options. This prototype does not replace the non-atomic production writer or connect to a service. Run it with `node --test ops/ask-pi-quality/staged-index.test.mjs`; Python 3 with sqlite3 is required. The report runner now includes this test suite.
