# Peninsula Insider — Sanity Migration Plan

**Status:** Phases 0–8 complete; awaiting prod cutover + Phase 9 (decom-on-rails)
**Started:** May 2026
**Target completion:** ~10–12 calendar weeks
**Source of truth after cutover:** Sanity (project `a062b30n`, dataset `production`)

---

## Locked-in decisions

| Decision | Choice | Notes |
|---|---|---|
| Studio URL | `studio.peninsulainsider.com.au` | Custom domain via CNAME |
| Preview mode | Enabled in Phase 1 | Editors see drafts on live site via secret URL |
| Article body migration | Full Portable Text | Custom MDX components map to PT block types |
| Cutover style | Dual-run 1 week per entity | Feature flag fallback to JSON |
| Studio location | `studio-peninsula-insider/` (sibling to `next/`) | |
| Image storage | Sanity Asset Pipeline | Re-evaluate if scale demands |
| Document IDs | `<type>-<slug>` | Idempotent imports, predictable references |
| Backup policy | Daily Sanity dataset export, 90-day retention | `ops/backups/sanity-YYYY-MM-DD.tar.gz` |

---

## Tokens (never commit to Git)

Both stored in:
- Vercel project env vars (production + preview)
- `.env.local` in `next/` and `studio-peninsula-insider/` (gitignored)
- 1Password / agent secrets store

| Token | Scope | Purpose |
|---|---|---|
| `SANITY_READ_TOKEN` | Read-only, no draft access | Astro SSR — fetches published content |
| `SANITY_PREVIEW_TOKEN` | Read-only, draft access | Astro preview routes — editors see drafts |
| `SANITY_WRITE_TOKEN` | Editor-level | Importer scripts, admin operations |
| `SANITY_WEBHOOK_SECRET` | HMAC secret | Verifies webhook source on revalidate endpoint |

---

## Feature flags

In `.env` / Vercel env:

```
SANITY_READ_ENABLED=true              # master kill-switch
SANITY_VENUES_ENABLED=false
SANITY_PLACES_ENABLED=false
SANITY_ARTICLES_ENABLED=false
SANITY_EVENTS_ENABLED=false
SANITY_ITINERARIES_ENABLED=false
SANITY_TOURS_ENABLED=false
SANITY_TOUR_OPERATORS_ENABLED=false
SANITY_TOUR_PACKAGES_ENABLED=false
SANITY_EXPERIENCES_ENABLED=false
SANITY_PAGE_LEVEL_ENABLED=false
```

Each phase flips its own flag to `true`. If anything breaks, flip back to `false` — Astro falls back to the JSON path within seconds.

---

## Phase tracker

### Phase 0 — Foundations *(complete)*
- [x] Studio bootstrap
- [x] Schema scaffold (imageRef, coordinates, authority, tags, place, venue)
- [x] PoC import (5 venues + 5 places, idempotent)
- [ ] Custom domain for Studio (`studio.peninsulainsider.com.au`) — DNS pending
- [x] Production studio deploy at https://peninsula-insider.sanity.studio/
- [x] Read + Preview + Webhook secret issued
- [x] Vercel env vars wired (14 vars, all 3 environments)
- [x] Astro Sanity client + image helper + query module
- [x] Webhook handler at `/api/revalidate` (HMAC-verified)
- [x] Feature flag plumbing in Astro
- [ ] Daily dataset export cron — Phase 2 starter

### Phase 1 — Venues *(ready for prod cutover)*
- [x] Schema extended (whyWeGo, editorVerdict, bestFor, ifOnlyOneThing, pairWith, subregion, wines, visiting, restaurant, accommodation, sameAs, faq, lastFactVerified)
- [x] Full venue import — 141 of 141 imported (no failures)
- [x] Merge Supabase venue/hero overrides — 22 applied with JSON-fallback for upstream errors
- [x] Astro adapter (next/src/lib/sanity/venue-adapter.ts) feeds existing VenueDetailTemplate
- [x] Dual-read wired in eat/[slug], wine/[slug], stay/[slug] behind `SANITY_VENUES_ENABLED`
- [x] Diff script — 141/141 clean field-by-field comparison
- [ ] Flip `SANITY_VENUES_ENABLED=true` on prod
- [ ] 1-week dual-run monitoring
- [ ] Delete JSON path, archive `next/src/content/venues/`

