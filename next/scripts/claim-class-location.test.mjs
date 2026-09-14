/**
 * Tests for the two location claim classes, `address` and `coordinates`.
 *
 * PI-005 shipped a registry that could not file the single most consequential
 * fact about a place. All 137 venue records assert a street address and a
 * coordinate pair; the precedence table defined neither, so no address claim
 * could be filed, sourced, expired or reported as a blind spot. These two
 * classes close that, and this file asserts the contract they have to keep.
 *
 * THREE RULES GOVERN THIS FILE, AND THEY ARE THE SAME THREE THAT GOVERN
 * audit-claim-support.test.mjs NEXT DOOR. They are restated because every one
 * of them has already been broken in this repository at least once.
 *
 * 1. Nothing here asserts today's corpus. Not a venue slug, not a claim count,
 *    not which classes happen to be evidenced this morning. An earlier test
 *    hardcoded the three classes that carried no evidence the day it was
 *    written; the first pilot sourced all three and turned a real improvement
 *    into a red build on main (commit dfa37b0). Every expectation below is
 *    computed at runtime from src/data/source-precedence.json, from
 *    src/content.config.ts, or from a fixture this file builds itself. Source
 *    the whole venue collection tomorrow and every test here stays green.
 *
 * 2. Nothing asserted here may move with the calendar. `address` evidence
 *    lasts 180 days and `coordinates` 365, so a gate on derived state would
 *    cross its own threshold on a morning nobody chose with no commit in
 *    between, and no deploy could clear it. Three tests were deleted the day
 *    before this one was written for breaking that rule in three different
 *    ways. The expiry windows are exercised below only in the direction that
 *    proves they CANNOT fail a build.
 *
 * 3. The negative cases carry the weight. A gate that has only ever been seen
 *    to pass has not been seen to work.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';

import { expiryDaysFor, computeExpiresAt, publisherRank, toIsoDay } from '../src/lib/claim-state.mjs';
import { CONSEQUENCE } from './verification-loop/select.mjs';
import { loadRegistry, supportByClass } from './audit-claim-support.mjs';

const run = promisify(execFile);
const NEXT = path.dirname(fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, ''));
const SCRIPT = path.join(NEXT, 'scripts', 'audit-claim-support.mjs');
const PRECEDENCE_FILE = path.join(NEXT, 'src', 'data', 'source-precedence.json');
const CONFIG_FILE = path.join(NEXT, 'src', 'content.config.ts');
const COORD_LINT = path.join(NEXT, 'scripts', 'lint-coordinates.mjs');

/** The two classes under test. Named once; every test below derives from here. */
const LOCATION_CLASSES = ['address', 'coordinates'];

const precedence = JSON.parse(await readFile(PRECEDENCE_FILE, 'utf8'));

/* ------------------------------------------------------------------ */
/* Fixture harness                                                      */
/* ------------------------------------------------------------------ */

const claimOf = (id, claimClass, extra = {}) => {
  const [type, slug] = id.split('/');
  const subject = { type, slug, field: claimClass };
  return {
    claimId: id,
    claimClass,
    subject,
    statement: 'A sentence.',
    assertedBy: [subject],
    createdAt: '2020-01-01',
    ...extra,
  };
};

const rowOf = (id, claimId, claimClass, extra = {}) => ({
  evidenceId: id,
  claim: claimId,
  stance: 'supports',
  publisher: { kind: 'venue-site' },
  url: 'https://example.test/',
  retrievedAt: '2020-01-01',
  expiresAt: toIsoDay(computeExpiresAt('2020-01-01', claimClass, precedence)),
  ...extra,
});

/**
 * Build a registry on disk and run the real CLI over it. The fixture's
 * precedence table is the REAL one unless `table` overrides it, so these tests
 * track src/data/source-precedence.json instead of pinning a copy of it that
 * would quietly drift.
 */
