/**
 * Fill an editorial short list from an already quality-ranked candidate set.
 * A different venue and category is more useful than another activity at the
 * same place. If the live pool is thin, relax category, then venue, so the
 * page still has three genuinely available choices.
 *
 * @template {{ slug: string, venue: string, category: string }} T
 * @param {T[]} candidates
 * @param {T[]} existing
 * @param {number} limit
 * @returns {T[]}
 */
export function fillDistinctPicks(candidates, existing = [], limit = 3) {
  const selected = [...existing];
  const slugs = new Set(selected.map((item) => item.slug));
  const venues = new Set(selected.map((item) => item.venue));
  const categories = new Set(selected.map((item) => item.category));

  for (const mode of ['category-and-venue', 'venue', 'any']) {
    for (const candidate of candidates) {
      if (selected.length >= limit) return selected;
      if (slugs.has(candidate.slug)) continue;
      if (mode !== 'any' && venues.has(candidate.venue)) continue;
      if (mode === 'category-and-venue' && categories.has(candidate.category)) continue;
      selected.push(candidate);
      slugs.add(candidate.slug);
      venues.add(candidate.venue);
      categories.add(candidate.category);
    }
  }
  return selected;
}

/** A machine-selected recommendation needs a recent source check. */
export function recentlyChecked(date, now, maxAgeDays = 30) {
  const checked = date instanceof Date ? date : new Date(String(date ?? ''));
  if (!Number.isFinite(checked.getTime())) return false;
  const day = (value) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  const age = (day(now) - day(checked)) / 86400000;
  return age >= 0 && age <= maxAgeDays;
}
