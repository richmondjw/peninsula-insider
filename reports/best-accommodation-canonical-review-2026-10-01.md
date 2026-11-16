# Canonical accommodation guide correction - 1 October 2026

**Project:** Peninsula Insider
**Owner:** Set 6 accommodation implementation; release owner: parent task
**Decision:** Adapt the canonical /stay/best-accommodation/ page into a decision guide. Its former price-band ranking and full venue-card list did not meet the current evidence and no-price standard.
**Status:** Source edited; integrated build, visual review and public verification remain with the release owner.

## Evidence and scope

The journal accommodation article redirects to this Stay URL, so edits to that article alone would not change the reader-facing page. The previous canonical page grouped every eligible stay by relative dollar bands, called some properties "benchmark" or "accessible", and inherited each venue card's copy. A paused, unsourced Yurt record is excluded by the shared isListableVenue predicate, but a large dynamically assembled set still implied that every other card was a current editorial recommendation.

Primary operator pages checked on 1 October 2026 distinguish [Peninsula Hot Springs Eco Lodges](https://www.peninsulahotsprings.com/accommodation/eco-lodges) as rooms in shared lodges from its [glamping tents](https://www.peninsulahotsprings.com/accommodation/glamping). [Alba's Sanctuary page](https://albathermalsprings.com.au/alba-experiences/the-sanctuary/) describes villas and rooms. [Visit Mornington Peninsula](https://www.visitmorningtonpeninsula.org/Accommodation/Self-Contained) confirms that self-contained stays span coast and hinterland; the new page does not assume any particular property is walkable or a fixed travel time from a planned stop.

## Bounded change

- Kept the existing URL, title, breadcrumb and FAQ schema shape.
- Replaced the dynamic price tiers and large recommendation grid with four format/location decisions, links to the corresponding guides, a clear /stay/ browse route, and three directly linked thermal accommodation options. Operator links sit beside the thermal descriptions.
- Gave the three thermal option cards photographs with explicit record-level rightsStatus=recorded and provenanceReview=verified: an actual Eco Lodge room from the Eco Lodges gallery, plus bathing-ground images from the Peninsula Hot Springs and Alba venue galleries. The latter two carry visible illustrative notes saying that no tent or Sanctuary room is shown; all three have visible Visit Victoria credits. These are curated editorial card photographs, separate from replaceable venue hero slots.
- Removed unsupported price, rank, inventory, age and drive-time statements from the canonical copy and FAQ answers. The thermal descriptions mention accommodation format only and ask readers to confirm current inclusions and conditions.
- Corrected two inbound teasers in the coastal and vineyard guides that previously promised price rankings.
- Removed public priceBand output from the shared VenueCard and VenueDetailTemplate, and stopped passing price bands to the live Stay hub V5 cards. Content records retain their internal fields. Unrelated Eat/Wine and V5 card internals remain a separate sitewide policy sweep.
- A published CMS hero override on the paused Yurt page is a different image from its content-record beach image. The shared detail template now displays the override's own credit if one exists, never the beach image's credit. It continues to withhold the beach image's illustrative disclosure for the override.

## Verification and release gate

The source-level checks are: canonical copy has no dollar-band or static rate labels, no active Yurt booking or recommendation, valid internal paths for the four guides and three thermal details, and explicit /stay/ browse links. The three new placements are recorded under pages/stay/best-accommodation in the Visit Victoria where-used ledger. npm run lint:visit-victoria passed (787 licensed content-image uses), npm run lint:image-rights passed (49/49 tests), npm run lint:no-pricing passed, and git diff --check passed on edited source. The release owner ran the final integrated build; the responsive checks for this page are recorded below. The Eco Lodges and paused Yurt assertions are tracked in the wider Set 6 QA. Public routes, live CMS image data, and search-index cleanup require separate verification after deployment.

**Metric:** A reader can choose a stay route without a stale dollar tier, see Eco Lodges and glamping as distinct formats, and reach the full Stay directory. **Evaluation:** on release, then by 8 October 2026. **Independent reviewer:** parent task's page QA. **Rollback:** restore the previous layout only if the new route/cards break, while retaining the no-price and paused-listing guards. No 99/100 score is claimed without independent rendered and user testing.

## Responsive preview review

The first integrated preview returned HTTP 200 at 320 and 1365 px with no horizontal overflow, price chip or Yurt mention on the canonical page or Stay hub. All seven guide/detail targets returned HTTP 200. A second preview measured the primary Browse all stays action at y472.5-516.5 on a 320x568 first screen with an unobstructed hit target; decision cards formed one phone column and a balanced two-column desktop grid. The four decision descriptions were fully visible. One thermal Glamping description still clipped at 320 px; its copy was shortened and the thermal-card description clamp was removed locally. The release owner final build:search exited 0. In its rebuilt 320x568 and 1365x768 preview, all four decision and all three thermal descriptions have scrollHeight within clientHeight, the 320 px primary action remains y472.5-516.5 and hit-clear, both widths have no horizontal overflow or price chips, and the decision grid remains one column on phone and two columns on desktop. Public deployment and reader testing remain separate gates.
