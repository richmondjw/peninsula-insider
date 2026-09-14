/**
 * Tests for the migration ledger gate and the liveness probe.
 *
 * WHAT THESE ASSERT, AND WHAT THEY DELIBERATELY DO NOT
 *
 * They assert the RULE. They never assert today's data. A test that hardcoded
 * "pi.venue_claims, pi.corrections and pi.partner_enquiries are missing" would
 * pass today and fail the morning James applies the migrations — that is, it
 * would go red on success, which is worse than not testing at all. This
 * repository deleted two tests this week for being time-dependent in exactly
 * that way (a random-draw collision assertion, and an assertion pinned to a
 * literal date); a test coupled to the live state of a database would be the
 * third and the worst.
 *
 * So every fixture below is synthetic, every tree is built in a temp directory,
 * and nothing reads ops/migrations, the real ledger, or the network.
 *
 * The two properties that matter most:
 *
 *   1. A MIGRATION WITH NO LEDGER ROW FAILS. This is the whole mechanism. It is
 *      the negative test the brief asks for, and it is asserted both on its own
 *      and against a baseline that tries to permit it — a ceiling must not be
 *      editable into allowing silence.
 *
 *   2. THE GATE NEVER TOUCHES THE NETWORK. Every test here runs offline. If the
 *      gate ever grew a fetch, these would hang or fail on a machine with no
 *      egress, which is the point.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { classify, parseClientConfig, assertPublishable } from './probe-live-tables.mjs';
import { validateRow } from './audit-migration-ledger.mjs';

const run = promisify(execFile);
const GATE = fileURLToPath(new URL('./audit-migration-ledger.mjs', import.meta.url));

const CEILINGS = {
  unledgeredMigration: 0,
  orphanedLedgerEntry: 0,
  malformedLedgerEntry: 0,
  ddlInExcludedDirectory: 0,
  unknownStateMigration: 99,
  uncreatedTable: 99,
};

/**
 * Build a synthetic repository and audit it.
 *
 *   migrations  { '2026-01-01-a.sql': 'create table pi.a (id int);' }
 *   ledger      [ { file, state, ... } ]
 *   src         { 'lib/x.ts': "c.from('a')" }
 */
async function audit({ migrations = {}, ledger = [], src = {}, ceilings = {}, baseline = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-migration-ledger-'));
  try {
    const migrationsDir = join(dir, 'migrations');
    for (const [name, body] of Object.entries(migrations)) {
      const abs = join(migrationsDir, name);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, body);
    }
    await mkdir(migrationsDir, { recursive: true });

    const srcDir = join(dir, 'src');
    await mkdir(srcDir, { recursive: true });
    for (const [name, body] of Object.entries(src)) {
      const abs = join(srcDir, name);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, body);
    }

    const ledgerPath = join(dir, 'ledger.json');
    await writeFile(ledgerPath, JSON.stringify({ migrations: ledger }));

    const baselinePath = join(dir, 'baseline.json');
    if (baseline) {
      await writeFile(baselinePath, JSON.stringify({ ceilings: { ...CEILINGS, ...ceilings } }));
    }

    const args = [
      GATE,
      '--assert',
      '--migrations-dir',
      migrationsDir,
      '--ledger',
      ledgerPath,
      '--baseline',
      baselinePath,
      '--src',
      srcDir,
    ];
    try {
      const { stdout } = await run(process.execPath, args);
      return { code: 0, out: stdout };
    } catch (error) {
      return { code: error.code ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const applied = (file) => ({ file, state: 'applied', appliedOn: '2026-01-01' });
const pending = (file) => ({ file, state: 'pending', reason: 'probed absent on the live endpoint' });
const unknown = (file) => ({ file, state: 'unknown', reason: 'nothing ever recorded whether this ran' });

/* ---------------------------------------------------------------- */
/* The negative test: silence must fail                              */
/* ---------------------------------------------------------------- */

test('a migration with no ledger entry fails the gate', async () => {
  const { code, out } = await audit({
    migrations: {
      '2026-01-01-recorded.sql': 'create table pi.recorded (id int);',
      '2026-02-02-forgotten.sql': 'create table pi.forgotten (id int);',
    },
    ledger: [applied('2026-01-01-recorded.sql')],
  });
  assert.equal(code, 1, 'an unledgered migration must fail');
  assert.match(out, /UNLEDGERED\s+2026-02-02-forgotten\.sql/);
  assert.match(out, /unledgeredMigration/);
});

test('a baseline cannot be edited into permitting an unledgered migration', async () => {
  // The ratchet is a convenience for inherited debt, not a licence. The four
  // structural metrics are ceiling-0 by contract whatever a baseline claims —
  // otherwise the first person inconvenienced by the gate simply raises the
  // number and the silence comes straight back.
  const { code, out } = await audit({
    migrations: { '2026-02-02-forgotten.sql': 'create table pi.forgotten (id int);' },
    ledger: [],
    ceilings: { unledgeredMigration: 5 },
  });
  assert.equal(code, 1);
  assert.match(out, /structural, not baselineable/);
});

test('every migration recorded, in any of the three states, passes', async () => {
  const { code, out } = await audit({
    migrations: {
      '2026-01-01-a.sql': 'create table pi.a (id int);',
      '2026-01-02-b.sql': 'create table pi.b (id int);',
      '2026-01-03-c.sql': 'create table pi.c (id int);',
    },
    ledger: [applied('2026-01-01-a.sql'), pending('2026-01-02-b.sql'), unknown('2026-01-03-c.sql')],
  });
  assert.equal(code, 0, out);
  assert.match(out, /PASS/);
});

/* ---------------------------------------------------------------- */
/* A state without its evidence is not a record                      */
/* ---------------------------------------------------------------- */

test('"applied" without a date is rejected', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create table pi.a (id int);' },
    ledger: [{ file: '2026-01-01-a.sql', state: 'applied' }],
  });
  assert.equal(code, 1);
  assert.match(out, /MALFORMED/);
  assert.match(out, /appliedOn/);
});

