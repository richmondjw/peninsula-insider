# Multi-site decision, 17 November 2026

Keep the two regional programme records private. Prefer genuine per-site occurrences using the existing single-town contract for the next release candidate. Do not admit a regional name, arbitrary map centroid, first-site suburb or fabricated geography receipt.

A new regional representation would require more than an array of town names: exact site identities and evidence, per-site opening dates/hours and exceptions, day-specific town filtering, all-site Shire validation, conflicts/closure/freshness controls, claim/review binding, and truthful multi-location detail, JSON-LD, maps and calendar output. Today the detail page also synthesises a Google Maps destination from venueName even without an address. Relaxing only hasPromotionGeography would therefore produce misleading directions and incomplete location semantics.

The per-site alternative avoids those broad consumer changes. Keep stable programme and site IDs; use one event per real advertised site with explicit dates, named location and exact address; omit coordinates rather than geocode a guess. Keep the programme parent draft so it cannot duplicate child cards. Reconcile each child against runtime queue and catalogue by source URL, site address, name and dates before creation. No automatic conversion or publication is implemented here.

The accompanying per-site-source-ledger records all seven Garden DesignFest Peninsula garden pages: six consistent schedule candidates and one held conflicting date. Craig McLachlan's page has a2026address heading but a2024opening-date line; do not silently repair it. Studio evidence covers three selected Shire sites with distinct date exceptions, not all studios. This demonstrates how proper per-site modelling differs from a programme-wide calendar. Frankston, closed studios and the2027 exhibition address are excluded.

Current CMS text/image/revision slug queries remain empty for the two programmes. This is not queue clearance or a broad search of every unknown alias. The existing private coordination task still contains no new requested runtime script/queue export or complete failure receipt. The Docker denial remains respected.

CI at551234c failed full-build schema validation because unpublished drafts were required to have publishedAt. The narrow event schema correction allows omission only for explicitdraft/review/scheduled; defaultpublished/public/archived still require a date. Malformed supplied values fail. No fake publication date added. The actual-schema tests execute the checked-in schema with real Zod and mocked Astro wiring; the normal Astro build remains required.

Both test files are added to the existing event-intelligence test command. No separate scan, scheduler, publisher or deployment is introduced. Existing CI and release coordination own full-build and rendered acceptance. Do not release these private drafts or the research ledger as finished listings.
