# Explore design rubric and review record

Target: `/explore/` on Peninsula Insider. Date: 2026-10-01. Owner: Codex. Decision: redesign the Explore hub within the existing Harbour identity, keeping factual copy, routes, filter semantics, provenance notices, and guest planning.

## Scoring contract

Scores are earned from rendered desktop (1440 px), tablet (768 px), and mobile (390 px and 320 px) evidence, keyboard and filter checks, and a production build. The score is a review judgment, not an objective measure of perfection. A 99 requires no failed release gate, no horizontal overflow, no broken route/filter path, no misleading image claim, and at most one point of minor visual debt.

| Criterion | Weight | Evidence required for full marks |
| --- | ---: | --- |
| Arrival and orientation | 18 | Place-specific first view, readable H1, clear next action, useful image crop, coherent transition to browsing. |
| Choice architecture | 18 | A reader can choose a route, use filters, or open the full directory without sorting through duplicate options. States and counts stay understandable. |
| Peninsula identity | 16 | Harbour palette, Sora/Figtree editorial hierarchy, honest Peninsula imagery, restrained materials, no interchangeable travel-template styling. |
| Long-page rhythm | 14 | Curated and exhaustive content are visibly distinct; repetition is reduced; towns, practical advice, and the directory remain easy to find. |
| Responsive craft | 14 | 320/390/768/1440 px layouts show intentional wrapping, touch targets, partial-card affordance where scrolling, and zero document overflow. |
| Accessibility | 10 | Semantic heading order, descriptive links, useful alt text, contrast, visible keyboard focus, native disclosure, reduced-motion safety. |
| Interaction integrity | 6 | Preset chips, counts, zero results, save controls, shelf links, and directory disclosure behave correctly with and without JavaScript. |
| Performance and stability | 4 | Stable hero/media geometry, responsive imagery, no material layout shift or new blocking assets. |
| **Total** | **100** | |

## Baseline: 63/100

| Criterion | Score | Evidence |
| --- | ---: | --- |
| Arrival and orientation | 9/18 | The lighthouse is place-specific, but links and chips carry similar visual weight; the first editorial shelf starts below 1,020 px on desktop and 1,144 px on mobile. |
| Choice architecture | 10/18 | Quick filters, planning links, five shelves, towns, verticals, and the full directory compete; the primary route is not explicit. |
| Peninsula identity | 12/16 | Strong shared masthead and real imagery; the rest uses mostly repeated generic card grids. |
| Long-page rhythm | 6/14 | Five six-card shelves precede 37 town links and 52 directory rows. Captured page height: 18,748 px desktop, 20,274 px mobile. |
| Responsive craft | 10/14 | No page-width overflow at 390 px; chip rail hides later options and mobile choice hierarchy is weak. |
| Accessibility | 8/10 | Headings, disclosure, and labelled filter group exist; some control purpose and focus path need rendered checks. |
| Interaction integrity | 5/6 | One filter state and countable directory are already implemented; disclosure and route testing remain. |
| Performance and stability | 3/4 | Image responsive system exists; hero layout and load behavior need measured review. |
| **Total** | **63/100** | Baseline from live desktop/mobile screenshots and source inspection. |

## Iteration ledger

| Pass | Score | Evidence | Remaining defects |
| --- | ---: | --- | --- |
| Baseline | 63 | Live 1440 and 390 px screenshots; DOM geometry; source review. | Arrival hierarchy, repetitive page, buried directory. |
| First layout | 86 | Split lighthouse hero, four outing choices, shorter shelves, compact town and directory states. Desktop and mobile capture. | Hero height lacked a desktop ceiling; a conditional shelf link could become invalid. |
| Responsive refinement | 96 | Explicit hero height, 320/390/768/1440 px captures with no overflow, filter and no-JavaScript interactions. | Verify stable choice routes and complete production build. |
| Final review | 99 | Dedicated choice routes exist; all in-page anchors resolve; full production build and release audits pass; filter, clear, disclosure and no-JavaScript states work; no browser errors at tested widths. | One point reserved for a formal assistive-technology reading session. |

## Final score: 99/100

| Criterion | Score | Review note |
| --- | ---: | --- |
| Arrival and orientation | 18/18 | Place-specific image and single clear first action in both desktop split and mobile overlay. |
| Choice architecture | 18/18 | Four stable route choices, one existing filter bar, and one complete directory with accurate count and open state. |
| Peninsula identity | 16/16 | Harbour colours, existing site typography, Cape Schanck imagery, and restrained editorial grid. |
| Long-page rhythm | 14/14 | Three-card shelves and closed 37-town and 52-experience indexes reduce the default page to roughly half its prior height, while all entries remain server-rendered. |
| Responsive craft | 14/14 | 320, 390, 768, and 1440 px: no document overflow; choice links remain large touch targets. |
| Accessibility | 9/10 | One H1, descriptive hero alt, native details controls, resolved anchors, and non-JavaScript access checked. Formal screen-reader review remains. |
| Interaction integrity | 6/6 | Walk filter returns 9 of 52, clear restores 52, hero link opens directory, and disclosure works without JavaScript. |
| Performance and stability | 4/4 | Hero has fixed responsive geometry, no new external asset or blocking script, and the existing responsive-image pipeline completes. |
| **Total** | **99/100** | Design review judgment under the scoring contract above. |

## Verification and review images

- `npm run build`: passed, including the site's filter, link graph, claim support, media, and other release audits.
- Browser review: no page errors or horizontal overflow at 320, 390, 768, and 1440 px.
- Interaction review: desktop and mobile filter/clear/hash states; all 52 directory rows remain in server HTML and the native summary opens with JavaScript disabled.
- The project Impeccable detector returned no additional design flags.
- [Desktop first view](explore-design/desktop-1440.png), [mobile first view](explore-design/mobile-390.png), and [mobile choice grid](explore-design/mobile-choices-390.png).
- `npm run check` still reports 136 repository-wide errors; none are in `src/pages/explore/index.astro`. The existing inline JSON-LD hints remain.
## Deployment-gate iteration

The first main-branch deployment stopped before publication because its mobile discovery journey found the Explore filter below 750 px. That temporarily reduced the review score to 94/100: choice architecture and release integrity were not yet satisfied. The corrective pass moved the existing filter ahead of the editorial choices and compacted its mobile heading. On the fresh preview, the filter starts at 613 px at 390 px width and 668 px at 320 px width. The exact `npm run test:discovery-journeys` release gate passes 13/13 on a fresh production build. The 99/100 design review is restored for this corrected candidate; public deployment still requires its own verification.
