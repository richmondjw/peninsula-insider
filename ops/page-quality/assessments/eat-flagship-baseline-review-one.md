# Eat flagship baseline: independent review one

Auditor: independent reviewer one, submitted before seeing other grades. Rubric v1.0, all 23 checks. Observed live https://peninsulainsider.com.au/eat/ on 8 October 2026 with Chromium/Puppeteer at 1440x1000 and 390x844. Deployment: `3d87e075433278392dec6c6ebb2b72200ce3ce97`, run 37732894566, generated 2026-10-08T05:42:28.448Z.

Visitor task: choose a suitable Peninsula meal or coffee stop, compare options, and continue to venue information or save a shortlist.

**Score: 73.25/100, provisional.** No blocked primary task confirmed. Image licensing is supported by the source's per-photo evidence guard, but a full individual rights audit and factual re-verification were not performed. Keyboard evidence is partial; do not certify 99 from this review.

## Direct evidence

- Desktop full-page capture: `C:/Users/James/AppData/Local/Temp/eat-review-one-desktop.png`; mobile: `C:/Users/James/AppData/Local/Temp/eat-review-one-mobile.png`; mobile first screen: `C:/Users/James/AppData/Local/Temp/eat-review-one-first-mobile.png`.
- The first screen clearly identifies the offer and 52 places, but has no food photograph. The principal editorial card is a large blue typographic “The long lunch” tile. Commonfolk is text-only; Merricks has a small image. This communicates a directory more strongly than a compelling food destination.
- Full directory has 52 thin rows, mostly without pictures. Mobile initially measured 17,104px document height. After filtering to long lunch it was 8,046px. The page demands substantial scrolling before Journal and practical FAQ.
- Long lunch filter updates the live count to “Showing 14 of 52 places”. Count is an aria-live region. Save toggles aria-pressed=true and visible/accessibility label “Saved” using anonymous local storage; no account or external submission performed.
- Seventeen image elements all loaded after explicitly activating lazy images and scrolling. Initial offscreen lazy images having empty currentSrc were not classified as broken images.
- No horizontal overflow at 390px. Small directory images, paragraph density and repeat Save controls limit mobile scanning, although all rows reflow.
- Keyboard first Tab lands on the “Skip to content” link. Filter dialog advertises role=dialog, aria-modal=true and label Filters. Programmatic opening did not produce convincing focus-transfer/recovery evidence (active element remained body and measured dialog width zero). This is an unresolved verification concern, not a proven serious barrier.
- Local captured navigation timing was approximately 142ms DOMContentLoaded and 145ms load on the mobile reload; this cached sample is not a Lighthouse or real-network performance score.
- Correct title and self canonical present. Image alt text identifies photographed subjects. Jackalope image explicitly says it does not depict Doot Doot Doot.

## Fixed rubric scores

Rating 0-4; points = rating/4 x existing weight.

| ID | Weight | Rating | Points | Evidence / deduction |
|---|---:|---:|---:|---|
| VT1 | 5 | 4 | 5 | Meals, coffee, occasion and town match the visitor task. |
| VT2 | 4 | 3 | 3 | Clear promise and browse/map actions; weak visual food invitation. |
| VT3 | 5 | 2 | 2.5 | Occasion helps but rows lack shared price, booking and dietary trade-offs. |
| VT4 | 5 | 3 | 3.75 | Venue onward links and save work; reaching a confident comparison requires detail-page hops. |
| FN1 | 4 | 3 | 3 | Logical sections; catalogue dominates, FAQ arrives late. |
| FN2 | 4 | 4 | 4 | Map, ranked list, best-of guides, Journal and footer offer clear onward destinations. |
| FN3 | 4 | 3 | 3 | Long lunch gives 14/52; drawer keyboard operation remains unverified. |
| ET1 | 4 | 3 | 3 | Short specific editorial copy, with promotional superlatives such as “most serious” and “best”. |
| ET2 | 4 | 3 | 3 | Wood oven, village and coast distinctions useful; reasons more uneven in full list. |
| ET3 | 5 | 2 | 2.5 | Check-with-venue caveat useful, but hub offers no prominent dated claim basis; source records include April verification dates. |
| ET4 | 5 | 2 | 2.5 | Corrections/about destinations exist; current recommendation method and independence not visible near editorial picks. |
| VS1 | 5 | 3 | 3.75 | Loaded photographs, descriptive alts and truthful context disclosure; principal food surface dominated by absent imagery. Rights not individually recertified. |
| VS2 | 4 | 2 | 2 | Large lead tile plus tiny secondary photos and very long thin directory weaken editorial composition. |
| VS3 | 4 | 3 | 3 | Consistent hierarchy; repeated dense rows and long Journal titles impede scan. |
| VS4 | 4 | 4 | 4 | Navy, warm white, blue and ochre distinguish navigation and content legibly in direct view. |
| VS5 | 4 | 3 | 3 | Coherent site styling but mismatched photo/no-photo treatments. |
| MI1 | 5 | 3 | 3.75 | No overflow, reflow works; 17k px initial page and small secondary thumbnails. |
| MI2 | 4 | 3 | 3 | Filter count and save pressed state update; duplicate “Showing all 52 places” text in initial DOM. |
| MI3 | 4 | 3 | 3 | Empty-state clear/search controls exist, cookie management visible; dialog recovery evidence incomplete. |
| AT1 | 5 | 2 | 2.5 | Skip link and named Save controls positive; full keyboard/dialog and screen-reader path not established. |
| AT2 | 4 | 3 | 3 | Fast cached render and lazy images; no uncached throttled measurement. |
| AT3 | 4 | 3 | 3 | No observed disruptive movement; reduced-motion inspection and CLS measurement incomplete. |
| AT4 | 4 | 4 | 4 | h1, title, canonical, semantic heading groups, actionable links and filter status present. |

## Highest-impact acceptance tests

1. Replace a typographic-only dominant lead with truthful owned/licensed food or venue imagery; retain original illustration fallback where no rights-cleared photo exists. Judge first screen and editorial card at both widths.
2. Bring comparative decision facts into the first shortlist: price guidance if supported, booking need, meal occasion, who it suits, and useful trade-offs. Never invent factual values to fill a design.
3. Reduce the catalogue's visual dominance with purposeful category/occasion routes and compact progressive browsing while keeping the full 52 accessible and indexed. Measure mobile scroll burden and task completion.
4. Make last checked/source basis and independence legible near recommendations. Reverify any venue-specific claims implicated by copy changes.
5. Complete real keyboard filter opening, focus containment, Escape exit and opener-focus return, including ClientRouter navigation. Current review cannot grant accessibility clearance.
