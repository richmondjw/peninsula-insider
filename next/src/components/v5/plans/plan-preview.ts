import type { PlanRecord } from './plans-data';

/** Preserve stop order and revisits; collapse only neighbouring stops in the same place. */
export function routePreview(plan: Pick<PlanRecord, 'stops'>): string {
  return [...new Set(plan.stops.map(stop => stop.day))].sort((a,b) => a-b).map(day => {
    const places = plan.stops.filter(stop => stop.day === day).map(stop => stop.placeLabel || stop.title);
    const route = places.filter((place,index) => index === 0 || place !== places[index-1]);
    return `Day ${day}: ${route.join(' → ')}`;
  }).join(' · ');
}
