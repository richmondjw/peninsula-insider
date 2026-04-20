# Peninsula Insider — Site System Documentation

**Purpose:** Canonical technical and operational reference for how Peninsula Insider works.

**Update rule:** Revise whenever architecture, workflows, cron jobs, search, SEO, QA, publishing, app/chat plans, or protection strategy materially change.

---

## 1. Platform overview

Peninsula Insider is an editorially curated Mornington Peninsula destination platform. It is evolving from a static tourism guide into an **agentic publication and destination intelligence product**.

It currently operates as:
- a public website
- an editorial system
- a structured content repository
- a growing automated publishing / review workflow

Strategic direction:
- differentiated local editorial authority
- structured discovery across places / venues / experiences / events
- eventually a conversational guide / concierge layer
- later a more app-like installable experience

---

## 2. Current architecture

### Front-end stack
- **Framework:** Astro
- **Primary build surface:** `/home/node/.openclaw/workspace/peninsula-insider/next`
- **Legacy site root:** `/home/node/.openclaw/workspace/peninsula-insider/`
- **Deployment target:** GitHub Pages
- **Live V2 path:** `https://peninsularinsider.com.au/V2/`

### Build model
- Static build output
- Git-driven deployment to GitHub Pages
- Use `build-v2.sh` rather than direct `npm run build` for correct `/V2/` path handling and post-processing

### Build command
```bash
cd /home/node/.openclaw/workspace/peninsula-insider && bash build-v2.sh
```

### Deployment
```bash
cd /home/node/.openclaw/workspace/peninsula-insider
git add -A
git commit -m "message"
git push origin main
```

---

## 3. Content model

Peninsula Insider is now organised around structured content rather than only flat brochure pages.

### Core content types
- **venues** — restaurants, wineries, accommodation, other visitable places
- **places** — towns / localities / geographic hubs
- **experiences** — beaches, walks, activities, lookouts, family/outdoor use cases
- **articles / journal** — editorial pieces, lists, dispatches, service journalism
- **itineraries** — occasion-based and duration-based trip plans
- **events** — dated event listings and What’s On entries

### Key structural properties
The content model increasingly supports:
- mood
- zone / geography
- audience
- season
- price / quality positioning
- authority / ranking signals

This makes the architecture well-suited for future faceted search and chat/RAG.

---

## 4. Editorial operating system

### Core doctrine
Peninsula Insider exists to be:
- **definitive**
- **local**
- **opinionated**
- **selective**
- **editorially trusted**

It is explicitly NOT:
- a tourism board
- a generic directory
- a content farm
- an advertising shell posing as editorial

### Canonical operating documents
Primary references:
- `docs/peninsula-insider-branding-and-creative-guide-2026-04-20.md`
- `docs/peninsula-insider-agentic-editorial-operating-model-2026-04-13.md`
- `~/.openclaw/skills/peninsula-insider/SKILL.md`
- `docs/editorial-ops-system-2026-04-09.md`
- `docs/editorial-system-2026-04-09.md`

### Byline system
Allowed editorial bylines:
- **James Richmond**
- **The Peninsula Insider**

Agents do not invent named contributors.

### Brand and creative system
The canonical brand guide defines the shared standards for:
- voice and tone
- messaging hierarchy
- visual identity and design principles
- typography, colour, and layout behaviour
- photography and image integrity
- newsletter and email creative
- social creative adaptation
- language guardrails and approval criteria

All public-facing Peninsula Insider work should be checked against:
- `docs/peninsula-insider-branding-and-creative-guide-2026-04-20.md`

---

## 5. Desk model

Peninsula Insider is organised into desk responsibilities.

### Active desk/quality skills
- **Dispatch Desk** — events, What's On, newsletter freshness
- **Table Desk** — food, wine, cellar doors, producers
- **Field Desk** — beaches, walks, family, outdoor use cases
- **Escapes Desk** — itineraries, sequencing, occasion-based trip design
- **Stay Desk** — accommodation and where-to-base-yourself logic
- **Places Desk** — town/locality guides and geographic framing
- **Verify** — fact-checking and confidence scoring gate
- **SEO Review** — search intent, title/meta, internal linking, duplication risk

### Skill locations
All skill files live under:
`/home/node/.openclaw/skills/peninsula-insider/`

---

## 6. Editorial workflow pipeline

The formal publishing pipeline is now:

`Research → Draft → Style Review → Fact Check → SEO Review → QA Gate → Publish`

### Stage definitions
- **Research:** sourced and cited intelligence gathering
- **Draft:** editorial conversion into content or change recommendations
- **Style Review:** voice alignment against Peninsula Insider tone
- **Fact Check / Verify:** dates, URLs, closures, hours, claims, confidence state
- **SEO Review:** search intent, title/meta, internal linking, duplication risk
- **QA Gate:** publish / hold / reject / escalate
- **Publish:** build, deploy, verify, log

### Confidence states
- `VERIFIED`
- `LIKELY`
- `VERIFY-BEFORE-PUBLISH`

---

## 7. SEO system

SEO is now a formal pre-publish gate.

### Canonical SEO skill
- `~/.openclaw/skills/peninsula-insider/desks/seo.md`

