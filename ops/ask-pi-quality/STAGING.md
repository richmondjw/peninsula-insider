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
