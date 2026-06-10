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

## 2026-06-10 — Claude (remote session)

### Insider concierge: Phase 0 latency work — DB migration applied, keep-alive + latency alerting added

**Summary**
First implementation pass on the tech-stack review (`docs/insider-tech-stack-review-2026-06-10.md`). Applied the two pending `concierge_chunks` migrations to the live concierge Supabase project (`mvdtkgsfuhmkioygxgge`): `metadata_fingerprint` + `event_date` columns, HNSW embedding index, filter/chunk-purpose/extracted-at btrees. The pre-existing GIN tsvector index was kept (migration statement skipped) and the now-redundant IVFFlat embedding index was dropped. Added two new scheduled workflows: an API keep-alive ping (cold starts dominate TTFT at current traffic) and an hourly latency guard that posts a Telegram alert when latency breaches thresholds — the June 2 model-drift regression (34–46s queries on gpt-5-nano) went unnoticed for a week under daily-only reporting.

**Files changed**
- `ops/migrations/2026-04-30-concierge-chunks-fingerprint-and-event-date.sql` (marked applied)
- `ops/migrations/2026-05-03-concierge-chunks-perf-indexes.sql` (marked applied, deviations noted)
- `.github/workflows/insider-keepalive.yml` (new)
- `.github/workflows/insider-latency-alert.yml` (new)
- `ops/scripts/insider-latency-alert.mjs` (new)
- `docs/insider-tech-stack-review-2026-06-10.md` (new, separate commit)

**Pages affected**
- None (ops/API-side only)

**Why it matters**
Removes ~50–150ms from retrieval, unblocks metadata-only corpus diffs and event-date filtering, keeps the Vercel function warm so readers stop paying cold-start latency, and turns latency regressions into same-hour Telegram alerts instead of next-week discoveries.

**Follow-up / open issues**
- **P0.1 (critical, not possible from this repo): revert the generation model off `gpt-5-nano`** in the `peninsula-insider-platform` Vercel project — live TTFT is ~45s on that model.
- P0.2: pin the Vercel function region to `syd1` (platform repo).
- Replace the Actions keep-alive with a native Vercel Cron in the platform repo, then delete `insider-keepalive.yml`.
- Latency-alert script dry-run requires repo secrets; verify first scheduled run in Actions.

## 2026-06-10 — Claude (design)

### Masthead icon overlap fix + count/verified tag removal

**Summary**
Two fixes from James's live-site review:

