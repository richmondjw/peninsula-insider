# Peninsula Insider Change Log

This changelog records meaningful structural, content, SEO, and operational changes to the Peninsula Insider site.

## Standard for entries
For each meaningful change, include:
- Date
- Agent / operator
- Summary
- Files changed
- Pages affected
- Why it matters
- Follow-up / open issues

---

## 2026-05-01 — Remy (Claude local agent)

### Concierge corpus expansion + cron operationalisation

**Summary**
Tripled the effective coverage of the Ask The Insider concierge by extending the refresh pipeline beyond venues + articles to all six structured content collections, plus a new `editorial_blocks/` collection for hub framing copy that previously lived hard-coded in `.astro` pages. Same change institutionalises the daily refresh as a fully owned IT pipeline: relocated the script to a path that survives deploy scrubs, moved the schedule to evening Melbourne, added stale-row pruning with a grace window, added a metadata fingerprint to close the partner-flip / freshness-update gap, and persisted a daily JSON + Markdown report under `reports/concierge-corpus/`.

**Critical recovery**
`scripts/refresh-corpus.mjs` (added 2026-04-29) was being deleted on every deploy because the deploy workflow's preserve list does not include `scripts/`. The cron has been silently failing every night since the file was first added. Fix: relocated to `ops/scripts/refresh-corpus.mjs` (`ops/` is preserved) and updated the workflow to match.

**What the concierge now sees**
- Venues (135), Articles (78) — already chunked, unchanged
- Places (20) — NEW: town and zone framing
- Itineraries (6) — NEW: per-day stop sequences with editorial framing
- Experiences (42) — NEW: walks, beaches, attractions, galleries
- Events (16) — NEW: with auto-prune past 14-day grace
- Editorial blocks (10) — NEW: best-of and hub intros migrated from `.astro` pages

Total: 1,157 chunks from source vs ~600 before. Dry run validated.

**Files created**
- `ops/scripts/refresh-corpus.mjs` — extended refresh script (recovered + 5 new walkers + prune + fingerprint + per-collection report)
- `ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql` — DB migration adding `metadata_fingerprint` and `event_date` columns
- `next/src/content/editorial_blocks/best-restaurants-intro.md`
- `next/src/content/editorial_blocks/best-cellar-doors-intro.md`
- `next/src/content/editorial_blocks/best-walks-intro.md`
- `next/src/content/editorial_blocks/best-accommodation-intro.md`
- `next/src/content/editorial_blocks/long-lunch-intro.md`
- `next/src/content/editorial_blocks/cellar-door-lunch-intro.md`
- `next/src/content/editorial_blocks/hatted-restaurants-intro.md`
- `next/src/content/editorial_blocks/hot-springs-intro.md`
- `next/src/content/editorial_blocks/rainy-day-intro.md`
- `next/src/content/editorial_blocks/day-trips-intro.md`
- `reports/concierge-corpus/README.md`
- `docs/peninsula-insider-concierge-corpus-cron-brief-2026-04-30.md` (handover brief for IT)

**Files modified**
- `next/src/content.config.ts` — registered `editorial_blocks` collection

**Manual follow-up needed (PAT lacks `workflow` scope)**
The proposed workflow update lives at `ops/workflows-pending/refresh-corpus.yml`. To apply: open `.github/workflows/refresh-corpus.yml` on GitHub, replace its contents with the proposed version, commit to main, then delete the pending file. This is the change that moves the schedule to 21:00 Melbourne, points the workflow at `ops/scripts/refresh-corpus.mjs`, expands push triggers to all collections, and adds the daily report-commit step. Until that lands, the cron will keep failing on the missing `scripts/refresh-corpus.mjs` path.

**Why it matters**
The concierge was answering on roughly half the editorial corpus. Reader queries about Sorrento as a place, weekend itineraries, Peninsula walks, and "rainy day" framing all bottomed out against venues only. After this change those queries hit the same editorial sentences a reader would see on the live page, so concierge answers carry the framing context that makes them actually useful. The pipeline is also now fail-loud rather than fail-silent: the daily run produces an auditable artifact, and IT has a runbook.

**Required follow-up before next refresh**
Run the SQL migration at `ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql` against the Supabase project. Idempotent. Can be applied via the Supabase SQL editor or `psql`.

**Optional future**
- Refactor the migrated hub pages to read their intros from the `editorial_blocks` collection instead of duplicating the copy. Currently both render fine; this just removes the duplication.
- Split the Supabase service key into a write-only role for the refresh job and a read-only role for the concierge API.

