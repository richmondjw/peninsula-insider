/**
 * edition.ts - Publication identity helpers.
 *
 * Returns the current seasonal edition string for Peninsula Insider.
 * Season is Southern Hemisphere meteorological:
 *   Autumn  → March, April, May
 *   Winter  → June, July, August
 *   Spring  → September, October, November
 *   Summer  → December, January, February
 *
 * Evaluated at build time so every static page is consistent.
 * No runtime JS required.
 */

export function getSeason(date: Date = new Date()): 'Autumn' | 'Winter' | 'Spring' | 'Summer' {
  const m = date.getMonth() + 1; // 1-indexed
  if (m >= 3 && m <= 5) return 'Autumn';
  if (m >= 6 && m <= 8) return 'Winter';
  if (m >= 9 && m <= 11) return 'Spring';
  return 'Summer';
}

/**
 * Returns { mark, label } for the masthead edition slot.
 *
 * mark - empty; the Vol/issue badge is retired.
 * label - e.g. "Autumn Insider · May 2026"
 */
export function getPublicationEdition(date: Date = new Date()): {
  mark: string;
  label: string;
} {
  const season = getSeason(date);
  const month = date.toLocaleDateString('en-AU', {
    month: 'long',
    timeZone: 'Australia/Melbourne',
  });
  const year = date.getFullYear();
  return {
    mark: '',
    label: `${season} Insider · ${month} ${year}`,
  };
}

/** Convenience: just the season + month/year label string. */
export function getEditionLabel(date: Date = new Date()): string {
  return getPublicationEdition(date).label;
}

/** Convenience: just the season name. */
export function getCurrentSeason(date: Date = new Date()): string {
  return getSeason(date);
}
