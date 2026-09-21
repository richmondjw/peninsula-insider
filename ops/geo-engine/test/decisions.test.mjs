import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRegistry, factDensity, genericMarkerCount } from '../lib/decisions.mjs';
import { DecisionService, PROVIDERS, resolveProviderConfig, validateAgainstSchema } from '../lib/jev.mjs';

const registry = buildRegistry();

test('every registered decision satisfies its own declared schema', async () => {
  const service = new DecisionService({ registry, env: {}, cacheFile: '/dev/null' });
  const samples = {
    'geo.primary_answer_locatable': { leadSentences: ['A clear opening sentence about Sorrento that runs to a reasonable length for a lead.'], headings: [{ level: 1, text: 'Sorrento' }, { level: 2, text: 'Where to eat' }] },
    'geo.facts_are_explicit': { text: 'Open 9am to 5pm at 12 Ocean Road, Sorrento VIC 3943. Entry $25. Around 4 km from the pier.' },
    'geo.entities_unambiguous': { towns: ['sorrento'], venues: ['the-continental'], schemaTypes: ['Restaurant'] },
    'geo.sections_independently_understandable': { headings: [{ level: 2, text: 'A' }, { level: 2, text: 'B' }], wordCount: 600 },
    'geo.citation_readiness': { answerLocatable: 0.8, factsExplicit: 0.7, entitiesUnambiguous: 0.6, sectionsIndependent: 0.9 },
    'local.peninsula_specific': { towns: ['rye'], venues: ['alba'], wordCount: 500, text: 'Rye and Alba.' },
    'local.detail_beyond_generic': { text: 'Open 10am. $30 entry.', venues: ['alba', 'ten-minutes-by-tractor'] },
    'intent.dominant_intent': { title: 'Best restaurants in Sorrento', h1: 'Best restaurants', urlPath: '/eat/sorrento/' },
    'intent.page_satisfies_intent': { wordCount: 900, intent: 'local_discovery', headings: [{ level: 2, text: 'A' }] },
    'content.freshness_risk': { daysSinceModified: 400, text: 'Opening hours and prices', pageType: 'event' },
    'technical.issue_severity': { rule: 'broken_internal_link', impressions: 0, hasSearchData: false },
    'risk.autofix_safety': { action: 'fix_broken_internal_link' },
    'link.editorially_legitimate': { relationship: 'located_in', targetInboundLinks: 0 },
    'query.classification': { query: 'best wineries near red hill for lunch' },
    'query.page_fit': { query: 'wineries red hill', pageTitle: 'Red Hill wineries', pageH1: 'Red Hill', pageHeadings: 'wineries' },
    'gap.worth_creating': { demandSignal: 0.6, supportingEntities: 8, bestExistingFit: 0.1 },
  };

  for (const name of registry.names()) {
    assert.ok(Object.hasOwn(samples, name), `no sample input for ${name}`);
    const record = await service.decide(name, samples[name]);
    assert.equal(record.error, null, `${name} errored: ${record.error}`);
    assert.equal(record.provider, PROVIDERS.DETERMINISTIC);
    const check = validateAgainstSchema(registry.get(name).schema, record.value);
    assert.ok(check.ok, `${name} output failed schema: ${check.errors?.join('; ')}`);
    assert.ok(record.confidence >= 0 && record.confidence <= 1);
  }
});

test('schema validation rejects off-schema payloads', () => {
  const schema = { question: 'q', fields: { verdict: { type: 'enum', values: ['a', 'b'] }, score: { type: 'number', min: 0, max: 1 } } };
  assert.equal(validateAgainstSchema(schema, { verdict: 'a', score: 0.5 }).ok, true);
  assert.equal(validateAgainstSchema(schema, { verdict: 'c', score: 0.5 }).ok, false);
  assert.equal(validateAgainstSchema(schema, { verdict: 'a', score: 9 }).ok, false);
  assert.equal(validateAgainstSchema(schema, { verdict: 'a' }).ok, false);
  assert.equal(validateAgainstSchema(schema, null).ok, false);
});

