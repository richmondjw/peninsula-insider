/**
 * Tests for the media-provenance gate.
 *
 * Every case here builds a fixture tree and audits THAT, never the live
 * corpus. The reason is the one thing these tests exist to protect: a gate
 * pinned to today's numbers passes for as long as nobody edits anything and
 * then fails for the wrong reason. So no assertion below names a count from
 * the real site. They assert the rule - "a decorative image may not also
 * carry alt text", "a recorded rights claim must name a source" - and each
 * one is paired with its negative, because a gate that only ever fires is as
 * useless as one that never does.
 *
 * Nothing here reads a clock, and nothing in the script does either. That is
 * load-bearing: a metric that climbs with the calendar wires the passage of
 * time into `npm run build` and blocks deploys with no content change.
 * `rightsEstablishedOn` is checked for SHAPE only, never for age, and the
 * "a rights date never expires" test below is what stops that being quietly
 * changed later.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./audit-media-provenance.mjs', import.meta.url));

/** A zeroed ceiling for every asserted metric: any occurrence must fail. */
const STRICT = {
  illustrativeWithoutDisclosure: 0,
  actualWithoutProvenance: 0,
  permittedUseWithoutPermission: 0,
  invalidDepictionStatus: 0,
  brokenDisclosureSurface: 0,
  undisclosedRepresentativeAlt: 0,
  invalidRightsStatus: 0,
  rightsRecordedWithoutSource: 0,
  rightsDatedWithoutRecord: 0,
  malformedRightsDate: 0,
  decorativeWithAltText: 0,
};

/**
 * Build a project fixture and run the audit over it.
 *
 *   records    { 'venues/a.json': {...} }  content records (JSON or raw string)
 *   surfaces   { 'src/components/X.astro': source }
 *   ceilings   overrides onto STRICT
 */
