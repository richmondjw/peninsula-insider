# Workstream 5 — Performance, Image SEO, Mobile (§12, §13, §18)

**Site:** Peninsula Insider (peninsulainsider.com.au) — Astro static build, fully prerendered, now proxied through Cloudflare (live 2026-08-16 15:05 UTC).
**Scope:** 6 representative templates — homepage, town page, Eat hub, venue page, journal article, What's On listing.
**Method:** Live edge/origin measurement via `curl -w`, static analysis of the built HTML/CSS in `next/dist` (952 files). No CrUX field data (see Method and limitations).

---

## Correction to the supplied baseline — read this first

The brief states 1,471 `<img>` tags across 690 indexable pages, with 725 missing `alt`. That total is inflated by a bug in whatever counted it: nearly every page in the build (716 of 952) carries a shared HTML **comment** in `<head>` that reads *"...swaps matching `<img>` src values on every page load..."* — a plain-English description of the image-hydration script, not a real tag. A naive `grep -c '<img'` counts that comment as an image on every single page.

Stripping comments and `<script>` blocks and re-counting directly against `next/dist`:

| Metric | Supplied baseline | Verified (this audit) |
|---|---|---|
| Total indexable `<img>` tags | 1,471 | **782** |
| Missing `alt` attribute entirely | 725 (49%) | **35 (4.5%)** |
| Empty `alt=""` | 8 | 7 |
| `loading="lazy"` | 763 | 763 *(confirmed — computed correctly against 782)* |
| Extensions (webp/jpg/png/svg) | 442/294/6/4 | 441/297/6/3 *(confirmed, within rounding)* |
| `width`+`height` both present | 17 | 18 |

The lazy-load count, extension split, and width/height count in the brief were all computed correctly against the true 782-image set — only the **total** and, consequently, the **missing-alt** figure were contaminated. This matters: "half your images have no alt text" is a very different, much more alarming finding than "35 images across two page types are missing alt text," and the fix scope is completely different. Objective B below is built on the corrected 782/35 figures, and separately surfaces a bigger, previously invisible image problem (next section) that no `<img>`-counting method would ever catch.

---

## Objective A — Performance (lab-only)

### TTFB and transfer, 6 templates, 3 runs each (medians, edge/Cloudflare)

| Template | URL | Edge TTFB (median, ms) | Edge total (median, ms) | HTML size (KB) | Origin TTFB (median, ms) |
|---|---|---|---|---|---|
| Homepage | `/` | 60 | 78 | 124 | 51 |
| Town page | `/explore/places/red-hill/` | 67 | 104 | 252 | 54 |
| Eat hub | `/eat/` | 59 | 94 | 325 | 57 |
| Venue page | `/eat/doot-doot-doot/` | 63 | 85 | 147 | 57 |
| Journal article | `/explore/plans/the-one-booking-peninsula-day/` | 62 | 82 | 121 | 48 |
| What's On listing | `/whats-on/` | 59 | 79 | 192 | 47 |

TTFB is consistently **50–70ms** at both edge and origin, warm or cold, across every template. This is fast by any standard — nothing here is a crawl-budget or user-experience problem. No performance work is warranted purely to move these numbers; they're not the bottleneck (see the image findings below for what actually is).

### Finding A1 — Cloudflare is not caching HTML at its edge (informational, not urgent)

Every one of the 18 edge requests above returned `cf-cache-status: DYNAMIC`, including on repeat requests to the same URL seconds apart. Static assets from the same origin (`/assets/mobile-fixes.css`, `/_astro/*.css`, `/fonts/*.woff2`) return `cf-cache-status: HIT` correctly. This is the standard Cloudflare free/pro default: only file extensions on an allow-list are cached automatically; HTML documents require an explicit Cache Rule ("Cache Everything") to be cached at the edge, and none appears to be configured.

- **Practical effect today:** none that's visible in the numbers. Every "DYNAMIC" request still round-trips to origin, but the origin is GitHub Pages behind Fastly, which already has its own Melbourne PoP (`x-served-by: cache-mel...`) and returns `x-cache: HIT` with sub-60ms TTFB on its own. Direct origin TTFB (measured via `--resolve` to `185.199.108.153`, bypassing Cloudflare entirely) is statistically indistinguishable from the Cloudflare-fronted numbers above. Cloudflare is currently a pass-through for HTML, not a cache — but the thing it's passing through to is already fast for this audience's region.
- **Why flag it anyway:** if Cloudflare is being added for genuine CDN/caching benefit (rather than just DNS/WAF/DDoS), it isn't currently delivering that for the page content itself, only for static assets. This is a config gap, not a bug — worth a deliberate decision (add a Cache Rule for `*.html` / default HTML, or accept that Cloudflare's role here is proxy/security, not cache) rather than an assumption. Low effort either way.
- **Effort:** 10 minutes (Cloudflare dashboard → Caching → Cache Rules → "Cache Everything" on the zone, respecting `Cache-Control` origin headers which are already correctly set to `max-age=600`).

