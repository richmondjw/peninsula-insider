# Eat & Drink flagship improvement

Scope: `/eat/`, with shared top-level design rules across Home, Eat & Drink, Stay, Wine, Explore, Plans, What's On and Journal. Brief received 8 October 2026. Baseline deployment: `3d87e075433278392dec6c6ebb2b72200ce3ce97`.

## Fixed measurement

Use the existing [23-check rubric](../ops/page-quality/rubric-v1.md), unchanged across iterations. Visitor/task 19, navigation/discovery 12, editorial/trust 18, visual system 21, mobile/interaction 13, accessibility/technical 17. Ratings are 0–4, weighted points = weight × rating / 4. A 99 requires positive evidence for every criterion, clear hard gates and three independent reviewers. A missing measurement cannot become full credit. Scores below the gate remain provisional.

The primary task is to find a suitable meal, coffee or drink stop, compare plausible choices, and reach current operator information or save a shortlist. Evaluate planner, local, visitor, occasion, explorer and decisive reader paths at 1440px and 390px, including the first-visit cookie note, keyboard and history.

## Baseline and diagnosis, before redesign

Observed 52 distinct directory results, 9,262px desktop page and 17,104px mobile page. The first filter is 1,833px down on desktop and 2,183px down on mobile. The main editorial photo slot is a typographic plate because its image lacks complete rights evidence. Do not solve that by treating a credit string as permission. Independent reviewer one: 73.25/100, provisional.

Root score: 67.25/100, provisional. Positive observations: self-canonical/title, one h1, no 390px overflow, usable route into the directory and shared URL filter state. Deductions are supported by the following diagnosis; complete keyboard, uncached speed and factual evidence are not yet established. Independent review two: 77.75/100, provisional. The spread principally reflects how much partial evidence can earn; do not average unverified measurements into acceptance.

| Check | Weight | Baseline rating | Weakness / opportunity | Excellent evidence required for 95–100 |
|---|---:|---:|---|---|
| VT1 Audience fit | 5 | 3 | Dining over coffee/drinks | Planner, local, visitor and occasion paths complete |
| VT2 First screen | 4 | 2 | Large text without useful direct filters | Clear offer and useful labelled choice in first screen |
| VT3 Decision structure | 5 | 2 | Repeated detail-page hops | Town/type/occasion, concise trade-off and operator route |
| VT4 Task completion | 5 | 3 | Long route to shortlist | Find, compare and continue without dead ends |
| FN1 Hierarchy | 4 | 3 | Catalogue overwhelms page | Curation, directory and deeper guides distinct |
| FN2 Wayfinding | 4 | 3 | Anchor labels and filters disconnected | Entry, results, map and onward guides form one journey |
| FN3 Discovery | 4 | 2 | Filters buried; no local text search | Category/town/text combine with correct counts and history |
| ET1 Copy | 4 | 3 | Superlatives and redundant instructions | Direct, precise, concise copy throughout |
| ET2 Local value | 4 | 3 | Uneven reasons to choose | Distinct place/occasion reasons supported by records |
| ET3 Freshness | 5 | 2 | April dates behind confident seasonal claims | Actual check dates, no implied live availability |
| ET4 Independence | 5 | 2 | Method distant from recommendations | Independence, corrections and source limits in context |
| VS1 Imagery | 5 | 3 | Empty dominant plate; some context imagery | Rights-cleared photos, accurate subjects/captions and crop |
| VS2 Composition | 4 | 2 | Giant plate, tiny thumbnails, long list | Balanced editorial entry and purposeful result density |
| VS3 Typography | 4 | 3 | Serif fallback unlike other anchors | Shared Sora/Figtree hierarchy at both widths |
| VS4 Colour | 4 | 4 | Positive Harbour contrast/legibility | Measured AA contrast and deliberate action hierarchy |
| VS5 Consistency | 4 | 2 | Journal/Explore differ in type system | All anchor pages share fonts, tokens and control language |
| MI1 Mobile | 5 | 3 | 17k px initial list | No overflow; clear first-screen route; 44px targets |
| MI2 Feedback | 4 | 3 | Repeated count text, uncertain view limit | Accurate matching/shown counts and states |
| MI3 Recovery | 4 | 3 | Dialog/error evidence incomplete | Clear zero state, reset, Escape and focus recovery |
| AT1 Accessibility | 5 | 3 | Partial keyboard evidence | Keyboard path, dialog trap, accessible tree and axe review |
| AT2 Speed | 4 | 2 | Cached sample only | Repeated throttled measurement and bounded payload |
| AT3 Stability | 4 | 3 | No reduced-motion/CLS measurement | Measured stable layout and reduced motion respected |
| AT4 Continuity | 4 | 3 | Clear semantics; history still partial | Title/canonical, no-script, filters and client navigation proven |

The same positive-evidence column remains the acceptance standard across all iterations. A 4 requires observation, not an implemented code path.

### Ten problems and ten corresponding opportunities

