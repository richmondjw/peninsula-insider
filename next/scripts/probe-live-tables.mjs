#!/usr/bin/env node
/**
 * probe-live-tables.mjs — does the live database actually have the tables the
 * code asks it for? (PI-017)
 *
 * WHY THIS IS NOT A BUILD GATE, AND MUST NEVER BECOME ONE
 *
 * This is the one script in the pair that dials out. Its answer is a property
 * of a remote service at a moment in time, not of the files in this repository,
 * so it can change from PASS to FAIL with nobody having written a line of code.
 * Wire that into a pull request and you have built a check that goes red at 3am
 * because Supabase was briefly unreachable, blocks a merge that had nothing to
 * do with it, and teaches everyone to click through a red tick — at which point
 * the next real failure is waved through too.
 *
 * This repository has already paid that bill twice in one week. A test that
 * asserted zero collisions among 2000 random draws failed a pull request that
 * did not touch it. A test pinned to a literal date failed the moment the
 * evidence behind it was gathered a day later. Both were deleted. A live
 * network probe is the same defect with a bigger blast radius, because the
 * thing that flips it is not even inside the building.
 *
 * So the work is split, and the split is the whole design:
 *
 *   scripts/audit-migration-ledger.mjs   offline, deterministic, GATES the PR.
 *                                        Fails when a migration has no recorded
 *                                        state. Can only go red on a change
 *                                        somebody made here.
 *
 *   scripts/probe-live-tables.mjs        online, REPORTS. Runs on a schedule in
 *   (this file)                          .github/workflows/migration-liveness.yml,
 *                                        where a bad night costs an alert
 *                                        rather than a blocked merge.
 *
 * The offline gate is what stops the next unledgered migration. The probe is
 * what would have shouted about pi.venue_claims on 2026-05-11 instead of
 * 2026-09-14. Neither substitutes for the other, and neither belongs in the
 * other's lane.
 *
 * WHAT IT PROBES
 *
 * Not a hand-written list. scripts/expected-tables.mjs reads every `.from('x')`
 * in next/src, so the probe's subject is whatever the application actually asks
 * for today. A form added next month is probed from the day it ships, with
 * nobody remembering to add it here — which is precisely what a hand-maintained
 * list would have failed to do, since a hand-maintained expectation is the
 * thing that broke in the first place.
 *
 * HOW IT IS SAFE
 *
 * Read-only by construction and by assertion:
 *
 *   - GET only. There is no code path in this file that issues POST, PATCH,
 *     PUT or DELETE, and no SQL is sent.
 *   - `limit=0` — PostgREST returns an empty array. No row ever leaves the
 *     database, so a probe log can never carry reader data.
 *   - The publishable key only. That is the key already baked into the deployed
 *     JavaScript bundle and handed to every visitor's browser; using it means
 *     the probe sees exactly what an anonymous visitor sees and nothing more. A
 *     service key is refused outright (see assertPublishable): a probe holding
 *     one could read every row on the site, and a credential that powerful has
 *     no business in a cron job whose only question is "does this table exist".
 *
 * READING A RESULT
 *
 *   present             HTTP 200. The table is there and anon may select it.
 *   present-restricted  Permission denied (42501 / 401 / 403). The table EXISTS;
 *                       the anon role simply has no grant. Not a finding — most
 *                       of this schema is deliberately shut to anonymous reads.
 *   absent              HTTP 404 with PGRST205, "Could not find the table … in
 *                       the schema cache". This is the finding. It is what
 *                       pi.venue_claims returned for 127 days.
 *   schema-unexposed    PGRST106. The schema itself is not exposed through
 *                       PostgREST, so every call the app makes into it fails
 *                       the same way. A real, stable configuration fault.
 *   unreachable         Timeout, DNS failure, connection reset, 5xx. The probe
 *                       did not establish anything. NEVER reported as absent —
 *                       conflating "I could not look" with "it is not there" is
 *                       how a monitor earns a reputation for lying.
 *
 * Exit codes are three-valued for the same reason:
 *   0  nothing absent.
 *   1  at least one table absent, or its schema unexposed — a real finding.
 *   2  the probe could not establish the facts (no key, endpoint unreachable).
 *      Distinct from 1 so a workflow, a human, or a future caller can tell a
 *      broken database from a broken night.
 *
 * THE CROSS-CHECK
 *
 * Every absent table is matched back to the migration that creates it and to
 * what ops/reports/migrations/migration-ledger.json says about that migration.
 * A table the probe cannot find whose migration the ledger calls `applied` is
 * reported as a ledgerContradiction, and is the most valuable line this tool
 * can print: the written record is wrong, and every decision resting on it is
 * wrong too.
 *
 * Usage:
 *   node scripts/probe-live-tables.mjs [--json out.json] [--url URL] [--key KEY]
 *                                      [--timeout ms] [--concurrency N] [--quiet]
 *
 * URL and key default to the values the application itself uses: the
 * PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY environment variables if set,
 * otherwise the literals in next/src/lib/auth.ts that the deployed bundle
 * carries. Read out of the code, again, rather than copied into this file.
 */

