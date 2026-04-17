# Peninsula Insider — Image Sourcing Report (V2 First Pass)

**Prepared for:** James Richmond, Owner
**Prepared by:** Image Sourcing Desk (Remy subagent)
**Date:** 9 April 2026
**Classification:** Operational deliverable — V2 rebuild support
**Scope:** Audit current imagery state across V1 + V2 surfaces, define sourcing system, establish selection rules and priority targets, propose approval workflow and generative style direction.
**Sibling documents:**
- `peninsula-insider-image-approval-workflow-2026-04-09.md`
- `peninsula-insider-generative-image-style-2026-04-09.md`

---

## 1. Executive Summary

Peninsula Insider's V2 rebuild is, photographically, a **blank canvas** — and that is the most important finding of this audit. There is no photography debt to repair, no legacy treatment to preserve, and no contradictory visual language to rationalise. V2 currently runs on CSS-generated "fog" gradients and blank image blocks as intentional placeholders; the strategic review has already called "stock images on a premium travel brand" a Day 180 brand-destroying error, and the V2 team has responded by shipping *no* photography rather than the wrong photography.

That gives us an unusually clean brief. The question is not "how do we fix the images we have." The question is **"what is the first real layer of photography this brand ever wears, and where does it come from?"**

This report's answer, in one sentence: **source an editor-curated first pass of ~60 images from a narrow whitelist of free/licensed libraries, pulled through a two-step approval gate, filling a ranked set of 60 strategic slots, while a generative style framework is prepared for the non-specific imagery the directory layer will always need.** No commissioned photography is proposed at this phase — that is a ~$15–20k investment the strategic review correctly identifies as the single most brand-defining future spend, and it should land *after* the V2 architecture is solid enough to hold it.

The operational core of this report:

1. **Audit** (§3): V2 has zero photography; V1 uses 4 stock images on the homepage; the Astro content layer currently holds **131 venues, 19 places, 31 experiences, 3 itineraries, and 19 articles** with placeholder hero-image references and no actual image files on disk.
2. **Sources** (§4): a ranked whitelist of 7 sources — Unsplash (primary), Pexels, Wikimedia Commons, Visit Victoria Content Hub, venue media kits, Flickr Creative Commons (narrow use), and a staged path to commissioned work. Clear rules on what's acceptable vs. banned from each.
3. **Categories and needs** (§5): 12 editorial image categories mapped to V2 surfaces.
4. **Selection rules** (§6): a 10-point acceptance test every candidate image must pass, plus a hard ban list.
5. **Priority targets** (§7): a ranked first-pass list of **~60 image slots** across home, hubs, places, top 30 venues, key experiences, and a first editorial tranche of Journal pieces — the "launch-ready" photography load.
6. **Search approaches** (§8): the exact query strategies that pull relevant images out of each library without drowning in tourism-brochure spam.
7. **Workflow** (§9): pointer to the two-step approval system in the sibling workflow document.
8. **Generative direction** (§10): pointer to the style-direction sibling document.
9. **Implementation and handoff** (§11): what happens on Monday morning if this is approved.

**Recommended decision from the Owner:** Approve the whitelist in §4, the selection rules in §6, and the priority target list in §7. Then approve the two-step workflow in the sibling document. That unlocks a ~1 week sourcing sprint that gets V2 from "zero photography" to "launch-presentable editorial photography" on a $0 marginal cost.

---

## 2. What This Report Is Not

- **Not an image download run.** No images have been downloaded as part of this pass. Every link, every source, every candidate is a proposal the editor approves before any bytes land on disk.
- **Not a commissioned-photography brief.** That is a separate exercise. This report explicitly stages around a future commissioned pass.
- **Not an AI image generation run.** The generative framework in §10 is a prompt + style library, not a production run.
- **Not a stock-image defence.** We agree with the strategic review: stock is Day 1 forgivable, Day 180 brand-destroying. This report treats free/licensed sourcing as a **bridge phase** and says so explicitly on every surface the images touch.

---

## 3. Current Imagery Audit

### 3.1 V2 rebuild (`/V2/**` and `/next/`)

**Finding: V2 currently contains no photography whatsoever.** Every hero, card, place block and visual block in V2 is rendered with one of three placeholder treatments:

- **CSS "fog" gradient blocks** — used on the homepage cover, feature stories, experience cards, place cards, and section heroes.
- **Blank aspect-ratio image blocks** — where a photo will eventually live.
- **Placeholder file paths in content JSON** — e.g. `/images/placeholder-jackalope.jpg` in `next/src/content/venues/jackalope.json`, with no underlying file on disk.

Quantified inventory of placeholder image references in the Astro content collection:

| Collection | Count | Placeholder `heroImage.src` |
|---|---|---|
| Venues | 131 | all point to `/images/placeholder-*.jpg` (no file exists) |
| Places | 19 | all placeholder references |
| Experiences | 31 | all placeholder references |
| Itineraries | 3 | all placeholder references |
| Articles | 19 | all placeholder references |
| **Total placeholder image slots** | **203** | **203 placeholder paths, 0 real image files on disk** |

Every placeholder is tagged in schema as `license: venue-media-kit` or similar — the schema already supports a `tmp-unsplash`, `tmp-wikimedia`, `tmp-pexels` classification, which means the V2 content model **already assumes a free/licensed bridge phase will happen**. This report fills that gap.

### 3.2 V1 site (`index.html`, `eat.html`, `stay.html`, etc.)

The production V1 site is heavier on HTML and lighter on imagery than it feels when you look at it. Exhaustive grep across all V1 HTML files:

| Location | Image type | Count |
|---|---|---|
| `index.html` homepage | Wikimedia (Pulpit Rock, Cape Schanck) | 1 |
| `index.html` homepage | Unsplash stock (coastline, wine pour, fine-dining plate) | 3 |
| All other V1 pages (`eat.html`, `stay.html`, `wine.html`, `explore.html`, `itinerary.html`, `whats-on.html`) | — | 0 |
| **V1 total** | | **4** |

The rest of V1 relies on CSS-generated visual treatments (gradient blocks, texture overlays, fog effects) identical to V2's placeholder pattern. In other words: the current live product has **4 photographs in its entire surface area**, and 3 of them are the Unsplash stock the strategic review flagged as brand-destroying.

### 3.3 Gap analysis — what's missing, by severity

| Severity | Surface | What's missing | Why it matters |
|---|---|---|---|
| **Critical** | Homepage cover | Single hero-grade photograph as the cover-story image | The first five seconds of a premium travel brand. Currently a CSS gradient. |
| **Critical** | Section hub heroes (5: eat, stay, explore, wine, escape) | 1 hero per hub | These are the 5 doorways into the product; each should feel like a magazine section opener. |
| **Critical** | Top 30 venue hero images | 30 hero images | The 80/20 of venue browsing traffic will concentrate here. |
| **High** | Place pages (7 published: Red Hill, Sorrento, Flinders, Merricks, Cape Schanck, Point Nepean, plus index) | 1 hero per place | Place pages are the most SEO-valuable medium-term asset; they need to look lived-in. |
| **High** | 31 experience records (11 immediately strategic) | 1 hero per experience | Walks, markets, beaches — the "after lunch" product. The first pass only needs the highest-impact subset. |
| **High** | 19 article records (5 immediately strategic) | 1 hero per article | Editorial product quality depends on editorial image quality. The first pass covers the pieces already doing brand work. |
| **Medium** | Remaining 95 venues (Tier B/C) | 1 hero minimum each | Deferrable to Phase 2 but needed before Stay and Eat scale. |
| **Medium** | Intent pages ("Where to go for long lunch" etc.) | Light secondary imagery | Phase 2 — depends on intent pages shipping first. |
| **Medium** | Map experience | Custom cartographic style (separate track — not imagery) | Treated as a map/brand exercise, not photography. |
| **Low** | Events, itineraries beyond the 3 existing | Deferrable | Follows Planner rebuild. |

### 3.4 What V2 actually *has* that this report should preserve

The CSS fog / gradient placeholder treatment is not bad. It is *disciplined*. A premium travel site with no photography is more defensible than a premium travel site with the wrong photography. Before we swap in a single sourced image, the editor needs to agree that every replacement image is a **net upgrade** on the fog placeholder it is replacing — not just "a photograph instead of a gradient." This is a surprisingly hard bar. It is reflected in the acceptance rules in §6.

---

## 4. Source Whitelist

This is the list of image libraries Peninsula Insider is permitted to source from, ranked by priority. **Nothing outside this list is acceptable** in the bridge phase without explicit editor override.

### 4.1 Tier 1 — Primary sources

#### 1. **Unsplash** — `unsplash.com`
- **License:** Unsplash License. Free for commercial and non-commercial use, no permission needed, no attribution required (though crediting the photographer is good practice and aligns with the editorial voice). Does not cover compiling large numbers of images as a competing image library, which is not the use case here.
- **Why primary:** Largest pool of editorial-grade photography on the open web. Strong coverage of wine country, coastal landscape, fine dining, hotel interiors, markets, slow-travel vignettes — all five Peninsula Insider pillars.
- **Known weakness:** Geographically ambiguous. Pulling an image tagged "vineyard at dawn" from Unsplash rarely gives you a verifiable Mornington Peninsula vineyard. Acceptable for *categorical* imagery (a wine glass, a cellar door interior, a plated dish); **not acceptable** as a putative photograph of a specific named venue. This is enforced in §6 selection rules.
- **Attribution approach on site:** Even though not legally required, Peninsula Insider will credit photographers by name + Unsplash link in the image `credit` field. This is editorial discipline, not compliance, and it aligns with the "named editors, named writers" brand axis called out in the strategic review.