test('provider resolution requires both Jev credentials', () => {
  assert.equal(resolveProviderConfig({}).primary, PROVIDERS.DETERMINISTIC);
  assert.equal(resolveProviderConfig({ JEV_ENDPOINT: 'https://x' }).primary, PROVIDERS.DETERMINISTIC);
  assert.equal(resolveProviderConfig({ JEV_ENDPOINT: 'https://x', JEV_API_KEY: 'k' }).primary, PROVIDERS.JEV);
  assert.equal(resolveProviderConfig({ PI_GEO_FRONTIER: 'on', ANTHROPIC_API_KEY: 'k' }).primary, PROVIDERS.FRONTIER);
});

test('a provider returning an off-schema answer falls back to rules', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ results: [{ severity: 'catastrophic' }] }), // not in the enum
  });
  const service = new DecisionService({
    registry, cacheFile: '/dev/null', fetchImpl,
    env: { JEV_ENDPOINT: 'https://jev.test', JEV_API_KEY: 'k' },
  });
  const record = await service.decide('technical.issue_severity', { rule: 'missing_title' });
  assert.equal(record.provider, PROVIDERS.DETERMINISTIC, 'must not accept the invalid model answer');
  assert.equal(record.value.severity, 'critical');
  assert.ok(service.usage.providerFailures.length >= 1, 'the provider failure must be recorded');
});

test('a provider returning a valid answer is used and reported as such', async () => {
  // TypeSafe answers one decision per request, typed per field.
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      model: 'jev-1.13.0',
      usage: { input_tokens: 500, output_tokens: 20 },
      answers: { severity: { type: 'choice', choice: 'minor', confidence: 0.95, probabilities: { critical: 0.01, major: 0.02, minor: 0.95, noise: 0.02 } } },
    }),
  });
  const service = new DecisionService({
    registry, cacheFile: '/dev/null', fetchImpl,
    env: { JEV_ENDPOINT: 'https://jev.test', JEV_API_KEY: 'k' },
  });
  const record = await service.decide('technical.issue_severity', { rule: 'missing_title' });
  assert.equal(record.provider, PROVIDERS.JEV);
  assert.equal(record.value.severity, 'minor');
  assert.equal(record.confidence, 0.95);
});

test('a failing probe demotes the service to deterministic rules', async () => {
  const fetchImpl = async () => { throw new Error('connection refused'); };
  const service = new DecisionService({
    registry, cacheFile: '/dev/null', fetchImpl,
    env: { JEV_ENDPOINT: 'https://jev.test', JEV_API_KEY: 'k' },
  });
  const probe = await service.probe('query.classification', { query: 'test' });
  assert.equal(probe.ok, false);
  assert.equal(service.status().primary, PROVIDERS.DETERMINISTIC);
  assert.equal(service.status().degraded, true);
});

test('an internal link needs a modelled relationship, not shared keywords', async () => {
  const service = new DecisionService({ registry, env: {}, cacheFile: '/dev/null' });
  const strong = await service.decide('link.editorially_legitimate', { relationship: 'located_in', targetInboundLinks: 0 });
  const weak = await service.decide('link.editorially_legitimate', { relationship: 'same_town', targetInboundLinks: 3 });
  const existing = await service.decide('link.editorially_legitimate', { relationship: 'located_in', targetInboundLinks: 0, alreadyLinked: true });
  assert.equal(strong.value.legitimate, true);
  assert.equal(weak.value.legitimate, false, 'a shared town alone must not justify a link');
  assert.equal(existing.value.legitimate, false, 'an existing link must not be proposed again');
});

test('editorial actions are never rated auto-safe', async () => {
  const service = new DecisionService({ registry, env: {}, cacheFile: '/dev/null' });
  for (const action of ['rewrite_title', 'expand_or_consolidate', 'add_h1']) {
    const r = await service.decide('risk.autofix_safety', { action, altersEditorialProse: true });
    assert.equal(r.value.decision, 'human_only', `${action} must be human_only`);
  }
  const safe = await service.decide('risk.autofix_safety', { action: 'fix_broken_internal_link' });
  assert.equal(safe.value.decision, 'auto_safe');
});

test('fact and generic-marker detectors behave', () => {
  assert.ok(factDensity('Open 9am at 12 Ocean Road, Sorrento VIC 3943, entry $25, 4 km away, Monday, 2026.') > 0.5);
  assert.equal(factDensity('It is a lovely spot.'), 0);
  assert.equal(genericMarkerCount('Nestled in the hills, a hidden gem waiting for you.'), 2);
});
