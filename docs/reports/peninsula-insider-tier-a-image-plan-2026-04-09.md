# Peninsula Insider — Tier A Image Plan (V2 first 50 slots)

**Prepared for:** James Richmond, Owner / Editor-in-chief
**Prepared by:** Image Sourcing Desk (Remy subagent)
**Date:** 9 April 2026
**Classification:** Operational sprint plan — V2 Tier A
**Supersedes:** §7.1 of `peninsula-insider-image-sourcing-report-2026-04-09.md` (which specified 18 Tier A slots and deferred the rest to Tier B/C). This plan expands Tier A to **50 slots** covering every V2 page currently shipped, and reclassifies Tier B/C as Phase-2 venue-scale imagery.
**Sibling documents:**
- `peninsula-insider-image-sourcing-report-2026-04-09.md`
- `peninsula-insider-image-approval-workflow-2026-04-09.md`
- `peninsula-insider-generative-image-style-2026-04-09.md`

---

## 1. Why this plan exists

The original sourcing report stopped at 18 Tier A slots because it treated the venue detail pages as Tier B and the experience/itinerary pages as Tier C. That was correct on 9 April morning; by 9 April evening, V2 has *actually shipped* detail pages for:

- 9 eat venues (Tedesca, Laura Pt Leo, Montalto, Paringa Estate, Polperro, Pt Leo Estate, Quealy, Stillwater Crittenden, Ten Minutes by Tractor)
- 6 stay venues (Jackalope, Lindenderry, Flinders Hotel, Hotel Sorrento, The Continental Sorrento, plus the Stay hub)
- 5 explore venues (Bushrangers Bay Walk, Cape Schanck Boardwalk, Point Nepean Fort Walk, Sorrento Back Beach, Red Hill Market)
- 5 wine venues (Montalto, Paringa Estate, Polperro, Quealy, plus Wine hub)
- 2 escape itineraries (Flinders and Cape Reset, Ridge to Sea Two Night Escape)
- 4 journal articles (Long Lunch, Red Hill Saturday, Late-Afternoon Walks, Two-Night Escape)
- 6 place pages (Red Hill, Sorrento, Flinders, Merricks, Cape Schanck, Point Nepean)

That is **37 detail pages** currently running on fog placeholders, plus 7 hub pages and the homepage. Every one of those is a Tier A problem today — the reader lands on a real URL, the URL currently looks like a gradient block, and no amount of good typography rescues it.

This plan is the 50-slot response. 50 is deliberate: it is the smallest number that covers **every shipped V2 page with a single hero image**, plus the most strategically important editorial support slots. Everything beyond 50 is still Tier B (remaining venue heroes as V2 scales) or Tier C (secondary gallery images, non-hero modules).

---

## 2. How to read this plan

Each slot has ten fields:

| Field | Meaning |
|---|---|
| **Slot ID** | Canonical identifier; matches the brief, shortlist and decision filenames. |
| **Target surface** | The V2 URL or component where the image lands. |
| **Content JSON** | The file the implementer updates after approval. `—` means the image is referenced from a component, not from content. |
| **Category** | One of the 12 editorial categories in the sourcing report §5. |
| **Subject needed** | Plain-English description of what the image must show. |
| **Preferred source** | Ranked 1–3 from the whitelist in sourcing report §4. |
| **Geo-verification** | `required` (image must be provably of this place) or `categorical` (image can be an editorial stand-in if the copy does not claim it is specific). |
| **Generative policy** | `forbidden` / `allowed-as-fallback` / `preferred`. |
| **Selection notes** | Editor guardrails — what to accept, what to reject. |
| **Week** | Sprint week 1, 2 or 3. |

All 50 slots sit inside the two-step workflow in `peninsula-insider-image-approval-workflow-2026-04-09.md`. This plan is the input brief to that workflow, not a replacement for it.

---

## 3. Slot ranking — the 50-slot priority ladder

The order matters. Do not work Slot 12 before Slot 7. The ladder is built from three ranked weights:

1. **Reader impact** — how many readers see this surface in week one of V2 launch.
2. **Brand exposure** — how much of the brand the image defines on first impression.
3. **Recoverability** — how hard it is to replace this image later if we get it wrong.

Homepage is rank 1 because it is the single most-seen, most-defining, hardest-to-replace surface in the entire product. Hub heroes are 2–8 because they are the five doorways into the product plus the two editorial doors (Journal, Escape). Place heroes come next because they are the SEO bed-rock. Venue heroes follow because they are the highest-volume but individually lowest-risk surface. Editorial support slots come last because they are the easiest to replace with a re-pull.

---

## 4. The 50 Tier A slots

### 4.1 WEEK 1 — 18 strategic slots (homepage + hubs + editorial foundations)

#### Slot 1 — Homepage cover

| | |
|---|---|
| **Slot ID** | `home-cover-01` |
| **Target surface** | `V2/index.html` — `CoverHero.astro` cover module |
| **Content JSON** | — (referenced from component; candidate file target `/next/public/images/sourced/home-cover.webp`) |
| **Category** | 1 — Landscape & coastline |
| **Subject needed** | A single-focal-point Peninsula landscape: coastal cliff, vineyard morning fog, or Red Hill plateau light. Must read as "the Mornington Peninsula as a place," not as a specific postcard view. |
| **Preferred source** | 1. Wikimedia Commons (Peninsula-verifiable) &nbsp;·&nbsp; 2. Visit Victoria Content Hub &nbsp;·&nbsp; 3. Unsplash (categorical fallback only) |
| **Geo-verification** | **required** |
| **Generative policy** | **forbidden** |
| **Selection notes** | Must be warm, filmic, cool-climate. Not sunset. Not a drone shot. Not a postcard. One human permitted only as scale, not subject. Reject if it reads as "any headland in Victoria" — the image has to feel Peninsula-specific even without a caption. |
| **Week** | 1 |

#### Slot 2 — Eat & Drink hub hero

| | |
|---|---|
| **Slot ID** | `eat-hub-hero-01` |
| **Target surface** | `V2/eat/index.html` — `SectionHero.astro` |
| **Content JSON** | — |
| **Category** | 5 — Dining room interior (primary) / 3 — Plated food (secondary) |
| **Subject needed** | An empty or lightly populated intimate dining room, natural window light, linen, timber, ceramic. The room carries the section. No humans as subject. |
| **Preferred source** | 1. Unsplash &nbsp;·&nbsp; 2. Pexels &nbsp;·&nbsp; 3. Venue media kit (if one of the hatted venues will release a dining-room shot) |
| **Geo-verification** | **categorical** — copy does not claim the room is a Peninsula restaurant |
| **Generative policy** | **forbidden** for the hub hero (too brand-defining); generative atmospherics reserved for smaller surfaces |
| **Selection notes** | Reject: candlelit romance cliché, top-down flatlays, chef-as-subject, anything that reads as "wedding venue." Prefer: a room with negative space for the hub headline "Eat & Drink." |
| **Week** | 1 |

#### Slot 3 — Stay hub hero

