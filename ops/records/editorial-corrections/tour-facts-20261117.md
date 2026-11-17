# Tour factual corrections: 17 November 2026

Scope: researched service-copy corrections, not first-hand reviews or whole-page recertification. Existing lastVerified dates are deliberately unchanged because unrelated legacy assertions/images have not been fully reverified. No CMS override writes, image files, security, or publication controls changed.

## Claim ledger

| Record | Finding | Official evidence checked 17 November 2026 | Correction / limitation |
|---|---|---|---|
| Rick wine tour | PI promises free cancellation within 24 hours. Official FAQ has deposit restrictions, last-minute no-refund terms and overlapping earlier refund provisions. | https://rickswinetours.com.au/faq/ cancellation section | Withdraw free cancellation promise; require written applicable terms; do not resolve internally conflicting operator conditions by guessing. |
| Rick wine tour | PI advertises 20–40% competitor savings and a stale starting fare, without matching evidence. | Same FAQ gives tiered prices but no comparative study. | Remove comparison and unverified priceLow; current quote remains operator-managed. |
| Rick capacity | FAQ explicitly lists 8–24 standard, 5–7 small and 2–4 intimate groups. | Same FAQ pricing section | Retain 24 for this product; larger fleet capacity does not prove this product seats 53. |
| Amour wine tour | PI says lunch is guest expense. | https://www.amourofthegrape.com.au/tours/wine-tours-mornington-peninsula/ inclusions/public tour sections | Included multi-course tapas lunch and a glass of wine; private itineraries may differ; tasting fees may be additional. |
| Amour wine tour | Seven ordinary / eleven Saturdays, private only by request. | Same official page and https://www.amourofthegrape.com.au/ | Qualify ordinary/Saturday capacity, use maximum11 in structured field, retain specific current booking URL (official nav confirms it). |
| Plunge | PI claims eight guests and a currently available hot-springs combination. | https://www.mpplunge.com.au/contact seats seven; https://www.mpplunge.com.au/ current product menu; https://www.mpplunge.com.au/mornington-peninsula-wine-tours-wine-lovers is a wine/lunch itinerary, not evidence for hot springs. | Separate blocked correction: needs a real hold state across cards, schema and page. Absence from menu is not proof of discontinuation. |
| Two tour packages | Recommend unverified Plunge combination as component. | PI componentTourSlugs reference the affected record. | Pending separate Plunge fix; not changed by this release. Unrelated package prose is not recertified. |

## Verification and release limits

Two focused regression tests cover cancellation/comparison and Amour inclusions/capacity/private qualification. Plunge/package corrections are not included in this release: independent review found that copy-only holding treatment still advertises the unverified product via duration, cards and schema. Those require a proper correction-only rendering state before release. Included in build chain. Full build, independent review, CMS override reconciliation, exact remote-head CI and live output verification are required before release. Do not call these pages wholly verified from this bounded correction.

## Editorial review status (rubric v1.0)

C1–C10: UNASSESSED for full assets; bounded correction is not a complete editorial rewrite or craft-score certification. G1: verified for ledger corrections only, unknown for untouched legacy claims. G2/G3: unchanged, not recertified. G4: no new welfare/access claims. G5: pending rendered/CI/CMS/live checks. G6: routine factual correction covered by standing PI authority, subject to independent review and gates.
