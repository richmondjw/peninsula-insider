# Peninsula Insider — Information Architecture

> Last updated: 2026-05-24  
> Maintainer: James Richmond

---

## Table of Contents

1. [IA Principles](#1-ia-principles)
2. [Site Map — Top-Level Hierarchy](#2-site-map--top-level-hierarchy)
3. [Navigation Structure](#3-navigation-structure)
4. [Editorial Pillars](#4-editorial-pillars)
5. [Content Taxonomy](#5-content-taxonomy)
6. [URL Structure](#6-url-structure)
7. [Places Hierarchy](#7-places-hierarchy)
8. [Venue Routing Logic](#8-venue-routing-logic)
9. [The Dispatch Layer (What's On)](#9-the-dispatch-layer-whats-on)
10. [The Journal](#10-the-journal)
11. [Reader Account Layer](#11-reader-account-layer)
12. [Partner and Commercial Layer](#12-partner-and-commercial-layer)
13. [SEO Architecture](#13-seo-architecture)
14. [Redirect Map](#14-redirect-map)
15. [Sitemap Priority Tiers](#15-sitemap-priority-tiers)

---

## 1. IA Principles

The site is organised as an **editorial destination**, not a directory. A few decisions flow from that:

- **Pillar navigation** is structured around what a visitor wants to do on the Peninsula (eat, stay, drink wine, explore), not around content types.
- **Places are hubs**, not filters. `/places/sorrento/` aggregates all content for a town — venues, experiences, itineraries, articles, events — rather than venues having a "location" facet.
- **The Journal carries authority**. Long-form editorial (think magazine feature, not blog post) sits under `/journal/`. SEO landing pages and service pieces live here too.
- **What's On is a dispatch**, not a events calendar. It has an opinion about each event. It publishes like a newsletter, on a cadence.
- **No dollar figures on the site**. Prose prices are hard-blocked by `next/scripts/lint-no-pricing.mjs` (extended 2026-07-04 to cover md/json/astro copy; B2B rate cards exempt). The relative `priceBand` ($–$$$$) IS rendered (venue meta, directory filter chips) as a deliberate exception: relative bands don't go stale the way dollar figures do. This supersedes the earlier "priceBand is never rendered" note, which had drifted from the shipped product.

---

## 2. Site Map — Top-Level Hierarchy

```
peninsulainsider.com.au/
│
├── /                           Homepage — editorial cover + TOC
│
├── EDITORIAL PILLARS
│   ├── /eat/                   Eat & Drink hub
│   ├── /wine/                  Wine Country hub
│   ├── /stay/                  Stay hub
│   ├── /explore/               Explore hub (walks, beaches, markets, activities)
│   ├── /plans/                 Plans hub (curated itineraries)
│   ├── /whats-on/              What's On hub (events dispatch)
│   └── /journal/               Journal (editorial long-form)
│
├── SPECIALIST VERTICALS
│   ├── /fishing/               Fishing (species, locations, charters)
│   ├── /boating/               Boating (hire, ramps, tides)
│   ├── /tour/                  Tours (operators, packages, day trips)
│   ├── /tour-packages/         Tour packages index
│   ├── /golf/                  → redirect to /explore/golf/
│   ├── /spa/                   → redirect to /explore/spas-and-wellness/
│   ├── /dog-friendly/          Dog-friendly hub
│   ├── /weddings/              Weddings hub
│   └── /corporate-events/      Corporate events hub
│
├── DISCOVERY TOOLS
│   ├── /places/                Place hubs index
│   ├── /places/[slug]/         Individual place hub (37 places)
│   ├── /search/                Full-text + semantic search
│   ├── /ask/                   AI concierge (Peninsula Insider Insider)
│   ├── /map/                   Interactive map of the Peninsula
│   └── /guides/                Seasonal guides (summer, autumn, winter, spring)
│
├── COLLECTIONS & CURATION
│   ├── /insiders-30/           The Insider's 30 list
│   ├── /insiders-30/[year]/    Year-specific list
│   ├── /picks/                 Editor's weekend picks (Weekend Curation)
│   └── /awards/                Peninsula Insider Awards
│
├── READER LAYER
│   ├── /account/               Profile + settings
│   ├── /account/saved/         Saved venues, events, experiences
│   ├── /account/likes/         Liked articles
│   ├── /account/pass/          Pass membership management
│   ├── /alerts/                Event alerts preferences
│   ├── /itinerary/             Personal itinerary builder
│   └── /pass/                  Pass landing page
│
├── PARTNER LAYER
│   ├── /partners/              Partner programme overview
│   ├── /partners/apply/        Vendor application form
│   ├── /partners/claim/        Venue claim form
│   ├── /partners/dashboard/    Partner editorial dashboard
│   ├── /partners/update/       Venue update/change request form
│   └── /partner-with-us/       Commercial pitch page
│
├── TRUST ARCHITECTURE
│   ├── /editorial-approach/    How PI works, methodology
│   ├── /methodology/           Detail on editorial standards
│   ├── /about/                 About the publication
│   ├── /ethics/                Ethics and independence statement
│   ├── /contact/               Contact
│   ├── /corrections/           Corrections policy
│   ├── /complaints/            Complaints process
│   ├── /privacy/               Privacy policy
│   ├── /terms/                 Terms of use
│   └── /accessibility/         Accessibility statement
│
└── UTILITY
    ├── /newsletter/            Newsletter / subscription
    ├── /submit/                Community submission form
    ├── /site-index/            Full A–Z site index
    ├── /sitemap.xml            Machine-readable sitemap
    └── /feed.xml               RSS feed
```

---

## 3. Navigation Structure

### Masthead (7-slot row)

> Updated 2026-07-04 to match the shipped v4 nav (`next/src/lib/v4-nav.ts`), which is the source of truth. Category pillars lead; the temporal/editorial surfaces trail.

| Position | Label | URL |
|---|---|---|
| 1 | Eat & Drink | `/eat/` |
| 2 | Stay | `/stay/` |
| 3 | Wine | `/wine/` |
| 4 | Explore | `/explore/` |
| 5 | Plans | `/explore/plans/` |
| 6 | What's On | `/whats-on/` |
| 7 | Journal | `/journal/` |

Specialist verticals (Walks, Golf, Fishing, Boating, Tours, Dog Friendly) surface via the **Specialist guides** column inside the Explore mega-panel, and via the footer's niche column (which also carries Weddings, Corporate, Signature events, Awards, Spa).

### V4 Mega-navigation (desktop)

Each pillar opens a full-width mega-panel with:
- **Intro sentence** — PI voice, one sentence framing the pillar
- **2–3 editorial columns** — max 6 curated items per column, noun-phrase labels
- **Editor's rail** — one pinned recommendation with image, verdict, and CTA
- **Ask PI footer** — "What are you looking for? Ask PI →" linking to `/ask/`

Pillar column structure:

| Pillar | Col 1 | Col 2 | Col 3 |
|---|---|---|---|
| What's On | Live this weekend | By mood | By place |
| Plans | Weekends | Escapes | By theme |
| Eat & Drink | By meal | By place | In voice |
| Wine | By variety | By region | Good to know |
| Stay | By type | By place | For couples / families |
| Explore | On foot | On the water | Getting there |
| Journal | Long reads | Guides | Weekend picks |

### Homepage pillar strip

Below the cover, a 9-tile grid surfaces the full pillar set including the specialist verticals:

Plans · What's On · Eat & Drink · Stay · Explore · Wine Country · Tours · Golf · Spa

### Footer columns

| Column | Contents |
|---|---|
| **Sections** | All 16 editorial lanes |
| **Places** | 12 featured place hubs (editorial order) + "All places" |
| **About** | Editorial Approach, Partner With Us, Contact |
| **Utility row** | Map, Publication, Privacy, Cookie settings |

---

## 4. Editorial Pillars

The five content pillars are **Eat & Drink**, **Wine**, **Stay**, **Explore**, and **Journal**. Two dispatch lanes sit alongside them: **What's On** (events) and **Plans** (itineraries). Together these form the seven masthead items.

### Pillar to content type mapping

| Pillar | Primary content type | Secondary content | Venue route |
|---|---|---|---|
| Eat & Drink | Venues (restaurant, cafe, bakery, pub, market) | Articles, place hubs | `/eat/[slug]/` |
| Wine | Venues (winery, producer, brewery, distillery) | Articles, place hubs | `/wine/[slug]/` |
| Stay | Venues (hotel, villa, cottage, glamping, farm-stay, spa) | Articles, place hubs | `/stay/[slug]/` |
| Explore | Experiences (walks, beaches, golf, markets, galleries, etc.) | Articles, itineraries | `/explore/[slug]/` |
| Plans | Itineraries | Venues, experiences | `/plans/[slug]/` |
| What's On | Events (calendar) + PTW dispatch | Signature events | `/whats-on/[slug]/` |
| Journal | Articles (all formats) | — | `/journal/[slug]/` |

---

## 5. Content Taxonomy

### Venue types → pillar routing

| Type | Pillar | Route |
|---|---|---|
| `restaurant`, `cafe`, `bakery`, `pub`, `market` | Eat & Drink | `/eat/[slug]/` |
| `winery`, `producer`, `brewery`, `distillery` | Wine | `/wine/[slug]/` |
| `hotel`, `villa`, `cottage`, `glamping`, `farm-stay`, `spa` | Stay | `/stay/[slug]/` |

All other types default to Eat & Drink.

### Experience types

| Type | Count | Description |
|---|---|---|
| `golf-course` | 11 | Golf courses — schema.org `GolfCourse` |
| `walk` | 10 | Walking trails and coastal paths |
| `beach` | 10 | Beach entries — schema.org `Beach` |
| `market` | 5 | Farmers and artisan markets |
| `gallery` | 3 | Art galleries — schema.org `ArtGallery` |
| `tour` | 2 | Experience-type tours |
| `lookout` | 2 | Scenic lookouts |
| `park` | 1 | Parks |
| `attraction` | 1 | Other attractions |

### Article formats

Articles carry a `format` field that drives editorial display (header treatment, label, byline style):

| Format | Description |
|---|---|
| `editors-letter` | Cover essay — pairs with the homepage cover image |
| `long-lunch-list` | Curated restaurant list in long-lunch format |
| `cellar-door-dispatch` | Wine editorial dispatch |
| `stay-notes` | Accommodation editorial |
| `slow-peninsula` | Seasonal / slow travel essay |
| `insider-edit` | Editor's shortlist |
| `interview` | Q&A interview |
| `investigation` | Reported piece |
| `service` | Practical service piece (e.g. "how to get here") |
| `weekend-picker` | Peninsula This Weekend dispatch (rendered at `/whats-on/this-weekend/`) |
| `hub-guide` | Guide for a place hub or category |
| `trail-guide` | Walk / experience guide |
| `venue-guide` | In-depth single-venue piece |

### Event categories

Events carry a `category` used for alerts subscriptions and filtering:

`food-wine` · `market` · `festival` · `cellar-door` · `community` · `arts` · `wellness` · `live-music` · `racing-sport` · `family-programs` · `exhibition` · `civic` · `nature` · `writers-ideas`

### Event lenses

Cross-cutting editorial lenses applied to events (used for What's On mood/intent filtering):

`weekend-pick` · `date-idea` · `family-saturday` · `rainy-day` · `worth-the-drive` · `free` · `school-holidays` · `walk-in` · `ticketed` · `locals-know`

---

## 6. URL Structure

### Canonical patterns

```
/                                    Homepage
/eat/[slug]/                         Eat venue detail
/wine/[slug]/                        Wine venue detail
/stay/[slug]/                        Stay venue detail
/explore/[slug]/                     Experience detail
/plans/[slug]/                       Itinerary detail
/whats-on/[slug]/                    Event detail (calendar event or signature event)
/journal/[slug]/                     Journal article
/places/[slug]/                      Place hub
/fishing/species/[slug]/             Fish species
/fishing/locations/[slug]/           Fishing location
/fishing/charters/[slug]/            Charter operator
/boating/ramps/[slug]/               Boat ramp
/boating/hire/[slug]/                Boat hire operator
/tour/[slug]/                        Tour detail
/tour/operators/[slug]/              Tour operator
/tour-packages/[slug]/               Tour package detail
/awards/[slug]/                      Awards category
/insiders-30/[year]/                 Year's Insider's 30 list
/whats-on/this-weekend/              Rolling PTW dispatch (always current)
/whats-on/this-weekend/archive/[date]/  Past PTW dispatches (YYYY-MM-DD)
/whats-on/by-mood/[mood]/            What's On filtered by mood/lens
```

### Category filter pages (static)

These are handwritten Astro pages (not dynamic routes) that act as curated entry points and SEO landing pages:

**Eat & Drink:** `/eat/best-restaurants/` · `/eat/long-lunch/` · `/eat/fine-dining/` · `/eat/hatted-restaurants/` · `/eat/cellar-door-lunch/` · `/eat/cafes/` · `/eat/bakeries/` · `/eat/seafood/` · `/eat/pubs/` · `/eat/brunch/` · `/eat/waterfront/` · `/eat/date-night/` · `/eat/markets/` · `/eat/family-friendly/` · `/eat/dog-friendly/` · `/eat/paddock-to-plate/` · `/eat/no-booking/`

**Wine:** `/wine/cellar-doors/` · `/wine/best-cellar-doors/` · `/wine/best-wineries-mornington-peninsula/` · `/wine/pinot-noir/` · `/wine/chardonnay/` · `/wine/appointment-producers/` · `/wine/dog-friendly/` · `/wine/wine-region/`  
By region: `/wine/red-hill/` · `/wine/main-ridge/` · `/wine/merricks/` · `/wine/moorooduc/` · `/wine/balnarring/` · `/wine/flinders/` · `/wine/moorooduc-tuerong/`

**Stay:** `/stay/best-accommodation/` · `/stay/boutique-hotels/` · `/stay/villas/` · `/stay/cottages/` · `/stay/glamping/` · `/stay/wellness-retreats/` · `/stay/couples-retreats/` · `/stay/luxury/` · `/stay/resorts/` · `/stay/coastal-stays/` · `/stay/vineyard-stays/` · `/stay/winery-accommodation/` · `/stay/hot-springs-accommodation/` · `/stay/dog-friendly/`  
By place: `/stay/sorrento/` · `/stay/flinders/` · `/stay/red-hill/` · `/stay/mornington/` · `/stay/cape-schanck/`

**Explore:** `/explore/walks/` · `/explore/beaches/` · `/explore/markets/` · `/explore/rainy-day/` · `/explore/things-to-do/` · `/explore/hot-springs/` · `/explore/spas-and-wellness/` · `/explore/golf/` · `/explore/family-friendly/` · `/explore/dog-friendly/` · `/explore/free/` · `/explore/day-trips/` · `/explore/weekend-trips/` · `/explore/getting-here/` · `/explore/getting-around/` · `/explore/where-to-base-yourself/`

**Journal SEO pages** (priority 0.8): Evergreen service articles targeting high-intent search queries — see [Section 13](#13-seo-architecture).

---

## 7. Places Hierarchy

Places are **geographic hubs** that aggregate all content for a locality. Each place has a `kind`, a `zone`, and links to related venues, experiences, itineraries, and articles.

### Zones (geographic clusters)

| Zone | Places |
|---|---|
| `bayside` | Mornington, Mount Martha, Capel Sound, Safety Beach, Rye, Rosebud, McCrae, Dromana, plus others along Port Phillip |
| `western-port` | Hastings, Somers, Stony Point, Bittern, Balnarring, Merricks Beach, Point Leo, Shoreham, plus others |
| `red-hill-plateau` | Red Hill, Red Hill South, Merricks, Merricks North, Merricks, Tuerong, Moorooduc |
| `back-beaches` | Portsea, Sorrento, Blairgowrie, Rye (back beach), St Andrews Beach, Boneo |
| `ocean-coast` | Cape Schanck, Fingal, Point Nepean |
| `tip` | Sorrento, Portsea, Blairgowrie |
| `hinterland` | Main Ridge, Red Hill, Arthurs Seat |

### Place kinds

| Kind | Count | Description |
|---|---|---|
| `village` | 21 | Small town / village |
| `town` | 13 | Larger town with services |
| `zone` | 1 | Geographic zone (e.g. wine region) |
| `ridge` | 1 | Topographic (Red Hill plateau) |
| `cape` | 1 | Cape / point (Cape Schanck) |

### Place hub page structure

Each `/places/[slug]/` page surfaces:

1. **Hero** — place name, intro, hero image
2. **Eat & Drink** — up to 6 venues (non-stay, non-wine types)
3. **Wine** — up to 6 venues (winery types)
4. **Stay** — up to 4 venues (stay types)
5. **Experiences** — all experiences tagged to this place
6. **Itineraries** — plans whose stops include venues or experiences in this place
7. **Journal** — articles tagged with this place slug or containing the place name
8. **Related Places** — nearby / related places

---

## 8. Venue Routing Logic

Venues are stored in a single `venues` collection. The URL they live at depends on their `type` field:

```
type ∈ {restaurant, cafe, bakery, pub, market}  →  /eat/[slug]/
type ∈ {winery, producer, brewery, distillery}  →  /wine/[slug]/
type ∈ {hotel, villa, cottage, glamping, farm-stay, spa}  →  /stay/[slug]/
anything else  →  /eat/[slug]/
```

This routing is applied by `venueHrefPrefix()` in `next/src/lib/editorial.ts` and repeated in the sitemap generator. Every venue card, place hub listing, and sitemap entry respects this logic.

**Note on "market" type:** Markets appear in `/eat/` even though they are also surfaced under `/explore/markets/`. The explore page treats markets as experiences (from the `experiences` collection); the `/eat/markets/` page lists venues of type `market`.

---

## 9. The Dispatch Layer (What's On)

What's On has three content surfaces that together form the Peninsula Insider events dispatch:

### `/whats-on/` — Index / calendar

Aggregates all current events. Filterable by category (food-wine, market, festival, etc.) and mood lens (date-idea, rainy-day, family-saturday, etc.).

### `/whats-on/this-weekend/` — Rolling dispatch

The **Peninsula This Weekend (PTW)** dispatch. Always shows the most recently published `weekend-picker` format article. This is a stable URL — AI assistants, external publications, and readers link here as "what's happening this Saturday."

- Published each **Sunday** for the upcoming Saturday–Sunday window.
- Title dates follow the convention: publish date + 6 days (Saturday), publish date + 7 days (Sunday).
- Past dispatches preserved at `/whats-on/this-weekend/archive/[YYYY-MM-DD]/`.
- Legacy `/journal/peninsula-this-weekend-*/` URLs 301-redirect to the archive.

### `/events/[slug]/` — Signature Events

Annual recurring events (Pinot Palooza, Peninsula Picnic, etc.) with full editorial write-up — "What it is", "Who it's for", calendar context, getting there. These are long-shelf-life evergreen pages, not calendar listings.

### `/whats-on/by-mood/[mood]/` — Mood filters

Dynamic routes for each event lens (`/whats-on/by-mood/date-idea/`, `/whats-on/by-mood/rainy-day/`, etc.).

---

## 10. The Journal

The Journal is Peninsula Insider's editorial voice. It contains:

1. **Feature essays** — slow-peninsula, editors-letter, investigation, interview formats
2. **Curated lists** — long-lunch-list, insider-edit, cellar-door-dispatch formats
3. **Service articles** — practical guides about getting here, getting around, seasonal planning
4. **SEO landing pages** — evergreen high-intent pieces targeting "mornington peninsula [topic]" queries (see Section 13)
5. **PTW archive** — past Peninsula This Weekend dispatches (redirected from `/journal/` to `/whats-on/this-weekend/archive/`)

### Journal sub-sections

| Sub-section | URL | Content |
|---|---|---|
| Cellar Door Dispatch | `/journal/cellar-door/` | Wine editorial hub |
| Local Secrets | `/journal/local-secrets/[slug]/` | Short insider tips |

---

## 11. Reader Account Layer

Requires Supabase Auth (email magic link or Google OAuth).

| Page | URL | Contents |
|---|---|---|
| Account home | `/account/` | Profile, preferences |
| Saved | `/account/saved/` | Saved venues, events, experiences grouped by type |
| Likes | `/account/likes/` | Liked journal articles |
| Pass | `/account/pass/` | Membership status, renewal date, billing portal link |
| Alerts | `/alerts/` | Event alert subscription management |
| Itinerary builder | `/itinerary/` | Personal drag-and-drop planner |
| Pass landing | `/pass/` | Membership tiers and signup |

### Save architecture

The `pi:saves:v2` store saves three entity kinds: `venue`, `event`, `experience`. Each save records: `kind`, `slug`, `title`, `href`. The `/account/saved/` page groups by kind and renders entity cards.

The `/plan/?p=[base64]` URL encodes a saved plan as a shareable link — no login required to view a shared plan, but saving it to your account requires auth.

---

## 12. Partner and Commercial Layer

| Page | URL | Audience |
|---|---|---|
| Partners overview | `/partners/` | Venue operators |
| Apply | `/partners/apply/` | New partner application (community form) |
| Claim | `/partners/claim/` | Existing venue claim request |
| Dashboard | `/partners/dashboard/` | Partner-facing editorial portal (authenticated) |
| Update / change request | `/partners/update/` | Operator-submitted change requests |
| Advertising kit | `/partners/advertising-kit/` | Media kit for advertisers |
| Partner with us | `/partner-with-us/` | Commercial pitch / sponsorship |

The partner/change-request flow feeds into `pi.submissions` in Supabase. Editors review and moderate via the Supabase dashboard.

---

## 13. SEO Architecture

### Evergreen journal landing pages (priority 0.8)

Handwritten articles targeting core "mornington peninsula [intent]" queries. These pages exist independently of the venue/experience data and carry editorial long-form treatment:

| URL | Query target |
|---|---|
| `/journal/mornington-peninsula-in-autumn/` | Autumn on the Peninsula |
| `/journal/mornington-peninsula-in-winter/` | Winter on the Peninsula |
| `/journal/mornington-peninsula-with-kids/` | Peninsula with kids |
| `/journal/dog-friendly-mornington-peninsula/` | Dog friendly Peninsula |
| `/journal/mornington-peninsula-day-trip/` | Day trip from Melbourne |
| `/journal/mornington-peninsula-hot-springs-guide/` | Hot springs guide |
| `/journal/mornington-peninsula-winery-tour/` | Winery tour |
| `/journal/mornington-peninsula-itinerary/` | Weekend itinerary |
| `/journal/free-things-to-do-mornington-peninsula/` | Free things to do |
| `/journal/best-brunch-mornington-peninsula/` | Best brunch |
| `/journal/mornington-peninsula-wedding-venues/` | Wedding venues |

### Category landing pages

Best-of and filter pages (e.g. `/eat/best-restaurants/`, `/wine/best-cellar-doors/`) are priority 0.9 — slightly below the section hubs (0.9) but indexed as key entry points. These pages carry FAQPage and BreadcrumbList schema.org markup.

### Schema.org markup strategy

Each page type emits relevant structured data:

| Page type | Schema types |
|---|---|
| Venue detail | `Restaurant` / `LodgingBusiness` / `Winery` / `LocalBusiness` |
| Experience detail | `TouristAttraction` / `Beach` / `Park` / `ArtGallery` / `GolfCourse` |
| Article | `Article` / `NewsArticle` |
| Place hub | `City` / `Place` + `BreadcrumbList` |
| Journal SEO pages | `FAQPage` + `BreadcrumbList` |
| Signature events | `Event` |
| Homepage | `WebSite` + `Organization` |

---

## 14. Redirect Map

Pages that have moved but retain inbound links via redirect stubs (`export const prerender = false` with `Redirect` component):

| Legacy URL | Canonical destination | Reason |
|---|---|---|
| `/escape/` | `/plans/` | Section renamed May 2026 |
| `/escape/[slug]/` | `/plans/[slug]/` | Individual plan URLs migrated |
| `/golf/` | `/explore/golf/` | Golf consolidated into Explore |
| `/spa/` | `/explore/spas-and-wellness/` | Spa consolidated into Explore |
| `/walks/` | `/explore/walks/` | Walks consolidated into Explore |
| `/do/` | `/explore/` | Legacy explore entry point |
| `/eat-drink/` | `/eat/` | Section URL simplified |
| `/journal/peninsula-this-weekend-*/` | `/whats-on/this-weekend/archive/[date]/` | PTW moved to What's On dispatch |

The `/escape/` family retains all its pages as `noindex` stubs so inbound links resolve — they're not listed in the sitemap but they do 301-equivalent client-side redirects.

---

## 15. Sitemap Priority Tiers

Priorities declared in `/sitemap.xml`:

| Priority | Pages |
|---|---|
| **1.0** | Homepage, `/whats-on/this-weekend/`, `/ask/`, `/dog-friendly/`, `/whats-on/`, `/corporate-events/`, `/fishing/`, `/explore/golf/` |
| **0.9** | Section hubs: `/eat/`, `/stay/`, `/wine/`, `/explore/`, `/plans/`, `/journal/`, `/places/`, `/boating/`, `/weddings/`; Best-of pages: `/eat/best-restaurants/`, `/wine/best-cellar-doors/`, `/stay/best-accommodation/`, `/explore/best-walks/` |
| **0.8** | All venue detail pages, place hub pages, fish species pages, SEO journal landing pages, fishing/boating sub-hubs |
| **0.7** | Experience detail pages, journal articles, itinerary detail pages, fishing sub-hub pages |
| **0.6** | PTW archive pages (`/whats-on/this-weekend/archive/[date]/`) |
| **0.5** | Partner application page |

**`changefreq` convention:** `weekly` for all content that could change based on editorial updates; `monthly` for evergreen service content; `yearly` for legal/policy pages.

**`sitemapExclude` flag:** Present on individual content entries (venues, experiences, places, articles, itineraries) to suppress from sitemap without deleting the page. Used for placeholder pages, staging content, and duplicate SEO stubs.
