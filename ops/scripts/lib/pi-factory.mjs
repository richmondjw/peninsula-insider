/**
 * pi-factory.mjs — shared helpers for the Peninsula Insider content factory.
 *
 * Three jobs:
 *   1. Talk to the PI_Concierge Supabase project (workflow plane).
 *   2. Write pi_run_log rows so every stage of every job is observable.
 *   3. Load and resolve the content layer (itineraries, venues, experiences).
 *
 * Deliberately dependency-free: node stdlib + fetch only, so it runs on a
 * GitHub Actions runner, on the Windows host, and inside the openclaw
 * container without an install step.
 */

import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const REPO = resolve(__dirname, '../../..');
export const CONTENT = join(REPO, 'next/src/content');

export const SUPABASE_URL =
  process.env.PI_SUPABASE_URL || 'https://mvdtkgsfuhmkioygxgge.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;

export const hasDb = () => Boolean(SUPABASE_KEY);

/** Wrong-project guard, mirroring fetch_sources.py. */
if (SUPABASE_KEY && !SUPABASE_URL.includes('mvdtkgsfuhmkioygxgge') && !process.env.PI_ALLOW_ANY_PROJECT) {
  throw new Error(`[pi-factory] refusing to run against unexpected project: ${SUPABASE_URL}`);
}

// ── Supabase ───────────────────────────────────────────────────────────────

export async function db(path, { method = 'GET', body = null, prefer = null } = {}) {
  if (!SUPABASE_KEY) throw new Error('[pi-factory] SUPABASE_SERVICE_KEY is not set');
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[pi-factory] ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

export const select = (path) => db(path);
export const insert = (table, rows) =>
  db(table, { method: 'POST', body: rows, prefer: 'return=representation' });
export const upsert = (table, rows, onConflict) =>
  db(`${table}?on_conflict=${onConflict}`, {
    method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=representation',
  });
export const patch = (path, body) =>
  db(path, { method: 'PATCH', body, prefer: 'return=representation' });

// ── Run log ────────────────────────────────────────────────────────────────

/**
 * A run-scoped logger. Every stage writes one row. Failure to log never
 * breaks the job it is logging — observability must not be load-bearing.
 */
export class RunLog {
  constructor(jobName, { jobSource = 'manual', campaignId = null, correlationId = null } = {}) {
    this.runId = randomUUID();
    this.jobName = jobName;
    this.jobSource = jobSource;
    this.campaignId = campaignId;
    this.correlationId = correlationId;
    this.rows = [];
    this.totalCost = 0;
  }

  /** Record and persist one stage. Returns the row. */
  async stage(name, {
    status = 'ok', agent = null, mutation = 'report-only',
    inputs = {}, outputs = {}, degradations = [], errorCode = null, errorDetail = null,
    retries = 0, escalatedTo = null, costUsd = 0, artifacts = [],
    fromState = null, toState = null, startedAt = null,
  } = {}) {
    const started = startedAt ?? new Date();
    const ended = new Date();
    const row = {
      run_id: this.runId,
      correlation_id: this.correlationId,
      campaign_id: this.campaignId,
      job_name: this.jobName,
      job_source: this.jobSource,
      stage: name,
      agent,
      from_state: fromState,
      to_state: toState,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_ms: ended - started,
      status,
      mutation,
      inputs_json: inputs,
      outputs_json: outputs,
      degradations,
      error_code: errorCode,
      error_detail: errorDetail ? String(errorDetail).slice(0, 2000) : null,
      retries,
      escalated_to: escalatedTo,
      cost_usd: costUsd,
      artifacts,
    };
    this.rows.push(row);
    this.totalCost += costUsd;

    const icon = { ok: 'ok  ', degraded: 'degr', blocked: 'BLOK', failed: 'FAIL', skipped: 'skip' }[status];
    const detail = errorCode ? ` ${errorCode}: ${errorDetail ?? ''}` : '';
    console.log(`[${icon}] ${name}${detail}`);
    for (const d of degradations) console.log(`       degraded: ${d}`);

    if (hasDb()) {
      try {
        await insert('pi_run_log', [row]);
      } catch (err) {
        console.error(`[pi-factory] run-log write failed (job continues): ${err.message}`);
      }
    }
    return row;
  }

  summary() {
    const counts = {};
    for (const r of this.rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return { runId: this.runId, stages: this.rows.length, counts, costUsd: this.totalCost };
  }
}

// ── Content layer ──────────────────────────────────────────────────────────

export async function readJsonDir(dir) {
  let names = [];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json') && !n.startsWith('_'));
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    try { out.push(JSON.parse(await readFile(join(dir, n), 'utf8'))); } catch { /* skip */ }
  }
  return out;
}

/** slug -> venue|experience record, for resolving itinerary stops. */
export async function loadEntities() {
  const [venues, experiences, places] = await Promise.all([
    readJsonDir(join(CONTENT, 'venues')),
    readJsonDir(join(CONTENT, 'experiences')),
    readJsonDir(join(CONTENT, 'places')),
  ]);
  const map = new Map();
  for (const e of [...venues, ...experiences, ...places]) if (e.slug) map.set(e.slug, e);
  return map;
}

export const loadItineraries = () => readJsonDir(join(CONTENT, 'itineraries'));

/** An itinerary stop references either a venue or an experience. Normalise. */
export const stopSlug = (s) =>
  s.venue?.id ?? s.venue ?? s.experience?.id ?? s.experience ?? null;

// ── Dates ──────────────────────────────────────────────────────────────────

export const AEST = 'Australia/Melbourne';

export function melbourneToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AEST, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return new Date(`${g('year')}-${g('month')}-${g('day')}T00:00:00`);
}

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function seasonOf(date) {
  const m = date.getMonth() + 1;
  if (m === 12 || m <= 2) return 'summer';
  if (m <= 5) return 'autumn';
  if (m <= 8) return 'winter';
  return 'spring';
}

// ── House style ────────────────────────────────────────────────────────────

/**
 * BRAND-PI forbids em-dashes in reader-facing copy, and lint-no-pricing makes
 * a numeric price a build-blocking error. Every generated string passes
 * through here before it is stored, so a generator can never break the deploy.
 */
export function houseStyle(text) {
  if (!text) return text;
  let out = String(text)
    .replace(/\s*—\s*/g, ', ')   // em-dash
    .replace(/\s*–\s*/g, ', ')   // en-dash used as a break
    .replace(/\s*,\s*,/g, ',');
  return out.trim();
}

export function houseStyleViolations(text) {
  const problems = [];
  if (/—/.test(text)) problems.push('contains an em-dash');
  if (/\$\s?\d/.test(text)) problems.push('contains a price (blocks the build)');
  return problems;
}

export { randomUUID };
