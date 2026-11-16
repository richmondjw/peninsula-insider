/**
 * Tests for the commercial/editorial firewall gate (PI-021).
 *
 * The gate shipped in PR #394 with no test of any kind. It reported zero
 * breaches on the live corpus, which is the answer you get both from a working
 * gate on a clean site and from a gate that cannot see anything. Nobody had
 * watched it fail, so nobody knew which one it was.
 *
 * Every case here is built from a fixture corpus and asserts the RULE, never
 * today's content. There is deliberately no test of the form "the site
 * currently has N partners": a corpus snapshot breaks the moment an editor adds
 * a record, and this build has been broken that way twice already. What is
 * asserted instead is behavioural - construct a violation, watch the gate
 * catch it; construct a clean corpus, watch it pass.
 *
 * THE RULE, stated once so the tests can be read against it:
 *
 *   A commercial relationship must not influence editorial ranking, selection,
 *   inclusion or ordering, and wherever one exists the reader must be told.
 *
 * The negative cases below are one breach of that sentence each.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./audit-commercial-firewall.mjs', import.meta.url));
const CONTENT_CONFIG = fileURLToPath(new URL('../src/content.config.ts', import.meta.url));
const BASELINE = fileURLToPath(
  new URL('../../ops/baselines/commercial-firewall-baseline.json', import.meta.url)
);

/** Every asserted metric at zero. A fixture passes only by being clean. */
const ZERO_CEILINGS = {
  commercialReads: 0,
  commercialSortKeys: 0,
  unclassifiedSortKeys: 0,
  orderArrayCommercial: 0,
  sponsoredMarkersUndeclared: 0,
  commercialRelationships: 0,
  commercialFieldsNonDefault: 0,
  disclosureGap: 0,
};

/**
 * Build a fixture tree and audit it.
 *
 * `src` maps a path under the scanned source roots to file text; `content`
 * maps a path under the content root to a record (object) or raw text
 * (string). Returns the parsed report plus the process exit code, so a test
 * can assert on either the measurement or the gate decision.
 */
