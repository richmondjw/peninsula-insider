# Concierge — attribute-aware retrieval layered on chunk RAG

**Phase D wave 4 of the data architecture rollout.**

Vault context: `07-projects/peninsula-insider/data-architecture-assessment-2026-05-16.md`.

This patch lives **outside this repo** — apply in `apps/api/src/routes/concierge.ts`
(the platform API repo). The PI site only calls
`POST $PUBLIC_CONCIERGE_API_URL/concierge/ask/stream`; the change here is
the backend.

## Why

The concierge today retrieves from `concierge_chunks` (semantic-only,
project `mvdtkgsfuhmkioygxgge`). It can't enforce *hard* attribute
filters — when a user says "dog-friendly cellar door with kids", the LLM
might still recommend a venue with `dogFriendly: false` because the
ranking is similarity-only.

`pi.search()` (project `tjjhpvslpysfklwpqmgz`, Phase C) returns
attribute-filtered entity hits via the canonical taxonomy. Layering
*both* gives:
- hard guarantees (dog-friendly stays dog-friendly)
- prose-quality answers (chunk RAG still drives the answer text)
- a single canonical taxonomy across web, planner, concierge, and iOS

## Architecture

```
user query
   │
   ▼
parse intent  ──►  facet predicates  ──►  pi.search(q, filters, ...)
   │                                          │
   ▼                                          ▼
chunk RAG (concierge_chunks)            entity hits
   │                                          │
   └─────────►  rerank chunks by facet match ◄┘
                         │
                         ▼
                LLM with grounded entity context
```

Stage by stage:

1. **Intent parsing** — parse the free-text query into facet predicates.
   Two implementations possible:
   - **Rule layer:** synonym map keyed off `facet-taxonomy.yaml`
     (download from this repo at deploy time; cached in memory).
     Cheap. Catches 70% of common queries.
   - **LLM classifier:** Haiku-class call. ~50–100ms. Use for the long
     tail; fall back to chunk-only retrieval if it errors.

2. **Hard-filter retrieval** — `pi.search()` returns up to ~25 entity
   matches that satisfy the facet predicates.

3. **Chunk retrieval** — existing `concierge_chunks` query against the
   user's full message (semantic similarity). Returns ~25 chunks.

4. **Rerank** — boost chunks whose `source_entity_slug` matches one of
   the entity hits from step 2. Weight: +0.5 in the combined score.
   Drop chunks whose entity *contradicts* a hard filter ("dog-friendly:
   yes" was asked, but this chunk's entity has `dog-friendly: no").

5. **Generate** — pass top-N reranked chunks to the LLM as grounding
   context. Existing prompt + streaming pipeline unchanged.

## Diff (illustrative)

