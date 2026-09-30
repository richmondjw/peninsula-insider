# Peninsula Insider plan-page review — 1 October 2026

**Outcome:** The One-Night Escape and three related guides now make trip choices clearer, use smaller mobile photographs and give more accurate operator and park advice. A scan of similar pages found two market guides that directed readers to the wrong market; their routes have been corrected. The 99/100 target is not yet evidenced.

**Decision:** Adapt and release the bounded improvements. Keep the remaining catalogue's factual review as a separate work item.

**Owner:** James Richmond for editorial and brand direction; Codex for implementation and release verification.

**Project:** Peninsula Insider.

## Scope and review method

The priority cohort is The One-Night Escape, The Couples' Weekend, The Thermal Springs Weekend and The Point Nepean Half-Day. A reviewer scored 23 equally weighted design, usability, editorial, trust and technical criteria per page: 2,300 possible points per page, 9,200 for the cohort. These are expert judgments, not visitor outcomes or a percentile.

| Page | Final scored local build | Proportion |
|---|---:|---:|
| One-Night Escape | 2,261 / 2,300 | 98.30% |
| Couples' Weekend | 2,255 / 2,300 | 98.04% |
| Thermal Springs Weekend | 2,260 / 2,300 | 98.26% |
| Point Nepean Half-Day | 2,262 / 2,300 | 98.35% |
| **Cohort** | **9,038 / 9,200** | **98.24%** |

This independent regrade covers the final local build, which still contains the Alba fragment typo. Its source was fixed after the build. Once the public rebuild and anchor check confirm that one-character fix, removing the two-point link deduction would yield 9,040 / 9,200 (98.26%). The preceding local cohort review was 9,032 / 9,200 (98.17%); an earlier pass was 97.99%. The scorecard totals are retained, but per-criterion marks for 21 of the 23 dimensions were not retained; decimal places should not be treated as statistical precision. Exceeding 99% after the link fix would require 69 more justified points.

## Changes and evidence

- One-Night presents three immediate base choices with stay, dinner and Sunday decisions. Its linked venue routes and full guide remain available. Couples, Thermal Springs and Point Nepean have tighter planning copy and more accurate practical advice.
- Four plan-article hero images use responsive derivatives of their licensed source photographs. On the public 390-pixel, DPR 2, 150 ms RTT, 200 KiB/s, four-times CPU lab profile, three runs per page gave median LCP of 2.05s for Point Nepean (previously 4.88s) and 2.00s for Couples (previously 3.92s). One-Night measured 2.07s (previously 1.98s, within run variation). CLS was below 0.001. These are controlled lab results, not field Core Web Vitals.
- Point Nepean selected an 800-pixel hero of 68,552 encoded bytes instead of the 366,648-byte original; Couples selected 55,080 instead of 234,206 bytes. One-Night selected 26,470 instead of 57,600 bytes. Image rights, alt text and credits remain recorded.
- A full build scan found 31 plan detail routes. Every route had a heading and a path to current editorial picks; all 24 article-template hero images had alt text and responsive variants. One-Night had no horizontal overflow at 320 or 390 CSS pixels. Its menu, keyboard controls and Choose your base anchor worked at 320 pixels.
- The newsletter block describes its format and links to current Peninsula picks. It no longer presents an old article as a recently sent issue. The floating Join control hides when the inline form enters view, in the footer and while overlays are open.
- The wider editorial scan found an overlapping market schedule and a false Mornington Farmers Market location in two guides. Main Street Mornington lists the farmers market at Mornington Park on the second Saturday; Mornington Peninsula Shire lists the separate Racecourse Market on the second Sunday. The market and pantry guides now reflect these sources and avoid unsupported stall, queue and drive-time promises.
- Point Nepean now uses Quarantine Station as the main shuttle stop. Parks Victoria's current timetable lists 10:25am and 1:30pm front-entrance pickups; the guide links the timetable for a fresh check before travel.
- The six edited routes passed the project build, content and house-style checks. A built-page link check found a malformed Alba fragment in One-Night; its trailing slash was removed in source before release.

## Limits and negative findings

- Most older plan articles still have an April 2026 lastVerified field. This is a legacy bulk stamp, not proof of a fresh article-wide factual review. It has not been advanced. Specific checked operator and park facts are dated and linked separately.
- Field Core Web Vitals, visitor task completion and conversion outcomes are unavailable. The newsletter preview truthfully describes its format; a current sent issue and whole-list delivery were not verified. VoiceOver/TalkBack and a real-device 200% zoom check were not completed.
- The 23-layer local review does not certify the whole plan catalogue above 99. Seasonal Easter claims and other older plan copy need separate primary-source checks. Generic article-template summaries vary in how directly they help readers choose.

## Evaluation and rollback

**Hypothesis:** Clear base decisions, accurate operator routes and appropriately sized images reduce planning friction and mobile load time while keeping the editorial voice.

**Metric and evaluation date:** Review field LCP/CLS/INP, plan-choice and venue-click paths, and reader feedback after seven days or the next content cycle, whichever is later. Recheck date-sensitive claims before advancing verification fields. Regrade only with fresh rendered and independent evidence.

**Rollback:** Commit cd066a7044afb3337c67c5ae73c7a37f4fa46bb4 is the prior public reference for the final copy pass. The preceding public commit for responsive images and newsletter was ddd58584de60f928f1a7c9cb212809efd16806a8.

**Independent review:** A separate mobile-journey reviewer measured the public release and checked narrow-screen controls. A design reviewer scored the four priority articles. A travel/editorial reviewer found and corrected the market-route errors against chamber, shire and operator sources. Passing checks and publication remain separate from observed visitor outcomes.