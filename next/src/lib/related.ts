/**
 * Reusable related-content helpers.
 *
 * Goal: give templates a consistent way to pick a small set of related
 * entries when no explicit related-* references are populated, while always
 * letting explicit references win. Scoring is intentionally simple — tags,
 * place, and shared format — so the rails stay legible and predictable.
 *
 * These helpers expect Astro `getCollection(...)` entries with a `data`
 * payload; they don't import the content runtime themselves so they're
 * easy to unit-test if a harness is added later.
 */

import { routeSlug } from './editorial';

type ContentEntry = {
  id?: string;
  slug?: string;
  data: Record<string, any>;
};

/**
 * Resolve an array of references (each `{ id }`) against a collection,
 * returning entries in reference order. Useful for explicit `relatedX`
 * fields where editorial order matters.
 */
export function resolveRefs<T extends ContentEntry>(
  refs: Array<{ id?: string } | string> | undefined,
  collection: T[],
): T[] {
  if (!refs || refs.length === 0) return [];
  const want = refs.map((r) => (typeof r === 'string' ? r : String(r?.id ?? '')));
  const bySlug = new Map<string, T>();
  for (const entry of collection) {
    bySlug.set(routeSlug(entry), entry);
  }
  const out: T[] = [];
  const seen = new Set<string>();
  for (const id of want) {
    if (!id || seen.has(id)) continue;
    const found = bySlug.get(id);
    if (found) {
      out.push(found);
      seen.add(id);
    }
  }
  return out;
}

/**
 * Score article→article relatedness. Higher score = more related.
 *   +3 same format
 *   +1 per shared tag
 *   +2 if both list the same place in their content
 */
export function scoreArticleSimilarity(a: ContentEntry, b: ContentEntry): number {
  let score = 0;
  if (a.data.format && a.data.format === b.data.format) score += 3;
  const aTags: string[] = a.data.tags ?? [];
  const bTags: string[] = b.data.tags ?? [];
  for (const tag of aTags) {
    if (bTags.includes(tag)) score += 1;
  }
  return score;
}

/**
 * Pick related articles for the given article: explicit references first,
 * then a tag/format-similarity ranking, then a recency fallback. Always
 * excludes the source article itself.
 */
export function pickRelatedArticles<T extends ContentEntry>(
  article: T,
  pool: T[],
  options: { explicit?: Array<{ id?: string } | string>; limit?: number } = {},
): T[] {
  const limit = options.limit ?? 3;
  const sourceSlug = routeSlug(article);
  const explicit = resolveRefs(options.explicit, pool).filter(
    (e) => routeSlug(e) !== sourceSlug,
  );
  if (explicit.length >= limit) return explicit.slice(0, limit);

  const seen = new Set<string>(explicit.map((e) => routeSlug(e)));
  const ranked = pool
    .filter((entry) => routeSlug(entry) !== sourceSlug && !seen.has(routeSlug(entry)))
    .map((entry) => ({ entry, score: scoreArticleSimilarity(article, entry) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const at = (a.entry.data.publishedAt as Date)?.getTime?.() ?? 0;
      const bt = (b.entry.data.publishedAt as Date)?.getTime?.() ?? 0;
      return bt - at;
    });

  const tail = ranked.map((x) => x.entry);
  if (explicit.length + tail.length >= limit) {
    return [...explicit, ...tail].slice(0, limit);
  }

  // Final fallback — most-recent articles, excluding anything already chosen.
  const taken = new Set<string>([
    ...explicit.map((e) => routeSlug(e)),
    ...tail.map((e) => routeSlug(e)),
  ]);
  taken.add(sourceSlug);
  const recent = pool
    .filter((entry) => !taken.has(routeSlug(entry)))
    .sort(
      (a, b) =>
        ((b.data.publishedAt as Date)?.getTime?.() ?? 0) -
        ((a.data.publishedAt as Date)?.getTime?.() ?? 0),
    );
  return [...explicit, ...tail, ...recent].slice(0, limit);
}

/**
 * Pick related venues/experiences/itineraries by place + tag overlap.
 * Generic enough to use for any collection where entries carry a `place`
 * reference and an optional `tags` block.
 */
export function pickRelatedByPlace<T extends ContentEntry>(
  source: T,
  pool: T[],
  options: { limit?: number } = {},
): T[] {
  const limit = options.limit ?? 3;
  const sourceSlug = routeSlug(source);
  const sourcePlace = String(source.data.place?.id ?? source.data.place ?? '');
  const sourceTags = new Set<string>([
    ...(source.data.tags?.mood ?? []),
    ...(source.data.tags?.season ?? []),
    ...(source.data.tags?.audience ?? []),
  ]);

  return pool
    .filter((entry) => routeSlug(entry) !== sourceSlug)
    .map((entry) => {
      let score = 0;
      const entryPlace = String(entry.data.place?.id ?? entry.data.place ?? '');
      if (sourcePlace && entryPlace === sourcePlace) score += 4;
      const tags: string[] = [
        ...(entry.data.tags?.mood ?? []),
        ...(entry.data.tags?.season ?? []),
        ...(entry.data.tags?.audience ?? []),
      ];
      for (const tag of tags) {
        if (sourceTags.has(tag)) score += 1;
      }
      return { entry, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.entry);
}

/**
 * Pick events that share a place with the source. Sorted by start date,
 * upcoming first.
 */
export function pickRelatedEventsForPlace<T extends ContentEntry>(
  placeId: string,
  events: T[],
  options: { limit?: number; from?: Date } = {},
): T[] {
  const limit = options.limit ?? 4;
  const from = options.from ?? new Date();
  return events
    .filter((event) => {
      const ep = String(event.data.place?.id ?? event.data.place ?? '');
      if (ep !== placeId) return false;
      const end = event.data.endDate ?? event.data.startDate;
      if (!end) return true;
      return (end as Date).getTime() >= from.getTime() - 24 * 60 * 60 * 1000;
    })
    .sort(
      (a, b) =>
        ((a.data.startDate as Date)?.getTime?.() ?? 0) -
        ((b.data.startDate as Date)?.getTime?.() ?? 0),
    )
    .slice(0, limit);
}
