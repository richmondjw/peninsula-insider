# Hot springs accommodation: on-site stay chooser

**Project:** Peninsula Insider
**Owner:** Peninsula Insider editorial and site team
**Decision:** Adapt the hub to a sourced three-stay chooser; hold publication for coordinated release gates.
**Review date:** 1 October 2026

## Baseline, hypothesis and grade

The public page opened with long paragraphs before a reader could compare accommodation. It asserted a 7am bathing window, precise walking and drive times, ten glamping pods, private plunge pools at every Alba unit, an adults-only policy, and Yurt Hideaway price and rating claims without enough current operator evidence. At 320 × 568, the first stay link began below the viewport at about y731. The hypothesis was that a short decision promise, clear stay distinctions and a booking sequence would make the page faster and safer to use.

The following **single-author, provisional** 23-layer grade is a design review, not an independent audit or a field visitor score. Public baseline: **1,455/2,300 (63.26%)**. Local revised preview: **2,109/2,300 (91.70%)**. The result is below the requested 99%.

| Criterion (100 each) | Public baseline | Local author review |
| --- | ---: | ---: |
| First-fold promise | 53 | 92 |
| Base discovery | 55 | 92 |
| Option differentiation | 57 | 94 |
| Route coherence | 60 | 92 |
| Booking readiness | 46 | 89 |
| Practical constraints | 50 | 91 |
| Freshness transparency | 36 | 85 |
| Content economy | 42 | 90 |
| Hierarchy and scanning | 54 | 93 |
| In-page jumps | 30 | 96 |
| Link integrity | 75 | 94 |
| Mobile reflow | 78 | 94 |
| Desktop composition | 72 | 93 |
| Typography | 77 | 92 |
| Measured contrast | 90 | 96 |
| Tap targets | 73 | 95 |
| Keyboard and focus | 80 | 94 |
| Semantics and alt text | 75 | 95 |
| State and error feedback | 82 | 88 |
| Newsletter fit | 78 | 78 |
| Image truth | 39 | 96 |
| Responsive media and performance | 67 | 87 |
| Motion and stability | 86 | 93 |

## Changes made

- The hero now gives the decision in one sentence and links directly to three distinct on-site stays. A licensed photograph of an actual Peninsula Hot Springs Eco Lodge room anchors the page, with descriptive alt and an explicit Visit Victoria credit.
- The comparison uses editorial rows instead of repeating venue cards. It separates Peninsula Hot Springs glamping, Eco Lodges and Alba Sanctuary by room format, bathing arrangement and the question to settle before payment. Each row links to both our notes and the current operator page.
- A numbered booking order separates the room, any optional spa or dining experiences, and the transport plan. An off-site path points readers to the wider stay directory without implying bathing entry.
- Removed the unsupported 7am, inventory, distance, rating, discount and adults-only claims. Alba's published private-pool inclusion is described as **one upgrade**, not a plunge pool attached to each unit. Yurt Hideaway was removed from this hub because its separate venue record still repeats unverified price/rating/timing claims.

## Source and media evidence

- [Peninsula Hot Springs glamping](https://www.peninsulahotsprings.com/accommodation/glamping): Garden View, Lake View and Secluded Pavilion; packages list site-wide bathing.
- [Peninsula Hot Springs Eco Lodges](https://www.peninsulahotsprings.com/accommodation/eco-lodges): individual rooms in shared lodges; private bathing differs by room category; packages list site-wide bathing.
- [Alba Sanctuary](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/), [villas](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/villas/) and [rooms](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/rooms/): five villas, two rooms, bathing each day, breakfast and one private-pool upgrade. No support was found for an adults-only rule or a private plunge pool at every unit.
- The first considered hilltop asset lacked a covered rights record, so it was not retained in the revised page. The chosen Eco Lodge photograph is Visit Victoria asset `vv-172319`, already held in the licensed catalogue. A new placement for `pages/stay/hot-springs-accommodation` was added by the parallel media owner. The Visit Victoria gate passed with 787 licensed uses and 895 catalogued works.

## Local verification and limits

The 320 × 568, 390 × 844 and 1365 × 768 first-visit previews had no horizontal overflow, browser errors or unloaded hero image. With the concurrent in-flow consent change, the primary action at 320 px measured **178 × 44 px at x16, y488** and its centre hit the action itself. At 390 px it began y510; at desktop y708. Clicking it landed the comparison heading below the sticky header (phone heading y152, desktop y210). All five internal onward routes returned HTTP 200 locally. The decision rows and booking sequence were visually inspected at phone and desktop sizes.

The Impeccable detector returned no findings. Content validation and house style passed; no em-dashes or prices were introduced. The media-rights test passed all 49 tests and the Visit Victoria placement gate passed. Contrast ratios from the committed palette are 6.38:1 for muted text on warm paper, 8.30:1 for Harbour links on white, 11.79:1 for pale text on dark Harbour, and 8.50:1 for Sand on dark Harbour.

Repository-wide `astro check` still reports 137 errors across other files; this page produced only the two existing inline-schema-script hints and no target errors. Remote CI, a public deployment receipt, field Core Web Vitals, an assistive-technology session and reader task outcome remain unverified for this set. The local first-visit check includes the concurrently edited cookie component, which is outside this hub page's diff. Linked venue records and broader stay pages need their own factual review.

## Evaluation and rollback

After publication, inspect first-fold comparison clicks, onward operator and stay-note paths, corrections, mobile Core Web Vitals and an independent reader task review by **8 October 2026**. Revert this bounded page to its prior revision if factual or navigation regressions appear. No 99% claim should be made without independent review and live visitor evidence.

## Integrated artifact review

The final integrated local build exited 0. An independent reviewer checked the generated page at 320 × 568, 390 × 844 and 1365 × 768: all routes returned 200, with no page errors or horizontal overflow. The 44 px comparison action worked, and both in-page links landed below the sticky header. The licensed hero loaded with its visible credit. The independent 23-lens expert score was **93.2/100**, still below the 99 target. The first-fold comparison, image truth and link integrity improved most; newsletter fit and keyboard/focus polish remain lower-scoring. This is a local expert judgement, not a field outcome. Public deployment remains a separate gate.
