# Peninsula Insider Workbench

Private, fixture-only Content Foundry shell for DELI-693.

## Current vertical slice

`frozen URL fixture -> evidence ledger -> quick-note draft -> human review -> downloadable patch`

The shell performs no model calls, Git writes, CMS writes, publication or external distribution. Its atomic file-backed store is a single-process development/test adapter behind the durable run contract; startup fails closed in production. PostgreSQL, authentication and private storage remain explicit later gates.

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
```

Runtime state is written under `.foundry-data/` and is ignored by the repository-wide `node_modules/` rule plus the Studio-specific ignore entry added with this module.

The supported runtime is Node 22.12 or newer within Node 22. CI is the authoritative Node 22 receipt; local validation on another Node major is supplementary only.
