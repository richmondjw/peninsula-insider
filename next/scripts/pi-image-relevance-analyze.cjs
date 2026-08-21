/**
 * pi-image-relevance-analyze.cjs
 * Analyze extracted image metadata for relevance and duplicate collisions.
 */
const fs = require('fs');
const path = require('path');

const ROOT = '/home/node/.openclaw/workspace/peninsula-insider';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, '.pi-autofix/image-relevance-extract.json'), 'utf8'));

const now = new Date('2026-06-23T21:00:00Z');
const melbourneNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));

function isActiveEvent(e) {
  if (e.status === 'archived' || e.status === 'draft') return false;
  if (['weekly', 'monthly', 'ongoing'].includes(e.recurrence)) return true;
  const end = e.endDate ? new Date(e.endDate) : e.startDate ? new Date(e.startDate) : null;
  return end && end >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
}

// Category-to-expected-image-semantics mapping
const categorySemantics = {
  market: { expected: ['market', 'stall', 'produce', 'farmers market', 'maker'], label: 'market / produce' },
  'food-wine': { expected: ['wine', 'vineyard', 'cellar door', 'food', 'dining', 'restaurant'], label: 'food & wine' },
  wellness: { expected: ['spa', 'thermal', 'pool', 'bath', 'wellness', 'hot springs'], label: 'wellness / thermal' },
  'live-music': { expected: ['music', 'stage', 'performer', 'concert', 'live music'], label: 'live music' },
  festival: { expected: ['festival', 'crowd', 'stage', 'event', 'performance'], label: 'festival' },
  'family-programs': { expected: ['kids', 'family', 'children', 'activity', 'workshop'], label: 'family / kids activity' },
  nature: { expected: ['bushland', 'nature', 'wildlife', 'reserve', 'trail'], label: 'nature / wildlife' },
  'racing-sport': { expected: ['sport', 'race', 'golf', 'running', 'course'], label: 'sport / racing' },
  arts: { expected: ['art', 'gallery', 'exhibition', 'performance'], label: 'arts' },
  exhibition: { expected: ['gallery', 'art', 'exhibition'], label: 'exhibition' },
  civic: { expected: ['memorial', 'service', 'ceremony', 'civic'], label: 'civic' },
  community: { expected: ['community', 'local', 'market', 'gathering'], label: 'community' },
  'cellar-door': { expected: ['cellar door', 'wine', 'tasting', 'vineyard'], label: 'cellar door' },
};

function scoreEventRelevance(e) {
  const title = (e.title || '').toLowerCase();
  const alt = (e.alt || '').toLowerCase();
  const src = (e.src || '').toLowerCase();
  const cat = e.category;
  const sem = categorySemantics[cat];
  if (!sem) return { score: 'medium', reason: 'No category semantics defined' };
  const text = title + ' ' + alt + ' ' + src;
  const hits = sem.expected.filter((kw) => text.includes(kw));
  // Special cases for obvious mismatches
  const lowSignals = [
    { test: cat === 'market' && (src.includes('place-') && !src.includes('market')), reason: 'market event using place landscape instead of market imagery' },
    { test: cat === 'family-programs' && (src.includes('cafe') || src.includes('place-')), reason: 'family program using generic cafe/place image' },
    { test: cat === 'wellness' && (src.includes('place-') || src.includes('category-winery') || src.includes('category-market')), reason: 'wellness event using non-wellness image' },
    { test: cat === 'nature' && src.includes('place-cape-schanck-01'), reason: 'nature event using Cape Schanck place image' },
    { test: title.includes('chocolat') && !text.includes('chocolate') && !text.includes('confection'), reason: 'chocolatier event with no chocolate visual signal' },
    { test: title.includes('gin') && !text.includes('gin') && !text.includes('distill') && !text.includes('spirit'), reason: 'gin event with no gin/spirit visual signal' },
    { test: title.includes('truffle') && !text.includes('truffle') && !text.includes('hunt') && !text.includes('forest'), reason: 'truffle event with no truffle/hunt visual signal' },
  ];
  for (const s of lowSignals) {
    if (s.test) return { score: 'low', reason: s.reason };
  }
  if (hits.length >= 2) return { score: 'high', reason: `Strong semantic match: ${hits.join(', ')}` };
  if (hits.length === 1) return { score: 'medium', reason: `Weak semantic match: ${hits[0]}` };
  return { score: 'low', reason: `No expected ${sem.label} signals found` };
}

