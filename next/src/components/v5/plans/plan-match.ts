/** Deterministic, evidence-based matching. Missing facets never count as a match. */
export type LengthValue = 'one-day' | 'weekend' | 'longer';
export interface MatchablePlan {
  id: string;
  kind?: 'itinerary' | 'guide';
  facets: Partial<Record<string, string[]>>;
  dayCount?: number;
  editorialPriority?: number;
  publishedAt?: number;
}
export interface MatchQuery {
  length?: LengthValue | null;
  who?: string | null;
  into?: string[];
  weather?: 'rainy-day' | null;
  season?: boolean;
}
export interface PlanFit { id: string; matched: string[]; missing: string[]; exact: boolean; score: number; }
export interface MatchResult { ids: string[]; fits: PlanFit[]; topScore: number; exact: boolean; asked: number; }
export interface QueryLabels { length?: Record<string, string>; who?: Record<string, string>; into?: Record<string, string>; weather?: Record<string, string>; }

function has(plan: MatchablePlan, key: string, value: string): boolean {
  return (plan.facets[key] ?? []).includes(value);
}
export function matchesLength(plan: MatchablePlan, length: LengthValue): boolean {
  // A known day count takes precedence over broader editorial date tags.
  if (plan.dayCount) {
    if (length === 'one-day') return plan.dayCount === 1;
    if (length === 'weekend') return plan.dayCount === 2 || plan.dayCount === 3;
    return plan.dayCount >= 3;
  }
  return length !== 'longer' && has(plan, 'date', length);
}
function criteria(query: MatchQuery): Array<{ token: string; weight: number; test: (p: MatchablePlan) => boolean }> {
  const list: Array<{ token: string; weight: number; test: (p: MatchablePlan) => boolean }> = [];
  if (query.length) list.push({ token: `length:${query.length}`, weight: 3, test: p => matchesLength(p, query.length!) });
  if (query.who) list.push({ token: `who:${query.who}`, weight: 3, test: p => has(p, 'party', query.who!) });
  for (const interest of [...new Set(query.into ?? [])]) list.push({ token: `into:${interest}`, weight: 2, test: p => has(p, 'cat', interest) || has(p, 'mood', interest) });
  if (query.weather) list.push({ token: `weather:${query.weather}`, weight: 3, test: p => has(p, 'mood', query.weather!) });
  if (query.season) list.push({ token: 'season:this-season', weight: 1, test: p => has(p, 'date', 'this-season') });
  return list;
}
export function assessPlan(plan: MatchablePlan, query: MatchQuery): PlanFit {
  const matched: string[] = [];
  const missing: string[] = [];
  let score = 0;
  for (const criterion of criteria(query)) {
    if (criterion.test(plan)) { matched.push(criterion.token); score += criterion.weight; }
    else missing.push(criterion.token);
  }
  return { id: plan.id, matched, missing, exact: matched.length > 0 && missing.length === 0, score };
}
export function scorePlan(plan: MatchablePlan, query: MatchQuery): number { return assessPlan(plan, query).score; }
export function maxScore(query: MatchQuery): number { return criteria(query).reduce((sum, criterion) => sum + criterion.weight, 0); }
export function countAsked(query: MatchQuery): number { return criteria(query).length; }
export function matchPlans(plans: MatchablePlan[], query: MatchQuery, limit = 3): MatchResult {
  const asked = countAsked(query);
  const ranked = plans
    .filter(plan => plan.kind !== 'guide')
    .map(plan => ({ plan, fit: assessPlan(plan, query) }))
    .filter(({ fit }) => !asked || fit.matched.length > 0)
    .sort((a, b) => Number(b.fit.exact) - Number(a.fit.exact) || b.fit.score - a.fit.score ||
      (b.plan.editorialPriority ?? 0) - (a.plan.editorialPriority ?? 0) || a.plan.id.localeCompare(b.plan.id));
  const fits = ranked.slice(0, Math.max(0, limit)).map(row => row.fit);
  return { ids: fits.map(fit => fit.id), fits, topScore: fits[0]?.score ?? 0, exact: fits[0]?.exact ?? false, asked };
}
export function criterionLabel(token: string, labels: QueryLabels): string {
  const [key, value] = token.split(':');
  if (key === 'season') return 'This season';
  return labels[key as keyof QueryLabels]?.[value] ?? value.replace(/-/g, ' ');
}
export function describeQuery(query: MatchQuery, labels: QueryLabels): string {
  return criteria(query).map(criterion => criterionLabel(criterion.token, labels)).join(' · ');
}