### Required SEO review outputs
For substantial pieces and change bundles:
- primary target phrase
- supporting phrases
- search intent classification
- title tag draft
- meta description draft
- internal links to add
- thin-content / duplication check
- schema opportunity notes
- SEO gate decision (`PASS` or `REVISE BEFORE PUBLISH`)

### SEO philosophy
- search-intelligent, not keyword-stuffed
- protect editorial voice
- lean into local specificity and actual user intent

---

## 8. Cron / automation system

### Cron source of truth
OpenClaw cron registry:
- `/home/node/.openclaw/cron/jobs.json`

### Mission Control visibility model
Recurring jobs are mirrored into Mission Control as recurring tasks with:
- `cron_job_id`
- `cron_expr`
- `cron_tz`

Job runs report into `cron_job_runs` so the Jobs page can display run history and health.

### Peninsula Insider cron jobs
Current known PI jobs:
- `pi-daily-events-scan`
- `pi-daily-venue-healthcheck`
- `pi-daily-seasonality-refresh`
- `pi-daily-build-draft`
- `pi-daily-qa-and-publish`
- `pi-weekly-editorial-commissioning`
- `pi-weekly-evergreen-refresh`
- `pi-monthly-content-audit`

### Operational requirement
Each PI cron job now:
- self-reports start/end to Mission Control `cron_job_runs`
- loads the Peninsula Insider constitution skill before work
- loads desk/quality skills where relevant
- files meaningful outputs to Mission Control Docs

---

## 9. Search architecture direction

### Recommendation
- **Phase A:** Pagefind
- **Phase B:** MiniSearch-backed structured discovery

### Why
Pagefind fits the current Astro + static-hosting model well and is the right first full-text search layer.

MiniSearch becomes useful later for faceted discovery over structured attributes such as:
- mood
- zone
- audience
- season
- price band

### Avoid for now
- Algolia / Typesense (too much infra overhead for current scale)
- Lunr
- Fuse.js as the core whole-site search layer

---

## 10. Chat / app roadmap

### Recommended path
- **Phase 1:** public web-based editorial concierge / `/ask`
- **Phase 2:** add installable **PWA** capability
- **Phase 3:** Google Play packaging if justified
- **Phase 4:** iOS wrapper / app-store presence only after deeper product depth

### Strategic framing
This should not be a generic chatbot. It should be framed as:
- *Ask the Peninsula Insider*
- editorial concierge
- destination planning layer over trusted local content

### Key dependency
Chat becomes useful only after content depth reaches a sufficiently trustworthy threshold.

---

## 11. Public legal / crawler layer

### Terms page
- `next/src/pages/terms.astro`
- establishes acceptable use, IP position, and automated extraction restrictions

### robots policy
- `next/public/robots.txt`
- blocks common training crawlers while preserving normal search/citation paths where useful
- should be reviewed whenever crawler policy changes

### Cloudflare implementation guide
- `docs/cloudflare-implementation-checklist-2026-04-13.md`
- operational checklist for edge hardening rollout

---

## 12. Anti-scraping strategy

### Core reality
Public static content cannot be fully protected from scraping without harming SEO and UX.

### Recommended approach
- friction + observation + moat-building
- not fantasy hard prevention

### Current recommendation
- put site behind **Cloudflare**
- enable bot protection / rate controls
- use robots.txt selectively for training crawlers
- keep highest-value future utility in gated/chat/API layers

### Strategic moat
The true defensible advantage is:
- James’s editorial taste
- freshness cadence
- local relationships
- sequencing / judgement
- future behavioural and conversational product layer

---

## 13. QA / publish controls

### QA gate responsibilities
The QA gate checks:
- factual confidence
- style / voice compliance
- SEO readiness
- scope safety
- publish readiness

### Current publish discipline
- do not publish directly from research
- do not auto-apply high-risk edits without explicit approval logic
- file reports and build recommendations before release

---

## 14. Mission Control integration

### Mission Control roles
Mission Control is the visibility, document, task, and run-history layer.

Peninsula Insider work should appear in Mission Control via:
- recurring tasks
- activity events
- documents
- cron job runs

### Document types commonly used
- `brief`
- `report`
- `strategy`
- `content`

---

## 15. Canonical files to maintain

### Core operating docs
- `docs/site-changelog.md`
- `docs/site-system-documentation.md`
- `docs/peninsula-insider-agentic-editorial-operating-model-2026-04-13.md`

### Skills
- `~/.openclaw/skills/peninsula-insider/SKILL.md`
- `~/.openclaw/skills/peninsula-insider/desks/*.md`

### Reports
- `/home/node/.openclaw/workspace/reports/`

### Cron registry
- `/home/node/.openclaw/cron/jobs.json`

---

## 16. Search implementation references

### Search Phase A brief
- `docs/search-phase-a-implementation-brief-2026-04-13.md`

### Decision layer
- `docs/decision-checklist-2026-04-13.md`

These docs translate strategy into executable implementation choices.

---

## 17. Maintenance rules

Update this file when any of the following change:
- stack / deployment architecture
- content model
- cron jobs
- QA / SEO / Verify gates
- search architecture
- chat/app strategy
- anti-scraping strategy
- Mission Control integration model

Use `site-changelog.md` for chronological events and this file for the stable operating picture.
