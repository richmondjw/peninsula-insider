// The local knowledge graph.
//
// Peninsula Insider is modelled as a set of local entities and the relationships
// between them, not as a pile of articles. Every node and edge here is derived
// from the editorial content collections or from links that already exist on the
// site. Nothing is inferred into existence.

import { ORIGIN } from './util.mjs';
import { loadVocabulary } from './vocab.mjs';

export const ENTITY_TYPES = [
  'Town', 'Region', 'Venue', 'Restaurant', 'Cafe', 'Winery', 'Brewery', 'Distillery',
  'Bar', 'Beach', 'Walk', 'Park', 'Attraction', 'Event', 'Market', 'Accommodation',
  'Activity', 'Experience', 'Guide', 'Itinerary', 'Tour', 'Organisation', 'Season', 'Audience',
];

/** Venue `type` in the collections mapped onto graph entity types. */
const VENUE_TYPE_MAP = {
  restaurant: 'Restaurant', bistro: 'Restaurant', pub: 'Restaurant', dining: 'Restaurant',
  cafe: 'Cafe', bakery: 'Cafe', coffee: 'Cafe',
  winery: 'Winery', 'cellar-door': 'Winery', vineyard: 'Winery',
  brewery: 'Brewery', distillery: 'Distillery', bar: 'Bar',
  spa: 'Attraction', springs: 'Attraction', attraction: 'Attraction', gallery: 'Attraction',
  stay: 'Accommodation', hotel: 'Accommodation', accommodation: 'Accommodation',
  beach: 'Beach', walk: 'Walk', park: 'Park', market: 'Market',
};

export function buildGraph({ vocab = loadVocabulary(), pages = {} } = {}) {
  const nodes = new Map();
  const edges = [];

  const addNode = (id, type, props) => {
    if (!nodes.has(id)) nodes.set(id, { id, type, ...props, degree: 0 });
    return nodes.get(id);
  };
  const addEdge = (from, rel, to, evidence) => {
    if (!nodes.has(from) || !nodes.has(to) || from === to) return;
    edges.push({ from, rel, to, evidence });
    nodes.get(from).degree += 1;
    nodes.get(to).degree += 1;
  };

  for (const region of vocab.regions) addNode(`region:${region.slug}`, 'Region', { name: region.name });
  for (const town of vocab.towns) {
    addNode(`town:${town.slug}`, 'Town', { name: town.name, kind: town.kind, coordinates: town.coordinates });
  }
  for (const town of vocab.towns) {
    if (town.region) addEdge(`town:${town.slug}`, 'PART_OF', `region:${town.region}`, 'places collection');
  }

  for (const venue of vocab.venues) {
    const type = VENUE_TYPE_MAP[venue.type] ?? 'Venue';
    addNode(`venue:${venue.slug}`, type, {
      name: venue.name, venueType: venue.type, coordinates: venue.coordinates,
      hasAddress: Boolean(venue.address), hasPhone: Boolean(venue.phone),
      hasWebsite: Boolean(venue.website), hasHours: venue.hasHours,
      priceBand: venue.priceBand ?? null,
    });
    if (venue.place) addEdge(`venue:${venue.slug}`, 'LOCATED_IN', `town:${venue.place}`, 'venues collection');
  }

  for (const event of vocab.events) {
    addNode(`event:${event.slug}`, 'Event', {
      name: event.title, startDate: event.startDate, endDate: event.endDate,
      season: event.season, venueName: event.venueName, suburb: event.suburb,
    });
    // Events name their venue as free text; match it to a modelled venue.
    if (event.venueName) {
      const match = vocab.venues.find((v) => v.name.toLowerCase() === event.venueName.toLowerCase());
      if (match) addEdge(`event:${event.slug}`, 'HELD_AT', `venue:${match.slug}`, 'exact venue-name match');
    }
    if (event.suburb) {
      const town = vocab.townByName.get(event.suburb.toLowerCase());
      if (town) addEdge(`event:${event.slug}`, 'HELD_IN', `town:${town.slug}`, 'events collection suburb');
    }
  }

  for (const x of vocab.experiences) addNode(`experience:${x.slug}`, 'Experience', { name: x.name });
  for (const x of vocab.tours) addNode(`tour:${x.slug}`, 'Tour', { name: x.name });
  for (const x of vocab.itineraries) addNode(`itinerary:${x.slug}`, 'Itinerary', { name: x.name });

  // Pages are the surfaces that express entities. FEATURES edges come from the
  // entity mentions the inventory already recorded on each page.
  for (const page of Object.values(pages)) {
    if (page.pageType === 'redirect-stub' || page.pageType === 'utility') continue;
    const id = `page:${page.urlPath}`;
    addNode(id, pageEntityType(page.pageType), {
      name: page.title ?? page.urlPath, urlPath: page.urlPath, url: `${ORIGIN}${page.urlPath}`,
      pageType: page.pageType, wordCount: page.wordCount,
    });
    for (const slug of page.towns ?? []) addEdge(id, 'COVERS', `town:${slug}`, 'entity mention in page text');
    for (const slug of page.venues ?? []) addEdge(id, 'FEATURES', `venue:${slug}`, 'entity mention in page text');
  }

  return {
    nodes: Object.fromEntries(nodes),
    edges,
    stats: summarise(nodes, edges),
  };
}

function pageEntityType(pageType) {
  return {
    guide: 'Guide', itinerary: 'Itinerary', event: 'Event', article: 'Guide',
    tour: 'Tour', place: 'Town', 'place-or-guide': 'Guide', 'venue-or-guide': 'Guide',
    hub: 'Guide', home: 'Organisation', 'quick-note': 'Guide',
  }[pageType] ?? 'Guide';
}

function summarise(nodes, edges) {
  const byType = {};
  for (const n of nodes.values()) byType[n.type] = (byType[n.type] ?? 0) + 1;
  const byRel = {};
  for (const e of edges) byRel[e.rel] = (byRel[e.rel] ?? 0) + 1;
  const uncovered = [...nodes.values()].filter((n) => n.degree === 0);
  return {
    nodes: nodes.size,
    edges: edges.length,
    byType,
    byRelationship: byRel,
    unconnectedNodes: uncovered.length,
    unconnectedSample: uncovered.slice(0, 15).map((n) => ({ id: n.id, name: n.name })),
  };
}

/** Entities the site models but never surfaces on any page — coverage gaps. */
export function entityCoverage(graph) {
  const covered = { town: new Set(), venue: new Set(), event: new Set() };
  for (const edge of graph.edges) {
    if (!edge.from.startsWith('page:')) continue;
    const [kind, ...rest] = edge.to.split(':');
    if (covered[kind]) covered[kind].add(rest.join(':'));
  }
  const gaps = { towns: [], venues: [] };
  for (const [id, node] of Object.entries(graph.nodes)) {
    const [kind, ...rest] = id.split(':');
    const slug = rest.join(':');
    if (kind === 'town' && !covered.town.has(slug)) gaps.towns.push({ slug, name: node.name });
    if (kind === 'venue' && !covered.venue.has(slug)) gaps.venues.push({ slug, name: node.name, type: node.venueType });
  }
  return {
    townsCovered: covered.town.size,
    venuesCovered: covered.venue.size,
    townCoverageRate: graph.stats.byType.Town ? covered.town.size / graph.stats.byType.Town : 0,
    gaps,
  };
}