---

## 2026-04-19 — Remy (subagent)

### New vertical hubs: Weddings, Corporate Events, Walks

**Summary**
Launched three new primary hub pages based on dedicated strategy research docs. Each hub is a publishing-ready editorial navigation surface with strong metadata, FAQ schema, CollectionPage schema, internal linking, and copy that follows the Peninsula Insider tone and editorial approach.

**Files created**
- `next/src/pages/weddings/index.astro`
- `next/src/pages/corporate-events/index.astro`
- `next/src/pages/walks/index.astro`

**Files modified**
- `next/src/pages/sitemap.xml.ts` — added `weddings`, `corporate-events`, `walks` to sitemap section loop (priority 0.9)

**Pages added**
- `/weddings/` — Mornington Peninsula Weddings hub with venue-type nav, by-town intel, planning framework, guest-weekend section, FAQ, and internal links to stay/eat/wine/spa
- `/corporate-events/` — Corporate Retreats & Events hub with format guide (executive retreat through large conference), locality intelligence, programme logic, planning checklist, FAQ
- `/walks/` — Walks hub with editorial walk selector, long/short walk experience grids, walk+experience pairings, specific trail characterisations, audience-specific guidance, practical notes, FAQ

**Why it matters**
All three verticals identified as high-intent, high-commercial-value expansion clusters with clear editorial differentiation opportunity vs competitors. Each hub is built to serve search intent, LLM retrieval, and the PI audience. Internal linking to existing site sections (stay, eat, wine, spa, golf, explore, dog-friendly, places) activates the existing content equity for the new verticals.

**Architecture notes**
- Walks hub integrates with existing `experiences` collection walk entries for ExperienceCard grids
- Weddings and corporate-events hubs filter `articles` by tag for dynamic journal content (tags `weddings`, `wedding-venues`, `corporate`, `retreats`, `offsite` — add these tags to relevant articles when publishing)
- No new content collections needed for Phase 1 hub launch
- Nav: new verticals not added to primary Masthead nav (already 7 items) — discoverable via sitemap, search, and internal links from related sections

**Follow-up / next phase**
- Add `weddings`, `wedding-venues` tags to `mornington-peninsula-wedding-venues.astro` article for dynamic article pull on weddings hub
- Commission Phase 2 content per strategy docs (venue-type sub-pages, locality sub-pages, planning guides)
- Build walk selector as interactive Astro component once walk attribute data schema is populated
- Add hero images for weddings and corporate-events hubs (currently using existing explore/vineyard images)

---

## 2026-04-13 — Remy (Claude Code, local session, continued)

### Town hub expansion (5 towns)
- Sorrento, Red Hill, Flinders, Mornington, Rye: keyword-targeted titles, handcrafted meta descriptions, 3 FAQ Q&As each (15 new structured answers total)
- Other place pages retain generic title template — enhancement is scoped to priority towns

### Internal linking improvements
- VenueCard: place label now links to /places/{slug} (every venue card site-wide)
- ExperienceCard: place label now links to /places/{slug}
- PlaceDetailTemplate: eat, wine, stay sections now link to best-of editorial ranking pages

### What's On mood filter fix
- "Browse by mood" chips (Family Saturday, Rainy Day, Worth The Drive, etc.) linked to #lens-{key} anchors that didn't exist — counts were shown but sections weren't rendered
- Added event sections for each non-empty lens filter with full EventCard grids

### Files changed
- `next/src/pages/places/[slug].astro` — title overrides, description overrides, FAQ schema for 5 towns
- `next/src/components/VenueCard.astro` — place label → clickable link
- `next/src/components/ExperienceCard.astro` — place label → clickable link
- `next/src/components/PlaceDetailTemplate.astro` — best-of ranking links in eat/wine/stay sections
- `next/src/pages/whats-on/index.astro` — lens event sections rendered

### Follow-up
- Build output (`dist/`) has not been copied to live site root — next deploy should sync these
- The mobile-fixes, newsletter-enhance, and scroll-animations CSS/JS are only in the built output, not in the Astro build pipeline yet
- Consider adding FAQ schema to remaining town pages as they become priority

---

## 2026-04-13 — Remy (Claude Code, local session)

### Summary
SERP snippet optimisation pass + domain correction + GA tag + mobile UX fixes + scroll animations + newsletter UX.

### SEO: Domain correction (critical)
- Fixed `peninsularinsider.com.au` → `peninsulainsider.com.au` across 613 built HTML files + 27 Astro source files
- All canonical URLs, OG tags, schema breadcrumbs, and article URLs were pointing to a non-existent domain
- Sitemap corrected and accepted by Google Search Console

