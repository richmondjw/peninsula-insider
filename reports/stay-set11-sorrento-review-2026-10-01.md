# Stay Set11 Sorrento author review - 1 October 2026

**Project:** Peninsula Insider
**Owner:** Sorrento guide agent; Set11 lead owns integration, independent review and release.
**Decision:** ADAPT the Sorrento guide into a two-hotel room decision.
**State:** source and unique-port development preview checked. No integrated static build, independent score or public deployment claimed by this author.

## Baseline and change

The prior Sorrento page had one generic paragraph and a two-card venue grid. It offered neither an early choice by travel party nor a warning that the two similarly located hotels have different occupancy and booking arrangements. The new opening names the distinction immediately: Hotel Sorrento is adults-only; InterContinental Sorrento offers family stays within The Continental precinct. Both linked choices appear on the first 320 x 568 screen even when the site's privacy notice is visible.

The rest of the page explains the exact-room decision rather than treating "Sorrento hotel" as a single promise. It distinguishes Hotel Sorrento's room families, Classic Suites noise warning and dated works notice; and distinguishes the InterContinental room booking from the precinct's dining and Aurora Spa. It retains hotel detail pages, direct operator handoffs, Save to Your Peninsula, Sorrento exploration, wider stay guides and the newsletter. No room view, package inclusion, parking arrangement or booking availability is promised without checking the operator.

The related dog-friendly accommodation article's false claim that InterContinental Sorrento has a minimum age of 18 was corrected to say that family stays are available and its pet policy is not confirmed. No pet permission was inferred from family suitability.

## Source and visual truth

Checked 1 October 2026; operator terms and construction status can change.

