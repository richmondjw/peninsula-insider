# Cassis Red Hill detail: choose the right villa

**Project:** Peninsula Insider\
**Owner:** Peninsula Insider editorial and site team\
**Decision:** Adapt the Cassis detail in Set 7; hold release for the coordinated build, independent review and a real-browser booking check.\
**Review date:** 1 October 2026\
**Scope:** `/stay/cassis/`, its venue record and the two Cassis-only template conditions.

## Baseline, hypothesis and provisional grade

The public detail captured at 320 and 1365 px on 1 October said all five villas had private heated mineral plunge pools, then advised booking the Lodge for a large pool. Cassis's own accommodation pages instead list pools for the Retreat and Cottage, and outdoor baths for the Lodge, Terrace and Studio. The public mobile primary action began about 748 px from the top of a 700 px first-visit viewport, below the screen. Its booking button led to the operator homepage. The visible CMS hero was a real Cassis pool photograph, but the default centre crop showed mostly lawn before the subject and pool. The generic At a Glance panel offered “Check current hours” for an accommodation listing without public operating hours.

**Hypothesis:** A precise pool-versus-bath lead, a direct operator-endorsed booking destination, a phone fallback, fewer duplicate signals and a better photo crop will make the first decision quicker and reduce wrong-villa expectations. The revised local preview, not production, is the evaluation surface.

This is a **single-author, provisional** 23-lens assessment, not a visitor outcome or independent certification. Public baseline: **1,445/2,300 (62.83%)**. Final static build after the compact-phone spacing change: **1,912/2,300 (83.13%)**, still a provisional author grade. The requested 99% is not reached. The image-rights gap and unconfirmed booking-engine interaction cap the grade.

| Lens (100 each) | Public baseline | Local author review |
| --- | ---: | ---: |
| First-screen promise | 58 | 90 |
| Villa differentiation | 20 | 96 |
| Booking pathway | 58 | 75 |
| Fact traceability | 40 | 92 |
| Freshness disclosure | 48 | 64 |
| Copy economy | 50 | 89 |
| Hierarchy and scanning | 64 | 82 |
| Wayfinding | 80 | 80 |
| Link integrity | 58 | 75 |
| Mobile first visit | 51 | 93 |
| Mobile reflow | 86 | 92 |
| Desktop composition | 78 | 88 |
| Typography | 88 | 89 |
| Contrast | 90 | 90 |
| Tap targets | 85 | 94 |
| Keyboard and focus | 76 | 78 |
| Semantics and headings | 78 | 82 |
| Structured data | 38 | 91 |
| Image truth | 52 | 88 |
| Media rights | 35 | 35 |
| Performance | 75 | 75 |
| Motion and stability | 82 | 86 |
| Contact fallback | 55 | 88 |

The baseline and preview use the same rubric, but these numbers are judgement calls. Keyboard, assistive technology, field performance and booking completion were not independently tested.

## Source and claim decisions

