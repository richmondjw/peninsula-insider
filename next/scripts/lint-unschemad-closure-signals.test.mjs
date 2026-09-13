/**
 * Tests for the invisible-closure gate.
 *
 * The gate runs inside `npm run build`, so a false failure blocks every deploy
 * and a false pass lets a closure hide where Zod will discard it. Both
 * directions are asserted here, against fixture projects rather than the live
 * corpus.
 *
 * The first case is the real one: the exact La Baracca record as it stood on
 * disk from May to September 2026, against a venue schema that does not
 * declare `operatingStatus`. That is the shape this gate exists to catch, and
 * if this test ever stops failing the gate has stopped working.
 *
 * Nothing in this file pins a date, because nothing in the gate reads one. The
 * schemas come from the config and the values come from the records, so the
 * same tree gives the same answer today and next April.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { isClosureSignal, audit } from './lint-unschemad-closure-signals.mjs';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./lint-unschemad-closure-signals.mjs', import.meta.url));

/**
 * A fixture Astro project: one `venues` collection whose schema declares only
 * the fields named in `declared`, plus whatever records are passed.
 */
async function fixture({ declared = ['slug', 'name'], venues = {} }) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-unschemad-closure-'));
  const contentDir = join(dir, 'src', 'content', 'venues');
  await mkdir(contentDir, { recursive: true });

  const shape = declared.map((k) => `    ${JSON.stringify(k)}: z.string().optional(),`).join('\n');
  await writeFile(
    join(dir, 'src', 'content.config.ts'),
    [
      "import { defineCollection, z } from 'astro:content';",
      "import { glob } from 'astro/loaders';",
      'const venues = defineCollection({',
      "  loader: glob({ pattern: '**/*.json', base: './src/content/venues' }),",
      '  schema: z.object({',
      shape,
      '  }),',
      '});',
      'export const collections = { venues };',
      '',
    ].join('\n')
  );

  for (const [name, record] of Object.entries(venues)) {
    await writeFile(join(contentDir, name), JSON.stringify(record, null, 2));
  }
  return dir;
}

