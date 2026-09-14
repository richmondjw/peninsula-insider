#!/usr/bin/env node
/**
 * audit-migration-ledger.mjs - the migration ledger gate (PI-017).
 *
 * WHAT WENT WRONG
 *
 * `/partners/claim/` shipped on 2026-05-10 writing into pi.venue_claims. Its
 * migration, ops/migrations/2026-05-05-venue-claims.sql, is well formed and was
 * simply never applied to production. The defect survived 127 days because the
 * page's read path swallows the error and renders "no claims yet", so the only
 * symptom was a failed submit in one operator's browser on a surface nobody
 * measures. On 2026-09-14 two more intake tables were found equally absent.
 *
 * The thing that made it possible to sit on for four months is not any of those
 * three migrations. It is that migrations here are applied by hand and NOTHING
 * records which ones have been. From the repository alone, a well-formed
 * migration that ran in May and one that has never run look identical. There is
 * no observation you can make to tell them apart, so nobody made one.
 *
 * WHAT THIS GATE DOES
 *
 * It makes the state of every migration a thing the repository has to say out
 * loud. ops/reports/migrations/migration-ledger.json carries one row per file,
 * and the row must claim one of three states:
 *
 *   applied   It ran. Carries `appliedOn` - an ISO date, or the literal
 *             "unknown" when the file's history genuinely does not record one.
 *   pending   It has not run. Carries `reason` saying how that was established.
 *   unknown   Nobody can currently say. Carries `reason` saying why.
 *
 * `unknown` is a first-class value on purpose. The honest starting state of this
 * repository is 34 unknowns, and a ledger that forced a guess to be written down
 * would be worse than no ledger: it would look authoritative while being fiction.
 * What the gate refuses is silence. A migration with no row at all fails.
 *
 * THE ONE RULE THAT SHAPES EVERYTHING BELOW
 *
 * This gate makes no network request, ever. Every metric is a property of the
 * files on disk, so the same tree yields the same numbers on any machine, on any
 * date, offline. It can only fail on a change somebody made in this repository.
 * Whether a table actually exists in production is a live fact that changes
 * without a commit; asking it here would produce a build that goes red at 3am
 * with no code change, which is the failure mode this repository already forbids.
 * That question is asked by scripts/probe-live-tables.mjs, on a schedule, where a
 * bad night costs an alert rather than a blocked merge.
 *
 * WHAT IT ASSERTS
 *
 *   unledgeredMigration
 *       A .sql file under ops/migrations/ with no ledger row. Ceiling 0,
 *       permanently. This is the whole mechanism: a new migration cannot ship
 *       without someone stating, in a reviewable diff, what its state is.
 *
 *   orphanedLedgerEntry
 *       A ledger row naming a file that is not there. Ceiling 0. Keeps the
 *       ledger from accumulating rows about migrations that were renamed away.
 *
 *   malformedLedgerEntry
 *       A row with an unrecognised state, or missing the evidence its state
 *       requires. Ceiling 0. A row that says "applied" and nothing else is the
 *       same silence in a costume.
 *
 *   ddlInExcludedDirectory
 *       ops/migrations/verification/ is excluded from the ledger because it
 *       holds read-only verification queries, not DDL. That exclusion is
 *       checked rather than trusted: put a create/alter/drop in there and this
 *       fails. Ceiling 0.
 *
 *   unknownStateMigration
 *       How many rows still say "unknown". Ratchets down as James establishes
 *       real states. Never blocks inherited debt; blocks adding to it.
 *
 *   uncreatedTable
 *       A table the application names (derived from the code by
 *       scripts/expected-tables.mjs, never from a hand-written list) that no
 *       migration in this repository creates. The claim form's failure was one
 *       step past this - the migration existed - but the nearer miss is a form
 *       written against a table nobody ever wrote SQL for, and that is free to
 *       catch here.
 *
 * Usage:
 *   node scripts/audit-migration-ledger.mjs [--json out.json] [--assert]
 *                                           [--baseline path] [--update-baseline]
 *                                           [--ledger path] [--migrations-dir path]
 *                                           [--src path]
 */

