/**
 * season.ts - the single source of truth for "which season is it".
 *
 * The Peninsula publishes on Melbourne time. The build host does not: CI
 * runs in UTC, ten to eleven hours behind Australia/Melbourne. A season
 * derived from a raw date.getMonth() therefore still reports the PREVIOUS
 * season for the first ten to fourteen hours after every changeover, while
 * anything derived from localised calendar parts has already rolled over.
 * That divergence is how the site came to publish a Spring masthead above
 * Winter positioning copy.
 *
 * Four season functions used to exist: getSeason in lib/edition.ts,
 * currentSeason in lib/editorial.ts, auSeason in lib/facets.ts, and the
 * private seasonForMonth inside lib/conditions.ts. Only the last was
 * timezone-correct. They are all gone; this module is what remains, and
 * every surface that needs a season reads it from here.
 *
 * Southern Hemisphere meteorological seasons:
 *   Summer  December, January, February
 *   Autumn  March, April, May
 *   Winter  June, July, August
 *   Spring  September, October, November
 *
 * Evaluated at build time, so every static page agrees with every other.
 *
 * This module deliberately has no imports. Half the site depends on it,
 * including lib/v5-nav.ts (which scripts/lint-nav-budget.mjs evaluates
 * without a TypeScript toolchain) and season.test.mjs (which Node runs
 * with bare type-stripping and no bundler resolution). A leaf module with
 * zero edges stays loadable by both. The timezone literal below is the
 * same value lib/sunset.ts pins for the astronomy; it is a constant of
 * geography, not configuration.
 */

const PENINSULA_TZ = 'Australia/Melbourne';

/** Title case, the form the masthead and the edition stamp print. */
export type AustralianSeason = 'Summer' | 'Autumn' | 'Winter' | 'Spring';

/** Lower case, the form the facet vocabulary and content frontmatter store. */
export type AustralianSeasonLower = 'summer' | 'autumn' | 'winter' | 'spring';

export interface MelbourneCalendarParts {
  /** Four-digit year, e.g. 2026. */
  year: number;
  /** One-indexed month, 1 to 12. */
  month: number;
  /** Full month name in en-AU, e.g. "September". */
  monthName: string;
}

/**
 * Melbourne-local calendar parts for an instant. Taking year and month
 * from the localised parts rather than from getFullYear()/getMonth() keeps
 * every derivation correct across day, month, season and year boundaries
 * no matter where the build runs.
 */
export function melbourneCalendarParts(date: Date = new Date()): MelbourneCalendarParts {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: PENINSULA_TZ,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const num = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const monthName = new Intl.DateTimeFormat('en-AU', {
    timeZone: PENINSULA_TZ,
    month: 'long',
  }).format(date);
  return { year: num('year'), month: num('month'), monthName };
}

/** The Southern Hemisphere season on Melbourne time. Title case. */
export function getAustralianSeason(date: Date = new Date()): AustralianSeason {
  const { month } = melbourneCalendarParts(date);
  if (month >= 3 && month <= 5) return 'Autumn';
  if (month >= 6 && month <= 8) return 'Winter';
  if (month >= 9 && month <= 11) return 'Spring';
  return 'Summer';
}

/**
 * The same answer in the lower-case form the facet vocabulary, the
 * seasonBlurb table and content frontmatter all use. A casing adapter, not
 * a second derivation.
 */
export function getAustralianSeasonLower(date: Date = new Date()): AustralianSeasonLower {
  return getAustralianSeason(date).toLowerCase() as AustralianSeasonLower;
}

/**
 * The masthead-style edition tag, e.g. "Winter '26". Season and year come
 * from the same Melbourne-localised instant, so the two halves cannot
 * disagree across the summer new-year boundary.
 */
export function getSeasonEditionTag(date: Date = new Date()): string {
  const { year } = melbourneCalendarParts(date);
  return `${getAustralianSeason(date)} '${String(year % 100).padStart(2, '0')}`;
}
