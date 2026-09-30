import type { PlanRecord } from './plans-data';

const NBSP = ' ';

function dayRoutes(plan: Pick<PlanRecord, 'stops'>): Array<{ day: number; route: string[] }> {
  return [...new Set(plan.stops.map(stop => stop.day))].sort((a,b) => a-b).map(day => {
    const places = plan.stops.filter(stop => stop.day === day).map(stop => stop.placeLabel || stop.title);
    return { day, route: places.filter((place,index) => index === 0 || place !== places[index-1]) };
  });
}

/** Preserve stop order and revisits; collapse only neighbouring stops in the same place. */
export function routePreview(plan: Pick<PlanRecord, 'stops'>): string {
  return dayRoutes(plan).map(({ day, route }) => `Day ${day}: ${route.join(' → ')}`).join(' · ');
}

/**
 * The same route as one part per day, left unjoined so each day renders as its
 * own line (no separator between days). The label ('Day 1:') is rendered as
 * its own unbreakable unit and joined to the first place by a non-breaking
 * space; each place name is kept whole and every arrow is bound to the place
 * before it, so a day can only wrap after an arrow, never inside a token.
 */
export function routePreviewParts(plan: Pick<PlanRecord, 'stops'>): Array<{ label: string; route: string }> {
  const keep = (text: string) => text.replace(/ /g, NBSP);
  return dayRoutes(plan).map(({ day, route }) => ({
    label: `Day ${day}:`,
    route: `${NBSP}${route.map(keep).join(`${NBSP}→ `)}`,
  }));
}

/** The label of the stops disclosure, which also holds the practical notes. */
export function stopsSummary(count: number): string {
  if (count > 1) return `All ${count} stops and notes`;
  return count === 1 ? 'The stop and notes' : 'Stops and notes';
}

/** One facts line per itinerary: duration, stop count, area and company, each stated once. */
export function planFacts(plan: Pick<PlanRecord, 'meta' | 'stops'>): string[] {
  const [duration, ...rest] = plan.meta;
  const stops = plan.stops.length ? `${plan.stops.length} ${plan.stops.length === 1 ? 'stop' : 'stops'}` : '';
  const seen = new Set<string>();
  return [duration, stops, ...rest].filter((fact): fact is string => {
    if (!fact) return false;
    const key = fact.trim().toLocaleLowerCase('en-AU');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
