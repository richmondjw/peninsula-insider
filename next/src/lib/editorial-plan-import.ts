import type { TripStore, SaveKind } from './v5-store';

export interface EditorialPlan {
  slug: string;
  title: string;
  entityType: string;
  kind?: string;
  dayCount?: number;
  stops: Array<{ day: number; kind?: string; slug?: string; title: string; href?: string; note?: string }>;
}

/** Pure, atomic plan. Source occurrence keys preserve repeated visits on different days. */
export function prepareEditorialPlan(plan: EditorialPlan, current: TripStore, mode: 'append' | 'replace', stamp = Date.now()): TripStore | null {
  if (plan.entityType !== 'itinerary' || plan.kind === 'guide' || !plan.stops.length) return null;
  if (plan.stops.some((s) => !Number.isInteger(s.day) || s.day < 1 || !s.title)) return null;
  const source = `itinerary/${plan.slug}`;
  const base = mode === 'replace' ? { version: 1 as const, days: [], entries: [] } : current;
  const held = new Set(base.entries.filter((e) => e.meta?.planSource === source).map((e) => e.meta?.planOccurrence));
  const pending = plan.stops.map((stop, index) => ({ stop, index })).filter(({ index }) => !held.has(index));
  if (!pending.length) return base;
  const days = base.days.slice();
  const dayIds = new Map<number, string>();
  for (const day of [...new Set(pending.map(({ stop }) => stop.day))].sort((a, b) => a - b)) {
    const existing = base.entries.find((e) => e.meta?.planSource === source && e.meta?.planDay === day && days.some((d) => d.id === e.dayId));
    if (existing) { dayIds.set(day, existing.dayId); continue; }
    const id = `plan-${stamp}-${plan.slug}-${day}`;
    dayIds.set(day, id);
    days.push({ id, label: `Day ${days.length + 1}` });
  }
  return {
    version: 1,
    days,
    entries: [...base.entries, ...pending.map(({ stop, index }) => ({
      id: `plan-stop-${stamp}-${plan.slug}-${index}`,
      kind: stop.kind as SaveKind | undefined,
      slug: stop.slug,
      title: stop.title,
      href: stop.href,
      dayId: dayIds.get(stop.day)!,
      note: stop.note ?? '',
      addedAt: stamp,
      meta: { planSource: source, planOccurrence: index, planDay: stop.day },
    }))],
  };
}