| | |
|---|---|
| **Slot ID** | `stay-hub-hero-01` |
| **Target surface** | `V2/stay/index.html` — `SectionHero.astro` |
| **Content JSON** | — |
| **Category** | 6 — Hotel interior, design & room |
| **Subject needed** | A design hotel interior — suite, bathroom, or communal lounge — morning light, clean architecture, no people. Must feel like the kind of room a reader would want to wake up in. |
| **Preferred source** | 1. Unsplash &nbsp;·&nbsp; 2. Pexels &nbsp;·&nbsp; 3. Venue media kit (Jackalope, Lindenderry, Continental if they release) |
| **Geo-verification** | **categorical** |
| **Generative policy** | **forbidden** |
| **Selection notes** | Reject: infinity pool, tropical balcony, chrome, anything that reads as "luxury ad." Prefer: timber, stone, linen, a window looking out at something plausibly Australian. |
| **Week** | 1 |

#### Slot 4 — Wine hub hero

| | |
|---|---|
| **Slot ID** | `wine-hub-hero-01` |
| **Target surface** | `V2/wine/index.html` — `SectionHero.astro` |
| **Content JSON** | — |
| **Category** | 2 — Vineyard & cellar door |
| **Subject needed** | Vine rows in fog or early morning light. Cool-climate, not Mediterranean. Muted olive leaves, damp earth, pale sky. |
| **Preferred source** | 1. Wikimedia Commons (if a Red Hill vineyard image clears the editorial bar) &nbsp;·&nbsp; 2. Visit Victoria Content Hub &nbsp;·&nbsp; 3. Unsplash (categorical cool-climate vines) |
| **Geo-verification** | **required** — this is the image that anchors the "Mornington Peninsula wine country" claim |
| **Generative policy** | **forbidden** |
| **Selection notes** | Reject: vineyards with warm Mediterranean light, trellis systems that are obviously Napa/Italy, anything at harvest with bunches prominent (feels too ad). Prefer: rolling Red Hill plateau, morning fog, one strong diagonal of vine row. |
| **Week** | 1 |

#### Slot 5 — Explore hub hero

| | |
|---|---|
| **Slot ID** | `explore-hub-hero-01` |
| **Target surface** | `V2/explore/index.html` — `SectionHero.astro` |
| **Content JSON** | — |
| **Category** | 1 — Landscape & coastline |
| **Subject needed** | A walking-distance coastal view — clifftop track, boardwalk, or beach-approach from above. The image must *invite* a walk, not commemorate a drive-by. |
| **Preferred source** | 1. Wikimedia Commons (Pulpit Rock, Bushrangers Bay, Cape Schanck) &nbsp;·&nbsp; 2. Visit Victoria Content Hub &nbsp;·&nbsp; 3. Unsplash (categorical) |
| **Geo-verification** | **required** |
| **Generative policy** | **forbidden** |
| **Selection notes** | Must show the *track* or the *approach*, not just a landscape. The reader needs to imagine putting boots on. No summer holiday crowds. |
| **Week** | 1 |

#### Slot 6 — Escape hub hero

| | |
|---|---|
| **Slot ID** | `escape-hub-hero-01` |
| **Target surface** | `V2/escape/index.html` — `SectionHero.astro` |
| **Content JSON** | — |
| **Category** | 11 — Seasonal atmosphere |
| **Subject needed** | A two-day-escape mood: a table at dusk, a room at check-in light, a long lunch winding down. Atmospheric, not literal. |
| **Preferred source** | 1. Unsplash &nbsp;·&nbsp; 2. Pexels &nbsp;·&nbsp; 3. Generative (if §10 of this plan clears the brief) |
| **Geo-verification** | **categorical** |
| **Generative policy** | **allowed-as-fallback** — this is the first Tier A slot where generative is acceptable, because the hub is explicitly about *feeling*, not about *places*. Prompt template: §10 Template A (long-lunch atmosphere). |
| **Selection notes** | Reject: luggage-on-bed cliché, sunrise over the sea cliché, couple-in-robes-with-champagne cliché. Prefer: the in-between moments of an escape. |
| **Week** | 1 |

#### Slot 7 — Journal hub hero

| | |
|---|---|
| **Slot ID** | `journal-hub-hero-01` |
| **Target surface** | `V2/journal/index.html` — `SectionHero.astro` |
| **Content JSON** | — |
| **Category** | 12 — Abstract / texture / detail |
| **Subject needed** | A single strong editorial texture: linen, wet basalt, vine leaf shadow, glass rim. The Journal is writing, so the hero should not compete with any article's own hero below it. |
| **Preferred source** | 1. Unsplash &nbsp;·&nbsp; 2. Pexels &nbsp;·&nbsp; 3. Generative (strong fit — Template F newsletter background adapts well) |
| **Geo-verification** | **categorical** |
| **Generative policy** | **preferred** — abstract texture is the archetypal appropriate use of generative imagery; no documentary claim is possible. Use §10 Template F (newsletter background) or Template E (coastal interstitial) with tighter crop. |
| **Selection notes** | Reject anything that competes with a feature image — this hero must recede. Prefer negative space for the word "Journal." |
| **Week** | 1 |

#### Slot 8 — Places hub hero

| | |
|---|---|
| **Slot ID** | `places-hub-hero-01` |
| **Target surface** | `V2/places/index.html` — `SectionHero.astro` |
| **Content JSON** | — |
| **Category** | 1 — Landscape & coastline |
| **Subject needed** | A wide "the Peninsula as a region" landscape — ideally showing the interplay of coast and hinterland in one frame. Arthur's Seat lookout territory. |
| **Preferred source** | 1. Wikimedia Commons &nbsp;·&nbsp; 2. Visit Victoria Content Hub &nbsp;·&nbsp; 3. Unsplash (categorical) |
| **Geo-verification** | **required** |
| **Generative policy** | **forbidden** |
| **Selection notes** | Reject: drone shots, overhead maps, anything that reads as tourism-board. Prefer: ground-level or low-elevation perspective, one strong focal area, muted palette. |
| **Week** | 1 |

#### Slot 9 — Place: Red Hill

| | |
|---|---|
| **Slot ID** | `place-red-hill-01` |
| **Target surface** | `V2/places/red-hill/index.html` |
| **Content JSON** | `next/src/content/places/red-hill.json` |
| **Category** | 2 — Vineyard & cellar door |
| **Subject needed** | Red Hill plateau vine country — rolling, cool-climate, unmistakably a wine region. Ideally includes a hint of hinterland (trees, sheds) rather than pure agricultural monoculture. |
| **Preferred source** | 1. Visit Victoria Content Hub &nbsp;·&nbsp; 2. Wikimedia Commons &nbsp;·&nbsp; 3. Venue media kit (Montalto, Ten Minutes by Tractor) |
| **Geo-verification** | **required** — Red Hill is a real, named place and the reader arrives expecting to see it |
| **Generative policy** | **forbidden** |
| **Selection notes** | Reject any vineyard that is obviously not cool-climate. Reject trellis systems that are obviously Napa or Italian. Prefer morning mist and muted greens. |
| **Week** | 1 |

#### Slot 10 — Place: Cape Schanck