### Phase 2 — Places
- [ ] Extend place schema (factualLede, intro, bestFor, notFor, bestDay, tldr, etc.)
- [ ] Import script (~30–50 places) + 15 hero overrides
- [ ] Update `PlaceDetailTemplate.astro` for dual-read
- [ ] Flip flag, dual-run, archive

### Phase 3 — Articles + Authors *(complete)*
- [x] Enumerated 6 custom MDX components (AlertBlock, PracticalCallout, CellarDoorList, DogPolicyTable, SubregionGrid, VarietyGuide)
- [x] Author document schema + 1 doc imported
- [x] Article document schema with Portable Text body
- [x] Markdown → PT converter (.md path) and MDX embed extractor (.mdx path)
- [x] 174 of 174 articles imported with 7 hero overrides merged
- [x] journal/[slug] dual-read gated behind `SANITY_ARTICLES_ENABLED`
- [x] PortableTextBody component renders structured embeds inline; items-array embeds (CellarDoorList, etc) currently render placeholder stubs editors will refine in Studio
- [ ] Preview mode wired — deferred follow-up
- [ ] Flip flag, dual-run, archive

### Phase 4 — Itineraries *(complete; events deferred)*
- [x] Itinerary schema + nested itineraryStop object
- [x] Import script — 6 itineraries with venue refs resolved
- [x] Merged 4 Supabase itinerary/hero overrides
- [x] plans/[slug] dual-read for itinerary branch
- [x] Diff: 6/6 clean
- [x] Events imported as a snapshot — 91 of 91 docs
- [x] whats-on/[slug] dual-read behind `SANITY_EVENTS_ENABLED`
- [ ] **CARRY-FORWARD**: the import-events cron pipeline still writes to JSON; that pipeline needs migrating to write into Sanity directly before events can be the canonical source

### Phase 5 — Tours + Operators + Packages + Experiences *(complete)*
- [x] Four document schemas (experience, tourOperator, tour, tourPackage)
- [x] Consolidated importer with dependency order (operators → tours → packages, experiences anytime)
- [x] 85 docs imported (42 + 17 + 18 + 8), 100% success
- [x] Weak refs used to tolerate stale source data
- [x] phase5-adapters.ts (4 adapters in one module)
- [x] Dual-read in explore/[slug], tour/[slug], tour/operators/[slug], tour-packages/[slug]
- [ ] Flip flags, dual-run, archive

### Phase 6 — Cross-references *(complete)*
- [x] All `relatedX` arrays wired as Sanity references (weak refs for stale-data tolerance)
- [x] `next/scripts/audit-references.mjs` reports dangling refs across all entity types
- [x] Audit result: 77 dangling refs (all weak, all pre-existed in JSON path — no regression). Notable: 73 article.relatedVenues misnamed (e.g. "avani-syrah" vs actual "avani-wines"). Editorial cleanup as the team touches each article.

### Phase 7 — Page-level content *(complete)*
- [x] `homepageCover` singleton + seeded with 4 scenes from index.astro
- [x] `megaRail` singleton + seeded with 5 rail entries
- [x] `pageHero` documents seeded for 6 hub pages (whats-on, plans, eat-cafes, places, tour-operators, events)
- [x] `siteSettings` singleton + seeded with masthead, edition, footer links
- [x] Astro-side dual-read wiring: homepage cover (index.astro), V4MegaRail.astro, SubpageHero.astro, SectionHero.astro all consume Sanity singletons when `SANITY_PAGE_LEVEL_ENABLED=true`
- [x] PortableTextBody renders actual hub-guide components (CellarDoorList, DogPolicyTable, SubregionGrid, VarietyGuide) for items-array embeds — placeholder stubs replaced
- [ ] Walkthrough of the ~70 `page/img:*` orphaned overrides with Emma — most will be drops; survivors get migrated to structured slots

### Phase 8 — Editorial onboarding *(doc ready)*
- [x] `workspace/JWR_PKM_2026/04-agents/editorial-guides/sanity-studio.md` — Emma's daily-driver guide
- [ ] Live 15-min walkthrough with Emma in the deployed Studio

