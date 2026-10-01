# Set8A Cottages and Coastal Stays — independent QA

**Project:** Peninsula Insider\
**Date:** 1 October 2026\
**Reviewer:** independent Set8A QA agent\
**Release owner:** Set8 release lead\
**State:** exact local static-artifact review; no source edit, commit, push or public-deployment claim

## Outcome and decision

Both guides pass the focused responsive, interaction, image and link checks below. I found no release-blocking defect in these two pages. The independent, equally weighted 23-lens diagnostic means are **90.96/100 for Cottages** and **91.13/100 for Coastal Stays**. Neither meets the requested 99/100 bar. Keep the current implementation for this release gate, while retaining property photography, booking-handoff verification and real-device/performance testing as improvement work.

This review used the exact rendered Cottages and Coastal Stays artifact served at http://localhost:4358/ after Astro generated 1,008 pages and the responsive image phase completed. A later unrelated event-expiry SEO gate was being resolved separately; this report does not certify the subsequent rebuild or public release.

## Measured browser evidence

Fresh browser pages retained the first-visit cookie notice. The CTA boxes were fully visible and hit-clear at their centre points.

| Guide | 320 × 568 CTA | 390 × 844 CTA | 1365 × 768 CTA | Horizontal overflow / page errors |
|---|---|---|---|---|
| Cottages | y=507–555, 48px high; 13px above fold | y=508–556, 48px high | y=621–669, 48px high | None / none at all three widths |
| Coastal Stays | y=427–475, 48px high | y=469–517, 48px high | y=589–637, 48px high | None / none at all three widths |

- Both pages returned HTTP 200 at all three widths, had one H1, and kept document width equal to the viewport. The cookie notice was present during first-fold measurement.
- All 14 venue action links on each guide measured 44px high. All 14 Cottages save/share buttons measured 44 × 44px. Keyboard focus on the primary CTA produced a visible 2px outline on Cottages and 3px on Coastal Stays.
- Choice-anchor targets landed at y=144 on mobile and y=208 on desktop. Their headings remained below the sticky chrome: Cottages y=218–234 mobile and y=309–324 desktop; Coastal Stays y=185–193 mobile and y=276–291 desktop.
- Coastal Stays puts the first group's stay rows before its figure in the DOM. At 320px the stay rows began at page y=1,881 and the area photo at y=2,737; at 390px they began at y=1,854 and y=2,526. At 1365px they started side by side at y=1,507. This corrects the earlier image-before-stay mobile handoff.
- Each guide rendered seven intended venue cards. All seven distinct local detail routes from each guide returned HTTP 200. Cottages rendered five cottage choices and two B&B/suite choices; Coastal Stays rendered seven stays in four settings. No paused Mallorca recommendation or inland thermal stay appeared in either card set.
- CollectionPage ItemList JSON-LD contained seven URLs matching the seven rendered local venue paths on each page, with ItemListUnordered order. The visible and structured FAQ counts matched: three for Cottages, four for Coastal Stays. Visible FAQ text and schema are generated from the same source arrays.
- After scrolling, both Cottages area images and all five Coastal Stays destination images decoded with non-zero natural widths. Mobile selected responsive 480px variants; Coastal desktop selected 800px variants. I visually inspected the local masters: the stated vineyard, bay, Cape Schanck and Point Nepean subjects match their alt text and captions. Captions explicitly say these are area views, not accommodation interiors or room views.
- Representative computed text contrast was 14.42:1 for hero text, 7.24:1 for blue accent text, and 7.31:1 for soft card copy. This is a sample, not a page-wide accessibility audit.

## Independent 23-lens diagnostic

Scores are /100 and equally weighted. The matrix totals **2,092 / 23 = 90.96** for Cottages and **2,096 / 23 = 91.13** for Coastal Stays, rounded to two decimals. They describe this exact local artifact and include judgment where measurement alone cannot establish quality.

| Lens | Cottages | Coastal Stays |
|---|---:|---:|
| First-screen promise | 89 | 93 |
| Category scope | 94 | 95 |
| Format distinction | 94 | 91 |
| Booking dependencies | 87 | 87 |
| Factual traceability | 93 | 93 |
| Freshness disclosure | 88 | 89 |
| Copy economy | 91 | 89 |
| Hierarchy and scanning | 92 | 91 |
| Wayfinding | 93 | 93 |
| Link integrity | 92 | 92 |
| Mobile reflow | 94 | 94 |
| 320px first visit | 88 | 93 |
| Desktop composition | 90 | 92 |
| Typography | 92 | 91 |
| Contrast | 88 | 88 |
| Tap targets | 94 | 94 |
| Keyboard and focus | 92 | 92 |
| Semantics and headings | 94 | 94 |
| State and feedback | 87 | 86 |
| Image truth | 95 | 95 |
| Media and performance | 84 | 84 |
| Motion and stability | 93 | 92 |
| Newsletter fit | 88 | 88 |
| **Unweighted mean** | **90.96** | **91.13** |

The gap to 99 is **8.04 points for Cottages** and **7.87 points for Coastal Stays**. Cottages' 320px first-fold action is usable but very close to the bottom edge. The destination images are truthful and correctly disclosed, yet they cannot show a guest what each listed property looks like. The score also reserves room for the unverified parts below.

## Limits and next verification

- External operator booking completion and live availability were not tested; a valid local detail link does not prove a successful reservation handoff.
- The image review checked visual subject, alt/caption honesty, load and responsive delivery. It did not independently establish the full photography rights chain or geographic provenance beyond existing project assets and author receipts.
- Tests ran in desktop Edge emulation at three viewport sizes, not physical phones, tablets or assistive technology. No full lab performance, screen-reader or page-wide contrast audit was run.
- Hotel Sorrento's dated construction advisory must be checked against its operator page by 30 November 2026, or sooner if that page changes.
- Recheck these two routes against the final rebuilt artifact and the public deployment before describing them as live. The present decision is **adopt for the Set8A local release gate with measured limitations**, not a 99/100 pass.
