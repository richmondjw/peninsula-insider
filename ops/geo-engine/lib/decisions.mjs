// Atomic decisions.
//
// Every entry is one narrow question with a typed answer. Nothing here asks
// "is this page good for SEO?" — decisions are decomposed so a recommendation
// can always be explained by the components that produced it.
//
// Each decision ships a deterministic rule. The rule is what runs when no
// model provider is configured, and it is also the schema conformance test for
// any provider that is: a provider answer that does not validate is discarded
// in favour of the rule.

import { DecisionRegistry } from './jev.mjs';
import { clamp, round } from './util.mjs';
import { loadVocabulary } from './vocab.mjs';

const conf = (v) => ({ value: v.value, confidence: v.confidence, rationale: v.rationale });

const SCORE = (max = 1) => ({ type: 'number', min: 0, max });

/** Words that signal generic travel filler rather than local knowledge. */
const GENERIC_MARKERS = [
  'nestled in', 'hidden gem waiting', 'something for everyone', 'a feast for the senses',
  'whether you are looking', 'look no further', 'breathtaking views await', 'bucket list',
  'must-visit destination', 'picture-perfect',
];

/** Concrete-fact markers: addresses, hours, prices, distances, dates. */
const FACT_PATTERNS = [
  /\b\d{1,4}\s+[A-Z][a-z]+\s+(Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Highway|Hwy|Parade|Pde|Lane|Ln|Terrace|Tce)\b/,
  /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i,
  /\$\s?\d/,
  /\b\d+\s?(km|kilometres|kilometers|metres|m|minutes|mins|hours|hrs)\b/i,
  /\bVIC\s?3\d{3}\b/,
  /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/,
  /\b(19|20)\d{2}\b/,
  /\b\+?61\s?\d|\(0\d\)\s?\d/,
];

export function factDensity(text) {
  const sample = String(text);
  const hits = FACT_PATTERNS.reduce((n, re) => n + (re.test(sample) ? 1 : 0), 0);
  return hits / FACT_PATTERNS.length;
}

export function genericMarkerCount(text) {
  const lower = String(text).toLowerCase();
  return GENERIC_MARKERS.reduce((n, phrase) => n + (lower.includes(phrase) ? 1 : 0), 0);
}

