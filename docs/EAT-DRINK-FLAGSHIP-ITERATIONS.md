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

## Iteration 5: source integrity and practical comparison (9 October 2026, candidate)

Continuation of the fixed rubric after production242d442. Target99 remains open. No score is assigned to this candidate before rendered review.

- Two independent source audits covered the original catalogue allocation. Field corrections cover misdirecting contacts/addresses, restaurant identity, unsupported dishes, all-farm claims and booking promises. Existing whole-record verification dates remain unchanged.
- The Eat shortlist adds supported planning distinctions and official planning/availability links. Tedesca's long sitting and lack of vegan menu are explicit; Commonfolk retains walk-in possibilities. These are operator statements, not live table availability.
- Anonymous visitors no longer download the inline editing client. Stubbed browser journeys prove initial editor access, remount after soft navigation, denied controls outside the allowlist, and activation/sign-out through the installed auth library's real BroadcastChannel notification contract. No actual account changes performed.
- Eight recommendations are temporarily paused: Johnny Ripe has an operator-confirmed retail pause; Peninsula Fresh and Via Boffe have unresolved entity/location records; Georgie Bass, Small Stone Pantry, Pier Street Fresh Seafood, Sourdough Kitchen and Red Hill Cheese lack sufficient current visitor/operator evidence after independent research. Canonical URLs and recoverable Git history remain. A verification pause is not a closure finding. The five latter entries are removed from current recommendation surfaces, with unsupported visitor directions/contact/actions withheld.
- Two initial build attempts exposed required-address/knownFor schema constraints in paused records; those must be repaired before publication. Source-link reachability is recorded using real HTTP probes rather than resetting the gate.
- Relevant evidence: EAT-FACT-CORRECTIONS-2026-10-09.md; EAT-CATALOGUE-A-M-SOURCE-COVERAGE-2026-10-09.md; EAT-CATALOGUE-FACT-AUDIT-N-Z-2026-10-09.md. Their field-scoped support does not certify every inherited article or venue claim.

Remaining acceptance: completed content/publication build, exact revised catalogue count, paused-page recovery, map/directions correctness, mobile full planning-note readability, accessibility-tree/keyboard review, controlled loading measurement, independent fixed-rubric regrade and live release acceptance. No claim of99 or final readiness.

### Iteration-five assessment and measured evidence

Exact candidate full build passed on9October. Three independent fixed-rubric assessments: implementation owner93.25, reviewer one93.25, reviewer two95.25; all provisional. These are separate judgments, not an averaged99 acceptance. Reviewer one found residual paused-page itinerary wording; reviewer two retained a comparison-dimension deduction.

All74 then-current reader journeys passed. Root's eight-anchor390px axe WCAG A/AA scan found0violations,0overflow and0running animations with reduced motion. Keyboard Commonfolk search → directory Save → Saved list → Trip → My Trip passed, preserving focus and a stable accessible name with aria-pressed=true. Real AX structure was inspected; actual screen-reader speech was not tested. Supabase/Pagefind are stubbed at reader-test boundaries.

Three cold slow-mobile Lighthouse samples against the Astro preview: performance78/79/79, accessibility100each, LCP4.612/4.616/4.620seconds, TBT60/78/81ms, CLS0.000128each. Median performance79 and LCP4.616seconds. Contrary to an earlier assumption, this preview serves gzip (HTML42265wirebytes observed); the public HTML serves Brotli (45740wirebytes on the prior revision). Do not describe these samples as uncompressed. Large shared stylesheet payloads remain a measured render-blocking issue. Editor deferral is a verified loading change, not a proven speed-score gain. Public field INP is unavailable.

## Iteration6: truthful recovery after independent review

The shared venue template no longer encourages building a day around paused/closed listings. It withholds direct itinerary recommendations and new venue-save prompts, uses neutral alternative guide wording, and avoids a current place-return claim where visitor identity/location is not verified. Existing reader saved history is preserved. The generic guide shelf no longer claims that every linked guide includes the named venue.

A browser recurrence check now verifies that all six full planning notes and complete action rows remain visible at390/1440px. Ten targeted reader checks pass, including all eight recovery pages, source-safe discovery and anonymous/editor/auth-change loading. Full publication build passes. Final wider reader and independent recovery checks are still recorded below when complete. Catalogue is44active recommendations, with all eight canonical recovery pages retained; this is not a closure claim.

