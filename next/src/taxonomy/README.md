# Peninsula Insider — Taxonomy System

This folder holds the canonical facet taxonomy that reconciles all controlled
vocabularies used across the 21 Astro content collections.

It is the editorial spine the planner, concierge, alerts, iOS app, and Pass
member products are being built against. Phase A of the data architecture
plan ([vault: `07-projects/peninsula-insider/data-architecture-assessment-2026-05-16.md`](../../../../JWR_PKM_2026/07-projects/peninsula-insider/data-architecture-assessment-2026-05-16.md)).

## Files

- `facet-taxonomy.yaml` — single source of truth. Three sections:
  - `facets` — canonical families (audience, mood, theme, occasion, weather, etc.)
  - `mappings` — per-collection field → canonical mapping table
  - `policy` — strict/advisory collections, deprecation hints, promotion timing

## How the system works

```
   Content files (next/src/content/**/*.{json,md,mdx})
        │
        │  built-time projector (Phase B — not yet)
        ▼
   pi.entity_attributes (Phase B — Supabase)
        │
        ▼
   pi.entity_index → search RPC → typeahead / planner / concierge
```

For Phase A we ship only the YAML and the linter. No DB tables yet.

## Validator

```bash
# Warn-only (advisory): default
node ops/scripts/taxonomy-lint.mjs

# Strict (exit 1 on any unmapped value): for CI gate post-promotion
node ops/scripts/taxonomy-lint.mjs --strict

# Limit to changed files for fast pre-commit usage
node ops/scripts/taxonomy-lint.mjs --changed=origin/main

# JSON output for tooling
node ops/scripts/taxonomy-lint.mjs --json
```

The CI workflow `.github/workflows/taxonomy-lint.yml` runs on every PR
that touches `next/src/content/**` or `next/src/taxonomy/**`. It mirrors
the `governance-lint` pattern: starts warn-only, flips to `--strict`
after `policy.promote_to_gate_on` (currently 2026-06-01).

## Adding or changing a facet value

1. Edit `facet-taxonomy.yaml`:
   - Add the value under `facets.<family>.values` with description + synonyms
   - If reachable via a per-collection enum, extend `mappings.<collection>.<field>.values`
2. Commit. The CI lint will validate every existing content file against
   the new mapping.
3. For deprecated values that should be removed, add an entry under
   `policy.deprecation_path` with the migration hint.

## Open editorial decisions

Marked `TBD` throughout the YAML — these need Emma + Daisy sign-off:

- Whether to constrain `articles.tags` (currently free text)
- Whether `mood.educational` and `theme.eco` should be added (used by tours)
- Whether `theme: drink` should exist alongside `food` and `wine`
- Whether `accessibility`, `weather`, `indoor-outdoor` should be backfilled
  onto venues + experiences in Phase B (the assessment says yes)

## Editorial owner

TBD with James. Candidates:
- Daisy (PI editorial lead) — sole owner with Emma sign-off on values
- Daisy + Emma joint ownership — PRs require both approvals

Default until decided: **PRs to `facet-taxonomy.yaml` require approval from
both Daisy and Emma**, plus a green `taxonomy-lint` CI run.

## Versioning

Bump `version:` at the top of the YAML when:
- adding a facet family (minor: 0.1 → 0.2)
- adding/renaming/removing values within a family (patch: 0.1 → 0.1.1)
- restructuring the mapping format (major: 0.x → 1.0)

The Phase B projector pins the YAML version it was built against, so a
version bump triggers a regeneration of `pi.entity_attributes`.
