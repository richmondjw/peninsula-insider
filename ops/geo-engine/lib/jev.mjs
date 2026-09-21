// The decision layer.
//
// This is the fast classification/scoring service the rest of the engine calls
// for every micro-decision. It is provider-agnostic by design:
//
//   jev            — TypeSafe AI's Jev, when JEV_ENDPOINT + JEV_API_KEY are set
//   frontier       — an Anthropic Messages API call, for the small number of
//                    ambiguous cases escalation asks for
//   deterministic  — registered rule code, always available, zero cost
//
// Every decision is validated against a declared output schema before it is
// accepted. A provider that returns an off-schema answer is recorded as a
// provider failure and the deterministic rule is used instead, so a broken or
// absent model degrades the engine's confidence rather than its correctness.
//
// `provider` is carried on every record and surfaced in reporting. A score
// produced by rule code is never presented as a model judgement.

import path from 'node:path';
import { STATE_DIR, clamp, readJson, round, stableHash, writeJson } from './util.mjs';

export const PROVIDERS = { JEV: 'jev', FRONTIER: 'frontier', DETERMINISTIC: 'deterministic' };

/** Validate one decision payload against a declared schema. */
export function validateAgainstSchema(schema, value) {
  const errors = [];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['payload is not an object'] };
  }
  const out = {};
  for (const [key, spec] of Object.entries(schema.fields)) {
    const present = Object.hasOwn(value, key);
    if (!present) {
      if (spec.optional) continue;
      errors.push(`missing field: ${key}`);
      continue;
    }
    const raw = value[key];
    switch (spec.type) {
      case 'enum': {
        if (typeof raw !== 'string' || !spec.values.includes(raw)) {
          errors.push(`${key}: expected one of ${spec.values.join('|')}, got ${JSON.stringify(raw)}`);
        } else out[key] = raw;
        break;
      }
      case 'number': {
        const n = typeof raw === 'number' ? raw : Number(raw);
        const lo = spec.min ?? 0;
        const hi = spec.max ?? 1;
        if (!Number.isFinite(n) || n < lo || n > hi) {
          errors.push(`${key}: expected number in [${lo},${hi}], got ${JSON.stringify(raw)}`);
        } else out[key] = round(n, 3);
        break;
      }
      case 'boolean': {
        if (typeof raw !== 'boolean') errors.push(`${key}: expected boolean, got ${JSON.stringify(raw)}`);
        else out[key] = raw;
        break;
      }
      case 'string': {
        if (typeof raw !== 'string') errors.push(`${key}: expected string`);
        else if (spec.maxLength && raw.length > spec.maxLength) out[key] = raw.slice(0, spec.maxLength);
        else out[key] = raw;
        break;
      }
      case 'stringArray': {
        if (!Array.isArray(raw) || raw.some((x) => typeof x !== 'string')) {
          errors.push(`${key}: expected array of strings`);
        } else out[key] = raw.slice(0, spec.maxItems ?? 20);
        break;
      }
      default:
        errors.push(`${key}: unknown spec type ${spec.type}`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: out };
}

export class DecisionRegistry {
  constructor() {
    this.decisions = new Map();
  }

  /**
   * @param name        atomic decision name, e.g. 'geo.answer_is_locatable'
   * @param schema      { question, fields: {...} }
   * @param deterministic (input) => { value, confidence, rationale }
   */
  register(name, schema, deterministic) {
    if (typeof deterministic !== 'function') throw new Error(`${name}: deterministic rule required`);
    if (!schema?.fields || !schema.question) throw new Error(`${name}: schema needs question + fields`);
    this.decisions.set(name, { name, schema, deterministic });
    return this;
  }

  get(name) {
    const d = this.decisions.get(name);
    if (!d) throw new Error(`unknown decision: ${name}`);
    return d;
  }

  names() {
    return [...this.decisions.keys()].sort();
  }
}

const DEFAULT_LEDGER = () => ({
  byProvider: {}, byDecision: {}, cacheHits: 0, cacheMisses: 0,
  providerFailures: [], estimatedCostUsd: 0,
});

export class DecisionService {
  constructor({
    registry,
    logger,
    cacheFile = path.join(STATE_DIR, 'decision-cache.json'),
    env = process.env,
    fetchImpl = globalThis.fetch,
    now = () => new Date().toISOString(),
  } = {}) {
    if (!registry) throw new Error('DecisionService requires a registry');
    this.registry = registry;
    this.logger = logger;
    this.cacheFile = cacheFile;
    this.env = env;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.cache = readJson(cacheFile, {}) ?? {};
    this.usage = DEFAULT_LEDGER();
    this.config = resolveProviderConfig(env);
    this.probeResult = null;
  }

  /** Which provider will actually serve calls, and why. */
  status() {
    return {
      ...this.config,
      probe: this.probeResult,
      decisionsRegistered: this.registry.names().length,
      cacheEntries: Object.keys(this.cache).length,
    };
  }

  /**
   * Controlled round-trip test. Runs one known decision through the configured
   * remote provider and checks the answer validates. Never assumes a provider
   * works because it is configured.
   */
  async probe(decisionName, input) {
    const result = {
      attempted: this.config.primary !== PROVIDERS.DETERMINISTIC,
      primary: this.config.primary,
      ok: false,
      detail: this.config.reason,
      checkedAt: this.now(),
    };
    if (!result.attempted) {
      this.probeResult = result;
      return result;
    }
    try {
      const [record] = await this.#callRemote(this.registry.get(decisionName), [input], this.config.primary);
      result.ok = Boolean(record && !record.error);
      result.detail = record?.error ?? 'typed decision returned and validated';
      result.sample = record?.value ?? null;
    } catch (err) {
      result.ok = false;
      result.detail = `probe failed: ${err.message}`;
    }
    if (!result.ok) {
      this.config = { ...this.config, primary: PROVIDERS.DETERMINISTIC, reason: `probe failed (${result.detail}); using deterministic rules`, degraded: true };
    }
    this.probeResult = result;
    return result;
  }

  async decide(name, input) {
    const [record] = await this.decideBatch(name, [input]);
    return record;
  }

  /**
   * Batched decisions. Cached answers are served without a call; the rest go to
   * the configured provider in chunks, and anything that fails validation falls
   * through to the deterministic rule for that decision.
   */
  async decideBatch(name, inputs) {
    const decision = this.registry.get(name);
    const results = new Array(inputs.length);
    const pending = [];

    inputs.forEach((input, index) => {
      const key = `${name}:${this.config.primary}:${stableHash(input)}`;
      const hit = this.cache[key];
      if (hit) {
        this.usage.cacheHits += 1;
        results[index] = hit;
      } else {
        this.usage.cacheMisses += 1;
        pending.push({ index, input, key });
      }
    });

    if (pending.length && this.config.primary !== PROVIDERS.DETERMINISTIC) {
      for (let i = 0; i < pending.length; i += this.config.batchSize) {
        const chunk = pending.slice(i, i + this.config.batchSize);
        let records = [];
        try {
          records = await this.#callRemote(decision, chunk.map((c) => c.input), this.config.primary);
        } catch (err) {
          this.usage.providerFailures.push({ decision: name, error: err.message, at: this.now() });
          this.logger?.warn('decision provider call failed; falling back to rules', { decision: name, error: err.message });
          records = [];
        }
        chunk.forEach((c, j) => {
          const rec = records[j];
          if (rec && !rec.error) {
            results[c.index] = rec;
            this.cache[c.key] = rec;
          }
        });
      }
    }

    // Anything still unresolved is decided by rule code.
    for (const c of pending) {
      if (results[c.index]) continue;
      const rec = this.#deterministic(decision, c.input);
      results[c.index] = rec;
      this.cache[c.key] = rec;
    }

    this.usage.byDecision[name] = (this.usage.byDecision[name] ?? 0) + inputs.length;
    for (const r of results) {
      this.usage.byProvider[r.provider] = (this.usage.byProvider[r.provider] ?? 0) + 1;
    }
    return results;
  }

  #deterministic(decision, input) {
    let raw;
    try {
      raw = decision.deterministic(input);
    } catch (err) {
      return this.#record(decision, input, PROVIDERS.DETERMINISTIC, null, 0, `rule threw: ${err.message}`, `rule error: ${err.message}`);
    }
    const check = validateAgainstSchema(decision.schema, raw?.value ?? {});
    if (!check.ok) {
      return this.#record(decision, input, PROVIDERS.DETERMINISTIC, null, 0, check.errors.join('; '), 'rule output failed its own schema');
    }
    return this.#record(decision, input, PROVIDERS.DETERMINISTIC, check.value, clamp(raw.confidence ?? 0.5), null, raw.rationale ?? null);
  }

  #record(decision, input, provider, value, confidence, error, rationale) {
    return {
      decision: decision.name,
      provider,
      value,
      confidence: round(clamp(confidence), 3),
      rationale: rationale ?? null,
      error: error ?? null,
      inputHash: stableHash(input),
      decidedAt: this.now(),
    };
  }

  async #callRemote(decision, inputs, provider) {
    if (provider === PROVIDERS.JEV) return this.#callJev(decision, inputs);
    if (provider === PROVIDERS.FRONTIER) return this.#callFrontier(decision, inputs);
    throw new Error(`no remote transport for provider ${provider}`);
  }

  async #callJev(decision, inputs) {
    const res = await this.fetchImpl(this.config.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        task: decision.name,
        question: decision.schema.question,
        schema: decision.schema.fields,
        items: inputs,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!res.ok) throw new Error(`jev HTTP ${res.status}`);
    const payload = await res.json();
    const items = Array.isArray(payload?.results) ? payload.results : null;
    if (!items) throw new Error('jev response missing results array');
    this.usage.estimatedCostUsd += inputs.length * this.config.unitCostUsd;
    return items.map((item, i) => {
      const check = validateAgainstSchema(decision.schema, item ?? {});
      if (!check.ok) {
        this.usage.providerFailures.push({ decision: decision.name, error: check.errors.join('; '), at: this.now() });
        return this.#record(decision, inputs[i], PROVIDERS.JEV, null, 0, check.errors.join('; '), null);
      }
      return this.#record(decision, inputs[i], PROVIDERS.JEV, check.value, clamp(item.confidence ?? 0.7), null, typeof item.rationale === 'string' ? item.rationale.slice(0, 300) : null);
    });
  }

  async #callFrontier(decision, inputs) {
    const body = {
      model: this.config.model,
      max_tokens: 2048,
      system: 'You are a classification service. Answer only with JSON matching the requested schema. Never invent facts about venues, prices, hours or events.',
      messages: [{
        role: 'user',
        content: `${decision.schema.question}\n\nOutput schema (per item): ${JSON.stringify(decision.schema.fields)}\nAlso include a "confidence" number in [0,1].\nReturn JSON: {"results":[...]} with one entry per input, in order.\n\nInputs:\n${JSON.stringify(inputs)}`,
      }],
    };
    const res = await this.fetchImpl(`${this.config.endpoint}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!res.ok) throw new Error(`frontier HTTP ${res.status}`);
    const payload = await res.json();
    const text = (payload?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('frontier response contained no JSON object');
    const parsed = JSON.parse(match[0]);
    const items = Array.isArray(parsed?.results) ? parsed.results : null;
    if (!items) throw new Error('frontier response missing results array');
    this.usage.estimatedCostUsd += inputs.length * this.config.unitCostUsd;
    return items.map((item, i) => {
      const check = validateAgainstSchema(decision.schema, item ?? {});
      if (!check.ok) return this.#record(decision, inputs[i], PROVIDERS.FRONTIER, null, 0, check.errors.join('; '), null);
      return this.#record(decision, inputs[i], PROVIDERS.FRONTIER, check.value, clamp(item.confidence ?? 0.7), null, typeof item.rationale === 'string' ? item.rationale.slice(0, 300) : null);
    });
  }

  usageSummary() {
    const total = Object.values(this.usage.byProvider).reduce((a, b) => a + b, 0);
    const deterministic = this.usage.byProvider[PROVIDERS.DETERMINISTIC] ?? 0;
    return {
      totalDecisions: total,
      byProvider: this.usage.byProvider,
      byDecision: this.usage.byDecision,
      cacheHits: this.usage.cacheHits,
      cacheMisses: this.usage.cacheMisses,
      shareWithoutFrontierModel: total ? round(1 - ((this.usage.byProvider[PROVIDERS.FRONTIER] ?? 0) / total), 4) : 1,
      shareDeterministic: total ? round(deterministic / total, 4) : 0,
      providerFailures: this.usage.providerFailures.slice(0, 20),
      estimatedCostUsd: round(this.usage.estimatedCostUsd, 4),
    };
  }

  persist() {
    // Bound the cache so state stays reviewable in git.
    const entries = Object.entries(this.cache);
    const LIMIT = Number(this.env.PI_GEO_CACHE_LIMIT ?? 4000);
    const trimmed = entries.length > LIMIT
      ? Object.fromEntries(entries.slice(entries.length - LIMIT))
      : this.cache;
    writeJson(this.cacheFile, trimmed);
  }
}

export function resolveProviderConfig(env) {
  const base = { batchSize: 50, timeoutMs: 30000, degraded: false, unitCostUsd: 0 };
  if (env.JEV_ENDPOINT && env.JEV_API_KEY) {
    return {
      ...base,
      primary: PROVIDERS.JEV,
      endpoint: env.JEV_ENDPOINT,
      apiKey: env.JEV_API_KEY,
      model: env.JEV_MODEL ?? 'jev-default',
      batchSize: Number(env.JEV_BATCH_SIZE ?? 50),
      unitCostUsd: Number(env.JEV_UNIT_COST_USD ?? 0.00002),
      reason: 'JEV_ENDPOINT and JEV_API_KEY are set',
    };
  }
  if (env.PI_GEO_FRONTIER === 'on' && env.ANTHROPIC_API_KEY) {
    return {
      ...base,
      primary: PROVIDERS.FRONTIER,
      endpoint: env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.PI_GEO_FRONTIER_MODEL ?? 'claude-haiku-4-5-20251001',
      batchSize: 20,
      unitCostUsd: Number(env.PI_GEO_FRONTIER_UNIT_COST_USD ?? 0.0008),
      reason: 'Jev not configured; PI_GEO_FRONTIER=on with an Anthropic key',
    };
  }
  return {
    ...base,
    primary: PROVIDERS.DETERMINISTIC,
    endpoint: null,
    apiKey: null,
    model: null,
    reason: env.JEV_ENDPOINT || env.JEV_API_KEY
      ? 'Jev partially configured (needs both JEV_ENDPOINT and JEV_API_KEY); using deterministic rules'
      : 'No Jev credentials present; using deterministic rules',
  };
}