export function buildRegistry(vocab = loadVocabulary()) {
  const registry = new DecisionRegistry();

  // ---------------------------------------------------------------- GEO ----

  registry.register(
    'geo.primary_answer_locatable',
    {
      question: 'Given a page, can an AI assistant identify the single primary answer the page provides within its first few sentences and headings?',
      fields: { locatable: { type: 'boolean' }, score: SCORE() },
    },
    (input) => {
      // An answerable page states its answer early and heads its sections
      // descriptively. Lead paragraph length and heading shape are the signals.
      const lead = (input.leadSentences ?? []).slice(0, 3).join(' ');
      const leadWords = lead.split(/\s+/).filter(Boolean).length;
      const descriptive = (input.headings ?? []).filter((h) => h.level >= 2 && h.text.split(/\s+/).length >= 2).length;
      const hasH1 = (input.headings ?? []).some((h) => h.level === 1);
      let score = 0;
      if (leadWords >= 15 && leadWords <= 120) score += 0.4;
      else if (leadWords > 0) score += 0.15;
      if (hasH1) score += 0.2;
      score += clamp(descriptive / 8) * 0.4;
      return conf({
        value: { locatable: score >= 0.55, score: round(score) },
        confidence: 0.62,
        rationale: `lead ${leadWords}w, ${descriptive} descriptive subheadings, h1=${hasH1}`,
      });
    },
  );

  registry.register(
    'geo.facts_are_explicit',
    {
      question: 'Does the page state checkable facts (addresses, hours, prices, distances, dates) explicitly rather than gesturing at them?',
      fields: { explicit: { type: 'boolean' }, score: SCORE() },
    },
    (input) => {
      const density = factDensity(input.text ?? '');
      const generic = genericMarkerCount(input.text ?? '');
      const score = clamp(density - generic * 0.12);
      return conf({
        value: { explicit: score >= 0.4, score: round(score) },
        confidence: 0.6,
        rationale: `fact-pattern coverage ${round(density, 2)}, ${generic} generic-travel phrases`,
      });
    },
  );

  registry.register(
    'geo.entities_unambiguous',
    {
      question: 'Are the local entities on the page (towns, venues) named unambiguously enough for an AI system to resolve them?',
      fields: { unambiguous: { type: 'boolean' }, score: SCORE(), entityCount: { type: 'number', min: 0, max: 500 } },
    },
    (input) => {
      const towns = input.towns ?? [];
      const venues = input.venues ?? [];
      const count = towns.length + venues.length;
      const hasPlaceSchema = (input.schemaTypes ?? []).some((t) => /Place|LocalBusiness|Restaurant|TouristAttraction|Event/.test(t));
      // Naming entities is necessary; schema makes them machine-resolvable.
      let score = clamp(count / 12) * 0.6 + (hasPlaceSchema ? 0.4 : 0);
      if (count === 0) score = 0;
      return conf({
        value: { unambiguous: score >= 0.5, score: round(score), entityCount: count },
        confidence: 0.66,
        rationale: `${towns.length} towns, ${venues.length} venues, place-schema=${hasPlaceSchema}`,
      });
    },
  );

  registry.register(
    'geo.sections_independently_understandable',
    {
      question: 'Can each section of the page be lifted out and still make sense on its own, as a citable passage?',
      fields: { independent: { type: 'boolean' }, score: SCORE() },
    },
    (input) => {
      const subheads = (input.headings ?? []).filter((h) => h.level >= 2).length;
      const words = input.wordCount ?? 0;
      if (!words) return conf({ value: { independent: false, score: 0 }, confidence: 0.7, rationale: 'no body text' });
      const wordsPerSection = subheads ? words / subheads : words;
      // 120-450 words per section reads as a self-contained passage.
      let score;
      if (!subheads) score = 0.1;
      else if (wordsPerSection >= 120 && wordsPerSection <= 450) score = 0.9;
      else if (wordsPerSection < 120) score = 0.45;
      else score = clamp(450 / wordsPerSection) * 0.8;
      return conf({
        value: { independent: score >= 0.5, score: round(score) },
        confidence: 0.58,
        rationale: `${subheads} sections, ~${Math.round(wordsPerSection)} words each`,
      });
    },
  );

  registry.register(
    'geo.citation_readiness',
    {
      question: 'How likely is an AI assistant to cite this page as the source for a Mornington Peninsula question?',
      fields: { tier: { type: 'enum', values: ['strong', 'workable', 'weak'] }, score: SCORE() },
    },
    (input) => {
      // Composed of the already-atomic GEO components, not re-judged from scratch.
      const parts = [
        (input.answerLocatable ?? 0) * 0.25,
        (input.factsExplicit ?? 0) * 0.3,
        (input.entitiesUnambiguous ?? 0) * 0.25,
        (input.sectionsIndependent ?? 0) * 0.2,
      ];
      const score = clamp(parts.reduce((a, b) => a + b, 0));
      const tier = score >= 0.7 ? 'strong' : score >= 0.45 ? 'workable' : 'weak';
      return conf({ value: { tier, score: round(score) }, confidence: 0.6, rationale: `composite of four GEO components` });
    },
  );

  // ------------------------------------------------------ LOCAL AUTHORITY --

  registry.register(
    'local.peninsula_specific',
    {
      question: 'Is this page genuinely about the Mornington Peninsula, as opposed to generic travel content with a Peninsula label?',
      fields: { specific: { type: 'boolean' }, score: SCORE() },
    },
    (input) => {
      const towns = (input.towns ?? []).length;
      const venues = (input.venues ?? []).length;
      const words = Math.max(input.wordCount ?? 0, 1);
      // Local entity mentions per 500 words, rather than a raw count, so long
      // pages are not flattered by length alone.
      const density = ((towns * 1.0) + (venues * 1.5)) / (words / 500);
      const generic = genericMarkerCount(input.text ?? '');
      const score = clamp(density / 6 - generic * 0.1);
      return conf({
        value: { specific: score >= 0.4, score: round(score) },
        confidence: 0.64,
        rationale: `${round(density, 2)} local entity mentions per 500 words, ${generic} generic phrases`,
      });
    },
  );

  registry.register(
    'local.detail_beyond_generic',
    {
      question: 'Does the page add local detail a visitor could not get from a generic travel article?',
      fields: { adds_detail: { type: 'boolean' }, score: SCORE() },
    },
    (input) => {
      const density = factDensity(input.text ?? '');
      const generic = genericMarkerCount(input.text ?? '');
      const venues = (input.venues ?? []).length;
      const score = clamp(density * 0.5 + clamp(venues / 8) * 0.5 - generic * 0.15);
      return conf({
        value: { adds_detail: score >= 0.45, score: round(score) },
        confidence: 0.55,
        rationale: `facts ${round(density, 2)}, ${venues} named venues, ${generic} generic phrases`,
      });
    },
  );

  // -------------------------------------------------------------- INTENT --

  registry.register(
    'intent.dominant_intent',
    {
      question: 'What is the dominant search intent this page serves?',
      fields: {
        intent: { type: 'enum', values: ['informational', 'navigational', 'transactional', 'local_discovery', 'planning', 'unclear'] },
      },
    },
    (input) => {
      const t = `${input.title ?? ''} ${input.h1 ?? ''} ${input.urlPath ?? ''}`.toLowerCase();
      let intent = 'informational';
      let confidence = 0.5;
      if (/\b(book|booking|tickets|buy|pass|package|hire)\b/.test(t)) { intent = 'transactional'; confidence = 0.7; }
      else if (/\b(itinerary|plan|weekend|day trip|guide to|how to)\b/.test(t)) { intent = 'planning'; confidence = 0.68; }
      else if (/\b(best|top|where to|near|things to do|what's on|whats on)\b/.test(t)) { intent = 'local_discovery'; confidence = 0.72; }
      else if (/\b(about|contact|privacy|terms|careers|newsletter|account)\b/.test(t)) { intent = 'navigational'; confidence = 0.8; }
      else if (!t.trim()) { intent = 'unclear'; confidence = 0.9; }
      return conf({ value: { intent }, confidence, rationale: `matched on title/url tokens` });
    },
  );

  registry.register(
    'intent.page_satisfies_intent',
    {
      question: 'Does the page body actually satisfy the intent its title promises?',
      fields: { satisfies: { type: 'boolean' }, score: SCORE() },
    },
    (input) => {
      const words = input.wordCount ?? 0;
      const intent = input.intent ?? 'informational';
      // Minimum substance a page needs to deliver on each promise.
      const floors = { local_discovery: 500, planning: 600, informational: 350, transactional: 200, navigational: 80, unclear: 200 };
      const floor = floors[intent] ?? 350;
      const listish = (input.headings ?? []).filter((h) => h.level >= 2).length;
      let score = clamp(words / floor) * 0.7;
      if (intent === 'local_discovery' || intent === 'planning') score += clamp(listish / 6) * 0.3;
      else score += listish > 0 ? 0.2 : 0;
      score = clamp(score);
      return conf({
        value: { satisfies: score >= 0.6, score: round(score) },
        confidence: 0.55,
        rationale: `${words}w against a ${floor}w floor for ${intent}, ${listish} sections`,
      });
    },
  );

  // --------------------------------------------------------------- RISK ---

  registry.register(
    'content.freshness_risk',
    {
      question: 'How likely is it that information on this page has gone stale and now misleads a reader?',
      fields: { risk: { type: 'enum', values: ['high', 'medium', 'low'] }, score: SCORE() },
    },
    (input) => {
      const age = input.daysSinceModified;
      const perishable = /\b(hours|opening|price|prices|\$|ticket|book|season|this weekend|2024|2025|2026|closed|menu)\b/i.test(input.text ?? '');
      const isEvent = input.pageType === 'event';
      let score = 0;
      if (Number.isFinite(age)) score += clamp(age / 540) * 0.6;
      else score += 0.25; // unknown modified date is itself a risk
      if (perishable) score += 0.25;
      if (isEvent) score += 0.2;
      if (input.eventEnded) score = Math.max(score, 0.85);
      score = clamp(score);
      const risk = score >= 0.65 ? 'high' : score >= 0.35 ? 'medium' : 'low';
      return conf({
        value: { risk, score: round(score) },
        confidence: Number.isFinite(age) ? 0.6 : 0.4,
        rationale: `age=${age ?? 'unknown'}d, perishable=${perishable}, eventEnded=${Boolean(input.eventEnded)}`,
      });
    },
  );

  registry.register(
    'technical.issue_severity',
    {
      question: 'Is this technical finding material enough to act on, or is it noise?',
      fields: { severity: { type: 'enum', values: ['critical', 'major', 'minor', 'noise'] } },
    },
    (input) => {
      // Severity is a property of the rule that fired, weighted by whether the
      // page has search value worth protecting.
      const base = {
        missing_title: 'critical', missing_canonical: 'major', noindex_in_sitemap: 'critical',
        duplicate_title: 'major', duplicate_meta_description: 'minor', missing_meta_description: 'major',
        missing_h1: 'major', multiple_h1: 'minor', heading_skip: 'minor',
        missing_alt: 'minor', broken_internal_link: 'critical', orphan_page: 'major',
        invalid_jsonld: 'major', not_in_sitemap: 'minor', thin_content: 'major',
        title_too_long: 'minor', title_too_short: 'minor', meta_description_length: 'minor',
        canonical_mismatch: 'major', no_schema: 'minor',
      }[input.rule] ?? 'minor';
      const order = ['noise', 'minor', 'major', 'critical'];
      let idx = order.indexOf(base);
      // Demote findings on pages with no demonstrated search value.
      if ((input.impressions ?? 0) === 0 && input.hasSearchData && idx > 1) idx -= 1;
      return conf({ value: { severity: order[idx] }, confidence: 0.8, rationale: `rule ${input.rule}` });
    },
  );

  registry.register(
    'risk.autofix_safety',
    {
      question: 'Can this proposed change be applied automatically without risking editorial meaning or factual accuracy?',
      fields: {
        decision: { type: 'enum', values: ['auto_safe', 'needs_validation', 'human_only'] },
        reversible: { type: 'boolean' },
      },
    },
    (input) => {
      // The allowlist is deliberately narrow: deterministic, reversible edits
      // that reuse facts already present in the repository.
      const autoSafe = new Set(['fix_broken_internal_link', 'add_missing_alt_from_known_caption', 'sitemap_include', 'sitemap_remove_noindex', 'fix_malformed_jsonld']);
      const needsValidation = new Set(['add_missing_meta_description', 'add_breadcrumb_schema', 'add_internal_link']);
      let decision = 'human_only';
      if (autoSafe.has(input.action)) decision = 'auto_safe';
      else if (needsValidation.has(input.action)) decision = 'needs_validation';
      if (input.altersEditorialProse) decision = 'human_only';
      if (input.introducesNewFact) decision = 'human_only';
      return conf({
        value: { decision, reversible: decision !== 'human_only' },
        confidence: 0.88,
        rationale: `action=${input.action}`,
      });
    },
  );

  // ------------------------------------------------------- INTERNAL LINKS --

  registry.register(
    'link.editorially_legitimate',
    {
      question: 'Would linking the source page to the target page help a reader and express a real relationship, rather than merely sharing keywords?',
      fields: {
        legitimate: { type: 'boolean' },
        relationship: { type: 'enum', values: ['located_in', 'features', 'held_at', 'same_town', 'same_activity', 'planning_next_step', 'none'] },
        score: SCORE(),
      },
    },
    (input) => {
      // A shared town alone is not a reason to link; a modelled relationship is.
      const rel = input.relationship ?? 'none';
      const strong = new Set(['located_in', 'features', 'held_at', 'planning_next_step']);
      const weak = new Set(['same_town', 'same_activity']);
      let score = 0;
      if (strong.has(rel)) score = 0.8;
      else if (weak.has(rel)) score = 0.35;
      // Reward a target that is under-linked, penalise an already saturated one.
      const inbound = input.targetInboundLinks ?? 0;
      if (inbound === 0) score += 0.15;
      else if (inbound > 25) score -= 0.2;
      if (input.alreadyLinked) score = 0;
      if (input.sameUrl) score = 0;
      score = clamp(score);
      return conf({
        value: { legitimate: score >= 0.6, relationship: rel, score: round(score) },
        confidence: strong.has(rel) ? 0.75 : 0.5,
        rationale: `relationship=${rel}, target inbound=${inbound}`,
      });
    },
  );

  // -------------------------------------------------------------- QUERIES --

  registry.register(
    'query.classification',
    {
      question: 'Classify a search or AI-assistant query by intent, local scope and commercial value.',
      fields: {
        intent: { type: 'enum', values: ['informational', 'navigational', 'transactional', 'local_discovery', 'planning'] },
        local_scope: { type: 'enum', values: ['town', 'region', 'venue', 'none'] },
        commercial_value: { type: 'enum', values: ['high', 'medium', 'low'] },
        activity: { type: 'enum', values: [...ACTIVITY_KEYS, 'none'] },
      },
    },
    (input) => {
      const q = String(input.query ?? '').toLowerCase();
      const townHit = [...vocab.townByName.keys()].some((n) => n.length > 3 && q.includes(n));
      const venueHit = vocab.venues.some((v) => v.name.length > 6 && q.includes(v.name.toLowerCase()));
      const activity = vocab.activities.find((a) => a.terms.some((t) => q.includes(t)))?.key ?? 'none';

      let intent = 'informational';
      if (/\b(book|price|cost|tickets|deal|hire|package)\b/.test(q)) intent = 'transactional';
      else if (/\b(itinerary|plan|weekend|day trip|how many days)\b/.test(q)) intent = 'planning';
      else if (/\b(best|top|where|near|things to do|what's on|whats on|recommend)\b/.test(q)) intent = 'local_discovery';
      else if (/\bpeninsula insider\b/.test(q)) intent = 'navigational';

      const local_scope = venueHit ? 'venue' : townHit ? 'town' : /peninsula|mornington/.test(q) ? 'region' : 'none';
      const commercial_value = intent === 'transactional' ? 'high'
        : (['eat', 'stay', 'wine', 'wellness'].includes(activity) ? 'high'
          : activity === 'none' ? 'low' : 'medium');

      return conf({
        value: { intent, local_scope, commercial_value, activity },
        confidence: 0.6,
        rationale: `tokens: intent=${intent}, scope=${local_scope}, activity=${activity}`,
      });
    },
  );

  registry.register(
    'query.page_fit',
    {
      question: 'Does the candidate page actually answer this query, or does the site need different coverage?',
      fields: {
        fit: { type: 'enum', values: ['good', 'partial', 'poor', 'none'] },
        score: SCORE(),
      },
    },
    (input) => {
      const q = new Set(tokens(input.query ?? ''));
      const p = new Set(tokens(`${input.pageTitle ?? ''} ${input.pageH1 ?? ''} ${input.pageHeadings ?? ''}`));
      if (!input.pageTitle) return conf({ value: { fit: 'none', score: 0 }, confidence: 0.9, rationale: 'no candidate page' });
      let overlap = 0;
      for (const t of q) if (p.has(t)) overlap += 1;
      const score = q.size ? clamp(overlap / q.size) : 0;
      const fit = score >= 0.6 ? 'good' : score >= 0.35 ? 'partial' : 'poor';
      return conf({ value: { fit, score: round(score) }, confidence: 0.5, rationale: `${overlap}/${q.size} query terms covered by page headings` });
    },
  );

  // ----------------------------------------------------------- GAPS -------

  registry.register(
    'gap.worth_creating',
    {
      question: 'Is this content gap worth filling with a new page, given existing coverage and real local substance?',
      fields: {
        verdict: { type: 'enum', values: ['create', 'extend_existing', 'watch', 'ignore'] },
        score: SCORE(),
      },
    },
    (input) => {
      // A gap is only worth a page when the site has the underlying local
      // substance to write it truthfully and nothing already covers it well.
      const substance = input.supportingEntities ?? 0;
      const bestFit = input.bestExistingFit ?? 0;
      const demand = clamp((input.demandSignal ?? 0));
      let score = clamp(demand * 0.45 + clamp(substance / 6) * 0.35 + (1 - bestFit) * 0.2);
      let verdict;
      if (bestFit >= 0.6) verdict = 'extend_existing';
      else if (substance < 2) verdict = 'ignore';
      else if (score >= 0.55) verdict = 'create';
      else verdict = 'watch';
      return conf({
        value: { verdict, score: round(score) },
        confidence: 0.5,
        rationale: `demand=${round(demand, 2)}, ${substance} supporting entities, best existing fit=${round(bestFit, 2)}`,
      });
    },
  );

  return registry;
}

const ACTIVITY_KEYS = ['eat', 'cafe', 'wine', 'beer', 'beach', 'walk', 'stay', 'wellness', 'event', 'shop', 'nature', 'activity'];

const STOPWORDS = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'what', 'where', 'how', 'can', 'we', 'i', 'you', 'my', 'with', 'near', 'best', 'good', 'some', 'do', 'be', 'should', 'there', 'it']);

export function tokens(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}
