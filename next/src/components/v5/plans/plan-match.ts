/**
 * plan-match - scoring for the plan builder (/explore/plans/, "Build your
 * own Peninsula day").
 *
 * The builder RANKS, it never filters. That is a decision forced by the
 * catalogue: as of 19 September 2026, 12 of 28 published plans carry a
 * party facet and 9 carry a mood facet. A filtering builder would answer
 * "nothing matches" for most combinations while perfectly good plans sat
 * one row below. So every plan is scored, the best three are shown, and
 * the UI says how well they fit rather than pretending the catalogue is
 * denser than it is.
 *
 * Pure and dependency-free on purpose: it runs in the browser off the
 * payload the plans page already embeds, and it is unit-testable without
 * Astro or a content collection.
 */

export type LengthValue = 'one-day' | 'weekend' | 'longer';

export interface MatchablePlan {
  id: string;
  facets: Partial<Record<string, string[]>>;
  dayCount?: number;
  publishedAt?: number;
}

export interface MatchQuery {
  length?: LengthValue | null;
  /** A `party` facet value: couples, family, group, solo, dog-friendly. */
  who?: string | null;
  /** `cat` and `mood` facet values, multi-select. */
  into?: string[];
}

export interface MatchResult {
  ids: string[];
  /** Best score, so the caller can phrase the answer honestly. */
  topScore: number;
  /** True when the best plan matched every criterion the reader set. */
  exact: boolean;
  /** How many criteria the reader set. */
  asked: number;
}

const W_LENGTH = 3;
const W_WHO = 3;
const W_INTO = 2;
const W_SEASON = 1;
const INTO_CAP = 4;

function has(plan: MatchablePlan, key: string, value: string): boolean {
  return (plan.facets?.[key] ?? []).includes(value);
}

/** Does this plan run to the shape the reader asked for? */
export function matchesLength(plan: MatchablePlan, length: LengthValue): boolean {
  const days = plan.dayCount ?? 0;
  if (length === 'one-day') return has(plan, 'date', 'one-day') || days === 1;
  if (length === 'weekend') return has(plan, 'date', 'weekend') || days === 2 || days === 3;
  return days >= 3;
}

export function scorePlan(plan: MatchablePlan, query: MatchQuery): number {
  let score = 0;
  if (query.length && matchesLength(plan, query.length)) score += W_LENGTH;
  if (query.who && has(plan, 'party', query.who)) score += W_WHO;
  const into = query.into ?? [];
  if (into.length) {
    const hits = into.filter((v) => has(plan, 'cat', v) || has(plan, 'mood', v)).length;
    score += Math.min(hits, INTO_CAP / W_INTO) * W_INTO;
  }
  // A plan that suits the season now is the better answer, all else equal.
  if (has(plan, 'date', 'this-season')) score += W_SEASON;
  return score;
}

/** The highest score this query could reach, ignoring the season bonus. */
export function maxScore(query: MatchQuery): number {
  let max = 0;
  if (query.length) max += W_LENGTH;
  if (query.who) max += W_WHO;
  const into = (query.into ?? []).length;
  if (into) max += Math.min(into, INTO_CAP / W_INTO) * W_INTO;
  return max;
}

export function countAsked(query: MatchQuery): number {
  return (query.length ? 1 : 0) + (query.who ? 1 : 0) + ((query.into ?? []).length ? 1 : 0);
}

/**
 * Best `limit` plans for the query, best first. Stable: equal scores fall
 * back to the newer plan, then to id, so the same query always returns the
 * same order for a given catalogue.
 */
export function matchPlans(
  plans: MatchablePlan[],
  query: MatchQuery,
  limit = 3,
): MatchResult {
  const asked = countAsked(query);
  const scored = plans
    .map((plan) => ({ plan, score: scorePlan(plan, query) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.plan.publishedAt ?? 0) - (a.plan.publishedAt ?? 0) ||
        a.plan.id.localeCompare(b.plan.id),
    );
  const top = scored.slice(0, limit);
  const topScore = top[0]?.score ?? 0;
  return {
    ids: top.map((s) => s.plan.id),
    topScore,
    exact: asked > 0 && topScore >= maxScore(query),
    asked,
  };
}

/**
 * One line saying what the reader asked for, for the live region and the
 * card label. Labels come from the caller because the chip vocabulary is
 * derived at build time from the catalogue.
 */
export function describeQuery(
  query: MatchQuery,
  labels: { length?: Record<string, string>; who?: Record<string, string>; into?: Record<string, string> },
): string {
  const parts: string[] = [];
  if (query.who) parts.push(labels.who?.[query.who] ?? query.who);
  if (query.length) parts.push(labels.length?.[query.length] ?? query.length);
  for (const v of query.into ?? []) parts.push(labels.into?.[v] ?? v);
  return parts.join(' · ');
}
