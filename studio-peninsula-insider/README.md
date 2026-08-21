# Peninsula Insider Workbench

Private, human-governed Content Foundry V1 workbench for DELI-693 and GitHub issues #331 and #332.

## Current vertical slice

The v0.1 path remains available:

`frozen URL fixture -> evidence ledger -> quick-note draft -> human review -> downloadable patch`

The V1 path adds default-off real URL capture and reusable artifact packs:

`real URL -> immutable capture -> human source/claim/angle confirmation -> Quick Note + Article + metadata + Ask -> independent review receipts -> safe draft handoffs`

The V1 release candidate also exposes four deterministic multi-format fixture recipes through the same accessible launch and review workbench:

- `newsletter_social_v1`: the stable 11-position Insider Note with honest optional omissions, a James-only subject set and draft-only LinkedIn/Instagram artifacts;
- `explainer_preproduction_v1`: five governed explainer handoffs;
- `podcast_preproduction_v1`: seven evidence, interview, script and packaging handoffs;
- `short_video_preproduction_v1`: nine hook, script, shot, scene, overlay, subtitle, thumbnail and caption handoffs.

These lanes make no external calls. In V1, real URLs still produce only Quick Note, Article, metadata and Ask. Newsletter, social, explainer, podcast and short-video generation remains deterministic fixture work. Text, script and storyboard handoffs may be reviewed while `media_render_ready` is a visible nonblocking `WAIT`. The workbench has no recording, rendering or synthetic-voice authority. Media readiness fails closed unless exact assets, versions, content hashes, placements, rights, recognisable-person releases and required disclosures are bound.

The shell performs no model calls, Git writes, CMS writes, publication or external distribution. Its atomic file-backed store is a single-process development/test adapter behind the durable run contract; startup fails closed in production. PostgreSQL, authentication and private storage remain explicit later gates.

`url_article_v1` produces the required V1 pack after the human confirmation lock. Every factual public field carries exact evidence lineage and immutable hashes. Source refresh stales only artifacts that depend on the changed capture or selected claims, including their transitive dependants. Text-only Article and Ask artifacts remain reviewable and exportable. Astro patch export is a separate boundary and stays unavailable until the exact hero asset, placement, rights version and any required releases match a server-held dependency. Reviews approve draft handoff only and never grant publication authority.

All generation, editing, gate re-evaluation, review and export paths enforce the shared editorial law: no prices or price implications (including free, no-charge, cost, fees and surcharges) and no literal or HTML-encoded em dash. Quick source notes and Ask provenance footers are exact server-owned templates. The workbench exposes explicit negative capabilities for providers, models, publishing, sending, scheduling and production mutation.

Patch adapters are artifact-specific at `/api/foundry/runs/:runId/artifacts/:artifactId/patch`: an accepted Quick Note can export its own patch even inside an Article pack, while an Article adapter always validates the current Article and metadata receipts plus exact hero rights together.

Each run references a stable `pi.run-origin-authority.v1` receipt held in a private, content-addressed repository outside `runs.json`. That receipt binds the run, recipe and bundle to either the exact frozen fixture or the original immutable capture attempt and revisions. The server verifies it on every read, mutation, review and export, preventing mutable run data from changing a fixture into a captured source or downgrading a captured source into a fixture. Source refresh retains the original authority anchor while validating the newer capture projection separately.

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
npm run verify:patches
npm audit --audit-level=high
```

The store reads historical v0.1, artifact-pack v1/v2, #325 single-artifact v2 and the four accepted multi-format branch fixtures. The first mutation writes `pi.foundry-file-store.v3`. Unsealed legacy reviews become `legacy_unsealed`; valid sealed #325 receipts remain historical as `schema_migrated` and cannot authorise a V1 export. The multi-format fixtures are reconstructed only from the exact accepted recipe and bundle pairs, then resealed in the permanent origin catalogue. Cross-paired, renamed, unsupported or altered origins fail closed.

Runtime state is written under `.foundry-data/` and is ignored by the repository-wide `node_modules/` rule plus the Studio-specific ignore entry added with this module.

The supported runtime is Node 22.12 or newer within Node 22. CI is the authoritative Node 22 receipt; local validation on another Node major is supplementary only.
