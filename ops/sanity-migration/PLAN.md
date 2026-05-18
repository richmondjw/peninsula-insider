# Peninsula Insider — Sanity Migration Plan

**Status:** Phases 0–5 complete (all content migrated); awaiting cutover + Phase 6/7
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

### Phase 6 — Cross-references
- [ ] All `relatedX` arrays wired as Sanity references
- [ ] Validation pass for broken refs in existing content

### Phase 7 — Page-level content
- [ ] `homepageCover` singleton (replaces `scenes[]` array in `index.astro`)
- [ ] `megaRail` singleton
- [ ] `pageHero` singletons keyed by slug
- [ ] `siteSettings` singleton
- [ ] Audit walkthrough of the ~70 `page/img:*` overrides with Emma — migrate or drop each

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
