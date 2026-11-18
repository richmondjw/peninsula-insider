# Emma corrections: local candidate, 17 November 2026

Base reconciled: 690ab482814e296e999e3f22d63eb067741738b9. Original base c21712fe942eb08ad15760e4c4364a4b3040dbe0. Latest main includes homepage repair and PR774 shared rendered-guide work; neither modified by this candidate. PR768/771 tour edits and PR773 held event drafts are not incorporated or replaced.

18 November reconciliation: rebased cleanly onto main 7162dce5f98e137bf2726ca05a03497ef733cf20. Its ten intervening commits have no changed-file overlap with this candidate; operator/CMS and scheduled editorial changes are preserved. Open PR inventory contains no duplicate Emma correction release. PR762 currently changes PlanPageFrame.astro, package.json and a browser test, not this candidate's plan-detail file; preserve that separate tablet-layout repair. Public-email substitutions remain scoped for the editorial lane to retain.

## Evidence and limits

Sources retrieved 17 November 2026:
- https://www.moonahlinks.com.au/cms/whats-on/ explicitly lists Will Rounds Friday 20 November 5–8pm; Saturday 21 November is Sam O'Connell. Preserve occurrence date, replace conflicting Saturday summary. The tourism feed carried the contradiction; not independent corroboration.
- https://www.ptleoestate.com.au/whats-on-event/theproducersseries-gardenexperience/ supports private culinary garden tour with Ella Swann, garden canapes, vegetarian lunch at Laura. Summary only corrected; ignore contradictory hotel/dinner boilerplate. No availability or end-time verification claimed.
- https://www.eventbrite.com.au/e/create-pottery-for-your-table-tickets-2003897868468 and https://www.eventbrite.com/cc/create-workshops-2852879 indexed organiser records identify the hands-on ceramic platter activity. Full event page returned 429 to parent research; not retried. Use supported arts category and workshop subcategory; no availability claim.
- https://aseagle.com.au/getting-here/ names Dromana base station and Arthurs Seat summit station. Experience record's existing 795 Arthurs Seat Road address identifies summit locality; fix place to arthurs-seat, preserve coordinates and existing editorial zone taxonomy. Family plan starts there and continues Red Hill, Mount Martha, optional Mornington. No new road or travel-time claims.
- Public /explore/plans/the-family-day-out/ reproduced October 24 Oktoberfest and patrol notes and Red Hill Eagle label. Remove dated one-off claims, retain conservative shore-based guidance; no fresh patrol verification.
- /contact/ confirms hello@peninsulainsider.com.au. Laura venue web fetch failed: old email confirmed through reusable source component, not independently reproduced live. Public copy/mailto and public structured contact only changed. No backend routing, aliases, credentials or security changes.

Existing lastCheckedDate/lastVerified values retained: this is a scoped correction, not whole-record re-verification. Provenance appendices identify event field corrections.

## Coordination

Emma's later Publication Content Refinement thread (17 November 21:46/21:47 AEDT) repeats Terms/public email consistency. This candidate owns only those exact address substitutions and removal of the duplicate corrections-address footer row (existing hello row retained). Other About, Contact form, newsletter, Journal and photography restructuring remains with its owner. No wholesale files copied from that workstream. Footer/layout changes are public address-only and must be reconciled at integration.

## Audit and review

84 upcoming root published/default event records scanned for punctuation/abbreviation truncation, workshop language in exhibitions and recurring weekday wording in one-off summaries. Heuristic scope and one suspect retained in upcoming-review JSON. Sam O'Connell recurring Saturday wording is a review suspect, not a proven wrong date; unchanged. This is not a comprehensive source audit or an audit of ongoing records whose start/end dates precede the review date.

Manual `node scripts/review-stale-plan-dates.mjs YYYY-MM-DD` scans reader dek/editorNote/stop notes in itineraries for explicit full dates. Report-only, deterministic input date; never invents a year, rewrites records or activates a schedule. Metadata excluded; invalid dates ignored. Empty current flags do not certify all prose freshness.

Forms/search/Ask PI/map precautionary site-wide QA remains UNVERIFIED, not confirmed failures. No live form submission, message, upload or spend. Browser checks use local fixture transport blocking outside services; do not establish live CMS parity.
