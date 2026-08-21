/**
 * freshness.ts - provenance freshness label for Card and detail surfaces.
 *
 * Every recommendation shows provenance (P6): the freshness date renders as
 * "Reviewed May 2026" from the entry's lastVerified (or lastReviewed /
 * lastCheckedDate) value. Month-level precision is deliberate: day precision
 * overstates how continuously entries are re-checked.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Format a freshness label from an ISO date string (a Date instance is also
 * tolerated, since Astro's `z.coerce.date()` fields arrive as Dates).
 * Returns null when the value is absent or unparseable, so callers can
 * simply skip the provenance slot.
 *
 *   freshnessLabel('2026-05-14') -> 'Reviewed May 2026'
 *   freshnessLabel(undefined)    -> null
 */
export function freshnessLabel(dateISO?: string | Date): string | null {
  if (dateISO == null || dateISO === '') return null;
  const d = dateISO instanceof Date ? dateISO : new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  return `Reviewed ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
