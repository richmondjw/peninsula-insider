# Peninsula Insider — Next 30 Pages: Build Order & Rationale

**Date:** 28 April 2026  
**Prepared by:** Remy  
**Purpose:** Practical build queue for the next 30 highest-value pages, aligned to the live architecture: `/explore`, `/journal`, `/places`, `/escape`, `/eat`, `/wine`, `/stay`, `/spa`, `/walks`, `/weddings`, `/corporate-events`.  
**Constraint:** Do not propose replacing or restructuring the live IA. Build within it.

---

## 1. Architecture State (as of this writing)

Before the queue, what's already live so nothing is built twice:

| Pillar | Built hubs / key pages |
|---|---|
| `/explore/` | things-to-do, hot-springs, best-walks, beaches, day-trips, family-friendly, free, golf, markets, spas-and-wellness, rainy-day, weekend-trips, where-to-base-yourself, getting-here, getting-around, map, walks (redirect to /walks/) |
| `/eat/` | best-restaurants, brunch, cafes, cellar-door-lunch, date-night, dog-friendly, family-friendly, fine-dining, hatted-restaurants, long-lunch, markets, no-booking, paddock-to-plate, pubs, seafood, waterfront, bakeries |
| `/wine/` | best-cellar-doors, best-wineries-mornington-peninsula, cellar-doors, wine-region, appointment-producers, chardonnay, dog-friendly, red-hill, main-ridge, balnarring, flinders, merricks, moorooduc-tuerong, pinot-noir |
| `/stay/` | best-accommodation, where-to-stay-mornington-peninsula + 13 venue detail pages |
| `/escape/` | mornington-peninsula-itinerary, flinders-and-cape-reset, ridge-to-sea-two-night-escape, sorrento-off-season-weekend, the-family-day-out, the-peninsula-golf-weekend, wellness-weekend |
| `/places/` | 20 town/area pages (stubs — most are thin) |
| `/journal/` | 77 articles (hot springs guide, day trip, kids, dog-friendly, autumn, winter, winery tour, wedding venues, etc.) |
| `/spa/` | Hub only — no support pages |
| `/walks/` | Hub + easy-walks-mornington-peninsula |
| `/weddings/` | Hub + winery-wedding-venues-mornington-peninsula |
| `/corporate-events/` | Hub + best-corporate-retreat-venues-mornington-peninsula |

**Content collections:** 135 venues, 42 experiences, 77 articles, 20 places, itineraries, authors.

---

## 2. Gap Analysis — Where Value is Being Left

Working through the IA gaps against search demand:

