# Peninsula Insider Workbench

Private, local-only Content Foundry shell for DELI-693. Fixtures remain the default path; real URL capture is available locally behind a flag that defaults to off.

## Current vertical slice

The v0.1 path remains available:

`frozen URL fixture -> evidence ledger -> quick-note draft -> human review -> downloadable patch`

The v0.2 fixture path adds reusable artifact packs:

`frozen URL fixture -> locked claim set -> Article + Ask pack -> per-artifact draft-handoff review -> downloadable article patch when media rights are cleared`

The shell performs no model calls, Git writes, CMS writes, publication or external distribution. Its only outbound capability is the flagged, human-initiated capture described below. Its atomic file-backed store is a single-process development/test adapter behind the durable run contract; startup fails closed in production. PostgreSQL, authentication and private storage remain explicit later gates.

`url_article_v1` can produce article body, article metadata, Ask answer, internal-link plan and SEO metadata proposal artifacts. Text-only packs remain valid and reviewable. Astro patch export stays unavailable until a separately rights-cleared hero placement exists. Reviews approve draft handoff only and never grant publication authority.

The v0.2 local real-URL path adds one more, and it is off unless a local operator turns it on:

`submitted HTTPS URL -> immutable source revision -> evidence ledger -> quick-note draft -> human review -> downloadable patch`

## Local real URL capture

`FOUNDRY_REAL_URLS_ENABLED` defaults to `0` in the environment, in `compose.yaml`, in the `Dockerfile` and in CI. While it is `0` the capability is unavailable rather than merely unused: `/api/foundry/intake/url` and `/api/foundry/runs/:id/refresh` answer `404 real_url_capture_disabled`, `/api/capabilities` reports `realUrlCapture: false`, the Workbench shows the intake panel as disabled, and nothing can reach the sealed kernel.

Startup fails closed rather than degrading:

- `NODE_ENV=production` refuses to start at all.
- `FOUNDRY_REAL_URLS_ENABLED=1` is refused unless `FOUNDRY_HOST=127.0.0.1`, so real capture can never be combined with a team-reachable listener.
- Any value other than `0` or `1` is refused.

To exercise the path locally:

```powershell
$env:FOUNDRY_REAL_URLS_ENABLED = "1"
npm run dev
```

There is no scheduler, queue or crawler. One human submission captures one URL once; nothing re-fetches on its own.

### What a capture records

Every submission writes an audit row before any egress, so an interrupted capture stays visible as `capturing` after a restart. Terminal rows are `extracted`, `held`, `no_story`, `failed` or `rejected`, and the Workbench distinguishes them. A submission the policy layer refuses before it reaches the network (`http://`, a port other than 443, credentials in the URL, a special-use host) is `rejected` and never produces a capture attempt. A private, blocked or redirect-to-private target is `failed` with a safe stage and code, and produces no source revision. Neither creates a run.

An extracted capture stores an immutable source revision and extraction revision, and shows the reviewer its requested and canonical URL, capture time, freshness window, redirect chain, HTTP status, media type, charset, content encoding, allow-listed response headers, content hashes and the blocks held out of copy by the house price and em-dash rules.

Captured HTML never reaches the browser. It is stored in the content-addressed blob store and only ever surfaces as extracted plain-text excerpts, each reproducible from the immutable extraction revision. `npm run check:capture-boundary` fails the build if any file under `server/` or `src/` introduces `dangerouslySetInnerHTML` or another raw-HTML injection path.

### Refresh

Refreshing a captured source captures a new immutable revision, moves the claim set and angle to the next version and redrafts the note. The previous revision is retained, never mutated, and every review decision that depended on it becomes `stale`, so a refreshed run returns to review and cannot export a patch until it is reviewed again. Claims expire fourteen days after capture; once they do, the supported-claims gate blocks and the run needs a refresh.

### Local acceptance canary

`https://example.com/` is the one manually selected canary. It is IANA's reserved documentation domain: a small, static, publicly crawlable page that exists to be fetched in examples, holds no personal, commercial or sensitive data, and is stable enough to be a meaningful receipt. Automated tests never call it; `tests/fixtures/canary-example-com.html` is a snapshot of its bytes replayed through an in-process transport double, so `npm test` and CI perform no outbound capture.

## Run locally

```powershell
npm install
npm run dev
```

- UI: `http://127.0.0.1:4311`
- API: `http://127.0.0.1:4310/api/health`

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
npm run check:capture-boundary
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

Runtime state is written under `.foundry-data/` and is ignored by the repository-wide `node_modules/` rule plus the Studio-specific ignore entry added with this module.

The supported runtime is Node 22.12 or newer within Node 22. CI is the authoritative Node 22 receipt; local validation on another Node major is supplementary only.
