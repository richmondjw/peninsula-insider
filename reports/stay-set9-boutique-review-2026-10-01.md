# Stay Set9: Boutique Hotels review
Date: 1 October 2026
Status: Boutique source frozen; dev preview reviewed; exact integrated build and independent review pending

## Outcome and decision

**Decision: adapt.** The Boutique Hotels page now helps visitors choose among five hotels by the kind of weekend they want: village and coast, a vineyard estate, or an art-led destination. A first-screen action leads to that choice. Each hotel has one clear distinction, one check before booking, a Peninsula Insider detail route and a direct operator accommodation route. The page is a selection guide, not a hotel ranking.

This is a bounded Set9 implementation in next/src/pages/stay/boutique-hotels.astro and two venue records, hotel-sorrento.json and jackalope.json. The Stay hub, Lindenderry record, shared components, sitemap, ops data and Wellness guide were left to their owners. No commit, push or publication was made by this agent.

The prior Set8 scout gave Boutique a **62–76/100** single-reviewer baseline (midpoint 68.8). Hypothesis: a visitor-choice first screen, truthful room distinctions and operator handoffs will improve decision usefulness without adding false property imagery or universal amenity claims. Evaluation date: this dev review on 1 October; repeat on the parent's exact integrated static artifact. Rollback is the bounded page and two-record diff if facts, routes or layout regress. Independent review is pending; the implementation cannot self-certify the user's 99/100 goal.

## Verified editorial changes

