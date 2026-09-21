// The content gap engine.
//
// Gaps are produced from signals the environment can actually see: benchmark
// questions the site answers poorly, entities the graph models but no page
// surfaces, and Search Console demand when credentials are available. Each
// candidate is scored on whether the site holds enough local substance to write
// the page truthfully.

import { clamp, round } from './util.mjs';

export async function findGaps({ benchmark, graph, pages, service, searchDemand = null, limit = 80 }) {
  const candidates = [];

  // 1. Benchmark questions with poor or no site coverage.
  const uncovered = (benchmark.questions ?? []).filter((q) => q.coverage && ['poor', 'none'].includes(q.coverage.fit));
  for (const q of uncovered) {
    candidates.push({
      kind: 'benchmark_question',
      label: q.query,
      town: q.town ?? null,
      activity: q.activity ?? null,
      audience: q.audience ?? null,
      season: q.season ?? null,
      bestExistingFit: q.coverage.score ?? 0,
      demandSignal: demandFor(q, searchDemand),
      supportingEntities: supportFor(q, graph),
      dimension: q.dimension,
    });
  }

  // 2. Towns modelled with venues but with no dedicated town surface.
  const townsWithVenues = new Map();
  for (const edge of graph.edges) {
    if (edge.rel !== 'LOCATED_IN') continue;
    const town = edge.to.replace(/^town:/, '');
    townsWithVenues.set(town, (townsWithVenues.get(town) ?? 0) + 1);
  }
  const pageSlugs = new Set(Object.keys(pages).map((p) => p.split('/').filter(Boolean).pop()));
  for (const [town, count] of townsWithVenues) {
    if (pageSlugs.has(town)) continue;
    candidates.push({
      kind: 'missing_town_hub',
      label: `Town hub for ${graph.nodes[`town:${town}`]?.name ?? town}`,
      town, activity: null, audience: null, season: null,
      bestExistingFit: 0,
      demandSignal: clamp(count / 10),
      supportingEntities: count,
      dimension: 'entity_coverage',
    });
  }

  // 3. Search Console queries with demand and no good landing page.
  for (const row of searchDemand?.opportunities?.queriesWithoutGoodPage ?? []) {
    candidates.push({
      kind: 'search_demand',
      label: row.query,
      town: null, activity: null, audience: null, season: null,
      bestExistingFit: row.fit ?? 0,
      demandSignal: clamp((row.impressions ?? 0) / 1000),
      supportingEntities: row.supportingEntities ?? 0,
      dimension: 'search_console',
    });
  }

  if (!candidates.length) return { candidates: [], summary: { proposed: 0 } };

  const records = await service.decideBatch('gap.worth_creating', candidates.map((c) => ({
    label: c.label,
    demandSignal: c.demandSignal,
    supportingEntities: c.supportingEntities,
    bestExistingFit: c.bestExistingFit,
  })));

  const scored = candidates.map((c, i) => ({
    ...c,
    verdict: records[i].provider === 'jev' && records[i].confidence >= 0.8
      ? records[i].value?.verdict ?? 'watch' : 'watch',
    score: records[i].value?.score ?? 0,
    confidence: records[i].confidence,
    provider: records[i].provider,
    rationale: records[i].rationale,
  }));

  scored.sort((a, b) => (b.score * b.confidence) - (a.score * a.confidence));
  const byVerdict = scored.reduce((acc, c) => { acc[c.verdict] = (acc[c.verdict] ?? 0) + 1; return acc; }, {});

  return {
    candidates: scored.slice(0, limit),
    summary: {
      proposed: candidates.length,
      byVerdict,
      createCount: byVerdict.create ?? 0,
      note: 'Gaps are opportunities to research and write, never instructions to generate a page.',
    },
  };
}

/** How much modelled local substance exists behind a question. */
function supportFor(q, graph) {
  if (!q.town) return 0; // Unknown support is not a fabricated entity count.
  let n = 0;
  for (const edge of graph.edges) {
    if (edge.rel === 'LOCATED_IN' && edge.to === `town:${q.town}`) n += 1;
    if (edge.rel === 'HELD_IN' && edge.to === `town:${q.town}`) n += 1;
  }
  return n;
}

function demandFor(q, searchDemand) {
  if (!searchDemand?.byTerm) {
    // Without Search Console, demand is unknown. Use a neutral prior derived
    // from the question dimension rather than pretending to a measurement.
    return { practical: 0.5, town_x_frame: 0.4, town_x_audience: 0.35, activity_x_audience: 0.35, town_x_season: 0.25, activity_x_season: 0.25, venue_x_attribute: 0.2 }[q.dimension] ?? 0.3;
  }
  const terms = q.query.toLowerCase().split(/\s+/);
  let impressions = 0;
  for (const t of terms) impressions += searchDemand.byTerm[t] ?? 0;
  return clamp(impressions / 2000);
}

export function gapsSummaryLine(gaps) {
  const create = gaps.candidates.filter((c) => c.verdict === 'create');
  return `${gaps.summary.proposed} gap candidates, ${create.length} rated worth creating, top: ${create.slice(0, 3).map((c) => c.label).join('; ') || 'none'}`;
}
