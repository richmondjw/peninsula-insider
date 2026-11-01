# Routine event publication

James authorised routine PI website publication without per-event approval on
1 November 2026 at 10:13:33 UTC (message
`Sentinel_d25f9be50a808191af4932dd34f3ee8f`). This authority does not approve the
unverified backlog, social posts, sponsored/features, credentials or access changes.

## Evidence and publication gates

`routine-publisher.mjs` retains the existing factual/Shire verifier and attribution.
It never marks facts as verified. Routine authority replaces only separate publication
approval. Explicit holds/rejections, changed-source holds, cancellations, expiry,
conflicts and unresolved duplicates remain blocked. Volatile proof dependencies,
including booking/price/moved venues, must be current within 24 hours. Government
boundary snapshots retain their existing 30-day policy. The receipt expires at the
oldest applicable deadline, using the stricter limit when evidence is shared.

Only standard listings with original summary/category qualify. Publication is text-only;
no source photograph or logo is copied. Existing manually published, held, edited or
image-bearing records cannot be overwritten. Automatic updates require the exact
previous bytes and intact approved-content binding. Private rollback receipts remain.

## Scheduled writer and release integration

`routine-release.mjs <config.json>` is the scheduled entry point, separate from the
read-only collector. Its config requires `sourceCheckout`, `runtimeDirectory`,
`releaseRoot`, `historyDirectory` and explicit `apply: true` for writes. History and
scratch must be separate from source/collector and each other. It uses only existing
Git/GitHub authentication; it does not install credentials or change repository rules.

The existing `pi-event-operations-alerts` heartbeat already runs every 15 minutes.
Its update prompt and concrete local config are prepared in the originating task.
Use the app's automation update facility to update that existing heartbeat, preserving
its schedule, target thread and alert/restart boundaries. Do not edit raw automation
TOML or install a duplicate scheduler. This delegated thread's automation API returned
"Automations are only supported for local threads", so that update must be made from
an originating local thread. The prompt is conditional on the implementation being
merged and independently accepted; it must never use an unmerged replacement.

On each writer run:

1. Check clean tracked installed code, including all executing modules. Require its
   implementation commit to be an ancestor of latest main. This prevents activation
   before the implementation PR is merged.
2. Bind an immutable packet snapshot to a completed collector-cycle ID and packet
   hash. Never write collector state, change mounts or trigger collection.
3. Create a fresh latest-main checkout. Re-evaluate the entire packet and catalogue,
   then promote only qualifying records. No qualifying output is a normal quiet run.
4. Run locked dependency installation, content validation, full build/search,
   discovery/planning journeys and release-contract checks. Compare exact event bytes
   before/after gates, stage only the manifest's event JSON paths, and hold if main
   advanced. Submit with a non-force main push; never approve a PR or change protection.
   Read-only inspection on 1 November found main unprotected and no branch rules.
   Existing content jobs already use direct main pushes. A later protection change
   must be respected by the server, never worked around.
5. The existing main build-and-deploy workflow runs its complete deployment gates.
   Record a push only as submitted. Require successful workflow completion, exact
   public deployment SHA, normal public-page checks, matching detail receipt/source
   and a valid current feed/next active occurrence before recording published.

Private history stores the snapshot for actual publication attempts and distinguishes
held, submitted, submission-uncertain, submitted-unverified and published. Uncertain or
unverified submissions block another writer run pending reconciliation of that exact
remote SHA/run/public result. Never blindly retry an uncertain push. Storage limits
hold instead of deleting evidence. Only the newly created UUID scratch checkout is
removed; user checkouts and history are preserved.

## Activation and remaining confirmation

The implementation PR must be reviewed/merged through the normal code-release process;
this event authority does not approve implementation PRs. No PR approval is performed
by the writer. Once merged, install the accepted clean checkout and update the existing
heartbeat from a local thread with the prepared config. A dry-run can use `apply: false`.
Only verified actual release receipts/public outcomes establish activation or success.

Do not bulk approve candidates to obtain a successful example. Current empty weekends
show an honest absence of verified listings and routes to other dates/places. Positive
source-link/date tests remain, alongside explicit empty-state and synthetic writer tests.

Receipt expiry is checked at build time and in browser promotions/detail content.
JavaScript-enabled routine details hide expired information on the next one-minute
refresh, removing Event schema and requesting noindex. No-JavaScript static details
and feeds remain dependent on the next successful existing scheduled rebuild; this
is not exact-time server-side revocation. No-output writer runs do not manufacture
content commits or claim to rebuild the site.
