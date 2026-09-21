// The internal link engine.
//
// Candidates come from modelled relationships in the knowledge graph, never
// from keyword overlap alone. Each candidate is then put to the decision layer
// one at a time, with the relationship named, so a link is only recommended
// when there is a concept that justifies it.

import { round } from './util.mjs';

/**
 * Propose link candidates from graph relationships.
 *
 *   page FEATURES venue  +  venue LOCATED_IN town   -> page should reach the town page
 *   page COVERS town     +  event HELD_IN town      -> town guide should reach the event
 *   venue page           ->  the guide that features it
 */
export function generateCandidates({ graph, pages, maxPerPage = 4, maxTotal = 400 }) {
  const townPage = new Map();
  const venuePage = new Map();
  const eventPage = new Map();

  // Which page is the canonical surface for each entity.
  for (const page of Object.values(pages)) {
    if (page.pageType === 'redirect-stub' || !page.indexable) continue;
    const slug = page.urlPath.split('/').filter(Boolean).pop();
    if (!slug) continue;
    if (graph.nodes[`town:${slug}`] && !townPage.has(slug)) townPage.set(slug, page.urlPath);
    if (graph.nodes[`venue:${slug}`] && !venuePage.has(slug)) venuePage.set(slug, page.urlPath);
    if (graph.nodes[`event:${slug}`] && !eventPage.has(slug)) eventPage.set(slug, page.urlPath);
  }

  const venueTown = new Map();
  const eventTown = new Map();
  const eventVenue = new Map();
  for (const edge of graph.edges) {
    if (edge.rel === 'LOCATED_IN') venueTown.set(edge.from.replace(/^venue:/, ''), edge.to.replace(/^town:/, ''));
    if (edge.rel === 'HELD_IN') eventTown.set(edge.from.replace(/^event:/, ''), edge.to.replace(/^town:/, ''));
    if (edge.rel === 'HELD_AT') eventVenue.set(edge.from.replace(/^event:/, ''), edge.to.replace(/^venue:/, ''));
  }

  const inbound = new Map();
  for (const page of Object.values(pages)) inbound.set(page.urlPath, page.incomingInternalCount ?? 0);

  const candidates = [];
  const seen = new Set();
  const perPage = new Map();

  const propose = (from, to, relationship, anchorConcept) => {
    if (!from || !to || from === to) return;
    if (candidates.length >= maxTotal) return;
    const key = `${from}->${to}`;
    if (seen.has(key)) return;
    const sourcePage = pages[from];
    const targetPage = pages[to];
    if (!sourcePage || !targetPage) return;
    if (targetPage.pageType === 'redirect-stub' || !targetPage.indexable) return;
    if ((sourcePage.outgoingInternal ?? []).some((l) => l.to === to)) return; // already linked
    if ((perPage.get(from) ?? 0) >= maxPerPage) return;
    seen.add(key);
    perPage.set(from, (perPage.get(from) ?? 0) + 1);
    candidates.push({
      sourceUrl: from,
      targetUrl: to,
      relationship,
      anchorConcept,
      targetInboundLinks: inbound.get(to) ?? 0,
      alreadyLinked: false,
      sameUrl: false,
    });
  };

  for (const edge of graph.edges) {
    if (candidates.length >= maxTotal) break;
    if (edge.rel !== 'FEATURES' || !edge.from.startsWith('page:')) continue;
    const from = edge.from.replace(/^page:/, '');
    const venueSlug = edge.to.replace(/^venue:/, '');

    // A page that features a venue should be able to reach that venue's page.
    const vp = venuePage.get(venueSlug);
    if (vp) propose(from, vp, 'features', graph.nodes[edge.to]?.name ?? venueSlug);

    // ...and the town that venue sits in.
    const townSlug = venueTown.get(venueSlug);
    if (townSlug) {
      const tp = townPage.get(townSlug);
      if (tp) propose(from, tp, 'located_in', graph.nodes[`town:${townSlug}`]?.name ?? townSlug);
    }
  }

  // Town pages should reach the events held in that town.
  for (const [eventSlug, townSlug] of eventTown) {
    if (candidates.length >= maxTotal) break;
    const ep = eventPage.get(eventSlug);
    const tp = townPage.get(townSlug);
    if (ep && tp) propose(tp, ep, 'held_at', graph.nodes[`event:${eventSlug}`]?.name ?? eventSlug);
  }

  // A venue page should reach the events it hosts.
  for (const [eventSlug, venueSlug] of eventVenue) {
    if (candidates.length >= maxTotal) break;
    const ep = eventPage.get(eventSlug);
    const vp = venuePage.get(venueSlug);
    if (ep && vp) propose(vp, ep, 'held_at', graph.nodes[`event:${eventSlug}`]?.name ?? eventSlug);
  }

  return candidates;
}

/** Put every candidate to the decision layer individually. */
export async function adjudicate(candidates, service) {
  if (!candidates.length) return { accepted: [], rejected: [], summary: { proposed: 0, accepted: 0 } };
  const records = await service.decideBatch('link.editorially_legitimate', candidates.map((c) => ({
    relationship: c.relationship,
    targetInboundLinks: c.targetInboundLinks,
    alreadyLinked: c.alreadyLinked,
    sameUrl: c.sameUrl,
    anchorConcept: c.anchorConcept,
  })));

  const accepted = [];
  const rejected = [];
  candidates.forEach((c, i) => {
    const r = records[i];
    const row = {
      sourceUrl: c.sourceUrl,
      targetUrl: c.targetUrl,
      relationship: r.value?.relationship ?? c.relationship,
      anchorConcept: c.anchorConcept,
      score: r.value?.score ?? 0,
      confidence: r.confidence,
      provider: r.provider,
      rationale: r.rationale,
      implemented: false,
      outcome: null,
      decidedAt: r.decidedAt,
    };
    if (r.value?.legitimate) accepted.push(row); else rejected.push(row);
  });

  accepted.sort((a, b) => (b.score * b.confidence) - (a.score * a.confidence));
  return {
    accepted,
    rejected,
    summary: {
      proposed: candidates.length,
      accepted: accepted.length,
      acceptanceRate: round(accepted.length / candidates.length, 3),
      byRelationship: accepted.reduce((acc, r) => { acc[r.relationship] = (acc[r.relationship] ?? 0) + 1; return acc; }, {}),
    },
  };
}
