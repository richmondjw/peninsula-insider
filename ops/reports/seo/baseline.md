# Peninsula Insider — SEO baseline

Frozen snapshot of where we started. Captured by `ops/scripts/seo/pull.mjs` on 2026-05-01.
Reference point for "is the work actually moving the needle?". **Never edit this file.**

## Date frozen

2026-05-01 (data window: 2026-04-02 → 2026-04-29, 28 days)

## Property

`sc-domain:peninsulainsider.com.au` (Domain property — full subdomain coverage)

## Headline

| Metric | Last 7d (Apr 23-29) | Prev 7d (Apr 16-22) | Last 28d |
|---|---:|---:|---:|
| Clicks | 8 | 2 | 23 |
| Impressions | 1,009 | 539 | 1,780 |
| CTR | 0.79% | 0.37% | 1.29% |
| Avg position | 17.4 | 16.6 | 16.7 |

**Trajectory at baseline**: positive but small. Impressions ~doubled WoW (539 → 1,009), clicks 4×ed (2 → 8). Position drifted slightly (16.6 → 17.4) because the site is being shown for more queries deeper in the long-tail — healthy for a new site. CTR doubled but is still well below 2%, consistent with weak SERP snippets.

## Indexation

- **Total URLs known to GSC**: 349
- **Indexed**: 39 (11.2%)
- **Discovered – currently not indexed**: 283 (the dominant problem)
- **Alternate page with proper canonical**: 21
- **Excluded by noindex**: 3
- **Crawled – currently not indexed**: 3

**Priority URL indexation** (the 14 pages we explicitly want indexed):

| Status | Count | URLs |
|---|---:|---|
| Indexed (PASS) | 2 | `/`, `/places/flinders/` |
| Discovered – not indexed | 9 | `/eat/best-restaurants/`, `/wine/best-cellar-doors/`, `/explore/best-walks/`, `/journal/mornington-peninsula-day-trip/`, `/journal/mornington-peninsula-in-autumn/`, `/journal/mornington-peninsula-with-kids/`, `/places/sorrento/`, `/places/mornington/`, `/places/rye/` |
| Alternate canonical | 3 | `/stay/best-accommodation/`, `/journal/dog-friendly-mornington-peninsula/`, `/places/red-hill/` |

## Top 10 queries by impressions (last 28d)

| # | Query | Impr | Clicks | CTR | Pos |
|---:|---|---:|---:|---:|---:|
| 1 | dog friendly guide mornington peninsula | 38 | 0 | 0.00% | 8.8 |
| 2 | 34 western parade point leo vic 3916 | 22 | 0 | 0.00% | 28.9 |
| 3 | a dog-friendly guide mornington peninsula | 20 | 0 | 0.00% | 6.8 |
| 4 | free things to do in mornington peninsula | 16 | 0 | 0.00% | 20.3 |
| 5 | 20 junction road merricks north vic 3926 | 15 | 0 | 0.00% | 29.9 |
| 6 | hotel near sorrento pier booking | 15 | 0 | 0.00% | 65.9 |
| 7 | accommodation near peninsula hot springs | 11 | 0 | 0.00% | 69.4 |
| 8 | dog friendly beaches mornington peninsula | 11 | 0 | 0.00% | 17.6 |
| 9 | endota sorrento | 10 | 0 | 0.00% | 5.7 |
| 10 | dog beaches mornington peninsula | 8 | 0 | 0.00% | 21.4 |

## Top 10 pages by clicks (last 28d)