### Phase 9 — Decommissioning *(script ready, do not execute yet)*
- [x] `ops/sanity-migration/decommission.sh` — dry-run + execute modes
- [ ] **Blocked until** every `SANITY_<ENTITY>_ENABLED` flag has been on in production for ≥14 days and no editor reports cutover incidents

### Phase 8 — Editorial onboarding *(parallel)*
- [ ] Week 1: Emma Studio tour + 3 venue edits
- [ ] Week 2: Place editing walkthrough
- [ ] Week 3: Article authoring + Portable Text
- [ ] Week 4–5: Other editors onboarded
- [ ] Editorial guide doc in vault

### Phase 9 — Decommissioning
- [ ] Final SQL export of `pi.cms_*` tables → `ops/backups/`
- [ ] Drop `pi.cms_image_slots`, `pi.cms_text_fields`, `pi.cms_revisions`, `pi.admin_user_allowlist`
- [ ] Remove `next/src/lib/inline-edit/`
- [ ] Remove `InlineEditor.astro` from BaseLayout
- [ ] Strip `loadOverrides`, `editableImage`, `editableText`, `applyOverridesOnLoad`
- [ ] Remove Supabase auth from client bundle
- [ ] Update CLAUDE.md, REMY-V3.md, vault Remy persona

---

## Manual webhook + backup configuration

### Sanity → Vercel publish-revalidate webhook *(manual — Studio Manage only)*

The Astro endpoint at `/api/revalidate` is wired, HMAC-verified, and ready.
Sanity's "GROQ-powered webhooks" don't have a public REST API for creation
yet — they have to be configured in the dashboard. One-time setup:

1. Open https://www.sanity.io/manage/personal/project/a062b30n/api/webhooks
2. **Add a new webhook** with:
   - **Name**: `vercel-revalidate`
   - **URL**: `https://peninsulainsider.com.au/api/revalidate`
   - **Dataset**: `production`
   - **Trigger on**: Create, Update, Delete
   - **HTTP method**: POST
   - **API version**: `v2025-01-01`
   - **Include drafts**: No
   - **Filter (GROQ)**:
     ```
     _type in ["venue","place","article","event","itinerary","tour","tourOperator","tourPackage","experience","homepageCover","megaRail","pageHero","siteSettings"]
     ```
   - **Projection**: `{ _id, _type, slug }`
   - **Secret**: paste the value of `SANITY_WEBHOOK_SECRET` from `next/.env.local`
3. Save. Sanity sends a test POST — you'll see a 401 (no signature) or 405
   (production hasn't deployed the endpoint yet). Both are fine; the
   webhook is queued and will fire on the next document publish.

### Daily Sanity dataset backup *(automated)*

GitHub Actions workflow at `.github/workflows/sanity-backup.yml` runs
nightly at 17:00 UTC. Exports `production` dataset to
`ops/backups/sanity-YYYY-MM-DD.tar.gz` and commits back to main. Prunes
exports older than 90 days. Required secret:

- `SANITY_WRITE_TOKEN` (or any token with read access to the dataset).
  Add at https://github.com/richmondjw/peninsula-insider/settings/secrets/actions

---

## What I (James) need to do

**This week (Phase 0):**
1. DNS: add `CNAME studio.peninsulainsider.com.au → <subdomain>.sanity.studio` (will give specific target after `sanity deploy`)
2. Sanity manage UI: add Emma as `editor` role (https://www.sanity.io/manage/personal/project/a062b30n)
3. Vercel env vars: I'll list specific values once I generate them; you paste into Vercel dashboard
4. Confirm Vercel hybrid cutover (PR #91) is green and merged

**Ongoing per phase:**
- 30 min/week with Emma in Studio reviewing imported content
- Approve schema changes before each import phase runs
- Sign off on cutover for each entity

---

## Rollback plan

Per-entity: flip `SANITY_<ENTITY>_ENABLED=false`. Site falls back to JSON path. Editors edit JSON files temporarily (worst case) until issue resolved.

Global: flip `SANITY_READ_ENABLED=false`. Entire site reverts to pre-Sanity behaviour. JSON content + Supabase overrides + inline editor all still functional.

After Phase 9 (decommissioning): point of no return. Rollback requires restoring from `ops/backups/sanity-YYYY-MM-DD.tar.gz` and `ops/backups/cms-final-YYYY-MM-DD.sql`. We don't decommission until two full weeks of stable Sanity-only operation.