### Finding A2 — Render-blocking resources are lean; the real page-weight problem is images, not CSS/JS

Per template, `<head>` carries:
- 5–6 `<link rel="stylesheet">` (shared `BaseLayout.CIXRASjP.css` + 1–3 template-specific chunks + the `mobile-fixes.css`/`scroll-animations.css` patch layer)
- 2 self-hosted `woff2` font preloads (Sora 600, Figtree 400) — correctly `rel="preload"`, no external Google Fonts request blocking render. Good practice.
- 5–6 `<script>` tags in head, of which 2 are `type="module"` (non-blocking); the rest are small inline scripts (theme/text-scale preference, consent-gated GA4 loader), not external blocking fetches.

The largest single CSS file, the site-wide `BaseLayout.CIXRASjP.css`, is 296KB uncompressed but **52KB over the wire** (Brotli/gzip confirmed via `Accept-Encoding` test) and is cached edge-side (`cf-cache-status: HIT`) and shared across all 952 pages — a one-time cost per visitor, not a per-page tax. This is not a render-blocking problem worth chasing.

**Analytics is implemented correctly and is not a performance concern:** GA4 (`G-0MR9YVZ9NW`) only loads after checking `localStorage` for user analytics consent, and even then injects the script tag with `async = true`. It cannot delay first paint or LCP. No other third-party scripts (ads, chat widgets, embeds) were found in any of the 6 templates' `<head>`.

**Verdict:** render-blocking CSS/JS is not costing this site meaningful time or SEO. Don't spend effort here — the page-weight problem is images (A3).

### Finding A3 — LCP images: inconsistent handling across templates, and the underlying files are frequently un-optimized (HIGH)

Checking the first meaningful image per template for `loading`, `fetchpriority`, and explicit dimensions:

| Template | LCP-candidate element | `loading` | `fetchpriority` | `width`/`height` | Underlying file size |
|---|---|---|---|---|---|
| Homepage | `<img class="home-cover__media">` hero | eager (correct) | `high` (correct) | 2400×1350 (correct) | **2.97 MB** unresized JPEG |
| Town page | first `<img>` (Arthur's Seat panorama) | **lazy** (wrong) | none | none | not fetched (n/a — deprioritised) |
| Eat hub | first `<img>` (venue card, e.g. Tedesca Osteria) | **lazy** (wrong) | none | none | not fetched |
| Venue page | hero — **not an `<img>` at all**, CSS `background-image` | n/a | n/a (browsers can't prioritise CSS bg-images as LCP the way they do `<img fetchpriority>`) | n/a | **911 KB** unresized JPEG (sampled: Doot Doot Doot hero) |
| Journal article | hero — CSS `background-image` (same pattern as venue) | n/a | n/a | n/a | not sampled, same template family |
| What's On listing | first `<img>` (event/venue card) | **lazy** (wrong) | none | none | not fetched |

Two distinct, compounding problems:

1. **The homepage does LCP markup correctly** (eager + `fetchpriority="high"` + explicit dimensions on the hero) **but the file behind it is a 2.97MB unresized JPEG.** Correct markup can't rescue an oversized asset — this is very likely the actual LCP bottleneck on the homepage today, and it's fixable independently of everything else in this report (re-encode/resize one file).
2. **Every other template lazy-loads or CSS-background-images its own hero/lead image**, which is the classic anti-pattern you asked us to check for explicitly: a lazy-loaded LCP element delays the largest paint until the browser has parsed enough of the page to trigger the lazy-load observer, instead of starting the fetch immediately. On venue and journal templates the hero isn't even an `<img>` — it's a `background-image: url()` on a `<div>`, which Chrome's LCP heuristics handle far less predictably than a real `<img>` with `fetchpriority`, and which cannot be `<link rel="preload">`'d by URL the way an `<img src>` can.

**Root cause:** two different image pipelines feeding the same site. Curated, pre-built pages (`/images/sourced/*.webp`) are reasonably sized (~120KB for a full hero — see the comparison in Objective B). CMS-uploaded imagery (Supabase Storage, `cms-assets/...`) is served **raw, at upload resolution, with no resizing or format transform** — confirmed by sampling three live URLs:

- Homepage hero (`page/home/cover.image-*.jpg`): 2.97 MB
- "Eat & Drink" homepage door-card thumbnail (`page/eat/hero-*.jpg`): **6.5 MB**, for what renders as a small clickable card
- Doot Doot Doot venue hero (`venue/doot-doot-doot/heroImage-*.jpg`): 911 KB

Supabase's storage API supports an image-transform endpoint (`/storage/v1/render/image/...` with `width`/`quality` params) that would resize and re-encode these on the fly; the site is currently hitting the raw `/storage/v1/object/public/...` path instead.

- **SEO/UX consequence:** LCP is a Google ranking signal and a real user-experience cost, especially on mobile data connections — a 6.5MB image, even lazy-loaded, is a genuine data cost for a mobile visitor scrolling the homepage. This is squarely inside your "connect it to UX/SEO, not performance for its own sake" instruction: LCP is a documented Core Web Vital used in ranking, and every template except the homepage is actively working against it.
- **Fix:** (a) route CMS-uploaded images through Supabase's image transform/resize endpoint (or a build-time optimization step) instead of the raw object URL — this alone would likely cut the worst offenders by 80–95%; (b) on venue/journal/plans templates, promote the hero to a real `<img>` with `loading="eager"` + `fetchpriority="high"` for the above-the-fold hero only (leave cards/galleries lazy); (c) same eager+fetchpriority treatment for the first card image on Eat hub, town, and What's On listing templates specifically (not everything — only the one LCP candidate per page).
- **Effort:** (a) is the highest-leverage single fix here — medium effort (pipeline/build change, no per-page work); (b)/(c) are small, mechanical template edits, low effort.

---

## Objective B — Image SEO

### Finding B1 — Missing alt text is real but narrow: 35 images, two page families, both genuinely content (MEDIUM)

Against the corrected 782-image count, only two page types are missing `alt` entirely, and both are meaningful content photography, not decoration:

| Template | Missing-alt images | Example paths |
|---|---|---|
| `/fishing/species/*` | 28 | `king-george-whiting`, `snapper`, `mulloway`, `bream`, `flathead`, `garfish`, `pinkies`, `yellowtail-kingfish` |
| `/boating/ramps/*` and `/boating/hire/*` | 7 | `rye-boat-ramp`, `sorrento-boat-ramp`, `hastings-boat-ramp`, `mornington-boat-hire`, etc. |

Every other checked `alt` on the site — the empty `alt=""` cases included — is either correctly filled or correctly empty (see below). This is a two-template fix, not a site-wide one.

- **SEO consequence:** these are species/location identification photos with obvious, high-value alt text ("King George whiting caught off the Mornington Peninsula," "Boat ramp at Rye, Mornington Peninsula") — exactly the kind of specific, geo-tagged alt text that supports image search and topical relevance for the fishing/boating verticals.
- **Fix:** add descriptive alt text to these two component templates (likely one shared card/hero component per vertical) — 35 images, but probably 1–2 template edits since the pattern repeats.
- **Effort:** low.

### Finding B2 — The 7 empty `alt=""` instances are all correctly decorative/redundant (no action needed)

Checked every instance in context:
- 4 are the homepage's "door" cards (Eat/Stay/Wine/Explore) — each image sits inside a link whose visible text already names the destination ("Eat & Drink," etc.). WCAG guidance is explicit that a linked image accompanied by adjacent visible text describing the same destination should have `alt=""`, to avoid a screen reader announcing the link twice. This is correct, not an oversight.
- 3 are a repeated decorative concierge icon (`pi-concierge.svg`) on the `/ask/` page. Also correctly decorative.

Worth stating plainly since it cuts against the instinct to "fix all empty alts": these don't need touching.

### Finding B3 — A structural gap the alt-text count can never see: ~431 pages render their photography as CSS `background-image`, not `<img>` (HIGH)

This is the most consequential image finding in this audit, and it's invisible to any tool that only counts `<img>` tags — including the brief's own baseline.

Scanning all 952 built pages for `background-image: url(...)` versus real `<img>` tags:

| | Count |
|---|---|
| Pages with `background-image` hero/gallery photography but **zero** real `<img>` tags anywhere on the page | **431** |
| Total `background-image: url()` occurrences sitewide | 2,280 |
| Of which hosted on Supabase (uncompressed CMS uploads, per A3) | 1,460 |

By template family (indexable pages only): What's On listings (124), journal/plans articles (~70+ once redirect stubs are excluded), Eat/venue pages (61), Stay/accommodation (54), Wine (52), Explore (51). Between them these are the highest-intent, highest-conversion-value page types on the site — venue and event pages are exactly where original photography should be doing the most SEO/discovery work.

An image implemented as a CSS `background-image` on a `<div>`:
- **Cannot have `alt` text, ever** — there is no attribute for it. Not "missing," structurally impossible.
- **Cannot appear in Google Images** — Google's image indexing is built around the `<img>`/`<picture>` element (and inline structured data); CSS background images are, in practice, not crawled as content images.
- **Cannot use `srcset`/`sizes`**, native `loading="lazy"`, or `fetchpriority` — no responsive delivery, no browser-native lazy-loading, no LCP prioritisation (see A3).
- **Cannot be preloaded predictably** the way `<link rel="preload" as="image">` on a known `<img src>` can.

- **Root cause:** the `VenueDetailTemplate`, event, article/journal, and hub-listing templates all implement hero and card imagery via inline `style="background-image:url(...)"` rather than `<img>`/`<picture>`, presumably for the CSS convenience of `background-size:cover`-style cropping. `object-fit: cover` on a real `<img>` achieves the identical visual result while remaining a real image element.
- **SEO/UX consequence:** for a site whose stated differentiator is original editorial photography, roughly 55% of built pages are currently invisible to Google Images and structurally incapable of carrying alt text — a permanent ceiling on image search as an acquisition channel, and an accessibility gap, until this changes.
- **Fix:** convert hero/gallery images on these templates from `background-image` to `<img>` (or `<picture>`) with `object-fit: cover` for the same cropping behaviour, then apply the alt-text and loading/fetchpriority fixes from B1/A3 on top. This is a component-level fix (a handful of shared templates), not a per-page one, but it's the single highest-leverage change in this entire workstream — it's the prerequisite for meaningful alt coverage, responsive images, and correct LCP behaviour on more than half the site.
- **Effort:** medium-high (component refactor across ~4-5 shared templates, needs visual QA for cropping behaviour), but bounded — not 431 individual page edits.

### Finding B4 — Zero responsive images anywhere on the site (MEDIUM)

`srcset` usage: **0 of 782** `<img>` tags. Every image is a single fixed-resolution file served identically to a 360px phone and a 4K desktop. Combined with A3's finding that CMS-sourced images are already oversized at source, this compounds the mobile data cost specifically — a mobile visitor on the homepage receives the same 2.97MB hero file a desktop visitor does, at 6–8x the pixel density they can actually display.

- **Fix:** once B3 is resolved (real `<img>` elements exist to add `srcset` to), generate 2–3 width variants per hero/card image and wire up `srcset`/`sizes`. Treat this as sequenced after B3, not parallel — there's no `srcset` to add to a `background-image`.
- **Effort:** medium, and naturally rides along with the B3 refactor and the A3 Supabase-transform fix (the same resize step feeds both).

### Finding B5 — Filenames are good practice where curated, poor where CMS-generated (LOW)

Locally-hosted images in `/images/sourced/` use descriptive, template-based slugs: `place-red-hill-01.webp`, `venue-doot-doot-doot-01.jpg`, `category-winery-04.webp`, `explore-arthurs-seat-lookout-01.webp`. This is genuinely good filename SEO practice — keyword-relevant, human-readable, consistent pattern.

CMS-uploaded (Supabase) images use auto-generated, non-descriptive filenames: `heroImage-1780004337898.jpg`, `hero-1781253386089.jpg` — timestamp-based, zero keyword value. 313 of the 782 `<img>`-tag images (40%) and the majority of the 2,280 background-images fall into this bucket.

- **Fix:** low priority relative to B1–B4 — filename keyword value is a minor signal compared to alt text and Images indexing eligibility. If the CMS upload pipeline is being touched anyway for the resize fix (A3), consider slugifying the filename from the entity name at upload time (`doot-doot-doot-hero-01.jpg` instead of `heroImage-1780004337898.jpg`) as a low-cost add-on, not a standalone project.
- **Effort:** low, and only worth doing opportunistically alongside A3/B3.

### Finding B6 — CLS risk is lower than the raw width/height count suggests, but not verified everywhere (LOW-MEDIUM, needs confirming)

Only 18 of 782 `<img>` tags carry both `width` and `height` attributes — on its face, a serious CLS (layout shift) risk, since the browser can't reserve space before the image loads. However, the site makes heavy use of CSS `aspect-ratio` on the *containing* element instead — confirmed directly in the compiled CSS:

- Card grid images: `.pi-card__media { aspect-ratio: 3/2 }`
- Homepage hero/door images: `position:absolute; inset:0` inside a sized parent (equivalent effect to `object-fit` cropping into a fixed box)
- Mobile venue/event cards: `aspect-ratio: 3/2` (explicitly re-set at the 640px breakpoint)

Where `aspect-ratio` is applied to the parent, the image slot is space-reserved regardless of whether the `<img>` itself has `width`/`height` — real CLS risk there is low, even though it fails a naive Lighthouse/axe check for missing dimensions.

- **What's not verified:** this audit spot-checked the container CSS for the templates covered in this workstream; it did not exhaustively confirm every one of the 782 image slots sits inside an `aspect-ratio`-constrained container. The gap between "18 images have native dimensions" and "most images sit in aspect-ratio boxes" is a reasonable inference from the CSS patterns found, not a page-by-page verification.
- **Recommendation:** don't treat the 18/782 figure as the real CLS exposure — it overstates the problem. If CLS becomes a concern via real-user monitoring (once GA4/CrUX data is available — see limitations), audit specifically for image slots *without* an `aspect-ratio` ancestor rather than chasing 100% width/height coverage for its own sake.
- **Effort:** none required now; revisit if field data ever shows a CLS problem.

### Finding B7 — An image sitemap is not warranted yet

The current `sitemap.xml` has zero `<image:image>` entries. Given the stated ambition around original photography as an acquisition channel, it's fair to ask whether an image sitemap is worth adding.

**Answer: not yet, and prioritising it now would be premature.** An image sitemap only helps Google discover and associate images that are already crawlable, alt-tagged, and reasonably delivered — none of which is reliably true today for roughly 55% of the site's photography (B3). Adding a sitemap entry for a `background-image` that Google can't index as an image in the first place accomplishes nothing. The honest sequencing is: fix B3 (real `<img>` elements) → fix B1 (alt text) → then an image sitemap becomes a genuinely low-cost, low-risk addition worth revisiting. Recommending it before that would be optimizing a channel that structurally can't receive the traffic yet.

---

## Objective C — Mobile

Static-analysis comparison (HTML/CSS in the built output) across homepage, venue page, and What's On listing — see limitations below regarding what static analysis can and can't confirm.

### Finding C1 — Viewport and responsive foundation are correct (no issue)

`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` is present and correct on every template checked, including `viewport-fit=cover` for notched devices.

### Finding C2 — Standard, non-lossy responsive navigation (no issue)

The desktop nav row (`.masthead__nav`) is hidden below 768px via a `@media (max-width: 768px)` rule, with a burger-menu trigger (`.masthead__burger`) and a separate `.mobile-nav` overlay shown instead. This is the standard responsive pattern, not a content-parity problem — it's a UI-component swap, not content removed. Static analysis can't confirm the two navs carry an identical link set (that would need a rendered-DOM comparison), but nothing in the CSS/HTML suggests they diverge.

### Finding C3 — Tap targets meet guidance (no issue)

Interactive elements (buttons, save/booking links) consistently specify `min-height: 44px` or `48px` across every component stylesheet checked (`BaseLayout`, `CardGrid`, `JournalModule`, map/trip/saved templates) — in line with the commonly cited 44–48px CSS-pixel minimum for touch targets (WCAG 2.5.5 / Google guidance).

### Finding C4 — No content is being hidden from mobile in the current build (checked, clean)

Two CSS utility classes exist in the global stylesheet specifically for hiding elements below a breakpoint (`.venues--hide-mobile`, `.seasonal-shelf`, both `display:none` under `@media (max-width: 720px)`) — but neither class appears anywhere in any of the 952 built HTML pages. They're dead CSS from a retired or not-yet-shipped feature, not an active mobile content-parity risk. Given mobile-first indexing means anything hidden on mobile effectively doesn't exist for ranking purposes, this was worth checking explicitly, and it came back clean.

The one genuine mobile-only element found — a horizontally-scrolling "quick nav" chip strip on Eat/Wine hub pages (`.hub-area-nav`, shown only ≤768px) — is explicitly documented in the source CSS as the mobile equivalent of a `CompareBlock` component shown on desktop. Same links, different presentation; not a parity gap.

### Finding C5 — No intrusive interstitials (checked, clean)

No automatic popups, exit-intent modals, or timed overlays were found in the built HTML or JS. The only overlay component present is a user-triggered search modal (`.site-search-overlay`), which only appears on interaction — not the kind of "intrusive interstitial" Google's mobile guidelines penalise. Newsletter signup is placed inline (10 references in the homepage HTML, no modal/popup class attached to any of them), not as a popup.

### Finding C6 — A dedicated mobile CSS patch layer exists (informational, not a current bug)

Every page loads `mobile-fixes.css` (11.4KB), described in its own header comment as a fix layer "loaded LAST to override the main stylesheet" for specific known issues: sticky header behaviour breaking under `overflow-x: hidden` in mobile WebKit, horizontal overflow on several components, and deliberate mobile card-density compression. The fixes themselves look correct and are evidently working (this audit found no live overflow/sticky-header failures in the static output). Flagging only because a permanent patch-layer-on-top-of-base-styles is a maintainability signal — if these fixes are stable, folding them into the base stylesheet at the next design-system pass would reduce one more render-blocking file, but this is small (11KB) and not urgent.

---

## Summary — what's actually worth doing

Ranked by leverage, not by objective:

1. **(A3/B3) Fix the CMS image pipeline and stop background-image-ing heroes.** This single thread — route Supabase uploads through a resize/transform step, and convert venue/event/article hero images from CSS `background-image` to real `<img>`/`<picture>` — fixes the worst LCP offenders (2.97MB–6.5MB files), unlocks alt text and Google Images eligibility on ~431 pages, and is the prerequisite for responsive images (B4). Medium-high effort, highest impact by far.
2. **(A3) Correct `loading`/`fetchpriority` on the town, Eat-hub, and What's On hero/first-card images** — small, mechanical, immediately fixes a textbook lazy-loaded-LCP bug on three templates. Low effort.
3. **(B1) Add alt text to 35 fishing-species and boat-ramp photos.** Narrow, low effort, clear keyword value.
4. **(A1) Decide deliberately on Cloudflare's HTML caching** — not urgent (TTFB is already fine via Fastly), but worth a conscious choice rather than an unconfigured default now that Cloudflare is newly in front of the site.
5. Everything else in this report (B2, B5, B6, C1–C6) is either already correct or genuinely low priority — don't spend effort there.

---

## Method and limitations

- **CrUX field data is unavailable.** The PageSpeed Insights API requires a Google API key for meaningful quota, and none exists in the credential store for this environment; without it, CrUX returns "Quota exceeded" on unauthenticated requests. All performance figures in this report are **lab-only**: live `curl` timing (TTFB, transfer, cache headers) and static analysis of the built HTML/CSS. No real-user Core Web Vitals (field LCP/INP/CLS) were available to corroborate the lab findings — the LCP and CLS risk assessments above are inferred from markup/CSS, not measured against actual user experience. If GA4 or Search Console CrUX access becomes available later, the LCP-image findings (A3) in particular should be checked against real field data before treating them as fully confirmed.
- **Mobile analysis (Objective C) is static-code analysis, not device emulation.** No headless browser/Playwright session was run in this task; findings are drawn from the built HTML and CSS media queries, not from rendering the page on an actual mobile viewport. This is sufficient to confirm markup-level facts (viewport meta, hidden-content CSS rules, tap-target CSS sizing) but cannot confirm runtime-only behaviour (JS-driven layout shifts, actual rendered overlap, real device font rendering).
- **Sampling:** performance timing covered 6 templates × 3 runs at the edge and 6 × 3 at origin (36 requests total), plus targeted checks on 3 CMS-hosted image URLs and a handful of static assets. Image-tag and background-image statistics were computed exhaustively across all 952 built HTML files, not sampled.
- **A note on the baseline correction:** the discrepancy documented at the top of this report (1,471 vs. 782 `<img>` tags) was caught by stripping HTML comments and `<script>` blocks before counting — a repeated boilerplate comment describing the image-hydration script was being counted as live markup. Anyone re-running an image audit on this codebase should account for that comment, or the total will be inflated by ~700 again.