The99 target remains open: remaining whole-field/linked-guide freshness, spoken assistive assessment and measured speed deductions are substantive. No baseline or scoring weights were weakened. Next performance work should target the shared critical styles based on measured evidence, while preserving dynamic UI states and the eight-page presentation contract.

Final recovery follow-up: independent review identified residual type/award fields in the At a glance panel. The final template withholds that panel for paused/closed listings, plus old category/location/breadcrumb/hero labels, recommendation tags/pairings and new venue-save prompts. Eat paused titles say listing paused. Own business schema/events no longer imply current visitor operation. Stay breadcrumb schema mirrors its shared visible trail. Johnny Ripe's stale booking URL/contact removed; its verified current brand website is retained in the source record. Existing saved history is untouched. These are evidence-driven corrections, not additional score credits.

Wider iteration-six reader suite:75passed,0failed. The last withholding changes require exact-source publication and targeted recovery acceptance, recorded at release. Final independent provisional scores94.25/94.25; implementation owner93.25 remains provisional. The flagship99 acceptance gate is open.


## Iteration 7: shared chrome font integrity

The iteration-six release (#638) is deployed and publicly verified at `e63109812d9112d2537515dd3577d775deff0d96`. Fresh public browser acceptance covered all eight anchors, nine decoded Journal images, 44 active Eat records, eight noindex recovery pages, the keyboard Save-to-Trip task, absent unverified coordinates and Barragunda’s retained operator-confirmed pin. No browser errors, failed essential assets or anonymous editor downloads were observed. The 588-URL public sitemap is byte-identical to the validated snapshot (SHA-256 `172699e3e9a27df852f9bbbbc97682bf193041b1fb4954c1cc4b19ed4360cfd8`).

Further triage found that shared header/footer CSS still selected Inter and Source Serif, and the open mobile menu hard-coded those same families. Main-content font assertions alone missed this. Baseline computed styles on the built Eat page confirm the shared controls/footer mismatch; previous controlled measurements also recorded downloads of the obsolete font files.

Hypothesis: applying the existing Sora display/Figtree UI tokens directly in shared chrome will remove the visual mismatch and avoid its legacy font requests. The bounded change replaces only font families and display-heading weight, removes the shared shell’s legacy font import, and keeps menu structure, geometry and behaviour. Regression coverage checks desktop shared chrome and opened mobile menus on all eight anchors, real soft navigation, Escape focus return, touch targets, overflow and old font downloads. Rollback is this typography commit; catalogue/recovery and image-policy changes remain separate.

The full publication build passes, as do two shared-chrome browser regressions (eight desktop anchors, sixteen opened mobile menus at 390px/320px, real soft navigation, loaded-font evidence, touch targets, overflow and focus return) and two inventory reconciliation tests. Independent source reviews found no blocker; their font-load and narrow-screen coverage concerns were added to the browser checks. Three isolated cold mobile samples on the same compressed Astro preview and Lighthouse defaults report performance 81/79/81, accessibility 100 throughout, LCP 4.160/4.492/4.161 seconds, TBT 0/53/65ms and CLS 0.000128. The median is 81 and 4.161 seconds versus the prior 79 and 4.616 seconds. All three samples request seven font files rather than ten; the obsolete Inter/Source Serif transfers totalled 68,236 bytes. These lab observations support a modest improvement, not an excellent-loading claim or a guarantee about public traffic. Current large render-blocking stylesheets remain a speed issue. Final CI, release and public chrome verification are still pending. The owner score remains 93.25 provisional; 99 remains open for complete field/linked-guide freshness, measured loading performance and spoken assistive review.

Release-check follow-up: the first CI candidate passed 77 of 78 reader journeys but the new mobile-menu check timed out opening the drawer. Its readiness now requires the bound control, loaded fonts, settled layout and a real pointer hit target before activation. A wider local run exposed rapid Plans pointer inputs during result scrolling; six state/image cases now use real keyboard activation, retain their image/srcset assertions, and a separate physical-pointer reset regression waits for scrolling to stop. All seven Plans checks pass locally. Fresh exact-head CI remains required; no application behaviour or acceptance gates were relaxed.
