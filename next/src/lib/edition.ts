/**
 * edition.ts - Publication identity helpers.
 *
 * Returns the current seasonal edition string for Peninsula Insider.
 * The season itself comes from src/lib/season.ts, the single shared
 * derivation. The getSeason() that used to live here read date.getMonth()
 * off the build host's clock, so on a UTC runner it named the previous
 * season for the first ten to fourteen hours after every changeover.
 *
 * Evaluated at build time so every static page is consistent.
 * No runtime JS required.
 */
import { getAustralianSeason, melbourneCalendarParts } from './season';

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
  const season = getAustralianSeason(date);
  const { monthName, year } = melbourneCalendarParts(date);
  return {
    mark: '',
    label: `${season} Insider · ${monthName} ${year}`,
  };
}

/** Convenience: just the season + month/year label string. */
export function getEditionLabel(date: Date = new Date()): string {
  return getPublicationEdition(date).label;
}
