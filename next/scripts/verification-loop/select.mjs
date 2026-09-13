/**
 * select.mjs - which claims this run actually looks at, and why.
 *
 * THE PROBLEM THIS SOLVES
 * ----------------------
 * 298 of the registry's 429 evidence rows were already expired on the day they
 * were seeded. A checker that opens with "298 failures" gets read once. The
 * backlog is not a defect list; it is the shape of a corpus that has never had
 * a verification loop, and it needs to be reported as a shape while the run
 * does a bounded amount of real work against the part of it that matters.
 *
 * So selection is two answers, not one:
 *
 *   the PROFILE   every expired row, bucketed by class, consequence and how
 *                 many expiry periods it is overdue. Nobody works this list.
 *                 It is the trend line, and the only honest way to say whether
 *                 the loop is gaining or losing ground.
 *   the WORKLIST  a bounded, ranked set this run fetches and adjudicates.
 *                 Bounded because an unbounded fetch loop over 331 source URLs
 *                 is an outbound crawl, not a verification pass.
 *
 * RISK
 * ----
 * score = consequence x overdue pressure x reader exposure.
 *
 * Consequence is the loop's own judgement and the most contestable thing in
 * this directory, so it is a table rather than a formula, small enough to
 * argue with. The ordering principle: what happens to a reader who acts on the
 * claim while it is wrong. A wrong access restriction or fishing rule can get
 * somebody hurt or fined. A wrong opening hour wastes a drive. A stale
 * editorial note is embarrassing.
 *
 * Anything whose subject no longer reaches a reader scores zero and is
 * excluded from the worklist, but stays counted in the profile. A claim is not
 * repaired by the event it describes having happened.
 */

import { assess } from './corpus.mjs';

/**
 * Reader consequence by claim class. Every class in source-precedence.json
 * appears here; an unlisted class falls to 'low' and is reported, because a
 * class nobody has classified is a gap in this table and not a safe default.
 */
export const CONSEQUENCE = Object.freeze({
  'access-restriction': 'high',
  conditions: 'high',
  'event-status': 'high',
  'fishing-rule': 'high',
  accessibility: 'high',
  'trading-status': 'medium',
  'event-schedule': 'medium',
  booking: 'medium',
  'opening-hours': 'medium',
  'rate-change': 'medium',
  offering: 'low',
  'regional-count': 'low',
  editorial: 'low',
});

const CONSEQUENCE_WEIGHT = Object.freeze({ high: 3, medium: 2, low: 1 });

export function consequenceOf(claimClass) {
  return CONSEQUENCE[claimClass] ?? 'low';
}

/**
 * Overdue pressure, capped.
 *
 * Uncapped, a quick note whose seven-day conditions row expired in April would
 * outrank every live event on the board by two orders of magnitude, purely
 * because its class expires fast. The cap says: past three expiry periods, a
 * row is simply stale, and staleness stops being a tie-breaker.
 */
export function overduePressure(overdueRatio) {
  if (overdueRatio == null) return 1;
  if (overdueRatio <= 0) return 0.25;
  return Math.min(3, 1 + overdueRatio);
}

/** How many expiry periods overdue, as a reporting bucket. */
export function ageBand(overdueRatio) {
  if (overdueRatio == null) return 'never expired';
  if (overdueRatio <= 0) return 'current';
  if (overdueRatio < 1) return 'under 1 period overdue';
  if (overdueRatio < 3) return '1 to 3 periods overdue';
  return 'over 3 periods overdue';
}

/**
 * A URL the loop is allowed to fetch for this claim: one the record already
 * cites. The loop never discovers a new source. Independent research in the
 * ticket's sense means reading the source rather than the record's summary of
 * it, not going looking for a different source, which is exactly the move that
 * would turn a verification pass into an outbound crawl.
 */
export function citedUrls(entry) {
  const urls = [];
  for (const row of entry.rows) {
    if (typeof row.url === 'string' && /^https?:\/\//i.test(row.url) && !row.url.includes('|')) {
      urls.push({ url: row.url, evidenceId: row.evidenceId, publisher: row.publisher ?? null });
    }
  }
  const seen = new Set();
  return urls.filter((item) => (seen.has(item.url) ? false : seen.add(item.url)));
}

/** Score one assessed claim. */
export function score(entry) {
  const consequence = consequenceOf(entry.claim.claimClass);
  const weight = CONSEQUENCE_WEIGHT[consequence];
  const exposure = entry.liveness.live ? 1 : 0;
  const pressure = overduePressure(entry.overdueRatio);
  const sources = citedUrls(entry);
  // A claim with nothing cited cannot be researched from its own record. It
  // still scores, because the report needs to name it as unresearchable rather
  // than quietly drop it, but it can never enter the fetch worklist.
  const researchable = sources.length > 0;
  return {
    ...entry,
    consequence,
    exposure,
    pressure,
    researchable,
    sources,
    ageBand: ageBand(entry.overdueRatio),
    riskScore: Number((weight * pressure * exposure).toFixed(3)),
  };
}

