# Article plan guides: golf stays and school holidays

**Project:** Peninsula Insider
**Owner:** Peninsula Insider editorial and site team
**Decision:** Adopt this bounded design and factual correction set after the remote release gates and public receipt.
**Review date:** 1 October 2026

## Baseline, hypothesis and grade

The public article layout at revision `94f5a16` was the comparison; revision `ab54770` did not edit these two article routes. The hypothesis is that a clear first choice, shorter opening copy and truthful image and operator details will help readers choose a route before reading a long guide.

The comparable visual reviewer scored Golf **1,772/2,300 (77.04%)** before and **1,982/2,300 (86.17%)** after. School Holidays scored **1,570/2,200 (71.36%)** before and **1,875/2,200 (85.23%)** after; an accommodation-specific criterion was not applicable. A separate independent reviewer scored the final artifact **2,078/2,300 (90.35%)** Golf and **2,070/2,300 (90.00%)** School. These are different expert judgements, not field visitor outcomes. All remain below the requested 99%.

| Criterion (100 each) | Golf public | Golf visual final | Golf independent | School public | School visual final | School independent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| First-fold promise | 72 | 89 | 92 | 74 | 89 | 93 |
| Base discovery | 70 | 88 | 91 | n/a | n/a | 90 |
| Option differentiation | 74 | 88 | 90 | 70 | 87 | 88 |
| Route coherence | 70 | 79 | 84 | 61 | 73 | 86 |
| Booking readiness | 61 | 79 | 84 | 58 | 74 | 82 |
| Practical constraints | 63 | 82 | 88 | 64 | 80 | 88 |
| Freshness transparency | 42 | 55 | 78 | 40 | 60 | 80 |
| Content economy | 62 | 75 | 73 | 52 | 68 | 68 |
| Hierarchy and scanning | 76 | 89 | 93 | 72 | 88 | 92 |
| In-page jumps | 80 | 95 | 97 | 78 | 95 | 97 |
| Link integrity | 73 | 90 | 96 | 69 | 90 | 96 |
| Mobile reflow | 86 | 94 | 94 | 86 | 94 | 94 |
| Desktop composition | 81 | 86 | 94 | 80 | 86 | 94 |
| Typography | 82 | 90 | 92 | 82 | 90 | 92 |
| Measured contrast | 93 | 93 | 97 | 93 | 93 | 97 |
| Tap targets | 88 | 94 | 92 | 84 | 94 | 92 |
| Keyboard and focus | 84 | 90 | 94 | 83 | 90 | 94 |
| Semantics and alt text | 90 | 95 | 96 | 64 | 95 | 96 |
| State and error feedback | 84 | 85 | 90 | 84 | 85 | 90 |
| Newsletter fit | 78 | 78 | 85 | 76 | 76 | 85 |
| Image truth | 92 | 95 | 97 | 30 | 95 | 97 |
| Responsive media and performance | 83 | 85 | 89 | 82 | 85 | 87 |
| Motion and stability | 88 | 88 | 92 | 88 | 88 | 92 |

## Adopted changes

- The Golf guide opens with three course and stay bases. School Holidays opens with beach, adventure and rainy-day choices. Each has a specific primary action to those choices and a secondary action to the full guide. The choice module replaces a long generic summary; additional planning notes remain in a disclosure.
- Shorter titles and deks, truthful editorial labels and all eight section links improve the reading path. Compact phone styling is opt-in to these two guides. Other article and JSON itinerary covers retain their previous layout.
- School Holidays now uses a recorded Visit Victoria family photograph inside Arthurs Seat Eagle, with descriptive alt, place caption and visible credit. The incomplete CMS override does not repaint it after load. Golf's existing licensed course photograph now identifies St Andrews Beach in Fingal.
- Bounded official-source corrections cover flexible Eagle tickets, seasonal Rocky Creek picking, gallery hours, Fort Nepean walking distance, exposed-coast swimming caution, golf visitor access, weekday resort offers, Moonah dining and family bathing rules. Unsupported queue, savings, package and drive claims were removed. The independent reviewer caught a course-count mismatch; both count claims were removed.