async function auditFixture(spec) {
  const dir = await fixture(spec);
  try {
    return await audit({ projectRoot: dir });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// -- the real defect --------------------------------------------------------

test('catches the La Baracca record exactly as it stood on disk', async () => {
  const result = await auditFixture({
    declared: ['slug', 'name', 'status'],
    venues: {
      'la-baracca-tgallant.json': {
        slug: 'la-baracca-tgallant',
        name: "La Baracca at T'Gallant",
        operatingStatus: 'permanently-closed',
        closureNote:
          "La Baracca dining concept discontinued. T'Gallant has a new menu and dining format as of 2026. Confirmed by Peninsula Insider editor May 2026.",
      },
    },
  });

  const keys = result.hits.map((h) => h.key);
  assert.ok(
    keys.includes('operatingStatus'),
    `expected operatingStatus to be reported, got ${JSON.stringify(keys)}`
  );
  assert.equal(result.totals.records, 1, 'one key path, not one per string');
  assert.equal(result.hits[0].signal.toLowerCase(), 'permanently-closed');
});

test('says nothing once the field is declared, which is the fix', async () => {
  const result = await auditFixture({
    declared: ['slug', 'name', 'operatingStatus', 'closureNote'],
    venues: {
      'la-baracca-tgallant.json': {
        slug: 'la-baracca-tgallant',
        name: "La Baracca at T'Gallant",
        operatingStatus: 'permanently-closed',
        closureNote: 'Confirmed by Peninsula Insider editor May 2026.',
      },
    },
  });
  assert.equal(result.totals.records, 0);
});

test('catches a closure hidden in prose under a ghost key the drift gate already licenses', async () => {
  // This is the gap between the two gates. `openingHours` is in the drift
  // baseline at its current count, so adding a closure INSIDE it changes no
  // key count and passes drift clean.
  const result = await auditFixture({
    declared: ['slug', 'name'],
    venues: {
      'somewhere.json': {
        slug: 'somewhere',
        name: 'Somewhere',
        openingHours: ['Wed-Sun 11-late', 'The kitchen ceased trading in March.'],
      },
    },
  });
  assert.equal(result.totals.records, 1);
  assert.equal(result.hits[0].key, 'openingHours');
});

test('finds a closure nested inside an undeclared object', async () => {
  const result = await auditFixture({
    declared: ['slug', 'name'],
    venues: {
      'nested.json': {
        slug: 'nested',
        name: 'Nested',
        desk: { note: { body: 'The owners confirmed it is no longer trading.' } },
      },
    },
  });
  assert.equal(result.totals.records, 1);
  assert.equal(result.hits[0].key, 'desk');
});

// -- the false positives that would make people ignore the gate -------------

test('a venue that is merely shut on some days or seasons is not a closure', async () => {
  const result = await auditFixture({
    declared: ['slug', 'name'],
    venues: {
      'seasonal.json': {
        slug: 'seasonal',
        name: 'Seasonal',
        deskNote: 'Closed Mondays and Tuesdays.',
      },
      'winter.json': {
        slug: 'winter',
        name: 'Winter',
        deskNote: 'The cellar door is closed for winter and reopens in September.',
      },
      'temporary.json': {
        slug: 'temporary',
        name: 'Temporary',
        deskNote: 'Temporarily closed for renovations.',
      },
      'fishing.json': {
        slug: 'fishing',
        name: 'Fishing',
        deskNote: 'Snapper is in a closed season until December.',
      },
    },
  });
  assert.equal(result.totals.records, 0, JSON.stringify(result.hits, null, 2));
});

test('a mixed value that says both is reported, because the closure half wins', async () => {
  // Deliberate: "closed Mondays, and permanently closed since June" must not
  // be excused by its first clause.
  assert.equal(isClosureSignal('Closed Mondays.'), null);
  assert.ok(isClosureSignal('Permanently closed since June.'));
});

test('the predicate matches all three separator spellings and no day-of-week', () => {
  for (const v of ['permanently-closed', 'permanently_closed', 'Permanently Closed']) {
    assert.ok(isClosureSignal(v), `${v} should match`);
  }
  for (const v of [
    'closed Sundays',
    'closed for the season',
    'closed-loop irrigation',
    'road closure ahead',
    'open daily',
    '',
  ]) {
    assert.equal(isClosureSignal(v), null, `${v} should not match`);
  }
});

test('non-strings cannot assert a closure', () => {
  assert.equal(isClosureSignal(true), null);
  assert.equal(isClosureSignal(3), null);
  assert.equal(isClosureSignal(null), null);
  assert.equal(isClosureSignal(undefined), null);
});

// -- the ratchet ------------------------------------------------------------

test('--assert fails on a key path with no baseline entry and passes with one', async () => {
  const dir = await fixture({
    declared: ['slug', 'name'],
    venues: {
      'shut.json': { slug: 'shut', name: 'Shut', deskStatus: 'permanently closed' },
    },
  });
  const baselinePath = join(dir, 'baseline.json');
  try {
    await writeFile(baselinePath, JSON.stringify({ ceilings: {} }, null, 2));
    await assert.rejects(
      () =>
        run(process.execPath, [
          SCRIPT,
          '--project-root',
          dir,
          '--baseline',
          baselinePath,
          '--assert',
        ]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /venues\.deskStatus/);
        return true;
      }
    );

    await writeFile(
      baselinePath,
      JSON.stringify({ ceilings: { 'venues.deskStatus': 1 } }, null, 2)
    );
    const ok = await run(process.execPath, [
      SCRIPT,
      '--project-root',
      dir,
      '--baseline',
      baselinePath,
      '--assert',
    ]);
    assert.match(ok.stdout, /PASS/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('--assert fails closed when the baseline is missing', async () => {
  const dir = await fixture({ declared: ['slug'], venues: {} });
  try {
    await assert.rejects(
      () =>
        run(process.execPath, [
          SCRIPT,
          '--project-root',
          dir,
          '--baseline',
          join(dir, 'nope.json'),
          '--assert',
        ]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /cannot read baseline/);
        return true;
      }
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('--assert fails closed when the config cannot be loaded', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-unschemad-closure-broken-'));
  try {
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'content.config.ts'), 'this is not valid typescript {{{');
    await assert.rejects(
      () => run(process.execPath, [SCRIPT, '--project-root', dir, '--assert']),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /cannot audit/);
        return true;
      }
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// -- the live corpus --------------------------------------------------------

test('the real corpus is clean, so the gate is asserting something true', async () => {
  const result = await audit();
  assert.equal(
    result.totals.records,
    0,
    `hidden closures found: ${JSON.stringify(result.hits, null, 2)}`
  );
  assert.ok(result.totals.filesScanned > 100, 'the corpus should not be empty');
});
