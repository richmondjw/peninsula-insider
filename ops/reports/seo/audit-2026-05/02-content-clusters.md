# 02, Content clusters & search-intent alignment

Date: 2026-05-08
Author: Claude (audit-2026-05)
Inputs: `ops/reports/seo/baseline.md`, `url-inventory.md`, `daily-log.md` (May 1 to May 4 entries), `experiments.md`, full `next/src/pages/*` and `next/src/content/*` tree.

The site is 1052 built pages. GSC sees 418 known URLs; of those, 233 (56%) are PASS, 140 (33%) are Discovered-not-indexed, 17 are alternate-canonical, 16 are unknown, 8 are redirects, 4 are noindex (`url-inventory.md:6-15`). Last 28 days: 29 clicks, 2,873 impressions, 1.01% CTR, position 16.8 (`daily-log.md:521-527`).

The dataset shows a site that has solved indexation for its priority spine (14/14 priority URLs PASS by 2026-05-04, `daily-log.md:529-547`) but still has long-tail clusters that are flat (no hub spokes), thin on internal links, or stranded behind broken navigation. This document maps every cluster, scores intent alignment for the queries that actually drive impressions, and prescribes specific links and new pages to write.

---

## 1. Cluster map (overview table)

| # | Cluster | Built URLs (est.) | Indexed (PASS) | Discovered | Spine | Spine indexed? | Top performer (clicks/impr last 28d) |
|---|---|---:|---:|---:|---|---|---|
| 1 | Town hubs (`/places/`) | 21 | 10 | 11 | `/places/` listing | Discovered | `/places/flinders/` (0 / minor) |
| 2 | Eat (`/eat/`) | ~35 | 18 | 14 | `/eat/best-restaurants/` | PASS | `/eat/` (2 / 183) |
| 3 | Wine (`/wine/`) | ~30 | 13 | 13 | `/wine/best-cellar-doors/` | PASS | `/wine/` (1 / 289) |
| 4 | Stay (`/stay/`) | ~10 | 6 | 0 | `/stay/best-accommodation/` | PASS | `/stay/` (0 / 95) |
| 5 | Explore (`/explore/`) | ~52 | 9 | 32 | `/explore/best-walks/` | PASS | `/explore/` (0 / 0 reported) |
| 6 | Escape (`/escape/`) | 6 | 1 | 5 | `/escape/` listing | Discovered | `/escape/the-peninsula-golf-weekend/` |
| 7 | Journal (`/journal/`) | ~110 | 38 | 58 | `/journal/` archive | (PASS) | `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` (3 / 47) |
| 8 | Fishing (`/fishing/`) | ~30 | 28 | 1 | `/fishing/` hub | PASS | `/fishing/locations/point-leo-beach/` (2 / 8) |
| 9 | Boating (`/boating/`) | 8 | 8 | 0 | `/boating/` hub | PASS | (no clicks yet) |
| 10 | Dog-friendly | ~7 articles + hub | 4 articles | 1 hub + 3 sibling articles | `/dog-friendly/` | Discovered | `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` (3 / 47) |
| 11 | What's On (`/whats-on/`) | ~85 | 84 | 1 (the hub) | `/whats-on/` listing | Discovered | `/whats-on/mornington-cup-2026` (1 / 230) |
| 12 | Awards (`/awards/`) | 11 (1 + 9 cats + nominate) | 0 directly observed | 0 directly observed (likely unknown) | `/awards/` | Unknown | (no impressions reported) |
| 13 | Commercial spine (Pass / Submit / Newsletter / Ask / Itinerary / Partners) | ~10 | ~3 | 4 | none coherent | mixed | (none ranking) |
| 14 | Niche (Golf / Spa / Tour / Weddings / Corporate / Insiders 30 / Alerts) | ~15 | 1 (`/weddings/`) | 4-5 | each uses its own index | mostly Discovered | (no clicks yet) |

Counts are derived from `url-inventory.md` (GSC-known set of 418), then cross-referenced with the built-page tree under `next/src/pages/*`. Cluster totals exceed indexed+discovered counts where pages exist but were not surfaced to GSC at the inspection time on 2026-05-05.

---

## 2. Cluster-by-cluster detail

### 2.1 Town hubs (`/places/`), flagship cluster, indexation just stabilised

**Built URLs**: 21 (`/places/` index + 20 town slugs from `next/src/content/places/*.json`).

**Indexed (10)**: `/`, `/places/flinders/`, `/places/hastings/`, `/places/main-ridge/`, `/places/mornington/`, `/places/portsea/`, `/places/red-hill/`, `/places/rye/`, `/places/safety-beach/`, `/places/sorrento/` (`url-inventory.md:133-142`). The `/places/red-hill` no-slash variant is also indexed; this is a known http/slash duplicate the site is consolidating via the May 1 HTTPS-enforce change.

**Discovered, not indexed (11)**: `/places/`, `/places/balnarring/`, `/places/cape-schanck/`, `/places/dromana/`, `/places/merricks/`, `/places/moorooduc/`, `/places/mount-martha/`, `/places/point-nepean/`, `/places/rosebud/`, `/places/shoreham/`, `/places/tuerong/` (`url-inventory.md:372-382`).

**Spine**: `/places/` is the listing hub. It is itself **Discovered, not indexed** despite linking to all 20 children. This blocks crawl flow into the half of the cluster Google has not yet indexed.

**Top performer last 28d**: `/places/flinders/` is the only place hub generating notable impressions; the `/places/` hub has been earning impressions since May 1 (the experiment 2026-05-01-01 fix unblocked the cluster).

**Coverage gaps**:
- 9 town hubs are built but not yet indexed; pattern matches Phase 1 of indexation, where hubs that are linked only from `/places/` index don't get crawl signal because the index is itself unindexed.
- `/places/blairgowrie/` JSON exists in `next/src/content/places/blairgowrie.json` but no page is reaching GSC; check it's emitting from `[slug].astro`.

**Internal-linking pattern**: hub-and-spoke. `[slug].astro:80-89` cross-links 4 related articles per place via tag/title match. Articles do NOT consistently link back to the place hub. This is the missing return-link.

