# Editorial products and search intent contract

Approved implementation scope: priorities 8 and 15, 16 September 2026.

## Reader-facing products

| Product | Job | Cadence and destination |
| --- | --- | --- |
| Insider Picks | A short selection of recommendations with reasons | Publish when a fresh selection is ready. /picks/ lists dated published selections; article URLs remain in the Journal. No daily or Sunday promise. |
| Peninsula This Weekend | A dated edit for one explicit weekend, with matching event occurrences | /whats-on/this-weekend/ is the current edition; preserve old editions as clearly dated archives. Never present a past edition as current. |
| Journal | A library of guides, reported stories and dated selections | Publish or revise when evidence and editorial review are ready. /journal/. It is not another newsletter. |
| The Insider Note | One email publication linking selected recommendations and reading | Occasional, when there is something worth knowing. /dispatch/. Scheduled article generation does not establish an email delivery cadence. |

A stronger delivery promise needs verified send history, an accountable owner and capacity before changing every signup surface together. Historical article dates and run identifiers remain historical; do not manufacture verification dates to make content appear fresh. New generator output must use these names and avoid cadence promises.

## Search intent map

| URL | Primary reader/search job | Related destination |
| --- | --- | --- |
| /wine/ | Mornington Peninsula wine, wineries and wine-country orientation; browse areas and producers | /wine/best-cellar-doors/ for the ranked shortlist |
| /wine/best-cellar-doors/ | Best Mornington Peninsula cellar doors; compare the editorial shortlist | /wine/ for broader browsing |
| /wine/wine-region/ | Explain geography, maritime climate, soils and grapes | /wine/ to plan visits |
| /journal/mornington-peninsula-winery-guide/ | Practical winery visit planning, bookings, dog policies and route choices | /wine/best-cellar-doors/ for selection |
| /eat/ | Where to eat by area, occasion and type | /eat/best-restaurants/ for ranked restaurant choices |
| /eat/best-restaurants/ | Best restaurants shortlist | /eat/ for broader browsing |
| /stay/ | Choose a base and accommodation style | /stay/best-accommodation/ for property shortlist |
| /stay/best-accommodation/ | Compare recommended properties | /stay/ for location and style orientation |
| /explore/ | Browse activities and places by category and area | /explore/things-to-do/ for a ranked starting list |
| /explore/things-to-do/ | Ranked best things to do | /explore/ for the full activity directory |
| /whats-on/ | Event calendar with selectable dates | /whats-on/this-weekend/ for the dated editorial edit |
| /whats-on/this-weekend/ | What to do this specific weekend | /whats-on/ for other dates |

These are editorial intent assignments, not evidence that search cannibalisation has caused ranking loss. Review Search Console page/query pairs after a clean deployment before considering redirects or URL retirements. Keep existing useful URLs and self-canonicals; do not consolidate pages solely because their topics overlap.

## Parity and publishing rules

- Hub and ranked-page FAQ markup renders the same question/answer source as JSON-LD. A changed answer must change both surfaces together.
- Collection metadata describes the directory; ranked-list metadata describes the shortlist. Do not claim comprehensive verification or a seasonal review date without evidence.
- Do not assert a fixed count of wine subregions without a named current source and a consistent classification. The area's place names are sufficient for visitor orientation.
- Before recrawling high-value pages, check rendered title, canonical, indexability, sitemap membership, visible FAQ versus schema, dated event feeds, and the final production build identity.
- Recrawl requests follow production validation. They are not proof of indexing or restored rankings.
