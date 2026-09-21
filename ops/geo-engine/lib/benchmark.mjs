// The GEO query benchmark.
//
// A persistent set of natural-language questions a person might put to an AI
// assistant about the Mornington Peninsula. It is generated systematically from
// the site's own towns, activities, audiences and seasons, so it grows with the
// vocabulary rather than being a hand-written list that rots.
//
// The benchmark records what can be *measured* from this environment. AI answer
// surfaces are not queryable here, so every question carries an explicit
// measurement state rather than an invented visibility figure.

import { QUESTION_FRAMES } from './vocab.mjs';
import { loadVocabulary } from './vocab.mjs';
import { sha256 } from './util.mjs';

export const MEASUREMENT_STATES = {
  OBSERVED: 'observed',       // an answer surface was queried and recorded
  INFERRED: 'inferred',       // derived from site coverage, not from an answer
  NOT_MEASURABLE: 'not_yet_measurable', // no tool in this environment can query it
};

/** Towns that carry enough modelled substance to anchor a question. */
function anchorTowns(vocab, graph) {
  const venueCount = new Map();
  if (graph) {
    for (const edge of graph.edges) {
      if (edge.rel !== 'LOCATED_IN') continue;
      const town = edge.to.replace(/^town:/, '');
      venueCount.set(town, (venueCount.get(town) ?? 0) + 1);
    }
  }
  return vocab.towns
    .map((t) => ({ ...t, venues: venueCount.get(t.slug) ?? 0 }))
    .sort((a, b) => b.venues - a.venues);
}

function question(text, meta) {
  return {
    id: sha256(text.toLowerCase()).slice(0, 12),
    query: text,
    ...meta,
    measurement: MEASUREMENT_STATES.NOT_MEASURABLE,
    observations: [],
  };
}

/**
 * Generate the benchmark. `target` is a floor, not a cap: the generator covers
 * the full town set first, then layers audience, season and region questions
 * until the floor is met.
 */
export function generateBenchmark({ vocab = loadVocabulary(), graph = null, target = 250 } = {}) {
  const towns = anchorTowns(vocab, graph);
  const out = new Map();
  const add = (q) => { if (!out.has(q.id)) out.set(q.id, q); };

  const frameOrder = ['things_to_do', 'eat', 'wine', 'beach', 'stay', 'walk', 'cafe', 'event', 'itinerary', 'hidden', 'rainy', 'practical'];

  // 1. Town × core question frame. Every town gets at least the headline frames.
  for (const town of towns) {
    const depth = town.venues >= 5 ? frameOrder.length : town.venues >= 2 ? 6 : 3;
    for (const frame of frameOrder.slice(0, depth)) {
      add(question(QUESTION_FRAMES[frame].replace('{town}', town.name).replace('{qualifier}', ''), {
        dimension: 'town_x_frame', town: town.slug, frame, activity: frameActivity(frame), audience: null, season: null,
      }));
    }
  }

  // 2. Town × audience, on the towns with enough venues to answer well.
  for (const town of towns.filter((t) => t.venues >= 3)) {
    for (const audience of vocab.audiences) {
      add(question(QUESTION_FRAMES.things_to_do.replace('{town}', town.name).replace('{qualifier}', ` ${audience.label}`), {
        dimension: 'town_x_audience', town: town.slug, frame: 'things_to_do', activity: null, audience: audience.key, season: null,
      }));
    }
  }

  // 3. Town × season.
  for (const town of towns.filter((t) => t.venues >= 2)) {
    for (const season of vocab.seasons) {
      add(question(QUESTION_FRAMES.things_to_do.replace('{town}', town.name).replace('{qualifier}', ` ${season.label}`), {
        dimension: 'town_x_season', town: town.slug, frame: 'things_to_do', activity: null, audience: null, season: season.key,
      }));
    }
  }

  // 4. Region-wide activity × audience questions, the ones with the most demand.
  for (const activity of vocab.activities) {
    for (const audience of vocab.audiences) {
      add(question(`Where can we ${activity.label} on the Mornington Peninsula ${audience.label}?`, {
        dimension: 'activity_x_audience', town: null, frame: 'region', activity: activity.key, audience: audience.key, season: null,
      }));
    }
    for (const season of vocab.seasons) {
      add(question(`Where can we ${activity.label} on the Mornington Peninsula ${season.label}?`, {
        dimension: 'activity_x_season', town: null, frame: 'region', activity: activity.key, audience: null, season: season.key,
      }));
    }
  }

  // 5. Practical planning questions people actually ask an assistant.
  const practical = [
    'How far is the Mornington Peninsula from Melbourne?',
    'How many days do you need on the Mornington Peninsula?',
    'What is the best time of year to visit the Mornington Peninsula?',
    'Where should we stop on a one-day Mornington Peninsula itinerary?',
    'Is the Mornington Peninsula worth visiting with kids?',
    'What can we do on the Mornington Peninsula when it rains?',
    'Which Mornington Peninsula beaches are calm enough for young children?',
    'Do you need to book Mornington Peninsula wineries in advance?',
    'Which Mornington Peninsula towns are walkable without a car?',
    'What are the best hot springs on the Mornington Peninsula?',
    'Which Mornington Peninsula wineries do lunch as well as tastings?',
    'Where can I take my dog on the Mornington Peninsula?',
    'What markets run on the Mornington Peninsula and when?',
    'What is the difference between the bay beaches and the back beaches?',
    'Where are the quietest beaches on the Mornington Peninsula?',
  ];
  for (const q of practical) {
    add(question(q, { dimension: 'practical', town: null, frame: 'practical', activity: null, audience: null, season: null }));
  }

  // 6. Venue × attribute, for the venues the site models most completely.
  for (const venue of vocab.venues.filter((v) => v.hasSignature).slice(0, 40)) {
    add(question(`Is ${venue.name} worth visiting?`, {
      dimension: 'venue_x_attribute', town: venue.place, frame: 'practical', activity: null, audience: null, season: null, venue: venue.slug,
    }));
  }

  const questions = [...out.values()];
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    target,
    meetsTarget: questions.length >= target,
    counts: countBy(questions, 'dimension'),
    total: questions.length,
    questions,
  };
}

