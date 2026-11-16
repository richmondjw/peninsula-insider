// Page-level SEO/GEO scoring.
//
// Component scores are kept separate on purpose. A recommendation is only
// useful if it can name which component produced it, so there is no single
// hidden aggregate: `composite` exists for ranking, and every part that fed it
// stays on the record.

import { clamp, round } from './util.mjs';

const SCOREABLE = new Set(['home', 'hub', 'guide', 'article', 'venue-or-guide', 'place', 'place-or-guide', 'itinerary', 'event', 'tour', 'quick-note', 'page']);

export function scoreablePages(pages) {
  return Object.values(pages).filter((p) => p.indexable && SCOREABLE.has(p.pageType));
}

export async function scorePages(pages, service, { logger, only = null } = {}) {
  const targets = only ?? scoreablePages(pages);
  if (!targets.length) return { scored: 0, pages: {} };

  const baseInput = (p) => ({
    urlPath: p.urlPath,
    title: p.title,
    h1: p.h1,
    text: p.leadSentences.join(' ') + ' ' + (p.headings ?? []).map((h) => h.text).join('. '),
    leadSentences: p.leadSentences,
    headings: p.headings,
    wordCount: p.wordCount,
    towns: p.towns,
    venues: p.venues,
    schemaTypes: p.schemaTypes,
    pageType: p.pageType,
    daysSinceModified: p.daysSinceModified,
  });

  const inputs = targets.map(baseInput);

  const [locatable, explicit, entities, sections, specific, detail, intents, freshness] = await Promise.all([
    service.decideBatch('geo.primary_answer_locatable', inputs),
    service.decideBatch('geo.facts_are_explicit', inputs),
    service.decideBatch('geo.entities_unambiguous', inputs),
    service.decideBatch('geo.sections_independently_understandable', inputs),
    service.decideBatch('local.peninsula_specific', inputs),
    service.decideBatch('local.detail_beyond_generic', inputs),
    service.decideBatch('intent.dominant_intent', inputs),
    service.decideBatch('content.freshness_risk', inputs),
  ]);

  const satisfies = await service.decideBatch(
    'intent.page_satisfies_intent',
    targets.map((p, i) => ({ ...baseInput(p), intent: intents[i].value?.intent ?? 'informational' })),
  );

  const citation = await service.decideBatch(
    'geo.citation_readiness',
    targets.map((_, i) => ({
      answerLocatable: locatable[i].value?.score ?? 0,
      factsExplicit: explicit[i].value?.score ?? 0,
      entitiesUnambiguous: entities[i].value?.score ?? 0,
      sectionsIndependent: sections[i].value?.score ?? 0,
    })),
  );

  const out = {};
  targets.forEach((page, i) => {
    const components = {
      answerLocatable: locatable[i].value?.score ?? 0,
      factsExplicit: explicit[i].value?.score ?? 0,
      entitiesUnambiguous: entities[i].value?.score ?? 0,
      sectionsIndependent: sections[i].value?.score ?? 0,
      localSpecificity: specific[i].value?.score ?? 0,
      localDetail: detail[i].value?.score ?? 0,
      intentSatisfaction: satisfies[i].value?.score ?? 0,
      citationReadiness: citation[i].value?.score ?? 0,
      // Deterministic structural components, not model judgements.
      internalLinkSupport: clamp((page.incomingInternalCount ?? 0) / 12),
      technicalHealth: null, // filled by the orchestrator once findings are known
      schemaCoverage: clamp((page.schemaTypes?.length ?? 0) / 3),
    };

    const geo = round(
      components.answerLocatable * 0.2 + components.factsExplicit * 0.25
      + components.entitiesUnambiguous * 0.25 + components.sectionsIndependent * 0.15
      + components.schemaCoverage * 0.15, 3,
    );
    const seo = round(
      components.intentSatisfaction * 0.35 + components.localSpecificity * 0.25
      + components.internalLinkSupport * 0.2 + components.schemaCoverage * 0.2, 3,
    );

    out[page.urlPath] = {
      components,
      geoScore: geo,
      seoScore: seo,
      composite: round((geo + seo) / 2, 3),
      citationTier: citation[i].value?.tier ?? 'weak',
      intent: intents[i].value?.intent ?? 'unclear',
      intentSatisfied: satisfies[i].value?.satisfies ?? false,
      freshnessRisk: freshness[i].value?.risk ?? 'low',
      freshnessScore: freshness[i].value?.score ?? 0,
      provider: citation[i].provider,
      confidence: round(mean([
        locatable[i].confidence, explicit[i].confidence, entities[i].confidence,
        sections[i].confidence, specific[i].confidence, satisfies[i].confidence,
      ]), 3),
      scoredAt: new Date().toISOString(),
    };
  });

  logger?.info('scored pages', { count: targets.length });
  return { scored: targets.length, pages: out };
}

function mean(values) {
  const v = values.filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

export function scoreDistribution(scores) {
  const values = Object.values(scores);
  if (!values.length) return null;
  const pick = (k) => values.map((v) => v[k]).sort((a, b) => a - b);
  const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
  const geo = pick('geoScore');
  const seo = pick('seoScore');
  const tiers = values.reduce((acc, v) => { acc[v.citationTier] = (acc[v.citationTier] ?? 0) + 1; return acc; }, {});
  const fresh = values.reduce((acc, v) => { acc[v.freshnessRisk] = (acc[v.freshnessRisk] ?? 0) + 1; return acc; }, {});
  return {
    pages: values.length,
    geo: { p25: pct(geo, 0.25), median: pct(geo, 0.5), p75: pct(geo, 0.75) },
    seo: { p25: pct(seo, 0.25), median: pct(seo, 0.5), p75: pct(seo, 0.75) },
    citationTiers: tiers,
    freshnessRisk: fresh,
  };
}