import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { deriveExpectedTables } from './expected-tables.mjs';
import { relationsCreatedBy } from './audit-migration-ledger.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const JSON_OUT = getArg('--json', null);
const TIMEOUT_MS = Number(getArg('--timeout', '10000')) || 10000;
const CONCURRENCY = Math.max(1, Number(getArg('--concurrency', '4')) || 4);
const QUIET = args.includes('--quiet');
const SRC_DIR = path.resolve(getArg('--src', path.join(NEXT, 'src')));
const MIGRATIONS_DIR = path.resolve(getArg('--migrations-dir', path.join(REPO, 'ops', 'migrations')));
const LEDGER = path.resolve(
  getArg('--ledger', path.join(REPO, 'ops', 'reports', 'migrations', 'migration-ledger.json'))
);

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

export const EXIT_OK = 0;
export const EXIT_FINDING = 1;
export const EXIT_INCONCLUSIVE = 2;

/* ------------------------------------------------------------------ */
/* Credentials — read out of the app, never written down twice         */
/* ------------------------------------------------------------------ */

/**
 * The endpoint and key the deployed bundle uses.
 *
 * next/src/lib/auth.ts holds both as literal fallbacks, which is what a static
 * build without env vars ships to browsers. Parsing them from there keeps this
 * file from becoming a second place that has to be kept in step — the exact
 * failure mode the ledger exists to end.
 */
export function parseClientConfig(authSource) {
  const url = /(https:\/\/[a-z0-9-]+\.supabase\.co)/i.exec(authSource || '')?.[1] ?? null;
  const key = /(sb_publishable_[A-Za-z0-9_-]+)/.exec(authSource || '')?.[1] ?? null;
  return { url, key };
}

/**
 * Refuse anything that is not a publishable key.
 *
 * A service-role key bypasses RLS entirely. Handing one to a scheduled job
 * whose only question is "does this table exist" would make a credential that
 * can read every row on the site reachable from CI logs, for no gain: an
 * anonymous GET answers the question exactly as well.
 */
export function assertPublishable(key) {
  if (!key) throw new Error('no key supplied');
  if (key.startsWith('sb_secret_') || key.startsWith('sbp_') || /service[_-]?role/i.test(key)) {
    throw new Error('refusing to probe with a service key — this probe uses the publishable key only');
  }
  // Legacy JWT-shaped keys: look inside rather than trust the prefix.
  const parts = key.split('.');
  if (parts.length === 3) {
    let claims = null;
    try {
      claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      claims = null; // Undecodable payload is not evidence of a service key.
    }
    if (claims && claims.role && claims.role !== 'anon') {
      throw new Error(
        `refusing to probe with a "${claims.role}" key — this probe uses the publishable key only`
      );
    }
  }
  return key;
}

