# Set9 independent guide review — 1 October 2026

**Project:** Peninsula Insider
**Pages:** /stay/boutique-hotels/ and /stay/wellness-retreats/
**Reviewer:** independent Set9 QA agent; implementation and release are owned by the Set9 lead and guide authors.
**Status:** final independent exact-artifact review. No release blocker found in these two guides. No source edits, commit or publication by this reviewer.

## Decision and scope

**ADAPT.** Both guides put a meaningful accommodation choice on the first screen and separate room, bathing, dining and treatment bookings. The 23-lens diagnostic below is an evidence-bound heuristic, not a user-tested accessibility certificate or a 99/100 claim. The authors recorded pre-change baselines in their own reports. This independent review assessed source, current operator evidence, development preview and the successful final integrated static build. The bounded image-subject refinement arose from this review. Rollback owner: Set9 lead if public acceptance reveals a material regression.

## Exact-artifact evidence

The final post-label build:search exited 0, passed its gates and generated 1,012 HTML files and 728 Pagefind pages. Its next/dist was served read-only at http://localhost:4364/. The 320, 390 and 1365px measurements below were repeated against that final artifact. Both Wellness photo-subject labels were inspected at desktop anchor landings in the final artifact.

| Check | Boutique Hotels | Wellness Stays |
| --- | --- | --- |
| Fresh 320 × 568 action | “Find your hotel” y442–490, 48px high, hit-clear | Three choice cards y390–498, 108px high, all hit-clear |
| Fresh 390 × 844 action | CTA y454–502 | Cards y419–527 |
| Fresh 1365 × 768 action | CTA y543–591 | Cards y540–648; fully within the first fold |
| Horizontal overflow and JS errors | None at 320, 390 or 1365 | None at 320, 390 or 1365 |
| Anchor landing | Four targets at section y144 mobile / y208 desktop; H2 visible | Three targets at section y104 mobile / y128 desktop; H2 visible |
| Content and structured data | Five cards match CollectionPage ItemList; three visible FAQs exactly match FAQ schema | Six cards match ItemList; five visible FAQs exactly match FAQ schema |
| Local detail routes | All five returned 200 | All six returned 200 |
| Card text actions | Minimum measured height 44px | Minimum measured height 44px |
| Generated image delivery | Two images decoded; 480px WebP variants selected | Four images decoded; 480px mobile, 800px desktop hero and 480px group variants |

The exact static output selected 480px WebP files of about 16KB and 31KB for the two Boutique photos. Wellness selected about 40KB, 21KB and 23KB 480px files for its hero and first two section photos; its desktop hero used a 93KB 800px variant. All subject photographs and captions were checked against the Visit Victoria catalogue and the six page-specific entries in the where-used ledger. The Alba hero shows the bathing estate, not a room; the Jackalope image shows its vineyard, not a treatment space.