import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { deriveExpectedTables, DEFAULT_SCHEMA } from './expected-tables.mjs';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const MIGRATIONS_DIR = path.resolve(getArg('--migrations-dir', path.join(REPO, 'ops', 'migrations')));
const LEDGER = path.resolve(
  getArg('--ledger', path.join(REPO, 'ops', 'reports', 'migrations', 'migration-ledger.json'))
);
const BASELINE = path.resolve(
  getArg('--baseline', path.join(REPO, 'ops', 'baselines', 'migration-ledger-baseline.json'))
);
const SRC_DIR = path.resolve(getArg('--src', path.join(NEXT, 'src')));
const JSON_OUT = getArg('--json', null);
const ASSERT = args.includes('--assert');
const UPDATE_BASELINE = args.includes('--update-baseline');

const ASSERTED_METRICS = new Set([
  'unledgeredMigration',
  'orphanedLedgerEntry',
  'malformedLedgerEntry',
  'ddlInExcludedDirectory',
  'unknownStateMigration',
  'uncreatedTable',
]);

/** The three things a ledger row is allowed to claim. */
export const LEDGER_STATES = new Set(['applied', 'pending', 'unknown']);

/**
 * Directories under ops/migrations/ that are not migrations.
 *
 * `verification/` holds read-only SELECT scripts used to check a policy after
 * the fact. Excluding them is right, but an unchecked exclusion is a hole
 * waiting to be widened, so ddlInExcludedDirectory polices it.
 */
const EXCLUDED_DIRS = new Set(['verification']);

/** DDL that has no business living in an excluded directory. */
const DDL = /\b(create|alter|drop)\s+(or\s+replace\s+)?(materialized\s+)?(table|view|schema|type|function|trigger|policy|index)\b/i;

/** What a migration creates. Views count: pi.award_vote_counts is one, and the app reads it. */
const CREATES_RELATION =
  /\bcreate\s+(or\s+replace\s+)?(materialized\s+)?(table|view)\s+(if\s+not\s+exists\s+)?([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/gi;

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');

/**
 * Which migration creates which relation, keyed `schema.table`.
 *
 * Shared with scripts/probe-live-tables.mjs so the probe can say, of a table it
 * found absent, which file was supposed to have created it and what the ledger
 * claims about that file. A table the probe cannot find whose migration the
 * ledger calls `applied` is the single most valuable thing either tool can
 * report: it means the written record is wrong.
 */
export async function relationsCreatedBy(migrationsDir) {
  const { migrations } = await readMigrationsDir(migrationsDir);
  /** @type {Map<string, string[]>} */
  const byRelation = new Map();
  for (const entry of migrations) {
    const text = await readFile(entry.abs, 'utf8');
    const re = new RegExp(CREATES_RELATION.source, CREATES_RELATION.flags);
    for (const m of text.matchAll(re)) {
      const key = `${m[5].toLowerCase()}.${m[6].toLowerCase()}`;
      if (!byRelation.has(key)) byRelation.set(key, []);
      if (!byRelation.get(key).includes(entry.file)) byRelation.get(key).push(entry.file);
    }
  }
  return byRelation;
}

/* ------------------------------------------------------------------ */
/* Reading the migrations directory                                    */
/* ------------------------------------------------------------------ */

/** Every .sql under the migrations dir, split into ledgered and excluded. */
export async function readMigrationsDir(dir) {
  const migrations = [];
  const excluded = [];

  async function walk(abs, relDir) {
    let entries;
    try {
      entries = await readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(abs, entry.name);
      const childRel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(child, childRel);
      } else if (path.extname(entry.name).toLowerCase() === '.sql') {
        const first = childRel.split('/')[0];
        const bucket = relDir && EXCLUDED_DIRS.has(first) ? excluded : migrations;
        bucket.push({ file: childRel, abs: child });
      }
    }
  }

  await walk(dir, '');
  return { migrations, excluded };
}

/* ------------------------------------------------------------------ */
/* Reading the ledger                                                  */
/* ------------------------------------------------------------------ */

async function readLedger() {
  const raw = await readFile(LEDGER, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.migrations)) {
    throw new Error(`${rel(LEDGER)} has no "migrations" array`);
  }
  return parsed.migrations;
}

/**
 * What a row of each state must carry. A state without its evidence is not a
 * record, it is an assertion, and an unevidenced assertion is what put the site
 * in this position.
 */
