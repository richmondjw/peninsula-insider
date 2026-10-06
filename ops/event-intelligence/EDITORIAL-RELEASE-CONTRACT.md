# Recurring editorial release contract (implementation gate)

Status: design gate, not installed. The accepted private Rosebud artifact is a factual and byte-level proof at its retained admission time. It is not a production deployment authority.

## Current build topology

`.github/workflows/build-and-deploy.yml` builds `main` on pushes and six configured schedules, then deploys all of `next/dist` to `gh-pages`. `next/package.json` invokes `generate-event-editorial-manifest.mjs` through `prebuild`. Without private build configuration the generator writes a disabled manifest. Therefore merging an automated event source file or deploying a one-off private artifact would allow the next ordinary build to remove that listing. A healthy scheduled build is not proof that private editorial evidence was refreshed.

## Required continuous handoff

1. A trusted recurring producer freezes the current review packet and current canonical target, evaluates all proposed changes against the versioned policy, and retains source bytes and human holds privately. A missing, changed, stale, or ambiguous fact yields hold or withdrawal, never a public approval flag edit.
2. A trusted builder constructs an isolated one-parent, event-only Git candidate. Before each publication transition it replays the factual transaction against current source receipts, candidate revision, full catalogue, human holds, deduplication and expiry. It records an exact candidate commit/tree, private proof hashes, build clock, environment flags, public manifest, and every artifact file hash.
3. The authenticated release actor admits the exact current remote parent and independently accepted artifact. It must prove that the builder and release actor are the expected principals, and that no other writer changed the remote ref. A local JSON receipt or self-declared actor is insufficient. Commit and artifact handoff must be indivisible to readers: a deployment cannot consume a different source tree or an artifact whose bytes changed after admission.
4. **Every** production build entrypoint, including ordinary main pushes, daily and weekend schedules, dispatches, and rollback, must use the same admitted public editorial state at its build clock. If the private proof cannot be refreshed, the deployment fails closed before publishing; it cannot silently regenerate a disabled manifest over a previously published automated event. Dynamic reader expiry still hides expired evidence between builds and does not replace a timely withdrawal release.
5. The standard content, browser, SEO, privacy, search and release-manifest gates run on the exact artifact to be deployed. The release actor records the source tree, artifact inventory hash, Pages commit/run, and an immutable receipt. The public detail page, feed, search result and mobile/desktop experience must then be observed against those exact bindings. At least two real recurring refresh cycles and expiry/hold withdrawal are required before replacing the legacy James-only gate.

## Safe rollback

Keep the prior Pages artifact/commit and private source history. Roll back by a new admitted release, never by rewriting a human decision or deleting evidence. A rollback must re-evaluate current cancellation, explicit human holds and expiry; an older page whose evidence has expired cannot be republished. Preserve later canonical edits and refuse a stale expected-parent transition. If the publisher cannot obtain a fresh safe state, retain the last public build only while dynamic expiry and cancellation guards remain effective, and raise a deduplicated actionable alert.

## Release rubric

Score out of 10, minimum 9 and every critical check. Critical: trusted builder/release identity and exact Git/artifact binding (2); fresh source, current human holds, full catalogue/revision CAS and expiry (2); all build entrypoints preserve or safely withdraw admitted editorial state (2); standard build/privacy/search gates on exact bytes (1); actual Pages commit plus public detail/feed/search verification (1); two real refresh/withdrawal cycles, deduplicated failure and rollback (2). Grade component source separately from installed workflow and live outcome. The existing private artifact grade does not fill these release checks.

## Next implementation boundary

The production builder identity and handoff channel must be chosen and tested with the actual GitHub repository and Pages workflow. No private captures, review packets, rights receipts, or credentials may be committed to the public repository or Pages artifact. Do not deploy the current private candidate until the continuous handoff and all critical checks are independently accepted.
