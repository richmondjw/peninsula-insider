/**
 * plan-finder - the finder's choices and each itinerary's place in them.
 *
 * The builder form and the plain "every itinerary" table read the same
 * lists from here, so the table can never describe a filter the form does
 * not offer. Kept free of imports so the test can transpile it alone; the
 * callers pass in FACET_OPTIONS and the matcher's own length rule.
 */
export interface FinderOption { value: string; label: string; }
export interface FinderOptions { lengths: FinderOption[]; who: FinderOption[]; interests: FinderOption[]; }
export interface FinderPlan { id: string; kind?: 'itinerary' | 'guide'; facets: Partial<Record<string, string[]>>; dayCount?: number; editorialPriority?: number; }
export interface FinderRow<P extends FinderPlan = FinderPlan> { plan: P; lengths: string[]; who: string[]; interests: string[]; }
type FacetOptions = Partial<Record<string, FinderOption[]>>;

export const FINDER_LENGTHS: FinderOption[] = [
  { value: 'one-day', label: 'One day' },
  { value: 'weekend', label: 'A weekend' },
  { value: 'longer', label: 'Two nights or more' },
];

/** Only choices at least one published plan can answer are offered. */
export function finderOptions(plans: FinderPlan[], facetOptions: FacetOptions): FinderOptions {
  const present = (key: string, excluded: string[] = []) => (facetOptions[key] ?? []).filter(option =>
    !excluded.includes(option.value) && plans.some(plan => (plan.facets[key] ?? []).includes(option.value)));
  const interests = [...present('cat', ['plan']), ...present('mood', ['rainy-day'])]
    .filter((option, i, list) => list.findIndex(item => item.value === option.value) === i);
  return { lengths: FINDER_LENGTHS, who: present('party'), interests };
}

/** One row per itinerary, in editorial order, labelled exactly as the finder matches it. */
export function finderRows<P extends FinderPlan>(plans: P[], options: FinderOptions, matchesLength: (plan: P, length: any) => boolean): FinderRow<P>[] {
  return plans
    .filter(plan => plan.kind !== 'guide')
    .sort((a, b) => (b.editorialPriority ?? 0) - (a.editorialPriority ?? 0) || a.id.localeCompare(b.id))
    .map(plan => ({
      plan,
      lengths: options.lengths.filter(option => matchesLength(plan, option.value)).map(option => option.label),
      who: options.who.filter(option => (plan.facets.party ?? []).includes(option.value)).map(option => option.label),
      interests: options.interests.filter(option => (plan.facets.cat ?? []).includes(option.value) || (plan.facets.mood ?? []).includes(option.value)).map(option => option.label),
    }));
}

/** "A, B and C" for prose answers. */
export function listLabels(labels: string[]): string {
  if (labels.length < 2) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
