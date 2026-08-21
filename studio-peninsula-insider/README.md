# Peninsula Insider Workbench

Private, fixture-only Content Foundry shell for DELI-693.

## Current vertical slice

The v0.1 path remains available:

`frozen URL fixture -> evidence ledger -> quick-note draft -> human review -> downloadable patch`

The v0.2 fixture path adds reusable artifact packs:

`frozen URL fixture -> locked claim set -> Article + Ask pack -> per-artifact draft-handoff review -> downloadable article patch when media rights are cleared`

The shell performs no model calls, Git writes, CMS writes, publication or external distribution. Its atomic file-backed store is a single-process development/test adapter behind the durable run contract; startup fails closed in production. PostgreSQL, authentication and private storage remain explicit later gates.

`url_article_v1` can produce article body, article metadata, Ask answer, internal-link plan and SEO metadata proposal artifacts. Text-only packs remain valid and reviewable. Astro patch export stays unavailable until a separately rights-cleared hero placement exists. Reviews approve draft handoff only and never grant publication authority.

The URL-ingestion foundation is present as a sealed backend kernel. `FOUNDRY_REAL_URLS_ENABLED` defaults to `0`, Compose pins it to `0`, and no route, UI or provider invokes it yet. Enabling the flag alone exposes nothing. Wiring the private caller after the capture boundary and threat model are accepted is tracked under issue #325.

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
npm run typecheck
npm test
npm run build
npm run check:capture-boundary
```

Runtime state is written under `.foundry-data/` and is ignored by the repository-wide `node_modules/` rule plus the Studio-specific ignore entry added with this module.

The supported runtime is Node 22.12 or newer within Node 22. CI is the authoritative Node 22 receipt; local validation on another Node major is supplementary only.