| Claim or image | Source and limit |
| --- | --- |
| Hotel Sorrento accommodation adults only; maximum two adults per room; pets not permitted in rooms | [Hotel Sorrento FAQ](https://hotelsorrento.com.au/faqs/). The page says nothing about child access to the hotel's restaurants, which follows a different policy. |
| Hotel Sorrento room families, guest pool and current midweek works notice | [Hotel Sorrento stay page](https://hotelsorrento.com.au/stay/). The notice names 1 December but omits the year; the guide does not infer one. Recheck by 30 November 2026. |
| Classic Suites may hear hotel bars or restaurant on weekends and in peak periods | [Hotel Sorrento Classic Suites](https://hotelsorrento.com.au/room/classic-suites/). This is a room-specific caution, not a claim that all rooms are noisy. |
| InterContinental accommodation and family stays | [InterContinental accommodation](https://sorrento.intercontinental.com/accommodation) and [family stays](https://sorrento.intercontinental.com/family-stays). Occupancy, wing, outlook and parking are left for the actual reservation. |
| Continental dining and Aurora Spa are distinct operator paths | [The Continental precinct](https://thecontinentalsorrento.com.au/) and [Aurora Spa](https://thecontinentalsorrento.com.au/stay-restore/aurora-spa/). The guide tells visitors to confirm inclusions and make separate arrangements. |
| Hero image shows town and ferry terminal, not a hotel room | Visit Victoria asset 22100103, existing website rights and actual-subject metadata in `next/src/content/places/sorrento.json`. Page field `sorrento-hero__image img`: `/images/visit-victoria/vv-22100103-sorrento-ferry-terminal.webp`. Caption states the limitation. |
| Hotel section image shows The Continental heritage building | Visit Victoria asset 22100101, existing website rights and actual-subject metadata in `next/src/content/venues/the-continental-sorrento.json`. Page field `sorrento-stay__photo img`: `/images/visit-victoria/vv-22100101-aerials-of-the-continental-sorrento.webp`. Caption states it is not a room view. |

No current, rights-cleared Hotel Sorrento property photo was found for this page. The old public-domain building image is archival and would weaken a current room decision, so the Hotel Sorrento section stays typographic rather than implying a contemporary property view. The Set11 lead should record the two Visit Victoria where-used placements above.

## Development preview QA

The Sorrento route returned HTTP 200 in the unique-port preview at `http://127.0.0.1:4368/stay/sorrento/`. New browser contexts removed prior consent state. The privacy notice was visible in each measurement.

| Viewport | H1 y bounds | Hotel choices y bounds | Result |
| --- | ---: | ---: | --- |
| 320 x 568 | 271-350 | 437-494 and 498-555 | Both 57px choices visible with 13px remaining. |
| 390 x 844 | 286-382 | 469-526 and 530-587 | Both choices and the start of the photograph visible. |
| 1365 x 900 | 422-497 | Both 614-782 | Both choices and the Sorrento image visible. |

At all three widths there was no horizontal overflow or page error in the settled preview. Activating the second mobile choice placed its target H2 at y=219, visible below sticky chrome. Keyboard Tab reached the first choice with a 3px solid focus outline. Both guide images decoded after their sections entered view; the first is eager and the property image lazy. One H1 is present. Three visible FAQs match the three FAQPage schema entries; the CollectionPage lists two hotels. Sampled colors resolve to 7.31:1 for muted text on white, 6.38:1 on cream, 8.30:1 for Harbour blue on white, 7.24:1 on cream and 15.66:1 for the works notice ink on its light ground. The final source has no em dash or price symbol, passed a scoped Git whitespace check, and Impeccable's mechanical detector returned no findings.

The first screenshot pass found the second mobile choice ending at y=614, below the 568px screen. Tightening the lead and choice spacing moved it to y=555. This measurement was repeated after the final copy clarification.

## Author's 23-lens diagnostic

These are unweighted, provisional author judgments of the new source and development preview. They are not an independent review, real-user study, accessibility certification, public deployment result or evidence of 99/100.

| Lens | Score | Basis or remaining limit |
| --- | ---: | --- |
| 1. First-screen promise | 95 | Two distinct hotels and purpose visible immediately |
| 2. Category scope | 93 | Sorrento hotel focus clear; wider accommodation linked onward |
| 3. Format distinction | 94 | Adults-only and family suitability explicit |
| 4. Booking dependencies | 92 | Dining, spa, room, works and inclusion cautions |
| 5. Factual traceability | 93 | Operator paths and venue records support claims |
| 6. Freshness disclosure | 88 | Dated works check needs a later recheck |
| 7. Copy economy | 88 | Strong short opening; long detail and FAQ continuation |
| 8. Hierarchy and scanning | 94 | Immediate choice, then two named hotel sections |
| 9. Wayfinding | 94 | Working anchors, details and related guides |
| 10. Link integrity | 90 | Direct URLs and local detail route sampled; checkout not completed |
| 11. Mobile reflow | 94 | No overflow at 320, 390 or 1365 |
| 12. 320px first visit | 95 | Both choices fully visible with consent notice |
| 13. Desktop composition | 93 | Town aerial balances decision copy without overlay |
| 14. Typography | 92 | Established Sora/Figtree hierarchy and bounded measures |
| 15. Contrast | 92 | Sampled key colors exceed 4.5:1 |
| 16. Tap targets | 92 | Choices measure 57px high; principal actions at least 44px |
| 17. Keyboard and focus | 90 | Tab to choice and visible outline; no full screen-reader session |
| 18. Semantics and headings | 93 | Labelled nav, single H1, FAQ and collection parity |
| 19. State and feedback | 86 | Native links and save actions; booking feedback outside site |
| 20. Image truth | 95 | Actual town/building subjects, visible non-room caveats |
| 21. Media and performance | 86 | Images decoded; field Core Web Vitals not measured |
| 22. Motion and stability | 93 | Dimensions fixed; no hidden-content animation |
| 23. Newsletter fit | 88 | Opt-in follows the stay decision; conversion untested |
| **Unweighted mean** | **91.74** | **Below the requested 99 threshold** |

## Handoff

The Set11 lead should include Sorrento in the integrated static build, record both image placements, and obtain independent factual and visual review. Recheck the first-visit choice positions, FAQ parity, image variants and routes on that exact artifact, then public acceptance after deployment. The Hotel Sorrento works notice should be revisited by 30 November 2026; no recurring monitor was created by this author.