| Hotel | Operator source | Bounded correction or guide treatment |
| --- | --- | --- |
| Quarters at Flinders Hotel | [Operator accommodation](https://flindershotel.com.au/accommodation/) and [pub FAQ](https://flindershotel.com.au/faqs/) | Quarters is behind the Flinders Hotel pub. The guide treats room and pub dining as separate reservations. It does not use the pub-frontage photo as if it depicted a Quarters room. |
| Hotel Sorrento | [Rooms](https://hotelsorrento.com.au/stay/), [FAQ](https://hotelsorrento.com.au/faqs/), [Classic Suites](https://hotelsorrento.com.au/room/classic-suites/) | Replaced stale advice to book generic front balcony rooms with current five room families, adults-only accommodation and Classic Suite noise caution. Views, outdoor space and baths are room-dependent. The guide now displays the operator's dated daytime midweek construction advisory, links directly to the current notice and asks visitors to check it before reserving. Recheck the operator notice by 30 November 2026, ahead of the stated 1 December expansion. |
| InterContinental Sorrento | [Operator rooms](https://sorrento.intercontinental.com/accommodation) and [hotel information](https://sorrento.intercontinental.com/) | Distinguished Heritage, Main and Riley Lane wings from the wider Continental precinct. The guide asks visitors to check the exact room and to arrange dining and Aurora Spa separately. This larger branded hotel is included for its distinctive heritage setting, rather than represented as a small independent hotel. |
| Lindenderry at Red Hill | [Operator accommodation](https://lancemore.com.au/hotels/lancemore-lindenderry-red-hill/accommodation/) and [dining](https://lancemore.com.au/hotels/lancemore-lindenderry-red-hill/the-dining-room/) | The guide frames the hotel as a garden and vineyard base, with separate restaurant and cellar-door schedules. Its guide action uses the current direct accommodation path; its venue JSON was outside this agent's scope. |
| Jackalope Hotel | [Operator rooms and policies](https://jackalopehotels.com/stay/) and [dining](https://jackalopehotels.com/drink-dine/) | Removed stale chef Michael Demagistris, unqualified awards and universal bath implications. The operator currently names Michael Wickham, but the evergreen record omits a chef name. Lair-specific features, age 12+, separate dinner booking and no pets except assistance animals are stated. Changed place to Merricks North; its existing place record and facet map place it in the Red Hill wine-country region, so zone remains red-hill. The former website URL redirected to an experiences page; the corrected official root and booking path returned HTTP 200. |

All five operator accommodation URLs returned HTTP 200 when checked. This confirms a current official handoff, **not** completed room availability, payment or reservation. No page price is published.

## Design and image truth

The hero uses two existing rights-recorded Visit Victoria images: Jackalope's Merricks North entrance and Lindenderry's Red Hill grounds. The visible caption names both properties, credits Peter Foster / Visit Victoria, and says the pictures do not promise a particular room or view. The other three hotels use text-led comparisons, so the guide does not imply that the Flinders pub image depicts Quarters accommodation. The Hotel Sorrento detail and shared-card surfaces can still receive a CMS hero override; effective image rights and disclosure there require separate sitewide review.

The two hero originals are about 85KB and 314KB. Source sets explicit intrinsic dimensions and responsive-image hints; generated variants and final transfer sizes remain an exact-build gate. The text-led cards sacrifice some photographic variety for factual clarity. A future licensed image set for all five properties could improve the visual score, provided the effective image and caption remain paired.

## Measured dev-preview QA

The Set9 dev preview at http://localhost:4362/stay/boutique-hotels/ returned HTTP 200. At 320×568 on a fresh visit with the privacy notice visible, the H1 occupied y=340–423 and the primary 48px action y=442–490. At 390px, the action was y=454–502. At 1365px, it was y=543–591. The previous page's first inline hotel link began at y=606 at 320px and its first card at y=1,081; the new visitor choice is actionable within the first screen.

After the Hotel Sorrento works notice was added, its card was inspected in the live dev preview at 320px and 1365px. The card widths were 288px and 1280px, the notice stayed within the card, the official notice link resolved to the expected operator URL, and neither viewport had horizontal overflow. This focused late change has not had independent scoring or an exact static-artifact review.

No horizontal overflow or page JavaScript errors appeared at 320, 390 or 1365px. All three chooser anchors landed with their group headings visible at 320px (section y=144, heading y=234); the primary choice anchor also landed unobscured. Five hotel detail routes and five official accommodation routes returned HTTP 200. Two hero images loaded. Three visible FAQs match three FAQ schema entries.

Card links, save and share targets measured 44px high. The keyboard-focused operator action had a 3px solid accent outline with 3px offset. Save changed aria-pressed from false to true and the label to “Saved”; accepting the privacy notice removed it. Measured contrast ratios: ink on cream 14.42:1, white on ink 16.13:1, gold on ink 9.00:1, accent on white 8.09:1.

The mobile document is still long, around 9,687px at 320px in the dev preview including site header, guide, newsletter and footer. The chooser and group anchors reduce navigation effort; further compression should be judged against scan clarity rather than page height alone.

## 23-lens grade

**Provisional single-reviewer dev diagnostic: 2,125 / 23 = 92.39/100.** The scores below describe the inspected dev page, not an exact static release, independent panel assessment, user test or 99/100 certification.

| Lens | Score / 100 | Evidence or remaining limit |
| --- | ---: | --- |
| 1. First-screen promise | 95 | Clear hotel decision and 48px CTA at y=442–490 on 320×568 first visit. |
| 2. Category scope | 86 | Five characterful hotels; InterContinental's larger branded format needs the stated selection rationale. |
| 3. Format distinction | 94 | Village/coast, vineyard estate and design destination choices have distinct accommodation examples. |
| 4. Booking dependencies | 90 | Each card names a room or dining check; reservation completion remains untested. |
| 5. Factual traceability | 93 | Material changed claims checked against official operator sources above. |
| 6. Freshness disclosure | 91 | Provenance and new record checks; unchanged venue records may carry older checks. |
| 7. Copy economy | 89 | Decisive card copy, but the mobile page is long. |
| 8. Hierarchy and scanning | 94 | Hero, three-choice panel, grouped comparisons and FAQ scan coherently. |
| 9. Wayfinding | 94 | Four anchor actions land with headings visible; all-stays route retained. |
| 10. Link integrity | 94 | Five detail and five official accommodation routes returned 200. |
| 11. Mobile reflow | 94 | No horizontal overflow at 320px or 390px; action pairs fit in mobile cards. |
| 12. 320px first visit | 96 | Primary action ends at y=490, 78px before the fold. |
| 13. Desktop composition | 93 | Paired hotel imagery and text, then a clear three-column choice panel. |
| 14. Typography | 92 | Strong heading hierarchy; small uppercase cue text is about 12px. |
| 15. Contrast | 94 | Tested principal combinations range from 8.09:1 to 16.13:1. |
| 16. Tap targets | 92 | Primary action 48px; card/save/share actions 44px. |
| 17. Keyboard and focus | 91 | Sampled operator action shows 3px focus; full assistive-tech review remains. |
| 18. Semantics and headings | 94 | One H1; grouped H2/H3 structure; visible FAQ and schema parity. |
| 19. State and feedback | 91 | Save and privacy controls visibly respond; broader account states untested. |
| 20. Image truth | 95 | Two verified named-property photos with explicit room-view caveat; no misleading card photos. |
| 21. Media and performance | 89 | Two originals total about 399KB; final responsive output and transfer remain unmeasured. |
| 22. Motion and stability | 94 | No scripted hero motion or overflow; reduced-motion hover treatment present. |
| 23. Newsletter fit | 90 | Existing opt-in follows the complete guide rather than interrupting selection. |

## Release gates and source freeze

- **Boutique source frozen after advisory correction:** page plus Hotel Sorrento and Jackalope venue records. The Hotel Sorrento works notice was added after the first dev-preview scoring pass. The first-screen measurements remain valid because the notice appears in the hotel card; final integrated card layout still needs visual review.
- Both JSON files parse; the dev route renders. Scoped whitespace check passes. No em dash or published price occurs in the new guide copy.
- The parent needs an exact integrated static build after both Set9 tracks are frozen, then 320×568 first-visit, 390 and desktop checks against that artifact. Verify responsive image variants, the five detail routes, Merricks North place and sitewide Jackalope references, FAQ parity and operator handoffs.
- Independent reviewer scores, actual booking-engine completion, effective CMS image provenance on shared venue surfaces, and live public verification remain open. The 92.39 score must not be presented as a released or independently certified 99.
