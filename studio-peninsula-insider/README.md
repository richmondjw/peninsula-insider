# Peninsula Insider Workbench

Private, local Content Foundry Workbench for DELI-693.

## Current vertical slice

`frozen fixture or one human-submitted HTTPS page -> evidence ledger -> quick-note draft -> human review -> downloadable patch`

The shell performs no model calls, Git writes, CMS writes, publication or external distribution. Its atomic file-backed store is a single-process development/test adapter behind the durable run contract; startup fails closed in production. PostgreSQL, authentication and private storage remain explicit later gates.

Real URL capture remains disabled by default and Compose pins `FOUNDRY_REAL_URLS_ENABLED=0`. When explicitly enabled in the native development runtime, it accepts one human-submitted HTTPS page at a time through the sealed capture kernel. It does not crawl, retry, execute source HTML, fetch subresources or call a model. The API and page reject non-loopback Host headers; every flag-on API mutation also requires the same-origin boundary and `X-Foundry-CSRF: 1`.

Capture attempts are visible while queued or capturing and finish as extracted, held, no-story or failed with safe operator codes. Source bytes, extraction revisions and attempt manifests remain immutable. Refresh creates a new attempt; a changed source head makes every dependent review stale, while an active refresh blocks edits, review and patch export. A real-source draft cannot reach review until a human classifies the source, selects source-supported claims and confirms the angle. Its public fields are read-only, server-generated reproductions of those selected immutable assertions; every read, edit, review and export resolves source summaries, evidence and copy back to the sealed capture manifest. Per-field, per-segment and full-export hashes bind all public metadata and the target path. Accepted and rejected snapshots are sealed in content-addressed review receipts outside the mutable run store; legacy unsealed approvals become stale and require re-review. Price language, including ordinary cost/charge/fee/currency wording, and em dashes remain prohibited. Workbench approval is still not independent verification and not publication.

## Run locally

```powershell
npm install
npm run dev
```

- UI: `http://127.0.0.1:4311`
- API: `http://127.0.0.1:4310/api/health`

To expose the bounded real URL workflow for a local development session only:

```powershell
$env:FOUNDRY_REAL_URLS_ENABLED = '1'
$env:FOUNDRY_HOST = '127.0.0.1'
npm run dev
```

The browser UI remains on port 4311 and proxies same-origin API requests to the exact loopback API host. Never enable this mode on a team interface or in production; the current file-store runtime has no authentication or retention policy.

## Run the team-ready local container

```powershell
docker compose up --build --wait
```

Open `http://127.0.0.1:4310`. The container publishes only to host loopback, drops Linux capabilities, runs as a non-root user, keeps its filesystem read-only and persists fixture state in the `foundry-data` volume.

Stop it without deleting review state:

```powershell
docker compose down
```

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm run check:capture-boundary
```

All automated tests use injected DNS and transport doubles and make no public network calls. A live canary is a separate, explicit operator action and is never part of CI.

Runtime state is written under `.foundry-data/` and is ignored by the repository-wide `node_modules/` rule plus the Studio-specific ignore entry added with this module.

The supported runtime is Node 22.12 or newer within Node 22. CI is the authoritative Node 22 receipt; local validation on another Node major is supplementary only.
