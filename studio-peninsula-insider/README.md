# Peninsula Insider Workbench

Private, fixture-only Content Foundry shell for DELI-693.

## Current vertical slice

The v0.1 path remains available:

`frozen URL fixture -> evidence ledger -> quick-note draft -> human review -> downloadable patch`

The v0.2 fixture path adds reusable artifact packs:

`frozen URL fixture -> locked claim set -> Article + Ask pack -> per-artifact draft-handoff review -> downloadable article patch when media rights are cleared`

The v0.3 fixture path adds the governed newsletter and social recipes:

`current article + locked claim set -> stable 11-position Insider Note + separate subject set + LinkedIn/Instagram drafts -> independent reviews -> downloadable draft handoffs`

The shell performs no model calls, Git writes, CMS writes, publication or external distribution. Its atomic file-backed store is a single-process development/test adapter behind the durable run contract; startup fails closed in production. PostgreSQL, authentication and private storage remain explicit later gates.

`url_article_v1` can produce article body, article metadata, Ask answer, internal-link plan and SEO metadata proposal artifacts. Text-only packs remain valid and reviewable. Astro patch export stays unavailable until a separately rights-cleared hero placement exists. Reviews approve draft handoff only and never grant publication authority.

`newsletter_social_v1` preserves the full `insider_note.position.01.masthead` through `insider_note.position.11.footer` union. Optional positions are explicitly omitted instead of padded. Weather and reader replies require authoritative lineage, reader privacy is first-name-only, secondary picks contain exactly two items when present, and poll content remains an editorial-supplied Beehiiv-native decision. Locked copy, CTA limits, venue spelling, email UTMs, nested claim lineage, no-price and no-em-dash rules are deterministic gates.

Subject and preview candidates are a separate artifact with three mutually distinct pairs and no selected value. Only James can select a subject, send an email or publish a social post. Instagram caption, first-comment, carousel and media-brief drafts remain separate artifacts; cadence and hashtag placement stay unresolved. A media brief cannot be accepted or handed off unless rights explicitly clear the exact Instagram placement and any recognisable people.

Every declared artifact can be reviewed independently. A reviewed artifact can be downloaded from its own `reviewed_draft_handoff` adapter as inert JSON containing payload and claim lineage. No handoff grants publication or scheduling authority.

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
