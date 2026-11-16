# Isolated snapshot integration, staging protocol v1

This package is not imported by the production writer or API. It neither creates infrastructure nor connects to a service. All embeddings and records in its tests are synthetic. Run from the repository root:

```sh
node --test ops/ask-pi-quality/staged-index.test.mjs
```

Requires Node 22.18+ and Python 3 with its standard-library sqlite3. The test creates caller-owned temporary SQLite databases. It does not use Docker, WSL, credentials, model APIs or production data. Python 3.14 / SQLite 3.50.4 was exercised on the Windows executor. A successful test is local transaction evidence, not PostgreSQL or Supabase acceptance.

## Prepare, commit, read

1. Bind every source payload to its effective revision and digest; validate the existing complete-inventory manifest and canonical event input contract. Distinguish intentional exclusions from failed inputs. Synthetic transport null clocks are validated as omitted unknown clocks without changing stored payloads.
2. Prepare every required embedding before promotion. Only reuse embeddings with matching text digest, model and dimensions. A first or later embedding failure returns no prepared snapshot. No active storage changes during preparation.
3. The prepared snapshot contains the whole manifest, records, embeddings and predecessor token. Its immutable token hashes the exact payload bytes. The application adapter validates the transition against the actual current manifest before calling storage. The storage adapter atomically compares the predecessor token, verifies active/retained bytes, inserts the immutable candidate, and changes the active pointer in one transaction. Rebinding an external token cannot turn a stale manifest into a valid transition. Rollback is explicit and requires an intact retained target, not an arbitrary new payload.
4. Read active pointer and snapshot together. Every retrieval request binds to that one generation. Exact record revisions, date window, year context, locality, cancellation and source evidence validity are checked again at the request clock. Sparse or empty results never broaden to unrelated places or dates. Booking availability needs separate current evidence. Ingestion time is not source verification time.
5. An uncertain commit acknowledgement triggers a read. The identical active token and validated payload prove that attempt committed; otherwise the original failure remains. Idempotent retry verifies stored bytes before acknowledging success and does not create a second generation. Rollback requires the target app/prompt/model/schema bundle, preserves the old snapshot and changes cache identity. No external deployment or real cache invalidation is implemented here.

`sqlite-stage.py` is a local storage test adapter, not a trusted public endpoint. It provides native SQLite transactions and process-crash injection; semantic payload validation belongs to `commitPrepared` in `staged-index.mjs`. Do not expose the Python harness or its crash/failure controls to a service. Readers get one complete snapshot, not a mixture of old and new records. Tests exercise concurrent processes, failures after insertion and pointer change, an exit after commit, readback/retry, deletion/cancellation, rollback and incompatible bundles.

`retrieveGrounded` consumes pre-resolved synthetic context and emits evidence-bound structured claims. Synthetic vectors test preparation and alignment only; ANN, lexical ranking and reranking quality are not measured. It is not natural-language intent parsing or model evaluation, and does not prove an LLM resists injection. The existing 24 development cases are reused unchanged, including the exact Red Hill December query; no protected holdout was accessed. The immutable staging snapshot retains full approved source occurrence data so the date filter need not infer all future dates from a single next-occurrence column. The production projection still only stores its next occurrence.

## Supported isolation and decisions

| Option | Observed status | What it can prove |
| --- | --- | --- |
| Native temporary SQLite | Exercised here, no service or spend | Local all-or-nothing transaction, crash/retry and snapshot-bound synthetic retrieval |
| Existing authorised isolated PostgreSQL/Supabase environment | Not identified; PI Concierge branch list was empty and no candidate deployment was attached | Required before claiming production backend/integration correctness |
| New Supabase preview/persistent branch | Supported product capability; not created | Separate environment for PostgreSQL/API integration, subject to explicit budget and environment approval |

