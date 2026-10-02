# Set9 Wellness Stays review, 1 October 2026

**Project:** Peninsula Insider\
**Outcome sought:** Help a visitor choose an overnight wellness stay without confusing on-site bathing, a hotel spa, or an off-site bathing package.\
**Decision:** ADAPT the Wellness guide. Preserve the Hot Springs Accommodation guide, which already serves the narrower on-site comparison.\
**Implementation owner:** Set9 Wellness agent. **Release owner:** Set9 lead. **Independent reviewer:** pending.

## Evidence, scope and decision

The prior source and the existing static Set8 artifact at port 4358 were the baseline. At 320 × 568 with first-visit consent visible, the first guide action was a day-spa diversion at y892 and the first stay card began at y1304. Six stay routes existed, the five visible FAQs matched JSON-LD, and no horizontal overflow appeared. The page’s older 7 September 2026 source note did not cover Lindenderry’s current Alba package. This is a single-reviewer diagnostic baseline, not independent usability research.

Hypothesis: a first-screen three-way choice, followed by concise booking conditions beside each stay, will get visitors to a relevant accommodation option sooner and reduce wrong-package assumptions. The bounded change touched only the Wellness guide and Lindenderry’s venue note. It retained the six existing detail routes and the old #stay-nearby anchor for Lindenderry.

The revised page offers these choices:

1. **At the springs:** Peninsula Hot Springs glamping and Eco Lodges, plus Alba’s Sanctuary in Fingal.
2. **Hotel + spa:** Jackalope in Merricks North, with treatment booking dependent on the chosen room package.
3. **Stay + bathe:** Quarters at Flinders Hotel with Peninsula Hot Springs, or Lindenderry at Red Hill with Alba. Both springs visits are in Fingal and need travel from the hotel.

The page title no longer promises a facilitated retreat. Five visible FAQ answers and their JSON-LD come from the same array. Collection and breadcrumb schemas use the current canonical path.

## Source-of-record checks

- [Peninsula Hot Springs glamping](https://www.peninsulahotsprings.com/accommodation/glamping) currently lists Garden View, Lake View and Secluded Pavilion settings, bathing with glamping packages, and package-specific conditions.
- [Peninsula Hot Springs Eco Lodges](https://www.peninsulahotsprings.com/accommodation/eco-lodges) describes individually booked rooms and room-dependent private bathing.
- Alba’s [villas](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/villas/) and [rooms](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/rooms/) support the five-villa/two-room distinction and list daily bathing, breakfast and one private-pool upgrade for each format.
- [Jackalope’s spa](https://jackalopehotels.com/spa/) distinguishes treatments from guest-only pool and hot-and-cold facilities. Its [contact page](https://jackalopehotels.com/contact/) confirms Merricks North. The venue record’s Red Hill place assignment remains for the separately owned Boutique work.
- The [Quarters at Flinders Hotel Stay and Bathe package](https://www.peninsulahotsprings.com/accommodation/stay-local/flinders-hotel-stay-and-bathe) is an off-site Peninsula Hot Springs Bath House package with availability and blackout conditions.
- [Lindenderry’s Alba package](https://lancemore.com.au/hotels/lancemore-lindenderry-red-hill/experiences/packages/alba-package/) pairs a Red Hill stay with Alba bathing. The venue note now describes this optional package without implying every room booking includes it.

The hero photograph depicts Alba’s bathing estate, and its caption explicitly says it does not show a Sanctuary room. The three section photographs are rights-recorded Visit Victoria images in the venue records: an Eco Lodge room, Jackalope’s vineyard setting, and Lindenderry’s building. Captions state the subject and the limits of what the image represents. The guide does not use the older illustrative venue-card heroes.

## Scoped preview checks

Checked the running Set9 Astro preview at http://localhost:4362/stay/wellness-retreats/ on 1 October 2026. This is a development preview, not the final static artifact or a live-site receipt.

- With the first-visit consent notice present, all three choice links occupy y390–498 at 320 × 568, y419–527 at 390 × 844, and y540–648 at 1365 × 768. The baseline first action was y892 at 320. Mobile secondary labels compute to 12px, and the choices have 70px clearance above the 320px fold and 120px clearance on the 1365px first screen.
- At 320, 390 and 1365 pixels, document width equalled viewport width.
- All three choice anchors landed with the target section top at y104, below the sticky header bottom at y68.
- A keyboard move to the second choice produced a visible 3px focus outline.
- All six retained stay detail routes returned HTTP 200 in the local preview.
- Four page images loaded after scrolling to them.
- Five visible FAQ questions and answers exactly matched the five structured FAQ questions and answers.
- Stable preview passes recorded no page errors. One transient Vite dynamic-import error appeared during active shared dev updates and did not recur.

A full build, media performance audit, assistive-technology pass and independent design review remain release gates. Operator package terms and availability can change; recheck them before publication.

## Twenty-three-lens diagnostic

These are **single-reviewer provisional ranges**, not an accessibility certificate or a claim of 99/100. Baseline incorporates the earlier Set8 scout and the newly verified Lindenderry contradiction. Revised ranges reflect the scoped preview only.

| Lens | Baseline | Revised provisional |
|---|---:|---:|
| First-screen promise | 45–60 | 89–95 |
| Category scope | 65–78 | 88–94 |
| Format distinction | 80–90 | 92–96 |
| Booking dependencies | 67–80 | 91–95 |
| Factual traceability | 60–73 | 88–94 |
| Freshness disclosure | 72–83 | 87–92 |
| Copy economy | 67–78 | 84–90 |
| Hierarchy and scanning | 57–70 | 88–94 |
| Wayfinding | 50–64 | 90–95 |
| Link integrity | 80–90 | 91–96 |
| Mobile reflow | 70–82 | 89–94 |
| 320px first visit | 35–50 | 88–93 |
| Desktop composition | 55–68 | 89–94 |
| Typography | 75–85 | 88–93 |
| Contrast | 80–90 | 85–91 |
| Tap targets | 65–80 | 88–93 |
| Keyboard and focus | 65–80 | 86–92 |
| Semantics and headings | 75–88 | 88–93 |
| State and feedback | 65–80 | 75–85 |
| Image truth | 48–65 | 87–94 |
| Media and performance | 65–80 | 77–88 |
| Motion and stability | 80–90 | 88–94 |
| Newsletter fit | 75–85 | 77–87 |
| **Unweighted diagnostic mean** | **65–78** | **87–93** |

## Evaluation and next action

**Evaluation date:** final exact Set9 static build and independent review before release. Check 320 × 568 first visit, 390 and desktop, image requests, focus, anchors, all stay and operator paths, FAQ/schema parity, and any Jackalope location change merged from the Boutique owner. The measured first-screen and truth gains support **ADAPT**; 99/100 remains unproven and must not be self-certified.

**Rollback:** restore the Wellness guide and Lindenderry note from the Set9 base if exact-build or fact review exposes a material regression. Do not revert separately owned Boutique or Stay-hub work.