**Action**: lift `/places/` index to indexed (sitemap priority + a contextual link from `/journal/dog-friendly-mornington-peninsula/` in the body and from `index.astro:51-54` (places rail). Add a one-line "More on Sorrento → /places/sorrento/" link to every journal article whose tag list includes a town slug.

### 2.2 Eat (`/eat/`), high-impression listing pages, weak venue conversion

**Built URLs**: ~35 (1 hub + 18 venue pages indexed + 14 unindexed wineries/specialty + 14 thematic listicles like `/eat/cellar-door-lunch.astro`, `/eat/hatted-restaurants.astro`, etc).

**Indexed venues (per `url-inventory.md:31-49`)**: bistro-elba, elan-vineyard, flinders-general-store, flinders-pier-takeaway, kerri-greens, la-baracca-tgallant, merricks-general-wine-store, ouest-france-bistro, pho-rosebud, point-leo-wine-terrace, polperro, port-phillip-estate, sorrento-gelato, sorrento-hotel, sourdough-kitchen, the-rocks-mornington, yabby-lake. **Plus** the `/eat/` hub and `/eat/best-restaurants/` (the canonical spine).

**Discovered, not indexed (14)**: every "winery-as-restaurant" page (crittenden-estate, eldridge-estate, foxeys-hangout, hurley-vineyard, kooyong, montalto, moorooduc-estate, paradigm-hill, paringa-estate, pt-leo-estate, quealy-winemakers, red-hill-estate, t-gallant, ten-minutes-by-tractor, willow-creek-vineyard) (`url-inventory.md:260-274`).

**Spine**: `/eat/best-restaurants/` is correctly canonical and PASS. `/eat/` itself has 183 impressions over last 28d at position 36.3 with 2 clicks, 1.09% CTR (`daily-log.md:594`) - high-volume low-rank, classic page-2 tail.

**Top performer**: `/eat/` listing (183 impr / 2 clicks). `/eat/pho-rosebud/` ranks position 7.6 with 57 impressions and 0% CTR (`daily-log.md:613`) - snippet failure on a top-of-page-1 page.

**Coverage gaps**:
- The 14 unindexed winery pages are now resolved by experiment 2026-05-05-03 (the canonical now points to `/wine/{winery}/`). They will deindex from `/eat/` over coming weeks; this is the desired state, not a gap.
- Thematic listicles `/eat/cellar-door-lunch.astro`, `/eat/hatted-restaurants.astro`, `/eat/long-lunch.astro`, etc are indexable but absent from `url-inventory.md` - they may not be in sitemap, or they're not reaching GSC. Verify in `sitemap.xml.ts`.
- Query "best restaurants in mornington peninsula" gets 14 impressions at position 46.4 (`daily-log.md:572`). The page exists at `/eat/best-restaurants/` but is at page 4-5, not page 1.

**Internal-linking pattern**: hub-and-spoke. `eat/[slug].astro:24-28` shows up to 3 related venues filtered by place. Articles cross-link to venues via `relatedVenues` ref arrays. The hub is indexed but isn't getting click-through, suggesting snippet failure plus weak SERP rank.

**Action**: rewrite `/eat/best-restaurants/` title/meta to compete against Broadsheet/Visit Mornington Peninsula for "best restaurants mornington peninsula" (currently at page 5). Add an FAQ block to `/eat/` (already in homepage; not yet on `/eat/` hub).

### 2.3 Wine (`/wine/`), biggest impression-volume cluster, lowest CTR

**Built URLs**: ~30 (`/wine/` hub + `/wine/best-cellar-doors/` + 13 indexed venues + 13 unindexed venues + 6 sub-region/varietal pages).

**Indexed (13 venues + 2 hubs)**: avani-wines, circe-wines, dexter-wines, eldridge-estate, mornington-peninsula-cider, ocean-eight, onannon, paradigm-hill, polperro, red-hill-cheese, stonier-wines (`url-inventory.md:240-251`), plus `/wine/`, `/wine/best-cellar-doors/`.

**Discovered, not indexed (13)**: foxeys-hangout, kooyong, montalto, moorooduc-estate, paringa-estate, port-phillip-estate, pt-leo-estate, quealy-winemakers, red-hill-estate, t-gallant, ten-minutes-by-tractor, willow-creek-vineyard, yabby-lake (`url-inventory.md:384-396`).

**Spine**: `/wine/best-cellar-doors/` PASS. `/wine/` hub is the highest-impression cluster on the entire site at 289 impressions, 0.35% CTR, position 21.3 over last 28d (`daily-log.md:607`).

**Coverage gaps**:
- 13 of the 26 cellar-door venue pages are stuck "Discovered". This is the same 14 winery pattern from /eat/. Now that experiment 2026-05-05-03 routes /eat/winery → canonical /wine/winery, the /wine/ versions should pick up signal that was previously split.
- Sub-region pages (`/wine/red-hill.astro`, `/wine/balnarring.astro`, `/wine/main-ridge.astro`, `/wine/merricks.astro`, `/wine/flinders.astro`, `/wine/moorooduc-tuerong.astro`) and varietal pages (`/wine/chardonnay.astro`, `/wine/pinot-noir.astro`) are not in the GSC inventory, verify they are in `sitemap.xml.ts`.
- `/wine/best-wineries-mornington-peninsula.astro` looks like a duplicate of `/wine/best-cellar-doors/`; if so, consolidate to one canonical.

**Internal-linking pattern**: spine to spokes via `/wine/best-cellar-doors/`. Spokes do not return-link strongly.

**Action**: add `/wine/best-cellar-doors/` and the four sub-region hubs (red-hill, balnarring, main-ridge, merricks) as cluster links from every `/wine/{venue}/` page. The `/journal/the-chardonnay-case/` article is a top of page 1 ranker (position 5.6, 71+55 impressions, 0% CTR) and links nowhere structural; add a return-link block from it to the wine hub spine.

### 2.4 Stay (`/stay/`), high impressions, weak indexation depth

**Built URLs**: ~10 (1 hub + 1 spine + 6 venue pages + 1 dog-friendly subhub).

**Indexed (6 venues + 2 hubs)**: `/stay/`, `/stay/best-accommodation/`, `/stay/crittenden-villas`, `/stay/dog-friendly/`, `/stay/endota-spa-sorrento`, `/stay/peninsula-hot-springs-glamping/`, `/stay/sorrento-coastal-retreat/` (`url-inventory.md:143-149`).

**Unknown to Google (4)**: `/stay/hotel-sorrento`, `/stay/port-phillip-estate` and slash variants (`url-inventory.md:430-433`). The `http://peninsulainsider.com.au/stay/hotel-sorrento` zombie URL has been collecting 109 impressions at 0% CTR / position 53.7 (`daily-log.md:611`). It should consolidate to https with the May 1 enforcement, but Google's not picked up the new state for these URLs yet.

**Spine**: `/stay/best-accommodation/` (indexed, 65-68 impr at 0% CTR).

**Top performer**: `/stay/` (95-106 impressions, 0% CTR, position 27-29; `daily-log.md:603`).

**Coverage gaps**:
- Only 6 venue pages exist for an entire accommodation cluster. The Peninsula has 50+ stay-worthy venues; this cluster is materially under-built.
- High-impression but unranked queries: "accommodation near peninsula hot springs" (16-19 impressions at position 67.8), "hotel near sorrento pier booking" (15 impr, position 65.9), "5 star accommodation/hotel mornington peninsula", "best places to stay mornington peninsula" (8-9 impr at position 49). Each represents transactional intent the site can serve but isn't ranking for.

**Internal-linking pattern**: hub plus dog-friendly sub-hub. Few articles link directly to stay venues.

**Action**: most expensive cluster gap. See "Content gaps" section below for specific articles.

### 2.5 Explore (`/explore/`), 32 unindexed pages, the largest single deficit

**Built URLs**: ~52 (1 hub + 1 spine + ~50 walks/beaches/golf/galleries).

**Indexed (9)**: `/explore/`, `/explore/balnarring-beach/`, `/explore/beaches/`, `/explore/best-walks/`, `/explore/bushrangers-bay-walk/`, `/explore/montalto-sculpture-trail/`, `/explore/safety-beach-foreshore/`, `/explore/sea-search-encounters`, `/explore/st-andrews-beach-golf-course`, `/explore/walks/` (`url-inventory.md:51-60`).

**Discovered, not indexed (32)**: arthurs-seat-lookout, cape-schanck-boardwalk, cape-schanck-lighthouse-walk, coastal-walk-cape-schanck, coppins-track, dromana-beach, eagle-ridge-golf-course, farnsworth-track, flinders-golf-club, greens-bush-two-bays-section, gunnamatta-ocean-beach, moonah-links, mornington-foreshore-walk, mornington-golf-club, mornington-peninsula-gallery, mount-martha-beach, point-nepean-fort-walk, point-nepean-national-park, portsea-front-beach, portsea-golf-club, pt-leo-sculpture-park, racv-cape-schanck-golf-course, red-hill-hinterland-cycling, red-hill-market, sorrento-back-beach, sorrento-ferry, sorrento-golf-club, sorrento-ocean-baths, summit-circuit-arthurs-seat, the-dunes-golf-links, the-national-golf-club, two-bays-walking-track (`url-inventory.md:280-311`).

**Spine**: `/explore/best-walks/` PASS.

**Top performer**: query "free things to do in mornington peninsula" hits the `/journal/free-things-to-do-mornington-peninsula/` page at 16 impr/position 20.3 (`daily-log.md:564`). The `/explore/` hub gets minimal traffic.

**Coverage gaps**:
- Same Phase-1 indexation pattern as /places/ pre-fix: spokes are linked from a hub but the hub itself doesn't carry the contextual body-link signal Google needs.
- Golf cluster (10 courses) is sub-merged inside `/explore/`. Should it be its own `/golf/` cluster? `/golf/` is currently a noindex redirect-stub (per `daily-log.md:669`); the canonical golf hub is `/explore/golf/`. This is messy. Pick one path.
- Sub-region page `/explore/walks/` is indexed; the per-walk pages mostly aren't. Apply the related-articles experiment pattern to walks: bump the related-articles limit on `/journal/walks-bushrangers-bay-walk-guide/` and other indexed walk articles to surface the 32 unindexed siblings.

**Internal-linking pattern**: hub-and-spoke nominal, but the spokes are isolated. Add walk pages as related links from the indexed walk-articles.

**Action**: replicate experiment 2026-05-05-02 (journal internal linking) for walks. Pick 4 indexed source articles (`/journal/walks-bushrangers-bay-walk-guide/`, `/journal/cape-schanck-guide/`, `/journal/point-nepean-national-park-guide/`, `/journal/the-peninsulas-best-late-afternoon-walks/`) and seed their related-experiences arrays with the 32 unindexed walk pages.

### 2.6 Escape (`/escape/`), 1 indexed of 6

**Built URLs**: 6 (`/escape/` hub + 5 plans).

**Indexed (1)**: `/escape/the-peninsula-golf-weekend/` (`url-inventory.md:50`).

**Discovered, not indexed (5)**: `/escape/`, `/escape/ridge-to-sea-two-night-escape/`, `/escape/sorrento-off-season-weekend/`, `/escape/the-family-day-out/`, `/escape/wellness-weekend/` (`url-inventory.md:275-279`).

**Spine**: `/escape/` hub - itself unindexed. Same pathology as `/dog-friendly/` and `/places/` index.

**Action**: bump sitemap priority + add contextual body-link from `/journal/the-couples-weekend/`, `/journal/the-thermal-springs-weekend/`, and `/journal/the-easter-peninsula/` (all indexed). Manual reindex submission for the hub.

### 2.7 Editorial / Journal (`/journal/`), the demand engine, 58 articles unindexed

**Built URLs**: 110 articles (172 markdown files in `next/src/content/articles/` minus drafts, plus an index page and the format taxonomy structure).

**Indexed (38)**: see `url-inventory.md:94-131` for the full list. Highlights: dog-friendly-cafes-pubs-wineries-mornington-peninsula (clicks earner), the-pub-guide, the-chardonnay-case, three-italian-dinners, the-cellar-door-short-list, area-guide-{flinders, dromana, mornington, sorrento, red-hill, portsea, main-ridge, merricks}, mornington-peninsula-day-trip, mornington-peninsula-with-kids, mornington-peninsula-in-autumn, the-couples-weekend, the-easter-peninsula, the-long-lunch, the-thermal-springs-weekend.

**Discovered, not indexed (58)**: see `url-inventory.md:314-371`. Highlights: best-brunch, best-golf-courses, best-spas, mornington-peninsula-itinerary, mornington-peninsula-winery-guide, mornington-peninsula-winery-tour, the-birthday-weekend, the-dog-friendly-peninsula, the-four-hour-peninsula, the-market-saturday, the-one-night-escape, the-peninsula-orientation-drive, the-peninsula-pantry, the-peninsula-picnic, the-peninsula-with-kids, the-producer-trail, the-pub-crawl, the-rainy-day-peninsula-without-a-booking, the-school-holidays-survival-guide, the-seafood-list, the-sorrento-weekend, the-spring-peninsula, the-vineyard-villa-weekend, things-to-do-mornington-peninsula, waterfront-restaurants-mornington-peninsula, weddings-where-guests-stay-mornington-peninsula, where-to-eat-without-a-booking, where-to-stay-mornington-peninsula, where-to-walk-the-dog-mornington-peninsula.

**Spine**: `/journal/` archive. The journal has no thematic spine pages; readers navigate by /journal/[slug] only. This means crawl signal is dispersed evenly across 110 articles.

**Top performer**: `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` (3 clicks / 47 impressions / position 5.9; `daily-log.md:593`).

**Coverage gaps**:
- 58 articles unindexed. Experiment 2026-05-05-02 has shipped to address ~15 of these via related-articles seeding. The other 43 still need treatment.
- Many of these are "service" pieces with strong commercial intent: `where-to-stay-mornington-peninsula`, `where-to-eat-without-a-booking`, `things-to-do-mornington-peninsula`, `mornington-peninsula-itinerary`, `mornington-peninsula-winery-guide`, `best-brunch`, `best-spas`, `best-golf-courses`. These should be the highest-priority indexation targets.

**Internal-linking pattern**: rich. `[slug].astro:41-44` auto-picks 6 related articles by format/tag, plus explicit `relatedArticles` refs. Cross-links to venues, experiences, places, and itineraries also rich. The cluster is well-connected internally; the bottleneck is outside referrers and depth.

**Action**: identify the 5 highest-traffic indexed articles, treat each as a "spoke source" and seed 6 explicit `relatedArticles` refs to unindexed siblings. Targets per source:

| Source (indexed) | Seed unindexed targets |
|---|---|
| `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` (already done) | dog-daycare, emergency-vet, dog-friendly-accommodation, dog-friendly-wineries, where-to-walk-the-dog, the-dog-friendly-peninsula |
| `/journal/three-italian-dinners/` | the-seafood-list, where-to-eat-without-a-booking, breakfast-before-the-crowds, hatted-restaurants-mornington-peninsula-2025, waterfront-restaurants-mornington-peninsula |
| `/journal/the-cellar-door-short-list/` (already done) | mornington-peninsula-winery-guide, mornington-peninsula-winery-tour, dog-friendly-wineries, peninsula-hot-springs-vs-alba, weddings-where-guests-stay |
| `/journal/the-couples-weekend/` | the-birthday-weekend, the-one-night-escape, the-vineyard-villa-weekend, the-sorrento-weekend, where-to-stay-for-a-two-night-escape |
| `/journal/the-thermal-springs-weekend/` | mornington-peninsula-hot-springs-guide, peninsula-hot-springs-vs-alba, mornington-peninsula-stay-and-soak, best-spas-mornington-peninsula, a-winter-peninsula-weekend |
| `/journal/mornington-peninsula-day-trip/` | mornington-peninsula-itinerary, the-four-hour-peninsula, the-peninsula-orientation-drive, the-point-nepean-half-day, things-to-do-mornington-peninsula |

### 2.8 Fishing (`/fishing/`), strongest cluster, fully indexed

**Built URLs**: ~30 (1 hub + locations index + 14 location pages + species index + 12 species pages + charters index + 4 charter pages + seasons sub-page).

**Indexed (28)**: see `url-inventory.md:61-93`. Notably the entire cluster is indexed; the only non-indexed page is `/fishing/species/flathead/` (`url-inventory.md:312`).

**Spine**: `/fishing/` hub PASS. Three sub-spines: locations, charters, species, all PASS.

**Top performer**: `/fishing/locations/point-leo-beach/` (2 clicks / 8 impr / position 6.6), `/fishing/locations/gunnamatta-beach/` (1 click / 14 impr), `/fishing/species/gummy-shark/` (1 click / 26 impr / position 8.5) (`daily-log.md:594-597`). Per `daily-log.md:464`, the fishing cluster lit up at the May 3-4 indexation jump and is now the second demand cluster after dog-friendly.

**Coverage gaps**: minimal. Add flathead. Consider seasonal pages: `/fishing/seasons/whiting-spring`, `/fishing/seasons/squid-summer-autumn` to mirror `/fishing/seasons/snapper-run-oct-dec/` (the existing seasonal page).

**Internal-linking pattern**: deep cross-link between locations, charters, species. Best-structured cluster on the site. Use this as the architectural model for the others.

### 2.9 Boating (`/boating/`), small cluster, fully indexed, no demand yet

**Built URLs**: 8. All indexed (`url-inventory.md:20-30`).

**Action**: leave alone. Demand will follow if it follows.

### 2.10 Dog-friendly, the highest-leverage demand cluster

**Built URLs**: 1 hub (`/dog-friendly/`) + 7 articles + sub-cluster pages.

**Indexed**: 4 articles (dog-friendly-cafes-pubs-wineries, dog-friendly-beaches, dog-friendly-mornington-peninsula, plus the `/eat/dog-friendly.astro`, `/wine/dog-friendly.astro`, `/stay/dog-friendly.astro` thematic pages).

**Discovered, not indexed (4)**: `/dog-friendly/` hub, `/journal/dog-daycare-boarding-groomers-pet-shops-mornington-peninsula/`, `/journal/dog-friendly-accommodation-mornington-peninsula/`, `/journal/dog-friendly-wineries-mornington-peninsula/`, `/journal/emergency-vet-pet-help-mornington-peninsula/`, `/journal/where-to-walk-the-dog-mornington-peninsula/`, `/journal/the-dog-friendly-peninsula/` (`url-inventory.md:259, 323-325, 343, 354, 371`).

**Top performer**: `/journal/dog-friendly-mornington-peninsula/` ranks at position 8.3 with 49 impressions and 0% CTR for "dog friendly guide mornington peninsula" alone (`daily-log.md:567`); 5 of the top-10 impression queries on the entire site are dog-related (`baseline.md:46-55`).

**Demand context**: per `baseline.md:98`, dog-friendly is the single biggest content cluster opportunity at this stage. Experiment 2026-05-04-01 ships a CTR-focused snippet rewrite on the main hub article; experiment 2026-05-05-01 lifts the `/dog-friendly/` hub.

**Spine**: `/dog-friendly/` should be the spine. It is currently Discovered. The 6 thematic/practical articles below it are the spokes. Once both shipped experiments deploy, this cluster should consolidate into a tight hub-and-spoke.

**Action**: after experiments 2026-05-04-01 and 2026-05-05-01 land in GSC (target 2026-05-12 measurement), pick the next two unindexed dog-friendly articles for explicit promotion: `dog-friendly-accommodation-mornington-peninsula` and `dog-friendly-wineries-mornington-peninsula`. Add internal links from any `/wine/{venue}/` page where the venue's `dogPolicy` is friendly.

### 2.11 What's On (`/whats-on/`), fully indexed events, hub is unindexed

**Built URLs**: ~85. Per `url-inventory.md:152-237` 84 event pages indexed. Only the `/whats-on/` hub itself is Discovered (`url-inventory.md:383`).

**Spine**: `/whats-on/` hub.

**Top performer**: `/whats-on/mornington-cup-2026` (228 impr at position 7.6, 0.44% CTR; `baseline.md:67`). The Mornington Cup race itself was 17 days ago, demand has died but the historical impressions remain; per `daily-log.md:471` the page now has zero recent impressions.

**Coverage gaps**: events are well covered. The hub indexation will be picked up by experiment 2026-05-05-01 (sitemap priority bump).

**Action**: snippet rewrite the seasonal events that have approaching dates. Currently in season: autumn-winery-walk-2026, michael-vale-exhibition-at-mprg, foxeys-hangout-vegetable-feast, sorrento-writers-festival-2026 (June), winter-wine-weekend (June). Each needs a title that includes the year and a meta that opens with the date and venue.

### 2.12 Awards (`/awards/`), built but invisible to Google and the rest of the site

**Built URLs**: 11 (`/awards/` index, `/awards/nominate/`, plus 9 category pages from `[slug].astro`).

**Indexed**: zero pages observed in `url-inventory.md`. Awards is not in the GSC-known set, which means **Google has not crawled `/awards/` at all** as of 2026-05-05.

**Why**: zero internal links from anywhere in the editorial layer. `/awards/` is not in the masthead nav (`next/src/lib/nav.ts:34-43`), not in the More menu (`nav.ts:55-66`), not in the footer About column (`v4-nav.ts:465-474`), and grep returns no `/awards/` link anywhere outside the awards directory itself.

**Action (P0)**: this is a "dark page" structurally. Either lift it into nav and link from at least 5 articles, or accept that it won't earn organic.

### 2.13 Commercial spine (Pass / Submit / Newsletter / Ask / Itinerary / Partners)

| URL | Indexable | GSC status | Internal link count |
|---|---|---|---:|
| `/pass/` | yes (canonical set) | not in inventory | 0 in editorial layer (footer entry points to a `/preview-insider-plans/` preview page, see `v4-nav.ts:470`) |
| `/newsletter/` | yes | not in inventory | 1 (`Footer.astro` via `v4FooterAbout`) |
| `/submit/` | yes | not in inventory | 0 in editorial layer |
| `/ask/` | yes | Discovered (`url-inventory.md:257`) | drawer-trigger, plus 0 hyperlinks |
| `/itinerary/` | yes | not in inventory | 1 (`Masthead.astro:56`, hidden until saved items exist) |
| `/partners/` | yes | not in inventory | 1 (`Footer.astro` via `v4FooterAbout`), plus 1 from `/about/` |

The commercial spine is structurally orphaned. Each surface is indexable but Google barely sees it because it's barely linked. See `04-conversion-paths.md` for the funnel impact.

### 2.14 Niche (Golf / Spa / Tour / Weddings / Corporate / Insiders 30 / Alerts)

| URL | Indexable | Status |
|---|---|---|
| `/weddings/` | yes | PASS (`url-inventory.md:151`) |
| `/corporate-events/` | yes | Discovered (`url-inventory.md:258`) |
| `/golf/` | noindex per `daily-log.md:669` | not indexable |
| `/explore/golf/` | yes | not in inventory (verify) |
| `/spa/` | yes | not in inventory |
| `/tour/` | yes | only `/tour/fishing-tours/` indexed (`url-inventory.md:150`) |
| `/insiders-30/` | yes | not in inventory |
| `/alerts/` | yes | not in inventory |

**Action**: each is a hub built ahead of demand. Treat as long-term ambition, not P0. The exception is `/insiders-30/` (the annual ranked list), this is a citation-bait surface and needs to earn its first set of crawls; promote from index.astro.

---

## 3. Search-intent alignment

The 18 queries with ≥10 impressions across the May 1-4 daily logs, classified by intent and matched to the page that ranks for them.

| # | Query | Impr 28d | Pos | Intent | PI page that ranks | Page intent fit |
|---|---|---:|---:|---|---|---|
| 1 | dog friendly guide mornington peninsula | 49 | 8.3 | Informational | `/journal/dog-friendly-mornington-peninsula/` | Excellent match (long-form guide) |
| 2 | 34 western parade point leo vic 3916 | 46 | 27.8 | Navigational (address) | legacy directory page | Wrong intent, user wants a map, we show a listing |
| 3 | a dog-friendly guide mornington peninsula | 30 | 7.1 | Informational | `/journal/dog-friendly-mornington-peninsula/` | Excellent match |
| 4 | 20 junction road merricks north vic 3926 | 21 | 33.8 | Navigational (address) | legacy directory page | Wrong intent |
| 5 | accommodation near peninsula hot springs | 19 | 67.8 | Commercial-investigative | none ranking | No PI page targets this; need one |
| 6 | free things to do in mornington peninsula | 16 | 20.3 | Informational/local | `/journal/free-things-to-do-mornington-peninsula/` | Good match, ranking weak |
| 7 | best restaurants in mornington peninsula | 14 | 46.4 | Commercial-investigative | `/eat/best-restaurants/` | Excellent intent fit, weak rank |
| 8 | dog friendly beaches mornington peninsula | 11 | 17.6 | Informational/local | `/journal/dog-friendly-beaches-mornington-peninsula/` | Excellent match |
| 9 | hotel near sorrento pier booking | 11-15 | 65.9 | Transactional | `http://...stay/hotel-sorrento` zombie | Right venue, wrong URL state |
| 10 | endota sorrento | 12 | 5.7 | Navigational (brand) | `/stay/endota-spa-sorrento` | Excellent match, ranking on page 1 |
| 11 | best places to stay mornington peninsula | 9 | 49.2 | Commercial-investigative | `/stay/best-accommodation/` | Excellent intent fit, weak rank |
| 12 | dog beaches mornington peninsula | 8 | 21.4 | Informational/local | `/journal/dog-friendly-beaches-mornington-peninsula/` | Excellent match |
| 13 | best restaurants mornington peninsula | 7 | 47.7 | Commercial-investigative | `/eat/best-restaurants/` | Excellent intent fit, weak rank |
| 14 | gummy shark size limit | 2 | 8.5 | Informational | `/fishing/species/gummy-shark/` | Excellent match (1 click) |
| 15 | laura at pt leo estate | 1 | 1.0 | Navigational (chef brand) | unknown | Top spot, 1 click |
| 16 | pt leo estate | 1 | 6.0 | Navigational | `/wine/pt-leo-estate/` (Discovered) or `/eat/pt-leo-estate/` (Discovered) | Both targets unindexed; the click on this query is from the May 3 dog-friendly snippet seeing |
| 17 | "endota" | 2 | 44.5 | Navigational (brand) | unknown | Wrong page or bad SERP placement |
| 18 | 5 star hotel mornington peninsula | 2 | 25.0 | Commercial-investigative | none specific | No 5-star focused stay page |

**Key intent mismatches**:

1. **Address queries** (queries 2, 4): the page that ranks is a legacy directory listing showing the address. The user wants a map or a venue page; we serve a listing. Either noindex these legacy pages (per `backlog.md:21`) or redirect them to the venue page on the address.

2. **Hotel near Sorrento pier booking** (query 9): user has transactional intent ("booking" in query) but lands on the http:// zombie of `/stay/hotel-sorrento` at position 65.9. Once HTTPS-enforce propagates, the canonical https URL should pick up. Add a "Book direct" CTA.

3. **Best-restaurants** queries (7, 13): the right page (`/eat/best-restaurants/`) ranks at page 5 despite being a strong fit. This is a content-depth and link-equity gap, not an intent gap. Action: see Content gaps below.

4. **Accommodation near Peninsula Hot Springs** (query 5): the user wants a specific stay-near-attraction shape. We don't have an article for this; the closest is `/journal/mornington-peninsula-stay-and-soak/` (Discovered, not indexed) (`url-inventory.md:334`). Build/promote that.

---

## 4. Content gaps, articles to build

Twenty new pages or substantial rewrites, ordered by leverage. Each maps to a query cluster, a known PI gap, and an existing PI surface that supports the pitch.

| # | Title | Target query | Cluster | Why | Effort | Link from |
|---|---|---|---|---|---|---|
| 1 | Stays Near Peninsula Hot Springs | "accommodation near peninsula hot springs" (19 impr/wk, pos 67.8) | Stay | High-impression query with no targeted page; the closest is unindexed | Medium | `/journal/the-thermal-springs-weekend/`, `/stay/peninsula-hot-springs-glamping/`, `/journal/peninsula-hot-springs-vs-alba/` |
| 2 | Hotels Near Sorrento Pier (with editorial booking notes) | "hotel near sorrento pier booking" (15 impr/wk, pos 65.9) | Stay | Transactional intent, page exists at zombie URL only | Small (rebuild on https) | `/places/sorrento/`, `/journal/the-sorrento-weekend/` |
| 3 | The 5-Star Stay List | "5 star accommodation mornington peninsula" / "5 star hotel" | Stay | Whole tier under-served | Medium | `/stay/best-accommodation/`, all luxury stays |
| 4 | Where to Stay on the Mornington Peninsula (definitive) | "where to stay mornington peninsula", "best places to stay" (8-9 impr/wk, pos 49.2) | Stay | Article exists (`where-to-stay-mornington-peninsula.mdx`) but Discovered; needs depth + internal-link push | Small (refresh + link) | All `/places/{town}/` hubs, the journal hub |
| 5 | Best Restaurants on the Mornington Peninsula (rebuild for 2026) | "best restaurants in mornington peninsula" (14 impr/wk, pos 46.4) | Eat | `/eat/best-restaurants/` exists but pages 4-5; needs 2026 freshness, more depth, FAQ schema | Medium (rebuild) | `/eat/`, `/places/red-hill/`, `/journal/where-to-eat-mornington-peninsula/` |
| 6 | Hatted Restaurants on the Mornington Peninsula (2025-26 GFG) | "hatted restaurants mornington peninsula" | Eat | Article exists (Discovered, not indexed), refresh + link push | Small | `/eat/best-restaurants/`, `/journal/three-italian-dinners/` |
| 7 | Mornington Peninsula Winery Guide (rebuild) | "mornington peninsula winery", "wineries mornington peninsula" | Wine | Article exists (Discovered), refresh, link from chardonnay-case | Medium | `/wine/best-cellar-doors/`, `/journal/the-chardonnay-case/`, `/journal/the-cellar-door-short-list/` |
| 8 | The 2026 Mornington Cup Day Guide (next-year evergreen) | "mornington cup", "mornington races" | Whats-on | Old MC2026 page is dead; this should be a multi-year evergreen with annual update | Small (rewrite) | `/whats-on/`, `/places/mornington/`, `/journal/the-easter-peninsula/` |
| 9 | Sorrento Writers Festival 2026: Tickets, Schedule, Where to Stay | "sorrento writers festival" | Whats-on | Page exists (`/whats-on/sorrento-writers-festival-2026/`); add event schema + pre/post coverage articles | Small | `/places/sorrento/`, `/journal/the-sorrento-weekend/` |
| 10 | Free Things to Do on the Mornington Peninsula (rebuild) | "free things to do in mornington peninsula" (16 impr/wk, pos 20.3) | Explore | Page exists, ranking page 2; needs depth + on-page UX rebuild + FAQ schema | Medium | `/places/*/` hubs, `/explore/`, `/journal/things-to-do-mornington-peninsula/` |
| 11 | Best Walks on the Mornington Peninsula (build out from 9 indexed) | "best walks mornington peninsula" | Explore | Spine `/explore/best-walks/` exists; expand with 32 unindexed walk pages as the cited destinations | Medium | `/explore/`, `/journal/walks-bushrangers-bay-walk-guide/` |
| 12 | Mornington Peninsula in Winter: A Cold-Weather Guide | "mornington peninsula winter", "winter weekend mornington peninsula" | Journal | Article exists (Discovered: `mornington-peninsula-in-winter`, `a-winter-peninsula-weekend`); refresh + push | Small | seasonal homepage rotation, `/journal/the-thermal-springs-weekend/` |
| 13 | Mornington Peninsula in Spring: The Vintage-Approach Calendar | "mornington peninsula spring", "spring weekend mornington peninsula" | Journal | Article exists (Discovered: `the-spring-peninsula`); refresh for spring season | Small | `/wine/`, `/journal/the-chardonnay-case/` |
| 14 | A Wet-Weather Mornington Peninsula Plan | "rainy day mornington peninsula", "what to do mornington peninsula raining" | Journal | Article exists (Discovered: `the-rainy-day-peninsula-without-a-booking`, `rainy-day-peninsula`); consolidate into one canonical and push | Small (consolidate) | All season hubs, `/explore/` |
| 15 | The Best Beaches on the Mornington Peninsula | "best beaches mornington peninsula", "mornington peninsula beaches" | Explore | Spine page `/explore/beaches/` indexed; needs more depth + per-beach FAQ + dog-rules table | Medium | `/places/{coastal towns}/`, `/journal/dog-friendly-beaches-mornington-peninsula/` |
| 16 | The Long Lunch: Mornington Peninsula Cellar-Door Restaurants Worth a Saturday | "long lunch mornington peninsula", "vineyard restaurants mornington peninsula" | Eat | Article exists (Discovered? `the-long-lunch` is Discovered per `url-inventory.md:125`) | Small (link push) | `/wine/best-cellar-doors/`, `/eat/cellar-door-lunch.astro` |
| 17 | Best Brunch on the Mornington Peninsula | "best brunch mornington peninsula" | Eat | Article exists (Discovered: `best-brunch-mornington-peninsula`); refresh + push | Small | `/places/sorrento/`, `/journal/three-italian-dinners/` |
| 18 | Best Spas on the Mornington Peninsula | "best spas mornington peninsula", "mornington peninsula spa" | Spa | Article exists (Discovered: `best-spas-mornington-peninsula`); refresh + push | Small | `/spa/`, `/journal/peninsula-hot-springs-vs-alba/` |
| 19 | The Mornington Peninsula Itinerary (canonical 2-3 day plan) | "mornington peninsula itinerary", "things to do mornington peninsula 2 days" | Escape/Journal | Article exists (Discovered); should be the indexable "spine" of the entire journal cluster | Medium (rebuild) | `/escape/`, `/itinerary/`, `/places/{all towns}/` |
| 20 | The Insider's 30: 2026 Edition (annual ranked list) | "best mornington peninsula", "top mornington peninsula" | Insiders 30 | Cluster `/insiders-30/` is built but invisible; the annual list is the citation-bait surface | Large (annual editorial) | All venue pages, all journal articles |

---

## 5. Existing-content actions for the 140 unindexed URLs

Pattern-grouped recommendations rather than 140 individual lines. Each group references the URLs in `url-inventory.md`.

### Keep, unindexed but legitimate; push internal links

**Group A: 11 unindexed wine/cellar-door venues** (`url-inventory.md:384-396`).
**Action**: link each from `/wine/best-cellar-doors/` (the spine), from `/journal/the-chardonnay-case/`, and from each town hub `/places/{town}/` where the venue lives. Add the venue to the relevant article `relatedVenues` arrays.

**Group B: 14 unindexed wine-as-restaurant pages under `/eat/`** (`url-inventory.md:260-274`).
**Action**: experiment 2026-05-05-03 already canonicalises these to `/wine/{slug}/`. Verify on next discovery run that the alternate-canonical count drops. No further work; the /wine/{venue} canonical is the home.

**Group C: 32 unindexed walks/golf/galleries** (`url-inventory.md:280-311`).
**Action**: replicate experiment 2026-05-05-02 (related-articles seeding) for the explore cluster. Source articles: `/journal/walks-bushrangers-bay-walk-guide/`, `/journal/cape-schanck-guide/`, `/journal/point-nepean-national-park-guide/`. Each gets a `relatedExperiences` array of 6 unindexed walk slugs.

**Group D: 9 unindexed town hubs** (`url-inventory.md:372-382`).
**Action**: contextual body link from each tagged journal article. e.g. `/journal/the-easter-peninsula/` mentions Sorrento and Portsea, confirm the body has one link to `/places/sorrento/` and one to `/places/portsea/`.

**Group E: 11 unindexed dog-friendly + accommodation + winery + season articles in journal** (subset of `url-inventory.md:314-371`).
**Action**: experiment 2026-05-05-02 covered 15 of these; the remaining 43 need the same treatment. See Section 7 (internal-linking) below.

**Group F: 5 unindexed escape plans** (`url-inventory.md:275-279`).
**Action**: contextual body link from each season article (`the-easter-peninsula`, `the-thermal-springs-weekend`, `the-couples-weekend`).

**Group G: 5 commercial spine pages** (Discovered: `/ask/`, `/dog-friendly/`, `/escape/`, `/places/`, `/whats-on/`).
**Action**: experiment 2026-05-05-01 ships sitemap priority bumps for these. Manual reindex submission pending James action.

### Refresh, content exists but is thin or stale

- `the-birthday-weekend` (Discovered, also has http variants): consolidate to single canonical, refresh for autumn 2026 freshness.
- `the-peninsula-orientation-drive`: this is the Phase-2 driving-loop article; refresh with 2026 stops.
- `the-school-holidays-survival-guide`: needs a 2026-school-term refresh.
- `peninsula-this-weekend-april-24`, `peninsula-this-weekend-april-26`: these were one-off weekend dispatches that have now aged out. Either consolidate into a "weekly archive" hub or 410 if they're not generating any traffic.

### Consolidate, multiple URLs serving the same query intent

- `the-rainy-day-peninsula-without-a-booking` + `rainy-day-peninsula` + `the-peninsula-with-kids` (rainy-day overlap). Merge into one canonical "Rainy Day Mornington Peninsula" article; 301 redirect the others.
- `mornington-peninsula-itinerary` + `mornington-peninsula-day-trip` + `the-four-hour-peninsula`: three articles competing for "mornington peninsula itinerary"-shape queries. Make `mornington-peninsula-itinerary` the canonical spine; the other two link to it.
- `where-to-eat-without-a-booking` + `breakfast-before-the-crowds` + `where-to-eat-mornington-peninsula`: three separate "where to eat" articles. Cluster them; each should clearly target a different shape ("no booking", "early/breakfast", "definitive list").

### Delete (or 410), programmatic / low-quality / off-brand

Only the 4 noindex pages (`url-inventory.md:457-461`): `/explore/bushrangers-bay/`, `/explore/mornington-peninsula-walk/`, `/journal/mornington-peninsula-beach-guide/`, `/journal/the-peninsula-beach-swimming-guide/`. Verify these are intentional; if not, lift the noindex.

The address-string queries (`baseline.md:46-55`) suggest legacy directory pages still exist and serve listings to address-search users. Per `backlog.md:21`, this is a known investigation, find these pages and either noindex or 410 them.

---

## 6. Internal-linking opportunities (specific source → target pairs)

Twenty pairs. Each pair adds one or two contextual body links to push equity into specific unindexed pages. Implementation: edit the source article markdown to insert a one-sentence body paragraph linking to the target.

| # | Source page (indexed, has impressions) | Target page (Discovered, needs lift) | Rationale |
|---|---|---|---|
| 1 | `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` (3 clicks) | `/journal/dog-friendly-accommodation-mornington-peninsula/` | Same cluster; the cafés piece naturally cross-references where to stay |
| 2 | `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` | `/journal/dog-friendly-wineries-mornington-peninsula/` | The cafés piece talks about Foxeys and other wineries; link the dedicated guide |
| 3 | `/journal/the-pub-guide/` (1 click, 65 impr) | `/journal/the-pub-crawl/` | Pub guide → pub crawl, natural body-link |
| 4 | `/journal/the-pub-guide/` | `/journal/where-to-eat-without-a-booking/` | Pubs are the canonical no-booking option |
| 5 | `/journal/the-chardonnay-case/` (71 impr at pos 5.6) | `/journal/mornington-peninsula-winery-guide/` | The case piece argues a thesis; the guide is the systematic complement |
| 6 | `/journal/the-chardonnay-case/` | `/journal/mornington-peninsula-winery-tour/` | The case piece, then the tour piece |
| 7 | `/journal/the-cellar-door-short-list/` | `/journal/dog-friendly-wineries-mornington-peninsula/` | The short-list piece names wineries; some are dog-friendly |
| 8 | `/journal/the-couples-weekend/` | `/journal/the-birthday-weekend/` | Same audience |
| 9 | `/journal/the-couples-weekend/` | `/journal/the-vineyard-villa-weekend/` | Same shape |
| 10 | `/journal/the-thermal-springs-weekend/` | `/journal/peninsula-hot-springs-vs-alba/` | The thermal-springs weekend piece names hot springs; the comparison piece is the natural follow-on |
| 11 | `/journal/the-thermal-springs-weekend/` | `/journal/mornington-peninsula-stay-and-soak/` | Same cluster, different shape |
| 12 | `/journal/three-italian-dinners/` | `/journal/the-seafood-list/` | The Italian piece is dinner-shape; the seafood piece is its sibling |
| 13 | `/journal/three-italian-dinners/` | `/journal/where-to-eat-without-a-booking/` | Italian piece talks about booking pressure; link the no-booking piece |
| 14 | `/journal/where-to-eat-mornington-peninsula/` | `/journal/best-brunch-mornington-peninsula/` | Where-to-eat is the canonical entry; brunch is a sibling shape |
| 15 | `/journal/where-to-eat-mornington-peninsula/` | `/journal/hatted-restaurants-mornington-peninsula-2025/` | Same cluster |
| 16 | `/journal/the-easter-peninsula/` | `/places/sorrento/` (already indexed) and `/places/portsea/` (already indexed), these are confirmation pairs | Body-link verification only |
| 17 | `/places/sorrento/` | `/journal/the-sorrento-weekend/` (Discovered) | Place hub to the article specifically about that place |
| 18 | `/places/red-hill/` | `/journal/how-to-build-a-red-hill-saturday/` (Discovered) | Same pattern |
| 19 | `/wine/best-cellar-doors/` | `/journal/dog-friendly-wineries-mornington-peninsula/` | Subset of the cellar-door audience |
| 20 | `/eat/best-restaurants/` | `/journal/waterfront-restaurants-mornington-peninsula/` (Discovered) | Subset of best-restaurants |

The pattern: each source article gets a one-sentence editorial body paragraph (not a footer rail) linking to the target. This replicates the mechanism that worked in experiment 2026-05-05-01, contextual body links carry crawl weight that nav links do not.

---

## 7. Cluster-spine readiness summary

| Cluster | Spine | Spine indexed? | Spine has FAQ schema? | Spine has clear CTAs? | Cluster ready for next-stage growth? |
|---|---|---|---|---|---|
| Town hubs | `/places/` | No | Unknown | Yes (place cards) | No - lift index page first |
| Eat | `/eat/best-restaurants/` | Yes | No | Partial | Almost - add schema |
| Wine | `/wine/best-cellar-doors/` | Yes | No | Partial | Almost - add schema |
| Stay | `/stay/best-accommodation/` | Yes | No | Weak | No - cluster is too thin (6 venues) |
| Explore | `/explore/best-walks/` | Yes | No | Yes | Almost - need spokes lifted |
| Escape | `/escape/` | No | No | Yes | No - lift index, then push spokes |
| Journal | `/journal/` archive | Likely yes | No | Weak | No - 58 unindexed spokes |
| Fishing | `/fishing/` | Yes | Unknown | Yes | Yes - architecturally complete |
| Boating | `/boating/` | Yes | Unknown | Yes | Yes |
| Dog-friendly | `/dog-friendly/` | No | No | Yes (article CTAs) | Almost - shipping experiment 2026-05-05-01 |
| Whats-on | `/whats-on/` | No | Yes (per-event in EventStrip) | Yes | Almost - lift hub |
| Awards | `/awards/` | Likely no | No | No (no internal link) | No - structurally orphaned |

---

## 8. Recommended next 2-week priority

Combining indexation fix + content gap + intent alignment:

1. **(P0 deploy already shipped)** Wait for experiments 2026-05-04-01, 2026-05-05-01, 2026-05-05-02, 2026-05-05-03 to land in GSC. Measure 2026-05-12 and 2026-05-19 per the experiment checklist.
2. **(P0 new)** Add `/awards/` to the masthead More menu and to the Footer About column. Link from at least 5 indexed articles. The cluster is currently structurally orphaned.
3. **(P0 new)** Replicate experiment 2026-05-05-02 for `/explore/` walks: bump auto-related-experiences limit on `[slug].astro` walks template; explicitly seed 6 unindexed walk slugs on each of the 4 indexed walk articles.
4. **(P1)** Build "Stays Near Peninsula Hot Springs" article (gap #1 in Section 4). 19 impressions/week of unmet demand.
5. **(P1)** Rewrite `/eat/best-restaurants/` for 2026 freshness + FAQ schema + 2026 venue depth. Currently page-5 ranking on a target that should be page 1.
6. **(P1)** Refresh `/journal/mornington-peninsula-itinerary/` to be the canonical itinerary spine; redirect/consolidate `mornington-peninsula-day-trip` + `the-four-hour-peninsula` to point at it.
7. **(P2)** Begin the 20-article content-gap plan (Section 4) at a cadence of 2 per week.

---

## 9. Open questions (data we don't have yet)

- GSC Page indexing total beyond the inspected 418 URLs. The platform reports 1052 built pages but only 418 reach GSC. The 634-page gap is likely sitemap-orphans or pages Google never crawled. Run a build-time sitemap dump and diff against `sitemap.xml.ts`.
- Click-through funnel from a journal article into a venue page (need GA4).
- Bounce rate on `/eat/best-restaurants/`, is the page-5 ranking a snippet failure or a content failure (need GA4)?
- Which of the 16 "URL is unknown to Google" pages (`url-inventory.md:421-440`) are worth reindexing manually. They include `/journal/how-to-plan-a-peninsula-weekend/`, `/wine/crittenden-estate/`, `/eat/main-ridge-estate/`, high-intent venue and how-to pages that Google has not crawled yet.

---

End of file.
