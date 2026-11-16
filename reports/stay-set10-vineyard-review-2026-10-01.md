# Stay Set10: Vineyard Stays review
Date: 1 October 2026
Status: scoped source frozen; local dev artifact inspected; exact integrated build and independent review pending

## Outcome and decision

The guide now makes the first visitor decision immediately: **estate villa, winery suite or vineyard hotel**. It lists six verified on-estate stays in those three formats and places Cassis Red Hill in a separate **nearby base** section. Port Phillip Estate is explicitly included as accommodation even though its content record is taxonomically a winery; its editorial link uses the existing wine route. The seven card links and seven direct operator handoffs are present.

Decision: **adapt and continue**. The scoped page is materially more useful and more truthful, but a 99/100 claim is not supported. This is a single-reviewer score from the local dev render. The parent's exact integrated build, image where-used entries, independent review and public receipt remain distinct.

## Source-of-record and copy corrections

| Stay | Primary source | Page decision |
| --- | --- | --- |
| Polperro Villas | [Operator villas](https://www.polperrowines.com.au/escape/villas/) | Four studio villas on the vineyard; fireplace and indoor spa bath in each. Booking check flags exact inclusions, dining service and minimum nights instead of publishing fixed hours. |
| Crittenden Estate Villas | [Operator accommodation](https://www.lakesidevillas.com.au/) | Self-contained lakeside villas on the winery estate in Dromana. Restaurant and cellar door are not presumed available on every date. |
| Port Phillip Estate | [Operator suites](https://www.portphillipestate.com.au/quiet-luxury/) and [book accommodation](https://www.portphillipestate.com.au/book-accommodation/) | Six on-estate suites above the vineyard, linked via `/wine/port-phillip-estate/`. Removed stale restaurant-hat and superlative claims. Room and Dining Room reservations are separate checks. |
| Mantons Creek Estate | [Operator accommodation](https://mantonscreekestate.com.au/accommodation) | Shoreham estate guest accommodation. Removed fixed restaurant lunch days; card asks visitors to confirm current service. |
| Jackalope Hotel | [Operator stay details](https://jackalopehotels.com/stay/) | Merricks North vineyard hotel with varying room types. Operator states guests must be 12 or older; the room and dining bookings are separate. |
| Lindenderry at Red Hill | [Operator accommodation](https://lancemore.com.au/hotels/lancemore-lindenderry-red-hill/accommodation/) | Hotel on a vineyard estate with gardens and dining. Guide links to the current accommodation URL, not the older venue-record route. |
| Cassis Red Hill | [Operator accommodation](https://www.cassisredhill.com.au/accommodation) | Presented as an independent villa base overlooking a neighbouring vineyard, not as winery-owned accommodation. Unit features are qualified. |

The old dynamic ridge fallback drew in properties without a verified on-estate relationship. That fallback and stale universal proximity, hours and award claims are gone. The six on-estate records are required at page render so a missing record causes an explicit failure instead of silently shrinking the guide. No booking, payment or price claim is made.

## Image truth and rights handoff

The hero shows two approved Visit Victoria property-context images. I inspected the actual pixels and the local licensed catalogue and annotations:

| Asset | Recorded subject and credit | Display |
| --- | --- | --- |
| `vv-26070114` | Jackalope Hotel; Photo: Peter Foster, courtesy of Visit Victoria | `/images/visit-victoria/vv-26070114-jackalope-hotel.webp`; alt describes two silhouetted guests raising wine glasses over vineyard rows. |
| `vv-25061209` | Lancemore Lindenderry Red Hill; Photo: Peter Foster, courtesy of Visit Victoria | `/images/visit-victoria/vv-25061209-lancemore-lindenderry-red-hill.webp`; alt describes visitors crossing the lawn to the white homestead. |

The visible caption names the two properties, credits Peter Foster and Visit Victoria, and says the views do not guarantee a particular room or view. Property cards remain text-led because the seven individual photo rights and current image context have not all been verified. Shared where-used ledger entries for both assets are assigned to the parent: entity `pages/stay/vineyard-stays`, fields `hero collage [0]` and `hero collage [1]`, page `/stay/vineyard-stays/`, role `page-image`.

## Rendered and interaction evidence

Inspected the Set10 dev preview at `http://localhost:4363/stay/vineyard-stays/` in new browser pages at **320×568, 390×568 and 1365×850**, with first-visit privacy notice visible. This is not the final static deployment artifact.

- At 320px, the H1 occupies y=312–395 and “Find your stay” y=411–459, fully within the initial 568px viewport despite the privacy notice. At 390px the CTA ends at y=481. Desktop CTA ends at y=654 of 850.
- Document scroll width equals viewport width at 320, 390 and 1365. No page JavaScript errors appeared. The two WebP images loaded at each width.
- The primary anchor lands the chooser at y=80; its heading is visible below the persistent header. Keyboard focus on the hero CTA has a solid visible outline, and Enter activates the same anchor.
- Six on-estate cards plus one nearby card rendered. All seven editorial detail routes returned HTTP 200 locally, including `/wine/port-phillip-estate/`. All seven operator actions have direct operator URLs, open in a new tab with `noopener noreferrer`, and have booking-tracking attributes.
- Collection schema has seven items with the same routes as the cards. Three visible FAQs and three schema FAQs come from the same data. The save control changed to `aria-pressed=true`; the privacy notice disappeared visually after acceptance in the local browser.
- Measured sample contrast ratios: hero heading on cream **12.40:1**, primary action **11.94:1**, chooser heading **12.74:1**, smallest sampled choice label **4.58:1**, card action **10.84:1**, dark planning heading **12.02:1**. This is a sampled contrast check, not a full accessibility audit.
- Measured interactive sizes at 320px: primary CTA **166×48px**, format choice **288×260px**, card action **100×44px**, save button **44×44px**.
- Local `lint:no-pricing`, `lint:house-style`, `lint:visit-victoria` and Git whitespace checks passed. `astro check` remains red on **143 existing site-wide errors**, but shows **no error** in this guide after two scoped typing fixes. The local dev route returned 200.

## 23-lens diagnostic grade

The scout baseline was an **estimated 47–62/100**. This single-reviewer local-render score is **2142/23 = 93.13/100**. It is not an independent panel result or a 99/100 certification.

| Lens | Score / 100 | Evidence or limit |
| --- | ---: | --- |
| 1. First-screen promise | 93 | Stay choice and action are visible at 320×568 on first visit. |
| 2. Category scope | 95 | Six on-estate stays; nearby Cassis labelled separately. |
| 3. Format distinction | 96 | Villa, suite and hotel decisions precede property cards. |
| 4. Booking dependencies | 92 | Room, dining, cellar door and transport checks are explicit; booking completion untested. |
| 5. Factual traceability | 94 | Seven property descriptions checked against operators. |
| 6. Freshness disclosure | 91 | Operator check date and source links present; details can change. |
| 7. Copy economy | 90 | Short lead and differentiated cards; long guide still has seven choices. |
| 8. Hierarchy and scanning | 94 | Hero, three choices, grouped cards, nearby base and FAQ scan clearly. |
| 9. Wayfinding | 93 | Three format anchors, nearby anchor and related planning links. |
| 10. Link integrity | 96 | Seven local detail routes returned 200; direct operator paths sourced. |
| 11. Mobile reflow | 96 | No horizontal overflow at three target widths. |
| 12. 320px first visit | 93 | CTA ends at y=459 of 568 with privacy notice visible. |
| 13. Desktop composition | 91 | Licensed property imagery and text-led cards; exact static visual review remains. |
| 14. Typography | 91 | Editorial scale and line lengths are legible; full assistive-tech reading untested. |
| 15. Contrast | 96 | Sample ratios from 4.58:1 to 12.74:1; sampled only. |
| 16. Tap targets | 96 | Sampled guide actions and save button are at least 44px high. |
| 17. Keyboard and focus | 93 | Hero focus visible and Enter anchor works; full tab-order audit pending. |
| 18. Semantics and headings | 95 | Single H1, labelled sections, same-source visible and schema FAQs. |
| 19. State and feedback | 91 | Save state and privacy dismissal respond locally. |
| 20. Image truth | 96 | Actual subjects, alt text, credit and room-view caveat inspected. |
| 21. Media and performance | 85 | Two local WebPs total about 536KB as source files; final responsive output/LCP not measured. |
| 22. Motion and stability | 94 | No carousel or layout overflow; reduced-motion rule present. |
| 23. Newsletter fit | 91 | Existing opt-in block follows the guide without interrupting choice flow. |

## Open release gates

1. Parent adds the two exact Visit Victoria where-used entries and runs the shared ledger lint on integrated source.
2. Parent runs the exact integrated build, then checks static 320×568 first visit, card links, image output and operator handoffs.
3. Independent design and factual reviewer scores the final artifact. The 99/100 threshold remains unmet until that evidence exists.
4. Public release receipt confirms deployed page, image and routes. No source in this task has been committed, pushed or published.

Impeccable is specified by the workspace design process but its configured binary is unavailable on this WSL host. This review used direct rendered inspection, official operator pages, measured interactions and the 23-lens rubric.
