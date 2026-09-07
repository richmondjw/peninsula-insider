# Peninsula Insider SEO / GEO remediation

Status: implemented and verified in an isolated review branch; not deployed.

Production baseline: `ceabed52a05e3beab33930f08722095b2032f7b8`, verified through the live `/deployment.json`. Live audit captured 2026-09-07T13:02:55.232Z; completed build audit 2026-09-07T13:17:27.418Z. The original checkout's unrelated edits were left intact.

## Scope and outcomes

- Updated 18 metadata fields: 10 titles and 8 descriptions across 15 pages. Titles now meet the requested 45–60 character range; descriptions meet 150–160. Removed stale seasonal language without adding a fixed weekend date or unsupported voting/review claims.
- Restored descriptive alt text for the 13 affected current photo placements. Descriptions were checked against the actual photographs. SectionHero now retains CMS alt text and puts image editing attributes on the image, avoiding a duplicate full-size background download. Source-specific fallback descriptions cannot be attached to a different replacement filename.
- Optimized 150 unique current sources across 249 image references on the 20 requested routes plus the canonical `/explore/plans/` destination. Generated 549 WebP variants; the largest is 99,952 bytes, below the strict 100,000-byte limit.
- Added responsive image candidates and slot sizes for large editorial placements. Original photographs, CMS storage objects, social images, JSON-LD image URLs, page content and original crop/layout rules are preserved.
- Fixed two existing broken image paths on `/guides/` with existing site photographs.
- Public CMS hydration and the inline editor preserve responsive variants when the source is unchanged. A real image replacement clears stale variants and updates all matching slots, including repeated cards.

The supplied scan is a historical snapshot. Some events and photographs have rotated since then. The implementation covers the currently rendered pages; it does not modify unused historic originals. `/plans/` remains a consolidation redirect to `/explore/plans/`.

## Image comparison

These are the summed bytes of distinct image URLs referenced in each page's fallback markup, not measured initial network transfer or a Core Web Vitals score. Lazy loading, responsive selection, caching and repeated references affect actual downloads. Decimal MB. The audit also checks every referenced srcset candidate.

| Page | Before MB | After MB | Reduction | Images at or above 100KB after |
|---|---:|---:|---:|---:|
| / | 11.40 | 0.67 | 94.1% | 0 |
| /eat/ | 47.74 | 3.02 | 93.7% | 0 |
| /journal/ | 0.59 | 0.23 | 60.2% | 0 |
| /plans/ | 0.00 | 0.00 | n/a | 0 |
| /explore/plans/ | 3.60 | 0.26 | 92.8% | 0 |
| /stay/ | 4.23 | 1.12 | 73.6% | 0 |
| /wine/ | 3.85 | 1.00 | 74.1% | 0 |
| /explore/ | 18.85 | 2.07 | 89.0% | 0 |
| /dog-friendly/ | 0.16 | 0.08 | 50.5% | 0 |
| /fishing/ | 0.21 | 0.08 | 63.3% | 0 |
| /weddings/ | 0.18 | 0.09 | 50.8% | 0 |
| /boating/ | 0.19 | 0.07 | 64.5% | 0 |
| /awards/ | 0.00 | 0.00 | n/a | 0 |
| /whats-on/ | 0.30 | 0.10 | 65.3% | 0 |
| /tour/ | 9.70 | 1.08 | 88.9% | 0 |
| /corporate-events/ | 0.29 | 0.10 | 66.8% | 0 |
| /guides/ | 1.25 | 0.42 | 66.4% | 0 |
| /ask/ | 0.00 | 0.00 | n/a | 0 |
| /editorial-approach/ | 5.62 | 0.09 | 98.5% | 0 |
| /map/ | 0.00 | 0.00 | n/a | 0 |
| /about/ | 0.78 | 0.09 | 88.2% | 0 |

The live baseline contained 133 distinct oversized images. After the change, the 21-route audit has zero oversized served images, zero missing photo descriptions and zero broken image resources.

## Rendered metadata

