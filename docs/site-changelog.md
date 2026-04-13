# Peninsula Insider — Site Changelog

**Purpose:** Deep chronological operating log for Peninsula Insider. This file records meaningful site, content, architecture, workflow, and platform changes over time.

**Update rule:** Append on every meaningful publish, architecture change, cron/workflow change, search/chat/app decision, or incident/fix.

---

## 2026-04-13 — Editorial operating system institutionalised

### Documentation and governance
- Created and filed the canonical operating model document:
  - `docs/peninsula-insider-agentic-editorial-operating-model-2026-04-13.md`
  - Filed to Mission Control Docs as strategy document
- Established Peninsula Insider as a formal **agentic editorial publication** with:
  - editorial constitution / T-MOG
  - desk-based organisational model
  - workflow pipeline
  - Verify / Style gates
  - approval model
  - institutionalisation model (manifesto + desk skills + cron)

### Skills created
Created the Peninsula Insider skill system under:
- `~/.openclaw/skills/peninsula-insider/SKILL.md`
- `~/.openclaw/skills/peninsula-insider/desks/dispatch.md`
- `~/.openclaw/skills/peninsula-insider/desks/table.md`
- `~/.openclaw/skills/peninsula-insider/desks/field.md`
- `~/.openclaw/skills/peninsula-insider/desks/escapes.md`
- `~/.openclaw/skills/peninsula-insider/desks/stay.md`
- `~/.openclaw/skills/peninsula-insider/desks/places.md`
- `~/.openclaw/skills/peninsula-insider/desks/verify.md`
- `~/.openclaw/skills/peninsula-insider/desks/seo.md`

### Editorial pipeline changes
Formalised the pipeline as:

`Research → Draft → Style Review → Fact Check → SEO Review → QA Gate → Publish`

SEO became a mandatory pre-publish gate.

### Cron system changes
Patched all active Peninsula Insider cron jobs so they now:
- self-report run records to Mission Control `cron_job_runs`
- load the Peninsula Insider editorial constitution before work begins
- load relevant desk/quality skills where applicable
- enforce SEO review before QA/publish stages

### New cron jobs added
Added:
- `pi-daily-seasonality-refresh`
- `pi-weekly-editorial-commissioning`
- `pi-monthly-content-audit`

This brought the Peninsula Insider cron stack closer to the cadence map defined in the operating model.

### Mission Control sync repair
Repaired the gap between live OpenClaw cron jobs and Mission Control Jobs page by:
- creating recurring task records linked to actual `cron_job_id` values
- cleaning up ghost `cron_job_runs` rows that were distorting health metrics
- patching job prompts so real run history can now populate the Jobs section correctly

### Strategic research commissioned
Commissioned and received architecture research on:
- search functionality rollout
- public chat / app packaging options
- anti-scraping strategy

---

## 2026-04-13 — Immediate platform hardening + decision layer started

### Public hardening assets created
Added:
- `next/public/robots.txt` — updated crawler policy for V2
- `next/src/pages/terms.astro` — Terms of Use page including automated extraction restrictions
- `docs/cloudflare-implementation-checklist-2026-04-13.md`
- `docs/search-phase-a-implementation-brief-2026-04-13.md`
- `docs/decision-checklist-2026-04-13.md`

### Immediate execution focus now active
The approved execution roadmap has started with:
- public hardening layer
- crawler/terms layer
- Cloudflare implementation checklist
- Search Phase A implementation brief
- explicit approve / investigate / defer decision checklist

---

## 2026-04-13 — Platform architecture direction clarified

### Search
Recommendation established:
- **Phase A:** Pagefind for static full-text search
- **Phase B:** MiniSearch for structured discovery / faceted venue filtering

Key idea:
- the real UX win is not just a search box, but discovery via structured attributes like mood, zone, audience, season, and price band

### Chat / app
Recommendation established:
- **Web chat first** (`/ask` style editorial concierge)
- **PWA second** (installable site experience)
- **Google Play next** via wrapper / TWA when justified
- **Apple App Store later** only after the experience has enough distinct value to survive App Review

### Anti-scraping
Recommendation established:
- put the site behind **Cloudflare**
- enable basic bot protection now
- treat scraping defence as **friction + moat-building**, not fantasy prevention
- keep the highest-value future utility in gated/chat/API layers rather than fully exposing it as raw static HTML forever

---

## 2026-04-13 — Manual cron verification run

Triggered the Peninsula Insider cron jobs manually in sequence to validate the new system:
- `pi-daily-events-scan`
- `pi-daily-venue-healthcheck`
- `pi-daily-seasonality-refresh`
- `pi-daily-build-draft`
- `pi-daily-qa-and-publish`
- `pi-weekly-editorial-commissioning`
- `pi-monthly-content-audit`
- `pi-weekly-evergreen-refresh`

Purpose:
- confirm the Jobs sync model
- validate run reporting in Mission Control
- exercise the newly institutionalised editorial / SEO / QA flow

---

## 2026-04-12 and earlier — Existing major build state carried forward

### V2 platform
- Astro rebuild active under `V2/`
- Multi-page editorial architecture established across venues, places, experiences, articles, itineraries, and events
- Robust `/V2/` path handling achieved through build script strategy

### Content scale (observed state)
- venues: ~131
- places: ~19
- experiences: ~31
- articles: ~43
- itineraries: ~5
- events: ~12

### Newsletter / analytics
- Beehiiv integrated on-site via embedded subscription flow
- Google Analytics added (`G-0MR9YVZ9NW`)

### Brand / editorial direction
- James-led house voice locked in
- fake human bylines rejected
- editorial differentiation vs tourism-board competitors clearly established

---

## Maintenance rule for future updates

When appending to this log, include:
- date
- what changed
- why it changed
- affected files / systems
- whether it was published, staged, or only documented