Supabase documents [separate branch environments](https://supabase.com/docs/guides/deployment/branching) and [billable branch usage](https://supabase.com/docs/guides/platform/manage-your-usage/branching). A new branch is not a no-cost assumption. No branch, credentials, access policy, schema or deployment was created. The existing branch-list lookup was read-only. Native psql was not found in PATH; Windows service enumeration was blocked by Service Control Manager permissions and was not retried. No inference is made that an unlisted service cannot exist.

The necessary environment decision is to identify an already authorised isolated PostgreSQL target, or separately approve a managed staging environment and its bounded cost. The no-spend/access-change constraint remains in force; local work does not authorise either action.

## Production blockers

The current sequential REST writer has not been replaced and remains non-atomic. A production adapter must implement the transaction above in PostgreSQL, validate complete source/CMS revision and pagination evidence, preserve compatible schema/model constraints, and prove failed preparation/commit leaves the active generation untouched. Merely wrapping sequential HTTP upserts in this interface is invalid. There is no atomic backend operation established in the current deployment.

The production retrieval routes also need one generation bound across vector, lexical, reranking and response-cache paths, with deterministic temporal/locality eligibility before generation. The current API does not use this staging adapter. A PostgreSQL migration/transaction implementation and compatible API/prompt rollout require their own exact-head review and real isolated staging checks, without changing access as a shortcut. Future published CMS overlays must be reconciled; observing none today is not permanent coverage.

Release additionally needs complete exact-head CI, live behaviour and a subsequent actual scheduled run. Manual refresh does not prove daily execution. Paid live embedding/model calls, production index operations, access changes and the denied legacy WSL/Docker runtime remain outside this work. No live reliability or autonomous-governance claim follows from this harness.

## Isolated PostgreSQL CI (synthetic only)

The existing Content Gate workflow now defines an ordinary Linux service-container job, not a schedule. Node and PostgreSQL 17/pgvector 0.8.0 images are pinned by digest; checkout is pinned by commit and checks out the exact candidate. The locked `pg` driver installs with lifecycle scripts disabled. There are no production secrets, DSN inputs, host port mappings, caches or uploaded artifacts in this job. GitHub tears down the service with the job. This uses the public repository's standard runner and creates no managed infrastructure.

`postgres/adapter.mjs` rejects non-Linux/non-GitHub execution before loading a database driver. Its sole endpoint is the job-private `postgres` alias, database `ask_pi_synthetic`, with disposable synthetic credentials. Do not run it against a local Windows service, Docker/WSL, or any managed database. Environment markers are accidental-use guards, not a security boundary.

The eight PostgreSQL tests reuse all 24 development contexts, use 1024-dimensional deterministic vectors, and exercise concurrent bootstrap/replacement, rollback after partial writes and process exits, lost acknowledgement, retained rollback, immutable snapshot readers, corruption/dimension rejection and 1001-row completeness. Both vector and lexical SQL constrain snapshot and eligible IDs before ranking. These tests demonstrate backend transaction and filter mechanics, not natural-language parsing, ranking relevance, real embeddings, PostgREST pagination, CMS integration or production query compatibility. The lexical check currently establishes exclusion safety rather than lexical recall.

The CI job asserts PostgreSQL major 17 and pgvector 0.8.0. It does not assert the exact Supabase-patched build. Results must be read from the exact-head CI log; local SQLite results do not count as PostgreSQL acceptance. Managed Supabase integration, application wiring, real source inventory, independent review, live answers and actual daily scheduled execution remain separate gates. This harness does not replace the production writer.

## Production-facing integration candidate (not activated)

Preparation, manifest validation and commit coordination now live in ops/lib/concierge-snapshot.mjs and concierge-manifest.mjs. Offline entry points re-export the same functions; the PostgreSQL test adapter therefore tests the writer's actual coordinator rather than a copied algorithm. concierge-snapshot-transport.mjs negotiates a versioned atomic RPC capability, validates retained/read payloads and acknowledgements, prepares all embeddings before commit and resolves lost acknowledgement by validated read. It never falls back to REST mutations. No endpoint or credentials are embedded, and no existing scheduled job imports this transport yet.

The additional PostgreSQL test bridges the production RPC contract to the real synthetic transactional adapter. This proves coordinator/transport/transaction interaction, not deployed PostgREST or managed-role permissions. The actual RPC functions have not been installed or authorized. A complete effective-source/CMS manifest exporter is still required before the legacy writer can switch safely; a caller asserting completeness is not evidence that CMS pagination/deletes/overrides were captured.

The canonical event runtime is bundled reproducibly by ops/scripts/build-concierge-event-runtime.mjs for the separate private API repository. Its --check mode verifies output and LF-normalized source hashes without writing files. The dormant API candidate uses these exact helpers for deterministic event answers, plus generation-pinned strict hybrid retrieval. Its private CI cost and automatic preview deployment are not established, so only local API tests/type checks have run. No API push, new private-runner CI or deployment is included.

Smallest managed gate: an already authorized isolated Supabase target, containing the reviewed atomic read/commit and generation-scoped retrieval interfaces, with synthetic records and the intended existing role. Exercise capability negotiation, CAS, malformed source rejection, partial failure, lost acknowledgement, retained rollback, both route modes, scope enforcement and permissions without new grants. The available evidence identifies neither such a target nor authority to install its schema/RPCs. Necessary decision: identify that target and confirm schema/RPC deployment authority; if no target exists, a separately bounded environment/cost decision is needed. No production tables may be used for synthetic tests.
