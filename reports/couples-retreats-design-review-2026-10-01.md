# Couples retreats guide: decision-first review

**Project:** Peninsula Insider\
**Owner:** Peninsula Insider editorial and site team\
**Decision:** Adapt the guide; hold publication for integrated and independent review.\
**Review date:** 1 October 2026\
**Scope:** /stay/couples-retreats/ in the isolated Set 7 checkout.

## Baseline, hypothesis and grade

The earlier local artifact opened with five paragraphs of venue claims, including private plunge pools supposedly attached to every Alba villa and private bathing supposedly included with Peninsula Hot Springs glamping. At 320 × 568, the first venue grid began at **y2450** and the first venue-card action was around **y2936**. The guide offered no first-screen action. These are local artifact measurements with the in-flow privacy notice present.

The hypothesis was that choosing a setting first, then checking the exact room and package, would let a couple move sooner while preventing the false private-bathing assumption. The bounded change replaces the introduction, list and duplicated FAQ with a setting chooser, ten unranked stay links, booking checks and operator sources. At 320 × 568, the revised main action is at **y422–466** and hit-clear; the first setting card starts at **y754**. The first individual stay row still starts at **y1900**, an improvement on the old venue grid but not a first-screen property choice.

The scorecard below is a **single-author provisional expert judgment**, not an independent audit or field visitor outcome. Scores are equal-weight, 100 per lens. Baseline **1,442/2,300 (62.70/100)**; revised local preview **2,109/2,300 (91.70/100)**. It does **not** substantiate the requested 99/100.

| Lens | Baseline | Revised preview |
| --- | ---: | ---: |
| First-fold promise | 52 | 93 |
| Category scope | 75 | 92 |
| Format differentiation | 56 | 94 |
| Booking dependencies | 44 | 92 |
| Factual traceability | 38 | 91 |
| Freshness disclosure | 34 | 87 |
| Copy economy | 35 | 93 |
| Hierarchy and scanning | 45 | 93 |
| Wayfinding | 55 | 94 |
| Link integrity | 84 | 94 |
| Mobile reflow | 72 | 94 |
| 320px first visit | 42 | 93 |
| Desktop composition | 68 | 94 |
| Typography | 76 | 93 |
| Contrast | 88 | 94 |
| Tap targets | 67 | 93 |
| Keyboard and focus | 74 | 90 |
| Semantics and headings | 78 | 93 |
| State and feedback | 80 | 88 |
| Image truth | 44 | 94 |
| Media and performance | 67 | 87 |
| Motion and stability | 88 | 93 |
| Newsletter fit | 80 | 80 |
| **Equal-weight average** | **62.70** | **91.70** |

## What changed

- A short hero leads with the weekend decision and places a 44 px “Find your setting” action above the mobile fold. Four compact setting cards follow the hero copy before the image on phones.
- The list is grouped by vineyard, thermal, coast and smaller stays. Ten currently listable stay links remain, with a route to all stays and the date-night, hot-springs and vineyard guides. The structured ItemList is explicitly unordered.
- The thermal section separates Alba’s villas and rooms from Peninsula Hot Springs tents. It directs visitors to current operator pages and asks them to check room format, bathing package and separately reserved treatments.
- The former blanket Alba private-plunge-pool claim, blanket glamping private-bathing claim, unsupported Cassis private-pool count and subjective “best” rankings were removed from the guide and both FAQ representations.
- Three licensed photographs have visible, truthful captions. The hero shows guests at the actual Jackalope vineyard; the Alba estate and Sorrento Back Beach pictures are labelled as setting context, not accommodation rooms or hotel views. The placement ledger now includes each use.
- The direct Stay hub teaser now describes vineyard, thermal and Sorrento settings instead of implying outdoor baths. The hardcoded sitemap lastmod for this guide now matches the 1 October review.

## Source and image evidence

- [Alba Sanctuary](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/) and [Alba villas](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/villas/): five standalone villas and two rooms are separate formats. Villas differ; villas 1–3 have a stone bath. The operator lists springs entry each day and **one upgrade** to a private pool, not a plunge pool attached to every unit.
- [Peninsula Hot Springs glamping](https://www.peninsulahotsprings.com/accommodation/glamping): tented accommodation and multiple packages; geothermal bathing is listed across packages. [The Block glamping offer](https://www.peninsulahotsprings.com/accommodation/glamping/the-block-glamping-and-bathe) lists private bathing as an optional extra and says that specific offer runs only until 12 November. The page treats it as a dated example, never an evergreen inclusion.
- The Visit Victoria catalogue records asset **vv-26070114** as actual Jackalope photography by Peter Foster, **vv-163821** as the Alba estate and **vv-151508** as Sorrento Back Beach photography by SHERPA Projects Pty Ltd. Each is already licensed for site use; three new pages/stay/couples-retreats placement rows were appended without changing prior rows.

## Local verification and limits

The isolated Astro development preview returned HTTP 200 at 320 × 568, 390 × 844 and 1365 × 900 with no browser page errors or horizontal overflow. The 320 px primary action remained hit-clear with the privacy notice present and its jump placed the setting section at y112 below the sticky navigation. The first setting cards appeared at y754, y728 and y1062 at those widths respectively. The first stay row appeared at y1900, y1921 and y1613.

All **16 unique internal links** in the main guide returned HTTP 200 locally. All three photographs loaded after lazy images were scrolled into view, and each displayed its relevant credit/context caption. Visible FAQ questions matched FAQ structured data. The primary action showed a 2 px solid keyboard-focus outline. No double-dollar price-band token or blanket private-pool statement appeared in rendered page text. Focused pricing, house-style, Visit Victoria and media-rights checks passed; the Visit Victoria gate reported 787 licensed uses and 895 catalogued works.

This was a local development-preview review, not the exact integrated release build. An independent visual reviewer, assistive-technology session, field Core Web Vitals, visitor task data and public deployment receipt are still outstanding. The linked nonthermal venue records and their booking details were not freshly verified in this bounded pass; those links are discovery paths, not current room inventory. The named Impeccable engine was unavailable at the documented host path, so no automated Impeccable result is claimed.

## Evaluation and rollback

After publication, review setting-card and stay-note clicks, booking-path corrections, 320 px first-visit comprehension and mobile field performance by **8 October 2026**. Recheck the time-limited The Block reference before **12 November 2026** and remove it if the offer has expired. If factual or navigation regressions appear, revert the scoped guide and its three placement rows. Independent QA should grade the exact integrated artifact before any 99/100 claim.
