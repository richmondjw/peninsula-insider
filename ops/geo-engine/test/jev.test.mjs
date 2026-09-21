import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { DecisionRegistry, DecisionService, PROVIDERS, buildTypeSafeQuestions, decodeTypeSafeAnswers, resolveProviderConfig } from '../lib/jev.mjs';

const tmpCache = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pi-jev-')), 'cache.json');

function registry() {
  const r = new DecisionRegistry();
  r.register(
    'test.mixed',
    {
      question: 'Is this page a good answer?',
      fields: {
        tier: { type: 'enum', values: ['strong', 'workable', 'weak'] },
        locatable: { type: 'boolean' },
        score: { type: 'number', min: 0, max: 1 },
      },
    },
    () => ({ value: { tier: 'weak', locatable: false, score: 0.1 }, confidence: 0.5, rationale: 'rule' }),
  );
  return r;
}

/** A fake TypeSafe endpoint that answers every request from `answerFor(body)`. */
function fakeTypeSafe(answerFor, log = []) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    log.push({ url, headers: init.headers, body });
    const payload = answerFor(body);
    return { ok: true, status: 200, json: async () => payload };
  };
}

const goodAnswers = (body) => ({
  model: 'jev-1.13.0',
  usage: { input_tokens: 900, output_tokens: 30 },
  answers: Object.fromEntries(Object.entries(body.questions).map(([key, q]) => {
    if (q.type === 'choice') return [key, { type: 'choice', choice: 'strong', confidence: 0.91, probabilities: { strong: 0.91, workable: 0.06, weak: 0.03 } }];
    if (q.type === 'noul') return [key, { type: 'noul', noul: 0.88 }];
    return [key, { type: 'score', score: 3.2, confidence: 0.8, legend: {}, probabilities: {} }];
  })),
});

test('the protected TYPESAFE_API_KEY alone configures the Jev provider with TypeSafe defaults', () => {
  const cfg = resolveProviderConfig({ TYPESAFE_API_KEY: 'sentinel' });
  assert.equal(cfg.primary, PROVIDERS.JEV);
  assert.equal(cfg.endpoint, 'https://api.typesafe.ai');
  assert.equal(cfg.model, 'jev-latest');
  assert.equal(cfg.batchSize, 1, 'one decision per request: batched answers homogenise');
  assert.equal(resolveProviderConfig({}).primary, PROVIDERS.DETERMINISTIC);
  assert.equal(resolveProviderConfig({ JEV_ENDPOINT: 'https://x' }).primary, PROVIDERS.DETERMINISTIC);
  assert.equal(resolveProviderConfig({ JEV_ENDPOINT: 'https://x/', JEV_API_KEY: 'k' }).endpoint, 'https://x');
});

test('schema fields become typed TypeSafe questions and answers decode back into the schema', () => {
  const schema = registry().get('test.mixed').schema;
  const questions = buildTypeSafeQuestions(schema);
  assert.deepEqual(Object.keys(questions), ['tier', 'locatable', 'score']);
  assert.equal(questions.tier.type, 'choice');
  assert.deepEqual(Object.keys(questions.tier.criteria), ['strong', 'workable', 'weak']);
  assert.equal(questions.locatable.type, 'noul');
  assert.equal(questions.score.type, 'score');
  assert.equal(questions.score.criteria.length, 5);
  const decoded = decodeTypeSafeAnswers(schema, goodAnswers({ questions }).answers);
  assert.equal(decoded.value.tier, 'strong');
  assert.equal(decoded.value.locatable, true);
  assert.equal(decoded.value.score, 0.8, 'a 0..4 score rescales onto the field range');
  assert.ok(decoded.confidence > 0.75 && decoded.confidence <= 0.88, `confidence is the weakest field, got ${decoded.confidence}`);
});

test('a free-text field cannot be answered by Jev and the decision stays deterministic', () => {
  const schema = { question: 'q', fields: { note: { type: 'string' } } };
  assert.equal(buildTypeSafeQuestions(schema), null);
});

test('Jev decisions are made one request per input, validated, cached and costed', async () => {
  const log = [];
  const service = new DecisionService({
    registry: registry(), cacheFile: tmpCache(),
    env: { TYPESAFE_API_KEY: 'sentinel', JEV_CONCURRENCY: '2' },
    fetchImpl: fakeTypeSafe(goodAnswers, log),
  });
  const records = await service.decideBatch('test.mixed', [{ a: 1 }, { a: 2 }, { a: 3 }]);
  assert.equal(log.length, 3, 'three inputs, three requests');
  assert.equal(log[0].url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(log[0].headers.authorization, 'Bearer sentinel');
  assert.equal(log[0].body.model, 'jev-latest');
  assert.equal(log[0].body.state.decision, 'test.mixed');
  for (const r of records) {
    assert.equal(r.provider, PROVIDERS.JEV);
    assert.equal(r.value.tier, 'strong');
    assert.equal(r.error, null);
  }
  const again = await service.decideBatch('test.mixed', [{ a: 1 }]);
  assert.equal(log.length, 3, 'a repeated input is served from the cache');
  assert.equal(again[0].provider, PROVIDERS.JEV);
  const usage = service.usageSummary();
  assert.equal(usage.byProvider.jev, 4);
  assert.equal(usage.remoteCalls, 3);
  assert.equal(usage.inputTokens, 2700);
  assert.ok(usage.estimatedCostUsd > 0 && usage.estimatedCostUsd < 0.001);
});

test('an off-schema Jev answer is recorded as a provider failure and the rule decides', async () => {
  const bad = (body) => ({ ...goodAnswers(body), answers: { tier: { type: 'choice', choice: 'nonsense', confidence: 0.9, probabilities: {} } } });
  const service = new DecisionService({ registry: registry(), cacheFile: tmpCache(), env: { TYPESAFE_API_KEY: 's' }, fetchImpl: fakeTypeSafe(bad) });
  const [record] = await service.decideBatch('test.mixed', [{ a: 1 }]);
  assert.equal(record.provider, PROVIDERS.DETERMINISTIC);
  assert.equal(record.value.tier, 'weak');
  assert.equal(service.usageSummary().providerFailures.length, 1);
});

test('the per-run remote budget bounds spend; overflow is decided by rules and reported', async () => {
  const log = [];
  const service = new DecisionService({ registry: registry(), cacheFile: tmpCache(), env: { TYPESAFE_API_KEY: 's', JEV_MAX_DECISIONS: '2' }, fetchImpl: fakeTypeSafe(goodAnswers, log) });
  const records = await service.decideBatch('test.mixed', [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]);
  assert.equal(log.length, 2);
  assert.deepEqual(records.map((r) => r.provider), ['jev', 'jev', 'deterministic', 'deterministic']);
  assert.equal(service.usageSummary().budgetExhausted, true);
});

test('a failed probe demotes the service to deterministic rules for the run', async () => {
  const service = new DecisionService({ registry: registry(), cacheFile: tmpCache(), env: { TYPESAFE_API_KEY: 's' }, fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }) });
  const probe = await service.probe('test.mixed', { a: 1 });
  assert.equal(probe.ok, false);
  assert.equal(service.status().primary, PROVIDERS.DETERMINISTIC);
  assert.equal(service.status().degraded, true);
});
