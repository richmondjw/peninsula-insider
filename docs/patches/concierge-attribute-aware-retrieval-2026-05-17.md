# Concierge — attribute-aware retrieval via pi.search + filter_entity_ids

**Phase D wave 4 of the data architecture rollout.**

Vault context: `07-projects/peninsula-insider/data-architecture-assessment-2026-05-16.md`.

## Status

- **PI runtime schema (`tjjhpvslpysfklwpqmgz`):** `pi.search()` shipped in Phase C.
- **Concierge corpus schema (`mvdtkgsfuhmkioygxgge`):** `concierge_vector_search` and `concierge_bm25_search` now accept an optional `filter_entity_ids text[]` parameter. **Applied 2026-05-17 via MCP.** See [ops/migrations/concierge/2026-05-17-concierge-search-entity-filter.sql](../../ops/migrations/concierge/2026-05-17-concierge-search-entity-filter.sql).
- **Concierge backend (`apps/api/src/routes/concierge.ts` — separate repo):** awaiting adoption. This doc is the contract.

## Architecture

```
                       user query
                            │
        ┌───────────────────┴────────────────────┐
        │                                        │
        ▼                                        ▼
  pi.search(q, filters)              concierge_*_search(q, ..., filter_entity_ids)
  on tjjhpvslpysfklwpqmgz            on mvdtkgsfuhmkioygxgge
        │                                        │
        │ list of entity hits                    │ chunks pre-filtered to those entities
        │                                        │
        └────────────┬───────────────────────────┘
                     ▼
              LLM with grounded context
```

The SQL-side hard filter means the backend doesn't need to rerank or contradiction-filter in TypeScript. Both calls happen in parallel; entity IDs from `pi.search` become the filter list passed to the chunk RPC.

## Backend integration

```ts
// apps/api/src/routes/concierge.ts

import { createClient } from '@supabase/supabase-js';

// Existing concierge corpus client (unchanged)
const concierge = createClient(
  process.env.SUPABASE_URL!,           // mvdtkgsfuhmkioygxgge
  process.env.SUPABASE_SERVICE_KEY!,
);

// NEW: PI runtime client. Anon key suffices — pi.search has GRANT EXECUTE TO anon.
const piRuntime = createClient(
  process.env.PI_RUNTIME_SUPABASE_URL!,       // tjjhpvslpysfklwpqmgz
  process.env.PI_RUNTIME_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false }, db: { schema: 'pi' } },
);

// NEW: lightweight intent parser using facet-taxonomy.yaml's synonyms.
// Loaded at boot from this repo's main branch and cached in memory.
async function parseIntent(q: string): Promise<{
  facets: Record<string, string[]>;
}> {
  const taxonomy = await loadFacetTaxonomy();  // cached
  const lower = q.toLowerCase();
  const facets: Record<string, Set<string>> = {};
  for (const [family, defn] of Object.entries(taxonomy.facets)) {
    for (const [value, meta] of Object.entries(defn.values)) {
      const alts = [value, ...(meta.synonyms || [])];
      if (alts.some((a) =>
        lower.includes(String(a).replace(/-/g, ' ')) ||
        lower.includes(String(a)))) {
        (facets[family] ??= new Set()).add(value);
      }
    }
  }
  return { facets: Object.fromEntries(
    Object.entries(facets).map(([k, s]) => [k, [...s]])
  )};
}

// MODIFIED endpoint:
export async function POST(req: Request) {
  const { q } = await req.json();

  const intent = await parseIntent(q);
  const hasFacets = Object.keys(intent.facets).length > 0;

  // Run pi.search + concierge retrieval in parallel. When the intent
  // parser found no facets (e.g. open-ended question), pass null and
  // let the chunk RPC behave as today.
  const [entityHits, chunkHits] = await Promise.all([
    hasFacets ? piRuntime.rpc('search', {
      q,
      filters: intent.facets,
      result_limit: 25,
    }) : { data: [] },
    // EXISTING chunk RPC, with the new 6th parameter
    concierge.rpc('concierge_bm25_search', {
      query_text: q,
      match_count: 30,
      filter_region: null,
      filter_category: null,
      filter_source_type: null,
      filter_entity_ids: null,  // populated below
    }),
  ]);

  // If we got entity hits, RE-RUN the chunk retrieval with the hard filter.
  // This costs one extra round-trip but guarantees attribute coverage.
  // Alternative: do both in parallel and discard the unfiltered result
  // when entity hits are present.
  let chunks = chunkHits.data ?? [];
  if (entityHits.data && entityHits.data.length > 0) {
    const ids = entityHits.data.map((h: any) => `${h.entity_type}:${h.entity_slug}`);
    const filtered = await concierge.rpc('concierge_bm25_search', {
      query_text: q,
      match_count: 30,
      filter_entity_ids: ids,
    });
    if (filtered.data && filtered.data.length > 0) chunks = filtered.data;
  }

  return streamAnswer(q, chunks, entityHits.data ?? []);
}
```

## Environment variables to add

```
PI_RUNTIME_SUPABASE_URL=https://tjjhpvslpysfklwpqmgz.supabase.co
PI_RUNTIME_SUPABASE_ANON_KEY=<anon key from tjjhpvslpysfklwpqmgz>
```

Anon key. Do NOT use the service role key — concierge is a public read-only consumer.

## Filter ID format

The new `filter_entity_ids text[]` parameter accepts **either**:

- **Canonical pi form** — `venue:alba-thermal-springs` (what `pi.search` returns: `entity_type:entity_slug`)
- **Raw corpus form** — `venue_alba_thermal_springs` (what `concierge_chunks` stores: matches `source_entity_id` directly)

The SQL function tries both. Backend can pass either — canonical form is the natural choice when `pi.search` is the upstream.

## Taxonomy distribution

The intent parser needs `facet-taxonomy.yaml`. Two options:

1. **Build-time copy** — concierge build job pulls
   `https://raw.githubusercontent.com/richmondjw/peninsula-insider/main/next/src/taxonomy/facet-taxonomy.yaml`
   and parses at module load. Refresh on every deploy.
2. **Runtime fetch + cache** — fetch the YAML on container start, cache in memory, refresh hourly.

(1) recommended — atomic with the deploy.

## Eval

Existing eval harness at `ops/scripts/insider-eval-runner.mjs` in this repo. After the backend change, expected effects:

- **Recall up** on attribute queries — "find me X with facet Y" hits the right entities.
- **Precision up** — chunks from entities that fail the attribute filter are removed before the LLM sees them. No more "dog-friendly: yes" answers recommending non-dog venues.
- **Latency +50–150ms** — `pi.search` round-trip plus second chunk call. Parallelisable; can be optimised to a single chunk call if intent parsing is moved upstream of the parallel block.

## Rollout

- Ship behind `CONCIERGE_ATTRIBUTE_RERANK=1` env flag for a week.
- Run side-by-side eval via existing harness with flag on/off.
- Flip default once recall + precision parity-or-better confirmed.

## After this lands

The taxonomy is read by three consumers:
1. PI site (`pi.search` via Astro) — live.
2. Concierge backend (this patch) — pending application.
3. iOS app (Sprint 2 queued).

Make `next/src/taxonomy/facet-taxonomy.yaml` the contracted spec across all three. Breaking changes require version bump + coordinated release.
