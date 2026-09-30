# Set 7 winery accommodation page: focused QA

**Date:** 1 October 2026\
**Owner:** Set 7 winery page implementer\
**Project:** Peninsula Insider, isolated checkout pi-stay-set7\
**Outcome:** The winery accommodation page now opens with a format decision and an actionable comparison link. Seven venue pathways remain. The exact local page rendered and passed the focused responsive, image-loading, route and copy checks below. This is a provisional self-assessment of a local page, not independent acceptance or a production release.

## Scope and decision

Only next/src/pages/stay/winery-accommodation.astro was edited for this page. The page keeps the existing VenueCard imagery and the seven original venues. It removes the local blanket Cassis pool claim, exact drive-time claim and unsupported venue ranking. Port Phillip Estate links directly to its wine route. A page-local Mantons card summary suppresses unsupported shared-record copy without editing that record.

The [Cassis operator](https://www.cassisredhill.com.au/accommodation) lists heated mineral plunge pools for The Retreat and The Cottage; the other three villas have outdoor baths. [Mantons Creek](https://mantonscreekestate.com.au/accommodation) presents vineyard accommodation in Shoreham; its current accommodation page does not give a room count. These primary sources support the corrected distinctions.

## Provisional 23-lens grade

Manual, equal-weight comparative scores. The **before** column is based on the public page's article-heavy first fold and the original source copy; the **after** column is based on this exact local preview at 320×568, 390×844 and 1365×900. Scores are design judgments, not a validated percentile or usability study.

| Lens | Before | Local after |
| --- | ---: | ---: |
| First-fold promise | 52 | 91 |
| Category scope | 68 | 94 |
| Format differentiation | 63 | 91 |
| Booking dependencies | 61 | 88 |
| Factual traceability | 50 | 89 |
| Freshness disclosure | 53 | 89 |
| Copy economy | 45 | 90 |
| Hierarchy and scanning | 50 | 92 |
| Wayfinding | 64 | 95 |
| Link integrity | 86 | 96 |
| Mobile reflow | 72 | 94 |
| 320px first visit | 50 | 91 |
| Desktop composition | 60 | 91 |
| Typography | 82 | 93 |
| Contrast | 88 | 95 |
| Tap targets | 80 | 93 |
| Keyboard and focus | 80 | 85 |
| Semantics and headings | 76 | 93 |
| State and feedback | 76 | 87 |
| Image truth | 86 | 92 |
| Media and performance | 82 | 87 |
| Motion and stability | 93 | 96 |
| Newsletter fit | 80 | 87 |
| **Equal-weight mean** | **69.43** | **91.26** |

The score remains below 99. Accessibility, real reader comprehension, media rights and public performance were not independently verified.

## Focused acceptance

- Local Astro preview /stay/winery-accommodation/ returned HTTP 200 at 320×568, 390×844 and 1365×900. Browser page errors: zero in the final pass. Body width equalled viewport width at each size, so no horizontal overflow was observed.
- With the cookie notice present, the primary **Compare seven stays** link was visible and hit-clear at 320×568 (top 496px, bottom 542px), 390×844 (522–568px) and 1365×900 (589–635px).
- The four format options link to all seven original venues. All seven chooser and card routes returned HTTP 200 locally, including the direct /wine/port-phillip-estate/ destination.
- All seven existing VenueCard photos loaded after scrolling. No new image or image-rights claim was introduced. Cassis uses a published CMS photo and the rendered shared-data signature now distinguishes two pool villas from three outdoor-bath villas.
- The rendered Mantons card reads “Vineyard accommodation with an on-estate restaurant in Shoreham.” The original shared record still needs separate correction.
- The diff whitespace check, category experience test and house-style lint passed. The local page compiled in Astro dev. Repository-wide Astro check failed with 137 existing errors across unrelated files, including missing @astrojs/vercel typing and draft-page types, so this is not a clean type-check receipt.

## Remaining risk and handoff

The shared record at next/src/content/venues/mantons-creek-estate.json lines 16–20 and 59 still contains exact two-/three-minute timing, unsupported “strongest”, “only” and “most under-indexed” claims, an unverified adults-only label, a walking suggestion, and a breakfast-through-dinner claim at Quattro. The page-local card override prevents the signature from appearing here; other surfaces still inherit that record until the shared-data owner corrects it. [Mantons restaurant](https://mantonscreekestate.com.au/restaurant) currently advertises lunch Friday to Sunday.

This QA did not run a full static build, screen-reader session, keyboard-only journey, contrast measurement, production deployment or live analytics review. A separate reviewer should inspect the final integrated build and public release before certifying a higher score.
