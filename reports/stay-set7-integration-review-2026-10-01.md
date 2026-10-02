# Stay Set 7 integration review - 1 October 2026

**Project:** Peninsula Insider. **Decision:** adapt four stay guides and directly linked venue facts; pause one unverified listing. **Owner:** Peninsula Insider editorial and site release. **Review state:** local source and design review, pending public deployment.

## Bounded change

- Luxury, Villas, Couples Retreats and Winery Accommodation now lead with a usable stay choice, first-screen action and clearer format distinctions. The Stay hub descriptions and sitemap dates follow those changes.
- Cassis distinguishes its two mineral-plunge-pool villas from the three outdoor-bath villas. The mobile booking action is visible at 320 x 568 with first-visit privacy notice.
- Mantons Creek and Cape Retreat are treated as suites in source, facets, cards, maps, search and schema. The Vineyard Stays guide uses the corrected Mantons format and dining description.
- Port Phillip Estate, Crittenden Villas and Jackalope booking routes were reconciled with operator pages. Port Phillip's suite, tasting and dining actions are distinct; its regular cellar-door hours follow the operator's Wednesday to Monday schedule.
- Villa Mallorca is paused because current operation and booking cannot be confirmed from a current first-party source. It is removed from active recommendations, static search and client-rendered RPC hits pending backend index refresh. Its historical page remains noindex with no booking action.
- Alba articles now distinguish public spring access from accommodation and spa policy, and describe the service-dog exception accurately.

## Provisional 23-lens grades

These are equal-weight expert design judgments, not a verified percentile, visitor study or 99/100 certification.

| Surface | Prior | Revised local | Evidence |
| --- | ---: | ---: | --- |
| Luxury guide | 63-69 | 92.00 | Independent reviewer, static artifact at 320, 390 and 1365 px |
| Villas guide | 60-66 | 92.17 | Independent reviewer, static artifact at 320, 390 and 1365 px |
| Couples Retreats guide | 62.70 | 91.70 | Author review, responsive preview |
| Winery Accommodation guide | See page report | 91.26 | Author review, responsive preview |
| Cassis detail | 62.83 | 83.13 | Author review and final static 320 x 568 booking check |

See the separate page reports and booking/source verification report for the 23 individual lens values and evidence. No page has an independently substantiated grade above 99.

## Verification and open evidence

The local build renders the full static corpus, responsive images, source rights checks, link-health ledger, content gates and Pagefind. The final rebuild after the Port Phillip hours correction passed `npm run build:search`. Independent review checks the final rendered booking links, paused-listing exclusions, structured data and sitemap before release.

Cassis's booking engine was not completed by an automated visitor flow. Its existing CMS hero's rights chain is not fully resolved. Raw `pi.search` still held a Villa Mallorca row before release; the shipped client filters it immediately, and a post-deployment data refresh must remove the backend row. The prior data-refresh Phase C embedding step failed because its OpenAI API key was rejected; a new run may repeat that failure. A successful static build alone cannot certify live performance or 99/100 usability.

## Next evaluation and rollback

After deployment, verify the public deployment SHA, the four guides and affected details, mobile booking action, operator links, noindex/sitemap/Pagefind status, and raw `pi.search` removal with a positive control. If a critical visitor path fails, revert the release commit and rebuild while preserving the source evidence. Recheck the operator booking routes and Villa Mallorca status by 8 October 2026 or before restoring recommendations.

The next bounded set is Cottages and Coastal Stays, followed by Boutique Hotels and Wellness Stays. The read-only Set 8 scouting report records current contradictions and a new baseline.