test('"applied" may record appliedOn "unknown" when the date is genuinely unrecoverable', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create table pi.a (id int);' },
    ledger: [{ file: '2026-01-01-a.sql', state: 'applied', appliedOn: 'unknown' }],
  });
  assert.equal(code, 0, out);
});

test('"pending" and "unknown" without a reason are rejected', async () => {
  for (const state of ['pending', 'unknown']) {
    const { code, out } = await audit({
      migrations: { '2026-01-01-a.sql': 'create table pi.a (id int);' },
      ledger: [{ file: '2026-01-01-a.sql', state }],
    });
    assert.equal(code, 1, `${state} without a reason must fail`);
    assert.match(out, /needs a reason/);
  }
});

test('a state outside the three is rejected', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create table pi.a (id int);' },
    ledger: [{ file: '2026-01-01-a.sql', state: 'probably fine' }],
  });
  assert.equal(code, 1);
  assert.match(out, /is not one of/);
});

test('validateRow is the single place those rules live', () => {
  assert.deepEqual(validateRow({ file: 'a.sql', state: 'applied', appliedOn: '2026-01-01' }), []);
  assert.ok(validateRow({ file: 'a.sql', state: 'applied' }).length);
  assert.ok(validateRow({ file: 'a.sql', state: 'pending', reason: 'short' }).length);
  assert.ok(validateRow({ state: 'unknown', reason: 'no file named at all' }).length);
});

/* ---------------------------------------------------------------- */
/* Ledger hygiene                                                    */
/* ---------------------------------------------------------------- */

test('a ledger row naming a file that is not there fails', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create table pi.a (id int);' },
    ledger: [applied('2026-01-01-a.sql'), applied('2026-01-01-renamed-away.sql')],
  });
  assert.equal(code, 1);
  assert.match(out, /ORPHANED\s+2026-01-01-renamed-away\.sql/);
});

test('the same migration listed twice fails', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create table pi.a (id int);' },
    ledger: [applied('2026-01-01-a.sql'), pending('2026-01-01-a.sql')],
  });
  assert.equal(code, 1);
  assert.match(out, /listed more than once/);
});

