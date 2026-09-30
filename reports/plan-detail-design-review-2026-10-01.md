# Peninsula Insider plan-page review — 1 October 2026

**Outcome:** The One-Night Escape and three related guides now make trip choices clearer, use smaller mobile photographs and give more accurate operator and park advice. A scan of similar pages found wrong market directions, Friday dinner recommendations for lunch-only venues, and spa-package claims that did not fit a weekend stay; those planning paths have been corrected. The 99/100 target is not yet evidenced.

**Decision:** Adapt and release the bounded improvements. Continue the remaining catalogue's factual review through the editorial work queue.

**Owner:** James Richmond for editorial and brand direction; Codex for implementation and release verification.

**Project:** Peninsula Insider.

## Reproducible score

An independent 23-criterion review of The One-Night Escape's final rendered local build scored **2,208 / 2,300 (96.00%)**. The fully itemized baseline was **2,186 / 2,300 (95.04%)**: a 22-point gain. Each criterion is scored out of 100 and weighted equally. This is an expert assessment of one page, not a visitor outcome, percentile or certification of the plan catalogue.

| Criterion | Final score / 100 |
|---|---:|
| First-fold promise | 98 |
| Base discovery | 97 |
| Option differentiation | 95 |
| Route coherence | 97 |
| Booking readiness | 94 |
| Practical constraints | 96 |
| Freshness transparency | 90 |
| Content economy | 88 |
| Hierarchy and scanning | 97 |
| In-page jumps | 98 |
| Link integrity | 98 |
| Mobile reflow | 97 |
| Desktop composition | 97 |
| Typography | 96 |
| Measured contrast | 98 |
| Tap targets | 96 |
| Keyboard and focus | 97 |
| Semantics and alt text | 98 |
| State and error feedback | 97 |
| Newsletter fit | 95 |
| Image truth | 98 |
| Responsive media and performance | 96 |
| Motion and stability | 95 |
| **Total** | **2,208 / 2,300** |

The repeated introductory section was removed, reducing the 390-pixel page from 13,070 to 12,501 pixels. The newsletter now follows the trip takeaway rather than the venue grid; its start moved from y10,772 to y6,544 in the reviewer profile. The 320-pixel breadcrumb shows an ellipsis. At 320 x 700 with a fresh cookie state, the compact cover places the primary action at y430.20-474.20 and the secondary at y482.20-526.20. The consent notice starts at y536.94, leaving 10.73 pixels below the secondary action; all four actions measure 44 pixels high and both guide actions pass hit-testing. At 320 x 568 the fixed consent notice still covers those links until a choice or scroll, so the tap score remains limited. The corrected Alba link reaches its visible target below the sticky header.

The main remaining deductions are article-wide freshness evidence (90), repeated long-form summary and FAQ material (88), and partially generic dinner choices (booking readiness 94). A strict score above 99% requires at least 2,278 / 2,300, or 70 further justified points. Repeating a subjective grade without new evidence would not meet that bar.

## Earlier cohort score

The priority cohort is The One-Night Escape, The Couples' Weekend, The Thermal Springs Weekend and The Point Nepean Half-Day. An earlier reviewer scored 23 equally weighted criteria per page, but only the page totals and two criterion marks were retained. These historical figures indicate direction; they are **not comparable with the reproducible One-Night score above** and do not substantiate a 99/100 claim.

| Page | Earlier scored local build | Proportion |
|---|---:|---:|
| One-Night Escape | 2,261 / 2,300 | 98.30% |
| Couples' Weekend | 2,255 / 2,300 | 98.04% |
| Thermal Springs Weekend | 2,260 / 2,300 | 98.26% |
| Point Nepean Half-Day | 2,262 / 2,300 | 98.35% |
| **Cohort** | **9,038 / 9,200** | **98.24%** |

The older cohort preview still contained the Alba fragment typo. The fixed anchor was verified on the public release. The older scorecard lacked most row-level evidence, so we have retired it as a pass/fail measure. Reaching 99 requires a new complete, independent assessment and corroborating user evidence.

## Changes and evidence

