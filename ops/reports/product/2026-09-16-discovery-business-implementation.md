# Priorities 3–5 implementation: 16 September 2026

## Scope and outcome

Implements the approved audit recommendations 8–15 in a separate worktree. Existing useful URLs are retained. The changes clarify search intent and editorial products, fix event discovery disagreement, simplify homepage entry choices and give operators a clear free route before optional commercial activity.

| Item | Delivered | Completion condition |
|---|---|---|
| 8 Search jobs | Separate hub, shortlist, regional explanation and practical planning titles, introductions and descriptions; related Eat/Stay/Explore/calendar intent map | Implemented; no ranking improvement claimed |
| 9 Render parity | One FAQ source for visible copy and schema on eight hub/ranked pages; shared event recurrence; accurate Sat–Sun homepage picks; coherent calendar filter/history/failure states; explicit weekend feed occurrences | Local browser and schema checks pass |
| 10 Indexing | 625 unique sitemap URLs, self-canonical/indexability validation, /picks/ included, relevant lastmod dates reflect actual edits | Production verification and Search Console inspection follow deployment; manual recrawl requires Search Console UI |
| 11 Business route | Footer entry, free correction, claim, listing-information improvement and optional partnership routes; unlisted-business intake explained using existing form | No login/payment requirement for correction or public update; no live form submissions performed |
| 12 Commercial claims | Unsupported audience behaviour, demographics, growth, effectiveness and indexing promises removed or qualified | Current HTML materials reviewed; externally distributed historical PDFs not verified |
| 13 Home decisions | This weekend / Plan a trip / Search the Peninsula; interest categories retained; existing consent-gated analytics | Navigation and 320/390/1280 width checks pass; effectiveness remains an experiment |
| 14 Regular visitors | Four-edition editorial pilot protocol and evidence intake, using existing quickNotes/newsletter infrastructure | Zero eligible real-world changes in initial registry intake; named owner and verified candidates required before publication |
| 15 Editorial products | Journal library, published Insider Picks archive, dated Peninsula This Weekend, one occasional Insider Note; generator guidance updated | Consistent current site wording; actual send cadence is not claimed |

## Verification

- Two full build/search passes including existing content, SEO, event, schema, provenance and commercial guards.
- 58 event/freshness/feed/occurrence tests plus 7 listener hygiene tests; calendar tests under UTC, Melbourne and Los Angeles.
- Five event browser regressions: back/forward/reload, delayed responses, failures, navigation away/return, feed/schema identity equality.
- Four additional browser/build checks cover all eight FAQs, three homepage routes and narrow screens, anonymous business routes, sitemap/canonical/indexability.
- Real generated Pagefind: cellar-door query returns Best Cellar Doors first; winery query returns revised planning article first.
- Eat (52 listing links), Explore (54), What's On (35 rendered occurrence rows across sections) have matching JavaScript-off/on visible directory links, headings, structured data hashes and accessible headings. Weekend page schema and feed agree on 16 event identities.
- SEO ledger: 989 built HTML files, 625 sitemap entries, no integrity failures. Existing redirect and internal-link debt is not represented as fully resolved.
- Existing correction, partner and navigation checks passed. No live operator form submitted; mocked browser boundaries are not end-to-end database proof.
- Final copy-only render and browser rerun performed before release.

## Search Console baseline

Read-only owner access is available. Sitemap fetched by Google on 15 September with zero warnings/errors and 624 submitted URLs before this release. The sitemap API indexed-count field is not used as a site indexing verdict.

Query-visible rows for 16 August–13 September: /wine/ 215 impressions, zero clicks; /wine/best-cellar-doors/ one impression, zero clicks. No matching query overlap between those two pages was observed in returned rows. These exclude anonymised queries and are not complete page totals. This supports keeping the changes as clearer positioning, not claiming demonstrated cannibalisation loss or retiring URLs.

## Follow-through

After live build identity, sitemap, canonical and schema validation: inspect homepage, Wine, Best Cellar Doors, Eat, Explore and What's On in Search Console, then request indexing using the UI where available. The connected API is inspection-only and cannot request recrawling. A recrawl request does not guarantee indexing. Normal crawling remains enabled.

Measure the homepage decision test with the existing release attribution and consent limits; do not claim conversion gains without data. Start What's changed only when an editorial owner and evidenced real-world changes exist. Pilot and claims register sit beside this report; the search/editorial contract is in docs/editorial-product-and-search-contract.md.

## Release status

The final render and all nine browser/build acceptance checks passed. Final SEO ledger validation passed. Automatic approval review rejected the combined commit/push/pull-request action before execution, citing the breadth of publication and requiring explicit authorization for that external side effect. No commit, push, pull request, deployment or recrawl request was performed in this implementation phase.

Reviewable implementation: branch codex/discovery-business-20260916 in the isolated worktree. Release destination: richmondjw/peninsula-insider. Next authorized release step is to commit the scoped changes, push this branch, open/review the PR, merge after checks, and verify the resulting production deployment. Manual Search Console request-indexing remains dependent on UI access; the available connector supports read-only inspection.

User explicitly approved publication, merge and deployment on 16 September 2026. Release checks and production verification are being completed under that approval.
