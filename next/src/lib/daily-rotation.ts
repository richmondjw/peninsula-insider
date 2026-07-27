/**
 * daily-rotation.ts - keep score-ranked shelves from going static.
 *
 * WHY THIS EXISTS
 * The homepage "This weekend" module and the /whats-on/ picks shelf both fall
 * back to a score-sorted list when no editorial weekend-picks sheet exists for
 * the current weekend. Both scores are computed purely from static event
 * fields (lens, worthTheDrive, editorialPriority, visitorAppealScore,
 * occurs-on-weekend), so the ranking cannot change between builds. The weekend
 * window itself holds from Monday through Sunday. Same inputs, same order,
 * same top three, every single day of the week.
 *
 * Reported 28 July 2026: the shelf had shown Brunch Thyme at Alba, and the two
 * beside it, for three days running. There was no weekend-picks entry for
 * 1-2 August (the most recent was 18 July), so it was on the fallback path,
 * and the fallback is deterministic by construction.
 *
 * WHAT THIS DOES
 * Rotates the visible slice through a quality pool once per Melbourne calendar
 * day. The pool is the top N of the existing ranking, so nothing weak ever
 * surfaces: on 28 July the eligible set was 26 events with the top band
 * scoring 133 down to 113, meaning a pool of nine is all genuinely strong.
 *
 * DETERMINISTIC BY DAY, NOT RANDOM. The site is statically built and rebuilds
 * several times a day (content freshness, the daily engine, any manual push).
 * A random shuffle would reorder the shelf on every build, so a reader
 * refreshing an hour later would see it move for no reason. Keying on the
 * Melbourne date means every build on a given day produces the identical
 * shelf, and it advances once at midnight local time.
 *
 * WHAT THIS DELIBERATELY DOES NOT TOUCH
 * An editorial weekend-picks sheet, where one exists, stays authoritative and
 * unrotated. When an editor has chosen and ordered three picks for a weekend,
 * that intent outranks freshness.
 */

/** Days since the Unix epoch in Melbourne local time. */
export function melbourneDayIndex(now: Date = new Date()): number {
  const mel = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
  return Math.floor(
    Date.UTC(mel.getFullYear(), mel.getMonth(), mel.getDate()) / 86_400_000,
  );
}

/**
 * Rotate a ranked list so a different slice leads each day.
 *
 * Takes the top `poolSize` of `ranked` (the quality gate), then rotates that
 * pool by the day index. Consecutive days share two of three items, which
 * reads as a shelf being tended rather than one being reshuffled, and the set
 * turns over completely every three days.
 *
 * Returns the full rotated pool; the caller slices to however many it shows.
 * Lists at or below `take` are returned untouched, because rotating a list you
 * are about to show in full only reorders it for no gain.
 */
export function rotateDaily<T>(
  ranked: T[],
  now: Date = new Date(),
  poolSize = 9,
  take = 3,
): T[] {
  if (ranked.length <= take) return ranked;
  const pool = ranked.slice(0, Math.max(poolSize, take));
  const offset = melbourneDayIndex(now) % pool.length;
  return pool.map((_, i) => pool[(i + offset) % pool.length]);
}
