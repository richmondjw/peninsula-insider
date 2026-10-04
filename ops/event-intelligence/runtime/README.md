# Event operations runtime

This additive Docker service collects admitted sources, maintains a private review packet and delivers actionable changes to a durable local dashboard. It cannot approve or publish a listing. James approval of the current revision remains required. Regional source completeness is a separate data-stage gate.

## Install

From the isolated PI checkout, run `ops/event-intelligence/runtime/install.ps1 -Start -StateDirectory C:\Users\James\.openclaw\workspace\peninsula-insider\ops\reports\events\intelligence\live-runtime`. Use an explicitly durable state path outside disposable worktrees; the default path belongs to the checkout running the installer. The installer builds a minimal local image from the reviewed modules and locked local parse5/entities dependencies, records every packaged file hash, copies initial evidence only when absent and starts `pi-event-intelligence`. It refuses to replace an existing service. Production state stays under the canonical checkout's ignored `ops/reports/events/intelligence/live-runtime`; no port or public review route is exposed. The source catalogue is read-only.

The daemon runs bounded cycles every 15 minutes. Individual source cadences and failure backoff still apply. It preserves prior review bytes and staged captures, refuses simultaneous cycles, and holds concurrent human changes for comparison. Durable receipts distinguish fetched, cached, failed and pending retrieval. Collection does not extend factual verification or James approval.

## Alerts and recovery

The private operations dashboard and alert outbox are the durable destination. Destination receipt is distinct from human acknowledgement. A Codex heartbeat named PI event operations alerts monitors the service every 15 minutes and notifies James only for new actionable failures, urgent changes or meaningful recovery. It preserves deduplication state and may perform one controlled restart of this labelled service in a 60-minute window when its daemon is genuinely stopped or overdue. It does not restart healthy collection or alter other containers.

The daemon supervises collection with a hard deadline; failed staging remains recoverable. Docker restart-unless-stopped restores the service after engine restart. A Docker healthcheck flags overdue or failed heartbeats; health status alone is not proof of source retrieval. Recovery acceptance requires an actual interruption/restart drill and new completed receipts.

## Controlled update and rollback

Inspect the exact managed label, data mount, current image and last-cycle receipt first. Build the new image without `-Start`. Stop only pi-event-intelligence and preserve the old container under a versioned name; start the new image with the same private data mount and security limits. Do not delete evidence or rewrite the review packet. For rollback, stop the replacement and restore the preserved image/container with the same state. Review packet rollback requires exact byte receipts and comparison with any subsequent human edits, not blind copyback.

Before accepting operations, run the independent rubric against two observed cycles, catalogue source rechecks, durable alert delivery/retry/acknowledgement, human work preservation, cancellation/expiry drills, watchdog/restart recovery and private browser checks. Tests and configured schedules alone do not satisfy the stage.

## Optional reviewed redirects

Redirect support is disabled by default. It does not follow generic redirects or approve listings. After a source-specific chain has been reviewed, an operator may point PI_EVENT_REDIRECT_CONFIG to a durable private JSON file under PI_EVENT_RUNTIME_ROOT. The daemon child inherits this environment variable and revalidates the file on every cycle. No retained captures belong in Git, site assets or the container image.

The config requires schemaVersion1, enabledtrue, maxAgeHours168 and exactly four unique reviewed receipt objects for the existing Library Storytimes and three Hot Springs legacy URLs. Each receipt binds sourceId, originalUrl and a bounded capture chain. Every capture includes URL, HTTP status, redirect location when applicable, HTML content type, checkedAt, retainedBody filename and bodySha256. Body filenames use redirect-review-SHA256.html and reside beside the config. Real paths must stay inside the private runtime boundary; retained bytes and capture freshness are checked before mapping. The current canonical destination is fetched through the existing public-DNS, manual-redirect, timeout and byte-cap guards. Original leads remain retained.

Missing, expired or tampered optional config disables mappings for that cycle. Healthy roots and details continue with the existing transport. The cycle receipt records failed-manual-fallback and an adapter-config-failed alert asks for refreshed reviewed evidence. Valid config recovery resolves the same alert episode. No stale mapping, private evidence or failed retrieval can grant approval.

Rollback: unset PI_EVENT_REDIRECT_CONFIG or restore the prior image. Preserve private capture files, alerts, review packets and human edits. Root redirects then retain the original manual fail-closed behavior. No publication rollback is implied.

Portable validation: node --test ops/event-intelligence/redirect.test.mjs ops/event-intelligence/collect.test.mjs ops/event-intelligence/details.test.mjs ops/event-intelligence/runner.test.mjs ops/event-intelligence/outbox.test.mjs. CI receipts are clearly synthetic fixtures; retained real-capture acceptance evidence stays private. Passing component tests does not establish scheduled live collection success or full source coverage.