test('a missing ledger file fails closed rather than reading as nothing to record', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-migration-ledger-'));
  try {
    const migrationsDir = join(dir, 'migrations');
    await mkdir(migrationsDir, { recursive: true });
    await writeFile(join(migrationsDir, '2026-01-01-a.sql'), 'create table pi.a (id int);');
    const args = [GATE, '--migrations-dir', migrationsDir, '--ledger', join(dir, 'nope.json')];
    const result = await run(process.execPath, args).then(
      () => ({ code: 0, out: '' }),
      (error) => ({ code: error.code ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` })
    );
    assert.equal(result.code, 1);
    assert.match(result.out, /cannot read the migration ledger/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/* ---------------------------------------------------------------- */
/* The exclusion is policed, not trusted                             */
/* ---------------------------------------------------------------- */

test('DDL hidden in the excluded verification directory fails', async () => {
  const { code, out } = await audit({
    migrations: {
      '2026-01-01-a.sql': 'create table pi.a (id int);',
      'verification/2026-01-01-check.sql': 'select count(*) from pi.a;',
      'verification/2026-01-02-sneaky.sql': 'create table pi.sneaky (id int);',
    },
    ledger: [applied('2026-01-01-a.sql')],
  });
  assert.equal(code, 1);
  assert.match(out, /DDL\s+verification\/2026-01-02-sneaky\.sql/);
});

test('a read-only verification query needs no ledger row', async () => {
  const { code, out } = await audit({
    migrations: {
      '2026-01-01-a.sql': 'create table pi.a (id int);',
      'verification/2026-01-01-check.sql': '-- create table would be wrong here\nselect count(*) from pi.a;',
    },
    ledger: [applied('2026-01-01-a.sql')],
  });
  assert.equal(code, 0, out);
});

/* ---------------------------------------------------------------- */
/* The expected-table set is derived, not written down               */
/* ---------------------------------------------------------------- */

test('a table the code names that no migration creates is a finding', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create table pi.a (id int);' },
    ledger: [applied('2026-01-01-a.sql')],
    src: { 'lib/queries.ts': "const r = await client.from('never_created').select('*');" },
    ceilings: { uncreatedTable: 0 },
  });
  assert.equal(code, 1);
  assert.match(out, /UNCREATED\s+pi\.never_created/);
});

test('adding a query against an existing table does not trip the gate', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create table if not exists pi.a (id int);' },
    ledger: [applied('2026-01-01-a.sql')],
    src: { 'lib/queries.ts': "const r = await client.from('a').select('*');" },
    ceilings: { uncreatedTable: 0 },
  });
  assert.equal(code, 0, out);
});

test('a view counts as created — the app reads one', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create or replace view pi.counts as select 1;' },
    ledger: [applied('2026-01-01-a.sql')],
    src: { 'lib/queries.ts': "const r = await client.from('counts').select('*');" },
    ceilings: { uncreatedTable: 0 },
  });
  assert.equal(code, 0, out);
});

test('storage.from is a bucket, not a table', async () => {
  const { code, out } = await audit({
    migrations: { '2026-01-01-a.sql': 'create table pi.a (id int);' },
    ledger: [applied('2026-01-01-a.sql')],
    src: { 'lib/upload.ts': "await client.storage.from('submissions').upload(p, f);" },
    ceilings: { uncreatedTable: 0 },
  });
  assert.equal(code, 0, out);
});

/* ---------------------------------------------------------------- */
/* The ratchet                                                       */
/* ---------------------------------------------------------------- */

test('inherited unknowns do not block; adding one does', async () => {
  const migrations = {
    '2026-01-01-a.sql': 'create table pi.a (id int);',
    '2026-01-02-b.sql': 'create table pi.b (id int);',
  };
  const atCeiling = await audit({
    migrations,
    ledger: [unknown('2026-01-01-a.sql'), applied('2026-01-02-b.sql')],
    ceilings: { unknownStateMigration: 1 },
  });
  assert.equal(atCeiling.code, 0, atCeiling.out);

  const overCeiling = await audit({
    migrations,
    ledger: [unknown('2026-01-01-a.sql'), unknown('2026-01-02-b.sql')],
    ceilings: { unknownStateMigration: 1 },
  });
  assert.equal(overCeiling.code, 1);
  assert.match(overCeiling.out, /unknownStateMigration: 2 > baseline 1/);
});

/* ---------------------------------------------------------------- */
/* The probe's classification, driven without a network              */
/* ---------------------------------------------------------------- */

test('a missing table is absent, and a forbidden one is not', () => {
  assert.equal(classify({ status: 200, body: [] }).verdict, 'present');
  assert.equal(
    classify({
      status: 404,
      body: { code: 'PGRST205', message: "Could not find the table 'pi.venue_claims' in the schema cache" },
    }).verdict,
    'absent'
  );
  // The distinction the whole probe rests on: a table anon may not read EXISTS.
  // Calling it absent would report most of this schema as missing every night.
  assert.equal(
    classify({ status: 401, body: { code: '42501', message: 'permission denied for table profiles' } }).verdict,
    'present-restricted'
  );
  assert.equal(classify({ status: 403, body: null }).verdict, 'present-restricted');
  assert.equal(classify({ status: 406, body: { code: 'PGRST106' } }).verdict, 'schema-unexposed');
});

test('a bad night is never reported as a missing table', () => {
  // This is the property that makes the probe safe to schedule. Every failure
  // that is not a specific PostgREST "no such table" answer must classify as
  // unreachable — including a 404 that carries no PostgREST error code, which
  // a naive checker would read as absence.
  for (const response of [
    { status: 500, body: null },
    { status: 502, body: null },
    { status: 503, body: { message: 'upstream connect error' } },
    { status: 504, body: null },
    { status: 404, body: null },
    { status: 404, body: { message: 'not found' } },
    { status: 0, body: null },
  ]) {
    assert.equal(
      classify(response).verdict,
      'unreachable',
      `HTTP ${response.status} must be inconclusive, never "absent"`
    );
  }
});

test('the probe refuses a service key and accepts a publishable one', () => {
  assert.equal(assertPublishable('sb_publishable_abc123'), 'sb_publishable_abc123');
  assert.throws(() => assertPublishable('sb_secret_abc123'), /service key/);
  assert.throws(() => assertPublishable('sbp_abc123'), /service key/);
  assert.throws(() => assertPublishable(''), /no key/);

  const jwt = (role) =>
    `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`;
  assert.throws(() => assertPublishable(jwt('service_role')), /service_role/);
  assert.equal(assertPublishable(jwt('anon')), jwt('anon'));
});

test('the endpoint and key are read out of the app, not written down twice', () => {
  const source = [
    "const SUPABASE_URL =",
    "  (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) ||",
    "  'https://example-project.supabase.co';",
    "const SUPABASE_ANON_KEY =",
    "  (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||",
    "  'sb_publishable_TESTKEY-000_aa';",
  ].join('\n');
  const { url, key } = parseClientConfig(source);
  assert.equal(url, 'https://example-project.supabase.co');
  assert.equal(key, 'sb_publishable_TESTKEY-000_aa');
  assert.deepEqual(parseClientConfig(''), { url: null, key: null });
});