| Page | Field | Characters | Value |
|---|---|---:|---|
| / | description | 155 | Plan a Mornington Peninsula getaway with restaurants, cellar doors, beaches, walks, places to stay and local events, selected by Peninsula Insider editors. |
| /stay/ | title | 53 | Mornington Peninsula Stays: Hotels, Villas & Cottages |
| /stay/ | description | 154 | Find your Mornington Peninsula stay, from boutique hotels and vineyard villas to coastal cottages and farm stays, with practical tips to plan your escape. |
| /explore/ | description | 157 | Explore things to do on the Mornington Peninsula, from coastal walks and beaches to hot springs, golf, markets and family outings. Find ideas for your visit. |
| /fishing/ | description | 158 | Explore fishing on the Mornington Peninsula, with guides to species, seasons, Port Phillip Bay, Western Port, charters, local access and licence requirements. |
| /weddings/ | title | 52 | Mornington Peninsula Wedding Venues & Planning Guide |
| /weddings/ | description | 157 | Plan your Mornington Peninsula wedding with guides to vineyard estates, coastal venues and boutique hotels, plus ideas for a weekend with family and friends. |
| /boating/ | description | 155 | Plan boating on the Mornington Peninsula with guides to boat hire, launch ramps, tides, safety and skippered charters. Find the right option for your trip. |
| /awards/ | title | 52 | Peninsula Insider Awards: Categories & How They Work |
| /whats-on/ | title | 51 | What's On Mornington Peninsula: Events This Weekend |
| /tour/ | description | 156 | Explore Mornington Peninsula tours, from cellar doors and wildlife to hot springs, scenic cruises and private charters. Compare options and plan your visit. |
| /corporate-events/ | title | 54 | Mornington Peninsula Corporate Events & Retreats Guide |
| /corporate-events/ | description | 158 | Plan corporate retreats and executive offsites on the Mornington Peninsula. Compare venues, locations and programme ideas to find the right fit for your team. |
| /guides/ | title | 52 | Mornington Peninsula Seasonal Guides & Weekend Ideas |
| /ask/ | title | 56 | Peninsula Concierge: Local Recommendations & Itineraries |
| /editorial-approach/ | title | 53 | Editorial Standards & Methodology \| Peninsula Insider |
| /map/ | title | 51 | Mornington Peninsula Insider Map: Places to Explore |
| /about/ | title | 51 | About Peninsula Insider: Mornington Peninsula Guide |

Open Graph and Twitter title/description values match the rendered page metadata. Canonical URLs and existing redirects retain their prior behaviour.

## Verification

- Production-mode `npm run build:search` passed with `PUBLIC_ACCESS_GATE=off` and `PUBLIC_NEWSLETTER_POPUP=on`: 981 HTML pages; 715 pages indexed by Pagefind. Local Node version 24.14.0.
- `npm run audit:seo-remediation`: all 21 routes, all affected metadata fields and all served image variants passed. This audit now runs in the normal build.
- `npm run test:seo-images`: 5 tests passed, covering source restrictions, parser safety, byte budgets, source/metadata preservation, repeatable assets, missing-source failures and CMS hydration/replacement behaviour. Runs in the normal build.
- Browser checks at 1440px and 390px for home, eat, journal, dog-friendly and tour: all 10 cases passed; CMS reads returned 200; zero raw CMS image requests, broken loaded images, empty photo descriptions, page errors or horizontal overflow. The final mobile-home check explicitly loaded the offscreen lazy carousel image. Homepage Journal crop measured 1.300 on both viewports, matching its authored 1.3 aspect ratio.
- CMS editable coverage passed. Content admission correctly rejected its deliberate invalid fixture. Agent-readiness tests passed 10/10; event safeguard tests passed 14/14. Existing build gates passed, including house style, navigation/CSS budgets, coordinates, SEO architecture, link graph, event safeguards, campaign review and partner dashboard.
- The pre-existing SEO architecture ratchet still carries unrelated findings (412 breadcrumb-count, 1 consolidation-loser, 9 entity-missing-id and 25 sitemap-absent findings). The empty local-secrets collection and Pagefind's account/likes fragment warning are unchanged. This report does not claim the entire site has zero SEO issues.

## Operation and release

The build creates content-addressed renditions under `dist/_images/`; source downloads and encoded files use an ignored local cache under `next/.cache/pi-images/`. Public CMS assets alone are eligible for remote downloading, with a timeout, size limit and no redirected fetches. Failed or missing eligible image sources fail the build instead of silently shipping a broken rendition. No credentials or paid image service were added.

New CMS uploads remain visible immediately. If a new photograph is published after a build, its original is displayed until the next successful rebuild generates its renditions. Image optimization is currently scoped to the audited hub routes; detail-page rollout is outside this change.

The 100KB and character ranges are the requested audit targets. They do not guarantee rankings or fixed Google snippets. Google's [image guidance](https://developers.google.com/search/docs/appearance/google-images) recommends useful alt text, responsive images and a balance between speed and visual quality.

Release remains pending review. After deployment, rerun:

```sh
cd next
node scripts/audit-seo-remediation.mjs --url https://peninsulainsider.com.au --assert --out .cache/seo-production.json
```

Then verify the live deployment SHA and inspect the homepage and one large listing in a browser. Roll back by reverting this change and running the existing deployment workflow; original assets have not been overwritten.