/**
 * Assess and score every claim in the corpus. Pure: no fetching happens here.
 */
export function scoreCorpus(corpus, now) {
  return corpus.claims.map((claim) => score(assess(claim, corpus, now)));
}

/** Host of a claim's first cited URL, for the per-host politeness cap. */
function hostOf(entry) {
  try {
    return new URL(entry.sources[0].url).host.toLowerCase();
  } catch {
    return 'unknown';
  }
}

/**
 * The bounded set this run will actually fetch.
 *
 * Ordered by risk, then by how long it has been overdue, then by claim id so
 * two runs over an unchanged corpus pick the same batch. Determinism matters
 * more than it looks: the write-scope decision is taken by comparing the
 * loop's judgement against a human's on the same items, and a batch that
 * reshuffles between runs makes that comparison impossible.
 *
 * Straight risk order alone produced a bad first batch, and the reason is
 * worth recording. Consequence is a class-level judgement, so every claim in
 * the same class that is equally overdue scores identically, and the
 * tie-break is alphabetical: the first real run selected ten access
 * restrictions from the same beaches fact file, nine of them citing the same
 * shire page. Ten samples of one source is not a sample. So the batch is
 * filled round-robin across claim classes, highest-risk class first and
 * highest-risk claim within each class, and no single host may supply more
 * than `perHost` of it. The result spans the corpus at the same total risk,
 * which is what makes it evidence about the loop rather than about one page.
 */
export function selectWorklist(scored, { limit = 25, includeStale = false, perHost = 4 } = {}) {
  const eligible = scored.filter(
    (entry) =>
      entry.exposure === 1 &&
      entry.researchable &&
      (includeStale || entry.state !== 'retired')
  );
  const ordered = [...eligible].sort(
    (a, b) =>
      b.riskScore - a.riskScore ||
      (b.overdueDays ?? -1) - (a.overdueDays ?? -1) ||
      a.claim.claimId.localeCompare(b.claim.claimId)
  );

  // Insertion order is risk order, so the highest-risk class leads the rota.
  const buckets = new Map();
  for (const entry of ordered) {
    const key = entry.claim.claimClass;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(entry);
  }

  const out = [];
  const deferred = [];
  const perHostCount = new Map();
  let progressed = true;

  while (out.length < limit && progressed) {
    progressed = false;
    for (const [claimClass, bucket] of buckets) {
      // Slots per round scale with reader consequence, so spreading the batch
      // across classes does not buy diversity by giving a regional count the
      // same share of a run as a beach closure.
      let slots = CONSEQUENCE_WEIGHT[consequenceOf(claimClass)];
      while (slots > 0 && bucket.length > 0 && out.length < limit) {
        const entry = bucket.shift();
        const host = hostOf(entry);
        if ((perHostCount.get(host) ?? 0) >= perHost) {
          deferred.push(entry);
          continue;
        }
        perHostCount.set(host, (perHostCount.get(host) ?? 0) + 1);
        out.push(entry);
        progressed = true;
        slots -= 1;
      }
      if (out.length >= limit) break;
    }
  }

  // A small corpus can exhaust the rota before the batch is full. Rather than
  // return a short batch, top it up from what the host cap held back: the cap
  // is there to spread a large run, not to shrink a small one.
  for (const entry of deferred) {
    if (out.length >= limit) break;
    out.push(entry);
  }
  return out;
}

/** The backlog as a shape: expired rows by class, consequence and age band. */
export function backlogProfile(scored) {
  const byClass = new Map();
  const byBand = new Map();
  const byConsequence = new Map();
  let expiredRows = 0;
  let unreachableSubjects = 0;
  let unresearchable = 0;

  for (const entry of scored) {
    expiredRows += entry.expiredRows;
    if (entry.exposure === 0) unreachableSubjects += 1;
    if (!entry.researchable) unresearchable += 1;
    if (entry.expiredRows === 0) continue;
    const cls = entry.claim.claimClass;
    byClass.set(cls, (byClass.get(cls) ?? 0) + entry.expiredRows);
    byBand.set(entry.ageBand, (byBand.get(entry.ageBand) ?? 0) + entry.expiredRows);
    byConsequence.set(entry.consequence, (byConsequence.get(entry.consequence) ?? 0) + entry.expiredRows);
  }

  const sortDesc = (map) =>
    Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));

  return {
    expiredRows,
    claimsWithExpiredEvidence: scored.filter((entry) => entry.expiredRows > 0).length,
    unreachableSubjects,
    unresearchableClaims: unresearchable,
    byClaimClass: sortDesc(byClass),
    byAgeBand: sortDesc(byBand),
    byConsequence: sortDesc(byConsequence),
  };
}