| # | Page | Clicks | Impr | CTR | Pos |
|---:|---|---:|---:|---:|---:|
| 1 | `http://peninsulainsider.com.au/` | 9 | 20 | 45.00% | 1.8 |
| 2 | `/` | 7 | 48 | 14.58% | 2.2 |
| 3 | `/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/` | 3 | 42 | 7.14% | 6.0 |
| 4 | `/eat/` | 2 | 107 | 1.87% | 34.5 |
| 5 | `/journal/the-pub-guide` | 1 | 9 | 11.11% | 5.3 |
| 6 | `/journal/three-italian-dinners/` | 1 | 20 | 5.00% | 7.3 |
| 7 | `/whats-on/mornington-cup-2026` | 1 | 228 | 0.44% | 7.6 |
| 8 | `/wine/` | 1 | 224 | 0.45% | 16.8 |
| 9 | `http://peninsulainsider.com.au/journal/the-birthday-weekend` | 0 | 2 | 0.00% | 38.5 |
| 10 | `http://peninsulainsider.com.au/journal/the-birthday-weekend/` | 0 | 28 | 0.00% | 6.1 |

## Devices (last 28d)

| Device | Clicks | Impr | CTR | Pos |
|---|---:|---:|---:|---:|
| DESKTOP | 14 | 1,293 | 1.08% | 18.3 |
| MOBILE | 9 | 480 | 1.88% | 12.4 |
| TABLET | 0 | 7 | 0.00% | 11.7 |

## Geography

99.4% of impressions and 100% of clicks come from Australia (986 of 992 reportable impressions). Local intent is the engine.

## Sitemap snapshot

- **Sitemap URLs**: 240 (per `sitemap.xml` at this commit)
- **Section breakdown**: journal 90, explore 43, eat 27, wine 25, places 20, whats-on 17, escape 6, stay 5, plus single pages for golf/dog-friendly/weddings/corporate-events/partners/ask
- **Gap vs GSC**: GSC reports 349 URLs known. The ~109 URL gap is being investigated (likely legacy directory URLs, http:// vs https:// duplicates, slash variants).

## Critical findings (Day 1 audit)

1. **Duplicate broken canonical on every place page.** `next/src/components/PlaceDetailTemplate.astro:62` emits `<link rel="canonical" href=".../places/undefined">` because it reads `place.slug` (should be `place.id`). All 20 place pages affected. Compounded by `pages/places/[slug].astro` separately passing the correct canonical to BaseLayout — so each place page outputs **two `<link rel="canonical">` tags**. Logged as the first experiment.

2. **Stale GSC crawl data on the "alternate canonical" priority URLs.** GSC last crawled `/stay/best-accommodation/` on 2026-04-13. The current HTML has the correct trailing-slash canonical, but Google still has the old (no-slash) data. The deindex-then-reindex pattern matches the Apr 18-21 dip in the chart. Manual reindex requests should accelerate recovery for these.

3. **HTTP and trailing-slash variants are both being indexed.** Top page reports include `http://peninsulainsider.com.au/`, `http://peninsulainsider.com.au/journal/the-birthday-weekend` (no slash), and `http://peninsulainsider.com.au/journal/the-birthday-weekend/` (with slash) as distinct pages. GitHub Pages 301-redirects the no-slash version, but the http→https redirect status is unconfirmed. Splits link equity and confuses Google about which URL is canonical.

4. **Dog-friendly content is the demand magnet.** 5 of the top 10 queries by impressions involve "dog friendly" or "dog beaches". `/journal/dog-friendly-mornington-peninsula` shows in 248+99 (slash variants) impressions but earns 0 clicks because the canonical bug splits the page, and snippet quality is unknown. This is the single highest-leverage content cluster.

5. **`/whats-on/mornington-cup-2026`: 228 impressions, 0.44% CTR at position 7.6.** Title/meta rewrite alone could plausibly 5-10× clicks for this seasonal high-volume query.

6. **Address-string queries**: 4 of the top 10 by impressions are exact street addresses (Pt Leo, Merricks North, Dromana, Sorrento). Suggests legacy directory listing pages still indexed. Worth investigating whether they should be noindexed (address searches want a map, not a listing).

7. **Editorial dispatch / journal pages dominate the URL count** (90 of 240) but only one (`dog-friendly-cafes-pubs-wineries-mornington-peninsula`) appears in the top-clicks list. Most journal content has not yet earned ranking.