function frameActivity(frame) {
  return { eat: 'eat', cafe: 'cafe', wine: 'wine', beach: 'beach', walk: 'walk', stay: 'stay', event: 'event' }[frame] ?? null;
}

function countBy(items, key) {
  const out = {};
  for (const i of items) out[i[key]] = (out[i[key]] ?? 0) + 1;
  return out;
}

/**
 * Merge a freshly generated benchmark over stored state, keeping every prior
 * observation. The benchmark is memory, not a fresh list each run.
 */
export function mergeBenchmark(previous, next) {
  const prior = new Map((previous?.questions ?? []).map((q) => [q.id, q]));
  const questions = next.questions.map((q) => {
    const before = prior.get(q.id);
    if (!before) return { ...q, firstSeenAt: next.generatedAt };
    return {
      ...q,
      measurement: before.measurement ?? q.measurement,
      observations: before.observations ?? [],
      coverage: before.coverage ?? null,
      firstSeenAt: before.firstSeenAt ?? next.generatedAt,
      lastDiscoveryAttemptAt: before.lastDiscoveryAttemptAt ?? null,
    };
  });
  const retired = [...prior.keys()].filter((id) => !next.questions.some((q) => q.id === id));
  return { ...next, questions, retiredCount: retired.length };
}

/**
 * Site-side coverage for each benchmark question: which Peninsula Insider page,
 * if any, is the best current answer. This is INFERRED coverage — it says the
 * site has an answer, not that any AI assistant surfaced it.
 */
export async function assessCoverage(benchmark, pages, service, { limit = null } = {}) {
  const candidates = Object.values(pages).filter(
    (p) => p.indexable && !['redirect-stub', 'utility'].includes(p.pageType) && p.wordCount > 150,
  );
  // Oldest/unassessed first; never discard the unselected persistent questions.
  const ordered = [...benchmark.questions].sort((a, b) =>
    (Date.parse(a.coverage?.assessedAt) || 0) - (Date.parse(b.coverage?.assessedAt) || 0));
  const questions = limit ? ordered.slice(0, limit) : ordered;

  const inputs = questions.map((q) => {
    const best = bestCandidate(q, candidates);
    return {
      query: q.query,
      pageTitle: best?.title ?? null,
      pageH1: best?.h1 ?? null,
      pageHeadings: (best?.headings ?? []).slice(0, 12).map((h) => h.text).join(' '),
      _urlPath: best?.urlPath ?? null,
    };
  });

  const records = await service.decideBatch('query.page_fit', inputs.map(({ _urlPath, ...rest }) => rest));

  const assessed = questions.map((q, i) => ({
    ...q,
    measurement: q.observations?.length ? q.measurement : MEASUREMENT_STATES.INFERRED,
    coverage: {
      bestPage: inputs[i]._urlPath,
      fit: records[i].value?.fit ?? 'none',
      score: records[i].value?.score ?? 0,
      provider: records[i].provider,
      confidence: records[i].confidence,
      assessedAt: records[i].decidedAt,
    },
  }));

  const byFit = countBy(assessed.map((q) => ({ f: q.coverage.fit })), 'f');
  const updates = new Map(assessed.map(q => [q.id, q]));
  return {
    ...benchmark,
    total: benchmark.questions.length,
    questions: benchmark.questions.map(q => updates.get(q.id) ?? q),
    coverageSummary: {
      assessed: assessed.length,
      byFit,
      answeredWell: assessed.filter((q) => q.coverage.fit === 'good').length,
      uncovered: assessed.filter((q) => ['poor', 'none'].includes(q.coverage.fit)).length,
      note: 'Coverage is inferred from this site\'s own pages. It is not a measurement of AI assistant answers.',
    },
  };
}

/** Cheap lexical shortlist; the decision layer judges the fit of the winner. */
function bestCandidate(q, candidates) {
  const terms = q.query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 3);
  let best = null;
  let bestScore = 0;
  for (const page of candidates) {
    const hay = `${page.title ?? ''} ${page.h1 ?? ''} ${page.urlPath}`.toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += 1;
    if (q.town && (page.towns ?? []).includes(q.town)) score += 1.5;
    if (score > bestScore) { bestScore = score; best = page; }
  }
  return bestScore > 0 ? best : null;
}
