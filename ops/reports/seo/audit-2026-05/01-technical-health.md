# Peninsula Insider, Monthly SEO audit · Technical health

**Date:** 2026-05-08
**Scope:** Technical-SEO portion of the May 2026 monthly audit. Indexation, canonicals, HTTPS, and the known sitemap duplicate are covered by the daily SEO operation in `ops/reports/seo/` and are NOT re-audited here. This file covers the gaps the daily loop does not hit.
**Reviewer:** Claude (PI SEO desk)
**Inputs:** Live HTML pulls of 15 representative URLs, source code review of the Astro templates, the `ops/reports/seo/url-inventory.md` file (418 URLs · 233 indexed · 140 Discovered-not-indexed), and the `baseline.md` snapshot from 2026-05-01.

---

## 0. TL;DR, what's actually broken

The site's technical baseline is materially better than the indexation numbers suggest. The structural problems are smaller and more fixable than they look:

1. **PSI v5 API quota was exhausted before this audit ran.** Real Core Web Vitals lab + field data is unavailable in this report and labelled as `MISSING` in §1. The workaround used (curl-based byte/timing measurement) is a PROXY, not a substitute. P0 follow-up: enable the Chrome UX Report API key and rerun PSI for the 7 representative URLs out of band.
2. **Article and place page hero images render as CSS `background-image`, not `<img>`.** This is the single highest-impact technical-SEO gap: the editorial hero is invisible to Google Images, has no `alt` for image-search ranking signals, cannot use `loading="lazy"`, and is unlikely to be recognised by Google Discover. See §5.
3. **`/journal/dog-friendly-mornington-peninsula/` is hand-coded as a `.astro` page (not from the content collection), passes a no-trailing-slash canonical to BaseLayout, hardcodes `mainEntityOfPage` to the no-slash form in JSON-LD, contains 17 em-dashes (project rule violation), and falls back to the generic site `og:image`.** This is the dominant query magnet on the site (5 of 10 top queries by impressions are dog-friendly variants) and it is materially under-built.
4. **Schema gap on the Pass commercial page:** `/pass/` ships only Organization + BreadcrumbList. No `Product` / `Offer` / `Service` schema for the membership tiers, so the page cannot earn rich result eligibility for "Mornington Peninsula membership" queries.
5. **Schema gap on the Wine and Journal hubs:** `/wine/` and `/journal/` ship FAQ + Breadcrumb only. No `CollectionPage`, no `ItemList`. The Eat and Places hubs already have these, the inconsistency is a direct, low-effort fix.
6. **Sitemap quality is honest but mid-tier.** 390 entries, 1 known duplicate (the orchestrator already flagged this), and `lastmod` is set to `TODAY` for the homepage and most hubs because `lastmod = TODAY` is the default in `sitemap.xml.ts:6` for any URL without an explicit override. This signals "everything changes every day" to crawlers. Real lastmods are emitted only for collection-driven entries (venues, journal articles, etc).
7. **`/whats-on/` HTML payload is 460KB, 3× the homepage and 2.5× a place page.** That hub renders 90+ event cards inline. Likely a TBT/LCP risk on mobile.

A prioritised, severity-tagged fix list is in §8.

---

## 1. Core Web Vitals & PageSpeed

### Status: PSI v5 API quota exceeded before lab data could be collected

A multi-URL parallel fetch against the public PSI v5 endpoint at the start of this audit run returned `429 Too Many Requests`, then resolved to:

```
"code": 429,
"message": "Quota exceeded for quota metric 'Queries' and limit 'Queries per day'
  of service 'pagespeedonline.googleapis.com'
  for consumer 'project_number:583797351490'."
```

The PSI web UI (`https://pagespeed.web.dev/analysis?url=...`) was also fetched but it is a JavaScript-rendered SPA, the markdown-converted DOM only contains the loading interface. CrUX direct API requires an enabled API key (the project I have access to has `chromeuxreport.googleapis.com` disabled, surfaced as a 403 SERVICE_DISABLED).

**This is itself the first finding.** The daily SEO loop in `ops/scripts/seo/` does not currently capture PSI lab data on a rolling cadence, there is no `psi-pull.mjs` equivalent for `gsc-pull.mjs`. The May audit therefore inherits zero historical lab/field data, and the PSI quota cap on the ad-hoc workflow makes it brittle.

**Recommended P0:** Add `ops/scripts/seo/psi-pull.mjs` running once weekly against the 7 representative URLs below, with a Google Cloud API key + CrUX project enabled, writing to `ops/reports/seo/cwv-history.jsonl`. Without this, every monthly audit hits the same 429 wall.

### Lab-data table (PSI MISSING, proxy values from curl)

The closest signal we can get without PSI is the raw HTTP transfer:

| URL | HTML bytes | Server time-to-first-byte (curl, AU) | `<img>` count | `<script>` count | CSS sheets |
|---|---:|---:|---:|---:|---:|
| `/` | 150,273 | 73ms | 17 | 23 | 7 |
| `/journal/dog-friendly-mornington-peninsula/` | 139,397 | 55ms | 11 | 23 | 7 |
| `/eat/best-restaurants/` | 168,389 | 64ms | 12 | 23 | 7 |
| `/places/sorrento/` | 195,769 | 53ms | 11 | 24 | 7 |
| `/wine/best-cellar-doors/` | 156,064 | 63ms | 11 | 22 | 7 |
| `/whats-on/` | **460,362** | 52ms | 11 | 23 | 7 |
| `/pass/` | 137,140 | **283ms** | 11 | 23 | 8 |

Source: `curl -sL -o /dev/null -w "%{size_download}|%{time_starttransfer}"` from the audit machine to the GitHub Pages edge.

**What this is, and what it is not.**
This is *not* Core Web Vitals. It is a transfer-weight and edge-latency check. LCP on mobile would be dominated by the hero image (which is a CSS `background-image` for journal/place templates and ranges 168KB to 491KB, see §5), not the HTML. INP is dominated by the V4 mega menu hover handlers and the Lenis smooth-scroll RAF loop (`BaseLayout.astro:506-540`), neither of which is observable from server-side bytes. CLS is dominated by the hero rotator on the homepage (`HomeCover.astro:84-100`) and by the chip-bar mount on `/whats-on/`, also not observable from server-side bytes.

**Two findings the proxy data can support:**

1. **`/whats-on/` HTML is 3× the homepage and 2.6× the average page.** The page renders all 90+ events as `<EventCard>` instances inline (`whats-on/index.astro:279, 405, 428, 451, 474, 520, 571`). Each EventCard contributes both DOM and a save-button handler. Mobile LCP risk is real even though we can't measure it. Fixes: (a) lazy-mount the lower category sections via IntersectionObserver, (b) move the temporal-tabs panels to `<details>` until-clicked, (c) cap the recurring-events panel at the next 9 instances rather than rendering every recurrence.
2. **`/pass/` time-to-first-byte was 283ms vs ~60ms for every other page.** The first byte from GitHub Pages should be cache-warmed and identical across pages; 5× the latency on a single page suggests cache miss timing (this URL is rarely visited) rather than a server problem. **PROXY only, not a real perf finding.** Re-test cold and warm to confirm.

### Field-data row (PSI MISSING)

| URL | LCP | INP | CLS | FCP | TTFB | Field data available? |
|---|---|---|---|---|---|---|
| `/` | MISSING | MISSING | MISSING | MISSING | MISSING | Pending PSI re-run |
| `/journal/dog-friendly-mornington-peninsula/` | MISSING | MISSING | MISSING | MISSING | MISSING | Pending PSI re-run |
| `/eat/best-restaurants/` | MISSING | MISSING | MISSING | MISSING | MISSING | Pending PSI re-run |
| `/places/sorrento/` | MISSING | MISSING | MISSING | MISSING | MISSING | Pending PSI re-run |
| `/wine/best-cellar-doors/` | MISSING | MISSING | MISSING | MISSING | MISSING | Pending PSI re-run |
| `/whats-on/` | MISSING | MISSING | MISSING | MISSING | MISSING | Pending PSI re-run |
| `/pass/` | MISSING | MISSING | MISSING | MISSING | MISSING | Pending PSI re-run |