- [Cassis accommodation](https://www.cassisredhill.com.au/accommodation) lists five villas and distinguishes a heated mineral plunge pool from an outdoor bath. The [Retreat](https://www.cassisredhill.com.au/the-retreat) and [Cottage](https://www.cassisredhill.com.au/the-cottage) have mineral plunge pools; the [Lodge](https://www.cassisredhill.com.au/the-lodge), [Terrace](https://www.cassisredhill.com.au/the-terrace) and [Studio](https://www.cassisredhill.com.au/the-studio) list outdoor baths. Individual villa conditions state no children. The operator pages describe a continental breakfast hamper on the first day, not an unlimited daily inclusion.
- [Cassis About](https://www.cassisredhill.com.au/about) describes a former restaurant and residence with French-inspired interiors. It does not support the old “converted French farmhouse” description. The villa pages support neighbouring vineyard views; I removed the broader Western Port Bay promise.
- [Cassis accommodation](https://www.cassisredhill.com.au/accommodation) and [Book Now](https://www.cassisredhill.com.au/book-now) both link to the same [Book Direct Online Cassis route](https://book-directonline.com/cassis-redhill/properties/cassisredhilldirect). That operator-selected route is now the booking URL. Both it and the official pages returned HTTP 200. The operator footer supplies **164 Arthurs Seat Road, Red Hill VIC 3937** and **+61 3 5927 5027**; those details now appear in the record.
- The previous sale-status warning, Cassis-labelled Foxeys wine claim and Lindenderry hat/dining recommendation were removed because this scoped current-source pass did not substantiate them. No price or fixed travel-time claim was introduced. The venue-wide `lastVerified` remains 7 May 2026 because this check did not reverify every field.

## Bounded changes

- The first sentence now says two villas have mineral plunge pools and three have outdoor baths. The editor note and the “If only one thing” action name each villa's feature. The same distinction appears in LodgingBusiness JSON-LD `description`.
- The redundant Known For rail was removed from Cassis. A later 320×568 first-visit check found that the primary action extended past the fold. A Cassis-only mobile spacing rule was then trialled against the static artifact; it brings the full booking button into view without reducing the promise copy or tap-target size. The operator-published telephone number remains a second way to enquire.
- The existing CMS hero filed under Cassis remains in place. A Cassis-only `object-position: center bottom` rule keeps the guest and plunge pool in frame at 320 and 1365 px. The source fallback remains a labelled illustrative Red Hill vineyard photo if the CMS override is unavailable. No third-party image was added.
- Cassis alone no longer shows the misleading “Live status / Check current hours” row. Its At a Glance website link still reaches the operator.

## Local verification and limits

The earlier local Astro preview at `http://localhost:4341/stay/cassis/` returned 200 at 320, 390 and 1365 px before its dynamic routes later stopped resolving. Its 320 px button began at y539 and ended at y591 with the first-visit privacy notice present. That was visible in a 700 px test viewport, but **below a 320×568 first fold**; the earlier above-fold conclusion was incorrect. On the exact static Cassis route at `http://localhost:4357/stay/cassis/`, a fresh 320×568 capture confirmed the privacy notice at y103–210 and the primary action at y539–591. A browser-injected trial of the new Cassis-only spacing rules moved the unchanged 52 px button to y491–543, fully within the 568 px viewport with 25 px clear below it. The final `build:search` completed exit 0. Its served static page returned HTTP 200 and reproduced the trial geometry: the first-visit privacy notice at y103–210, the primary action at y491–543, and 25 px of clear viewport below the full 52 px button at 320×568. Document and body horizontal overflow were both 0 px. The phone action follows below the fold. Earlier checks found no horizontal overflow or page JavaScript error at 320, 390 and 1365 px. Rendered checks confirmed the correct booking and `tel:` URLs, the corrected JSON-LD description and phone, no old pool/Western Port/farmhouse language, no false current-hours label, and no illustrative fallback image in LodgingBusiness image data. The crop computed as `50% 100%` on the actual CMS hero at phone and desktop widths.

`validate:content`, `lint:house-style`, `lint:no-pricing` and all 49 `lint:image-rights` unit tests passed. Impeccable source detection reported two existing side-accent style findings in the shared venue template, outside this Cassis change; it found no new Cassis content issue. The final static Set 7 build succeeded. Independent design and accessibility review and live production acceptance remain with the release owner.

**Booking uncertainty:** The Book Direct Online route serves an HTTP 200 shell, but in automated Chrome its `settings` GraphQL call returned 403 and the Availability area remained blank. The same occurred on the engine's canonical alias. This may be bot protection; it does not prove the flow fails for a normal visitor. A human, non-automated browser should confirm that date selection and villa availability actually render before release. If that fails, use the working operator accommodation/contact page as the safe visitor destination until the operator repairs its engine, and label that action accordingly.

**Media uncertainty:** The CMS hero is filed under Cassis and shows a guest in an outdoor pool, but its exact villa, licence and photographer could not be confirmed from the local media ledger. The override supplies no visible credit on this page. The source fallback is marked illustrative in the content record and is not the image currently shown. Record CMS provenance and a descriptive alt at the upload source before treating the media-rights lens as resolved. The photograph's exact villa is not confirmed; visible copy therefore states the villa differences without naming the pictured villa.

## Evaluation and rollback

Have an independent reviewer check the final built page at 320 and 1365 px, keyboard and screen-reader navigation, the real-browser booking flow and image provenance before release. By **8 October 2026**, inspect outbound booking and phone clicks, corrections, mobile field performance and whether a reader can correctly identify which two villas have pools. Revert the Cassis JSON and the two Cassis-only template conditions to the Set 6 baseline if a factual or interaction regression appears. Do not describe this page as 99% complete without that independent and live evidence.