| | |
|---|---|
| **Slot ID** | `place-cape-schanck-01` |
| **Target surface** | `V2/places/cape-schanck/index.html` |
| **Content JSON** | `next/src/content/places/cape-schanck.json` |
| **Category** | 1 — Landscape & coastline |
| **Subject needed** | Pulpit Rock, the Cape Schanck lighthouse, or the basalt coastline. The single most photographically distinctive place on the Peninsula. |
| **Preferred source** | 1. Wikimedia Commons (reuse the existing V1 Pulpit Rock Commons image if licence verifies as CC-BY or CC0 — not CC-BY-SA) &nbsp;·&nbsp; 2. Visit Victoria Content Hub |
| **Geo-verification** | **required** |
| **Generative policy** | **forbidden** |
| **Selection notes** | Must be verifiably Cape Schanck. Prefer morning or overcast light; reject golden-hour spectacle. |
| **Week** | 1 |

#### Slot 11 — Place: Sorrento

| | |
|---|---|
| **Slot ID** | `place-sorrento-01` |
| **Target surface** | `V2/places/sorrento/index.html` |
| **Content JSON** | `next/src/content/places/sorrento.json` |
| **Category** | 1 or 8 |
| **Subject needed** | Sorrento Back Beach, Sorrento main street, or the Sorrento ferry quay. The place has multiple iconic subjects; pick the one the strongest candidate image serves. |
| **Preferred source** | 1. Wikimedia Commons &nbsp;·&nbsp; 2. Visit Victoria Content Hub &nbsp;·&nbsp; 3. Unsplash (back beach is hard to fake, so categorical is acceptable here) |
| **Geo-verification** | **required** |
| **Generative policy** | **forbidden** |
| **Selection notes** | Reject summer-holiday crowds. Prefer off-season quiet. The reader should want to visit *next weekend*, not next January. |
| **Week** | 1 |

#### Slot 12 — Place: Flinders

| | |
|---|---|
| **Slot ID** | `place-flinders-01` |
| **Target surface** | `V2/places/flinders/index.html` |
| **Content JSON** | `next/src/content/places/flinders.json` |
| **Category** | 1 — Landscape & coastline |
| **Subject needed** | Flinders village jetty, the Flinders coastline, or the walk to Mushroom Reef. The quiet-end-of-the-Peninsula feeling. |
| **Preferred source** | 1. Wikimedia Commons &nbsp;·&nbsp; 2. Visit Victoria Content Hub |
| **Geo-verification** | **required** |
| **Generative policy** | **forbidden** |
| **Selection notes** | Reject any image that reads as "generic Victorian coastal village." The editorial claim is that Flinders is specifically quieter and older than Sorrento — the image needs to carry that. |
| **Week** | 1 |

#### Slot 13 — Place: Merricks

| | |
|---|---|
| **Slot ID** | `place-merricks-01` |
| **Target surface** | `V2/places/merricks/index.html` |
| **Content JSON** | `next/src/content/places/merricks.json` |
| **Category** | 2 — Vineyard & cellar door |
| **Subject needed** | Merricks wine country — the hinterland between Red Hill and the coast. Distinct from Red Hill by being flatter and more open. |
| **Preferred source** | 1. Visit Victoria Content Hub &nbsp;·&nbsp; 2. Wikimedia Commons &nbsp;·&nbsp; 3. Venue media kit (Jackalope is in Merricks North; Ten Minutes by Tractor is Main Ridge but close) |
| **Geo-verification** | **required** (desirable); **categorical** acceptable with an editorial note |
| **Generative policy** | **forbidden** |
| **Selection notes** | If a Peninsula-specific image cannot be found, defer to Phase 2 and keep the fog placeholder — do not publish a generic vine shot claiming it is Merricks. |
| **Week** | 1 |

#### Slot 14 — Place: Point Nepean

| | |
|---|---|
| **Slot ID** | `place-point-nepean-01` |
| **Target surface** | `V2/places/point-nepean/index.html` |
| **Content JSON** | `next/src/content/places/point-nepean.json` |
| **Category** | 1 — Landscape & coastline |
| **Subject needed** | Point Nepean historic fort, Cheviot Beach, or the Fort Walk track. Distinctive because it is the geographic tip of the Peninsula. |
| **Preferred source** | 1. Wikimedia Commons &nbsp;·&nbsp; 2. Visit Victoria Content Hub |
| **Geo-verification** | **required** |
| **Generative policy** | **forbidden** |
| **Selection notes** | Reject images that could be any Victorian heritage fort. Prefer the *geography* — the water on both sides, the dune grass, the tip-of-the-peninsula light. |
| **Week** | 1 |

#### Slot 15 — Journal: "The Long Lunch"

| | |
|---|---|
| **Slot ID** | `journal-long-lunch-01` |
| **Target surface** | `V2/journal/the-long-lunch/index.html` |
| **Content JSON** | `next/src/content/articles/the-long-lunch.md` (front-matter `heroImage`) |
| **Category** | 3 — Plated food, fine dining |
| **Subject needed** | A single plate or a table edge with wine glass and linen, warm afternoon light. The image must *feel* like the tenth course of a long lunch, not the first photograph of a food review. |
| **Preferred source** | 1. Unsplash &nbsp;·&nbsp; 2. Pexels &nbsp;·&nbsp; 3. Generative (§10 Template A is purpose-built for this) |
| **Geo-verification** | **categorical** |
| **Generative policy** | **allowed-as-fallback** — Template A is strong here. Use only if sourced candidates are all cliché. |
| **Selection notes** | Reject: top-down flatlay, overhead hands pouring wine, the hand-reaching-for-bread cliché, any plate that looks French-bistro generic. Prefer: asymmetrical composition, negative space, warm side light. |
| **Week** | 1 |

#### Slot 16 — Journal: "How to Build a Red Hill Saturday"

| | |
|---|---|
| **Slot ID** | `journal-red-hill-saturday-01` |
| **Target surface** | `V2/journal/how-to-build-a-red-hill-saturday/index.html` |
| **Content JSON** | `next/src/content/articles/how-to-build-a-red-hill-saturday.md` |
| **Category** | 10 — Market & producer |
| **Subject needed** | Red Hill Community Market or a produce-forward cellar-door shot. The image must carry the "Saturday" feeling — morning light, unhurried. |
| **Preferred source** | 1. Wikimedia Commons (Red Hill Market exists in Commons) &nbsp;·&nbsp; 2. Visit Victoria Content Hub &nbsp;·&nbsp; 3. Unsplash (categorical market) |
| **Geo-verification** | **required** if using the market as subject; **categorical** if using a cellar-door interior |
| **Generative policy** | **forbidden** — this article names a specific place |
| **Selection notes** | Reject: busy-crowd market shots, stalls-with-prices-visible, anything that looks like a European Christmas market. Prefer: one producer, one product, soft morning light. |
| **Week** | 1 |

#### Slot 17 — Journal: "Best Late-Afternoon Walks"