ASSUMPTION (not verified for this audit, based on the 23-clicks-in-28-days traffic level reported in `baseline.md`): every URL on Peninsula Insider will return "not enough real-world data" from PSI's CrUX field data. The site does not yet have the traffic threshold (the CrUX origin record needs ~100 sessions/28d minimum, per-URL records need much more). **This itself is a finding**, until traffic crosses the threshold, we can only act on lab data, not real-user data, and we cannot triangulate "what real visitors experience" against ranking outcomes. A useful intermediate is enabling Real User Monitoring via the `web-vitals` JS library (75 lines of code), reporting to Supabase. That would give us per-URL CWV before CrUX does.

### Where the lab-data risks actually sit (code-level evidence)

Without PSI we can still call out the code paths that are most likely to lose points:

| Risk | Code evidence | Likely metric impact |
|---|---|---|
| Unoptimised hero images on journal/place pages (range 168KB–491KB) | `editorial.ts:360-365` (`heroBackgroundStyle`) emits `background-image: url(...)` with no responsive `image-set()`, no width/height, no `<picture>` source set | LCP +0.5s to +1.5s on slow mobile |
| Lenis smooth-scroll RAF loop runs on every page, no idle abort | `BaseLayout.astro:506-540` | INP +50–100ms, TBT +20–50ms |
| Two render-blocking external font requests | `BaseLayout.astro:104-107` (`Cormorant Garamond` + `Outfit` from Google Fonts, no `font-display` override) | FCP +200ms cold |
| 7 stylesheets imported, 5 of them inline in BaseLayout (`global.css`, `concierge.css`, `search.css`, `v4.css`, plus 2 enhancement CSS sheets) | `BaseLayout.astro:11-13, 142-146` | CSS render-block budget; FCP +100–300ms |
| Hero image rotator on home preloads + cycles 5 images (one is `loading="eager" fetchpriority="high"`, the rest are eager) | `HomeCover.astro:86-95` | First image is fine, but the other 4 contribute to network waterfall and total transfer |
| Cookie banner script registers a consent listener that gates gtag.js, gtag eventually loads, blocking nothing but adding to total weight | `BaseLayout.astro:153-187` | Marginal but real on /pass/ where every ms of TBT matters |

These are P1 lab-only suspicions. They become P0 only once PSI confirms (or refutes) them.

---

## 2. Schema audit

### Live verification (live HTML, 2026-05-08)

The numbers in this section are from `curl https://peninsulainsider.com.au/<url> | grep '<script type="application/ld+json"'` counts, with the `@type` values extracted and de-duplicated.