| Severity | Problem | Opportunity / acceptance |
|---|---|---|
| Major | Filters follow a long editorial block | Put a usable choice of category and town at the entry, with one state and accurate counts |
| Major | 17k px catalogue dominates mobile | Progressive browsing with accessible expansion, all entries retained in server HTML |
| Major | First screen has no sense of hospitality or place | A rights-cleared, accurately identified Peninsula dining photograph |
| Major | Serif fallback in a sans design system | One Sora/Figtree type system for every anchor page |
| Major | No direct category entry for coffee or drinks | Immediate category routes using the actual corpus, no empty promises |
| Major | Editorial picks and catalogue repeat without a clear distinction | A named, small curated shortlist followed by a purposeful full-list browser |
| Major | Comparison requires repeated detail-page hops | Clear occasion labels, town/type and succinct sourced decision copy |
| Major | Old checked dates and confident seasonal claims | Show actual information-check dates; qualify availability and remove unsupported claims |
| Minor | Saving explanation interrupts the first choice | Place help beside the shortlist/directory actions |
| Minor | Mixed image/text card rhythm and guide pills | Coherent editorial card treatment and a structured guide shelf |

No blocked primary task was established at baseline. Missing rights, a misleading image/claim, serious keyboard barrier or failed primary journey would be critical and block acceptance irrespective of score.

### Five highest-impact changes

1. Combine instant category/town entry with the existing occasion filters; keep one result set and one live announcement.
2. Establish shared anchor typography and hierarchy, then compose the page using those rules.
3. Make the curated entry visually inviting with licensed actual-location photography and useful decision reasons.
4. Replace the overwhelming initial catalogue with progressive browsing that preserves search indexing and no-script access.
5. Add visible editorial method/check-date context, keyboard recovery and measured mobile/performance evidence.

Remove unsupported award totals, stale seasonal promises and decorative UI that makes comparison harder. Simplify the opening copy and saving explanation. Reorganise the catalogue and guide shelf. Introduce immediate category/town choices and progressive results. Preserve canonical URLs, all listable venues, editorial order, working saves/trips, current CMS identity, source/rights controls and correction routes.

## Benchmark principles

