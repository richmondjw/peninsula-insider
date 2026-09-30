# Stay Set8A: Cottages and B&Bs review
Date: 1 October 2026
Status: source frozen; integrated pre-refinement static artifact inspected; final exact rebuild pending

## Outcome and decision

The guide now opens with a cottage-versus-B&B choice and explains the difference between self-contained accommodation and hosted rooms or suites. Seven operator-linked records form the recommendation set: five cottage properties and two B&Bs. Historical Orchard, Driftaway and Hideaways entries are held out because the current records lack a usable operator booking path; this is an evidence limit, not a closure finding. Mantons Creek Estate remains a vineyard guest suite in the dedicated winery accommodation guide.

The guide uses two existing Peninsula Insider images only as area context for Red Hill and Rye. Their visible caption says they do not depict the accommodation. Property cards are deliberately text-led until licensed, property-specific images can be verified. The venue detail template separately discloses illustrative heroes; CMS overrides and individual image rights still need their own review.

Decision: **adapt and continue**. The source makes the page markedly more useful and truthful, but the measured review is below the user's 99/100 goal. A final exact build, independent review and public release check remain separate gates.

## Source-of-record corrections

| Property | Current operator evidence | Action |
| --- | --- | --- |
| Birch Creek | [Operator cottage page](https://www.birchcreek.com.au/packages); host-authored [Mavis](https://www.riparide.com/listings/2104-the-frances-farm-cottage) and [June](https://www.riparide.com/listings/1569-the-june-at-birch-creek) listings | Corrected a serious dog-policy error. Both listings state strict **no pets** because of the goat stud. Removed dog-friendly tags and recommendations. |
| Blue Moon Cottages | [Operator FAQ](https://www.bluemooncottages.com.au/faq/) and [Sandpiper page](https://www.bluemooncottages.com.au/property/?property_id=15) | All cottages accept pets and have secure outdoor areas. Sandpiper has a log fire and compact courtyard, with small dogs recommended for that unit. Removed unsupported repeat-visitor and comparative claims. |
| Mornington Peninsula Beach Club | [Operator inventory](https://mpcottages.com/) and [Unit 1/2](https://mpcottages.com/accommodation/mp-beach-club-unit-1-2/), [Unit 3/4](https://mpcottages.com/accommodation/mp-beach-club-unit-3-4/), [Unit 5](https://mpcottages.com/accommodation/mp-beach-club-unit-5/) | Five units include studio, one- and two-bedroom formats, rather than five two-bedroom cottages. Communal EV charging; access features are published specifically for Unit 1; the studio bathroom is in a separate building inside its courtyard. |
| Plantation House | [Operator rooms and breakfast](https://plantationhouse.com.au/accommodation/) | Corrected venue type to suite. Operator lists five named rooms and suites, with cooked breakfast included; cooking facilities vary. Removed changing third-party ratings and unsupported family/value claims. |
| Arthurs Views | [Operator FAQ](https://arthursviews.com.au/contact-us/faq/) and [suite descriptions](https://arthursviews.com.au/suite-decriptions/) | Corrected venue type to suite. Five couples-only suites, breakfast provisions optional, spa and kitchenette details vary; no pets or children. |
| Treetops at Red Hill | [Operator cottages](https://treetopsatredhill.com.au/) | Two distinct vineyard cottages. Breakfast provisions are described for Peppercorn; removed unsupported rankings, travel times and affordability claims. |
| Brewer's Cottage | [Brewery cottage page](https://www.redhillbrewery.com.au/brewers-cottage/) | Whole three-bedroom house on operating brewery grounds; public opening days and weekday on-site work alter privacy. Removed unsupported comparisons and value claims. |

Operator sites contain a booking or enquiry handoff for all seven selected records. Automated checks established source-page availability, not a completed reservation or payment path. No price appears in page copy.

## Rendered review and measurements

The parent ran an exact integrated search build successfully and served that artifact at the local static preview. I inspected its generated Cottages page at **320×568, 390×568 and 1365×768**, including a fresh visit with the privacy notice visible. This artifact contained all structural and content changes but preceded a final small CSS refinement to card links and compact text. The final rebuild is therefore still required to certify those fixes.

- At 320px, the H1 occupied y=320–487 and the primary “Choose your stay” CTA y=507–555, fully within the first 568px screen with 13px remaining. At 390px the H1 was y=334–487 and the CTA again y=507–555. The desktop CTA occupied y=621–669.
- The choice anchor landed at y=144 on the 320px viewport, with its heading at y=218. It was readable and unobscured. Both format choices lead to their intended groups.
- At all three widths, document scroll width equalled viewport width. No page JavaScript errors appeared. Both responsive WebP area images loaded; the generated 480px variants were about 25KB and 15KB. The area-image disclosure remained visible on mobile.
- All seven recommendation detail links returned HTTP 200. Operator actions resolved to the corresponding official sites. The three visible FAQs matched the three FAQ schema entries.
- The existing save action changed from aria-pressed=false to true and visibly changed to “Saved”. Accepting the privacy notice hid the banner.
- Keyboard focus on a card operator link had a computed 3px solid #10527E outline with 3px offset. Measured text contrast ratios: ink on cream 14.42:1, accent on cream 7.24:1, soft on cream 6.38:1, accent on card 8.09:1, soft on card 7.13:1.
- The **measured defect** was card “Read our notes” and “Check with operator” link height of 24px at all inspected widths. The shared save/share buttons measured 44px. The source now sets card links to a minimum 44px and raises compact labels to at least 12px, but the inspected artifact predates that CSS change. Recheck the exact final artifact before closing this item.

## 23-lens grade

This is a **single-reviewer diagnostic of the inspected static artifact**, not an independent panel score or a 99/100 certification. Equal weighting across the same 23 lenses yields **2085/23 = 90.65/100**. The scout baseline was an estimated **47–63/100**. The 24px card links are scored as observed, although their source fix is frozen for the final build.

| Lens | Score / 100 | Measured finding or limit |
| --- | ---: | --- |
| 1. First-screen promise | 92 | Format question and primary action both visible at 320×568 with first-visit notice. |
| 2. Category scope | 91 | Seven relevant records; unsupported historical entries held out without implying closure. |
| 3. Format distinction | 95 | Cottage versus hosted room/suite differences stated before recommendations. |
| 4. Booking dependencies | 86 | Unit-level pet, access and inclusion cautions clear; booking completion untested. |
| 5. Factual traceability | 94 | Seven records checked against operator or host-authored sources above. |
| 6. Freshness disclosure | 91 | Review provenance and date present; operator facts can still change. |
| 7. Copy economy | 90 | Short lead and bounded card copy; listing depth still adds scroll. |
| 8. Hierarchy and scanning | 92 | H1, choice, groups, cards and FAQ scan coherently at all tested widths. |
| 9. Wayfinding | 90 | Choice anchors land correctly; cross-link to winery stays retained. |
| 10. Link integrity | 90 | Seven detail links returned 200; operator handoff sites resolved. |
| 11. Mobile reflow | 92 | No horizontal overflow at 320px or 390px; cards use one column. |
| 12. 320px first visit | 90 | CTA ends at y=555 on 568px screen, leaving limited but real margin. |
| 13. Desktop composition | 87 | Paired text and area imagery works; cards lack verified property photographs. |
| 14. Typography | 88 | Readable hierarchy; compact labels needed a source size increase pending rebuild. |
| 15. Contrast | 96 | Tested text combinations range from 6.38:1 to 14.42:1. |
| 16. Tap targets | 78 | Card links measured 24px high; 44px source fix awaits exact rebuilt check. |
| 17. Keyboard and focus | 91 | Visible 3px offset focus on card link; sampled, not a full assistive-tech audit. |
| 18. Semantics and headings | 93 | One H1, ordered section structure, visible FAQ and matching structured entries. |
| 19. State and feedback | 90 | Save state and privacy dismissal visibly responded in static interaction check. |
| 20. Image truth | 92 | Area photos explicitly captioned; no card image implies a specific property. |
| 21. Media and performance | 93 | Two local responsive WebP images loaded; 480px variants total about 40KB. |
| 22. Motion and stability | 94 | No scripted hero motion or overflow observed; reduced-motion CSS present. |
| 23. Newsletter fit | 90 | Existing opt-in block follows the guide without interrupting the choice flow. |

## Freeze and release gates

- **Source frozen:** Cottages page and seven venue JSON corrections. The final CSS adjustment to card links and compact labels is included in source, but absent from the artifact scored above. No further page or record edits are planned before the parent's exact integrated rebuild.
- Seven edited JSON records parsed. The Cottages Astro source compiled before the small final CSS change; scoped Git whitespace check passed. No prohibited em dash, price, obsolete repeat-visitor or Villa Mallorca claim was found in revised page copy and records.
- Exact integrated build passed on the pre-refinement source. Parent will rebase Set8 onto the Winery hotfix and run a new exact build, then recheck the 44px links, 320px first screen, image load and link integrity on that artifact.
- The Birch Creek correction changes a broadly used venue record. Search-driven and dog-friendly site surfaces need integrated build and final public verification; no-pets is based on both host-authored listings.
- Licensed property imagery and independent grading remain the largest material gaps to a defensible 99/100 claim. The shared Impeccable engine path in workspace instructions was unavailable on this Windows/WSL host, so the review used direct static rendering, interaction measurements and operator evidence.
