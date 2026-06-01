/**
 * Peninsula Insider — Hybrid search client.
 *
 * Wraps the pi.search() RPC (Phase C of the data architecture plan).
 * SearchOverlay + /search.astro try this client first and fall back to
 * Pagefind on error or empty result. Pagefind stays as the crawl-time
 * static fallback so SEO + offline behaviour are unaffected.
 */

import { createClient } from '@supabase/supabase-js';
// `pi` is a non-default schema, so the inferred client type does not match
// the public-default SupabaseClient. Treat the client opaquely.
type SupabaseClient = ReturnType<typeof createClient<any, 'pi'>>;

export interface SearchHit {
  entity_type:    string;
  entity_slug:    string;
  title:          string;
  dek:            string | null;
  href:           string;
  facets:         Record<string, string[]>;
  zone:           string | null;
  place_slug:     string | null;
  // PR-9 search sync: region/estate/tier context returned by the search RPC
  // (populated for venue, place, and region hits where available).
  region_slug:    string | null;
  estate_slug:    string | null;
  venue_tier:     string | null;
  hero_image:     { src: string; alt: string; credit?: string; license?: string } | null;
  starts_at:      string | null;
  ends_at:        string | null;
  distance_km:    number | null;
  lexical_score:  number;
  vector_score:   number;
  facet_score:    number;
  combined_score: number;
}

export interface SearchParams {
  q?:               string;
  filters?:         Record<string, string[]>;
  near?:            { lat: number; lng: number; km?: number };
  when?:            { from?: string; to?: string };
  entityTypes?:     string[];
  embedding?:       number[];
  limit?:           number;
  weights?:         { lexical?: number; vector?: number; facet?: number };
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  // Read from runtime config — set in BaseLayout via window.__PI_SUPABASE.
  // Falls back to null when neither URL nor key is present (caller must
  // handle and route to Pagefind).
  // BaseLayout sets `window.__PI_SB = { url, key }` (see layouts/BaseLayout.astro).
  const cfg = typeof window !== 'undefined' ? (window as any).__PI_SB : null;
  const url = cfg?.url || (import.meta as any).env?.PUBLIC_SUPABASE_URL;
  const key = cfg?.key || (import.meta as any).env?.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false },
    db:   { schema: 'pi' },
  });
  return _client;
}

/**
 * Run a hybrid search. Returns an empty array when:
 *   - Supabase client cannot be initialised (caller falls back to Pagefind)
 *   - RPC errors
 *   - RPC returns no rows
 *
 * Callers MUST treat an empty array as "no results from the RPC layer" and
 * decide whether to fall back to Pagefind. This client never throws.
 */
export async function search(params: SearchParams): Promise<SearchHit[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.rpc('search', {
    q:               params.q ?? null,
    filters:         params.filters ?? {},
    near_lat:        params.near?.lat ?? null,
    near_lng:        params.near?.lng ?? null,
    near_km:         params.near?.km ?? null,
    when_from:       params.when?.from ?? null,
    when_to:         params.when?.to ?? null,
    entity_types:    params.entityTypes ?? null,
    query_embedding: params.embedding ?? null,
    result_limit:    params.limit ?? 25,
    weight_lexical:  params.weights?.lexical ?? 0.4,
    weight_vector:   params.weights?.vector ?? 0.4,
    weight_facet:    params.weights?.facet ?? 0.2,
  });
  if (error) {
    if (typeof console !== 'undefined') console.warn('[pi.search] RPC error, falling back', error);
    return [];
  }
  return (data as SearchHit[]) ?? [];
}

/**
 * Convenience: typeahead query. Trades vector recall for low latency by
 * skipping the embedding path. Lexical + facet only. The trigram index on
 * title kicks in below ~4 chars; tsvector picks up at ≥4 chars.
 */
export async function typeahead(q: string, limit = 8): Promise<SearchHit[]> {
  if (!q || q.trim().length < 2) return [];
  return search({ q, limit, weights: { lexical: 0.7, vector: 0, facet: 0.3 } });
}