### SEO: Homepage rewrite
- Title: "Peninsula Insider — The Mornington Peninsula, as insiders know it" → "Mornington Peninsula Guide 2026 — Best Restaurants, Wineries & Things to Do | Peninsula Insider"
- Description rewritten with target keywords + freshness signal
- Added FAQPage schema (3 Qs: what MP is known for, distance from Melbourne, best time to visit)

### SEO: FAQ schema added to 4 pages
- `/explore/best-walks` — best walk, easy walks, coastal walking
- `/stay/best-accommodation` — best place to stay, cost, Sorrento vs Red Hill
- `/journal/mornington-peninsula-in-autumn` — autumn visit, what to do, swimming
- `/journal/dog-friendly-mornington-peninsula` — dogs on beaches, cafes, staying with dogs

### GA tag: `G-0MR9YVZ9NW` → `G-DBL14DE975` (all pages + BaseLayout.astro)

### UX: Mobile hamburger menu
- `backdrop-filter` on `.masthead` trapped `position:fixed` mobile nav — moved nav outside `<header>` in DOM
- Created `_astro/mobile-fixes.css`: `overflow-x:clip` on html, fixed header on mobile, overflow containment

### UX: Newsletter subscribe
- Replaced Beehiiv iframe with native form + SVG checkmark confirmation animation
- `_astro/newsletter-enhance.js` + `.css` — auto-upgrades all embeds, graceful iframe fallback

### UX: Scroll animations
- `_astro/scroll-animations.js` + `.css` — Intersection Observer reveals, staggered cards, hero parallax
- `prefers-reduced-motion` fully respected

### Files changed
- `next/src/layouts/BaseLayout.astro`, `next/src/pages/index.astro`, `next/src/pages/explore/best-walks.astro`, `next/src/pages/stay/best-accommodation.astro`, `next/src/pages/journal/mornington-peninsula-in-autumn.astro`, `next/src/pages/journal/dog-friendly-mornington-peninsula.astro`, 27 source files (domain), 600+ built HTML files

### Follow-up
- Town hub pages need FAQ schema + stronger intros (Sorrento, Red Hill, Flinders, Mornington, Rye)
- Internal linking pass: venue↔town, best-of↔venue, journal↔places
- Integrate mobile-fixes, newsletter-enhance, scroll-animations into Astro build pipeline
- Copy `dist/` output to live site root to sync source and deployed output

---

## 2026-04-13 — Remy
### Summary
Created a formal handover brief for a local Claude agent and established a systematic changelog requirement for all future work on Peninsula Insider.

### Files changed
- `HANDOVER-CLAUDE.md`
- `CHANGELOG.md`

### Why it matters
This creates continuity across multiple agents and makes SEO, structural, and content work traceable over time.

### Follow-up
- Ensure all future site work updates this changelog
- Mirror meaningful work notes into the knowledge vault

## 2026-04-12 — Remy
### Summary
Completed the major SEO foundation pass across the Astro rebuild: metadata, schema, sitemap, crawl/index improvements, best-of pages, practical pages, and site-index support. Kept the site static, repaired broken local dependency state, and removed the active Resend newsletter path in favour of Beehiiv.

### Files changed
Representative core files:
- `next/src/layouts/BaseLayout.astro`
- `next/src/pages/sitemap.xml.ts`
- `next/src/pages/site-index.astro`
- `next/src/pages/eat/best-restaurants.astro`
- `next/src/pages/wine/best-cellar-doors.astro`
- `next/src/pages/explore/best-walks.astro`
- `next/src/pages/stay/best-accommodation.astro`
- `next/src/pages/journal/mornington-peninsula-day-trip.astro`
- `next/src/pages/journal/mornington-peninsula-in-autumn.astro`
- `next/src/pages/journal/mornington-peninsula-with-kids.astro`
- `next/src/pages/journal/dog-friendly-mornington-peninsula.astro`
- `robots.txt`
- `next/package.json`
- `next/src/pages/api/subscribe.ts`

### Pages affected
- homepage
- section hubs
- venue pages
- place pages
- journal pages
- event pages
- new best-of pages
- new practical and seasonal pages
- sitemap and site index

### Why it matters
This materially improved crawlability, canonical clarity, structured data coverage, and search-intent surface area.

### Follow-up
- do a SERP snippet optimisation pass for top pages
- deepen town hubs
- strengthen internal linking architecture
- fully standardise Beehiiv-only newsletter handling