async function audit({ records = {}, surfaces = {}, ceilings = {}, assertMode = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-media-prov-'));
  try {
    for (const [name, record] of Object.entries(records)) {
      const abs = join(dir, 'src', 'content', name);
      await mkdir(join(abs, '..'), { recursive: true });
      await writeFile(abs, typeof record === 'string' ? record : JSON.stringify(record, null, 2));
    }
    // The two collections the script ships as declared disclosure surfaces
    // are wired by default so a test about rights does not trip the
    // disclosure gate by accident. A test can override either.
    const files = {
      'src/components/VenueDetailTemplate.astro': '<MediaProvenanceNote image={x} />',
      'src/components/PlaceDetailTemplate.astro': '<MediaProvenanceNote image={x} />',
      'src/pages/explore/[slug].astro': '<MediaProvenanceNote image={x} />',
      'src/pages/journal/[slug].astro': '<MediaProvenanceNote image={x} />',
      ...surfaces,
    };
    for (const [name, source] of Object.entries(files)) {
      const abs = join(dir, name);
      await mkdir(join(abs, '..'), { recursive: true });
      await writeFile(abs, source);
    }

    const baselinePath = join(dir, 'baseline.json');
    await writeFile(baselinePath, JSON.stringify({ ceilings: { ...STRICT, ...ceilings } }));
    const jsonPath = join(dir, 'report.json');

    const args = [SCRIPT, '--project-root', dir, '--baseline', baselinePath, '--json', jsonPath];
    if (assertMode) args.push('--assert');

    let code = 0;
    let stdout = '';
    try {
      ({ stdout } = await run(process.execPath, args));
    } catch (error) {
      code = error.code ?? 1;
      stdout = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    const report = JSON.parse(await readFile(jsonPath, 'utf8'));
    return { code, stdout, report, totals: report.totals };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const image = (extra = {}) => ({ src: '/images/x.webp', alt: 'A jetty at dusk.', credit: 'PI', ...extra });

// A Windows checkout must read the same final frontmatter field as Linux.
// Keep license directly above the closing delimiter: slicing at the LF of
// a CRLF delimiter used to leave an orphan CR that hid this final field.
test('a recorded licence on the final frontmatter line passes for LF and CRLF', async () => {
  const frontmatter = [
    '---',
    'heroImage:',
    '  src: /images/x.webp',
    '  alt: A natural history illustration.',
    '  credit: Peninsula Insider',
    '  license: original-commissioned',
    '---',
    'Article body.',
    '',
  ];
  const results = [];
  for (const newline of ['\n', '\r\n']) {
    const result = await audit({
      records: { 'species/illustration.md': frontmatter.join(newline) },
      ceilings: { licenceUnknown: 0 },
    });
    assert.equal(result.totals.imageRecords, 1);
    assert.equal(result.totals.licenceUnknown, 0, `newline ${JSON.stringify(newline)}`);
    assert.equal(result.code, 0, result.stdout);
    results.push(result.totals);
  }
  assert.deepEqual(results[0], results[1], 'line endings cannot change provenance totals');
});

test('missing and explicitly unknown frontmatter licences still fail for LF and CRLF', async () => {
  for (const newline of ['\n', '\r\n']) {
    for (const licenceLine of [null, '  license: unknown']) {
      const result = await audit({
        records: {
          'species/unrecorded.mdx': [
            '---',
            'heroImage:',
            '  src: /images/x.webp',
            '  alt: A natural history illustration.',
            '  credit: Peninsula Insider',
            ...(licenceLine ? [licenceLine] : []),
            '---',
            '',
          ].join(newline),
        },
        ceilings: { licenceUnknown: 0 },
      });
      assert.equal(result.totals.imageRecords, 1);
      assert.equal(result.totals.licenceUnknown, 1);
      assert.equal(result.code, 1, 'normalising line endings cannot infer a licence');
    }
  }
});

// ── decorative ───────────────────────────────────────────────────────────

test('a decorative image carrying alt text is a contradiction and fails', async () => {
  const { code, totals } = await audit({
    records: { 'venues/a.json': { heroImage: image({ decorative: true, depictionStatus: 'illustrative' }) } },
  });
  assert.equal(totals.decorativeWithAltText, 1);
  assert.equal(code, 1);
});

test('a decorative image with an empty alt passes', async () => {
  const { code, totals } = await audit({
    records: {
      'venues/a.json': { heroImage: image({ alt: '', decorative: true, depictionStatus: 'illustrative' }) },
    },
  });
  assert.equal(totals.decorativeMarked, 1);
  assert.equal(totals.decorativeWithAltText, 0);
  assert.equal(code, 0);
});

test('decorative is read as a literal true, never as a truthy string', async () => {
  // A YAML frontmatter boolean arrives here as the string "true"; the string
  // "false" must not read as decorative just because it is a non-empty string.
  const { totals } = await audit({
    records: {
      'venues/yaml.md': '---\nheroImage:\n  src: "/images/x.webp"\n  alt: ""\n  decorative: true\n  credit: "PI"\n---\n',
      'venues/no.json': { heroImage: image({ decorative: 'false' }) },
    },
  });
  assert.equal(totals.decorativeMarked, 1);
});

// ── rights record ────────────────────────────────────────────────────────

test('rights recorded with no creator, source, permission or holder fails', async () => {
  const { code, totals } = await audit({
    records: { 'venues/a.json': { heroImage: image({ rightsStatus: 'recorded' }) } },
  });
  assert.equal(totals.rightsRecordedWithoutSource, 1);
  assert.equal(code, 1);
});

test('a credit does not satisfy a recorded rights claim', async () => {
  // The A29 discipline: `credit` is display text and `license` carries a
  // permissive default. Neither may stand in for a recorded grant, and this
  // is the test that stops someone "fixing" the gate by counting them.
  const { code, totals } = await audit({
    records: {
      'venues/a.json': {
        heroImage: image({ rightsStatus: 'recorded', credit: 'Peninsula Insider', license: 'venue-media-kit' }),
      },
    },
  });
  assert.equal(totals.rightsRecordedWithoutSource, 1);
  assert.equal(code, 1);
});

test('rights recorded against any one of the four real sources passes', async () => {
  for (const field of ['creator', 'sourceUrl', 'permission', 'rightsHolder']) {
    const { code, totals } = await audit({
      records: { 'venues/a.json': { heroImage: image({ rightsStatus: 'recorded', [field]: 'something' }) } },
    });
    assert.equal(totals.rightsRecordedWithoutSource, 0, field);
    assert.equal(code, 0, field);
  }
});

test('"unknown" is a recordable state and is never a failure', async () => {
  const { code, totals } = await audit({
    records: { 'venues/a.json': { heroImage: image({ rightsStatus: 'unknown' }) } },
  });
  assert.equal(totals.rightsUnknownRecorded, 1);
  assert.equal(totals.rightsRecordedWithoutSource, 0);
  assert.equal(code, 0);
});

test('an unrecognised rights status fails rather than degrading silently', async () => {
  const { code, totals } = await audit({
    records: { 'venues/a.json': { heroImage: image({ rightsStatus: 'Recorded' }) } },
  });
  assert.equal(totals.invalidRightsStatus, 1);
  assert.equal(code, 1);
});

test('a rights date on a record that claims no rights fails', async () => {
  const { code, totals } = await audit({
    records: { 'venues/a.json': { heroImage: image({ rightsEstablishedOn: '2026-04-11' }) } },
  });
  assert.equal(totals.rightsDatedWithoutRecord, 1);
  assert.equal(code, 1);
});

test('a malformed rights date fails on shape', async () => {
  const { code, totals } = await audit({
    records: {
      'venues/a.json': {
        heroImage: image({ rightsStatus: 'recorded', creator: 'A', rightsEstablishedOn: '11 April 2026' }),
      },
    },
  });
  assert.equal(totals.malformedRightsDate, 1);
  assert.equal(code, 1);
});

test('a rights date never expires: an ancient one is as valid as a recent one', async () => {
  // THE time test. If anyone ever makes this gate read a clock, the 1999
  // record starts failing and this test says so. A metric that changes
  // because a day passed blocks deploys with no content change.
  const ancient = await audit({
    records: {
      'venues/a.json': {
        heroImage: image({ rightsStatus: 'recorded', creator: 'A', rightsEstablishedOn: '1999-01-01' }),
      },
    },
  });
  const recent = await audit({
    records: {
      'venues/a.json': {
        heroImage: image({ rightsStatus: 'recorded', creator: 'A', rightsEstablishedOn: '2026-09-14' }),
      },
    },
  });
  assert.equal(ancient.code, 0);
  assert.equal(recent.code, 0);
  assert.deepEqual(
    Object.fromEntries(Object.keys(STRICT).map((k) => [k, ancient.totals[k]])),
    Object.fromEntries(Object.keys(STRICT).map((k) => [k, recent.totals[k]])),
  );
});

// ── the no-provenance count ──────────────────────────────────────────────

test('noProvenanceAtAll counts records that say nothing, and is never gated', async () => {
  const { code, totals, report } = await audit({
    records: {
      'venues/silent.json': { heroImage: image() },
      'venues/credited.json': { heroImage: image({ credit: 'Peninsula Insider', license: 'venue-media-kit' }) },
      'venues/sourced.json': { heroImage: image({ sourceUrl: 'https://example.org/file', rightsStatus: 'recorded' }) },
      'venues/looked.json': { heroImage: image({ rightsStatus: 'unknown' }) },
    },
  });
  // Silent and credited both count: a credit and a licence bucket are not
  // provenance. "unknown" does not count - somebody looked and recorded it.
  assert.equal(totals.noProvenanceAtAll, 2);
  assert.ok(!report.assertedMetrics.includes('noProvenanceAtAll'));
  assert.equal(code, 0);
});

// ── disclosure, unchanged behaviour that the new fields must not break ────

test('an illustrative image on a collection with no disclosure surface fails', async () => {
  const { code, totals } = await audit({
    records: { 'tours/a.json': { heroImage: image({ depictionStatus: 'illustrative' }) } },
  });
  assert.equal(totals.illustrativeWithoutDisclosure, 1);
  assert.equal(code, 1);
});

test('removing the component from a declared surface un-covers the collection', async () => {
  const { code, totals } = await audit({
    records: { 'venues/a.json': { heroImage: image({ depictionStatus: 'illustrative' }) } },
    surfaces: { 'src/components/VenueDetailTemplate.astro': '<div>no disclosure here</div>' },
  });
  assert.equal(totals.brokenDisclosureSurface, 1);
  assert.equal(code, 1);
});

test('describing the frame while recording the illustrative status passes', async () => {
  // The shape the 152 inherited records were migrated to.
  const { code, totals } = await audit({
    records: {
      'venues/a.json': {
        heroImage: image({
          alt: 'A plate of grilled steak and hand-cut chips.',
          depicts: 'a plate of grilled steak and hand-cut chips',
          depictionStatus: 'illustrative',
        }),
      },
    },
  });
  assert.equal(totals.undisclosedRepresentativeAlt, 0);
  assert.equal(totals.illustrativeWithoutDisclosure, 0);
  assert.equal(code, 0);
});

test('alt text that still calls itself representative is caught', async () => {
  const { code, totals } = await audit({
    records: { 'venues/a.json': { heroImage: image({ alt: 'A beach - representative image for The Pub' }) } },
  });
  assert.equal(totals.undisclosedRepresentativeAlt, 1);
  assert.equal(code, 1);
});

// ── the gate itself ──────────────────────────────────────────────────────

test('a missing baseline fails closed rather than reading as no regression', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pi-media-prov-'));
  try {
    await mkdir(join(dir, 'src', 'content', 'venues'), { recursive: true });
    await writeFile(join(dir, 'src', 'content', 'venues', 'a.json'), JSON.stringify({ heroImage: image() }));
    let code = 0;
    try {
      await run(process.execPath, [SCRIPT, '--project-root', dir, '--baseline', join(dir, 'nope.json'), '--assert']);
    } catch (error) {
      code = error.code ?? 1;
    }
    assert.equal(code, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('report-only mode never fails, however bad the corpus', async () => {
  const { code } = await audit({
    records: {
      'venues/a.json': { heroImage: image({ decorative: true, rightsStatus: 'nonsense', rightsEstablishedOn: 'soon' }) },
    },
    assertMode: false,
  });
  assert.equal(code, 0);
});
