# Peninsula Insider editorial refinement rollout

Approved by James on 6 September 2026 following the refined-homepage prototype. Implementation and rollout are authorised. Preserve Harbour blue/sand, Sora/Figtree, the masthead, rounded cards and bold contrast. The earlier serif redesign is superseded.

## Scope and completion standard

The inventory covers 291 Astro page sources, including dynamic templates, legacy consolidations and internal pages. The public release must retain canonical URLs, content selection/freshness, CMS editing hooks, search, map, filters, saved/trip state, newsletter and partner integrations. Production release uses the existing main -> GitHub Pages workflow and is verified against deployment provenance. Internal tools are inventoried but are not added to the public deployment.

## Workstreams

1. Home and shared chrome: approved cover scale, differentiated shortlist, Journal split feature moved upward, simpler category copy, compact footer with full touch targets.
2. Editorial and reference: shorter visual headline blocks, humanist standfirst, natural image colour, quieter tags, readable metadata, prose rhythm, contents/facts relationships.
3. Discovery: shared card hierarchy, directory/event rows, category heroes, filters, search results and map controls.
4. Utility and commercial: saved/trip/account shells, newsletter, contact/submission/partner forms, institutional pages and error states. Keep real system behaviour; no prototype handlers.
5. Quality/release: full build and existing gates; representative desktop/mobile visual coverage across every public family; interaction checks; route-level structural scan; release and live verification.

## Decisions

- Actual content is dynamic. The approved prototype's exact sample articles, dates and exhibition placeholder are not hard-coded into production. Existing editorial selection and CMS image overrides remain authoritative.
- Refinement is implemented in the existing home components and a documented shared composition sheet, not a parallel replacement site or new design token generation.
- Fix nested main landmarks where page wrappers duplicate BaseLayout's main. Retain wrapper classes, IDs and scripts.
- Hero imagery is static; hover feedback is brief and respects reduced motion. No scroll hijacking or animation gate before reading.
- Keep 44px touch targets. Compact desktop footer links are permitted only for a fine pointer.
- Original checkout remains untouched. Work starts from origin/main 303c0c8979 in codex/editorial-refinement.

## Evidence

Surface inventory: surface-inventory.md / surface-inventory.json. Visual and structural verification results are added as work progresses. A source inventory is not evidence that every conditional state or authenticated role has been exercised.

- Integrated origin/main d1baf94261 before release, preserving the independent partner project dashboard and its tests.