async function audit({
  src = {},
  content = {},
  ceilings = {},
  assertMode = true,
  writeBaseline = true,
  env = {},
} = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-firewall-'));
  try {
    const srcDir = join(dir, 'src');
    const contentDir = join(dir, 'content');
    await mkdir(srcDir, { recursive: true });
    await mkdir(contentDir, { recursive: true });

    for (const [rel, text] of Object.entries(src)) {
      const file = join(srcDir, rel);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, text);
    }
    for (const [rel, record] of Object.entries(content)) {
      const file = join(contentDir, rel);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(
        file,
        typeof record === 'string' ? record : `${JSON.stringify(record, null, 2)}\n`
      );
    }

    const baseline = join(dir, 'baseline.json');
    if (writeBaseline) {
      await writeFile(
        baseline,
        JSON.stringify({ ceilings: { ...ZERO_CEILINGS, ...ceilings } }, null, 2)
      );
    }

    const jsonOut = join(dir, 'report.json');
    const args = [
      SCRIPT,
      '--src-dir', srcDir,
      '--content-dir', contentDir,
      '--baseline', baseline,
      '--json', jsonOut,
    ];
    if (assertMode) args.push('--assert');

    let code = 0;
    let out = '';
    try {
      const result = await run(process.execPath, args, { env: { ...process.env, ...env } });
      out = `${result.stdout}${result.stderr}`;
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
    return { code, out, report, totals: report?.totals ?? null };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/* -- the control: a clean corpus must pass ------------------------------- */

test('a corpus with no commercial signal anywhere passes', async () => {
  const { code, totals } = await audit({
    src: {
      'pages/eat/index.astro': [
        '---',
        "const venues = await getCollection('venues');",
        'const ordered = venues.sort((a, b) => a.data.name.localeCompare(b.data.name));',
        '---',
        '<ul>{ordered.map((v) => <li>{v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: {
      'venues/a-cafe.json': { slug: 'a-cafe', name: 'A Cafe' },
      'venues/b-cafe.json': { slug: 'b-cafe', name: 'B Cafe' },
    },
  });

  assert.equal(code, 0, 'a clean corpus must not fail the gate');
  for (const metric of Object.keys(ZERO_CEILINGS)) {
    assert.equal(totals[metric], 0, `${metric} should be 0 on a clean corpus`);
  }
});

/* -- negative cases: one breach of the rule each -------------------------- */

test('NEGATIVE: ordering by a commercial field is caught as a ranking breach', async () => {
  const { code, totals, report, out } = await audit({
    src: {
      'pages/stay/index.astro': [
        '---',
        "const stays = await getCollection('venues');",
        'const ordered = stays.sort((a, b) =>',
        '  Number(b.data.featuredPartner) - Number(a.data.featuredPartner));',
        '---',
        '<ul>{ordered.map((s) => <li>{s.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: { 'venues/a-stay.json': { slug: 'a-stay', name: 'A Stay' } },
  });

  assert.equal(code, 1, 'sorting on a commercial field must fail the gate');
  assert.ok(totals.commercialSortKeys >= 1, 'the sort key must be counted as a ranking breach');
  assert.ok(
    report.commercialSortKeys.some((h) => h.key === 'featuredPartner'),
    'the report must name the offending key'
  );
  assert.match(out, /RANKING BREACH/, 'the failure must read as a ranking breach');
});

test('NEGATIVE: indirection does not get a commercial read past the gate', async () => {
  // The read is two hops from the sort: a helper returns a score, and the
  // comparator orders by the score. Nothing inside .sort() names a commercial
  // field, so only the read check can see this. It is the case that would
  // defeat a gate which only inspected comparators.
  const { code, totals } = await audit({
    src: {
      'lib/rank.ts': [
        'export function boost(entry) {',
        '  return entry.data.featuredPartner ? 100 : 0;',
        '}',
      ].join('\n'),
      'pages/eat/index.astro': [
        '---',
        "import { boost } from '../../lib/rank';",
        "const venues = await getCollection('venues');",
        'const scored = venues.map((v) => ({ v, score: boost(v) }));',
        'const ordered = scored.sort((a, b) => b.score - a.score);',
        '---',
        '<ul>{ordered.map((s) => <li>{s.v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: { 'venues/a-cafe.json': { slug: 'a-cafe', name: 'A Cafe' } },
  });

  assert.equal(code, 1, 'a commercial read behind a helper must still fail');
  assert.ok(totals.commercialReads >= 1, 'the read itself must be counted');
  assert.equal(
    totals.commercialSortKeys,
    0,
    'the comparator names no commercial key, by construction'
  );
});

test('NEGATIVE: bracket access is not a way to spell a commercial field quietly', async () => {
  const { code, totals } = await audit({
    src: {
      'pages/wine/index.astro': [
        '---',
        "const venues = await getCollection('venues');",
        "const paid = venues.filter((v) => v.data['featuredPartner']);",
        '---',
        '<ul>{paid.map((v) => <li>{v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: { 'venues/a-winery.json': { slug: 'a-winery', name: 'A Winery' } },
  });

  assert.equal(code, 1, 'bracket-string access to a commercial field must fail');
  assert.ok(totals.commercialReads >= 1);
});

test('NEGATIVE: a brand-new ordering key must be classified before it can ship', async () => {
  const { code, totals, report } = await audit({
    src: {
      'pages/eat/index.astro': [
        '---',
        "const venues = await getCollection('venues');",
        'const ordered = venues.sort((a, b) => b.data.partnerPriority - a.data.partnerPriority);',
        '---',
        '<ul>{ordered.map((v) => <li>{v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: { 'venues/a-cafe.json': { slug: 'a-cafe', name: 'A Cafe' } },
  });

  assert.equal(code, 1, 'an unclassified ordering key must fail until a human classifies it');
  assert.ok(totals.unclassifiedSortKeys >= 1);
  assert.ok(report.unclassifiedSortKeys.some((h) => h.key === 'partnerPriority'));
});

test('NEGATIVE: a hardcoded order array containing a paid record is caught', async () => {
  const { code, totals, report } = await audit({
    src: {
      'pages/explore/index.astro': [
        '---',
        "const HOUSE_ORDER = ['b-cafe', 'a-cafe'];",
        "const venues = await getCollection('venues');",
        'const ordered = venues.sort((a, b) =>',
        '  HOUSE_ORDER.indexOf(a.data.slug) - HOUSE_ORDER.indexOf(b.data.slug));',
        '---',
        '<ul>{ordered.map((v) => <li>{v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: {
      'venues/a-cafe.json': { slug: 'a-cafe', name: 'A Cafe' },
      // b-cafe is paid AND hand-placed first. Indistinguishable from an
      // editorial decision in review; not indistinguishable to the gate.
      'venues/b-cafe.json': {
        slug: 'b-cafe',
        name: 'B Cafe',
        featuredPartner: true,
        affiliateNote: 'Paid partner. Disclosed on the venue page.',
      },
    },
    // The paid record itself is allowed to exist for this case; what is on
    // trial is its presence in the hand-ordered array.
    ceilings: { commercialRelationships: 1, commercialFieldsNonDefault: 1, disclosureGap: 1 },
  });

  assert.equal(code, 1, 'a paid record inside a hand-ordered array must fail');
  assert.ok(totals.orderArrayCommercial >= 1);
  assert.ok(report.orderArrayCommercial.some((h) => h.slug === 'b-cafe'));
});

test('NEGATIVE: a paid record that renders no disclosure anywhere is caught', async () => {
  const { code, totals, report, out } = await audit({
    src: {
      // Deliberately says nothing about sponsorship, partnership or affiliation.
      'pages/eat/index.astro': [
        '---',
        "const venues = await getCollection('venues');",
        '---',
        '<ul>{venues.map((v) => <li>{v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: {
      'venues/paid-cafe.json': { slug: 'paid-cafe', name: 'Paid Cafe', featuredPartner: true },
    },
    ceilings: { commercialRelationships: 1, commercialFieldsNonDefault: 1 },
  });

  assert.equal(code, 1, 'a commercial relationship with no disclosure must fail');
  assert.ok(totals.disclosureGap >= 1);
  assert.ok(report.disclosureGap.some((d) => d.slug === 'paid-cafe'));
  assert.match(out, /NO DISCLOSURE/);
});

test('NEGATIVE: the first paid placement cannot arrive as a quiet content edit', async () => {
  // commercialRelationships is gated at the baseline count precisely so that
  // going from none to one is a deliberate diff with a baseline re-seed in it,
  // not a one-line change to a JSON file that nobody reviews as commercial.
  const { code, totals } = await audit({
    src: {
      'pages/eat/index.astro': [
        '---',
        '/* This surface carries an affiliate disclosure, so disclosureGap stays',
        '   clean and the relationship count is the only thing on trial. */',
        "const venues = await getCollection('venues');",
        '---',
        '<p>Some links are affiliate links.</p>',
        '<ul>{venues.map((v) => <li>{v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: {
      'venues/paid-cafe.json': {
        slug: 'paid-cafe',
        name: 'Paid Cafe',
        affiliateNote: 'We earn a commission on bookings made through this link.',
      },
    },
  });

  assert.equal(code, 1, 'a new commercial relationship must fail against a zero baseline');
  assert.ok(totals.commercialRelationships >= 1);
});

test('NEGATIVE: a sponsored marker over a link that may not be paid is caught', async () => {
  const { code, totals, report } = await audit({
    src: {
      'pages/fishing/charters/[slug].astro': [
        '---',
        'const data = Astro.props.data;',
        'const destination = data.affiliateUrl ?? data.operatorWebsite;',
        '---',
        '<a href={destination} rel="external sponsored">Book</a>',
      ].join('\n'),
    },
    content: { 'fishing-charters/a-charter.json': { slug: 'a-charter', name: 'A Charter' } },
  });

  assert.equal(code, 1, 'a sponsored marker with a non-commercial fallback must fail');
  assert.ok(totals.sponsoredMarkersUndeclared >= 1);
  assert.ok(
    report.sponsoredMarkers.some((m) => /fallback/.test(m.why)),
    'the report must say WHY the marker is undeclared'
  );
});

test('a sponsored marker gated on a commercial field with no fallback is accepted', async () => {
  // The positive half of the previous case. Without it the gate could be
  // satisfied by banning rel="sponsored" outright, which would be worse for
  // readers rather than better.
  const { totals, report } = await audit({
    src: {
      'pages/fishing/charters/[slug].astro': [
        '---',
        'const data = Astro.props.data;',
        '---',
        '{data.affiliateUrl && (',
        '  <a href={data.affiliateUrl} rel="external sponsored">Book (affiliate link)</a>',
        ')}',
      ].join('\n'),
    },
    content: { 'fishing-charters/a-charter.json': { slug: 'a-charter', name: 'A Charter' } },
    assertMode: false,
  });

  assert.equal(totals.sponsoredMarkers, 1, 'the marker should be seen');
  assert.equal(totals.sponsoredMarkersUndeclared, 0, 'and accepted as declared');
  assert.ok(report.sponsoredMarkers[0].declared);
});

test('a sponsored marker quoted inside a comment is documentation, not a marker', async () => {
  // Found by writing this ticket's own component: its header comment quotes
  // the defective markup it replaces, and the gate counted that quotation as
  // four live paid markers. A ratchet that can be pushed over its ceiling by
  // someone explaining the rule in a comment is a ratchet that teaches people
  // not to explain the rule.
  const { totals } = await audit({
    src: {
      'components/BookingCta.astro': [
        '---',
        '/**',
        ' * The defect this replaced looked like:',
        ' *     <a href={destination} rel="external sponsored">Book</a>',
        ' * and the destination fell back to a link nobody paid for.',
        ' */',
        'const data = Astro.props.data;',
        '---',
        '{/* also not a marker: rel="sponsored" */}',
        '<a href={data.operatorWebsite} rel="external">Book</a>',
      ].join('\n'),
    },
    content: { 'boat-hire/a-hire.json': { slug: 'a-hire', name: 'A Hire' } },
    assertMode: false,
  });

  assert.equal(totals.sponsoredMarkers, 0, 'a commented example must not count as a live marker');
  assert.equal(totals.sponsoredMarkersUndeclared, 0);
});

/* -- contract cases: the gate itself must not be able to go blind --------- */

test('the gate fails closed when its baseline is missing', async () => {
  const { code, out } = await audit({
    src: { 'pages/eat/index.astro': '<p>Nothing to see.</p>' },
    content: { 'venues/a-cafe.json': { slug: 'a-cafe', name: 'A Cafe' } },
    writeBaseline: false,
  });

  assert.equal(code, 1, 'a missing baseline must never read as "no regression"');
  assert.match(out, /cannot read baseline/);
});

test('the gate ratchets: it fails on any increase, never on inherited debt', async () => {
  const corpus = {
    src: {
      'pages/eat/index.astro': [
        '---',
        "const venues = await getCollection('venues');",
        'const ordered = venues.sort((a, b) => b.data.partnerPriority - a.data.partnerPriority);',
        '---',
        '<ul>{ordered.map((v) => <li>{v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: { 'venues/a-cafe.json': { slug: 'a-cafe', name: 'A Cafe' } },
  };

  const tight = await audit(corpus);
  assert.equal(tight.code, 1, 'above the ceiling must fail');

  const seeded = await audit({ ...corpus, ceilings: { unclassifiedSortKeys: 1 } });
  assert.equal(seeded.code, 0, 'at the ceiling must pass, so inherited debt never blocks a deploy');

  const slack = await audit({ ...corpus, ceilings: { unclassifiedSortKeys: 5 } });
  assert.equal(slack.code, 0, 'below the ceiling must pass');
});

test('no asserted metric moves with the calendar or the timezone', async () => {
  // A gate that fails one morning with no code change gets switched off by
  // lunchtime. audit-event-safeguards.mjs learned that the expensive way. This
  // asserts the firewall gate never acquires the same defect: two timezones a
  // full day apart must produce identical asserted metrics, and records dated
  // in the deep past and the far future must both be counted the same way.
  const corpus = {
    src: {
      'pages/eat/index.astro': [
        '---',
        "const venues = await getCollection('venues');",
        'const ordered = venues.sort((a, b) => b.data.publishedAt - a.data.publishedAt);',
        '---',
        '<ul>{ordered.map((v) => <li>{v.data.name}</li>)}</ul>',
      ].join('\n'),
    },
    content: {
      'venues/a-cafe.json': { slug: 'a-cafe', name: 'A Cafe', publishedAt: '2019-01-01' },
      'venues/b-cafe.json': { slug: 'b-cafe', name: 'B Cafe', publishedAt: '2031-12-31' },
    },
    assertMode: false,
  };

  const east = await audit({ ...corpus, env: { TZ: 'Pacific/Kiritimati' } });
  const west = await audit({ ...corpus, env: { TZ: 'Pacific/Midway' } });

  for (const metric of Object.keys(ZERO_CEILINGS)) {
    assert.equal(
      east.totals[metric],
      west.totals[metric],
      `${metric} differs across timezones, so it is time-driven and must not be asserted`
    );
    assert.equal(east.totals[metric], 0, `${metric} must not count a record by its date`);
  }
  assert.equal(east.totals.contentRecords, 2);
});

test('every commercial field in the schema is one the gate knows about', async () => {
  // The gate is a list of NAMES. Add a commercial field to content.config.ts
  // without adding it here and the gate goes quietly blind to it - the exact
  // failure mode that makes a governance gate worse than none, because it
  // certifies a firewall it has stopped measuring.
  const schema = await readFile(CONTENT_CONFIG, 'utf8');
  const gate = await readFile(SCRIPT, 'utf8');

  const commercialBlock = gate.match(/const COMMERCIAL_FIELDS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(commercialBlock, 'COMMERCIAL_FIELDS must be readable from source');
  const known = new Set([...commercialBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  assert.ok(known.size > 0, 'the gate must know at least one commercial field');

  // Any schema key whose name reads as money. Deliberately a broad net: a
  // false positive costs one line in the gate, a false negative costs the
  // firewall.
  const MONEY = /^(affiliate|sponsor|paid|featuredPartner|commission|advertis|promoted|boost)/i;
  const schemaKeys = new Set(
    [...schema.matchAll(/^\s{2,}([A-Za-z_$][\w$]*)\s*:\s*z\./gm)].map((m) => m[1])
  );
  const missed = [...schemaKeys].filter((k) => MONEY.test(k) && !known.has(k));

  assert.deepEqual(
    missed,
    [],
    `commercial-looking schema fields the gate does not track: ${missed.join(', ')}. ` +
      'Add them to COMMERCIAL_FIELDS in audit-commercial-firewall.mjs.'
  );
});

test('the asserted metric list and the committed baseline agree on what is gated', async () => {
  // A metric silently dropped from ASSERTED_METRICS stops being enforced while
  // its number keeps printing in the report, which reads exactly like
  // enforcement.
  const gate = await readFile(SCRIPT, 'utf8');
  const block = gate.match(/const ASSERTED_METRICS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(block, 'ASSERTED_METRICS must be readable from source');
  const asserted = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();

  assert.deepEqual(
    asserted,
    Object.keys(ZERO_CEILINGS).sort(),
    'this test file and the gate disagree about which metrics are enforced'
  );

  const baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
  for (const metric of asserted) {
    assert.ok(
      metric in baseline.ceilings,
      `${metric} is asserted but has no committed ceiling, so it is never compared`
    );
  }
});
