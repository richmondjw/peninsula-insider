# Stay Set 11 release review - 1 October 2026

## Outcome
Sorrento and Red Hill stay guides, stay-hub links and matching social images are ready for release. The Red Hill guide now separates Dromana, Merricks North and Fingal from its Red Hill / Red Hill South local shortlist. Brewer's Cottage short stays are paused in the venue record, recommendations, static search and live-index projector.

## Source checks
- Hotel Sorrento accommodation is adults only; its dining permits children. InterContinental Sorrento's published amenities exclude pets other than service dogs.
- Birch Creek's host-authored Riparide listing identifies the property as Dromana. The old Red Hill address dispute is retained and superseded by locality-only evidence. Exact coordinates and street address are withheld.
- Treetops' operator publishes Red Hill VIC 3937. The archived brewery event no longer recommends the unavailable Brewer's Cottage.
- Polperro and Port Phillip accommodation age rules are stated with direct operator terms.

## Release evidence
- Full build and Pagefind indexing: passed.
- Governed claim support ratchet: passed.
- Visit Victoria licence, house style, no-pricing and coordinate gates: passed.
- Browser journeys: 15/15 passed, including first-visit choice visibility at 320px, locality, paused-cottage booking suppression, and social image matching.
- Entity-index SQL projection excludes the paused cottage while retaining Lindenderry.

Earlier author-only design reviews were provisional (Sorrento 91.74/100 and Red Hill 92.13/100 before final corrections). An independent final design score is unavailable because the review agents reached their usage limit. These are not represented as 99/100.

## Live follow-through
After the static site deploys, dispatch the PI Data Refresh workflow and confirm the raw pi.search RPC no longer returns Brewer's Cottage. The client already filters the stale hit, but backend removal requires that refresh.