[Visit Victoria's Peninsula food guide](https://www.visitvictoria.com/regions/mornington-peninsula/eat-and-drink) connects photography, place context, dining and produce. [Broadsheet's food section](https://www.broadsheet.com.au/melbourne/food-and-drink) distinguishes editorial stories from practical discovery guides. Use those principles, while retaining PI's independent local voice and task-driven shortlist. These are conceptual references, not copied layouts or a verified comparative usability score.

## Iteration log

| Iteration | Evidence-backed score | Key changes | Biggest remaining issue |
|---|---:|---|---|
| 0 | Root 67.25; independent reviews 73.25 / 77.75, all provisional | Live baseline and fixed rubric | Buried filters, long catalogue, inconsistent type and incomplete evidence |
| 1 | Root 84.75, provisional | Search/category/town entry; rights-cleared Trofeo and Merricks photos; shared font aliases; 12-result progressive list; truthful advice | Mobile category control at 824px and catalogue still 4,211px; global type contract not yet verified |
| 2 | Independent reviews 86.25 / 85.75, provisional | Eight-result compact catalogue; first-screen category and town controls; real record check dates; shared anchor type contract | Editorial comparison and freshness evidence, heading hierarchy, cold-load measurement |
| 3 | Pending final rendered review | Canonical Plans route included; 32px mobile anchor titles; section headings capped at 28px; correct plurals; no-script finder explanation; six operator-supported comparisons; underlined inline link | Final accessibility/performance and factual acceptance remain open |
| 4 | Root 92.25; independent reviews 90.75 / 92, all provisional | Enforced actual prose/caption and heading-link fonts; 32px desktop section scale; underlined prose links on all anchors; concise shortlist guidance; fail-closed photo provenance | Catalogue currentness, full assistive-tech review, slow-mobile performance and more balanced shortlist imagery |

Iteration 1 ratings in the fixed rubric order: VT1–4 `[4,3,3,4]`; FN1–3 `[3,4,4]`; ET1–4 `[4,3,3,3]`; VS1–5 `[4,3,4,4,3]`; MI1–3 `[3,4,3]`; AT1–4 `[3,2,3,4]`. Weighted total 84.75. Improvements follow the observed working discovery flow and typography, while unresolved first-screen placement, density and technical evidence keep deductions.

Iteration 1 rendered evidence: desktop 6,097px versus 9,262px baseline, mobile 10,863px versus 17,104px. Search/category/clear produced 6/52 cafes, 0/52 impossible matches and restored all 52 correctly. No overflow at 390px. Nineteen existing discovery/history journeys passed, including ClientRouter listener stability. Type is Sora for the new Eat h1. Score remains provisional for cross-anchor, keyboard/assistive-tech, uncached performance and image/source review. Iteration 2 prioritises density and first-screen control placement rather than adding new features.

Each following iteration records actual rendered inspection, new deductions, changes and re-grade before release. The final independent review must not see the previous scores before submitting.

Iteration 2 mobile evidence: category and town controls at 644px, Show places ends within the 844px first-visit viewport, initial document height 8,637px (baseline 17,104px). All 52 records remain in HTML; eight results are initially displayed, then 16 or all. Both independent reviewers verified combined category/town/name search, live announcement after its debounce, Save feedback and filter Escape/focus return. An apparent zero-width dialog came from programmatic clicking and was withdrawn after real-pointer verification.

The eight anchor routes passed an axe WCAG 2 A/AA and 2.1 AA scan at 390px, with no reported violations. This does not replace manual assistive-technology assessment. The first local Lighthouse slow-mobile sample scored performance 72, accessibility 97, best practices 100 and SEO 100; simulated LCP 5.9s, CLS 0, TBT 90ms. It identified an un-underlined in-prose link, fixed in iteration 3. The local preview serves uncompressed assets; these numbers are lab evidence, not production field performance or a 99-point page-quality score.

### Shortlist comparison sources checked 8 October 2026

The new comparisons use these operator sources; the check applies to these specific dining-format statements, not a blanket refresh of every venue record or a firsthand visit.

| Choice | Supported distinction | Source |
|---|---|---|
| Merricks | Breakfast/lunch, local wines, fireside/deck tables | [Bistro menu](https://merricksstore.com.au/bistro-menu/), [reservations](https://merricksstore.com.au/reservations/) |
| Commonfolk | Mornington cafe beside its roastery, full cafe menu, dog-friendly courtyard | [Mornington location](https://www.commonfolkcoffee.com.au/pages/locations/mornington) |
| Tedesca | Red Hill, fixed menu, own farm produce | [Book Tedesca](https://www.tedesca.com.au/book-tedesca) |
| Doot Doot Doot | Multi-course tasting menu, visitors welcome, evening dining | [Jackalope dining](https://jackalopehotels.com/drink-dine/) |
| Barragunda | Cape Schanck, four-course farm menu using estate produce | [Dining](https://www.barragunda.com.au/dining/) |
| Portsea Hotel | Seaside dining, Port Phillip Bay views, live music programme | [Operator homepage](https://portseahotel.com.au/) |

Remaining catalogue facts retain the venue records' original check dates. No awards, prices, opening times or visit claims were invented or silently refreshed. The 99/100 target remains an acceptance gate; provisional scores and passing builds must not be presented as proof it has been met.

Iteration 3 caught two further issues in rendered/source review. Journal paragraph/caption declarations still used Inter or the display family despite the page-level alias, so the shared anchor contract now enforces actual text roles, including links inside headings. The long-lunch photo had incomplete rights and conflicting depiction evidence in the earlier image audit. The shared Journal resolver now requires `hasWebsitePhotoEvidence` for every original or uploaded photograph, failing closed to the licensed context image otherwise. Credit alone is insufficient.

This deliberate rights correction reduces the number of distinct ImageObject URLs from the old SEO floor of 59 to 28. Only that diversity floor was reset to the observed cleared-image build; all other SEO counts/floors stay unchanged. This is a documented trade-off, not additional imagery or improved visual variety. Image-presence, missing-file recovery, attribution and Visit Victoria permission checks remain required. Restoring unverified photographs or inventing distinct images to satisfy a count would be the wrong remedy.

## Final candidate assessment

Root iteration 4 ratings, fixed criterion order: VT1–4 `[4,4,4,4]`; FN1–3 `[4,4,4]`; ET1–4 `[4,3,3,3]`; VS1–5 `[4,3,4,4,4]`; MI1–3 `[4,4,4]`; AT1–4 `[3,2,4,4]`. Weighted total **92.25/100, provisional**, from **67.25** at baseline. Independent scorecards remain separate at **90.75** and **92**; these are not averaged into an acceptance claim.

The final eight-route mobile axe scan reports no WCAG A/AA violations after the inline-link fixes. Four new browser regression journeys verify composed search/reload/clear, 8→16→52 results and no-script access, actual Sora/Figtree mobile text roles/no overflow/first-screen finder, and desktop title/section hierarchy. The wider suites passed 38 discovery checks and 68 reader journeys; targeted new checks were rerun after the final shared-style corrections. Keyboard Save/Add to trip persisted the chosen venue into My Trip. Journal desktop/mobile image loading and double-failure recovery passed.

The eight anchors now share one typographic hierarchy and interaction language. Eat uses early practical discovery, an editorial shortlist, progressive comparison rows and an image-bearing reading shelf. Photos retain source and subject truth rather than becoming interchangeable venue pictures. Home's larger cover title is a documented functional exception, not a second visual system.

**Readiness:** a bounded improvement candidate with changed-reader journeys and image safeguards verified; no confirmed changed-hub hard gate remains. It is **not accepted as a 99/100 flagship page**. Catalogue details must still be rechecked against current operator evidence, assistive-technology paths need fuller verification, performance needs public cold-load evidence and remediation, and the shortlist would benefit from more approved subject-specific imagery. Those deductions remain open in the scorecards. Build/deployment success cannot close them.