export function validateRow(row) {
  const problems = [];
  if (!row || typeof row !== 'object') return ['not an object'];
  if (typeof row.file !== 'string' || !row.file) problems.push('missing "file"');
  if (!LEDGER_STATES.has(row.state)) {
    problems.push(`state ${JSON.stringify(row.state)} is not one of ${[...LEDGER_STATES].join(' | ')}`);
    return problems;
  }
  if (row.state === 'applied') {
    const on = row.appliedOn;
    const ok = on === 'unknown' || (typeof on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(on));
    if (!ok) problems.push('state "applied" needs appliedOn: an ISO date, or the literal "unknown"');
  } else if (!row.reason || typeof row.reason !== 'string' || row.reason.trim().length < 8) {
    problems.push(`state "${row.state}" needs a reason saying how that was established`);
  }
  return problems;
}

/* ------------------------------------------------------------------ */

async function main() {
  const { migrations, excluded } = await readMigrationsDir(MIGRATIONS_DIR);

  let ledgerRows;
  try {
    ledgerRows = await readLedger();
  } catch (error) {
    // Fail closed. A missing or unreadable ledger must never read as "nothing
    // to record" - that is precisely the state this gate exists to end.
    console.error(`FAIL: cannot read the migration ledger ${rel(LEDGER)} - ${error.message}`);
    console.error('  Every migration needs a recorded state. Seed the ledger before running the gate.');
    process.exit(1);
  }

  const byFile = new Map();
  const duplicated = [];
  for (const row of ledgerRows) {
    if (row && typeof row.file === 'string' && byFile.has(row.file)) duplicated.push(row.file);
    if (row && typeof row.file === 'string') byFile.set(row.file, row);
  }

  const onDisk = new Set(migrations.map((m) => m.file));

  const unledgered = migrations.filter((m) => !byFile.has(m.file)).map((m) => m.file);
  const orphaned = ledgerRows
    .map((r) => (r && typeof r.file === 'string' ? r.file : '<no file>'))
    .filter((f) => !onDisk.has(f));

  const malformed = [];
  for (const row of ledgerRows) {
    const problems = validateRow(row);
    if (problems.length) {
      malformed.push({ file: row?.file ?? '<no file>', problems });
    }
  }
  for (const file of duplicated) malformed.push({ file, problems: ['listed more than once'] });

  const stateCounts = { applied: 0, pending: 0, unknown: 0 };
  for (const row of ledgerRows) {
    if (LEDGER_STATES.has(row?.state) && onDisk.has(row.file)) stateCounts[row.state] += 1;
  }

  /* DDL smuggled into an excluded directory. */
  const ddlInExcluded = [];
  for (const entry of excluded) {
    const text = await readFile(entry.abs, 'utf8');
    const stripped = text.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (DDL.test(stripped)) ddlInExcluded.push(entry.file);
  }

  /* Relations any migration creates, and the tables the code names. */
  const created = new Set((await relationsCreatedBy(MIGRATIONS_DIR)).keys());

  const { tables: expectedTables, dynamic } = await deriveExpectedTables({ srcDirs: [SRC_DIR] });
  const uncreated = expectedTables
    .filter((t) => !created.has(`${t.schema}.${t.table}`.toLowerCase()))
    .map((t) => ({ table: `${t.schema}.${t.table}`, references: t.references }));

  const totals = {
    unledgeredMigration: unledgered.length,
    orphanedLedgerEntry: orphaned.length,
    malformedLedgerEntry: malformed.length,
    ddlInExcludedDirectory: ddlInExcluded.length,
    unknownStateMigration: stateCounts.unknown,
    uncreatedTable: uncreated.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    assertedMetrics: [...ASSERTED_METRICS],
    ledger: rel(LEDGER),
    migrationsDir: rel(MIGRATIONS_DIR),
    migrationsOnDisk: migrations.length,
    excludedFiles: excluded.map((e) => e.file),
    stateCounts,
    expectedTables: expectedTables.map((t) => `${t.schema}.${t.table}`),
    dynamicTableReferences: dynamic,
    totals,
    unledgeredMigration: unledgered,
    orphanedLedgerEntry: orphaned,
    malformedLedgerEntry: malformed,
    ddlInExcludedDirectory: ddlInExcluded,
    uncreatedTable: uncreated,
  };

  console.log('Migration ledger');
  console.log('');
  console.log(`  migrations on disk ................ ${report.migrationsOnDisk}`);
  console.log(
    `  recorded state .................... applied:${stateCounts.applied}  pending:${stateCounts.pending}  unknown:${stateCounts.unknown}`
  );
  console.log(`  tables the code names ............. ${expectedTables.length} (derived, schema default ${DEFAULT_SCHEMA})`);
  console.log('');
  console.log(`    migrations with no ledger row ... ${totals.unledgeredMigration}   [gated, ceiling 0]`);
  console.log(`    ledger rows with no file ........ ${totals.orphanedLedgerEntry}   [gated, ceiling 0]`);
  console.log(`    malformed ledger rows ........... ${totals.malformedLedgerEntry}   [gated, ceiling 0]`);
  console.log(`    DDL in an excluded directory .... ${totals.ddlInExcludedDirectory}   [gated, ceiling 0]`);
  console.log(`    state still unknown ............. ${totals.unknownStateMigration}   [gated, ratchets down]`);
  console.log(`    tables no migration creates ..... ${totals.uncreatedTable}   [gated, ratchets down]`);
  console.log('');
  for (const f of unledgered) console.log(`    UNLEDGERED  ${f}`);
  for (const f of orphaned) console.log(`    ORPHANED    ${f}`);
  for (const m of malformed) console.log(`    MALFORMED   ${m.file}  -  ${m.problems.join('; ')}`);
  for (const f of ddlInExcluded) console.log(`    DDL         ${f}  -  excluded directories must hold no DDL`);
  for (const t of uncreated) console.log(`    UNCREATED   ${t.table}  <-  ${t.references.join(', ')}`);
  if (dynamic.length) {
    console.log('');
    for (const d of dynamic) {
      console.log(`    DYNAMIC     ${d.file}:${d.line}  .from() with a computed name - invisible to the probe`);
    }
  }

  if (JSON_OUT) {
    const out = path.resolve(JSON_OUT);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\n  report -> ${rel(out)}`);
  }

  if (UPDATE_BASELINE) {
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        { updatedAt: report.generatedAt, assertedMetrics: [...ASSERTED_METRICS], ceilings: totals },
        null,
        2
      )}\n`
    );
    console.log(`  baseline -> ${rel(BASELINE)}`);
    return;
  }

  if (!ASSERT) return;

  let baseline;
  try {
    baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  } catch (error) {
    console.error(`\n  FAIL: cannot read baseline ${rel(BASELINE)} - ${error.message}`);
    console.error('  Seed it with: npm run audit:migration-ledger -- --update-baseline');
    process.exit(1);
  }

  const failures = [];
  for (const [metric, ceiling] of Object.entries(baseline.ceilings ?? {})) {
    if (!ASSERTED_METRICS.has(metric)) continue;
    const actual = totals[metric];
    if (typeof actual === 'number' && actual > ceiling) {
      failures.push(`${metric}: ${actual} > baseline ${ceiling}`);
    }
  }
  // The four structural metrics are ceiling-0 by contract, whatever a baseline
  // happens to say. A baseline cannot be edited into permitting an unledgered
  // migration - that would hand back the exact silence this gate removes.
  for (const metric of ['unledgeredMigration', 'orphanedLedgerEntry', 'malformedLedgerEntry', 'ddlInExcludedDirectory']) {
    if (totals[metric] > 0 && !failures.some((f) => f.startsWith(`${metric}:`))) {
      failures.push(`${metric}: ${totals[metric]} > 0 (structural, not baselineable)`);
    }
  }

  if (failures.length) {
    console.error('\n  FAIL: migration ledger regression');
    for (const f of failures) console.error(`    ${f}`);
    console.error('\n  A new migration must declare its state before it ships. Add a row to');
    console.error(`  ${rel(LEDGER)}:`);
    console.error('');
    console.error('    { "file": "<name>.sql", "state": "pending",');
    console.error('      "reason": "not yet applied to tjjhpvslpysfklwpqmgz",');
    console.error('      "recordedOn": "YYYY-MM-DD", "recordedBy": "<who>" }');
    console.error('');
    console.error('  States: applied (needs appliedOn), pending (needs reason), unknown (needs reason).');
    console.error('  Re-seed the ratchet deliberately with --update-baseline.');
    process.exit(1);
  }
  console.log('  PASS: every migration has a recorded state, and no regression against the ratchet.');
}

/* Run only as a CLI. scripts/probe-live-tables.mjs imports relationsCreatedBy
   from here, and an import must not audit anything or exit the process. */
if (process.argv[1]?.endsWith('audit-migration-ledger.mjs')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