| | |
|---|---|
| **Slot ID** | `journal-late-afternoon-walks-01` |
| **Target surface** | `V2/journal/the-peninsulas-best-late-afternoon-walks/index.html` |
| **Content JSON** | `next/src/content/articles/the-peninsulas-best-late-afternoon-walks.md` |
| **Category** | 1 — Landscape & coastline |
| **Subject needed** | A track-through-coastal-scrub shot at 4pm–5pm light, April. Low sun, long shadows, empty path. A walker's back may be present as scale. |
| **Preferred source** | 1. Wikimedia Commons (Peninsula-specific track) &nbsp;·&nbsp; 2. Visit Victoria Content Hub &nbsp;·&nbsp; 3. Unsplash (categorical coastal walk) |
| **Geo-verification** | **required** — the article is specifically about the Peninsula's walks |
| **Generative policy** | **forbidden** |
| **Selection notes** | Reject: golden-hour sunset photography (too ad), any track with more than one visible person, any shot that reads as "Instagram couple walking away." |
| **Week** | 1 |

#### Slot 18 — Journal: "Where to Stay for a Two-Night Escape"

| | |
|---|---|
| **Slot ID** | `journal-two-night-escape-01` |
| **Target surface** | `V2/journal/where-to-stay-for-a-two-night-escape/index.html` |
| **Content JSON** | `next/src/content/articles/where-to-stay-for-a-two-night-escape.md` |
| **Category** | 6 — Hotel interior, design & room |
| **Subject needed** | A hotel room *after check-in but before the day begins*. Unmade bed, morning light, open curtains, no people. Intimate, lived-in for exactly one night. |
| **Preferred source** | 1. Unsplash &nbsp;·&nbsp; 2. Pexels &nbsp;·&nbsp; 3. Venue media kit (if Jackalope or Lindenderry releases a suite shot that passes §6) |
| **Geo-verification** | **categorical** |
| **Generative policy** | **forbidden** for this slot — the article lists real venues and the hero should not drift into fake-room territory |
| **Selection notes** | Reject: hotel beds staged for photography with triangular folded towels, pools, views-from-bed clichés. Prefer: asymmetrical composition, one open window, warm wood or linen. |
| **Week** | 1 |

### 4.2 WEEK 2 — 17 venue heroes (Eat, Stay, Wine)

These are the 9 eat pages, 5 stay pages, and the 3 wine venues not double-counted with eat (Ten Minutes by Tractor, Polperro, Stillwater Crittenden overlap; Quealy and Paringa Estate wine entries will reuse the eat-page choices where the building is the same).

#### Eat venues (9 slots)

| # | Slot ID | Target | Category | Preferred source | Geo | Gen policy | Selection notes |
|---|---|---|---|---|---|---|---|
| 19 | `eat-tedesca-osteria-01` | `V2/eat/tedesca-osteria/` | 5 dining room | venue-media-kit → Unsplash categorical | categorical | forbidden | Tedesca is an intimate farmhouse room; need warm timber, low ceiling feel. Reject anything too fine-dining-metropolitan. |
| 20 | `eat-laura-pt-leo-01` | `V2/eat/laura-pt-leo/` | 5 dining room (with sculpture-park gesture) | venue-media-kit → Visit Victoria | categorical | forbidden | Laura at Pt. Leo is famous for the view over the sculpture park; if Visit Victoria has a dining-room-with-view shot, take it. Otherwise, a clean dining room. |
| 21 | `eat-montalto-01` | `V2/eat/montalto/` | 5 dining room OR 2 vineyard | venue-media-kit → Visit Victoria → Unsplash categorical | categorical | forbidden | Montalto is a restaurant *inside* a vineyard — best image shows the vines through the window. |
| 22 | `eat-paringa-estate-01` | `V2/eat/paringa-estate/` | 5 dining room | venue-media-kit → Unsplash categorical | categorical | forbidden | Casual-end of hatted cooking; prefer warm room, not formal tablecloths. |
| 23 | `eat-polperro-01` | `V2/eat/polperro/` | 5 dining room OR 2 cellar door | venue-media-kit → Unsplash categorical | categorical | forbidden | Polperro is a small-production cellar door and bistro. Cellar-door-first is a valid framing. |
| 24 | `eat-pt-leo-estate-01` | `V2/eat/pt-leo-estate/` | 1 landscape (sculpture park) OR 5 dining room | venue-media-kit → Visit Victoria | categorical | forbidden | Pt. Leo's distinctive asset is the sculpture park running down to the bay — if a Commons or Visit Victoria sculpture image exists, it outranks dining-room shots. |
| 25 | `eat-quealy-winemakers-01` | `V2/eat/quealy-winemakers/` | 2 cellar door | venue-media-kit → Unsplash categorical | categorical | forbidden | Quealy is a winemaker-led cellar door, not a destination restaurant; a tasting counter image fits best. |
| 26 | `eat-stillwater-crittenden-01` | `V2/eat/stillwater-crittenden/` | 5 dining room (waterside) | venue-media-kit → Unsplash categorical | categorical | forbidden | Stillwater at Crittenden sits on a lake inside the vineyard. Water + glass is the distinguishing feature — use a waterside dining room if sourceable. |
| 27 | `eat-ten-minutes-by-tractor-01` | `V2/eat/ten-minutes-by-tractor/` | 5 dining room OR 2 vineyard | venue-media-kit → Visit Victoria | categorical | forbidden | Cool-climate, minimal room, hinterland setting. Reject any image that looks like a wedding function room. |

**Editorial honesty note for all eat venues:** No image may imply that the photograph is *of that venue* unless it is from the venue's own media kit. The copy on each page must be unambiguous about this: categorical images get editorial-style captions like *"A dining room in the cool-climate mode" — not a literal Tedesca shot.* This is the geography rule in §6 of the sourcing report, applied tighter than usual because venue pages are high-trust surfaces.

#### Stay venues (5 slots)

| # | Slot ID | Target | Category | Preferred source | Geo | Gen policy | Selection notes |
|---|---|---|---|---|---|---|---|
| 28 | `stay-jackalope-01` | `V2/stay/jackalope/` | 6 hotel interior OR 1 landscape (black monolith) | venue-media-kit **strongly preferred** → Visit Victoria | **required if possible** (Jackalope is the most architecturally distinctive hotel) | forbidden | This is the hardest stay slot. Jackalope's black-monolith silhouette against vines is iconic and cannot be faked. If the venue media kit is obtainable in the first week, make this the priority outreach. Otherwise defer to an "interior dining room" via Doot Doot Doot imagery rather than fake the exterior. |
| 29 | `stay-lindenderry-01` | `V2/stay/lindenderry/` | 6 hotel interior OR 7 farm stay | Unsplash → venue-media-kit | categorical | forbidden | Country-house feel. Prefer soft interiors, wood, garden light. |
| 30 | `stay-flinders-hotel-01` | `V2/stay/flinders-hotel/` | 6 hotel OR 1 village | venue-media-kit → Wikimedia (Flinders) | categorical (interior) / required (exterior) | forbidden | Flinders Hotel is a pub-with-rooms; the best image is probably the pub itself with evening light. |
| 31 | `stay-hotel-sorrento-01` | `V2/stay/hotel-sorrento/` | 6 hotel OR 1 heritage architecture | Wikimedia (Hotel Sorrento heritage) → venue-media-kit | required | forbidden | Hotel Sorrento is a 150-year-old heritage building; an exterior shot is appropriate and likely exists on Commons. |
| 32 | `stay-the-continental-sorrento-01` | `V2/stay/the-continental-sorrento/` | 6 hotel | venue-media-kit → Unsplash categorical | categorical | forbidden | The Continental is the rebuilt 2023 heritage pub — venue media kit almost certainly exists and is the right answer. |