Hotel Sorrento’s dated works notice fits inside its 320px card (about 240px notice width; no internal overflow) and links to the [current operator stay notice](https://hotelsorrento.com.au/stay/). At 320px the first Boutique save control changed aria-pressed from false to true. The privacy notice hid after “Accept all” (display:none, zero height). A sampled Wellness chooser displayed a 3px solid keyboard focus outline. The six repeated visible “Read stay notes” links now have distinct venue-specific accessible labels in the final source. The onward Stay, springs comparison, day-spa, weekend-plan and wider-stay routes returned 200 in the exact static preview.

## Source and image truth

The official [Hotel Sorrento rooms and notice](https://hotelsorrento.com.au/stay/), [Jackalope rooms](https://jackalopehotels.com/stay/) and [spa](https://jackalopehotels.com/spa/), [Peninsula Hot Springs accommodation](https://www.peninsulahotsprings.com/accommodation), [Alba Sanctuary](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/), [Flinders stay-and-bathe package](https://www.peninsulahotsprings.com/accommodation/stay-local/flinders-hotel-stay-and-bathe) and [Lindenderry Alba package](https://lancemore.com.au/hotels/lancemore-lindenderry-red-hill/experiences/packages/alba-package/) support the changed format and inclusion distinctions. Availability, package terms and operator hours remain date-dependent.

The first static artifact exposed an image association risk, not a false caption: its Eco Lodge photo appeared beside Glamping and its Lindenderry photo beside Flinders while the accurate captions sat below the viewport. The lead added always-visible subject labels above all three group photos. In the final exact static artifact, Eco Lodge and Lindenderry are visibly named before the corresponding photos at desktop anchor landings. This resolves the skimming ambiguity.

## Independent 23-lens diagnostic

Scores are unweighted, out of 100 per lens. They describe the corrected page design if the post-label static artifact matches the source and first-build behavior. Both are below 99, with gaps in category precision, copy economy and untested real-user outcomes.

| Lens | Boutique | Wellness | Independent basis |
| --- | ---: | ---: | --- |
| 1. First-screen promise | 95 | 95 | Clear H1 and immediate decision action |
| 2. Category scope | 85 | 88 | Full-service InterContinental stretches “boutique”; Wellness is broader than facilitated retreats |
| 3. Format distinction | 94 | 95 | Three honest, useful paths on each page |
| 4. Booking dependencies | 90 | 94 | Room, dining, bathing, treatment and transport caveats |
| 5. Factual traceability | 93 | 92 | Primary operator checks and explicit source links |
| 6. Freshness disclosure | 90 | 90 | Dated checks; offers and works can change |
| 7. Copy economy | 85 | 82 | Mobile document heights about 9,651px and 12,548px respectively |
| 8. Hierarchy and scanning | 94 | 92 | Strong grouping and headings, with long continuation |
| 9. Wayfinding | 94 | 94 | Working choice anchors and onward routes |
| 10. Link integrity | 94 | 94 | Detail and sampled onward routes returned 200; checkout not tested |
| 11. Mobile reflow | 94 | 93 | No horizontal overflow at three widths |
| 12. 320px first visit | 96 | 95 | Primary actions fully visible with privacy notice |
| 13. Desktop composition | 93 | 92 | Balanced editorial photography and decision copy |
| 14. Typography | 91 | 89 | Readable hierarchy; small cue and location labels remain |
| 15. Contrast | 94 | 93 | Measured soft text on white 7.31:1, accent on white 8.30:1, ink on cream 14.42:1 |
| 16. Tap targets | 92 | 94 | 48px CTA, 108px choices and at least 44px text actions |
| 17. Keyboard and focus | 91 | 90 | Sampled visible focus; no full assistive-technology session |
| 18. Semantics and headings | 94 | 94 | One H1; FAQ/schema parity and venue-specific link labels |
| 19. State and feedback | 90 | 85 | Save/privacy tested on Boutique; Wellness is mostly navigation |
| 20. Image truth | 93 | 92 | Licensed actual subjects and photo limits; visible group labels required on Wellness |
| 21. Media and performance | 92 | 91 | Responsive WebP delivery measured; field Core Web Vitals untested |
| 22. Motion and stability | 93 | 93 | No layout overflow or page errors; no intrusive hero motion |
| 23. Newsletter fit | 88 | 87 | Opt-in follows the guides; conversion fit has not been user tested |
| **Unweighted mean** | **91.96** | **91.48** | **Neither meets the proposed 99 threshold** |

## Limits and next action

The exact post-label static build passed 320, 390 and 1365px checks, including photo labels, responsive image variants, FAQ parity and local routes. **Release decision for these two guides: no blocking defect found; proceed through Set9 release and public acceptance after deployment.** This review did not complete a reservation, measure field Core Web Vitals, run an assistive-technology session or observe travellers making decisions. Recheck Hotel Sorrento's time-bound works notice by 30 November 2026. The sitewide Jackalope exact-place and older Hotel Sorrento room-advice inconsistencies were sent to the Set9 lead for a separate source sweep.
