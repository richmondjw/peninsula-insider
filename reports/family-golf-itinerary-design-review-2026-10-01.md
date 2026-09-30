# Peninsula Insider Family and Golf itinerary set — 1 October 2026

**Outcome:** Family Day Out and Peninsula Golf Weekend now open with photographs that show the actual trip, have recorded Visit Victoria rights, and keep their primary plan actions clear on a short phone after first-visit consent settles. The route advice, stays and operator details have been corrected. The 99/100 design target is not met or certified.

**Decision:** Adapt and release this bounded set after the build and public acceptance gates. Review plan article guides as the next distinct page family.

**Owner:** James Richmond for brand and editorial direction; Codex for implementation, independent review coordination and release verification.

**Project:** Peninsula Insider.

## Baseline and independent 23-layer grade

The source-of-comparison is the public site at release 94f5a16, before this set's content edits. A separate visual reviewer checked the two routes at 320 × 568, 390 × 844 and 1365 × 768 after the consent animation settled. Family scored **1,974 / 2,300 (85.83%)**, Golf **1,869 / 2,300 (81.26%)**, for a set baseline of **3,843 / 4,600 (83.54%)**.

The revised local build scored Family **2,086 / 2,300 (90.70%)** and Golf **2,101 / 2,300 (91.35%)**, together **4,187 / 4,600 (91.02%)**. That is an expert estimated gain of **7.48 points** against the comparable post-release baseline. It is not a visitor outcome or formal accessibility certification.

| Criterion (100 points each) | Family | Golf |
| --- | ---: | ---: |
| First-fold promise | 94 | 94 |
| Base discovery | 82 | 91 |
| Option differentiation | 85 | 91 |
| Route coherence | 90 | 88 |
| Booking readiness | 86 | 86 |
| Practical constraints | 87 | 88 |
| Freshness transparency | 84 | 84 |
| Content economy | 83 | 79 |
| Hierarchy and scanning | 94 | 92 |
| In-page jumps | 97 | 97 |
| Link integrity | 96 | 96 |
| Mobile reflow | 94 | 94 |
| Desktop composition | 95 | 96 |
| Typography | 91 | 91 |
| Measured contrast | 97 | 97 |
| Tap targets | 92 | 92 |
| Keyboard and focus | 94 | 94 |
| Semantics and alt text | 95 | 96 |
| State and error feedback | 91 | 91 |
| Newsletter fit | 85 | 85 |
| Image truth | 91 | 97 |
| Responsive media and performance | 91 | 90 |
| Motion and stability | 92 | 92 |
| **Total / 2,300** | **2,086** | **2,101** |

## Changes and rationale

- Family now opens with a licensed photograph of a family inside Arthurs Seat Eagle. Its five-photograph set includes the gondola and the brewery setting; repetitive beer closeups were removed. The Mount Martha beach is still described rather than illustrated because no approved depiction was established for this edit.
- Golf now opens with a licensed photograph of golfers at St Andrews Beach rather than a Cape Schanck photograph with conflicting credit and temporary rights metadata. Course photographs and location captions name Fingal correctly. The new hero and both Family/Golf photo placements are recorded in the Visit Victoria ledger.
- Golf has a shorter first-fold title, two explicit Jackalope nights and day labels. The Cape Schanck Boardwalk is a variation for non-golfers, not a sequential stop imposed on the whole group. The 5.4 km Bushrangers Bay walk no longer follows a round and lunch. The plan asks readers to confirm tee-to-lunch timing, and notes the Piazza fallback.
- Family uses the Eagle operator's approximately 15-minute one-way journey, conditional brewery lunch and variable menu, and Commonfolk's actual closing times. Shared Eagle, brewery, cafe and golf source records were corrected so their linked guides do not repeat the stale claims. Both itineraries no longer show unverified total-drive-minute estimates.
- The existing curation guard now requires a golf-course hero with its recorded licence, replacing its stale assertion that the hero was a coast photograph.

## Verification and limits

The complete project build, content checks, media-rights and Visit Victoria placement gates, link-health ratchet and release checks passed locally. The built output contains TouristTrip structured data on both routes, explicit Golf Night 1 and Night 2, the non-golfer variation, and credited photographs. Discovery journeys passed 13/13. One planning-journey check timed out when planning and discovery suites ran concurrently; the standalone rerun passed 14/14. This is recorded as a test-resource contention finding, not hidden as an unconditional first-pass green.

Independent Chromium checks on the final local build found no horizontal overflow or JavaScript errors at 320 × 568, 390 × 844 and 1365 × 768. After a 2.4-second consent settle, both pages' primary actions and page jumps were pointer-reachable at all three widths. The prior Golf 320 px action interception was resolved by the shorter opening copy. The first-visit consent notice can still cover part of the mobile hero image and gallery expand control until a short scroll or consent choice.

The pages have no new whole-plan factual verification stamp. Operator hours, menus, weather, tee times and booking availability remain date-dependent. No field Core Web Vitals, real-device 200% zoom, assistive-technology session, reader task completion or conversion evidence was collected. The 99/100 goal therefore remains unproven. Golf is still a long read at roughly 9,000 px on a 390 px phone; Family is roughly 7,400 px. The next content review should seek an approved Mount Martha beach photograph and test whether lower-page repetition can be reduced without losing planning detail.

## Primary source record

- Arthurs Seat Eagle duration, ticket flexibility and weather closures: https://aseagle.com.au/faq/
- Red Hill Brewery current service and menu: https://www.redhillbrewery.com.au/whats-on/ and https://www.redhillbrewery.com.au/our-menu/
- Commonfolk Mornington hours and phone: https://www.commonfolkcoffee.com.au/pages/locations/mornington
- St Andrews Beach course address and tee booking: https://standrewsbeachgolf.com.au/
- Bushrangers Bay walk commitment: https://www.parks.vic.gov.au/places-to-see/sites/bushrangers-bay-walk
- Montalto Restaurant and Piazza hours: https://montalto.com.au/pages/find-us
- Jackalope stay and check-in: https://jackalopehotels.com/stay/

## Evaluation and rollback

**Hypothesis:** Trip-specific imagery, exact stay sequence and accurate route constraints reduce first-visit confusion and trip-planning mistakes.

**Metric and evaluation date:** By 8 October 2026, inspect field LCP/CLS/INP where available, plan-to-stay and My Trip action paths, reader feedback, and any corrections about timing or venue service. Use a newly rendered artifact and independent evidence for another score.

**Rollback:** The prior public source commit is 94f5a16dd865cfd4c3de4b9825f859c89b5ff4ad. Revert this bounded set if a release gate or public journey regresses.

**Independent review:** A factual agent checked operator, park and image-rights sources and edited the bounded content records. A separate visual agent graded the comparable public baseline and final local build against the same 23 criteria.