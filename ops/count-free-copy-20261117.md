# Count-free editorial copy

Request: remove item-count-led promotional and display copy comprehensively across Peninsula Insider.

Baseline: `d4563409f5ef72fb147fc4b3f1d691d4644d888d`. Implementation and final release receipts: [PR756](https://github.com/richmondjw/peninsula-insider/pull/756).

## Scope

- Home, Eat, Wine, Stay, Explore, Plans, What's On and Journal heroes, CTAs, headings and trust lines.
- Secondary dining, walking, golf, fishing, boating, tour, accommodation, seasonal and town guides, including shared templates.
- Article titles, deks, count-led introductions/headings, crosslink labels and metadata.
- Downloadable seasonal guides and commercial PDFs use the existing print renderer and layouts.
- Descriptive links replace catalogue scoreboards; legacy article fragments and every destination URL are retained.

## Preserved

Dates, prices, addresses, distances, durations, capacities, awards, course/route details, venue names, ordinal sequences, practical stop limits and ticket inclusions retain their factual meaning. Filter/result/pagination/map/save counts, carousel position announcements and structured ItemList counts remain functional. The exact established series/programme names Insider's 30 and Peninsula 50 remain proper names, with their URLs and ranks unchanged. Separate promotional totals around them are removed.

No content record was freshly verified merely because its copy changed. Verification dates, CMS behaviour/edits, imagery, credits, rights, security, spending and deployment configuration remain unchanged. The CI workflow only adds candidate review/artifact steps and the full build for this branch.

## Count integrity

Count-free directory headings carry `data-directory-total`. The existing built parity gate compares that total with the exact countable result nodes. Negative tests reject duplicate-card inflation, stale totals and a future numeric heading that conflicts with the explicit total. Existing legacy numeric headings remain checked.

## Evidence and limits

The parent inspected the supplied screenshot and confirmed the Eat copy scope. This executor relied on that verified scope rather than claiming independent inspection of the original attachment.

Independent source review passed code head `627a6f516e7cc593d4274f19bc4301bd74cc85de` after correcting all reported omissions and wording defects. Its count-semantics suite passed 11 tests. A subsequent workflow-only commit added PDF artifact generation. Final exact-head review, CI, rendered mobile/desktop and live receipts belong in PR756.

Local house-style and schema-drift checks passed. Local full build was not certified: event-collector assertions failed in the restricted environment, and standalone Astro generation later stopped at a Supabase DNS failure. CI is the full-build and supported-browser evidence source. No local browser or WSL workaround was used.

This is a scoped copy review, not a numerical editorial quality certification or fresh verification of unchanged venue claims. Per-asset C1-C10 scoring remains UNASSESSED; the missing evidence is a fresh full-article reporting/craft assessment, outside this count-copy edit. No 99/100 claim is made. The release decision instead requires independent review of the exact changes, required CI and rendered/live checks.

Concurrent PR755 concerns Eat image rights and functional result-count scope. It is not included in this copy cleanup; reconcile current main before merge and preserve its independent work.
