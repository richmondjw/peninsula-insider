# Peninsula Insider overnight itinerary set — 1 October 2026

**Outcome:** Four published overnight plans now lead with their route and licensed photographs, present practical facts before the day sequence on phones, and show the stay for each actual night. Operator and park corrections remove several trip-breaking assumptions. The 99/100 design target is not certified by these changes.

**Decision:** Adapt and release this bounded set after the build and public acceptance gates. Continue review of the remaining plan families as separate sets.

**Owner:** James Richmond for brand and editorial direction; Codex for implementation, independent review coordination and release verification.

**Project:** Peninsula Insider.

## Set and measured baseline

This set covers Ridge to Sea, Flinders and the Cape, Sorrento Off-Season, and Wellness Weekend. The two other JSON itineraries, Family Day Out and Peninsula Golf Weekend, are shared-template regression pages. Article-template plans use a different layout and are outside this score.

An independent rendered baseline scored **7,596 / 9,200 (82.6%)** across 23 equally weighted criteria per page: Ridge 1,856, Flinders 1,939, Sorrento 1,907, Wellness 1,894 out of 2,300 each. The baseline was an expert browser review of the published pages at 320, 390 and desktop widths, not field user evidence.

The final rendered local build scored **8,636 / 9,200 (93.87%)**, a gain of **11.30 points** against that provisional baseline. Ridge scored 2,161 / 2,300 (93.96%), Flinders 2,164 (94.09%), Sorrento 2,151 (93.52%) and Wellness 2,160 (93.91%). The same expert rubric was used, but the baseline was the published page and the final is a local build. This is a comparative design estimate, not a measured change in visitor outcomes. The 99/100 target is **not met or certified**.

| Criterion (100 points each) | Ridge | Flinders | Sorrento | Wellness |
| --- | ---: | ---: | ---: | ---: |
| First-fold promise | 96 | 97 | 95 | 96 |
| Base discovery | 96 | 95 | 94 | 95 |
| Option differentiation | 91 | 90 | 90 | 91 |
| Route coherence | 95 | 95 | 93 | 94 |
| Booking readiness | 90 | 91 | 89 | 90 |
| Practical constraints | 91 | 92 | 92 | 92 |
| Freshness transparency | 83 | 83 | 83 | 83 |
| Content economy | 87 | 89 | 85 | 87 |
| Hierarchy and scanning | 96 | 96 | 95 | 96 |
| In-page jumps | 97 | 97 | 97 | 97 |
| Link integrity | 97 | 97 | 96 | 97 |
| Mobile reflow | 96 | 96 | 96 | 96 |
| Desktop composition | 96 | 96 | 96 | 96 |
| Typography | 94 | 94 | 94 | 94 |
| Measured contrast | 97 | 97 | 97 | 97 |
| Tap targets | 94 | 94 | 94 | 94 |
| Keyboard and focus | 96 | 96 | 96 | 96 |
| Semantics and alt text | 97 | 97 | 97 | 97 |
| State and error feedback | 94 | 94 | 94 | 94 |
| Newsletter fit | 91 | 91 | 91 | 91 |
| Image truth | 98 | 98 | 98 | 98 |
| Responsive media and performance | 95 | 95 | 95 | 95 |
| Motion and stability | 94 | 94 | 94 | 94 |
| **Total / 2,300** | **2,161** | **2,164** | **2,151** | **2,160** |

The main deductions are 83/100 freshness transparency because no full-plan review date is evidenced; 89–91 booking readiness because availability and prices are not live; 85–89 content economy on long phone pages; 94 typography because some utility text is 10–11 px; and first-visit gallery controls briefly passing under consent at some viewport positions. Those controls become available after a short scroll or consent choice. No hero action was obscured. The next review should test real visitor tasks and field performance before treating a further score increase as proven.

## Changes and rationale