| URL | LD-JSON blocks | `@type` values present | Notable absences |
|---|---:|---|---|
| `/` | 3 | Organization, WebSite (+SearchAction), FAQPage | No BreadcrumbList (homepage doesn't need one in strict spec, but Google sometimes infers; not a real gap) |
| `/journal/dog-friendly-mornington-peninsula/` | 4 | Organization, Article, FAQPage, BreadcrumbList | Hand-coded page, schema is fine |
| `/journal/` (hub) | 2 | Organization, BreadcrumbList | **No CollectionPage, no ItemList** |
| `/eat/best-restaurants/` | 4 | Organization, ItemList (+ListItem), FAQPage, BreadcrumbList | Solid |
| `/eat/` (hub) | 4 | Organization, FAQPage, BreadcrumbList, CollectionPage | Solid |
| `/eat/polperro/` (winery filed under /eat/) | 3 | Organization, Winery (LocalBusiness), BreadcrumbList | Canonical points at `/wine/polperro/` correctly |
| `/wine/` (hub) | 3 | Organization, FAQPage, BreadcrumbList | **No CollectionPage, no ItemList** |
| `/wine/best-cellar-doors/` | 3 | Organization, FAQPage, BreadcrumbList | **No ItemList** (Eat best-restaurants has it; this hub does not) |
| `/wine/polperro/` (winery canonical home) | 4 | Organization, Winery (LocalBusiness), BreadcrumbList, GeoCoordinates/PostalAddress | Solid |
| `/places/` (hub) | 5 | Organization, CollectionPage, FAQPage, BreadcrumbList, WebSite | Solid |
| `/places/sorrento/` | 4 | Organization, TouristDestination, FAQPage, BreadcrumbList | Solid |
| `/whats-on/` (hub) | 3 | Organization, FAQPage, BreadcrumbList | **No CollectionPage, no ItemList of upcoming events** |
| `/whats-on/mornington-cup-2026/` | 3 | Organization, Event (+Offer +Place), BreadcrumbList | Solid |
| `/fishing/locations/rye-pier/` | 3 | Organization, Place, Article, BreadcrumbList, FAQPage | Solid (best-instrumented vertical on the site) |
| `/pass/` | 2 | Organization, BreadcrumbList | **No Product, no Offer, no Service** |

### Per-template code review

| Template | File | Schema emission |
|---|---|---|
| Global head (Organization) | `next/src/layouts/BaseLayout.astro:131-137` | Always emits Organization. Logo points to `/images/sourced/home-cover.webp`, a hero photograph, not a logo. Schema.org does not strictly require square / minimum dimensions for `Organization.logo` but `NewsArticle` rich results (when we ever earn them) have a 112×112px minimum logo requirement that this asset meets only because it's much larger; a real square logo would also enable `imageObject.width`/`height` validation in Search Console. |
| Homepage | `next/src/pages/index.astro:70-112` | WebSite (with SearchAction sitelinks) + FAQPage. `searchAction.target` is `/journal?q={search_term_string}`, note this points at `/journal/` with a query param that the journal index page doesn't currently consume; the actual search overlay binds to `/search/`. Either fix the SearchAction target or add `?q=` parsing to journal index. |
| Journal article (collection) | `next/src/pages/journal/[slug].astro:75-109` | Article + (optional) FAQPage. Breadcrumbs component adds BreadcrumbList. `image` is suppressed when the hero is the placeholder fallback. `mainEntityOfPage` is `https://peninsulainsider.com.au/journal/{slug}/` (with trailing slash), correct. |
| Journal article (hand-coded) | `next/src/pages/journal/dog-friendly-mornington-peninsula.astro:9-19` | Article + FAQPage. **`mainEntityOfPage` and `url` are hardcoded to the NO-trailing-slash form** (`/journal/dog-friendly-mornington-peninsula`). `<link rel="canonical">` ends up with the trailing slash because BaseLayout normalises (`BaseLayout.astro:84`), so Google sees a mismatch between canonical (with `/`) and schema URL (without `/`). Likely benign but worth fixing. |
| Eat venue | `next/src/pages/eat/[slug].astro:78-107` | Restaurant / Cafe / Bakery / BarOrPub / LocalBusiness / Winery (mapped from `venue.data.type`). `address` and `geo` always emitted. No `aggregateRating` or `priceRange` issues. Wineries served on `/eat/{slug}/` correctly canonical to `/wine/{slug}/` per `[slug].astro:70-72`. VenueDetailTemplate adds Breadcrumbs. **Missing:** no `image` field on the schema (the hero is a CSS background, see §5). |
| Wine venue | `next/src/pages/wine/[slug].astro:72-84` | `buildWinerySchema` (Winery + LocalBusiness multi-type) + optional Restaurant / LodgingBusiness for venues with associated restaurant or accommodation + optional FAQPage + BreadcrumbList. The multi-type Winery+LocalBusiness pattern is a deliberate choice (`schema.ts:36`) and is well-formed. `image` *is* emitted when a real hero exists (`schema.ts:43-45`). |
| Place page | `next/src/pages/places/[slug].astro:297-308` | TouristDestination (+ optional FAQPage from `townFaqs`) + BreadcrumbList. `geo` always emitted from `place.data.coordinates`. **Missing:** no `image` on TouristDestination, no `containsPlace` linking to the venues filed under each town. The town FAQs are well-edited and substantial (12 towns have hand-written FAQs). |
| Whats-on event detail | `next/src/pages/whats-on/[slug].astro:70` (delegates to `events.ts:eventJsonLd`) | Event with full Offer + Place + GeoCoordinates + organiser. Best-instrumented event schema in the codebase. |
| Whats-on hub | `next/src/pages/whats-on/index.astro` | FAQPage + (Breadcrumbs adds BreadcrumbList). **Missing:** no `ItemList` of upcoming events, no `CollectionPage`. The hub renders 90+ events but advertises none of them in structured data, a clear miss for a primary editorial differentiator. |
| Fishing location | `next/src/pages/fishing/locations/[slug].astro:21` (delegates to `schema.ts:buildFishingLocationSchema`) | `@graph` of Place + Article + (optional) FAQPage + BreadcrumbList. Best-instrumented vertical template on the site. The boating/fishing block is a mature schema implementation that the older sections should be harmonised to. |

### Schema-level gaps and what I'd change

| Gap | Files affected | Effort | Severity |
|---|---|---|---|
| No `Product` / `Offer` schema on `/pass/` for the three membership tiers | `next/src/pages/pass.astro` | 30 min | P1, commercial conversion surface |
| No `ItemList` on `/wine/best-cellar-doors/` (peer page `/eat/best-restaurants/` has it) | `next/src/pages/wine/best-cellar-doors.astro` | 30 min | P1, primary commercial keyword surface |
| No `CollectionPage` + `ItemList` on `/wine/`, `/journal/`, `/whats-on/` (Eat and Places already have it) | three index files | 1h total | P1, hub eligibility for sitelinks |
| `Organization.logo` is a hero photo, not a square logo | `BaseLayout.astro:136`, `schema.ts:5` | half-day (asset creation + replace) | P2, required for News rich result eligibility eventually |
| WebSite SearchAction `target` points at `/journal?q=` which doesn't render results | `index.astro:79-80` | 15 min, point at `/search/?q={search_term_string}` instead | P1, sitelinks search box behaviour |
| `image` not emitted on TouristDestination / TouristAttraction schemas | `places/[slug].astro:297-308`, `lib/schema.ts:252-287` | 1h | P2 |
| `mainEntityOfPage` / `url` mismatch in hand-coded journal Article schema (no trailing slash) | `journal/dog-friendly-mornington-peninsula.astro:17-18` | 5 min | P2 |
| No `BreadcrumbList` on the homepage | `index.astro` | optional, Google infers; spec doesn't require | P3 |
| No `Article.image` on `/eat/[slug]`, hero is rendered as CSS background, schema has no image at all | `pages/eat/[slug].astro:88-107` | 30 min, pull from `data.heroImage.src` | P1, Discover, Search image carousel eligibility |

---

## 3. Mobile usability

| Check | Status | Evidence |
|---|---|---|
| Viewport meta present | PASS | `BaseLayout.astro:100`, `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| HTML lang attribute | PASS | `BaseLayout.astro:97`, `lang="en-AU"`; `content-language` http-equiv on line 101 |
| V4 mega-menu collapses to drawer on mobile | PASS | V4MobileDrawer is mounted globally (`BaseLayout.astro:212`); the mega panels switch to accordion behaviour at `≤1024px` (`BaseLayout.astro:255` matchMedia gate on the ask-pill kill) |
| Tap-target spacing on the V4 drawer | PARTIAL, needs visual QA | Drawer pillar links emit at `<a href={item.href}>{item.label}</a>` with no minimum-height padding declared in the inline CSS for V4MobileDrawer. The PI default font is `Outfit 14px` per the global stylesheet. Tap targets need 44×44px minimum per WCAG; can't verify without a real device. ASSUMPTION: probably fine because nav items are list-rows with line-height, but worth a manual QA run. |
| Sticky subscribe pill on mobile | PASS | Bottom-left, fades in at 50% scroll, hidden on `/newsletter`, `/ask`, `/account` (`BaseLayout.astro:269-310`) |
| Forms have correct input types and autocomplete | PASS, newsletter form uses `type="email"` and `autocomplete="email"`. Did not verify other forms in this pass. | Sample: Polperro page newsletter form |
| Horizontal scroll on mobile | UNKNOWN, not verified | Cannot test without a viewport simulator in this audit. Project rule says BRAND-PI.md voice must avoid em-dashes, not that the layouts must avoid horizontal overflow; flagging for visual QA. |
| Mobile-only pill CSS exists | PASS | `BaseLayout.astro:269-310` shows `subscribe-pill` and `data-path` body attribute used to hide it on specific routes |

**Findings:**

1. There is no programmatic mobile-usability check in the daily SEO loop. A 2-line addition to `pull.mjs` could call PSI's `lighthouseResult.audits['viewport']` and `tap-targets` audits on each priority URL and write to a daily file.
2. `V4Masthead.astro` mobile breakpoint logic is responsive-CSS only, not JS-detected. That's good for performance, the masthead works without JS. Minus 1 risk because it means the menu chrome is server-rendered, plus 1 maintenance overhead because every CSS breakpoint change is a potential regression.

---

## 4. Internal linking depth

### Hub → child page link counts (live HTML, 2026-05-08)

| Hub | Live internal links to direct children | Children in collection / sitemap | Coverage |
|---|---:|---:|---:|
| `/journal/` | 99 unique `/journal/*` links | 134 journal entries in sitemap | 73% |
| `/whats-on/` | 78 unique `/whats-on/*` links | 90 events in sitemap | 86% |
| `/eat/` | 117 unique `/eat/*` links | 27 eat venues in sitemap | 433% (links cover sub-hubs and tag pages too) |
| `/wine/` | 70 unique `/wine/*` links | 25 wine venues in sitemap | 280% (sub-hubs included) |
| `/places/` | 40 unique `/places/*` links | 20 place pages | 200% |
| `/explore/` | 58 unique `/explore/*` links | 44 explore entries in sitemap | 132% |

**Reading:** every hub links well above the count of its leaf children. The high `/eat/` and `/wine/` percentages are because each hub also exposes sub-category pages (`/eat/cafes/`, `/wine/red-hill/` etc.) that are not in the leaf-venues count.

### Specific Discovered-not-indexed URL audit

For each unindexed URL I checked whether it has at least one inbound internal link from its parent hub. **All 25 URLs sampled had at least one link**:

#### Sample: 9 of the 76 unindexed journal URLs
| Slug | Inbound links from `/journal/` |
|---|---:|
| `the-birthday-weekend` | 1 |
| `the-peninsula-orientation-drive` | 4 |
| `the-producer-trail` | 3 |
| `rainy-day-peninsula` | 1 |
| `the-spring-peninsula` | 1 |
| `the-sunset-drink` | 3 |
| `the-sunset-hour` | 1 |
| `best-spas-mornington-peninsula` | 3 |
| `mornington-peninsula-itinerary` | 1 |

#### Sample: 10 of the 11 unindexed places
| Slug | Inbound links from `/places/` |
|---|---:|
| `balnarring` | 2 |
| `cape-schanck` | 1 |
| `dromana` | 2 |
| `merricks` | 4 |
| `moorooduc` | 1 |
| `mount-martha` | 2 |
| `point-nepean` | 4 |
| `rosebud` | 1 |
| `shoreham` | 1 |
| `tuerong` | 1 |

#### Sample: 5 of the 13 unindexed wineries
| Slug | Inbound from `/eat/` | Inbound from `/wine/` |
|---:|---:|---:|
| `kooyong` | 1 | 1 |
| `montalto` | 1 | 1 |
| `ten-minutes-by-tractor` | 1 | 3 |
| `willow-creek-vineyard` | 1 | 1 |
| `yabby-lake` | 1 | 1 |

**Reading:**

- "Discovered – not indexed" is **not** primarily a missing-internal-link problem on this site. The links exist, just thinly. Most discovered-not-indexed URLs have 1–4 inbound links from the parent hub.
- The **link density** (1 link is typical, 4 is uncommon) is the more likely signal. Compare to `dog-friendly-mornington-peninsula` (the indexed one) which is linked from the explore mega menu, the dog-friendly hub, the footer, plus contextual journal pieces, the 5+ link threshold seems to correlate with indexation here.
- **The thinnest cases are the ones to fix:** `the-birthday-weekend`, `rainy-day-peninsula`, `the-spring-peninsula`, `the-sunset-hour`, `mornington-peninsula-itinerary` each have only 1 link from `/journal/`. Adding contextual cross-links from related-content rails would push them over the threshold.

### Footer / global nav link check

The footer (`next/src/components/Footer.astro:34-65`) exposes:
- 7 Departments via `v4FooterDepartments` (all 7 pillars: Eat, Wine, Stay, Explore, Plans, What's On, Journal) ✓
- All 21 places via `buildFooterPlaceLinks(places)` ✓ (so every `/places/{slug}/` has an always-on footer link from every page on the site, strong canonical-anchor signal)
- 7 Colophon links (about, methodology, map, partners, pass, newsletter, contact, privacy)

The V4 mega-menu (`next/src/lib/v4-nav.ts`) exposes hand-curated 6-items-per-column featured links, this is the curated, editorial version. It does NOT expose every leaf URL (intentional, BRAND-PI voice rule).

The `v4FooterNiche` array (`v4-nav.ts:455-463`) defines `golf, spa, fishing, boating, dog-friendly, weddings, corporate-events` but **the Footer.astro component does NOT render them.** Footer renders `v4FooterDepartments` and `aboutLinks` (a synonym for the colophon list), but `v4FooterNiche` is unused. This is a 5-minute fix: add a "Special interests" column in the footer and render `v4FooterNiche`. That puts every niche hub on every page on the site.

### Orphan check

Cannot complete a true orphan check without crawling. **PROXY:** the 16 "URL is unknown to Google" entries in `url-inventory.md` are the closest proxy for orphans. Review:

```
/eat/main-ridge-estate/        , no main-ridge-estate venue file in /content/venues/
/eat/ocean-eight/               , present in eat sitemap (`ocean-eight` is a wine venue, slug variant)
/eat/stonier-wines/             , present in eat sitemap (slug variant)
/explore/rye-ocean-beach/       , appears in /explore/ hub link list, so not orphaned
/journal/how-to-plan-a-peninsula-weekend/ , slug variant; canonical is probably `/journal/the-one-night-escape/`
/stay/hotel-sorrento(/)         , duplicate slug (with and without slash); needs canonicalisation
/stay/port-phillip-estate(/)    , same
/wine/advance-mussel-supply(/)  , same
/wine/crittenden-estate/        , present in /wine/ hub, just unindexed
/wine/hurley-vineyard/          , same
/wine/main-ridge-dairy/         , same
/wine/main-ridge-estate/        , same
```

**Action:** verify in `next/src/content/venues/` whether each "unknown to Google" URL still corresponds to an existing source file. If it does, request indexing. If it doesn't, add a 301 to the canonical destination.

---

## 5. Image SEO

### The headline finding: hero images are CSS background-images

`next/src/lib/editorial.ts:360-365` defines:

```
export function heroBackgroundStyle(data: any): string {
  return `background-image: url(${resolveHeroSrc(data)}); background-size: cover; background-position: center;`;
}
```

This helper is used on:

- `next/src/pages/journal/[slug].astro:165`, every journal article hero
- `next/src/components/VenueDetailTemplate.astro`, every eat / stay / wine venue hero
- `next/src/components/PlaceDetailTemplate.astro`, every place page hero (also via cards)

**Implications:**

1. The hero image has **no `alt` attribute** in the rendered HTML. There is `aria-label` on the role="img" wrapper (`pages/journal/[slug].astro:165`), but Google Image search does not consume `aria-label` the way it consumes `<img alt>`. So the editorial hero is essentially invisible to image search.
2. **No `loading="lazy"`** is possible, CSS images load whenever the matching CSS rule parses. For the article and place hero, that's eager regardless. Fine for LCP (the hero is the LCP candidate so eager is desirable), but wasteful for any below-the-fold image rendered as background, which is also the pattern for venue cards (`venue-card__hero`).
3. **No responsive `image-set()`**, the hero is a single `.webp` URL at full resolution served to mobile and desktop alike. A 470KB hero on a 360px-wide phone is literal bandwidth waste.
4. **No `width`/`height`** layout hint, increases CLS risk. (Mitigated for journal/place because the hero block is a fixed-aspect div, but still suboptimal.)
5. **Discover eligibility is questionable.** Google Discover prefers stories with `<img>` heroes ≥1200px wide. CSS background-images are crawlable but don't reliably feed Discover's image-richness signals. The site's editorial format (long, opinionated, photo-driven) is a textbook Discover candidate, but the pattern of hiding hero photos as CSS doesn't help.

### Hero image weights (live HEAD requests)

| Image | Bytes | Used as hero on |
|---|---:|---|
| `/images/sourced/home-cover.webp` | 490,600 | Homepage cover, `Organization.logo`, default OG fallback |
| `/images/sourced/place-sorrento-01.webp` | 351,724 | `/places/sorrento/` |
| `/images/sourced/spa-alba-thermal-springs-01.webp` | 242,438 | Plans pillar mega-menu rail |
| `/images/sourced/place-rye-01.webp` | 168,960 | `/places/rye/`, `/journal/dog-friendly-mornington-peninsula/` |
| `/images/sourced/explore-bushrangers-bay-walk-01.webp` | 85,032 | Explore pillar mega-menu rail |
| `/images/sourced/article-picnic-01.webp` | 470,156 | What's On mega-menu rail |
| `/images/sourced/article-cellar-door-01.webp` | (not measured) | Wine pillar mega-menu rail |

**Mean hero weight:** ~280KB. **Worst case:** 491KB. For a mobile hero served eagerly to a 360px-wide screen, that's 4–6× the bandwidth budget. The images are already `.webp` (better than JPEG by ~25%), but they are not served with `srcset`/`sizes` or `<picture>` source sets. Even a single `image-set()` on the CSS background, `image-set(url(...) 1x, url(...-2x) 2x)`, would chop mobile hero weight by 50% to 70%.

### Spot-check: are hero images keyed by URL on Google's image index?

Cannot verify without a Google Search Console API call against the image-search property. PROXY: the `Organization.logo` URL `/images/sourced/home-cover.webp` is the OG image fallback for any article with no explicit hero, including the dog-friendly page that is the site's #1 query magnet (38 + 20 + 11 + 8 = 77 impressions across 4 dog-related queries in the last 28d per `baseline.md`). That fallback dilutes the per-article OG image signal, every fallback article shares the same OG image, which Google Discover de-prioritises.

### Image alt-text spot check

Sample of `<img>` tags from the live homepage HTML:

```
<img src="/images/sourced/article-picnic-01.webp" alt="Mt Eliza Farmers' Market" loading="lazy">
<img src="/images/sourced/spa-alba-thermal-springs-01.webp" alt="Thermal springs pools on the Mornington Peninsula" loading="lazy">
<img src="/images/sourced/article-hatted-restaurants-01.webp" alt="Laura at Pt Leo Estate, the bar with the bay view" loading="lazy">
<img src="/images/sourced/article-cellar-door-01.webp" alt="Ten Minutes by Tractor cellar door, Main Ridge" loading="lazy">
<img src="/images/sourced/article-vineyard-villa-01.webp" alt="Jackalope hotel, Merricks North" loading="lazy">
<img src="/images/sourced/explore-bushrangers-bay-walk-01.webp" alt="Bushrangers Bay walk, late afternoon light" loading="lazy">
<img src="/images/sourced/place-red-hill-01.webp" alt="Vine rows in late-season colour, Red Hill" loading="lazy">
<img class="home-cover__slide is-active" src="/images/sourced/explore-bushrangers-bay-walk-01.webp" alt="Bushrangers Bay on the Mornington Peninsula" loading="eager" fetchpriority="high">
```

**Reading:** alt text is good, descriptive, place-named, written in editorial voice. `loading="lazy"` is consistently applied. `fetchpriority="high"` is applied to the first cover-rotator slide. This is solid. The problem is **only** the CSS-background hero pattern, `<img>` tags inside the V4 mega menu rails and venue cards (where they're emitted as `<img>`) are well-marked.

**On `/places/sorrento/`** (195KB HTML), 7 of 11 `<img>` tags use `loading="lazy"`. The four that don't are mega-menu rails inside the (preloaded) drawer markup, server-rendered but display:none until opened. Acceptable.

### Quick wins on image SEO

| Fix | File | Effort | Impact |
|---|---|---|---|
| Add `<img>` element alongside the CSS background hero on journal/place pages, with `loading="eager"`, `fetchpriority="high"`, `width`/`height`, and the same `alt` from `data.heroImage.alt` | `editorial.ts:360-365` and templates | half-day | Discover eligibility, image-search ranking, LCP layout-shift fix |
| Generate 800w + 1600w renditions of every hero image and serve via `<img srcset>` or CSS `image-set()` | new build step | 1 day | Mobile transfer reduction 40-70% |
| Replace `Organization.logo` with a real square logo asset (≥112×112px) | new asset + `BaseLayout.astro:136`, `schema.ts:5` | half-day | News rich result eligibility, better OG fallback |
| Verify every article in the content collection has an explicit `heroImage.src` and `.alt`. The dog-friendly journal page falls back to `home-cover.webp` because it's hand-coded; the collection-driven pages should not. | content audit (separate task) | day+ | Per-article OG image diversity, Discover signals |

---

## 6. Sitemap quality

### Live sitemap stats (curl https://peninsulainsider.com.au/sitemap.xml, 2026-05-08)

| Metric | Value |
|---|---:|
| Total `<url>` entries | 390 |
| Distinct lastmod dates | 28 |
| Earliest lastmod | 2026-03-15 |
| URL count by section (top 10) | journal 100, whats-on 90, explore 44, fishing 34, eat 27, stay 26, wine 25, places 20, boating 11, escape 6 |
| Duplicate `<loc>` entries | 1 (`/journal/free-things-to-do-mornington-peninsula/`), already known |

### Source

`next/src/pages/sitemap.xml.ts` is a route handler. Key behaviours:

- **lastmod default = TODAY** when the underlying entry has no `publishedAt` date (line 6, 12). This means most hub pages (homepage, /eat/, /wine/, /journal/, /places/, /whats-on/, etc.) emit `<lastmod>2026-05-08</lastmod>` on every build. That signals "everything changed today" and is mildly noisy for crawlers.
- **All paths force a trailing slash** (line 9), `loc` ends in `/`. Consistent with BaseLayout canonicalisation, no slash-variant URLs in the sitemap.
- **Section priority assignment** (lines 83-99): top hubs (`dog-friendly`, `whats-on`, `corporate-events`, `fishing`, `ask`) get priority 1.0; remaining lanes (`eat`, `stay`, `wine`, `explore`, `escape`, `journal`, `places`, `weddings`) get 0.9; sub-hubs (`fishing/species`, `boating/ramps` etc.) get 0.8; pillar Articles get 0.7.
- **Past one-off events are excluded** (line 196), only events with a future end date or a recurrence flag are sitemap-listed. Good hygiene.
- **The /spa/ and /walks/ redirect stubs are excluded** (line 67-71). Good.
- **The /golf/ redirect stub is excluded** (line 72-76, comment 76). Good. /explore/golf/ is sitemap-listed instead.

### Gap vs GSC's 418 known URLs (per baseline)

`baseline.md` reports 418 URLs known to GSC. The current sitemap emits 390. The 28-URL gap is plausibly:
- 8 redirect URLs (per `url-inventory.md` "Page with redirect")
- 4 noindex URLs (per inventory)
- 16 "URL is unknown to Google", these may be in our sitemap but GSC just hasn't crawled them yet
- The remaining gap (~28-(8+4)=16 URLs) is consistent with no-slash variants Google has historically indexed and which we no longer emit

**This is the right behaviour.** A clean trailing-slash-only sitemap is what we want.

### Sitemap-quality findings

| Finding | Severity | Fix |
|---|---|---|
| `<lastmod>` defaults to TODAY for all hub-page entries | P2 | In `sitemap.xml.ts:8`, accept an optional `lastmod` per `entries.push(...)` and pass real publish dates from collection metadata. Use `new Date('2026-04-30')` from CHANGELOG for hub pages until per-hub frontmatter exists. |
| Single duplicate entry (`free-things-to-do-mornington-peninsula`) | P1 | Already on the daily SEO backlog; tracked. Looks like the slug is emitted both from the SEO journal landing pages list (line 121) and from the articles loop (line 156). De-dupe with a Set in the URL helper or use a check before push. |
| One-off events expire from the sitemap once endDate passes, but the static `[slug]` route is generated at build, so the URL still 200s and may be index-eligible | P2 | Either add `noindex` on past one-off event detail pages, or (cheaper) accept it because Google will just demote them naturally |
| Sitemap is monolithic (390 entries in one file), fine for now, but at the projected 1000+ entries it should split into per-section sitemaps with a sitemap index | P3 | Plan when sitemap > 1000 |
| No image sitemap | P2 | Generate `/sitemap-images.xml` listing every editorial hero image with caption + title + license URL. Important once we move heroes from CSS-background to `<img>` (see §5) |
| No news sitemap | P3 | Optional. Worth adding once dispatch frequency is verified > 1/week |

### Robots.txt cross-check

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_astro/

# Block AI training crawlers (GPTBot, CCBot, ClaudeBot, anthropic-ai, Google-Extended,
# Bytespider, Amazonbot)
# Allow citation bots (Googlebot, Bingbot, DuckDuckBot, PerplexityBot, OAI-SearchBot)

Sitemap: https://peninsulainsider.com.au/sitemap.xml
```

**PASS**, sitemap is referenced. Disallows are minimal and correct (`/_astro/` is the build-output directory, properly hidden). The AI-bot disallows are intentional per the project's editorial position.

---

## 7. URL hygiene

### Trailing-slash consistency
`BaseLayout.astro:81-84` normalises every canonical URL to include a trailing slash:

```
const rawPathname = Astro.url.pathname.replace(/^\/V2/, '') || '/';
const normalizedPath = rawPathname === '/' ? '/' : rawPathname.replace(/\/?$/, '/');
const rawCanonical = canonical ?? `${SITE_URL}${normalizedPath}`;
const canonicalUrl = rawCanonical.endsWith('/') ? rawCanonical : rawCanonical + '/';
```

Live verification (curl, 2026-05-08):
- `https://peninsulainsider.com.au/journal/the-birthday-weekend` → `301` → `https://peninsulainsider.com.au/journal/the-birthday-weekend/` ✓
- `https://peninsulainsider.com.au/journal/the-birthday-weekend/` → `200` ✓

GitHub Pages enforces the redirect at the edge, confirmed 301. **Trailing-slash consistency: PASS.**

### HTTP → HTTPS redirect
Live verification: `http://peninsulainsider.com.au/` → `301` → `https://peninsulainsider.com.au/`. **HTTPS enforcement: PASS** (already verified by orchestrator on 2026-05-01).

### WWW vs non-WWW
Live verification: `https://www.peninsulainsider.com.au/` → `301` → `https://peninsulainsider.com.au/`. **www→non-www enforcement: PASS.** Canonical apex is non-WWW, consistent with the `SITE_URL` constant in `BaseLayout.astro:46` and `schema.ts:1`.

### Query-parameter URLs
Spot search of the codebase shows utm parameters are appended to outbound links (escape pages, tour pages, BF analytics) but never to internal canonicals. The site has no on-site filter or pagination URL pattern that uses query strings, filters are client-side JS-only, and pagination doesn't exist (the journal hub renders all stories inline). No internal `?` URL canonical issues.

**One concern:** the WebSite SearchAction `target` (`index.astro:79`) is `https://peninsulainsider.com.au/journal?q={search_term_string}`. The `/journal/` index does not currently parse `?q=`. Either the search overlay URL `/search/?q=` should be used, or `/journal?q=` should respond by populating a search filter. Without this, sitelinks search box if Google ever earns the site one will silently 404-into-no-results.

### Mixed-content / external-script audit
- Two Google Fonts external requests (preconnect + stylesheet), HTTPS, fine
- Google Tag Manager loaded conditionally on consent, HTTPS, fine
- Supabase API URL conditional on signed-in users, HTTPS, fine
- Lenis from `node_modules`, bundled, no external request

No mixed-content risk identified.

### Encoding / language
- `<html lang="en-AU">` ✓
- `<meta http-equiv="content-language" content="en-AU">` ✓
- `<meta property="og:locale" content="en_AU">` ✓
- Charset UTF-8 ✓ (BaseLayout:99)

PASS.

---

## 8. Concrete fix list (prioritised)

### P0, fix this week

1. **Enable PSI v5 monitoring.** Add `ops/scripts/seo/psi-pull.mjs` running weekly via cron, against the 7 representative URLs from §1, with a Cloud-project API key (CrUX project must be enabled). Append rows to `ops/reports/seo/cwv-history.jsonl`. Without this, every monthly audit hits the 429 quota wall. **File:** new `ops/scripts/seo/psi-pull.mjs`. **Effort:** half-day. **Impact:** unlocks the entire technical-SEO performance loop.

2. **Convert journal article and place hero from CSS `background-image` to `<img>` element.** The single biggest discoverable-on-Google upgrade available. Add `<img loading="eager" fetchpriority="high" width=... height=... alt={article.data.heroImage.alt} src={article.data.heroImage.src}>` adjacent to or replacing the current background-image div. Keep the CSS `cover/center` framing via `object-fit: cover`. **Files:** `next/src/pages/journal/[slug].astro:165`, `next/src/components/VenueDetailTemplate.astro` (around the hero block), `next/src/components/PlaceDetailTemplate.astro`. **Effort:** half-day. **Impact:** Discover eligibility, image-search ranking, layout-shift fix on hero.

3. **Add `Product` / `Offer` schema to `/pass/`.** The page is the site's commercial conversion surface and currently has zero rich-result eligibility. Three `Offer` entries (Reader free, Insider paid TBD, Founders limited) plus a parent `Product` (Peninsula Insider Pass). **File:** `next/src/pages/pass.astro` (add a `<script type="application/ld+json">` block). **Effort:** 30 min. **Impact:** rich results for "Mornington Peninsula membership" queries.

4. **Fix the WebSite SearchAction target.** `index.astro:79-80` points at `/journal?q={search_term_string}` which the journal hub does not consume. Change to `https://peninsulainsider.com.au/search/?q={search_term_string}` (the SearchOverlay URL). **File:** `next/src/pages/index.astro:79-80`. **Effort:** 5 min. **Impact:** sitelinks search box behaviour when Google awards one.

### P1, fix this month

5. **Add `ItemList` schema to `/wine/best-cellar-doors/`** to match the pattern at `/eat/best-restaurants/`. **File:** `next/src/pages/wine/best-cellar-doors.astro` (use `buildItemListSchema` from `lib/schema.ts:173`). **Effort:** 30 min. **Impact:** wine commercial-keyword rich-result eligibility.

6. **Add `CollectionPage` + `ItemList` schema to `/wine/`, `/journal/`, `/whats-on/` hubs.** The Eat and Places hubs already do this. **Files:** `next/src/pages/wine/index.astro:90`, `next/src/pages/journal/index.astro` (currently emits no JSON-LD beyond Org+Breadcrumbs), `next/src/pages/whats-on/index.astro`. **Effort:** 1h total. **Impact:** hub-page sitelinks eligibility.

7. **Add a "Special interests" column in the footer rendering `v4FooterNiche`.** The array is already defined (`v4-nav.ts:455-463`) listing golf, spa, fishing, boating, dog-friendly, weddings, corporate-events. The footer currently doesn't render it. Adding it gives every niche hub a global, every-page footer link, direct crawl-priority signal for the lanes Google currently under-indexes. **File:** `next/src/components/Footer.astro:34-65`. **Effort:** 15 min. **Impact:** crawl signal to the niche lanes (mirrors the experiment that bumped sitemap priority for these hubs on 2026-05-05).

8. **Re-write the `dog-friendly-mornington-peninsula.astro` hand-coded page to use the article collection.** Currently the page hardcodes the Article + FAQ schema, hardcodes a no-trailing-slash canonical, falls back to `home-cover.webp` for OG image, and contains 17 em-dashes (project rule violation). Migrating it into `next/src/content/articles/dog-friendly-mornington-peninsula.md` lets it use the collection template and inherit hero, OG image, and freshness signals. **Files:** delete `pages/journal/dog-friendly-mornington-peninsula.astro`; create `content/articles/dog-friendly-mornington-peninsula.md` with proper frontmatter (`heroImage`, `publishedAt`, `updatedAt`, `dek`, `faq`). **Effort:** 1h. **Impact:** the site's #1 query magnet stops drifting from the rest of the editorial chassis.

9. **Lazy-mount lower sections of `/whats-on/`.** The hub renders 90+ EventCard components inline (460KB HTML). Wrap the category-section blocks in a small IntersectionObserver-driven hydration shell so the initial DOM is cut by ~70%. **File:** `next/src/pages/whats-on/index.astro:560-600` (the category sections). **Effort:** half-day. **Impact:** mobile LCP/TBT improvement (PROXY estimate, awaiting PSI confirmation).

10. **Fix the journal article schema-canonical mismatch.** `journal/dog-friendly-mornington-peninsula.astro:17-18` hardcodes `mainEntityOfPage` and `url` in JSON-LD without the trailing slash, while BaseLayout normalises the `<link rel=canonical>` to have one. **File:** `next/src/pages/journal/dog-friendly-mornington-peninsula.astro:17-18`. **Effort:** 5 min. **Impact:** schema/canonical consistency. Resolved automatically once #8 is done.

11. **Add `image` field to TouristDestination schema on `/places/[slug]/`.** **File:** `next/src/pages/places/[slug].astro:297-308`. **Effort:** 5 min. **Impact:** image carousel eligibility for place-page rich results.

12. **Add `image` field to Restaurant/Cafe/Winery schema on `/eat/[slug]/`.** Currently the venue schema has no image at all (`pages/eat/[slug].astro:88-107` builds the schema without `image`). Pull from `venue.data.heroImage.src`. **File:** `next/src/pages/eat/[slug].astro:88-107`. **Effort:** 15 min. **Impact:** Discover eligibility, image-rich-result eligibility on every venue page.

13. **De-duplicate the journal sitemap entry for `free-things-to-do-mornington-peninsula`.** The slug is emitted from both the explicit SEO list (`sitemap.xml.ts:121`) and the journal articles loop (`sitemap.xml.ts:156`). Either skip the SEO list entry when an article exists with the same slug, or use a `Set<string>` of `loc` values before push. **File:** `next/src/pages/sitemap.xml.ts`. **Effort:** 15 min.

14. **Generate 800w + 1600w renditions of editorial hero images.** The mean hero is ~280KB. A two-rendition `<picture>` source set or CSS `image-set()` halves mobile transfer. Astro can do this via the `<Image>` component, or a build script can generate offline. **Files:** new `scripts/build-hero-renditions.mjs`, plus update the templates that consume hero src. **Effort:** 1 day. **Impact:** mobile LCP improvement (PROXY-estimated 40–70% transfer reduction on hero).

### P2, backlog

15. **Replace `Organization.logo` asset with a real square logo (≥112×112px).** Currently uses `home-cover.webp` (a hero photograph). Required for News rich results when the site eventually qualifies. **Files:** new `/public/images/logo.png`, then `BaseLayout.astro:136` and `schema.ts:5`. **Effort:** half-day (asset creation + replace).

16. **Add `noindex` to past one-off event detail pages.** The static `[slug]` route generates pages for every event but the sitemap excludes past events. Add a build-time check in `whats-on/[slug].astro` that emits `noindex={pastDateAndOneOff}`. **File:** `next/src/pages/whats-on/[slug].astro`. **Effort:** 30 min.

17. **Audit content collection hero images.** Verify every article, venue, place has `heroImage.src` and `heroImage.alt` populated and not pointing at a placeholder. Currently `eat/[slug].astro:73-75` and others have a `placeholder` check that falls back to `home-cover.webp`, track which entries fall back. **Effort:** 1 day (data-quality audit).

18. **Add image sitemap.** Once heroes are converted to `<img>`, generate `/sitemap-images.xml` listing every editorial hero with caption + license. **File:** new `pages/sitemap-images.xml.ts`. **Effort:** half-day.

19. **Configure RUM via `web-vitals` JS library.** Site traffic is below the CrUX threshold so PSI field data is unavailable. Adding 75 lines of `web-vitals` JS that posts LCP/INP/CLS to a Supabase RPC gives per-URL RUM 6 months earlier than CrUX would. **File:** new `next/src/components/WebVitalsReporter.astro`, mount in `BaseLayout.astro` after the body tag. **Effort:** half-day. **Impact:** real per-URL CWV data starting next deploy.

20. **Compute lastmod from real publish/update dates for hub pages.** Currently `sitemap.xml.ts:6` uses `TODAY` as the default. Hubs aren't actually changing daily; signalling otherwise is mildly noisy. **File:** `next/src/pages/sitemap.xml.ts`. **Effort:** 30 min.

### P3, nice-to-have

21. Add `BreadcrumbList` to homepage (Google infers; spec-strict only). **Effort:** 15 min.

22. Plan sitemap-index split when entry count crosses 1000. **Effort:** half-day when triggered.

23. Track tap-target spacing on the V4 mobile drawer with a one-off real-device QA. **Effort:** 1h.

24. Add a `font-display: swap` override on the Google Fonts request to remove the FCP block. The `display=swap` parameter is already in the URL (`BaseLayout.astro:105`). PROXY-verified. **No fix needed**, was a false suspect; documenting that we checked.

---

## Appendix A, Files referenced (clickable from IDE)

- `next/src/layouts/BaseLayout.astro:46`, SITE_URL constant
- `next/src/layouts/BaseLayout.astro:81-84`, canonical normalisation (trailing-slash enforce)
- `next/src/layouts/BaseLayout.astro:100`, viewport meta
- `next/src/layouts/BaseLayout.astro:131-137`, Organization JSON-LD (global)
- `next/src/layouts/BaseLayout.astro:153-187`, gtag consent gate
- `next/src/layouts/BaseLayout.astro:506-540`, Lenis smooth-scroll RAF loop
- `next/src/components/Breadcrumbs.astro:45-57`, BreadcrumbList JSON-LD emitter
- `next/src/components/Footer.astro:34-65`, footer department + place link rendering
- `next/src/components/HomeCover.astro:84-100`, homepage hero rotator (5 images, eager-loaded)
- `next/src/lib/editorial.ts:360-365`, `heroBackgroundStyle` (CSS background-image helper, the §5 root-cause)
- `next/src/lib/schema.ts:25-93`, `buildWinerySchema`
- `next/src/lib/schema.ts:140-151`, `buildBreadcrumbSchema`
- `next/src/lib/schema.ts:173-207`, `buildItemListSchema`
- `next/src/lib/schema.ts:218-237`, `buildCollectionPageSchema`
- `next/src/lib/schema.ts:252-287`, `buildTouristDestinationSchema` (no image field)
- `next/src/lib/schema.ts:600-631`, `buildArticleSchema`
- `next/src/lib/schema.ts:700-765`, `buildFishingLocationSchema` (best-instrumented vertical)
- `next/src/lib/v4-nav.ts:445-453`, `v4FooterDepartments`
- `next/src/lib/v4-nav.ts:455-463`, `v4FooterNiche` (currently unused by Footer.astro)
- `next/src/pages/index.astro:70-112`, homepage WebSite + SearchAction + FAQPage schemas
- `next/src/pages/index.astro:79-80`, SearchAction target (the `/journal?q=` mismatch)
- `next/src/pages/sitemap.xml.ts:6`, TODAY lastmod default
- `next/src/pages/sitemap.xml.ts:9`, trailing-slash enforce
- `next/src/pages/sitemap.xml.ts:67-99`, section priority assignment
- `next/src/pages/sitemap.xml.ts:121-127`, SEO journal pages list
- `next/src/pages/sitemap.xml.ts:155-157`, articles loop (duplicate-emission source)
- `next/src/pages/sitemap.xml.ts:191-198`, past-event sitemap exclusion
- `next/src/pages/journal/[slug].astro:75-109`, Article + FAQ schema (collection-driven)
- `next/src/pages/journal/[slug].astro:165`, hero rendered as background-image
- `next/src/pages/journal/dog-friendly-mornington-peninsula.astro:17-18`, hardcoded no-slash mainEntityOfPage
- `next/src/pages/journal/dog-friendly-mornington-peninsula.astro:68`, hardcoded no-slash canonical
- `next/src/pages/eat/[slug].astro:78-107`, venue schema build (no `image`)
- `next/src/pages/eat/[slug].astro:70-72`, winery-on-eat-URL canonical to /wine/
- `next/src/pages/wine/[slug].astro:72-84`, wine venue schema build (full graph)
- `next/src/pages/places/[slug].astro:297-308`, TouristDestination schema (no `image`)
- `next/src/pages/whats-on/[slug].astro:70`, Event schema (delegates to events.ts)
- `next/src/pages/whats-on/index.astro:279-571`, 90+ EventCard inline renders
- `next/src/pages/fishing/locations/[slug].astro:21`, buildFishingLocationSchema
- `next/src/pages/pass.astro`, only Organization + BreadcrumbList; missing Product/Offer
- `ops/reports/seo/baseline.md`, May 1 frozen baseline
- `ops/reports/seo/url-inventory.md`, 418-URL inventory
- `ops/reports/seo/daily-log.md`, daily SEO operation
- `ops/reports/seo/experiments.md`, experiment ledger

---

## Appendix B, What this audit did NOT cover

These are deliberately scoped out, either because the daily SEO loop already covers them or because they belong in other audits (content quality, ad firewall, accessibility) running this month:

- Indexation deltas vs prior month
- Canonical correctness on each priority URL (the daily loop confirms 14/14 PASS)
- HTTPS enforcement (already verified 2026-05-01)
- The known sitemap duplicate (already on the daily backlog)
- Content quality, voice, brand-rule adherence (a separate audit)
- Backlink profile / referring domains (not a technical-SEO concern; covered by SEO ops separately)
- Accessibility (WCAG) audit (out of scope for this file; tap-target spacing flagged as a single line for visual QA)
- Editorial cadence and dispatch quality
- Concierge / Ask PI availability
- Ad firewall / commercial labelling

The boundaries here are intentional. This audit's job is the technical chassis. The chassis is in better shape than the headline indexation numbers imply, but the §5 finding (CSS-background hero) is the single highest-leverage technical-SEO upgrade still available.

---

## Appendix C, Verification commands (replay this audit)

Every finding in §1 to §7 is replayable. The orchestrator can re-run any block individually. All commands assume the audit machine has `curl` and a network path to peninsulainsider.com.au.

### Schema audit (replay §2)

Count and list the JSON-LD `@type` values on a single URL:

```
curl -sL https://peninsulainsider.com.au/journal/dog-friendly-mornington-peninsula/ \
  | grep -oE '"@type":"[^"]+"' | sort -u
```

Count JSON-LD blocks on the 15 representative URLs:

```
for url in \
  "https://peninsulainsider.com.au/" \
  "https://peninsulainsider.com.au/journal/dog-friendly-mornington-peninsula/" \
  "https://peninsulainsider.com.au/eat/best-restaurants/" \
  "https://peninsulainsider.com.au/places/sorrento/" \
  "https://peninsulainsider.com.au/wine/best-cellar-doors/" \
  "https://peninsulainsider.com.au/whats-on/" \
  "https://peninsulainsider.com.au/whats-on/mornington-cup-2026/" \
  "https://peninsulainsider.com.au/eat/polperro/" \
  "https://peninsulainsider.com.au/wine/polperro/" \
  "https://peninsulainsider.com.au/fishing/locations/rye-pier/" \
  "https://peninsulainsider.com.au/pass/" \
  "https://peninsulainsider.com.au/places/" \
  "https://peninsulainsider.com.au/journal/" \
  "https://peninsulainsider.com.au/eat/" \
  "https://peninsulainsider.com.au/wine/" ; do
  count=$(curl -sL "$url" | grep -oE '<script type="application/ld\+json"' | wc -l)
  printf "%-3d %s\n" "$count" "$url"
done
```

### Page weight + resource count (replay §1 proxy)

```
for url in \
  "https://peninsulainsider.com.au/" \
  "https://peninsulainsider.com.au/journal/dog-friendly-mornington-peninsula/" \
  "https://peninsulainsider.com.au/eat/best-restaurants/" \
  "https://peninsulainsider.com.au/places/sorrento/" \
  "https://peninsulainsider.com.au/wine/best-cellar-doors/" \
  "https://peninsulainsider.com.au/whats-on/" \
  "https://peninsulainsider.com.au/pass/"; do
  result=$(curl -sL -o /tmp/page-test.html \
    -w "%{size_download}|%{time_starttransfer}|%{http_code}" "$url")
  imgs=$(grep -oE '<img[^>]*>' /tmp/page-test.html | wc -l)
  scripts=$(grep -oE '<script' /tmp/page-test.html | wc -l)
  echo "${url}|${result}|imgs=${imgs}|scripts=${scripts}"
done
```

### Hero-image weight check (replay §5 weight table)

```
for img in \
  /images/sourced/home-cover.webp \
  /images/sourced/place-sorrento-01.webp \
  /images/sourced/spa-alba-thermal-springs-01.webp \
  /images/sourced/place-rye-01.webp \
  /images/sourced/explore-bushrangers-bay-walk-01.webp \
  /images/sourced/article-picnic-01.webp ; do
  bytes=$(curl -sIL https://peninsulainsider.com.au${img} \
    | grep -i '^content-length:' | head -1 | tr -d '\r' | awk '{print $2}')
  echo "${bytes} bytes  ${img}"
done
```

### Internal link density (replay §4 hub link counts)

```
for hub in journal whats-on eat wine places explore ; do
  count=$(curl -sL https://peninsulainsider.com.au/${hub}/ \
    | grep -oE "<a href=\"/${hub}/[^\"]+\"" | sort -u | wc -l)
  echo "/${hub}/ → ${count} unique internal links"
done
```

### Sitemap stats (replay §6 totals)

```
curl -sL https://peninsulainsider.com.au/sitemap.xml | grep -c '<url>'
curl -sL https://peninsulainsider.com.au/sitemap.xml | grep -oE '<loc>[^<]+</loc>' | sort | uniq -d
curl -sL https://peninsulainsider.com.au/sitemap.xml \
  | grep -oE '<loc>[^<]+' | sed 's|<loc>||' \
  | grep -E '^https://peninsulainsider.com.au/(eat|wine|journal|places|whats-on|explore|escape|stay|fishing|boating)/' \
  | awk -F'/' '{print $4}' | sort | uniq -c | sort -rn
```

### Trailing-slash, HTTPS, WWW redirects (replay §7)

```
curl -sIL https://peninsulainsider.com.au/journal/the-birthday-weekend | head -3
curl -sIL http://peninsulainsider.com.au/ | head -3
curl -sIL https://www.peninsulainsider.com.au/ | head -3
```

### PSI v5 lab + field data (when quota allows)

```
curl -sL "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://peninsulainsider.com.au/&strategy=mobile&category=performance&key=$PSI_KEY" \
  | jq '{
      score: .lighthouseResult.categories.performance.score,
      lcp: .lighthouseResult.audits["largest-contentful-paint"].displayValue,
      tbt: .lighthouseResult.audits["total-blocking-time"].displayValue,
      cls: .lighthouseResult.audits["cumulative-layout-shift"].displayValue,
      field: .loadingExperience.metrics
    }'
```

This audit hit the daily quota; document and deferred. The orchestrator should set `PSI_KEY` and add the call to `psi-pull.mjs`.

---

## Appendix D, Schema-vs-spec gap matrix (full)

This matrix shows every recommended schema field per template, and which are present. P1/P2 fixes from §8 reference these gaps.

### `Article` (used on `/journal/[slug]/`, `/journal/dog-friendly-mornington-peninsula/`, fishing-vertical articles)

| Recommended field | Present (collection-driven journal) | Present (hand-coded dog-friendly) | Notes |
|---|---|---|---|
| `headline` | ✓ | ✓ | |
| `description` | ✓ | ✓ | |
| `datePublished` | ✓ | ✓ | |
| `dateModified` | ✓ (when `updatedAt` set) | ✗ | Hand-coded page misses it |
| `author` | ✓ Organization | ✓ Organization | Could promote to Person where author is named |
| `publisher` | ✓ | ✓ | Logo points at hero (see §2 P2 #15) |
| `image` | ✓ when not placeholder | ✗ | Hand-coded misses it |
| `mainEntityOfPage` | ✓ trailing-slash | ✗ no-slash | Mismatch with canonical (P1 fix #10) |
| `url` | ✓ trailing-slash | ✗ no-slash | Same |
| `articleSection` | ✗ | ✗ | Could populate from `format` field |
| `keywords` | ✗ | ✗ | Could populate from `tags` array |

### `Restaurant` / `Cafe` / `Bakery` / `BarOrPub` / `Winery` (`/eat/[slug]/`)

| Recommended | Present | Notes |
|---|---|---|
| `name` | ✓ | |
| `description` | ✓ | |
| `address` (PostalAddress) | ✓ | streetAddress, addressRegion, addressCountry |
| `geo` (GeoCoordinates) | ✓ | |
| `url` (external website) | ✓ when set | |
| `telephone` | ✓ when set | |
| `priceRange` | ✓ when set | |
| `image` | **✗** | P1 fix #12 |
| `servesCuisine` (Restaurant) | ✗ | Could populate |
| `acceptsReservations` | ✗ on `/eat/` (✓ on `/wine/[slug]` Restaurant inner schema) | |
| `openingHoursSpecification` | ✗ on `/eat/` (✓ on `/wine/[slug]` Winery schema when `data.visiting.openingHours` set) | |
| `aggregateRating` | ✗ (intentional, no AggregateRating per ACCC editorial integrity) | |
| `review` | ✗ (could surface editorVerdict, `/wine/[slug]` does this) | |

### `Winery` / `LocalBusiness` (`/wine/[slug]/`)

`buildWinerySchema` in `lib/schema.ts:25-93` is the most complete venue schema in the codebase. Includes multi-type `['Winery', 'LocalBusiness']`, `sameAs` (MPVA + Halliday URLs), `image`, full `address`, `geo`, `areaServed`, `telephone`, `priceRange`, `knowsAbout`, optional `openingHoursSpecification`, optional `review`. **No gaps to flag for the wine vertical.**

### `Event` (`/whats-on/[slug]/`)

`eventJsonLd` in `lib/events.ts` produces a complete graph: Event + Offer + Place + GeoCoordinates + organizer + image when present. **No gaps.**

### `TouristDestination` (`/places/[slug]/`)

| Recommended | Present | Notes |
|---|---|---|
| `name` | ✓ | |
| `description` | ✓ | from `place.data.intro` |
| `geo` | ✓ when set | |
| `url` | ✓ | |
| `address` | **✗** | could add addressLocality, addressRegion |
| `image` | **✗** | P1 fix #11 |
| `containsPlace` | **✗** | could link the venues filed under this town |
| `touristType` | ✗ | optional |

### `CollectionPage` + `ItemList` (hub pages)

| Hub | CollectionPage | ItemList | Status |
|---|---|---|---|
| `/eat/` | ✓ | ✓ | Solid |
| `/wine/` | ✗ | ✗ | P1 fix #6 |
| `/places/` | ✓ | ✗ (could add) | Acceptable |
| `/journal/` | ✗ | ✗ | P1 fix #6 |
| `/whats-on/` | ✗ | ✗ | P1 fix #6 |
| `/explore/` | not audited live | | |
| `/escape/` | not audited live | | |
| `/stay/` | not audited live | | |

### `Product` / `Offer` / `Service` (commercial pages)

| Page | Schema | Status |
|---|---|---|
| `/pass/` | None (only Organization + Breadcrumbs) | P0 fix #3 |
| `/tour/[slug]/` | TouristTrip + Service + Offer | Solid (per `lib/schema.ts:425-484`) |
| `/tour-packages/[slug]/` | TouristTrip + AggregateOffer | Solid |
| `/partners/apply/` | not audited | likely fine, not commercial-conversion |

---

## Appendix E, Linking-density follow-ups

### Discovered-not-indexed URLs sorted by inbound link count

For the next monthly SEO loop. The 9 journal slugs in §4 with only 1 inbound link from `/journal/` are the highest-priority cross-link targets:

```
the-birthday-weekend                     1 inbound
rainy-day-peninsula                       1 inbound
the-spring-peninsula                      1 inbound
the-sunset-hour                           1 inbound
mornington-peninsula-itinerary            1 inbound
the-peninsula-orientation-drive           4 inbound  (less urgent)
the-producer-trail                        3 inbound  (less urgent)
the-sunset-drink                          3 inbound  (less urgent)
best-spas-mornington-peninsula            3 inbound  (less urgent)
```

### Suggested cross-link mappings (P2 backlog, half-day to ship)

| From article (high-traffic / indexed) | To unindexed article | Rationale |
|---|---|---|
| `/journal/dog-friendly-mornington-peninsula/` | `/journal/rainy-day-peninsula/` | Same audience, weather-flexible plan |
| `/journal/the-thermal-springs-weekend/` | `/journal/the-spring-peninsula/`, `/journal/best-spas-mornington-peninsula/` | Adjacent topic clusters |
| `/journal/the-cellar-door-short-list/` | `/journal/mornington-peninsula-winery-tour/`, `/journal/the-producer-trail/` | Cross-link inside the wine cluster |
| `/journal/three-italian-dinners/` | `/journal/breakfast-before-the-crowds/`, `/journal/where-to-eat-without-a-booking/` | Eat-cluster horizontal linking |
| `/journal/the-pub-guide/` | `/journal/the-pub-crawl/`, `/journal/the-friday-night-arrival/` | Pub cluster |
| `/journal/mornington-peninsula-day-trip/` | `/journal/mornington-peninsula-itinerary/`, `/journal/the-four-hour-peninsula/` | Itinerary cluster |
| `/journal/the-couples-weekend/` | `/journal/the-birthday-weekend/`, `/journal/the-vineyard-villa-weekend/` | Romantic-weekend cluster |

Where a "from" article has a `relatedArticles` frontmatter list (`pickRelatedArticles` pattern in `journal/[slug].astro:41`), the suggestion is to add the unindexed slug to that list. The 6-slot related-rail bump that landed 2026-05-05 (per the comment at `journal/[slug].astro:41-45`) makes room for these.

### A "linking depth" metric for the daily SEO loop

The daily loop could compute, for each Discovered-not-indexed URL, the count of unique inbound internal links from indexed pages. Track the metric over time. URLs whose inbound count rises but indexation status doesn't change after a month are candidates for content quality intervention rather than crawl-signal fixes.
