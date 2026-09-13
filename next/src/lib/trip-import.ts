/**
 * Shared-trip import planner (PI-012).
 *
 * Pure decision layer behind the Import button on /me/trip/. Opening the same
 * share link twice and importing twice used to duplicate every day and every
 * stop, because `tripAddDay` and `tripAdd` append unconditionally. The planner
 * works out what is actually missing before anything is written:
 *
 *   - a stop already in the trip (same kind + slug) is skipped;
 *   - a day whose label is already on the trip is reused, not recreated;
 *   - a day is created only when a stop that survived the dedupe needs it, so
 *     a repeat import leaves no empty day behind.
 *
 * Deliberately knows nothing about the store or the DOM, so it is testable
 * without a browser: see trip-import.test.mjs.
 */

/** One stop from a decoded share link. */
export interface SharedStop {
  kind: string;
  slug: string;
  /** Day id as encoded in the link; '' means ungrouped. */
  dayId: string;
}

/** One day from a decoded share link. */
export interface SharedDay {
  id: string;
  label: string;
}

export interface SharedTrip {
  items: SharedStop[];
  days: SharedDay[];
}

/** The subset of the live trip the planner needs. */
export interface ExistingTrip {
  days: Array<{ id: string; label: string }>;
  entries: Array<{ kind?: string; slug?: string }>;
}

export interface DayToCreate {
  /** The share link's id for this day; the caller maps it to the created id. */
  sharedId: string;
  label: string;
}

export interface SharedTripImportPlan {
  /** Days to create, in share-link order. */
  daysToCreate: DayToCreate[];
  /** Share-link day id to existing trip day id, for days already present. */
  reusedDayIds: Record<string, string>;
  /** Stops to add, in share-link order. Empty means a repeat import. */
  stops: SharedStop[];
}

export function planSharedTripImport(shared: SharedTrip, existing: ExistingTrip): SharedTripImportPlan {
  const held = new Set(
    (existing.entries || [])
      .filter((e) => e.kind && e.slug)
      .map((e) => `${e.kind}/${e.slug}`),
  );
  const stops = (shared.items || []).filter((it) => {
    const key = `${it.kind}/${it.slug}`;
    // Also dedupes a share link that carries the same stop twice.
    if (held.has(key)) return false;
    held.add(key);
    return true;
  });

  const needed = new Set(stops.map((it) => it.dayId));
  const daysToCreate: DayToCreate[] = [];
  const reusedDayIds: Record<string, string> = {};
  for (const d of shared.days || []) {
    if (!needed.has(d.id)) continue;
    const already = (existing.days || []).find((x) => x.label === d.label);
    if (already) reusedDayIds[d.id] = already.id;
    else daysToCreate.push({ sharedId: d.id, label: d.label });
  }

  return { daysToCreate, reusedDayIds, stops };
}