function scoreHubHero(surface, src, alt, title) {
  const text = (surface + ' ' + src + ' ' + alt + ' ' + title).toLowerCase();
  if (surface === 'whats-on-hub') {
    if (text.includes('winter') && text.includes('wine')) return { score: 'high', reason: 'winter wine theme matches What\'s On calendar' };
    return { score: 'medium', reason: 'generic wine/cellar door hub image' };
  }
  if (surface === 'journal-hub') {
    if (src.includes('journal-hub')) return { score: 'medium', reason: 'abstract journal texture, appropriate for hub' };
    return { score: 'medium', reason: 'journal hub hero' };
  }
  return { score: 'medium', reason: 'hub hero' };
}

function scoreHomepageSlide(slide) {
  const text = (slide.title + ' ' + slide.alt + ' ' + slide.src).toLowerCase();
  // Title-specific checks
  if (slide.title.toLowerCase().includes('sorrento solstice')) {
    return text.includes('sorrento') || text.includes('solstice') || text.includes('festival')
      ? { score: 'high', reason: 'Sorrento/solstice visual signal present' }
      : { score: 'low', reason: 'Sorrento Solstice slide lacks Sorrento/solstice visual' };
  }
  if (slide.title.toLowerCase().includes('flinders')) {
    return text.includes('flinders') || text.includes('pier')
      ? { score: 'high', reason: 'Flinders visual signal present' }
      : { score: 'medium', reason: 'Flinders weekend slide' };
  }
  if (slide.title.toLowerCase().includes('winter peninsula')) {
    return text.includes('winter') || text.includes('solstice') || text.includes('sorrento')
      ? { score: 'high', reason: 'winter Peninsula signal present' }
      : { score: 'medium', reason: 'winter Peninsula weekend slide' };
  }
  if (slide.title.toLowerCase().includes('late-afternoon walks') || slide.title.toLowerCase().includes('walks')) {
    return text.includes('walk') || text.includes('coastal') || text.includes('point nepean')
      ? { score: 'high', reason: 'walk signal present' }
      : { score: 'medium', reason: 'walks slide' };
  }
  if (slide.title.toLowerCase().includes('hatted restaurants')) {
    return text.includes('restaurant') || text.includes('dining') || text.includes('food')
      ? { score: 'medium', reason: 'restaurant signal present but image is generic' }
      : { score: 'low', reason: 'hatted restaurants slide with no restaurant visual' };
  }
  if (slide.title.toLowerCase().includes('cape schanck') || slide.title.toLowerCase().includes('lighthouse')) {
    return text.includes('cape schanck') || text.includes('lighthouse')
      ? { score: 'high', reason: 'Cape Schanck signal present' }
      : { score: 'medium', reason: 'Cape Schanck slide' };
  }
  return { score: 'medium', reason: 'homepage cover slide' };
}

// Active events
const activeEvents = data.events.filter(isActiveEvent);
const activeEventScores = activeEvents.map((e) => ({ ...e, ...scoreEventRelevance(e) }));

// Weekend picks
const weekendPickEvents = data.events.filter((e) => data.weekendPicks.slugs.includes(e.id));

// Homepage "On this weekend" rail events: events overlapping current dispatch weekend Jun 27-28
// The latest weekend-picker is peninsula-this-weekend-jun-27.md (published 2026-06-22)
const dispatchSat = new Date('2026-06-27T00:00:00+10:00');
const dispatchSun = new Date('2026-06-28T23:59:59+10:00');
function eventInWeekend(e) {
  const start = e.startDate ? new Date(e.startDate) : null;
  const end = e.endDate ? new Date(e.endDate) : start;
  const occ = e.nextOccurrence ? new Date(e.nextOccurrence) : null;
  const rangeOverlaps = start && start <= dispatchSun && end >= dispatchSat;
  const occurrenceIn = occ && occ >= dispatchSat && occ <= dispatchSun;
  return rangeOverlaps || occurrenceIn;
}
const homepageWeekendEvents = activeEvents.filter(eventInWeekend).slice(0, 8);