- One-Night presents three immediate base choices with stay, dinner and Sunday decisions. Its linked venue routes and full guide remain available. Couples, Thermal Springs and Point Nepean have tighter planning copy and more accurate practical advice.
- Four plan-article hero images use responsive derivatives of their licensed source photographs. On the public 390-pixel, DPR 2, 150 ms RTT, 200 KiB/s, four-times CPU lab profile, three runs per page gave median LCP of 2.05s for Point Nepean (previously 4.88s) and 2.00s for Couples (previously 3.92s). One-Night measured 2.07s (previously 1.98s, within run variation). CLS was below 0.001. These are controlled lab results, not field Core Web Vitals.
- Point Nepean selected an 800-pixel hero of 68,552 encoded bytes instead of the 366,648-byte original; Couples selected 55,080 instead of 234,206 bytes. One-Night selected 26,470 instead of 57,600 bytes. Image rights, alt text and credits remain recorded.
- A full build scan found 31 plan detail routes. Every route had a heading and a path to current editorial picks; all 24 article-template hero images had alt text and responsive variants. One-Night had no horizontal overflow at 320 or 390 CSS pixels. Its menu, keyboard controls and Choose your base anchor worked at 320 pixels.
- The newsletter block describes its format and links to current Peninsula picks. It no longer presents an old article as a recently sent issue. On One-Night it now follows the takeaway. The floating Join control hides when the inline form enters view, in the footer and while overlays are open.
- The wider editorial scan found an overlapping market schedule and a false Mornington Farmers Market location in two guides. Main Street Mornington lists the farmers market at Mornington Park on the second Saturday; Mornington Peninsula Shire lists the separate Racecourse Market on the second Sunday. The market and pantry guides now reflect these sources and avoid unsupported stall, queue and drive-time promises. The stay-and-soak guide no longer calls the Wednesday Main Street Market a farmers market.
- Point Nepean now uses Quarantine Station as the main shuttle stop. Parks Victoria's current timetable lists 10:25am and 1:30pm front-entrance pickups; the guide links the timetable for a fresh check before travel.
- The initial six edited routes passed the project build, content and house-style checks. A built-page link check found a malformed Alba fragment in One-Night; its trailing slash was removed in source before release. A further related-guide scan corrected Friday dinner advice and removed unsupported spa-package, travel-time and price promises. The Friday guide's shorter headline restores its first action to the 320-pixel first screen. The final build and public acceptance remain separate release gates.

## Primary source record

- Mornington Farmers Market: https://mainstreetmornington.com.au/about/
- Separate Mornington Racecourse Market: https://www.mornpen.vic.gov.au/Things-to-do/Events/Whats-on/MORNINGTON-RACECOURSE-MARKET-1-1
- Point Nepean shuttle, alerts and water: https://www.parks.vic.gov.au/places-to-see/parks/point-nepean-national-park/things-to-do/shuttle-service
- Quarantine Station history: https://www.parks.vic.gov.au/places-to-see/parks/point-nepean-national-park/attractions/quarantine-station
- Flinders Sourdough current bakery hours: https://www.flinderssourdough.com.au/
- Kooyong tasting at Port Phillip Estate: https://www.portphillipestate.com.au/cellar-door-tastings/
- Tedesca Osteria service: https://www.tedesca.com.au/osteria-tedesca
- Jackalope dining service, including Rare Hare: https://jackalopehotels.com/drink-dine/
- Bistro Elba Friday dinner: https://www.bistroelba.com.au/
- Red Gum BBQ hours: https://redgumbbq.com.au/red-gum-bbq-red-hill-2/
- RACV One Spa Escape weekday terms: https://www.racv.com.au/travel-experiences/resorts/cape-schanck/offers/one-spa-escape.html

## Limits and negative findings

- Most older plan articles still have an April 2026 lastVerified field. This is a legacy bulk stamp, not proof of a fresh article-wide factual review. It has not been advanced. Specific checked operator and park facts are dated and linked separately.
- Field Core Web Vitals, visitor task completion and conversion outcomes are unavailable. The newsletter preview truthfully describes its format; a current sent issue and whole-list delivery were not verified. VoiceOver/TalkBack and a real-device 200% zoom check were not completed.
- The 23-layer local review does not certify the whole plan catalogue above 99. Seasonal Easter claims and other older plan copy need separate primary-source checks. Generic article-template summaries vary in how directly they help readers choose.

## Evaluation and rollback

**Hypothesis:** Clear base decisions, accurate operator routes and appropriately sized images reduce planning friction and mobile load time while keeping the editorial voice.

**Metric and evaluation date:** Review field LCP/CLS/INP, plan-choice and venue-click paths, and reader feedback after seven days or the next content cycle, whichever is later. Recheck date-sensitive claims before advancing verification fields. Regrade only with fresh rendered and independent evidence.

**Rollback:** Commit 6487c1526947684cbef9e90df6d6d86cf0b88c14 is the prior public reference before the final interaction and related-guide pass.

**Independent review:** A separate mobile-journey reviewer measured the public release and checked narrow-screen controls. A design reviewer scored the four priority articles. A travel/editorial reviewer found and corrected the market-route errors against chamber, shire and operator sources. Passing checks and publication remain separate from observed visitor outcomes.