async function audit({ claims = [], evidence = [], ceilings = {}, today, table = precedence } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'pi005-location-'));
  try {
    const root = path.join(dir, 'project');
    const write = async (kind, records, idKey) => {
      for (const record of records) {
        const file = path.join(root, 'src', 'content', kind, `${record[idKey]}.json`);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, JSON.stringify(record, null, 2));
      }
    };
    await write('claims', claims, 'claimId');
    await write('evidence', evidence, 'evidenceId');

    const precedenceFile = path.join(root, 'src', 'data', 'source-precedence.json');
    await mkdir(path.dirname(precedenceFile), { recursive: true });
    await writeFile(precedenceFile, JSON.stringify(table, null, 2));

    const baselinePath = path.join(dir, 'baseline.json');
    await writeFile(baselinePath, JSON.stringify({ ceilings }, null, 2));
    const jsonOut = path.join(dir, 'report.json');

    const args = [SCRIPT, '--project-root', root, '--baseline', baselinePath, '--json', jsonOut, '--assert'];
    if (today) args.push('--today', today);

    let code = 0;
    let out = '';
    try {
      out = (await run(process.execPath, args)).stdout;
    } catch (error) {
      code = error.code ?? 1;
      out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    let report = null;
    try {
      report = JSON.parse(await readFile(jsonOut, 'utf8'));
    } catch {
      report = null;
    }
    return { code, out, report };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const bucket = (report, claimClass) => report.support.find((entry) => entry.claimClass === claimClass);

/* ------------------------------------------------------------------ */
/* A. The two-file invariant                                            */
/* ------------------------------------------------------------------ */

/**
 * Zod strips unknown keys silently, and a claimClass the enum does not list
 * fails validation rather than being stripped - opposite failures, same root
 * cause: the class list lives in two files and nothing made them agree. The
 * comment on the precedence table says "both edits, or neither". This is that
 * sentence as a test, and it is general: it will catch the SIXTEENTH class
 * somebody adds to one file and forgets in the other.
 */
test('every claim class is defined in the precedence table and declared in the content schema', async () => {
  const source = await readFile(CONFIG_FILE, 'utf8');
  const block = /const claimClass = z\.enum\(\[([\s\S]*?)\]\);/.exec(source);
  assert.ok(block, 'the claimClass enum must be findable in src/content.config.ts');

  // Strip line comments first: the prose inside this enum quotes class names,
  // and a comment is not a declaration.
  const declared = new Set(
    [...block[1].replace(/\/\/.*$/gm, '').matchAll(/'([a-z][a-z0-9-]*)'/g)].map((m) => m[1])
  );
  const defined = new Set(Object.keys(precedence.classes));

  for (const name of defined) {
    assert.ok(declared.has(name), `${name} is in source-precedence.json and not in the claimClass enum`);
  }
  for (const name of declared) {
    assert.ok(defined.has(name), `${name} is in the claimClass enum and not in source-precedence.json`);
  }
});

test('the two location classes exist in both files', () => {
  for (const name of LOCATION_CLASSES) {
    assert.ok(precedence.classes[name], `${name} must be defined in source-precedence.json`);
  }
});

/**
 * The verification loop rates every class for reader consequence and falls
 * back to 'low' for one it does not know. Its own comment claims every class
 * in the precedence table appears there; until now nothing checked. A silent
 * fallback to 'low' would push a wrong address to the bottom of every
 * worklist it ever appears on.
 */
test('every class the precedence table defines carries a reader-consequence rating', () => {
  for (const name of Object.keys(precedence.classes)) {
    assert.ok(CONSEQUENCE[name], `${name} has no entry in the verification loop's CONSEQUENCE table`);
  }
  for (const name of Object.keys(CONSEQUENCE)) {
    assert.ok(precedence.classes[name], `${name} is rated but the precedence table no longer defines it`);
  }
});

/* ------------------------------------------------------------------ */
/* B. The precedence contract                                           */
/* ------------------------------------------------------------------ */

test('every class ranks every publisher kind, exactly once', () => {
  const kinds = precedence.publisherKinds;
  for (const [name, entry] of Object.entries(precedence.classes)) {
    const order = entry.precedence ?? [];
    assert.equal(new Set(order).size, order.length, `${name} ranks a publisher kind twice`);
    for (const kind of kinds) {
      assert.ok(order.includes(kind), `${name} does not rank '${kind}'`);
    }
    for (const kind of order) {
      assert.ok(kinds.includes(kind), `${name} ranks '${kind}', which is not a declared publisher kind`);
    }
  }
});

/**
 * If these two ever become the same order, one of them is redundant and the
 * decision to split should be reopened deliberately rather than discovered.
 */
test('address and coordinates do not rank their sources the same way', () => {
  const [a, b] = LOCATION_CLASSES.map((name) => precedence.classes[name].precedence.join(','));
  assert.notEqual(a, b, 'two classes with an identical precedence order are one class wearing two hats');
});

/**
 * The substantive rule for each class, expressed as a rank comparison rather
 * than a pinned array, so reordering the tail is free and inverting the head
 * is not.
 */
test('the occupier leads on address; a public authority leads on coordinates', () => {
  const rank = (kind, cls) => publisherRank(kind, cls, precedence);
  assert.equal(rank('venue-site', 'address'), 0, 'the party that publishes its own address leads that class');
  assert.equal(rank('gov', 'coordinates'), 0, 'a public land or address-point authority leads coordinates');
  assert.ok(
    rank('venue-site', 'coordinates') > rank('gov', 'coordinates'),
    'an operator map pin is usually a geocode of its own address line, so it cannot outrank the authority'
  );
});

/**
 * The class exists because our own geocoder produced the corpus. If `importer`
 * ever climbs above a kind that can actually observe the ground, the class has
 * stopped meaning anything.
 */
test('our own import pipeline ranks below every kind that can observe the ground', () => {
  for (const kind of ['gov', 'visit', 'venue-site', 'organiser']) {
    assert.ok(
      publisherRank('importer', 'coordinates', precedence) > publisherRank(kind, 'coordinates', precedence),
      `importer must rank below ${kind} for coordinates`
    );
  }
});

/**
 * A29 guard. `partner` is ranked second for trading-status, opening-hours and
 * access-restriction, above a news report and above our own visit. That
 * ranking is on James's decision register, is not settled, and is deliberately
 * not copied into these two classes: a commercial relationship may not buy
 * precedence over the three kinds that actually know where a place is. This
 * test does not touch the existing entries - it only stops the pattern
 * spreading here by accident.
 */
test('a commercial partner is outside the top three of both location classes', () => {
  for (const name of LOCATION_CLASSES) {
    assert.ok(
      publisherRank('partner', name, precedence) >= 3,
      `partner must not sit in the top three for ${name} while A29 is unsettled`
    );
  }
});

/* ------------------------------------------------------------------ */
/* C. Expiry is computed and reported. It can never fail a build.       */
/* ------------------------------------------------------------------ */

test('both classes carry a finite, positive expiry read from the table and not from a constant', () => {
  for (const name of LOCATION_CLASSES) {
    const days = expiryDaysFor(name, precedence);
    assert.ok(Number.isFinite(days) && days > 0, `${name} needs a usable expiry window`);
    assert.equal(days, precedence.classes[name].expiryDays);

    // Edit the table and the computation follows it. Nothing downstream may
    // hold its own copy of 180 or 365.
    const edited = { ...precedence, classes: { ...precedence.classes, [name]: { ...precedence.classes[name], expiryDays: days + 7 } } };
    assert.equal(expiryDaysFor(name, edited), days + 7);
  }
});

test('expiresAt is retrievedAt plus the window, and does not consult the clock', () => {
  for (const name of LOCATION_CLASSES) {
    const days = expiryDaysFor(name, precedence);
    const got = computeExpiresAt('2026-09-14', name, precedence);
    const want = new Date(Date.parse('2026-09-14') + days * 24 * 60 * 60 * 1000);
    assert.equal(toIsoDay(got), toIsoDay(want));
    // Same input, same answer, whenever it is asked.
    assert.equal(toIsoDay(computeExpiresAt('2026-09-14', name, precedence)), toIsoDay(got));
  }
});

/**
 * THE CONSTRAINT. An address row goes stale after 180 days and a coordinate
 * row after 365, by doing nothing at all. If either could reach the gate, this
 * build would go red on a date nobody chose and no commit could clear it.
 */
test('a location claim whose evidence expired years ago still passes the gate, identically, a decade apart', async () => {
  const corpus = {
    claims: LOCATION_CLASSES.map((name) => claimOf(`venues/a/${name}`, name)),
    evidence: LOCATION_CLASSES.map((name) =>
      rowOf(`venues/a/${name}-operator-2020-01-01`, `venues/a/${name}`, name)
    ),
    ceilings: {},
  };

  const near = await audit({ ...corpus, today: '2020-01-02' });
  const far = await audit({ ...corpus, today: '2030-01-02' });

  assert.equal(near.code, 0, 'fresh evidence passes');
  assert.equal(far.code, 0, 'evidence a decade past its window must still pass');
  assert.deepEqual(near.report.support, far.report.support, 'the gated half may not move with the calendar');
  assert.deepEqual(near.report.totals, far.report.totals);

  // And the two runs really did see different calendars, so the assertion
  // above is not vacuously true.
  assert.equal(near.report.reportedOnly.expiredEvidenceRows, 0);
  assert.equal(far.report.reportedOnly.expiredEvidenceRows, LOCATION_CLASSES.length);
});

test('no gated number for the location classes changes when the run date changes', async () => {
  const registry = await loadRegistry(NEXT);
  const first = supportByClass(registry);
  const second = supportByClass(registry);
  for (const name of LOCATION_CLASSES) {
    // supportByClass takes no date at all: there is no parameter a calendar
    // could arrive through. Asserted so a future refactor cannot add one.
    assert.deepEqual(bucket({ support: first }, name), bucket({ support: second }, name));
  }
  assert.equal(supportByClass.length, 1, 'supportByClass must take the registry and nothing else');
});

/* ------------------------------------------------------------------ */
/* D. The negative cases                                                */
/* ------------------------------------------------------------------ */

test('an address claim with nothing behind it fails a build once the class is at its ceiling', async () => {
  const { code, out } = await audit({
    claims: [claimOf('venues/a/address', 'address')],
    ceilings: {},
  });
  assert.equal(code, 1);
  assert.match(out, /address: 1 claim\(s\) with no supporting evidence/);
});

test('a coordinates claim with nothing behind it fails the same way, and the two classes gate separately', async () => {
  const { code, out, report } = await audit({
    claims: [claimOf('venues/a/address', 'address'), claimOf('venues/a/coordinates', 'coordinates')],
    evidence: [rowOf('venues/a/address-operator-2026-09-14', 'venues/a/address', 'address')],
    // address is allowed to carry debt here; coordinates is not listed at all.
    ceilings: { address: 5 },
  });
  assert.equal(code, 1);
  assert.match(out, /coordinates: 1 claim\(s\) with no supporting evidence/);
  assert.doesNotMatch(out, /address: \d+ claim/);
  assert.equal(bucket(report, 'address').unbacked, 0);
  assert.equal(bucket(report, 'coordinates').unbacked, 1);
});

/**
 * THE SCOPE ARGUMENT, AS A TEST. A record can carry a correct street address
 * and a pin in the wrong place; that is what happened. Folded into one class,
 * the operator's correct address line would have stood as support for the pin.
 * Here the venue has a fully supported address and an unsupported coordinate,
 * and the gate must still fail.
 */
test('support for a venue address does not back that venue coordinate', async () => {
  const { code, report } = await audit({
    claims: [claimOf('venues/a/address', 'address'), claimOf('venues/a/coordinates', 'coordinates')],
    evidence: [rowOf('venues/a/address-operator-2026-09-14', 'venues/a/address', 'address')],
    ceilings: {},
  });
  assert.equal(code, 1, 'a supported address may not launder an unsupported coordinate');
  assert.equal(bucket(report, 'address').unbacked, 0);
  assert.equal(bucket(report, 'coordinates').unbacked, 1);
  assert.equal(bucket(report, 'coordinates').unevidenced, 1);
});

/**
 * The four unbacked location claims on this branch are unbacked because their
 * evidence DISPUTES the record, which is a different fact from nobody having
 * looked. The gate must count a dispute as "not support" and the report must
 * keep the two apart, or the ceiling cannot be read.
 */
test('a disputing row is not support, and is still counted as evidence', async () => {
  const { code, report } = await audit({
    claims: [claimOf('venues/a/address', 'address')],
    evidence: [
      rowOf('venues/a/address-operator-2026-09-14', 'venues/a/address', 'address', { stance: 'disputes' }),
    ],
    ceilings: {},
  });
  assert.equal(code, 1);
  const row = bucket(report, 'address');
  assert.equal(row.unbacked, 1);
  assert.equal(row.disputed, 1);
  assert.equal(row.unevidenced, 0, 'somebody looked and disagreed is not nobody looked');
  assert.ok(!report.reportedOnly.blindSpots.includes('address'), 'a disputed class is not a blind spot');
});

/**
 * The other half of "both edits, or neither". Deleting a class from the
 * precedence table while claims in it are still on disk must be a hard
 * failure, not a silent fallback to the default expiry.
 */
test('removing a location class from the table while claims exist is a structural failure', async () => {
  for (const name of LOCATION_CLASSES) {
    const table = { ...precedence, classes: { ...precedence.classes } };
    delete table.classes[name];
    const { code, out } = await audit({
      claims: [claimOf(`venues/a/${name}`, name)],
      evidence: [rowOf(`venues/a/${name}-operator-2026-09-14`, `venues/a/${name}`, name)],
      ceilings: { [name]: 999 },
      table,
    });
    assert.equal(code, 1, `${name}: a claim in an undefined class must hard-fail`);
    assert.match(out, /structurally broken/);
    assert.match(out, new RegExp(`claimClass '${name}' is not defined`));
  }
});

test('an evidence row whose publisher kind the table does not list is a structural failure', async () => {
  const { code, out } = await audit({
    claims: [claimOf('venues/a/coordinates', 'coordinates')],
    evidence: [
      rowOf('venues/a/coordinates-geocoder-2026-09-14', 'venues/a/coordinates', 'coordinates', {
        publisher: { kind: 'some-geocoder' },
      }),
    ],
    ceilings: { coordinates: 999 },
  });
  assert.equal(code, 1);
  assert.match(out, /publisher\.kind 'some-geocoder' is not listed/);
});

/* ------------------------------------------------------------------ */
/* E. Why coordinates cannot be folded into address                     */
/* ------------------------------------------------------------------ */

/**
 * lint-coordinates.mjs is the only thing in the build that looks at a
 * coordinate, and it is a bounding box for the whole Peninsula. Its own header
 * records the Point Nepean incident of 2026-08-21: four entries in bounds and
 * in the water. The distance between the two worst records found since is
 * 1.4 km, and the box admits errors orders of magnitude larger than that.
 *
 * Read from the lint's own constants rather than pinned here, so tightening
 * the box tightens this test with it - and if the box is ever tightened past
 * the point where a location error can hide inside it, this test says so and
 * the case for the class can be reopened.
 */
test('the coordinate bounding box the build enforces cannot see a location error', async () => {
  const source = await readFile(COORD_LINT, 'utf8');
  const constant = (name) => {
    const m = new RegExp(`const ${name} = (-?[\\d.]+);`).exec(source);
    assert.ok(m, `${name} must be readable from lint-coordinates.mjs`);
    return Number(m[1]);
  };
  const latMin = constant('LAT_MIN');
  const latMax = constant('LAT_MAX');
  const lngMin = constant('LNG_MIN');
  const lngMax = constant('LNG_MAX');

  assert.ok(latMax > latMin && lngMax > lngMin, 'the box must be a box');

  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const metres = (lat1, lng1, lat2, lng2) => {
    const h =
      Math.sin(rad(lat2 - lat1) / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // Two points the lint passes without complaint.
  const diagonal = metres(latMin, lngMin, latMax, lngMax);
  assert.ok(
    diagonal > 1400,
    `the box admits two in-bounds points ${Math.round(diagonal)} m apart, which is why a wrong pin needs a claim class rather than a bounds check`
  );
});

/* ------------------------------------------------------------------ */
/* F. The committed corpus stays inside what the committed baseline says */
/* ------------------------------------------------------------------ */

/**
 * Not "the ceiling equals the count" - a ceiling is a ceiling, and demanding
 * equality would turn resolving one of the four disputes into a red build.
 * Only that the committed baseline already admits the committed corpus, so
 * main is green for everyone the moment this lands.
 */
test('the committed baseline admits the committed location claims', async () => {
  const registry = await loadRegistry(NEXT);
  const baseline = JSON.parse(
    await readFile(path.join(NEXT, '..', 'ops', 'reports', 'claims', 'claim-support-baseline.json'), 'utf8')
  );
  for (const name of LOCATION_CLASSES) {
    const row = bucket({ support: supportByClass(registry) }, name);
    assert.ok(row, `${name} must be reported`);
    assert.ok(
      row.unbacked <= (baseline.ceilings?.[name] ?? 0),
      `${name}: ${row.unbacked} unbacked exceeds the committed ceiling ${baseline.ceilings?.[name] ?? 0}`
    );
  }
});