```ts
// apps/api/src/routes/concierge.ts

import { createClient } from '@supabase/supabase-js';

// New: PI runtime client (separate project from the concierge corpus)
const piRuntime = createClient(
  process.env.PI_RUNTIME_SUPABASE_URL!,     // tjjhpvslpysfklwpqmgz
  process.env.PI_RUNTIME_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false }, db: { schema: 'pi' } }
);

interface ParsedIntent {
  facets: Record<string, string[]>;
  entityTypes?: string[];
}

// Stage 1 — rule-layer intent parser. Loads facet-taxonomy.yaml at boot.
async function parseIntent(q: string, taxonomy: Taxonomy): Promise<ParsedIntent> {
  const lower = q.toLowerCase();
  const facets: Record<string, Set<string>> = {};
  for (const [family, defn] of Object.entries(taxonomy.facets)) {
    for (const [value, meta] of Object.entries(defn.values)) {
      const alts = [value, ...(meta.synonyms || [])];
      if (alts.some((a) => lower.includes(a.replace(/-/g, ' '))
                        || lower.includes(a))) {
        (facets[family] ??= new Set()).add(value);
      }
    }
  }
  return {
    facets: Object.fromEntries(
      Object.entries(facets).map(([k, s]) => [k, [...s]])
    ),
  };
}

// Stage 2 — pi.search RPC
async function piSearchEntities(q: string, intent: ParsedIntent) {
  const { data, error } = await piRuntime.rpc('search', {
    q,
    filters: intent.facets,
    entity_types: intent.entityTypes ?? null,
    result_limit: 25,
  });
  if (error) {
    console.warn('[concierge] pi.search failed, skipping attribute layer', error);
    return [];
  }
  return data as SearchHit[];
}

// Stage 4 — rerank chunks by entity match
function rerankChunks(
  chunks: ConciergeChunk[],
  entityHits: SearchHit[],
  intent: ParsedIntent
): ConciergeChunk[] {
  const entitySlugs = new Set(
    entityHits.map((h) => `${h.entity_type}:${h.entity_slug}`)
  );
  // Build a contradicts predicate: any facet the user explicitly asked
  // for, an entity that has the negation, drop the chunk.
  const isContradiction = (chunkEntity: { type: string; slug: string }) => {
    const hit = entityHits.find(
      (h) => h.entity_type === chunkEntity.type && h.entity_slug === chunkEntity.slug
    );
    if (!hit) return false; // unknown to pi.entity_index — let through
    // Example: if user asked dog-friendly=yes, entity facets must include 'yes'.
    for (const [k, vs] of Object.entries(intent.facets)) {
      if (!hit.facets[k] || !vs.some((v) => hit.facets[k].includes(v))) {
        return true; // entity does not satisfy this required facet
      }
    }
    return false;
  };

  return chunks
    .filter((c) => !isContradiction({ type: c.source_entity_type, slug: c.source_entity_slug }))
    .map((c) => {
      const matched = entitySlugs.has(`${c.source_entity_type}:${c.source_entity_slug}`);
      return { ...c, score: c.score + (matched ? 0.5 : 0) };
    })
    .sort((a, b) => b.score - a.score);
}

// Main handler (existing endpoint) — modified
export async function POST(req: Request) {
  const { q } = await req.json();
  const intent = await parseIntent(q, await getTaxonomy());

  // Run both retrievals in parallel
  const [entityHits, chunkHits] = await Promise.all([
    piSearchEntities(q, intent),
    existingConciergeChunkRetrieval(q),   // unchanged
  ]);

  const reranked = rerankChunks(chunkHits, entityHits, intent);
  return streamAnswer(q, reranked.slice(0, 12), entityHits.slice(0, 6));
}
```

## Environment variables to add to the platform-api service

```
PI_RUNTIME_SUPABASE_URL=https://tjjhpvslpysfklwpqmgz.supabase.co
PI_RUNTIME_SUPABASE_ANON_KEY=<anon key from tjjhpvslpysfklwpqmgz project>
```

The anon key suffices — `pi.search()` has `GRANT EXECUTE TO anon`.
Do **not** use the service role key here; the concierge is a public
read-only consumer.

## Taxonomy distribution

The intent parser needs `facet-taxonomy.yaml` from this repo. Two options:

1. **Build-time copy** — concierge build job pulls
   `https://raw.githubusercontent.com/richmondjw/peninsula-insider/main/next/src/taxonomy/facet-taxonomy.yaml`
   and bakes the parsed object into the bundle. Refresh on every deploy.
2. **Runtime fetch + cache** — fetch the YAML on container start, cache
   in memory, refresh hourly. Simpler ops, slightly slower cold start.

(1) is recommended — atomic with the deploy.

## Eval

Existing eval harness at `ops/scripts/insider-eval-runner.mjs` (this
repo) calls `${API}/concierge/ask`. After the change, expect:
- recall up on "find me X with attribute Y" queries
- precision up — no more "dog-friendly: yes" answers recommending
  no-dog venues
- latency +50–150ms (pi.search RPC + intent parse)

## Rollout

- ship behind `CONCIERGE_ATTRIBUTE_RERANK=1` env flag for a week
- compare against a side-by-side run with the flag off via the eval
  harness
- flip the default once recall + precision are at parity or better

## Operational follow-up after this lands

The taxonomy is now read by three consumers:
1. PI site (`pi.search` via Astro)
2. Concierge backend (this patch)
3. iOS app (Sprint 2, queued)

Make `next/src/taxonomy/facet-taxonomy.yaml` the contracted spec across
all three. Any breaking change requires bumping `version:` and a
coordinated release of all consumers.