## Verification and limits

The exact final static artifact returned HTTP 200 for both target guides and representative One Night Escape and Stay and Soak routes. At 320 × 568, 390 × 844 and 1365 × 768, both target guides had no horizontal overflow or browser errors. Primary and secondary actions were hit-test clear. Primary clicks landed on the decision heading below the sticky header; all six choice and sixteen H2 targets resolved. The licensed School image, alt, caption and credit remained after scripts settled. The intended source diff has no whitespace errors. The full local build chain generated pages and reached its last four passing tests, though the outer shell wrapper failed to preserve a usable exit code; remote CI must supply independent build proof.

At 390 px, Golf is about 12,237 px tall and School Holidays about 16,583 px. The first-visit cookie card can cover lower content and part of the desktop photo/caption until dismissed, although credits remain visible. One Night Escape's 320 px consent interception is identical on the existing public baseline and was not introduced here. Operator details and availability change. This was a bounded source review, so whole-article `lastVerified` dates were not advanced. There is no field Core Web Vitals, 200% zoom, assistive-technology session, reader task completion or conversion evidence. The 99% goal remains unproven.

## Primary source record

- RACV Cape Schanck offer: https://www.racv.com.au/travel-experiences/resorts/cape-schanck/offers/cape-stay-and-play.html
- Moonah Links packages and dining: https://www.moonahlinks.com.au/cms/hotel/accommodation-and-packages/ and https://www.moonahlinks.com.au/cms/dining/pebbles-restaurant/
- Portsea and Sorrento visitor access: https://portseagolf.com.au/golf/ and https://sorrentogolf.com.au/visitors/
- Eagle tickets: https://aseagle.com.au/opening-hours/
- Rocky Creek seasonal picking: https://rockycreek.com.au/
- Gallery: https://mprg.mornpen.vic.gov.au/About/Visit
- Fort Nepean: https://www.parks.vic.gov.au/places-to-see/parks/point-nepean-national-park/attractions/fort-nepean
- Ocean-beach safety: https://www.parks.vic.gov.au/places-to-see/parks/mornington-peninsula-national-park/things-to-do/ocean-beaches
- Thermal family rules: https://www.peninsulahotsprings.com/terms-and-conditions and https://albathermalsprings.com.au/faqs/
- Visit Victoria image usage: `ops/records/visit-victoria/placements.json`

## Evaluation and rollback

By **8 October 2026**, inspect field LCP/CLS/INP where available, hero-to-choice clicks, choice-to-guide and stay transitions, reader corrections, and complete source freshness. Repeat independent grading with real devices and assistive technology before asserting 99%. Revert this bounded set to prior public revision `ab54770ce4d2c148b890f81101da008e139ea4be` if release or live reading journeys regress.

## Public release receipt

The approved guide changes were committed as `edaac86f3e6f52c8e572b9ec93430e1dca45717a`. A scheduled content-freshness commit then advanced the deployment revision to `267d6e2c6fb7bbcb7fce0429aec5d800b3eadf4f`, which contains the guide changes. [Build and Deploy](https://github.com/richmondjw/peninsula-insider/actions/runs/36764433047), [Content Gate](https://github.com/richmondjw/peninsula-insider/actions/runs/36764433010) and [Live Agent Readiness](https://github.com/richmondjw/peninsula-insider/actions/runs/36765834712) all succeeded. The public `/deployment.json` identified that same source SHA. Both public guide routes returned HTTP 200 with the three-choice decision module and `#plan-start` target. The School Holidays licensed hero returned image/webp HTTP 200 and appeared in the public HTML. This proves publication and basic route integrity, not reader outcomes or a 99% quality score.