#### Wine-venue heroes not covered by eat

| # | Slot ID | Target | Category | Preferred source | Geo | Gen policy | Selection notes |
|---|---|---|---|---|---|---|---|
| 33 | `wine-montalto-01` | `V2/wine/montalto/` | 2 vineyard / cellar door | venue-media-kit → Visit Victoria | categorical | forbidden | **Overlap with slot 21.** If slot 21's selected image is a dining-room-with-vines shot, this slot uses a different asset — a pure vineyard row image. Deliberately avoid reusing the same hero across two V2 surfaces. |
| 34 | `wine-paringa-estate-01` | `V2/wine/paringa-estate/` | 2 vineyard / cellar door | venue-media-kit → Unsplash categorical | categorical | forbidden | **Overlap with slot 22.** Same rule as slot 33 — separate asset. |
| 35 | `wine-polperro-01` | `V2/wine/polperro/` | 2 cellar door | venue-media-kit → Unsplash categorical | categorical | forbidden | **Overlap with slot 23.** Separate asset — if eat page uses the cellar door interior, wine page uses a barrel room or bottle shot. |

### 4.3 WEEK 3 — 15 slots (Explore, Escape, Places index, editorial support)

#### Explore venue heroes (5 slots)

| # | Slot ID | Target | Category | Preferred source | Geo | Gen policy | Selection notes |
|---|---|---|---|---|---|---|---|
| 36 | `explore-bushrangers-bay-walk-01` | `V2/explore/bushrangers-bay-walk/` | 1 landscape | Wikimedia → Visit Victoria | **required** | forbidden | Distinctive rock stacks; Peninsula-verifiable or the slot defers. |
| 37 | `explore-cape-schanck-boardwalk-01` | `V2/explore/cape-schanck-boardwalk/` | 1 landscape | Wikimedia → Visit Victoria | **required** | forbidden | May share asset pool with `place-cape-schanck-01` but must be a *different* image so the place page and experience page do not twin. |
| 38 | `explore-point-nepean-fort-walk-01` | `V2/explore/point-nepean-fort-walk/` | 1 landscape + heritage | Wikimedia → Visit Victoria | **required** | forbidden | The track itself, not just the fort. Distinct from slot 14 (Point Nepean place hero). |
| 39 | `explore-sorrento-back-beach-01` | `V2/explore/sorrento-back-beach/` | 1 landscape | Wikimedia → Visit Victoria → Unsplash categorical | **required** | forbidden | Sorrento Back Beach is distinctive (the ocean baths, the basalt, the southern aspect). |
| 40 | `explore-red-hill-market-01` | `V2/explore/red-hill-market/` | 10 market & producer | Wikimedia → Visit Victoria → Unsplash categorical | **required** | forbidden | **Must not twin with slot 16** (Red Hill Saturday journal article). Use a different asset — the article opens on a producer, the experience page opens on the market landscape. |

#### Escape itineraries (2 slots)

| # | Slot ID | Target | Category | Preferred source | Geo | Gen policy | Selection notes |
|---|---|---|---|---|---|---|---|
| 41 | `escape-flinders-and-cape-reset-01` | `V2/escape/flinders-and-cape-reset/` | 1 landscape OR 11 seasonal atmosphere | Wikimedia → Visit Victoria → Unsplash categorical | categorical acceptable (atmospheric), required preferred | **allowed-as-fallback** — itinerary pages are the strongest fit for atmospheric generative support art. Use §10 Template E (coastal interstitial) if the sourced pool is weak. | Quiet, wintery, reset-weekend mood. |
| 42 | `escape-ridge-to-sea-two-night-escape-01` | `V2/escape/ridge-to-sea-two-night-escape/` | 11 seasonal atmosphere | Unsplash → Pexels → generative | categorical | **allowed-as-fallback** — §10 Template A (long-lunch atmosphere) | A two-night escape atmospheric cover. Ridge-to-sea implies both vineyard and coastline; prefer an image that hints at both without being literal. |

#### Places index (1 slot — strategic duplication with Slot 8 avoided)

| # | Slot ID | Target | Category | Preferred source | Geo | Gen policy | Selection notes |
|---|---|---|---|---|---|---|---|
| — | (covered by Slot 8 `places-hub-hero-01`) | — | — | — | — | — | The Places index hero IS slot 8. Not re-counted. |

#### Editorial support slots (8 slots)

| # | Slot ID | Target | Category | Preferred source | Geo | Gen policy | Selection notes |
|---|---|---|---|---|---|---|---|
| 43 | `home-feature-01` | `V2/index.html` — FeatureArticle.astro (homepage feature block) | 3 plated food OR 11 seasonal | Unsplash → Pexels → generative | categorical | **allowed-as-fallback** (§10 Template A) | The feature block sits below the cover and points to the lead Journal article of the issue. It should echo that article's mood. |
| 44 | `home-this-weekend-strip-01` | `V2/index.html` — "This Weekend" strip | 11 seasonal atmosphere | Unsplash → generative | categorical | **preferred** (§10 Template B — rainy-day Peninsula mood, adapted per season) | A rotating seasonal image. Because the slot is rotating, generative is ideal — we can refresh it as seasons change without a new sourcing pass. |
| 45 | `newsletter-block-bg-01` | `NewsletterBlock.astro` background | 12 abstract texture | Unsplash → generative | categorical | **preferred** (§10 Template F — newsletter background) | Designed to sit behind copy; must recede. Subtle linen or fog texture. |
| 46 | `journal-feature-01` | Journal hub feature card (the top article surfaced at `/journal/`) | 3 plated OR 11 seasonal | Unsplash → Pexels → generative | categorical | **allowed-as-fallback** | Rotates with the lead journal article. |
| 47 | `eat-hub-secondary-01` | Eat hub secondary module (cuisine-type or "long lunch" collection) | 3 plated food OR 10 market | Unsplash → Pexels → generative | categorical | **allowed-as-fallback** (Template A) | Secondary imagery on the hub — smaller footprint, lower brand risk. |
| 48 | `stay-hub-secondary-01` | Stay hub secondary module (design-led or farm-stay collection) | 6 hotel interior OR 7 farm stay | Unsplash → Pexels → generative | categorical | **allowed-as-fallback** (Template C adapted for interior) | Smaller module; lower-risk slot. |
| 49 | `explore-hub-secondary-01` | Explore hub secondary module (walks or beaches collection) | 1 landscape OR 12 texture | Unsplash → Pexels → generative | categorical | **allowed-as-fallback** (Template E — coastal interstitial) | Small module. |
| 50 | `wine-hub-secondary-01` | Wine hub secondary module (cellar door or varietal collection) | 2 vineyard / cellar door OR 12 texture | Unsplash → Pexels → generative | categorical | **allowed-as-fallback** (Template D — vineyard morning texture) | Small module; ideal for a tight crop of vine leaves or a glass rim. |

---

## 5. Generative policy summary (across all 50 slots)