// What's On surfaces
const whatsOnSeasonal = activeEvents
  .filter((e) => e.category !== 'market')
  .filter((e) => ['annual', 'seasonal', 'ongoing'].includes(e.recurrence) || Boolean(e.season))
  .sort((a, b) => (b.visitorAppealScore ?? 0) - (a.visitorAppealScore ?? 0))
  .slice(0, 6);
const whatsOnMarkets = activeEvents
  .filter((e) => e.category === 'market')
  .sort((a, b) => (b.visitorAppealScore ?? 0) - (a.visitorAppealScore ?? 0))
  .slice(0, 6);

// Duplicates within active surfaces
function findDupes(items) {
  const bySrc = {};
  for (const item of items) {
    if (!item.src) continue;
    bySrc[item.src] = bySrc[item.src] || [];
    bySrc[item.src].push(item);
  }
  return Object.entries(bySrc).filter(([k, v]) => v.length > 1);
}

const homepageSlides = data.homepageImages.map((s) => ({ ...s, ...scoreHomepageSlide(s) }));
const hubHeroScores = data.hubHeroes.map((h) => ({ ...h, ...scoreHubHero(h.surface, h.src, h.alt, h.title) }));

const report = {
  generatedAt: now.toISOString(),
  melbourneTime: melbourneNow.toISOString(),
  summary: {
    totalEvents: data.events.length,
    activeEvents: activeEvents.length,
    activeLow: activeEventScores.filter((e) => e.score === 'low').length,
    activeMedium: activeEventScores.filter((e) => e.score === 'medium').length,
    activeHigh: activeEventScores.filter((e) => e.score === 'high').length,
    homepageSlides: homepageSlides.length,
    homepageLow: homepageSlides.filter((s) => s.score === 'low').length,
    homepageMedium: homepageSlides.filter((s) => s.score === 'medium').length,
    homepageHigh: homepageSlides.filter((s) => s.score === 'high').length,
  },
  homepage: {
    slides: homepageSlides,
    onThisWeekendRail: homepageWeekendEvents.map((e) => ({ id: e.id, title: e.title, src: e.src, alt: e.alt, ...scoreEventRelevance(e) })),
  },
  whatsOn: {
    hubHero: hubHeroScores.find((h) => h.surface === 'whats-on-hub'),
    seasonal: whatsOnSeasonal.map((e) => ({ id: e.id, title: e.title, category: e.category, src: e.src, alt: e.alt, ...scoreEventRelevance(e) })),
    markets: whatsOnMarkets.map((e) => ({ id: e.id, title: e.title, category: e.category, src: e.src, alt: e.alt, ...scoreEventRelevance(e) })),
  },
  journal: {
    hubHero: hubHeroScores.find((h) => h.surface === 'journal-hub'),
    featuredArticle: data.articles.find((a) => a.featured) || data.articles[0],
  },
  weekendPicks: weekendPickEvents.map((e) => ({ id: e.id, title: e.title, category: e.category, src: e.src, alt: e.alt, ...scoreEventRelevance(e) })),
  activeEventScores: activeEventScores.sort((a, b) => {
    const order = { low: 0, medium: 1, high: 2 };
    return order[a.score] - order[b.score];
  }),
  duplicates: {
    activeEvents: findDupes(activeEvents),
    whatsOnSurface: findDupes([...whatsOnSeasonal, ...whatsOnMarkets]),
    homepageRail: findDupes(homepageWeekendEvents),
    weekendPicks: findDupes(weekendPickEvents),
  },
};

const outPath = path.join(ROOT, '.pi-autofix', 'image-relevance-analysis.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