/* ------------------------------------------------------------------ */
/* The probe itself                                                    */
/* ------------------------------------------------------------------ */

/**
 * Classify one PostgREST response. Pure, so the tests can drive every branch
 * without a network.
 */
export function classify({ status, body }) {
  const code = body && typeof body === 'object' ? body.code : undefined;
  const message = body && typeof body === 'object' ? body.message : undefined;
  if (status >= 200 && status < 300) return { verdict: 'present' };
  if (code === 'PGRST205') return { verdict: 'absent', detail: message };
  if (code === 'PGRST106') return { verdict: 'schema-unexposed', detail: message };
  if (code === '42501' || status === 401 || status === 403) {
    return { verdict: 'present-restricted', detail: message };
  }
  if (status === 404) {
    // A 404 without PGRST205 is not evidence the table is missing — it could be
    // a wrong path or a proxy in front. Say so rather than guess the worse answer.
    return { verdict: 'unreachable', detail: message ?? 'HTTP 404 without a PostgREST error code' };
  }
  return { verdict: 'unreachable', detail: message ?? `HTTP ${status}` };
}

async function probeOne({ url, key, schema, table, timeoutMs }) {
  // limit=0 so no row is ever returned; this is a existence question, not a read.
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?limit=0`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Accept-Profile': schema,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { httpStatus: res.status, ...classify({ status: res.status, body }) };
  } catch (error) {
    return {
      httpStatus: null,
      verdict: 'unreachable',
      detail: error.name === 'AbortError' ? `no response within ${timeoutMs}ms` : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

/* ------------------------------------------------------------------ */

async function main() {
  let authSource = '';
  try {
    authSource = await readFile(path.join(SRC_DIR, 'lib', 'auth.ts'), 'utf8');
  } catch {
    /* env vars may still supply both */
  }
  const fromCode = parseClientConfig(authSource);
  const url = (getArg('--url', null) || process.env.PUBLIC_SUPABASE_URL || fromCode.url || '').replace(/\/+$/, '');
  const rawKey = getArg('--key', null) || process.env.PUBLIC_SUPABASE_ANON_KEY || fromCode.key || '';

  if (!url || !rawKey) {
    console.error('INCONCLUSIVE: no endpoint or publishable key available.');
    console.error('  Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY, or pass --url / --key.');
    console.error(`  Neither was found in the environment nor in ${rel(path.join(SRC_DIR, 'lib', 'auth.ts'))}.`);
    process.exit(EXIT_INCONCLUSIVE);
  }

  let key;
  try {
    key = assertPublishable(rawKey);
  } catch (error) {
    console.error(`REFUSED: ${error.message}`);
    process.exit(EXIT_INCONCLUSIVE);
  }

  const { tables, dynamic } = await deriveExpectedTables({ srcDirs: [SRC_DIR] });
  const createdBy = await relationsCreatedBy(MIGRATIONS_DIR);

  let ledgerRows = [];
  try {
    ledgerRows = JSON.parse(await readFile(LEDGER, 'utf8')).migrations ?? [];
  } catch {
    /* the probe still works without it; the cross-check simply stays silent */
  }
  const ledgerState = new Map(ledgerRows.map((r) => [r.file, r.state]));

  const results = await mapWithConcurrency(tables, CONCURRENCY, async (t) => {
    const outcome = await probeOne({ url, key, schema: t.schema, table: t.table, timeoutMs: TIMEOUT_MS });
    const relation = `${t.schema}.${t.table}`;
    const migrations = createdBy.get(relation.toLowerCase()) ?? [];
    return {
      table: relation,
      ...outcome,
      references: t.references,
      createdBy: migrations.map((file) => ({ file, ledgerState: ledgerState.get(file) ?? 'no ledger row' })),
    };
  });

  const by = (v) => results.filter((r) => r.verdict === v);
  const absent = [...by('absent'), ...by('schema-unexposed')];
  const unreachable = by('unreachable');

  // The line worth waking someone for: the ledger says applied, the database
  // disagrees.
  const ledgerContradiction = absent.flatMap((r) =>
    r.createdBy
      .filter((m) => m.ledgerState === 'applied')
      .map((m) => ({ table: r.table, migration: m.file, ledgerState: m.ledgerState }))
  );

  const report = {
    note:
      'Live probe of the tables the application names. Read-only: GET with limit=0, publishable key only, ' +
      'no row ever returned. Reports; never gates a merge — see the header of scripts/probe-live-tables.mjs.',
    probedAt: new Date().toISOString(),
    endpoint: url,
    keyKind: 'publishable',
    tablesProbed: results.length,
    counts: {
      present: by('present').length,
      presentRestricted: by('present-restricted').length,
      absent: by('absent').length,
      schemaUnexposed: by('schema-unexposed').length,
      unreachable: unreachable.length,
    },
    ledgerContradiction,
    dynamicTableReferences: dynamic,
    tables: [...results].sort((a, b) => a.table.localeCompare(b.table)),
  };

  if (!QUIET) {
    console.log('Live table probe');
    console.log('');
    console.log(`  endpoint .......................... ${url}`);
    console.log(`  tables the code names ............. ${results.length} (derived from next/src)`);
    console.log(
      `  present ........................... ${report.counts.present} (+${report.counts.presentRestricted} present but closed to anon)`
    );
    console.log(`  ABSENT ............................ ${report.counts.absent}`);
    console.log(`  schema not exposed ................ ${report.counts.schemaUnexposed}`);
    console.log(`  could not establish ............... ${report.counts.unreachable}`);
    console.log('');
    for (const r of absent) {
      const owner = r.createdBy.length
        ? r.createdBy.map((m) => `${m.file} [ledger: ${m.ledgerState}]`).join(', ')
        : 'NO MIGRATION IN THIS REPOSITORY CREATES IT';
      console.log(`    ${r.verdict.toUpperCase()}  ${r.table}`);
      console.log(`      created by ... ${owner}`);
      console.log(`      code needs it  ${r.references.slice(0, 3).join(', ')}`);
    }
    for (const r of unreachable) {
      console.log(`    UNREACHABLE  ${r.table}  -  ${r.detail}`);
    }
    for (const c of ledgerContradiction) {
      console.log('');
      console.log(`    LEDGER CONTRADICTION  ${c.migration} is recorded "applied" but ${c.table} is not there.`);
      console.log('      The written record is wrong. Correct that row before trusting anything near it.');
    }
    if (dynamic.length) {
      console.log('');
      for (const d of dynamic) {
        console.log(`    BLIND SPOT  ${d.file}:${d.line}  .from() with a computed name - this probe cannot see it`);
      }
    }
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    if (!QUIET) console.log(`\n  report -> ${rel(out)}`);
  }

  if (absent.length) {
    console.error(`\n  FINDING: ${absent.length} table(s) the code depends on are not in the live database.`);
    console.error('  This reports; it does not block a merge. Apply the migration, then record it in');
    console.error(`  ${rel(LEDGER)} as applied with the date.`);
    process.exit(EXIT_FINDING);
  }
  if (results.length > 0 && unreachable.length === results.length) {
    console.error('\n  INCONCLUSIVE: nothing answered. Treat this as a probe failure, not as missing tables.');
    process.exit(EXIT_INCONCLUSIVE);
  }
  if (!QUIET) console.log('\n  PASS: every table the code names is present in the live database.');
}

if (process.argv[1]?.endsWith('probe-live-tables.mjs')) {
  main().catch((error) => {
    console.error(`INCONCLUSIVE: the probe itself failed - ${error.message}`);
    process.exit(EXIT_INCONCLUSIVE);
  });
}
