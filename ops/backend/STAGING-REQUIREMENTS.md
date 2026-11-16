# Snapshot backend: isolated integration candidate

Neither SQL file is installed. No schedule, production schema, permissions or
deployment has changed. They are intentionally outside the migration runner.

## Exact interfaces and trust boundaries

`concierge-snapshot.sql` defines immutable snapshot storage, a single active
pointer, and the capability/read/commit RPCs consumed by the shared writer. Each
commit validates inventory, revision, payload, embedding and deletion bindings,
locks the active row, checks the actual predecessor, inserts the candidate and
changes the pointer in one transaction. Exceptions leave the previous generation
intact. Retries validate retained bytes. Rollback requires a retained snapshot
and its compatible bundle. General vector/BM25 RPCs are not implemented or
advertised; this milestone serves event records through the canonical API path.

The SQL functions use SECURITY INVOKER and a fixed search path. New tables have
RLS enabled with no public policies, and PUBLIC execution is revoked. There are
no grants. The existing intended writer role must already have the necessary
permissions, or a separate explicit access decision is required. The service
role is a trusted publisher, not an untrusted public caller. Canonical event
publication/admission and complete semantic source validation remain mandatory
in the shared JavaScript producer and reader. SQL independently protects the
transaction and manifest bindings; it does not reimplement the editorial engine.

`concierge-event-cms-export.sql` is a separate read-only CMS-side interface. It
selects only published event text rows from `pi.cms_text_fields`, with an explicit
public field allowlist and no author IDs. One statement returns one aggregate
envelope with a row count, byte digest and observation time. This avoids REST
pagination caps and binds every row to one MVCC view. CMS images are not needed
for the current text-only answer path and are never overwritten.

`refreshPublishedEvents` reads JSON blobs from a full immutable Git commit,
captures the CMS envelope, applies supported title/summary text slots, reruns
canonical admission, accounts for every source and CMS row, prepares embeddings,
then checks CMS revision again before commit. Unsupported/ambiguous published
overrides, malformed files, missing inventories and CMS drift abort before any
write. Deleted-source CMS rows and empty display overrides have explicit reasons.
Title/summary overrides are also rejected if they change the full canonical
source-derived recurrence rule: legacy cadence inference can read those texts.
CMS changes after the final check remain a cross-project race; the next existing
refresh must reconcile them. No distributed transaction is claimed.

Unknown source-verification/publication times remain explicit null, separate
from inventory observation and ingestion. Per-record verification is never
inferred from scraping, CMS edit time or ingestion. Date-only verification keeps
its original field/value in `data`, a bound `sourceVerificationDate`, and a null
`verifiedAt`. The reader compares that documented day with the Melbourne calendar
day without manufacturing an instant. Invalid/future days and genuinely unknown
evidence fail closed. The top-level null-clock
contract must ship with the paired reader bundle; old readers must not be used
with a newly configured incompatible bundle.

## Smallest managed test, after code/CI review

1. Identify an already authorized isolated PostgreSQL/Supabase target. Confirm
   its identity and that no live caller uses its test tables. No target has been
   established and no paid branch is authorized.
2. Review the exact SQL files and substitute a concrete schema. Use a whole-file
   transaction. Do not expose a new schema, add grants, change RLS policies or
   deploy production functions under this task's current authority. If existing
   roles/exposed schemas cannot support the test, stop for an explicit decision.
3. Provide synthetic `pi.cms_text_fields` rows and the reviewed snapshot schema
   on the isolated target(s). A single isolated project can host both synthetic
   contracts, but this does not prove cross-project production configuration.
4. Exercise the actual PostgREST endpoints with the intended existing CMS reader
   and index writer/API roles. Compare the CMS reader's published inventory with
   the fixture owner inventory to detect RLS omissions. Verify draft/other-entity
   rows are absent, all 1,007 published rows survive, and unauthorized roles cannot
   read/write the snapshot tables or commit RPC. CI's SQL bridge is not REST or
   managed-role evidence.
5. Test concurrent bootstrap/replacement, failed pointer writes, session loss,
   lost acknowledgement, replay, incompatible rollback, malformed manifests,
   CMS edits/deletes/cancellation, missing capabilities and stale bundles. Drive
   both real API handlers using stub model/vector dependencies only.
6. Record exact paired revisions, source commit, source/CMS digests, roles,
   runtime versions, test results and cleanup ownership. Cleanup may remove only
   synthetic resources created by this test after their identities are checked.

Only after those gates can the existing daily/post-publish workflow be connected
to `refreshPublishedEvents`, using a source commit proven to match the published
site. The legacy writer remains unchanged today. Live answer acceptance and an
actual subsequent scheduled run remain separate release gates. No private API
CI, deployment, paid embedding calls or infrastructure creation is authorized.

## Offline workflow preparation and CMS race release decision

`planEventRefresh` is a pure, inactive plan builder for the existing daily run
and a future successful post-publish event. Both require an immutable commit
matching a successful production publication receipt and share the existing
`concierge-corpus` concurrency group. The receipt is caller-provided evidence:
this helper does not authenticate GitHub deployments, prove which deployment is
latest, dispatch jobs or activate the writer. No workflow YAML has changed.
A future adapter must obtain the latest successful production receipt from the
actual publisher and verify its provenance and checkout before calling the writer.

The synthetic orchestration regression changes CMS at two precise boundaries.
During embeddings, the final revision check rejects publication without a commit.
After that check, a CMS change during index commit produces a valid atomic index
snapshot with an older CMS revision. The next refresh reconciles it. This test
intentionally proves the limitation; it does not certify cross-project freshness.

Release requires an explicit consistency policy. A second check after commit can
report drift but cannot eliminate it; blind rollback can overwrite a concurrent
valid refresh. Strict current-CMS answers require request-time revision checking
with fail-closed behaviour, or a coordinated publication mechanism covering both
stores. Neither is installed or accepted here. Until a policy is implemented,
reviewed and exercised through managed PostgREST, this remains a release blocker.
Managed roles, exhaustive role-visible CMS export, actual scheduler provenance,
paired rollback and live answers remain separate gates. A manual run is never
proof of daily execution.
