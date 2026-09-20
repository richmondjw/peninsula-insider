/**
 * Shared-trip import planner (PI-012).
 *
 * Pure decision layer behind the Import button on /me/trip/. Opening the same
 * share link twice and importing twice used to duplicate every day and every
 * stop, because `tripAddDay` and `tripAdd` append unconditionally. The planner
 * works out what is actually missing before anything is written:
 *
 *   - a stop already on the mapped day (same kind + slug) is skipped;
 *   - repeated visits on distinct days survive;
 *   - a day with source or matching-stop evidence is reused, while an unrelated
 *     day with the same label stays separate;
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
  entries: Array<{ kind?: string; slug?: string; dayId?: string; meta?: Record<string, unknown> }>;
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
  const source = JSON.stringify(shared);
  const mapped: Record<string, string> = {};
  for (const day of shared.days || []) {
    const sourceEntry = existing.entries.find((e) => e.meta?.sharedSource === source && e.meta?.sharedDay === day.id);
    const sameDay = existing.days.find((d) => d.id === sourceEntry?.dayId)
      || existing.days.find((d) => d.id === day.id)
      || existing.days.find((d) => d.label === day.label && existing.entries.some((e) =>
        e.dayId === d.id && shared.items.some((s) => s.dayId === day.id && s.kind === e.kind && s.slug === e.slug)));
    if (sameDay) mapped[day.id] = sameDay.id;
  }
  const held = new Set(existing.entries.filter((e) => e.kind && e.slug)
    .map((e) => `${e.kind}/${e.slug}/${e.dayId || ''}`));
  const seen = new Set<string>();
  const stops = (shared.items || []).filter((it) => {
    const occurrence = `${it.kind}/${it.slug}/${it.dayId}`;
    if (seen.has(occurrence)) return false;
    seen.add(occurrence);
    const targetDay = mapped[it.dayId];
    // Keep the historical ungrouped-stop dedupe; distinct scheduled visits survive.
    if (held.has(`${it.kind}/${it.slug}/`)) return false;
    return !targetDay || !held.has(`${it.kind}/${it.slug}/${targetDay}`);
  });
  const needed = new Set(stops.map((it) => it.dayId));
  const daysToCreate: DayToCreate[] = [];
  const reusedDayIds: Record<string, string> = {};
  for (const d of shared.days || []) {
    if (!needed.has(d.id)) continue;
    if (mapped[d.id]) reusedDayIds[d.id] = mapped[d.id];
    else daysToCreate.push({ sharedId: d.id, label: existing.days.some((day) => day.label === d.label)
      ? `Day ${existing.days.length + daysToCreate.length + 1}` : d.label });
  }
  return { daysToCreate, reusedDayIds, stops };
}
