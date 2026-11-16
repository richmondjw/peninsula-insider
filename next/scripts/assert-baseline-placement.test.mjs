/**
 * Tests for the baseline-placement gate.
 *
 * WHAT THESE ASSERT, AND WHAT THEY DELIBERATELY DO NOT
 *
 * They assert the RULE: a ratchet ceiling may not be filed under ops/reports/,
 * and nothing may point a baseline path back there. They never assert today's
 * file list. A test that named the twelve baselines this repository happens to
 * have would pass this afternoon and fail the first time somebody adds a
 * thirteenth or burns one down to zero and deletes it — it would go red on
 * success, which is worse than not testing at all.
 *
 * Nothing here is time-driven, nothing is random and nothing touches the
 * network. Every fixture is a synthetic tree in a temp directory, driven
 * through the gate's `--root`.
 *
 * The property that matters most is the negative one: a baseline placed under
 * ops/reports/ MUST fail. That is the whole mechanism. It is asserted by name,
 * and again by shape for a ceiling renamed to slip past the name.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const GATE = fileURLToPath(new URL('./assert-baseline-placement.mjs', import.meta.url));
const REPO = fileURLToPath(new URL('../..', import.meta.url));

const CEILING = JSON.stringify({ updatedAt: '2026-01-01T00:00:00.000Z', ceilings: { thing: 3 } });

/**
 * Build a synthetic tree and run the gate against it.
 *
 *   files  { 'ops/baselines/x-baseline.json': '{...}', 'next/scripts/g.mjs': '...' }
 */
async function check(files) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-baseline-placement-'));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const abs = join(dir, ...rel.split('/'));
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, body);
    }
    try {
      const { stdout, stderr } = await run(process.execPath, [GATE, '--root', dir]);
      return { code: 0, out: `${stdout}${stderr}` };
    } catch (error) {
      return { code: error.code ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A well-filed tree: the ceiling lives in ops/baselines and the gate reads it there. */
const WELL_FILED = {
  'ops/baselines/thing-baseline.json': CEILING,
  'ops/baselines/README.md': '# ceilings live here\n',
  'ops/reports/thing/thing.json': JSON.stringify({ totals: { thing: 1 } }),
  'next/scripts/audit-thing.mjs': [
    "const DEFAULT_BASELINE = path.join(REPO, 'ops', 'baselines', 'thing-baseline.json');",
    '',
  ].join('\n'),
};

test('a ceiling filed in ops/baselines passes', async () => {
  const { code, out } = await check(WELL_FILED);
  assert.equal(code, 0, out);
  assert.match(out, /OK/);
});

test('THE NEGATIVE: a baseline under ops\\/reports fails, and is named', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'ops/reports/thing/thing-baseline.json': CEILING,
  });
  assert.equal(code, 1);
  assert.match(out, /ops\/reports\/thing\/thing-baseline\.json/);
  assert.match(out, /name says it is a baseline/);
});

test('a ceiling renamed to hide from the name check still fails, on its shape', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'ops/reports/thing/tolerances.json': CEILING,
  });
  assert.equal(code, 1);
  assert.match(out, /ops\/reports\/thing\/tolerances\.json/);
  assert.match(out, /ceilings/);
});

test('the shape net recognises floors and maxTargets as ratchets too', async () => {
  for (const key of ['floors', 'maxTargets']) {
    const { code, out } = await check({
      ...WELL_FILED,
      'ops/reports/thing/limits.json': JSON.stringify({ [key]: key === 'floors' ? { a: 1 } : 7 }),
    });
    assert.equal(code, 1, `${key}: ${out}`);
    assert.match(out, new RegExp(key));
  }
});

test('an ordinary report is not mistaken for a ceiling', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'ops/reports/thing/run.json': JSON.stringify({ totals: { scanned: 9 }, findings: [] }),
    'ops/reports/thing/notes.md': 'a report, not a ceiling\n',
  });
  assert.equal(code, 0, out);
});

test('a markdown file called baseline is not a ratchet', async () => {
  // ops/reports/seo/baseline.md is a frozen measurement. Only JSON ceilings are
  // the thing this gate is about, and a measurement is evidence, not policy.
  const { code, out } = await check({
    ...WELL_FILED,
    'ops/reports/seo/baseline.md': '# frozen snapshot\n',
  });
  assert.equal(code, 0, out);
});

test('an unparseable file under ops/reports is not a false positive', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'ops/reports/thing/truncated.json': '{ "totals": ',
  });
  assert.equal(code, 0, out);
});

test('a script pointing a baseline back into ops/reports fails — slash spelling', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'ops/scripts/read-it.mjs': "readFileSync('ops/reports/seo/thing-baseline.json', 'utf8');\n",
  });
  assert.equal(code, 1);
  assert.match(out, /ops\/scripts\/read-it\.mjs/);
});

test('a script pointing a baseline back into ops/reports fails — path.join spelling', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'next/scripts/audit-other.mjs':
      "const B = path.join(REPO, 'ops', 'reports', 'other', 'other-baseline.json');\n",
  });
  assert.equal(code, 1);
  assert.match(out, /audit-other\.mjs/);
});

test('the path.join spelling is caught when it is split across lines', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'next/scripts/audit-split.mjs': [
      'const B = path.join(',
      '  REPO,',
      "  'ops',",
      "  'reports',",
      "  'other',",
      "  'other-baseline.json'",
      ');',
      '',
    ].join('\n'),
  });
  assert.equal(code, 1);
  assert.match(out, /audit-split\.mjs/);
});

test('a comment naming the old path fails — a stale comment teaches the wrong lesson', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'docs/how-gates-work.md':
      'The gate ratchets against `ops/reports/thing/thing-baseline.json`.\n',
  });
  assert.equal(code, 1);
  assert.match(out, /how-gates-work\.md/);
});

test('a script reading a report and a ceiling in adjacent statements is clean', async () => {
  // The regression that broke the first draft of this gate: `'reports',` from
  // one path.join and `baseline.json` from the next look like one offending
  // path unless the segments are required to sit inside a single call.
  const { code, out } = await check({
    ...WELL_FILED,
    'next/scripts/audit-two.mjs': [
      "const LEDGER = path.join(REPO, 'ops', 'reports', 'other', 'other-ledger.json');",
      "const BASELINE = path.join(REPO, 'ops', 'baselines', 'other-baseline.json');",
      '',
    ].join('\n'),
  });
  assert.equal(code, 0, out);
});

test('generated and vendored trees are not searched', async () => {
  const { code, out } = await check({
    ...WELL_FILED,
    'next/node_modules/pkg/index.js': "require('ops/reports/x/y-baseline.json');\n",
    'next/dist/_astro/bundle.js': "fetch('ops/reports/x/y-baseline.json');\n",
  });
  assert.equal(code, 0, out);
});

test('the real repository obeys the rule', async () => {
  // Not a file list: it runs the same rule against the tree as it stands, so it
  // keeps holding as baselines are added, tightened or retired.
  const { stdout } = await run(process.execPath, [GATE, '--root', resolve(REPO)]);
  assert.match(stdout, /OK/);
});
