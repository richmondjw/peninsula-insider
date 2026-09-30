# Spa plan guides: stay choices and a thermal weekend

**Project:** Peninsula Insider
**Owner:** Peninsula Insider editorial and site team
**Decision:** Adopt this bounded page set after final artifact review, remote gates and public receipt.
**Review date:** 1 October 2026

## Baseline, hypothesis and grade

The comparison is the public Stay and Soak and Thermal Springs Weekend guides before this set. Their licensed photography and long-form content were useful, but the decision path was hard to see. On a 320 × 568 first visit, Stay's primary action began below the viewport at y592; Thermal's action at y506 was covered by the privacy card. Stay's image caption also named Cape Schanck for a photograph made at Peninsula Hot Springs in Fingal.

The hypothesis is that a clear first choice, coherent overnight sequence and accurate accommodation differences will help readers choose a plan before reading the full article. The same visual reviewer graded the public baseline and local candidate below. Each criterion is expert judgement out of 100, not measured visitor outcome. A separate baseline auditor scored public Stay 81.22% and Thermal 87.00%; those different-reviewer scores are not mixed into this paired comparison.

| Criterion | Stay public | Stay candidate | Thermal public | Thermal candidate |
| --- | ---: | ---: | ---: | ---: |
| First-fold promise | 67 | 92 | 79 | 92 |
| Base discovery | 75 | 89 | 84 | 90 |
| Option differentiation | 74 | 90 | 86 | 92 |
| Route coherence | 73 | 85 | 85 | 87 |
| Booking readiness | 71 | 84 | 80 | 86 |
| Practical constraints | 70 | 87 | 82 | 89 |
| Freshness transparency | 55 | 68 | 67 | 71 |
| Content economy | 61 | 79 | 76 | 84 |
| Hierarchy and scanning | 74 | 91 | 86 | 92 |
| In-page jumps | 78 | 95 | 89 | 95 |
| Link integrity | 88 | 92 | 90 | 92 |
| Mobile reflow | 88 | 95 | 90 | 95 |
| Desktop composition | 82 | 90 | 85 | 90 |
| Typography | 85 | 91 | 88 | 91 |
| Measured contrast | 93 | 93 | 93 | 93 |
| Tap targets | 89 | 94 | 91 | 94 |
| Keyboard and focus | 86 | 90 | 87 | 90 |
| Semantics and alt text | 93 | 95 | 95 | 95 |
| State and error feedback | 84 | 85 | 84 | 85 |
| Newsletter fit | 78 | 78 | 78 | 78 |
| Image truth | 70 | 95 | 94 | 95 |
| Responsive media and performance | 84 | 86 | 85 | 86 |
| Motion and stability | 88 | 88 | 88 | 88 |
| **Total** | **1,806/2,300 (78.52%)** | **2,032/2,300 (88.35%)** | **1,962/2,300 (85.30%)** | **2,050/2,300 (89.13%)** |

A second independent reviewer graded the final candidate 2,124/2,300 (92.35%) Stay and 2,123/2,300 (92.30%) Thermal with the desktop headline correction. These are reviewer differences, not repeated visitor measurement. Both reviewers remain below the requested 99%.

## Adopted changes

- Stay and Soak asks where to sleep relative to the baths: on site in Fingal, at another Peninsula base with a drive, or at a resort or town spa. It distinguishes Alba's Sanctuary, Peninsula Hot Springs Eco Lodges and glamping before covering off-site choices. Its hero caption now correctly identifies Fingal.
- Thermal Springs Weekend means two consecutive nights: Friday arrival, one Saturday bathhouse visit and an open Sunday. It differentiates Alba, Peninsula Hot Springs and a Red Hill base, and offers a lighter day-trip option. Booking notes distinguish bathing entry, treatments, room access and age rules.
- Both guides now have a specific primary action, three linked choices, a quieter secondary guide action, shorter titles and deks, and the full reading path. The shared decision module came from the prior plan-guide set; this set opts these two guides into it.
- A scoped desktop headline size on Thermal keeps its location-bearing title while moving its action above the 1365 × 768 first fold. Other plan guides keep their current title styling.
- Official operator information informed bounded corrections. The whole-guide lastVerified fields remain 22 April 2026 because the complete content was not revalidated.

## Verification and limits

Focused local checks passed content validation, house style, image rights (49/49), Visit Victoria licensed usage (786 uses), internal destinations and a clean intended diff. Two full local builds passed, including the final desktop headline adjustment and all downstream assertions.

On the exact final build, both guides returned HTTP 200 at 320 × 568, 390 × 667 and 1365 × 768 with no browser errors or horizontal overflow. Both first-view actions were visible and hit-test clear at 320 and 390. All six choice links clicked through to headings below the sticky header; all contents targets resolved. At 1365 × 768, the Thermal headline wraps to three lines and its primary action ends at y689, clear of the first fold.

At 390 px, the pages remain about 12,179 px (Stay) and 11,432 px (Thermal) long. First-visit consent still obscures part of the hero or lower reading area and needs a bounded shared-component pass. Room inclusions, offers, minimum stays and age rules can change, so readers are directed to operators before booking. There is no field Core Web Vitals, 200% zoom, assistive-technology session, reader task completion or booking conversion evidence. The 99% goal is not yet supported.

## Primary source record

- Alba Sanctuary: https://albathermalsprings.com.au/alba-experiences/the-sanctuary/
- Peninsula Hot Springs Eco Lodges: https://www.peninsulahotsprings.com/accommodation/eco-lodges
- Peninsula Hot Springs glamping: https://www.peninsulahotsprings.com/accommodation/glamping
- Peninsula Hot Springs Bath House: https://www.peninsulahotsprings.com/bathe/bath-house/revitalise
- Jackalope Spa: https://jackalopehotels.com/spa/
- RACV One Spa Escape: https://www.racv.com.au/travel-experiences/resorts/cape-schanck/offers/one-spa-escape.html
- Polperro Villas: https://www.polperrowines.com.au/escape/villas/

## Evaluation and rollback

By **8 October 2026**, inspect field LCP, CLS and INP where available, cover-to-choice clicks, choice-to-guide and stay transitions, reader corrections and operator changes. Repeat independent grading with real devices and assistive technology before asserting 99%. If the public release regresses, revert this bounded spa set while preserving the earlier Golf and School guides.