#### 2. **Pexels** — `pexels.com`
- **License:** Pexels License. Free for commercial use, no attribution required, broadly similar to Unsplash.
- **Why Tier 1:** Complementary coverage to Unsplash — often stronger on lifestyle, food-and-wine compositions, and eastern-hemisphere imagery. Second best-in-class for our use case.
- **Known weakness:** Slightly smaller pool than Unsplash; same "geographic unverifiability" problem.

#### 3. **Wikimedia Commons** — `commons.wikimedia.org`
- **License:** Mixed — CC0, CC-BY, CC-BY-SA, and other free licences. **Rights must be verified per image**; CC-BY-SA may contaminate the site with share-alike obligations and is generally rejected on commercial editorial surfaces. CC0 and CC-BY are acceptable.
- **Why Tier 1:** This is the only public library with **geographically verified** Peninsula-specific imagery. The V1 homepage's Pulpit Rock image ("Pulpit_Rock_at_Cape_Schanck._April_2024.jpg") is a Commons pull. Commons is the only acceptable source for "this is named, specific, on the Peninsula" photography.
- **Known weakness:** Image quality is wildly variable. Most Commons images of the Peninsula are hobbyist-level and fail the editorial bar in §6. Expect a 10–15% hit rate and budget sourcing time accordingly.
- **Attribution:** Per image, per licence. Every Commons image must carry a `credit` line citing the photographer and licence.

### 4.2 Tier 2 — Specialist / rights-managed

#### 4. **Visit Victoria Content Hub** — `contenthub.visitvictoria.com`
- **License:** Tourism-industry rights-managed. Free to access for eligible publishers, subject to registration and terms. Images are high-quality, commissioned work covering all Victorian regions including Mornington Peninsula specifically. Terms typically permit editorial use where the outcome promotes Victoria as a tourism destination — which is exactly what Peninsula Insider does.
- **Why Tier 2 (and not Tier 1):** Access requires account creation and acceptance of terms that should be read carefully before the first download. Once unlocked, this is likely the **single best source for verifiable, high-quality, Peninsula-specific photography** on the open web.
- **Action required:** Register for an account, read the terms carefully, log the terms in a `docs/reports/visit-victoria-content-hub-terms-YYYY-MM-DD.md` note. Escalate to the owner if any clause conflicts with editorial independence (e.g. mandatory Tourism Board positioning, right of refusal over captions, etc.).
- **Expected rights caveat:** Likely requires credit to "Visit Victoria" or "Tourism Victoria" on every image. This is acceptable and the schema already supports a `visit-victoria` license value.

