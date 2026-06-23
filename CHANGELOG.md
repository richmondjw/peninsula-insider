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

## 2026-06-23 — Claude (ops)

### Reinstate the temporary "Coming Soon" password gate

**Summary**
James asked to bring back the sign-up / "Something good is coming to the Peninsula" gate that was removed in PR #249. Restored the gate exactly as it was: a client-side `pi-access-v1` localStorage check that redirects every page to `/access/`, where visitors either enter the password (`peninsula`) or join the newsletter waitlist. Applied to both the Astro source (so future rebuilds keep it) and the already-deployed tree (so it's live now without a full rebuild that would roll event dates).

**Files changed**
- `next/src/layouts/BaseLayout.astro` — re-added the redirect script before `</head>`
- `next/src/pages/access/index.astro` — restored the Coming Soon / password page
- `access/index.html` — recreated in the deployed tree
- 1,455 deployed `*.html` pages — redirect snippet injected before `</head>`

**Pages affected**
Whole public site (redirects to `/access/` until unlocked).

**Why it matters**
Puts the site back behind the holding page while pre-launch work continues, and keeps capturing waitlist sign-ups.

**Follow-up / open issues**
- Remove again (reverse of PR #249) when ready to go fully public.
- 26 meta-refresh redirect stubs and the v2-staging design-system stub were left ungated; they forward to canonical pages that are gated.

---

## 2026-06-11 — Claude (design)

### Sitewide responsive audit — mobile overflow fixes

**Summary**
James reported clipped content on /stay/hotel-sorrento/ (mobile). Audited all 1,483 built pages headlessly at 390px with a clipped-text detector (text protruding past non-scrollable clip boundaries). One bug family dominated: **grid `1fr` tracks whose min-content floor lets unbreakable content blow the column past the viewport**, plus separator runs rendered with no whitespace (one giant unbreakable "word").

Fixes:
- **Venue detail pages (~600 pages)** — "Filed under" and "Known for" tag runs rendered `·` separators with no surrounding whitespace; the unbreakable run forced the mobile grid track to 477px and the page clipped. Separators now include real spaces; `.venue-detail__grid` mobile collapse hardened to `minmax(0, 1fr)`.
- **Cookie banner (every page)** — `1fr auto` grid let the nowrap mobile body force the banner to 498px, defeating its one-line ellipsis. Now `minmax(0, 1fr) auto`.
- **`.letter__frame`** mobile collapses (two breakpoints) hardened to `minmax(0, 1fr)` — same family, defensive.
- **Partner print sheets** (/partners/founders-prospectus/, /partners/advertising-kit/) — A4 sheets (794px) clipped on phones. PrintLayout screen-preview now zooms sheets to viewport width ≤830px with a hidden-scrollbar pan fallback. Print output unaffected.

**Out of scope**: remaining flags are all under /v2-staging/ (noindexed design sandbox, 71 prototype pages).

**Verification**
Final full sweep at 390px: zero clipped-text flags on production pages. Hotel Sorrento, Montalto, Rare Hare, region explorers, homepage rails, plans all verified; cookie banner exactly 390px with intended one-line truncation; partner sheets scale (zoom 0.48). `npm run build` passes (1484 pages, surface-hardening audit green).

**Files changed**
- `next/src/components/VenueDetailTemplate.astro`
- `next/src/components/CookieBanner.astro`
- `next/src/layouts/PrintLayout.astro`
- `next/src/styles/global.css`



### /journal/peninsula-hot-springs-vs-alba/ — modular redesign of the top SEO page

**Summary**
Converted the top-ranking article from plain markdown to MDX with reusable comparison modules, per James's brief (visual + modular + copy):

- **`VsVerdictDuo`** (new) — "The quick answer" as two verdict panels: linked venue, one-line stance, booking conditions.
- **`CompareBlock`** (reused — it was designed for this exact page) — the at-a-glance markdown table becomes two definition-list columns; `heading` prop made optional so the article's own H2 carries the anchor/SEO. Prose-scoped styles let it sit flush in the 680px column.
- **`VsScenarios`** (new) — the seven "which one for which day" H3 blocks become quoted scenario cards with accent verdicts and supporting notes.
- **`ArticleJumpNav`** (new) — "On this page" anchor chips after the intro (six sections, auto-generated heading slugs).
- **Photography** — Alba section gains its real photo (`spa-alba-thermal-springs-01`); hero already carries PHS Hilltop. No second PHS body image — the only other spa assets are unattributed and mislabeling venue photography isn't worth it.
- **Copy fix** — body said Alba has "thirty-one" pools while the table/FAQ say 22; now "twenty-two" everywhere.
- FAQ accordion + FAQPage schema and clusterLinks were already rendered by the journal template — untouched.

All three new components are generic for future vs-articles (Bay vs Ocean, Red Hill vs Sorrento etc.).

**Files changed**
- `next/src/content/articles/peninsula-hot-springs-vs-alba.mdx` (was .md)
- `next/src/components/VsVerdictDuo.astro`, `VsScenarios.astro`, `ArticleJumpNav.astro` (new)
- `next/src/components/CompareBlock.astro` (heading optional)
- `next/src/styles/global.css` (prose-embedded CompareBlock + article-figure styles)

**Verification**
Headless Chromium at 390px: 6 jump chips with all anchors resolving, 2 verdict cards, 2 compare columns, 7 scenario cards, figure rendered, 3 FAQ items, no horizontal overflow, no page errors, contradiction gone. `check-editable-coverage` passes. `npm run build` passes (1484 pages).

### Masthead: wordmark +20%, burger uniform with icons

**Summary**
Mobile wordmark scaled up ~20% (`clamp(19px, 6vw, 29px)`); the burger button is now 34×34 with 18px bars, matching the search/map/saved icon buttons. The edition stamp threshold moved to ≥460px so the larger wordmark keeps clear of it. Verified at 7 widths (320–760px): no clipping, no overlaps, burger and icons identical size.

**Files changed**
- `next/src/styles/v4.css`



### Password gate removed

**Summary**
Removed the temporary password gate: the localStorage redirect script (`pi-access-v1` → `/access/`) in `BaseLayout.astro` and the `/access/` Coming Soon page itself. The site is fully public; first-time visitors land directly on content.

**Files changed**
- `next/src/layouts/BaseLayout.astro`
- `next/src/pages/access/index.astro` (deleted)

**Verification**
- `npm run build` passes (1484 pages — one fewer with /access/ gone); no `pi-access-v1` references in built output.

### Hero: 90% desktop / 75% mobile + refined text scrim

**Summary**
Hero height is now ratio-tokened (`--cover-ratio`): 0.9 on desktop, 0.75 on mobile. The scrim gains a second layer — a soft radial pool anchored bottom-left directly behind the text column (peaks at 0.42 warm-black, fades out by 66%), over the slightly deepened vertical gradient — so headlines and deks read cleanly on bright images while the photo's centre keeps its brightness.

**Verification**
Headless Chromium: slide occupies exactly 90% of available height at 1280×900 and 75% at 390×844; overlay and controls inside the slide. Screenshots shared. `npm run build` passes (1485 pages).

**Files changed**
- `next/src/pages/index.astro`

### Hero at 75% height; /map/ mobile is map-only

**Summary**
1. **Homepage hero** now takes 75% of the viewport below the masthead (was 100%) — the next section peeks above the fold as a scroll affordance. Verified at exactly 75% on 390×844 and 1280×900 with overlay and controls still inside the slide.
2. **/map/ on mobile** hides the entries list and the List/Map tab bar — the map is the single mobile view and Leaflet initialises through the existing lazy path. Desktop keeps the side-by-side list + map. Tab markup and controller retained for an easy revert.

**Files changed**
- `next/src/pages/index.astro`
- `next/src/pages/map.astro`
- `next/src/styles/global.css`

**Verification**
Headless Chromium: hero 75% at both form factors; map page at 390px shows map only (no list/tabs), at 1280px list renders beside the map. `npm run build` passes (1485 pages).

### Three live-site fixes: mobile ribbon leak, map pins, hero slider stale images

**1. Desktop pillar ribbon leaking onto mobile (regression, mine).** The Phase-1 v4.css rewrite replaced the wrong `@media (max-width: 760px)` block and dropped `.v4-masthead-nav { display: none; }` — the desktop pillar nav then rendered (wrapped, squished) on phones, which also inflated the sticky masthead and made the /map/ heading appear clipped under the sticky breadcrumb. Rule restored; verified hidden ≤760px and visible ≥765px at six widths.

**2. /map/ pins never rendering after client-side navigation.** The map controller waited for `L` (Leaflet) but not for `L.markerClusterGroup`. Under Astro's ClientRouter, re-injected CDN scripts execute async, so Leaflet could land while markercluster was still in flight — the map initialised (tiles visible) and then threw at `markerClusterGroup`, leaving zero pins. Now waits for both (up to ~8s) and degrades to an unclustered `L.layerGroup()` rather than no pins. Also removed the "{n} editorially verified entries across the region — places, dining rooms…" line from the map intro per James; the how-to sentence remains.

**3. Hero slider showing stale images outside edit mode.** The homepage cover scenes hard-coded image paths, bypassing `resolveHero` — exactly the bug class the resolver's "THE RULE" comment documents (the 2026-05-29 /explore/plans/ regression). Edit mode showed the current CMS images; the static build kept rendering the old hard-coded files. Each journal-linked scene now resolves through `resolveHero('article', slug, …)`: published CMS override → article frontmatter hero → hard-coded fallback. The homepage's own `cover.image` override still wins for the cover scene. Build output confirms scenes now pick up the articles' real heroes (e.g. flinders scene: `explore-bushrangers-bay-walk-01` → `article-flinders-weekend-01`).

**Files changed**
- `next/src/styles/v4.css`
- `next/src/pages/map.astro`
- `next/src/pages/index.astro`

**Verification**
- Pillar nav sweep at 390/430/600/760/765/1280px (hidden ≤760, visible ≥765). Map sub-text absent from built output; cluster guard present. Hero scene srcs in built homepage now match article heroes. `check-editable-coverage` passes. `npm run build` passes (1485 pages).

## 2026-06-10 — Claude (design)

### Vivid-style homepage uplift — Phase 4: horizontal card rails

**Summary**
Two scroll-snap card rails on the homepage, Vivid-style with the next card peeking at the viewport edge:

1. **"On this weekend"** — events whose date range overlaps the dispatch weekend or whose `nextOccurrence` falls inside it (max 8), rendered with the existing `EventCard`. New `dateLabelOverride` prop on EventCard so long-running events read "On this weekend" instead of their historical start date (the earlier "1 April under a weekend heading" failure mode). Restores events to the homepage for the first time since the ThreeMissionBar removal, with correct filtering.
2. **"From the Journal"** — editor picks via `ArticleCard`, mobile-only (the desktop Shortlist remains; `hp-shortlist-wrap` was already hidden ≤767px).

Track aligns its first card with the container edge (`scroll-padding-inline` matches the inline padding — without it the initial snap dragged the first card to x=0).

**Verification**
Headless Chromium at 390px: both rails render (8 + 3 cards), track scrolls and snaps, first card aligned at the container inset, no page-level horizontal overflow, all weekend date labels honest. `node scripts/check-editable-coverage.mjs` passes (no new card components; existing CMS-bound cards reused). `npm run build` passes (1485 pages).

**Files changed**
- `next/src/pages/index.astro`
- `next/src/components/EventCard.astro` (additive `dateLabelOverride` prop)

### Vivid-style homepage uplift — Phase 3: big-four section rows

**Summary**
The mobile chip strip under the hero is replaced by Vivid-style "navigation as content": four giant Cormorant display rows (Eat & Drink / Wine / Stay / Explore) with trailing arrows and hairline separators on cream, then a quiet uppercase secondary line (What's On · Plans · Journal). Mobile only — desktop keeps the mega-menu pillars. Same single-router role as the chips, far lower cognitive load.

**Verification**
Headless Chromium: four rows render in order at 390px, block hidden at 1280px. Screenshot shared. `npm run build` passes (1485 pages).

**Files changed**
- `next/src/pages/index.astro`

### Vivid-style homepage uplift — Phase 2: full-screen hero slider

**Summary**
Homepage cover rebuilt as a Vivid-Sydney-style full-screen slider: edge-to-edge photo filling the viewport below the masthead (`svh`-based with a JS measure of the hero's real offset — chrome height is observed via ResizeObserver plus a re-measure cascade), warm-dark gradient scrim, overlay bottom-left (label chip, white Cormorant headline with gold italic `em`, CTA button), and a centred control cluster (‹ dash pager ›). Mobile drops the arrows (swipe is the gesture; the bottom corners are owned by the Ask FAB and first-visit cookie banner) and left-aligns the pager; the dispatch standfirst is desktop-only. Swipe support and prev/next arrows added to the carousel script; autoplay (10s) restarts on interaction and is disabled under reduced motion. H1 remains in the first slide's overlay.

Two bugs found by in-browser testing and fixed: the legacy `/assets/styles.css` still injects `.cover` padding (neutralised with explicit `padding: 0`), and corner-pinned arrows were unreachable beneath the Ask FAB / cookie banner (Playwright's pre-click auto-scroll exposed it — real users would hit the same).

**Verification (headless Chromium)**
390×844 and 1280×900: slide bottom lands exactly on the viewport edge; swipe advances slides; dash and arrow clicks switch stories with zero scroll-jump; arrows hidden on mobile. Screenshots shared. `npm run build` passes (1485 pages).

**Files changed**
- `next/src/pages/index.astro`

### Vivid-style homepage uplift — Phase 1: mobile header

**Summary**
First phase of the homepage redesign benchmarked on vividsydney.com mobile (James's brief). Mobile masthead re-laid out Vivid-style: wordmark left, a two-line edition stamp beside it ("Winter / June 2026", shown ≥405px where it fits), then a right icon cluster — search · map (`/map/`) · saved bookmark · burger. Icons are borderless on mobile (circles stay on desktop nav). Replaces this morning's burger-left layout per the approved plan.

**Verification**
Headless-Chromium geometry sweep at 320/360/375/390/414/430/600/760/765/1280px: correct order, no overlaps, no wordmark clipping, no horizontal overflow, mobile controls hidden ≥761px. Screenshots shared. `npm run build` passes (1485 pages).

**Files changed**
- `next/src/components/v4/V4Masthead.astro`
- `next/src/styles/v4.css`

**Follow-up**
- Phase 2: full-screen hero slider with text overlay; Phase 3: big-four section rows; Phase 4: horizontal card rails; Phase 5: final audit.

### Mobile masthead rebuilt and browser-verified (burger · wordmark · bookmark · search)

**Summary**
The previous masthead icon fix regressed the layout: the burger button lives inside `.v4-mobile-actions`, so turning that container into a right-aligned flex item dragged the burger to the right and the three-wide cluster overflowed into the wordmark. Rebuilt properly:

- Burger moved out of the cluster in `V4Masthead.astro` markup — now a direct grid child in column 1 (left). Cluster is exactly bookmark + search (that order), column 3.
- Added a `display: none !important` guard on `.v4-burger` outside the mobile block — the legacy `global.css` shows `.masthead__burger` at ≤768px but the v4 grid only exists at ≤760px, so the burger floated loose in the 761–768px window.
- Wordmark stays truly centred: symmetric 78px side columns, `max-width: 100%` on both the logo and `.masthead__brand-inner` (whose `justify-self: center` sized it to fit-content, letting nowrap text escape the grid track — the actual cause of the original overlap), font on a `clamp(…, 5.6vw, …)` curve, and a ≤340px step that shrinks the icon circles to 70px columns.

**Verification (headless Chromium, real rendering)**
Geometry audit at 320/340/360/375/390/414/430/600/760/765/1280px: element order burger | wordmark | saved | search, wordmark off-centre 0px at every mobile width, zero overlaps, no wordmark ellipsis, no horizontal overflow; burger and cluster hidden ≥761px. Screenshots shared with James. `npm run build` passes (1485 pages).

**Files changed**
- `next/src/components/v4/V4Masthead.astro`
- `next/src/styles/v4.css`

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