1. **Mobile masthead overlap** — the saved and search icons stacked on top of each other: the mobile brand row's `display: contents` rule placed every `.v4-iconbtn` in the same 44px grid cell. The action cluster is now a single flex grid item, side cells widened to a symmetric 84px so the wordmark stays truly centred, and the wordmark scales via `clamp(21px, 6vw, 33px)` to fit the narrower middle.
2. **Inventory counts + "Last verified" stamps removed site-wide** — hero eyebrows on 13 section/guide pages (eat, stay, wine, explore, escape, what's-on, golf, beaches, markets + v4 variants) reduced to the section name; dynamic count items removed from GuideHero meta rows (read-times and editorial facts like "3 world-ranked" kept); "Last verified:" sub-lines removed from the three tour detail templates. Kept: the fishing species "Verified stamp" block (regulatory disclaimer citing the Victorian Fisheries Authority) and preview/staging pages.

**Files changed**
- `next/src/styles/v4.css`
- `next/src/components/GuideHero.astro` (doc comment)
- 13 section index pages + 3 tour templates under `next/src/pages/`

**Why it matters**
The icon overlap was a visible bug on every mobile page. The count/verified tags ("41 wineries · 6 other producers · Last verified 30 Apr 2026", "0 producers") were reader-facing database noise; verification methodology lives at /methodology.

**Verification**
- `npm run build` passes (1485 pages); built eat/stay/wine/explore pages contain no count or verified strings.

### Hero pager polish (post-deploy fix)

**Summary**
The story-switcher bars shipped earlier today read as stray dashes on mobile (full-width 2px lines, left-aligned, stranded between two hairline borders). Reworked as a conventional carousel pager: fixed-width 4px rounded segments, centred under the hero, with a visible focus ring. Removed the doubled hairline where the cover's border-bottom met the section-nav's border-top.

**Files changed**
- `next/src/pages/index.astro`

**Pages affected**
- `/` (homepage)

**Verification**
- `npm run build` passes (1485 pages); 5 pager segments in built homepage.

### Homepage top-section simplification (cognitive-load pass)

**Summary**
Reviewed by James against mobile screenshots: the first four viewports routed the same three intents repeatedly (Ask ×3, weekend ×4, plans ×3), each repeat with its own eyebrow/heading/microcopy. Changes:

- **Removed `ThreeMissionBar`** from the homepage — its Ask panel duplicated the floating Ask button, its This Weekend panel duplicated the Weekend Dispatch card (and listed long-running events like "1 April – 30 June" under a "This Weekend" heading), and its Plans panel duplicated the `hp-plans` grid below.
- **Removed `MelbourneEntryStrip`** — its single link now lives as a quiet line inside the Weekend Dispatch card ("Coming from Melbourne? Here's where to start →").
- **Removed the Ask chip** from `hp-section-nav` (the floating Ask button is the one Ask surface).
- **`WeekendPickerBlock` simplified** — dropped the eyebrow + cadence label column ("Peninsula This Weekend" / "Published for the weekend ahead · one pick, one backup…"), which repeated the kicker and the dispatch title. Now: one date kicker, title, dek, two CTAs, Melbourne line. Single-column card (also renders on `/v4/whats-on/`).
- **Hero story-switcher** — replaced the uppercase label tabs ("SLOW PENINSULA / FEATURE / WALK"), which read as content filters, with quiet equal-width progress bars; accessible names now carry "Story n of 5: {headline}".

Net effect on mobile: hero → section chips → one weekend card → editorial content. Background rhythm now alternates white/cream naturally (the big cream routing zone is gone).

**Files changed**
- `next/src/pages/index.astro`
- `next/src/components/WeekendPickerBlock.astro`
- `next/src/styles/global.css`

**Pages affected**
- `/` (homepage), `/v4/whats-on/` (shared weekend block)

**Why it matters**
Cuts ~3 viewports of duplicated routing to one; every intent now has exactly one surface above the fold.

**Verification**
- `npm run build` passes (1485 pages). TMB/strip markup confirmed absent from built homepage; Melbourne link present in weekend card on both consumers; 5 story-nav buttons with descriptive aria-labels.

**Follow-up**
- `ThreeMissionBar.astro` and `MelbourneEntryStrip.astro` are now only used by `/preview-home-redesign/`; retire with that preview when it goes.
- CMS text fields `weekend.eyebrow` / `weekend.cadence` no longer have a rendering surface.

### Mobile/site-wide readability + reader-utility pass

**Summary**
Readability and accessibility upgrade requested by James (benchmarked against The Age Good Food mobile experience), plus three reader-utility features:

1. **Typography weight/size** — body text `0.95rem`/weight 300 → `1rem`/weight 400; `.prose` to `1.0625rem`/400; cover/section-hero deks, place-detail intro, and newsletter input from 300 → 400. The light 300 weight was the main cause of low-contrast "grey" reading texture.
2. **Contrast tokens** — `--soft` darkened `#7A726A` → `#5F574E` (4.7:1 → 7.1:1 on white; was failing AA on `--bg-alt`). New `--gold-text: #7A6340` token for gold-as-text on light surfaces (`--gold` is 2.7:1, decorative only); applied to editors-desk label and share-button copied state.
3. **Italic cull** — 15 multi-line body-copy italic rules (article/news/home/guide deks, shortlist/insider-stripe/event-verdict bodies, prose blockquote, standfirsts) converted to roman, Cormorant blocks bumped to weight 500. Italics retained for display headline `em` accents, brand taglines, signatures, and semantic `.prose em`.
4. **Browser font-size preference respected** — `html { font-size: 16px }` → `100%`.
5. **Three-step text-size control (A/A/A)** — new `TextScaleControl.astro` in the `PiArticleActions` byline row (journal articles, weekend pages, venue detail). Sets `data-text-scale` on `<html>` (steps map to 108.75% / 118% root size), persists in localStorage, re-applied pre-paint by an inline BaseLayout script.
6. **Saved shortcut in masthead** — bookmark icon (`v4-iconbtn`) next to search in both V4 masthead action clusters (desktop + mobile), linking to `/saved/`.
7. **Google preferred-source button** — footer contact column, deeplink `https://google.com/preferences/source?q=peninsularinsider.com.au` per Google Search Central guidance.

**Files changed**
- `next/src/styles/global.css`
- `next/src/components/TextScaleControl.astro` (new)
- `next/src/components/PiArticleActions.astro`
- `next/src/components/v4/V4Masthead.astro`
- `next/src/components/Footer.astro`
- `next/src/layouts/BaseLayout.astro`

**Pages affected**
Site-wide.

**Why it matters**
Body text was the single biggest readability complaint (weight-300 Outfit at 15.2px reads grey, especially on mobile). Secondary text was failing WCAG AA on cream sections. Multi-line Cormorant italic deks were hard to read at small sizes. The control and buttons match reader-utility patterns from major mastheads.

**Verification**
- `npm run build` passes (1485 pages); new rules confirmed in bundled output, which cascades after the legacy `/assets/styles.css`.

**Follow-up**
- `public/assets/styles.css` is a stale pre-Astro copy still linked first in `BaseLayout` — consider retiring it; it currently re-states the old typography (overridden by cascade order, but a drift risk).
- Verify the site appears in Google's source-preferences tool for AU users (feature is region-gated).
- Backlog: `--text-*` font-size token scale (70+ distinct sizes, tail below 12px).

### Card radius tokens (design review 2026-W22)

**Summary**
Implemented the 2026-W22 design review recommendation: added `--radius-card-sm/md/lg` tokens to `:root` and collapsed the nine bespoke card `border-radius` values in `global.css` onto them (Weekend Picker, CompareBlock columns, newsletter frames/embed, place-typeahead grid, stay card panel).

One deviation from the memo: `.newsletter__embed` at desktop (was `0.9rem`) maps to `--radius-card-sm`, not `md` as the memo listed — it is the same nested embed slot the memo maps to `sm` at mobile, and `sm` is the closest token (0.8px shift vs 5.6px).

**Files changed**
- `next/src/styles/global.css`

**Pages affected**
- Site-wide (any page using Weekend Picker, CompareBlock, newsletter blocks, typeahead grid)

**Why it matters**
Removes radius drift across visually-peer card surfaces and makes future radius changes one-line edits. Visual shifts are 1–4px on three surfaces (newsletter frames 1.35→1.5rem, mobile form-frame 1.05→1.25rem).

**Verification**
- `npm run build` passes (1485 pages).

**Follow-up**
- Backlog from the same memo: `--shadow-*` tokens (17 distinct values), a `--text-*` font-size scale (70+ values), and 30+ ad-hoc hex colours outside `:root`.

## 2026-06-01 — Codex

### Footer advertising link removed

**Summary**
Removed the `Advertise` link to `/partners/advertising-kit/` from the global footer's "Work with Us" link list.

**Files changed**
- `next/src/components/Footer.astro`

**Pages affected**
- Site-wide footer

**Why it matters**
The public footer no longer promotes the advertising kit route.

**Verification**
- `npm run build` passes.
- Generated `next/dist/**/*.html` contains no `/partners/advertising-kit/` footer link and no `>Advertise<` footer label.

### Region hero image references repaired

**Summary**
Investigated the disappearing hero on `/explore/regions/red-hill-wine-country/`. The region data referenced `/images/sourced/region-red-hill-01.webp`, but that file was not present in `next/public/images/sourced/` or the deployed root. The same missing `region-*.webp` pattern affected all five region pages. Repointed region hero images to existing source assets and added a build-time lint for region hero asset existence.

**Files changed**
- `next/src/content/regions/red-hill-wine-country.json`
- `next/src/content/regions/mornington-bay-coast.json`
- `next/src/content/regions/ocean-coast.json`
- `next/src/content/regions/peninsula-tip.json`
- `next/src/content/regions/western-port.json`
- `next/scripts/lint-region-images.mjs`
- `next/package.json`

**Pages affected**
- `/explore/regions/red-hill-wine-country/`
- `/explore/regions/mornington-bay-coast/`
- `/explore/regions/ocean-coast/`
- `/explore/regions/peninsula-tip/`
- `/explore/regions/western-port/`

**Why it matters**
The page could appear correct while a browser still had the old asset cached, then lose the hero on refresh when the browser requested the missing file again. The new lint stops region pages from shipping with missing hero assets.

**Verification**
- `npm run lint:region-images` passes.
- `npm run build` passes.

**Follow-up**
- Replace the fallback region hero choices with dedicated region photography when final assets are ready.

## 2026-05-05 — Remy (mobile app — Sprint 0 paperwork pack)

### Summary
Kicked off the Peninsula Insider iOS app project. Locked the stack (Expo SDK 53 + Supabase + EAS Build + Sign in with Apple + Apple Wallet for Pass), reframed the April pocket-concierge thesis from "PWA-first / Capacitor-later" to "Expo native first" based on 2026 vibe-coding research, and produced the Sprint 0 Apple paperwork checklist. Sprint 1 handover doc is queued to execute as soon as Apple Developer enrolment lands.

### Files changed
- `docs/mobile-app/README.md` (new) — workspace overview and strategic shift note
- `docs/mobile-app/decisions-2026-05-05.md` (new) — locked decisions + 2 awaiting James (enrolment type, repo layout)
- `docs/mobile-app/sprint-0-apple-paperwork-2026-05-05.md` (new) — step-by-step Apple Developer Program / App Store Connect / APNs / API Key checklist
- `docs/mobile-app/sprint-1-handover-2026-05-05.md` (new) — day-by-day TestFlight plan + IAP decision tree for Insider Pass

### Pages affected
None — docs-only. Site build is unaffected.

### Why it matters
The April thesis treated the app as a future R&D bet. Conditions in 2026 (Claude Code's Expo proficiency, EAS auto-credentials, Apple's stable native review path, the existing Supabase + `/ask` + saves backend) make the iOS app a near-term ship rather than an experiment. Sprint 0 is the gating paperwork; Sprint 1 reaches TestFlight in 5 working days once Apple enrolment is approved.

### Follow-up
- James: confirm enrolment type (Individual recommended for speed) and repo layout (monorepo recommended) — both flagged in `decisions-2026-05-05.md`
- James: run the Sprint 0 checklist; populate `~/.apple-keys/peninsula-insider.env`
- Remy (next session): execute Sprint 1 day-by-day plan once preconditions are met

---

## 2026-05-04 — Claude (SEO experiment 2026-05-04-01)

### CTR snippet rewrite on dog-friendly journal page

**Summary**
Rewrote title and meta description for the dog-friendly Mornington Peninsula journal page, which has 455 combined impressions across slash variants in the last 28 days but earns 0 clicks despite ranking position 1-10 across 13 dog-related queries. Removed em-dash punctuation (project rule violation), added 2026 freshness signal, front-loaded specific value props.

**Files changed**
- `next/src/pages/journal/dog-friendly-mornington-peninsula.astro` — `BaseLayout` `title` and `description` props, plus matching `articleSchema.description`.

**Pages affected**
`/journal/dog-friendly-mornington-peninsula/` (single page).

**Before**
- Title: "Dog-Friendly Guide to the Mornington Peninsula · Peninsula Insider"
- Meta: "The complete dog-friendly guide to the Mornington Peninsula — off-leash beaches at Rye and Blairgowrie, cafés that actually welcome dogs, where to stay, and what to avoid." (em-dash)

**After**
- Title: "Dog-Friendly Mornington Peninsula 2026: Beaches, Cafés & Stays" (62 chars)
- Meta: "Off-leash beaches at Rye and Blairgowrie, cafés that welcome dogs, dog-friendly stays, and seasonal beach rules. The Peninsula's honest 2026 dog guide." (151 chars)

**Why it matters**
0% CTR across 455 impressions at page-1 positions is structurally low — strong signal the snippet is failing to win clicks. The dog-friendly cluster is the dominant demand signal for this site (5 of top 10 queries by impressions are dog-related). Even modest CTR uplift (0% → 1.5%) on this page = 7+ clicks/month and would validate the snippet-rewrite playbook for the next batch of high-impression / zero-click pages (chardonnay-case, pub-guide, ashcombe-maze, etc.).

**Verification**
Local build: 1027 pages built in 16.46s, no errors. New title and meta confirmed in `dist/journal/dog-friendly-mornington-peninsula/index.html`.

**Hypothesis (logged in `ops/reports/seo/experiments.md` as 2026-05-04-01)**
By 2026-05-18 (14d post-deploy), this page earns ≥3 clicks per 7-day window with similar impression volume.

**Side note: experiment 2026-05-01-01 outcome**
Place page canonical fix shipped 2026-05-01 (PR #16) had the following result: priority URL indexed count went 2/14 → 14/14 by 2026-05-04 (full sweep). Hypothesis was 7/14 by 2026-05-16; achieved 14/14 12 days early. Moved to "Completed" with full writeup in `experiments.md`.

**Follow-up**
- After auto-deploy: James to submit `/journal/dog-friendly-mornington-peninsula/` (and no-slash variant) for reindex in GSC.
- Re-pull GSC daily; measure on 2026-05-11 (7d) and 2026-05-18 (14d).

---

## 2026-05-01 — Remy (James-approved Peninsula Insider review pack shipped live)

### Summary
Pushed the approved Peninsula Insider trust, commercial, chatbot, cadence, and AI-discoverability updates from `next/` into the live publish root. This included cadence-neutral newsletter/footer/masthead language, team-led About and partner positioning, enquiry-first commercial copy, the footer trust/disclosure block, the new concierge opening and planning prompts, and the first article template uplift for AI extraction.

### Files changed
- `next/src/components/Footer.astro`
- `next/src/components/InsiderStripe.astro`
- `next/src/components/Masthead.astro`
- `next/src/components/NewsletterBlock.astro`
- `next/src/components/UtilityBar.astro`
- `next/src/components/WeekendPickerBlock.astro`
- `next/src/components/ConciergeDrawer.astro`
- `next/src/components/v2/Colophon.astro`
- `next/src/components/v2/NewsletterBlock.astro`
- `next/src/components/v2/UtilityBar.astro`
- `next/src/pages/about.astro`
- `next/src/pages/index.astro`
- `next/src/pages/partners/index.astro`
- `next/src/pages/partners/apply.astro`
- `next/src/pages/partners/advertising-kit/index.astro`
- `next/src/pages/partners/founders-prospectus/index.astro`
- `next/src/content.config.ts`
- `next/src/pages/journal/[slug].astro`
- `next/src/content/articles/how-to-build-a-red-hill-saturday.md`
- `next/src/content/articles/best-wineries-red-hill.md`
- plus regenerated live root HTML/CSS/search artifacts via `./build-live.sh`

### Pages affected
- homepage
- /about/
- /partners/
- /partners/apply/
- /partners/advertising-kit/
- /partners/founders-prospectus/
- newsletter/footer/chrome across site
- /journal/how-to-build-a-red-hill-saturday/

### Why it matters
This closes the gap between approved source changes and the public site. The live experience now better protects trust, reduces brittle dated promises, positions commercial offers more credibly, makes the concierge start from planning intent, and gives at least one public article the new summary + FAQ structure intended for AI extraction and citation.

### Follow-up
- Complete the pricing/disclaimer pass across remaining editorial business/tour pages
- Verify all Instagram/profile references point to `@peninsula_insider`
- Roll the summary/FAQ/query-title pattern onto 3–5 more priority planning pages

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

## 2026-05-01 — Claude (SEO experiment 2026-05-01-01)

### Removed duplicate broken `<link rel="canonical">` from all place pages

**Summary**
Every page under `/places/*` was emitting **two `<link rel="canonical">` tags** in `<head>`, the second pointing to a non-existent URL `/places/undefined`. Plus duplicate `<title>`, meta description, og: tags, and JSON-LD. Removed the offending block.

**Files changed**
- `next/src/components/PlaceDetailTemplate.astro` — deleted the entire `<Fragment slot="head">` block (lines 79-88) and the unused locals that fed it (`canonical`, `placeTitle`, `placeDescription`, `ogImage`, `placeSchema` — lines 62-77). Replaced with a comment explaining why.

**Pages affected**
All 20 pages under `/places/*`: sorrento, red-hill, flinders, mornington, rye, portsea, main-ridge, dromana, mount-martha, cape-schanck, balnarring, merricks, point-nepean, plus 7 others.

**Why it matters**
The duplicate template-emitted canonical built `https://peninsulainsider.com.au/places/${place.slug}`, but `place.slug` is undefined in Astro's content-collection API (the correct property is `place.id`). So every place page sent Google a `<link rel="canonical" href=".../places/undefined">` pointing to a 404. Combined with the correct canonical from BaseLayout (which `places/[slug].astro` passes correctly), Google saw conflicting signals and was reluctant to index the pages — three priority place URLs were stuck on "Alternate page with proper canonical tag" status. The parent page (`places/[slug].astro`) already passes correct title/description/canonical/ogImage to BaseLayout and emits its own JSON-LD, so the entire template-side head block was redundant duplication.

**Verification**
- Ran `npm run build` — 955 pages built in 19.56s, no errors.
- Spot-checked `dist/places/{red-hill,sorrento,flinders}/index.html`: each now has exactly one `<link rel="canonical">` pointing to the correct trailing-slash URL, exactly one `<title>` tag.

**Hypothesis (logged in `ops/reports/seo/experiments.md` as 2026-05-01-01)**
By 2026-05-16 (14d post-deploy), priority URL indexed count rises from 2/14 to ≥7/14.

**Follow-up**
- After auto-deploy completes: James to enable "Enforce HTTPS" in GitHub Pages settings (separate finding from this PR — `http://` URLs are currently served 200 OK, not redirected).
- After auto-deploy completes: James to submit 20 priority URLs for manual reindexing in GSC URL Inspection (full list in `ops/reports/seo/daily-log.md`).
- Re-pull GSC daily; measure indexation movement on 2026-05-09 (7d) and 2026-05-16 (14d).

---

## 2026-05-01 — Claude (SEO ownership setup)

### SEO ops infrastructure: GSC API automation + daily review cycle

**Summary**
Stood up a sustained, daily-cycle SEO operation owned by Claude. Automated Google Search Console API pulls, persistent tracking documents, baseline snapshot, and the first dated experiment queued for shipping tomorrow.

**Files created**
- `ops/scripts/seo/auth.mjs` — one-time OAuth bootstrap for the GSC API (loopback flow, saves refresh token to `ops/tokens/gsc-token.json`)
- `ops/scripts/seo/pull.mjs` — daily pull: 28d/7d performance, top 100 queries+pages, daily trend, devices, countries, URL inspection for 14 priority URLs. Saves raw JSON to `ops/data/seo/YYYY-MM-DD.json` and appends a markdown digest to `ops/reports/seo/daily-log.md`
- `ops/scripts/seo/config.mjs` — paths and `PRIORITY_URLS` list
- `ops/scripts/seo/package.json` + `package-lock.json` — `googleapis` dep, scoped to this folder
- `ops/scripts/seo/README.md` — script usage
- `ops/reports/seo/baseline.md` — frozen 2026-05-01 reference; never edit
- `ops/reports/seo/daily-log.md` — append-only journal, the doc reviewed every morning
- `ops/reports/seo/experiments.md` — hypothesis-driven change log
- `ops/reports/seo/backlog.md` — prioritised next actions
- `ops/reports/seo/README.md` — operating cycle documentation

**Pages affected**
None directly. Infrastructure only.

**Why it matters**
Site is at 11.2% indexation rate (39/349 URLs) on a new domain. Sustained daily diagnose→ship→measure beats sporadic audits. Pulling from the GSC API means we can compare day-on-day movement and attribute changes to specific actions, instead of waiting for manual exports.

**First findings from baseline pull (logged in `baseline.md`)**
- Trajectory positive: clicks 2→8 WoW, impressions 539→1,009 WoW, but only 2 of 14 priority URLs are indexed
- Critical bug discovered: every `/places/*` page emits a duplicate broken `<link rel="canonical" href=".../places/undefined">` due to `next/src/components/PlaceDetailTemplate.astro:62` reading `place.slug` (undefined) instead of `place.id`. Logged as experiment `2026-05-02-01` for tomorrow's first PR.
- Stale GSC crawl data on 3 priority URLs (current HTML is correct; manual reindex requests recommended)
- Dog-friendly content cluster is the dominant demand signal (5 of top 10 query impressions)

**Follow-up**
- Tomorrow (2026-05-02): ship experiment 2026-05-02-01 (canonical fix) as the first SEO PR under the new cycle
- Submit `/stay/best-accommodation/`, `/journal/dog-friendly-mornington-peninsula/`, `/places/red-hill/` for manual reindex via GSC URL Inspection
- Diagnose `http://` vs `https://` indexation observed in top-pages report

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