#### 5. **Venue media kits**
- **License:** Per-venue press/media terms. Most hatted restaurants, premium wineries and design hotels maintain a press-kit page or will supply on request.
- **Why Tier 2:** Highest fidelity to the venue itself (the chef's actual dining room, the hotel's actual suite, the winery's actual cellar door). Cannot be matched by any public source.
- **Cost of use:** Editorial time (outreach, verification of terms), not dollars.
- **Editorial risk:** Venue media kit images are by definition the venue's best face. Use with editorial honesty — do not present a glossy PR shot as a review image when the venue's actual experience differs. Schema already supports `venue-media-kit` as a licence value.
- **Approach:** Tier 2 candidates for Peninsula Insider's top 30 venues. Outreach letter should be prepared but not sent until the editorial voice is settled enough that venues will trust the coverage.

### 4.3 Tier 3 — Narrow use

#### 6. **Flickr Creative Commons** — `flickr.com/creativecommons`
- **License:** Mixed CC licences. Commercial-permitted licences (CC0, CC-BY) are acceptable; share-alike (CC-BY-SA) and non-commercial (CC-BY-NC) are **rejected** for Peninsula Insider.
- **Why Tier 3:** Broader geographic coverage than Commons but variable quality and high licence-verification overhead. Use only when Tiers 1 and 2 have been exhausted for a specific slot and the Flickr image is materially better than any alternative.
- **Attribution:** Strict per-licence attribution required.

#### 7. **Local tourism operators with public media libraries**
- E.g. Visit Mornington Peninsula, Mornington Peninsula Shire Council, individual winery and hotel press pages.
- Each source is its own licence negotiation. Log each source as it is activated.

### 4.4 Banned sources

- **Getty Images, Shutterstock, Adobe Stock, iStock, Alamy** — paid, rights-managed, and produce the exact "tourism brochure" aesthetic the strategic review is fighting. Banned on Peninsula Insider even with budget.
- **Google Images** (general) — copyright status unverifiable, never acceptable.
- **Instagram / social scraping** — copyright status unverifiable, never acceptable.
- **Screenshots of third-party sites** — never acceptable.
- **AI-generated image services** (Midjourney, DALL-E, Stable Diffusion outputs presented as photographs) — deferred to the generative framework in §10, and when used will be clearly flagged as illustrative not documentary.

---

## 5. Image Categories (the editorial taxonomy)

Every image Peninsula Insider sources or generates fits into one of twelve editorial categories. This taxonomy is the search-strategy spine in §8 and the approval-routing spine in the workflow document.

| # | Category | What it is | Example V2 slot |
|---|---|---|---|
| 1 | **Landscape & coastline** | Peninsula geography, cliffs, sea, headlands, dawn light, fog, rolling vineyard country, dramatic weather. Wide, mood-setting. | Homepage cover, place heroes (Cape Schanck, Point Nepean), journal feature covers |
| 2 | **Vineyard & cellar door** | Vine rows, working cellar doors, tasting glasses in situ, stainless steel tanks, barrel rooms. Preferably Peninsula-marked or plausibly so. | Wine hub hero, winery venue cards |
| 3 | **Plated food — fine dining** | Thoughtful, editorial food photography. Low-clutter composition, natural light, no chain-restaurant gloss. | Eat hub hero, hatted restaurant cards, journal long-lunch pieces |
| 4 | **Plated food — cafe/casual** | Bakery, brunch, oysters, cheese boards, market produce. More rustic than category 3. | Cafe cards, market experience cards |
| 5 | **Dining room interior** | Empty or lightly populated restaurant rooms — architecture, natural light, table settings. Chef's counter shots. | Restaurant venue heroes |
| 6 | **Hotel interior — design & room** | Design hotel suites, bathrooms, communal spaces. Lifestyle-adjacent but uncluttered. | Stay hub hero, hotel venue cards |
| 7 | **Farm stay / villa exterior** | Rural accommodation, cottage exteriors, farm landscapes. | Farm-stay venue cards |
| 8 | **Human moment — candid, unposed** | Diners at a long lunch, walkers on a coastal track, a market exchange. Anti-model-shot. Human as scale, not subject. | Journal pieces, itinerary pages, homepage "This Weekend" strip |
| 9 | **Wellness / hot springs** | Steam, water, bath architecture, calm. No overtly modelled spa imagery. | Wellness venue cards (Alba, Peninsula Hot Springs, Aurora) |
| 10 | **Market & producer** | Market stalls, produce, artisan hands-at-work, small-batch. | Red Hill Market experience, producer venues |
| 11 | **Seasonal atmosphere** | Autumn vines, winter fog, summer surf, spring bloom. Marks the editorial calendar. | Seasonal journal pieces, rotating homepage atmospherics |
| 12 | **Abstract / texture / detail** | Close-up of a glass rim, a vine leaf, a table texture, linen, salt crystals. Used as section dividers and small supporting blocks. | Card grid rhythm breaks, article pull-quote backgrounds |

**Rule:** every approved image must fit one of these twelve categories. If a candidate image does not obviously sit in one category, it is rejected and the editor is forced to either reject or re-categorise.

---

## 6. Selection Rules — the 10-point acceptance test

Every candidate image, from every source, must pass all ten of these checks before it can be routed to Step 2 of the approval workflow. A single failure is an automatic reject.

1. **Upgrade test.** Is this image a *clear* upgrade over the CSS fog/gradient placeholder it is replacing? If the answer is "it's a photo, so I guess yes" — reject. The bar is: "this image does editorial work the placeholder cannot."
2. **Geography test.** If the image is being used in a slot that implies a specific place (e.g. a venue card for Jackalope, a place page for Flinders), it must either:
   - Be verifiably of that place (preferred — Tier 2 Commons or venue media kit), **or**
   - Be used as *categorical* imagery (a dining room, a coastline, a vineyard) with editorial language that does not claim it is the named venue.
   The default failure mode here is "a generic vineyard at dusk being presented as a Paringa Estate vineyard at dusk." Reject every such candidate.
3. **Voice test.** Does this image sound like something the Peninsula Insider editor would describe with the site's voice — slow, specific, confident, a little dry? If it reads as "tourism board," reject. If it reads as "Instagram influencer," reject.
4. **Clutter test.** Strong single focal point. Low background noise. Editorial compositions, not postcards. Reject busy, multi-subject, "everything in frame" compositions.
5. **Light and grade test.** Warm, filmic, natural light. Reject HDR tone-mapping, aggressive saturation, the "blue hour sunset with orange cliffs" cliché, heavy-handed tilt-shift, and overly post-processed looks. The image must be easy to grade into the warm wine-country palette.
6. **Human test.** Humans are permitted only when they add scale or mood; never as the primary subject of a Peninsula Insider image. Reject model-forward stock. Reject stock groups of smiling diners. Candid, unnoticed humans at long distance are acceptable.
7. **Season test.** The image must be seasonally plausible for the page it sits on. An autumn journal piece cannot carry a summer beach shot. A winter cellar-door piece cannot carry vines in full leaf. Off-season candidates are rejected or deferred.
8. **Cliché test.** Automatic rejects: drone shots of every coastline from the same altitude; "wine being poured" from directly above a single glass on a bar; a hand reaching for a perfect croissant; rows of wine bottles on a rustic wooden shelf; couples silhouetted on a beach; the same five stock restaurant tables with candles. If you have seen it on three other travel sites this week, reject.
9. **Editorial-weight test.** The image must not read as decorative filler. It must be strong enough that if you ran it three columns wide as a feature cover, it would hold the page. (If it can only work as a small thumbnail, defer until the slot it fits is approved.)
10. **Licence test.** Licence verified, licence compatible with commercial editorial use, attribution captured in the content JSON, source link captured. Any image where licence verification is incomplete is a hard reject.

### 6.1 Hard-ban list (automatic reject, no discussion)

- Images with visible watermarks from non-whitelisted sources.
- Images where the photographer is unknown and the licence cannot be verified.
- Stock-lifestyle photography — diverse models smiling at menus, "business people at a wine tasting," happy couples on a beach at sunset.
- HDR tone-mapped landscapes of any kind.
- "World-class" signifier imagery — the helicopter shot of the infinity pool, the generic luxury yacht anchor, the crystal chandelier in isolation.
- Anything tagged `tourism-board` at the source. If a government tourism body produced it as bulk marketing output, it probably reads as brochure and should be rejected in favour of Content Hub images that have actual editorial photographer names attached.
- AI-generated imagery dressed as documentary photography (this is not the same as the generative style framework in §10, which is explicit and labelled).
- Images of identifiable people (diners, staff, winemakers) unless they are the subject of a commissioned editorial piece where consent has been obtained. Bridge-phase sourcing **does not** include identifiable-person imagery.

---

## 7. Priority Targets — the ~60-image first pass

This is the ranked list of image slots that need to be filled in the V2 first-pass sourcing sprint. Each row is a single slot, each slot needs a single approved image, and the ranking is the order the editor should work through them.

### 7.1 Tier A — the 18 strategic slots (week 1)

These are the slots where the absence of real photography most hurts the brand. Fill these first.

| # | Slot | Category | Preferred source | Notes |
|---|---|---|---|---|
| 1 | Homepage cover story (hero) | 1 landscape | Wikimedia Commons or Visit Victoria Content Hub | Must be Peninsula-verifiable. The one image the brand wears hardest. |
| 2 | Eat & Drink hub hero | 3 or 5 | Unsplash / Pexels | Plated food OR dining room interior. Lead with a dining room. |
| 3 | Stay hub hero | 6 | Unsplash / Pexels | Design hotel interior, not a pool shot. |
| 4 | Wine Country hub hero | 2 | Wikimedia / Visit Victoria | Vine rows in fog or morning light. Peninsula-verifiable preferred. |
| 5 | Explore hub hero | 1 | Wikimedia / Visit Victoria | Coastline or cliff walk. Peninsula-verifiable. |
| 6 | Escape hub hero | 11 | Unsplash / Pexels | Seasonal atmosphere — autumn light, long lunch table from a low angle. |
| 7 | Journal hub hero | 12 | Unsplash / Pexels | Abstract / texture — do not compete with feature article hero below. |
| 8 | Place: Cape Schanck | 1 | Wikimedia Commons | Reuse or replace the existing Pulpit Rock Commons image if licence is clean. |
| 9 | Place: Red Hill | 2 | Visit Victoria Content Hub | Vine country, specific. |
| 10 | Place: Sorrento | 1 or 8 | Wikimedia / Visit Victoria | Back beach or main street — Peninsula-verifiable. |
| 11 | Place: Flinders | 1 | Wikimedia / Visit Victoria | Village or coastline. |
| 12 | Place: Merricks | 2 | Visit Victoria | Wine country. |
| 13 | Place: Point Nepean | 1 | Wikimedia | Coastline or historic structures. |
| 14 | Journal article: "The Long Lunch" | 3 or 8 | Unsplash / Pexels | Hero plate or long-table candid. |
| 15 | Journal article: "How to Build a Red Hill Saturday" | 10 | Unsplash / Pexels | Market or produce. |
| 16 | Journal article: "Best Late-Afternoon Walks" | 1 | Wikimedia Commons | Peninsula-verifiable low-sun coastline walk. |
| 17 | Journal article: "Where to Stay for a Two-Night Escape" | 6 | Unsplash / Pexels | Design hotel room, empty, morning light. |
| 18 | Newsletter / subscribe block background texture | 12 | Unsplash / Pexels | Subtle texture — linen, sea, vine close-up. |

**Week 1 deliverable:** 18 approved images, all passing §6 rules, logged in a shortlist CSV, ready for the editor's Step 2 review.

### 7.2 Tier B — the 30 top-venue slots (week 2)

One hero image per the top 30 venues. The top 30 is defined as every venue that would plausibly appear on a "Peninsula 50" list — the hatted restaurants, icon wineries, design hotels, and signature experiences.

Working shortlist of Tier B venues (to be confirmed with the editor before sourcing begins):

**Restaurants (hatted + near-hatted, 10):**
Tedesca Osteria, Laura at Pt. Leo, Doot Doot Doot, Montalto, Paringa Estate restaurant, Ten Minutes by Tractor, Polperro restaurant, Stillwater at Crittenden, Rare Hare, Barragunda Dining.

**Wineries (8):**
Pt. Leo Estate, Montalto Vineyard, Paringa Estate (cellar door), Ten Minutes by Tractor, Crittenden Estate, Polperro Wines, Quealy Winemakers, Avani Wines.

**Stays (6):**
Jackalope Hotel, Hotel Sorrento, Flinders Hotel, Lindenderry at Red Hill, The Continental Sorrento, Polperro Villas.

**Wellness (2):**
Peninsula Hot Springs, Alba Thermal Springs.

**Experiences (4):**
Red Hill Market, Bushrangers Bay Walk, Cape Schanck Boardwalk, Point Nepean Fort Walk.

**Sourcing rule for Tier B:** Prefer venue media kits where rights are clean. Where not available, Visit Victoria Content Hub. Where neither, Unsplash/Pexels *categorical* imagery (a design hotel suite, a fine-dining plate) with editorial copy that does not claim it is a specific room or specific dish. The "geography test" in §6 is the core governor here.

**Week 2 deliverable:** 30 approved images, one per venue, categorised by the taxonomy in §5, licence-verified.

### 7.3 Tier C — the 12 experience + itinerary slots (week 3)

| Slot | Count | Notes |
|---|---|---|
| Remaining experience heroes (11 total, minus the 4 in Tier B) | 7 | Walks, beaches, markets not in Tier B |
| Itinerary heroes (3 existing) | 3 | Escape plan covers |
| Places index hero | 1 | A wide "the Peninsula" landscape |
| Home "This Weekend" strip | 1 | Rotating; one seasonal default |

**Week 3 deliverable:** 12 approved images.

### 7.4 First-pass total

**18 + 30 + 12 = 60 image slots**, filled in three weeks at an editor load of ~2–3 approved images per working day. At a ~30% first-attempt approval rate (based on the strict §6 rules), expect to screen ~200 candidates across the three weeks.

### 7.5 Explicitly deferred

- The remaining ~101 Tier B/C venues (one hero each) — Phase 2, September 2026.
- Intent pages ("Where to go for long lunch" etc.) — Phase 2, after intent pages ship.
- Events imagery — Phase 2, after events database rebuild.
- Commissioned photography for the top 30 — Phase 2 (target: a named Peninsula photographer, one day per venue, ~$15–20k budget, delivered as WebP + editorial metadata, replaces the first-pass Tier B sourced images one-for-one).

---

## 8. Search Approaches — the query strategies

This section describes how to find usable images in each library without drowning in spam. Treat these as starting points; the editor will evolve them.

### 8.1 Unsplash — search strategy

- **Use specific visual terms, not destinations.** "Dining room natural light" beats "restaurant." "Vineyard fog morning" beats "Mornington Peninsula."
- **Chain visual qualifiers.** "Cellar door tasting wooden counter natural light" will return editorial; "winery" will return brochures.
- **Search photographer feeds first.** Known editorial-travel photographers on Unsplash often have entire feeds worth mining. Identify 5–10 as "trusted photographers" in `docs/reports/peninsula-trusted-photographers-YYYY-MM-DD.md` as they surface.
- **Use Unsplash Collections** — curated sets from other editors. Higher signal, lower cliché density.
- **Reject by first-glance signature.** If the first ten results all look like "happy couple on beach," change your query. The query is wrong, not the library.
- **Sort by "relevant" not "latest"** — latest is dominated by upload spam.

#### Core Unsplash query templates (starter pack)

| Slot category | Query |
|---|---|
| Landscape/coastline | `basalt coastline morning light`, `coastal cliff walk wildflowers`, `headland fog pacific` |
| Vineyard/cellar door | `vineyard fog morning light`, `pinot noir vine rows cool climate`, `cellar door tasting wooden counter` |
| Fine dining plate | `chef counter plated natural light`, `minimalist plate dining natural window`, `single plate wooden table restaurant` |
| Dining room interior | `intimate restaurant natural light empty`, `wooden dining room morning`, `linen table setting low light` |
| Hotel interior | `design hotel suite morning light`, `boutique hotel bathroom concrete`, `hotel room vineyard window view` |
| Hot springs / wellness | `steaming thermal bath stone`, `outdoor bath fog natural`, `wellness bathhouse architecture` |
| Market / producer | `farmers market produce morning`, `artisan cheese board wooden`, `oyster platter ice` |
| Texture / abstract | `linen texture warm light`, `wine glass rim macro`, `vine leaf morning light` |

### 8.2 Pexels — search strategy

Largely the same patterns as Unsplash. Pexels often has stronger coverage for food-and-wine compositions and weaker coverage for landscape. Use as the second query on every slot; if Unsplash and Pexels both fail, escalate to Wikimedia.

### 8.3 Wikimedia Commons — search strategy

Commons is the only source where you can search by the actual Peninsula place name and get verifiable results. Strategy:

- Search `Mornington Peninsula`, `Cape Schanck`, `Sorrento Victoria`, `Flinders Victoria`, `Red Hill Victoria`, `Pt Nepean`, `Balnarring` etc.
- Filter by licence (CC0, CC-BY preferred; CC-BY-SA **only** if share-alike contamination is explicitly acceptable for that asset, which normally it isn't).
- Filter by date uploaded (last 3 years) to avoid 1990s holiday snapshots.
- Expected yield: ~10–15% of what you find will meet the editorial bar. Budget time accordingly.
- **Check EXIF and file history** before approving — Commons occasionally mirrors copyrighted images that are later deleted.

### 8.4 Visit Victoria Content Hub — access approach

1. Register for a Content Hub account (one editorial account for Peninsula Insider).
2. Accept terms; log the full terms and any attribution obligations into a `docs/reports/visit-victoria-content-hub-terms-2026-04-09.md` note. Do not download anything until that note exists and has been read by the owner.
3. Once unlocked, search by region filter = Mornington Peninsula.
4. Download only images that pass the §6 rules.
5. Attribute per their terms in every `credit` field.

### 8.5 Venue media kits — outreach approach

- Draft a short editorial outreach email: introduces Peninsula Insider as an independent editorial brand, requests press-kit access, commits to credit-line usage, asks what terms they require.
- Do not send until the editor is ready to defend the brand voice in writing to the first venue that replies.
- First outreach wave: top 10 venues (5 restaurants, 3 wineries, 2 hotels).

---

## 9. Approval Workflow

A full two-step editorial approval workflow is specified in the sibling document:

**`peninsula-insider-image-approval-workflow-2026-04-09.md`**

Summary for this report:

- **Step 1 — Shortlist.** A sourcing agent (initially Remy; later potentially a dedicated image desk) pulls candidate images from whitelisted sources for a specified slot, applies the §6 rules, and produces a shortlist of 3–5 candidates per slot into a structured CSV / JSON file. No image is downloaded at this stage — only URL, source, photographer, licence and proposed category are captured.
- **Step 2 — Editor selection and approval.** The human editor reviews the shortlist, selects at most one image per slot, rejects the rest, and signs off. Only then is the image downloaded, placed into the content directory, and referenced from a content JSON file.

No image enters the site bypassing this gate. The gate is the editorial control layer; everything else in this report is feeding it.

---

## 10. Generative Style Direction

A full style framework + prompt template library is specified in the sibling document:

**`peninsula-insider-generative-image-style-2026-04-09.md`**

Summary for this report:

- **Purpose of generative imagery at Peninsula Insider:** non-specific, atmospheric, *clearly illustrative* imagery for slots where no honest documentary photograph is available and the alternative would be a stock-lifestyle cliché. Never used as a substitute for a real photograph of a specific venue or person.
- **Style direction:** warm, filmic, natural-light, painterly-edges, with a specific palette derived from the existing V2 design tokens. Closer to a travel-magazine illustration than a photorealistic render.
- **Prompt template framework:** a modular prompt grammar — scene + light + palette + composition + constraint — that can be dropped into any generative service and produce consistent outputs.
- **Status:** ready to prototype on demand; no generation runs as part of this report.
- **Guardrails:** every generative image carries a visible-on-hover badge ("Illustration · Peninsula Insider style"), a `license: generative-illustrative` schema value (schema extension required), and never appears on a venue page, a place page, or any surface that implies documentary accuracy.

---

## 11. Implementation Plan and Handoff

### 11.1 What is ready to ship today

- This report.
- The approval workflow spec.
- The generative style direction spec.
- The source whitelist and selection rules.
- The ranked 60-slot priority target list.

### 11.2 What the owner decides

1. Approve or amend the source whitelist in §4.
2. Approve or amend the selection rules in §6.
3. Approve or amend the priority target list in §7.
4. Approve the two-step approval workflow in the sibling document.
5. Approve or defer the generative style framework in the sibling document.
6. Authorise Visit Victoria Content Hub registration (Tier 2 source).

### 11.3 What happens the day after approval

**Day 1:** Visit Victoria Content Hub registration; terms logged; Tier A Slot 1 (homepage cover) goes through the full two-step workflow as a dry run.

**Days 2–5:** Tier A slots 2–18 worked through Step 1 into a shortlist; editor reviews batches of 3–5 slots at a time in Step 2.

**Days 6–10:** Tier B slots 1–30, same cadence.

**Days 11–15:** Tier C slots 1–12, same cadence.

**Day 15 deliverable:** 60 approved images, all stored at `/next/public/images/sourced/` with content JSON files updated to point at real files, all with `credit` + `license` fields populated, all visible on the V2 build.

**Day 16 onwards:** Phase 2 scoping — the commissioned photography brief, and the next 95 venue heroes.

### 11.4 Metrics for success

- **Coverage metric:** 60/60 Tier A/B/C slots filled with approved images that pass §6.
- **Source mix metric:** at least 20% of the 60 slots filled from Peninsula-verifiable sources (Wikimedia, Visit Victoria, venue media kits). A first pass that is 100% Unsplash has failed the "sense of place" test.
- **Editor approval rate metric:** Step 2 approval rate on Step 1 shortlists is at least 60%. Below 60% means the sourcing agent's §6 application is weak and needs re-calibration.
- **No rogue images metric:** zero images land on the V2 build that have not been through the two-step workflow. Auditable from the content JSON files.

---

## Appendix A — source quick reference card

| Source | Tier | Verified geography? | Attribution required? | Use for |
|---|---|---|---|---|
| Unsplash | 1 | ❌ | Not legally, yes editorially | Categorical (food, interiors, texture) |
| Pexels | 1 | ❌ | No | Categorical complement to Unsplash |
| Wikimedia Commons | 1 | ✅ | Per licence (CC0/BY OK, SA reject) | Peninsula-specific landscapes |
| Visit Victoria Content Hub | 2 | ✅ | ✅ Yes | Peninsula-specific, best quality |
| Venue media kits | 2 | ✅ | Per venue terms | Specific venue imagery |
| Flickr CC | 3 | Mixed | Per licence | Edge cases only |
| Getty/Shutterstock/Adobe Stock | ❌ banned | — | — | — |
| Google Images (general) | ❌ banned | — | — | — |
| Instagram / social scrape | ❌ banned | — | — | — |

## Appendix B — 12-category cheat sheet

1. Landscape & coastline
2. Vineyard & cellar door
3. Plated food — fine dining
4. Plated food — cafe/casual
5. Dining room interior
6. Hotel interior — design & room
7. Farm stay / villa exterior
8. Human moment — candid, unposed
9. Wellness / hot springs
10. Market & producer
11. Seasonal atmosphere
12. Abstract / texture / detail

## Appendix C — the three sibling documents

- `peninsula-insider-image-sourcing-report-2026-04-09.md` (this document)
- `peninsula-insider-image-approval-workflow-2026-04-09.md`
- `peninsula-insider-generative-image-style-2026-04-09.md`

---

*Prepared 9 April 2026. For James Richmond. This report is the photography layer of the broader V2 transformation plan laid out in `docs/strategic-review-2026-04-09.md`. It is designed to be approved, executed in a three-week sourcing sprint, and then retired in favour of the commissioned-photography brief that should follow in Phase 2.*