- A split photo and editorial cover brings the trip decision and verified local imagery into the opening screen. A compact mobile cover keeps the stay and My Trip actions available on narrow screens. Day anchors, booking checklist links and explicit day labels make a long route easier to scan.
- The facts box precedes the stops in mobile reading order. Ridge names Jackalope for night one and Hotel Sorrento for night two; the sleep cards, facts and stay rail agree. Flinders now names the actual Quarters accommodation behind Flinders Hotel. Related plans are limited to compatible overnight trips and audience, so a one-night couples plan no longer recommends a family day out as the next step.
- Incomplete CMS image uploads cannot displace credited source photographs or rehydrate over them. The Sorrento and Wellness heroes use verified Visit Victoria photographs with their own alt text and credit. The Visit Victoria placement ledger records the new Sorrento placement. The gallery's open control sits on its photograph; the fixed Join shortcut stands down while the consent choice is open.
- The first-visit consent notice sits to the right of desktop editorial actions and uses a shorter short-phone layout. It retains the privacy explanation, choice controls and expanded preferences.
- The factual pass replaced a dinner recommendation on a lunch-only service, clarified Moke, Lindenderry and Pt Leo dinner days, identified Quarters as a distinct accommodation booking, distinguished Hotel Sorrento's Dining Room, and removed unsupported drive totals. Ridge's afternoon coast stop is now a shorter Cape Schanck visit. Flinders' Bushrangers Bay walk states its 5.4 km return, roughly two-hour and stair commitment. Sorrento's Back Beach lookout, water conditions, off-season months and Pt Leo sculpture timing are stated separately.

## Verification and limits

The complete project build, category and experience tests, media-rights checks, Visit Victoria placement gate, link-health ratchet and CSS budget passed locally. The final artifact passed all 14 planning-journey and 13 discovery-journey checks. A separate local browser review checks 320 × 568, 390 × 844, 1365 × 768 and 1440 × 900 for first-visit action hit targets, overflow, image truth, keyboard behavior, links and structured data. The independent final scorecard and measurements are recorded above and below. On all four routes, primary and secondary hero actions were pointer-reachable at 320 × 568, 390 × 844, 1365 × 768 and 1440 × 900. No horizontal overflow was observed. Day labels and titles did not collide at either phone width; the Sorrento day anchor landed below the sticky header. All six JSON itinerary routes passed mobile and desktop smoke checks, valid trip and breadcrumb structured data, internal anchors and relevant related-plan links.

The short-phone default consent card is 108 px high, down from 151 px, and its initial buttons are at least 44 px high. At 320 × 568, the Ridge stay, My Trip and day jump actions remain pointer-reachable; at 1365 × 768 they also remain pointer-reachable. The expanded preferences remain usable at 320 × 568. This is local Chromium evidence, not a cross-device usability study.

The itinerary records do not acquire a new article-wide verification stamp. Specific operator, park and image facts were checked for this set; the whole plan catalogue was not freshly verified. The 23-layer grade is an expert judgment, not a visitor conversion measure or formal accessibility certification. Field Core Web Vitals, reader task completion, VoiceOver/TalkBack and real-device 200% zoom are not yet evidenced. The existing sitewide design detector flags 16 older global CSS patterns outside this changed section; no new pattern was reported in the plan template or cookie component.

## Primary source record

- Montalto restaurant and Piazza hours: https://montalto.com.au/pages/find-us
- Moke dinner days: https://mokedining.com.au/
- Tedesca lunch service: https://www.tedesca.com.au/osteria-tedesca
- Quarters accommodation and separate room contact: https://flindershotel.com.au/accommodation/ and https://flindershotel.com.au/faqs/
- Hotel Sorrento Dining Room: https://hotelsorrento.com.au/dine-drink/dining-room/
- Bushrangers Bay walk commitment: https://www.parks.vic.gov.au/places-to-see/sites/bushrangers-bay-walk
- Sorrento Back Beach lookout and water safety: https://www.parks.vic.gov.au/places-to-see/parks/mornington-peninsula-national-park/things-to-do/ocean-beaches and https://www.parks.vic.gov.au/places-to-see/sites/sorrento-back-beach
- Pt Leo dinner and sculpture hours: https://www.ptleoestate.com.au/faqs/
- Lindenderry Dining Room: https://lancemore.com.au/hotels/lancemore-lindenderry-red-hill/the-dining-room/
- Mornington Peninsula Regional Gallery opening: https://mprg.mornpen.vic.gov.au/About/Visit

## Evaluation and rollback

**Hypothesis:** A clearer first-fold route, truthful visual attribution and exact night-by-night accommodation reduce planning mistakes and make the itineraries easier to use on small screens.

**Metric and evaluation date:** By 8 October 2026 (seven days after the expected release), inspect field LCP/CLS/INP where available, plan-to-stay and My Trip action paths, reader feedback, and any booking-support corrections. Regrade only against a newly rendered artifact and independent evidence.

**Rollback:** The prior public commit is 2db36103368641686db90082a2e8456cf169461f. Revert this bounded change if a release gate or public journey regresses.

**Independent review:** One agent checked factual claims against operators and parks; one checked all six JSON itinerary routes and first-visit interactions; a separate visual agent scored the four target pages against the same 23 criteria.