**Hot gaps (high volume, no dedicated page):**
- `/spa/` has no sub-pages. Hot springs is the site's single highest-volume cluster and `/spa/` is just a hub index.
- `/places/` pages are thin stubs. Town hubs like Sorrento, Red Hill, Flinders have traffic intent that the stubs can't serve.
- `/stay/` accommodation-modifier pages (boutique, romantic, pet-friendly, winery, near-hot-springs) don't exist despite `/stay/` having strong DR.
- `/wine/` has no winery-lunch hub — one of the highest commercial-intent wine queries.
- `/escape/` has no couples itinerary or "weekend in [specific town]" structure.
- `/walks/` has the hub and easy-walks, but no trail guides (Bushrangers Bay is the #1 trail query on the Peninsula).
- `/weddings/` has no guest-stay planning page (the planning sequence is incomplete without it).

**Medium gaps (moderate volume, partially covered by journal but no intent-specific hub page):**
- Things to do with kids → `/journal/mornington-peninsula-with-kids` exists but no `/explore/with-kids` hub
- Free things to do → `/journal/free-things-to-do-mornington-peninsula` exists but `/explore/free` likely thin
- Day trip → `/journal/mornington-peninsula-day-trip` exists but no `/escape/day-trip-from-melbourne` hub

**Low urgency (covered adequately):**
- `/eat/` — well-built, 17 hubs. No immediate gaps.
- `/explore/hot-springs` — live and linked to spa venues
- `/wine/best-cellar-doors` and `/wine/best-wineries-mornington-peninsula` — live

---

## 3. Build Queue — Next 30 Pages

Ordered by: search demand × editorial quality gap × internal-link compounding value.

### TIER 1 — Highest priority (build first, in order)

**These pages have the highest search volume, exist as clear gaps in the live IA, and each one immediately strengthens the cluster around it.**

| # | URL | Type | Why now |
|---|---|---|---|
| 1 | `/spa/peninsula-hot-springs-guide/` | Hub sub-page | Hot springs is the site's highest-volume cluster. The `/spa/` hub has no sub-pages. This becomes the canonical guide, promoted from or complementing `/journal/mornington-peninsula-hot-springs-guide/`. ItemList schema, editorial voice, booking notes. |
| 2 | `/spa/alba-thermal-springs/` | Venue hub | Alba vs Peninsula Hot Springs is a high-intent comparative query. The `/spa/` hub needs venue depth pages. This anchors Alba with editorial detail (design-led, session caps, adult tone). |
| 3 | `/spa/what-to-do-after-peninsula-hot-springs/` | Planning editorial | "What to do after Peninsula Hot Springs" is one of the strongest LLM-retrieval targets on the site. Bridges `/spa/` to `/eat/`, `/wine/`, `/walks/`. |
| 4 | `/places/sorrento/` | Town hub (rebuild) | Sorrento is the #1 town query on the Peninsula. The current stub is thin. Rebuild with: best restaurants, where to stay, beaches, things to do, who it suits, seasonal note, FAQ. Links to 10+ existing pages. |
| 5 | `/places/red-hill/` | Town hub (rebuild) | Red Hill drives the winery and long-lunch cluster. Rebuild with: cellar doors, winery lunch, accommodation, market (seasonal), best for (couples, food-lovers), walk options. |
| 6 | `/places/flinders/` | Town hub (rebuild) | Flinders is the editorial darling — highest quality-of-intent visitors, cellar doors, coastal walks, quiet luxury. Stub needs a full rebuild. |
| 7 | `/places/mornington/` | Town hub (rebuild) | Largest town, highest head-term volume for "mornington peninsula town" queries. Hub page for casual visitors who don't yet know the Peninsula. |
| 8 | `/stay/romantic-accommodation-mornington-peninsula/` | Hub sub-page | "Romantic accommodation Mornington Peninsula" is a high-intent commercial query. `/stay/` has structural authority but no modifier pages except best-accommodation and where-to-stay. |
| 9 | `/stay/boutique-accommodation-mornington-peninsula/` | Hub sub-page | "Boutique hotels Mornington Peninsula" / "boutique accommodation" — second-most searched accommodation modifier. |
| 10 | `/stay/accommodation-near-peninsula-hot-springs/` | Hub sub-page | Bridges `/stay/` and `/spa/` — the highest-value cross-cluster query on the site. High commercial intent, very few quality pages covering it. |

### TIER 2 — High priority (build immediately after Tier 1)

**These pages compound value from Tier 1 and cover the next-highest volume intent gaps.**

| # | URL | Type | Why now |
|---|---|---|---|
| 11 | `/walks/bushrangers-bay-walk/` | Trail guide article | The #1 trail-specific query on the Peninsula. Complements `/walks/` hub and `/walks/easy-walks-mornington-peninsula/`. Editorial trail guide (not Parks Victoria copy). |
| 12 | `/walks/cape-schanck-walk-and-hot-springs/` | Experience editorial | "Cape Schanck walk and hot springs" is the strongest day-trip pairing query. Bridges `/walks/` and `/spa/`. |
| 13 | `/eat/winery-lunch-mornington-peninsula/` | Hub sub-page | "Winery lunch Mornington Peninsula" is the highest-volume commercial-intent food query the site doesn't have a dedicated page for. Bridges `/eat/` and `/wine/`. |
| 14 | `/wine/winery-lunch-mornington-peninsula/` | Redirect or cross-reference | Consider whether this lives in `/eat/` (food intent) or `/wine/` (winery intent). Best play: `/eat/winery-lunch-mornington-peninsula/` as canonical with `/wine/winery-lunch-mornington-peninsula/` linking to it. If building both, `/eat/` version is the hub. |
| 15 | `/stay/pet-friendly-accommodation-mornington-peninsula/` | Hub sub-page | "Pet-friendly accommodation Mornington Peninsula" is a consistent high-intent query with strong LLM-retrieval value. Bridges `/stay/` and the strong dog-friendly cluster already built across `/explore/dog-friendly`, `/eat/dog-friendly`, `/wine/dog-friendly`. |
| 16 | `/stay/winery-accommodation-mornington-peninsula/` | Hub sub-page | Bridges `/stay/` and `/wine/` — the most valuable cross-cluster combination. Specific enough to convert, editorial enough to rank. |
| 17 | `/escape/mornington-peninsula-day-trip-from-melbourne/` | Itinerary/planning | "Mornington Peninsula day trip from Melbourne" is one of the highest-volume queries on the site. `/journal/mornington-peninsula-day-trip` exists but this version lives in `/escape/` with proper itinerary structure, schema, and internal links. |
| 18 | `/explore/things-to-do-mornington-peninsula-couples/` | Intent hub | "Things to do Mornington Peninsula couples" — high volume, no dedicated page. Draws from `/wine/`, `/spa/`, `/eat/`, `/escape/`. |
| 19 | `/explore/things-to-do-mornington-peninsula-winter/` | Seasonal hub | "Things to do Mornington Peninsula winter" — strong seasonal intent. Refresh the journal article into a proper hub page. Links to `/spa/`, `/wine/`, `/eat/`, `/escape/wellness-weekend`. |
| 20 | `/places/rye/` | Town hub (rebuild) | Rye is the largest mid-market beach town. Families and casual visitors. Good accommodation density. The stub needs a rebuild.  |

### TIER 3 — Medium priority (builds depth, compounds Tiers 1–2)

**These pages add depth within established clusters and extend internal-link coverage.**

| # | URL | Type | Why now |
|---|---|---|---|
| 21 | `/places/portsea/` | Town hub (rebuild) | High-end coastal, back beaches, cliffs. Distinct editorial character. Strong for couples and weekenders. |
| 22 | `/places/cape-schanck/` | Place hub | Cape Schanck is an entity referenced in 6+ existing pages (boardwalk, lighthouse, walks, spa) but has no place hub of its own. |
| 23 | `/weddings/where-guests-stay-mornington-peninsula-wedding/` | Planning editorial | Completes the weddings cluster. The planning sequence is hub → venue guide → guest logistics → weekend planning. This is step 3. |
| 24 | `/weddings/how-to-plan-a-mornington-peninsula-wedding-weekend/` | Planning editorial | Final major weddings cluster spoke. High LLM-retrieval value for planning queries. |
| 25 | `/explore/things-to-do-mornington-peninsula-with-kids/` | Intent hub | "Mornington Peninsula with kids" is well-covered in journal but needs an `/explore/` hub version with ItemList schema and proper internal links. |
| 26 | `/explore/things-to-do-mornington-peninsula-rainy-day/` | Seasonal/intent hub | `/explore/rainy-day` likely exists as a thin page — rebuild with editorial depth and schema. High intent on grey/wet days. |
| 27 | `/corporate-events/how-to-plan-a-mornington-peninsula-corporate-retreat/` | Planning editorial | Completes the corporate-events planning cluster. Complements the existing best-corporate-retreat-venues page. |
| 28 | `/journal/mornington-peninsula-itinerary-2-days/` or `/escape/mornington-peninsula-2-day-itinerary/` | Itinerary | "Mornington Peninsula 2 day itinerary" is a high-volume planning query. `/escape/mornington-peninsula-itinerary` exists but rebuild/refresh as a dedicated 2-day structured plan with schema. |
| 29 | `/wine/romantic-wineries-mornington-peninsula/` | Hub sub-page | "Romantic wineries Mornington Peninsula" — niche but very high-intent. Bridges `/wine/` and couples content. |
| 30 | `/spa/peninsula-hot-springs-vs-alba/` | Comparison editorial | "Peninsula Hot Springs vs Alba" — strong comparative query. `/journal/peninsula-hot-springs-vs-alba.md` exists; promote into `/spa/` as a canonical hub sub-page. High LLM-retrieval value. |

---

## 4. Sequencing Logic

### Why Tier 1 in this order

1. **Spa pages first (#1–3):** The `/spa/` hub has zero sub-pages. It's the highest-volume cluster on the site and has no depth. Three pages instantly transforms it from a stub into a cluster.
2. **Town hubs (#4–7):** Places pages are the universal connective tissue — every article, venue, walk, and itinerary references a town. Thin town hubs waste the authority flowing to them. Sorrento and Red Hill come first because they carry the most traffic.
3. **Stay modifiers (#8–10):** `/stay/` has structural authority (venue pages, best-accommodation) but no modifier pages. These three are the highest-value cross-cluster connectors.

### Why Tier 2 sequences this way

- Walks trail guide (#11) compounds the `/walks/` hub and provides the long-form content the boardwalk/explore pages reference but can't hold.
- Winery lunch (#13) is the single most-searched food query without a page. Can't wait.
- Day trip from Melbourne (#17) is a mega-volume query — the journal version can't rank as well as a proper `/escape/` itinerary hub.
- Couples and seasonal hubs (#18–19) compound the things-to-do cluster and draw from already-built wine, spa, and eat pages.

### Why Tier 3 is Tier 3

Pages in Tier 3 are valuable but depend on Tier 1 and 2 pages existing to link to them properly. Building #23–24 (weddings planning articles) before the `/places/` town hubs are rebuilt means those articles will link to thin stubs, reducing internal-link value. Building #30 (hot springs vs Alba) before `/spa/peninsula-hot-springs-guide/` (#1) means the parent hub doesn't exist yet.

---

## 5. Internal-Link Architecture (per page type)

Each page built from this queue must follow this linking rule:

**Hub sub-pages** (stay/, wine/, spa/ modifiers):
- Link to the pillar hub (e.g. `/stay/`)
- Link to 2 other hub sub-pages in the same pillar
- Link to 2 cross-cluster pages (e.g. `/wine/` from `/eat/winery-lunch/`, `/spa/` from `/stay/accommodation-near-hot-springs/`)
- Link to 2–4 venue detail pages

**Town hub pages** (`/places/`):
- Link to at least 3 pillar hubs (`/eat/`, `/stay/`, `/explore/` or `/wine/`)
- Link to 4–8 venue or experience pages in that town
- Link to `/escape/` itinerary that covers that town
- Link to adjacent town pages

**Trail guides** (`/walks/`):
- Link to `/walks/` hub
- Link to `/places/` page for the walk's area
- Link to `/spa/`, `/eat/`, or `/wine/` for the "after the walk" section
- Link to existing experience entities (e.g. `bushrangers-bay-walk` experience)

**Planning articles** (weddings, corporate-events):
- Link to the vertical hub
- Link to 1 other page in the same vertical
- Link to 3 cross-vertical pages (`/stay/`, `/eat/`, `/places/`)

---

## 6. Pages to Promote / Upgrade (alongside new builds)

These are existing pages that can be significantly improved without new URLs:

| Existing page | Action |
|---|---|
| `/journal/mornington-peninsula-hot-springs-guide/` | Add canonical redirect or cross-link to new `/spa/peninsula-hot-springs-guide/`. Keep journal URL live; let the spa hub be the cluster anchor. |
| `/journal/peninsula-hot-springs-vs-alba.md` | Promote into `/spa/peninsula-hot-springs-vs-alba/` — move the content, 301 the journal URL. |
| `/explore/rainy-day` | Audit depth. If thin, rebuild to editorial standard and add FAQ schema. |
| `/escape/mornington-peninsula-itinerary` | Add ItemList schema, structured day-by-day sections, internal links to /spa/, /wine/, /eat/. |
| `/journal/mornington-peninsula-day-trip` | Cross-link prominently to new `/escape/mornington-peninsula-day-trip-from-melbourne/`. |

---

## 7. Build Notes

### Do not conflict with these live pages
- `/explore/best-walks` — live, do not duplicate or redirect
- `/explore/hot-springs` — live, cross-link to but don't replace with `/spa/`
- `/journal/` articles — keep live as spokes; don't merge into hub pages without a 301 plan
- `/eat/cellar-door-lunch` and `/eat/long-lunch` — live. `/eat/winery-lunch-mornington-peninsula/` is the search-intent version; distinguish editorially.

### Schema requirements per page type
- Hub sub-pages: `Article` + `ItemList` + `BreadcrumbList`
- Town hubs: `Article` + `ItemList` + `FAQPage` + `BreadcrumbList`
- Trail guides: `Article` + `FAQPage` + `BreadcrumbList`
- Planning articles: `Article` + `FAQPage` + `BreadcrumbList`

### Content collection integration
All new pages that feature venues, experiences, or places should reference the relevant content collection entries (135 venues, 42 experiences, 20 places) rather than hardcoding — this ensures data consistency and enables future programmatic updates.

---

## 8. Summary Table

| # | URL | Pillar | Type | Tier |
|---|---|---|---|---|
| 1 | `/spa/peninsula-hot-springs-guide/` | Spa | Hub sub-page | 1 |
| 2 | `/spa/alba-thermal-springs/` | Spa | Venue hub | 1 |
| 3 | `/spa/what-to-do-after-peninsula-hot-springs/` | Spa | Planning editorial | 1 |
| 4 | `/places/sorrento/` | Places | Town hub rebuild | 1 |
| 5 | `/places/red-hill/` | Places | Town hub rebuild | 1 |
| 6 | `/places/flinders/` | Places | Town hub rebuild | 1 |
| 7 | `/places/mornington/` | Places | Town hub rebuild | 1 |
| 8 | `/stay/romantic-accommodation-mornington-peninsula/` | Stay | Hub sub-page | 1 |
| 9 | `/stay/boutique-accommodation-mornington-peninsula/` | Stay | Hub sub-page | 1 |
| 10 | `/stay/accommodation-near-peninsula-hot-springs/` | Stay | Hub sub-page | 1 |
| 11 | `/walks/bushrangers-bay-walk/` | Walks | Trail guide | 2 |
| 12 | `/walks/cape-schanck-walk-and-hot-springs/` | Walks | Experience editorial | 2 |
| 13 | `/eat/winery-lunch-mornington-peninsula/` | Eat | Hub sub-page | 2 |
| 14 | `/wine/winery-lunch-mornington-peninsula/` | Wine | Cross-ref / redirect | 2 |
| 15 | `/stay/pet-friendly-accommodation-mornington-peninsula/` | Stay | Hub sub-page | 2 |
| 16 | `/stay/winery-accommodation-mornington-peninsula/` | Stay | Hub sub-page | 2 |
| 17 | `/escape/mornington-peninsula-day-trip-from-melbourne/` | Escape | Itinerary hub | 2 |
| 18 | `/explore/things-to-do-mornington-peninsula-couples/` | Explore | Intent hub | 2 |
| 19 | `/explore/things-to-do-mornington-peninsula-winter/` | Explore | Seasonal hub | 2 |
| 20 | `/places/rye/` | Places | Town hub rebuild | 2 |
| 21 | `/places/portsea/` | Places | Town hub rebuild | 3 |
| 22 | `/places/cape-schanck/` | Places | Place hub | 3 |
| 23 | `/weddings/where-guests-stay-mornington-peninsula-wedding/` | Weddings | Planning editorial | 3 |
| 24 | `/weddings/how-to-plan-a-mornington-peninsula-wedding-weekend/` | Weddings | Planning editorial | 3 |
| 25 | `/explore/things-to-do-mornington-peninsula-with-kids/` | Explore | Intent hub | 3 |
| 26 | `/explore/things-to-do-mornington-peninsula-rainy-day/` | Explore | Intent hub | 3 |
| 27 | `/corporate-events/how-to-plan-a-mornington-peninsula-corporate-retreat/` | Corporate Events | Planning editorial | 3 |
| 28 | `/escape/mornington-peninsula-2-day-itinerary/` | Escape | Itinerary hub | 3 |
| 29 | `/wine/romantic-wineries-mornington-peninsula/` | Wine | Hub sub-page | 3 |
| 30 | `/spa/peninsula-hot-springs-vs-alba/` | Spa | Comparison editorial | 3 |

---

*Prepared by Remy | 28 April 2026 | Peninsula Insider build queue — aligned to live IA as of commit `70affd43`*
