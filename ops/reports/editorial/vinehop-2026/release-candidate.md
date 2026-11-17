# Revised admission and release candidate

16 November 2026 UTC. This supersedes the admission holds in the initial coverage-and-ledger.md; that document and the initial independent review remain historical evidence.

## Admission through existing components

The existing `articles` schema explicitly supports `format: venue-guide`. The five researched entries are admitted there, without inventing the price band or coordinates required by a new catalogue venue. These are substantive short guides with address, operator source, research basis and festival/ordinary-visit distinction. They do not create new map pins or duplicate permanent venue records.

| Host | Canonical coverage in this candidate |
|---|---|
| The Briars | `/journal/the-briars/`, permanent precinct, not a festival-hub venue |
| Devilbend Farm Beer Co | `/journal/devilbend-farm-beer-co/` |
| Phaedrus Estate | Existing `/wine/phaedrus-estate/` |
| Stumpy Gully Vineyard | Existing `/wine/stumpy-gully-vineyard/` |
| Hickinbotham of Dromana | Rework existing unpublished `/journal/hickinbotham-of-dromana/` identity |
| Mock Red Hill | `/journal/mock-red-hill/` |
| The Pig & Whistle | `/journal/the-pig-and-whistle/` |

Tallarida remains an event bar/producer, not another host. Five new catalogue records remain uncreated; a future catalogue expansion still requires truthful mandatory fields. The five public guide articles resolve the reader-facing coverage gaps.

`hostGuides` adds typed article references alongside `hostVenues`; the event's existing ClusterLinks block renders both, omitting draft/noindex guides and unavailable catalogue venues. Mobile link targets are at least 44px high, use the existing harbour colour and have explicit keyboard focus.

## Facts and scope

All new guide copy uses the claim IDs and primary pages already recorded in coverage-and-ledger.md. Sources were re-opened during the admission work where needed. Each guide explicitly says researched, not a first-hand review. No sensory verdict, ordinary hours, prices, stock, booking availability, accessibility guarantee, travel duration or paid-partnership claim is introduced.

https://events.humanitix.com/peninsula-vinehop-festival-2026 was read on 16 November: date/time, hosts, age, ticket access, parking, private-bus rule and displayed refund policy support the retained event service copy. https://vinehopfestival.com.au/the-buses/ still labels loop artwork 2025. The older exact pickup/circulation assertions are removed rather than recertified. Global event verification dates remain unchanged; this bounded edit does not certify every historical metadata field.

Stumpy's unverified family-outing tag, pairings and coordinates are omitted; directions use the verified street address. Phaedrus's unverified pairings are also omitted. Both retain historical internal priceBand fields because the schema requires them; the no-pricing gate forbids rendering them. No fresh date certifies those retained administrative fields.

## Rights and CMS preservation

The licensed Visit Victoria image finder returned no exact READY image for any of these hosts. Partial-word Red Hill results depicted other businesses and were rejected as venue imagery.

The five guides use the existing original `/images/editorial/journal-backstop.svg`, with the complete rights record copied unchanged from `next/src/lib/journal-image-policy.mjs`. It depicts a conceptual coastal landscape, not any named venue. The existing Journal policy expressly supports this original illustration; it is not new artwork or a photograph.

Phaedrus and Stumpy use existing `/images/generated/events/wine.webp`, inspected visually and carrying the existing PI ownership, website-use, creator and 9 November rights record from the festival event. It is labelled as a conceptual wine illustration, not a venue photograph. No rights receipt was invented or date advanced.

Read-only CMS inspection found three published image slots with null alt, caption and credit, and no rights receipt. The existing precise quarantine mechanism now holds only those exact storage paths: Phaedrus `hero-1778548582566.jpg` and `heroImage-1779958628180.jpg`; Stumpy `heroImage-1779958689189.jpg`. The database rows, files and unrelated uploads are unchanged. Server resolution and client hydration both consult this quarantine. A new cleared upload is not blanket-blocked. Old fallback photos are marked uncovered in `ops/reports/media/image-rights-reconciliation.json`; they are not used for these two venues in this candidate.

Commercial scope: this is the user's routine editorial research task. No operator contact, commissioned visit, payment, gift, affiliate link, booking or commercial consideration was introduced in this workflow. The copy does not claim a self-funded visit, anonymity or a new partnership. Site policy in PRODUCT.md states no pay-for-coverage. No existing commercial record is rewritten.

## Release gates

Current main was merged into the isolated branch without conflict, preserving other work. Exact-head independent review, final full build, rendered mobile/desktop/keyboard checks and successful CI must be recorded against the final source commit. Merge triggers the existing single build-and-deploy workflow; do not dispatch a duplicate deployment. Verify the deployed SHA and actual seven links/new guides before reporting publication.