| Policy | Count | Where |
|---|---|---|
| **Forbidden** | 35 | All 6 place heroes, all 9 eat venues, all 5 stay venues, all 3 wine-venue overlaps, all 5 explore venues, homepage cover, Eat hub, Stay hub, Wine hub, Explore hub, Places hub, plus the two named journal heroes (long lunch, two-night escape — these name real places) |
| **Allowed-as-fallback** | 10 | Escape hub, both escape itineraries, both journal hub secondary-ish slots, the long-lunch journal hero *only as a last resort*, home feature, eat/stay/explore/wine hub secondary modules |
| **Preferred** | 5 | Journal hub hero, home "This Weekend" strip, newsletter block background, *plus* home feature and wine hub secondary where texture is the right answer |

**Rule:** `forbidden` means no generative imagery under any circumstance. `allowed-as-fallback` means generative is the third-ranked source; try Unsplash and Pexels first. `preferred` means the slot is designed for illustration and generative should be the first call — but still subject to the seven-point acceptance test in the generative style direction document §12.

---

## 6. Source mix target

Based on the source specifications above, the Tier A 50-slot aggregate should hit approximately:

| Source | Target count | Target % | Why |
|---|---|---|---|
| Wikimedia Commons | 10–12 | 20–24% | Carries the Peninsula-verifiable places |
| Visit Victoria Content Hub | 8–10 | 16–20% | High-quality region-specific coverage |
| Venue media kits | 8–10 | 16–20% | Highest fidelity for venues willing to share |
| Unsplash | 12–15 | 24–30% | Categorical backbone for dining rooms, interiors, textures |
| Pexels | 3–5 | 6–10% | Complementary to Unsplash |
| Generative (Leonardo) | 3–5 | 6–10% | Abstract/texture/seasonal only — newsletter, hub secondaries, rotating slots |

**Hard floor:** at least 20% of Tier A (10 slots minimum) must come from Peninsula-verifiable sources (Wikimedia, Visit Victoria, venue media kits). A Tier A sprint that ships 100% Unsplash has failed the "sense of place" test and should be rejected as a whole.

**Hard ceiling:** generative images cannot exceed 10% of Tier A (5 slots maximum). If more than 5 slots end up generative, the sprint has drifted too far into illustration and needs editor intervention.

---

## 7. Twinning rules (avoiding the "same image twice" problem)

Several surfaces have overlapping subjects — Red Hill place page and the Red Hill Saturday journal article, Cape Schanck place page and the Cape Schanck Boardwalk experience, the Eat page for Montalto and the Wine page for Montalto, and so on.

**Twinning is prohibited.** No single image may serve as the hero on more than one V2 surface. When two slots legitimately need the same subject, pull two distinct assets and log the pairing explicitly in the brief's `twinning` field:

```md
**Twinning:** paired with `place-red-hill-01`; must use a distinct asset (producer-led, not landscape-led).
```

This rule protects the browsing experience — readers should never see the same photograph twice in one session.

---

## 8. Deferral policy

A slot is **deferred** (not failed) if all of the following hold:

1. Two consecutive Step-1 shortlists have been rejected as weak.
2. No Peninsula-verifiable source exists for the subject.
3. The fog placeholder is acceptable as a temporary state.

Deferred slots move to Phase 2 (commissioned photography) and stay on the fog placeholder until then. This is **better** than filling the slot with a weak sourced image. The single most important rule from the sourcing report §3.4 applies unchanged: *a premium travel site with no photography is more defensible than a premium travel site with the wrong photography.*

Expected deferrals: 3–5 slots across the 50. Most likely candidates:

- `place-merricks-01` — hardest place to find a non-generic cool-climate vine image for
- `stay-jackalope-01` — depends on whether the venue media kit materialises in week one
- `eat-pt-leo-estate-01` — sculpture park asset may not exist in a usable form
- `explore-point-nepean-fort-walk-01` if the best Commons fort images are all dated 2000–2015 (too old to clear §6 rule 5 light test)

---

## 9. Week-by-week execution cadence

| Week | Slots | Editor review load | Expected approval rate |
|---|---|---|---|
| **Week 1** | Slots 1–18 (hubs, places, key journal) | 18 Step-1 shortlists, 18 Step-2 reviews | 60–70% (the highest-scrutiny week) |
| **Week 2** | Slots 19–35 (eat, stay, wine venues) | 17 Step-1 shortlists, 17 Step-2 reviews | 55–65% (venue discipline is tighter) |
| **Week 3** | Slots 36–50 (explore, escape, support slots) | 15 Step-1 shortlists, 15 Step-2 reviews | 65–75% (support slots are the easiest) |
| **Buffer** | 3–5 deferrals rolled to Phase 2 | — | — |

Total editor time, across the 3 weeks: ~4 hours of focused Step 2 review, broken into ~15-minute sessions at ~5 slots per session. Sourcing agent time: ~20–25 hours of pulling and vetting.

---

## 10. Extended prompt template system for generative slots

The generative style direction document specifies six prompt templates (A–F). This plan extends them for the specific Tier A slots where generative is preferred or allowed-as-fallback, and aligns the syntax with **Leonardo.Ai** (which is the assumed generative service for Peninsula Insider).

### 10.1 Leonardo-specific notes

Leonardo.Ai has these relevant features for the editorial use case:

- **Phoenix** (Leonardo's in-house model): best-in-class for painterly, illustrative outputs with restrained palette. **This is the recommended default model for all Peninsula Insider generative slots.** It is stronger than Stable Diffusion XL for "editorial illustration rather than fake photography."
- **Leonardo Diffusion XL / Lightning**: faster, less distinctive; use only for texture/background slots (Template F).
- **Elements** and **Style Reference** image uploads: can use a Peninsula Insider mood image as a reference to enforce palette consistency. This is how we lock the visual family together.
- **Prompt Magic** and **Alchemy**: generally *off* for Peninsula Insider. They push outputs toward maximalist aesthetics that are the opposite of the brand.
- **Negative prompt field**: required — always populated from the negative-prompt formula in the generative style direction §9.2.
- **Contrast**: 2.5–3.5 (medium, not punchy).
- **Guidance**: 5–7 (loose enough to let the model breathe, tight enough to hold the brief).

### 10.2 Per-slot Leonardo prompt specifications

For each Tier A slot where generative is `preferred` or `allowed-as-fallback`, this section provides a Leonardo-ready prompt. The files themselves live in `ops/image-approvals/templates/leonardo-prompts.md` for hands-on use during the sprint; this section is the editorial spine.

#### Slot 6 — `escape-hub-hero-01` (Escape hub)

**Base template:** §10 Template A (long-lunch atmosphere)
**Leonardo model:** Phoenix
**Preset style:** Cinematic
**Prompt:**

```text
A long, slow lunch winding down at a cool-climate wine-country restaurant,
linen tablecloth with soft shadows, two half-empty pinot noir glasses,
one ceramic plate with crumbs and herb stems, warm late-afternoon sidelight
entering from a timber-framed window, hints of vine leaves visible outside
but out of focus, the moment after conversation has slowed, Mornington
Peninsula-adjacent editorial mood, cream and burgundy and olive palette,
off-centre composition with negative space to the upper left for a headline,
soft filmic grain, illustrative rather than documentary, no people in frame,
no logos, no signage, no glossy advertising aesthetic.
```

**Negative prompt:**

```text
stock photo lifestyle, influencer pose, smiling diners, HDR, drone view,
hyperreal CGI, cluttered composition, bright tropical palette, visible
branding or text, impossible architecture, warped glassware, broken cutlery
```

**Aspect ratio:** 16:9 (2400 × 1350)
**Contrast:** 3
**Guidance:** 6

#### Slot 7 — `journal-hub-hero-01` (Journal hub)

**Base template:** §10 Template F (newsletter background) tightened for editorial use
**Leonardo model:** Phoenix
**Preset style:** Illustrative
**Prompt:**

```text
An abstract editorial texture in the tone of a premium independent travel
quarterly: soft linen folds, one out-of-focus wine-glass rim at the edge,
warm cream and olive palette with a touch of burgundy shadow, pale
sea-fog grey in the background, calm negative space for a word-mark,
tactile material detail, soft morning light, restrained contrast, grain,
illustrative and architectural rather than photographic, no people,
no text, no logos, no signage.
```

**Negative prompt:** (standard Peninsula Insider negative)
**Aspect ratio:** 16:9
**Contrast:** 2.5
**Guidance:** 5.5

#### Slot 41 — `escape-flinders-and-cape-reset-01`

**Base template:** §10 Template E (coastal interstitial)
**Leonardo model:** Phoenix
**Preset style:** Cinematic
**Prompt:**

```text
A quiet, wintery coastal wine-country mood: wet basalt rocks, soft sea mist
moving across dune grass, pale overcast sky, muted stone and fog-blue palette
with warm cream highlights, abstract enough to feel editorial rather than
postcard, wide but intimate framing, one strong textural rhythm running
through the middle of the frame, premium travel quarterly tone, illustrative
not documentary, no people in frame, no horizon-heavy composition,
no dramatic sunset, no drone perspective.
```

**Negative prompt:** (standard + `"sunset", "golden hour", "drone shot"`)
**Aspect ratio:** 16:9
**Contrast:** 3
**Guidance:** 6

#### Slot 42 — `escape-ridge-to-sea-two-night-escape-01`

**Base template:** §10 Template A blended with Template D
**Leonardo model:** Phoenix
**Preset style:** Cinematic
**Prompt:**

```text
A two-night-escape atmospheric cover: a breakfast table near a window that
opens onto soft vineyard fog, one open book, one ceramic cup with steam, a
stone fruit, warm side light from the left, cream and oxblood and olive
palette, hints of coast visible in the far distance through the fog, off-centre
composition with negative space to the upper right for a headline, soft filmic
grain, editorial still-life tone, illustrative rather than documentary,
no people, no logos, no text, no glossy advertising look.
```

**Negative prompt:** (standard)
**Aspect ratio:** 16:9
**Contrast:** 3
**Guidance:** 6

#### Slot 43 — `home-feature-01`

**Base template:** §10 Template A, tuned to feature-article mood
**Leonardo model:** Phoenix
**Preset style:** Cinematic
**Prompt:**

```text
An editorial still of a long-lunch moment in a cool-climate wine region,
a wooden table edge with linen napkin, the rim of one half-filled wine glass,
warm late-afternoon light, shallow depth of field, vineyard visible but
deliberately out of focus, cream and burgundy palette, asymmetrical
composition with negative space to the right for a feature-article headline,
soft filmic grain, illustrative editorial tone, no people, no branding, no text,
no glossy advertising aesthetic.
```

**Negative prompt:** (standard)
**Aspect ratio:** 3:2 (2100 × 1400)
**Contrast:** 3
**Guidance:** 6

#### Slot 44 — `home-this-weekend-strip-01` (rotating, generative-preferred)

**Base template:** §10 Template B (rainy-day Peninsula mood) for winter; Template D for autumn; Template E for spring; Template A for summer
**Leonardo model:** Phoenix
**Preset style:** Cinematic
**Prompt (autumn default):**

```text
An autumn afternoon mood on the Mornington Peninsula: damp timber deck,
one ceramic cup of coffee with steam, a linen throw at the edge of the frame,
overcast diffused light, vineyard leaves in the distance turning copper and
gold but muted rather than vibrant, soft grey-blue sky, editorial travel-quarterly
tone, calm negative space for a small caption on the right, soft grain, illustrative
and atmospheric rather than photographic, no people, no text, no branding.
```

**Negative prompt:** (standard)
**Aspect ratio:** 21:9 (3200 × 1350 strip)
**Contrast:** 3
**Guidance:** 6

**Rotation note:** this slot swaps seasonally. Store prompt variants under `ops/image-approvals/templates/leonardo-prompts.md` headings `home-this-weekend-autumn`, `home-this-weekend-winter`, etc.

#### Slot 45 — `newsletter-block-bg-01` (preferred, generative-first)

**Base template:** §10 Template F
**Leonardo model:** Phoenix or Leonardo Diffusion XL (texture slot is permissive)
**Preset style:** Illustrative
**Prompt:**

```text
A very subtle editorial background texture: folded cream linen with shallow
shadow, a hint of out-of-focus vine leaf at the corner, warm morning light,
negative space dominant, designed to sit behind small body copy without
competing, muted cream and olive palette, restrained contrast, soft grain,
abstract rather than scenic, no people, no text, no logos.
```

**Negative prompt:** (standard + `"strong focal subject", "high contrast"`)
**Aspect ratio:** 16:9
**Contrast:** 2 (deliberately low)
**Guidance:** 5

#### Slots 46–50 — hub-secondary and journal-feature

All five slots share a common prompt skeleton, selected from Templates A / D / E / F per the slot's category. Full per-slot prompts are held in `ops/image-approvals/templates/leonardo-prompts.md` to keep this plan document readable.

### 10.3 Generative workflow for Tier A

Every generative slot goes through the same two-step gate as sourced slots, with a tightened Step 1:

1. **Brief** — the slot brief must explicitly state `generative: preferred` or `generative: allowed-as-fallback`, a pointer to the Leonardo prompt file, and the required variant count (default 6).
2. **Generation** — 6 variants per slot, one template, minor modifier changes only. No style drift. All variants archived with prompt + seed in `ops/image-approvals/generative-log/{slot-id}.jsonl`.
3. **Pre-filter** — the sourcing agent rejects any variant that fails the seven-point acceptance test in the generative style direction §12 *before* building the shortlist. Typically 2–3 variants survive.
4. **Shortlist** — the surviving variants form the shortlist JSON. No downloads — the Leonardo URLs and metadata are captured.
5. **Editor Step 2** — identical to sourced slots. Editor picks zero or one.
6. **Placement** — implementer downloads the chosen variant, converts to WebP, writes to `/next/public/images/sourced/{slot-id}.webp` *with the explicit `generative-illustrative` licence value* plus the `illustrative: true` schema flag.
7. **On-page treatment** — the image renders with an `Illustration · Peninsula Insider` caption badge, per the generative style direction §8.1.

**Hard rule:** no generative image bypasses Step 2. The editor signs every one, by name, in the decision file.

---

## 11. What this plan does *not* do

- **Does not generate images.** Leonardo has not been called. No variants have been created. This is the prompt system, the shortlist spine, and the approval scaffold.
- **Does not source images.** No URLs have been pulled from Unsplash, Pexels, Wikimedia or Visit Victoria. Sourcing begins when the editor approves the Tier A priority ladder.
- **Does not commission photography.** Phase 2 commissioned work remains a separate exercise.
- **Does not touch V2 content files.** No `heroImage` blocks have been modified. All 203 placeholder references remain exactly as they were.
- **Does not replace the sourcing report or the approval workflow.** This plan is an input to those two documents, not a substitute for them.

---

## 12. Strongest next action

**Single strongest next action:** editor (James) reviews and approves (or amends) the 50-slot priority ladder in §4. That approval unblocks the sourcing agent to begin Week-1 Step-1 shortlists starting with `home-cover-01` as the dry-run slot per the approval workflow §11.1.

Three smaller decisions embedded in the approval:

1. **Confirm the generative policy in §5.** Specifically: accept 5-slot ceiling on generative, accept Phoenix as the default Leonardo model, accept `home-this-weekend-strip-01` as the rotating generative slot.
2. **Authorise Visit Victoria Content Hub registration.** This is a Tier-1 source for the required-geo slots and cannot be used until the terms are read and logged.
3. **Greenlight week-one venue outreach for Jackalope, The Continental Sorrento, and one hatted restaurant media kit.** These are the three venues where a media kit would materially change the quality of the Week 2 output.

If the editor wants to move faster, a batched approval of all three items in one message is sufficient — the sourcing agent can begin within the same working day.

---

## Appendix A — 50-slot quick reference

| # | Slot ID | Week | Category | Source (primary) | Geo | Gen |
|---|---|---|---|---|---|---|
| 1 | home-cover-01 | 1 | 1 | wikimedia | req | — |
| 2 | eat-hub-hero-01 | 1 | 5 | unsplash | cat | — |
| 3 | stay-hub-hero-01 | 1 | 6 | unsplash | cat | — |
| 4 | wine-hub-hero-01 | 1 | 2 | wikimedia | req | — |
| 5 | explore-hub-hero-01 | 1 | 1 | wikimedia | req | — |
| 6 | escape-hub-hero-01 | 1 | 11 | unsplash | cat | fallback |
| 7 | journal-hub-hero-01 | 1 | 12 | generative | cat | **preferred** |
| 8 | places-hub-hero-01 | 1 | 1 | wikimedia | req | — |
| 9 | place-red-hill-01 | 1 | 2 | visit-victoria | req | — |
| 10 | place-cape-schanck-01 | 1 | 1 | wikimedia | req | — |
| 11 | place-sorrento-01 | 1 | 1 | wikimedia | req | — |
| 12 | place-flinders-01 | 1 | 1 | wikimedia | req | — |
| 13 | place-merricks-01 | 1 | 2 | visit-victoria | req | — |
| 14 | place-point-nepean-01 | 1 | 1 | wikimedia | req | — |
| 15 | journal-long-lunch-01 | 1 | 3 | unsplash | cat | fallback |
| 16 | journal-red-hill-saturday-01 | 1 | 10 | wikimedia | req | — |
| 17 | journal-late-afternoon-walks-01 | 1 | 1 | wikimedia | req | — |
| 18 | journal-two-night-escape-01 | 1 | 6 | unsplash | cat | — |
| 19 | eat-tedesca-osteria-01 | 2 | 5 | venue-kit | cat | — |
| 20 | eat-laura-pt-leo-01 | 2 | 5 | venue-kit | cat | — |
| 21 | eat-montalto-01 | 2 | 5/2 | venue-kit | cat | — |
| 22 | eat-paringa-estate-01 | 2 | 5 | venue-kit | cat | — |
| 23 | eat-polperro-01 | 2 | 5/2 | venue-kit | cat | — |
| 24 | eat-pt-leo-estate-01 | 2 | 1/5 | venue-kit | cat | — |
| 25 | eat-quealy-winemakers-01 | 2 | 2 | venue-kit | cat | — |
| 26 | eat-stillwater-crittenden-01 | 2 | 5 | venue-kit | cat | — |
| 27 | eat-ten-minutes-by-tractor-01 | 2 | 5 | venue-kit | cat | — |
| 28 | stay-jackalope-01 | 2 | 6/1 | venue-kit | req | — |
| 29 | stay-lindenderry-01 | 2 | 6 | unsplash | cat | — |
| 30 | stay-flinders-hotel-01 | 2 | 6/1 | venue-kit | cat | — |
| 31 | stay-hotel-sorrento-01 | 2 | 6/1 | wikimedia | req | — |
| 32 | stay-the-continental-sorrento-01 | 2 | 6 | venue-kit | cat | — |
| 33 | wine-montalto-01 | 2 | 2 | venue-kit | cat | — |
| 34 | wine-paringa-estate-01 | 2 | 2 | venue-kit | cat | — |
| 35 | wine-polperro-01 | 2 | 2 | venue-kit | cat | — |
| 36 | explore-bushrangers-bay-walk-01 | 3 | 1 | wikimedia | req | — |
| 37 | explore-cape-schanck-boardwalk-01 | 3 | 1 | wikimedia | req | — |
| 38 | explore-point-nepean-fort-walk-01 | 3 | 1 | wikimedia | req | — |
| 39 | explore-sorrento-back-beach-01 | 3 | 1 | wikimedia | req | — |
| 40 | explore-red-hill-market-01 | 3 | 10 | wikimedia | req | — |
| 41 | escape-flinders-and-cape-reset-01 | 3 | 1/11 | unsplash | cat | fallback |
| 42 | escape-ridge-to-sea-two-night-escape-01 | 3 | 11 | unsplash | cat | fallback |
| 43 | home-feature-01 | 3 | 3/11 | unsplash | cat | fallback |
| 44 | home-this-weekend-strip-01 | 3 | 11 | generative | cat | **preferred** |
| 45 | newsletter-block-bg-01 | 3 | 12 | generative | cat | **preferred** |
| 46 | journal-feature-01 | 3 | 3/11 | unsplash | cat | fallback |
| 47 | eat-hub-secondary-01 | 3 | 3/10 | unsplash | cat | fallback |
| 48 | stay-hub-secondary-01 | 3 | 6/7 | unsplash | cat | fallback |
| 49 | explore-hub-secondary-01 | 3 | 1/12 | unsplash | cat | fallback |
| 50 | wine-hub-secondary-01 | 3 | 2/12 | unsplash | cat | fallback |

Totals by source preference:
- Wikimedia: 12
- Visit Victoria: 2 (plus fallbacks where Wikimedia is primary)
- Venue media kit: 13
- Unsplash: 20
- Generative (preferred): 3

This distribution meets the §6 hard-floor (≥20% Peninsula-verifiable: 12 + 2 + 13 = **27 slots, 54%**) and the §6 hard-ceiling (≤10% generative: 3 preferred + up to 2 fallback actually taken = **≤10%**).

---

*Prepared 9 April 2026. For James Richmond. This plan is the 50-slot working spine of Week 1–3 of the V2 photography sprint. It is designed to be approved as a whole, executed one slot at a time through the two-step workflow, and retired when the commissioned-photography brief ships in Phase 2.*
