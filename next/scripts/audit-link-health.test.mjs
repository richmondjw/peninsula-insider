/**
 * Tests for the source-link gate.
 *
 * Three properties matter more than any individual metric, and all three are
 * asserted here against fixture trees rather than the live corpus:
 *
 *   1. THE GATE NEVER TOUCHES THE NETWORK. Every test in this file runs
 *      offline; if the default path ever grew a fetch, these would hang or
 *      fail on a machine with no egress, which is the point. A link checker
 *      that dials out during CI fails at 3am with no code change, and a gate
 *      that cries wolf is a gate nobody reads.
 *
 *   2. THE GATE CANNOT WRITE THE RECORD IT IS JUDGED AGAINST. This is the
 *      2026-09-14 defect: probing was a flag on this same script, the record
 *      lived among the build's own regenerable output, and five citations
 *      nobody had fetched passed a local build. A gate that validates against
 *      an artefact its own run produced is a mirror. Asserted here as
 *      behaviour (the file is byte-identical after a run, pass or fail) and
 *      as a rule (no build or CI step may invoke the prober).
 *
 *   3. A BLOCKED HOST IS NOT A DEAD HOST. The council is this corpus's
 *      most-cited publisher and refuses most automated reads. If `blocked`
 *      ever counted toward the dead metric, the gate would demand deleting a
 *      third of the site's provenance over a robots policy.
 *
 * Nothing here pins a date, demands the real corpus contain any particular
 * record, or draws a random sample. The gate reads no clock, so neither does
 * its test suite.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./audit-link-health.mjs', import.meta.url));
const PROBER = fileURLToPath(new URL('./probe-link-health.mjs', import.meta.url));
const NEXT = fileURLToPath(new URL('..', import.meta.url));
const REPO = fileURLToPath(new URL('../..', import.meta.url));

const CEILINGS = {
  unrecordedSourceUrl: 0,
  deadSourceUrlCited: 0,
  staleRedirectCited: 0,
};

/** A row shaped the way a real probe writes one: it says who looked, and when. */
const probed = (row) => ({ probedOn: '2026-01-01', probedBy: 'test', ...row });

const sha = (text) => createHash('sha256').update(text).digest('hex');

/**
 * Build a fixture corpus plus a probe record, and audit it.
 *
 *   records  { 'venues/a.json': {...} }  content records
 *   links    [ { url, verdict, ... } ]   probe rows
 *
 * Returns the exit code, the output, and whether the record file changed.
 */
async function audit({
  records = {},
  links = [],
  ceilings = {},
  baseline = true,
  record = true,
  rawRecord = null,
  extraArgs = [],
} = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-link-health-'));
  try {
    const contentDir = join(dir, 'content');
    await mkdir(contentDir, { recursive: true });

    for (const [name, data] of Object.entries(records)) {
      const abs = join(contentDir, name);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, JSON.stringify(data, null, 2));
    }

    const recordPath = join(dir, 'probe-ledger.json');
    let before = null;
    if (record) {
      const text = rawRecord ?? JSON.stringify({ links: links.map(probed) });
      await writeFile(recordPath, text);
      before = sha(text);
    }

    const baselinePath = join(dir, 'baseline.json');
    if (baseline) {
      await writeFile(baselinePath, JSON.stringify({ ceilings: { ...CEILINGS, ...ceilings } }));
    }

    const args = [
      SCRIPT,
      '--assert',
      '--baseline',
      baselinePath,
      '--record',
      recordPath,
      '--content-dir',
      contentDir,
      ...extraArgs,
    ];
    let result;
    try {
      const { stdout } = await run(process.execPath, args);
      result = { code: 0, out: stdout };
    } catch (error) {
      result = { code: error.code ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }

    let after = null;
    if (record) {
      after = sha(await readFile(recordPath, 'utf8'));
    }
    return { ...result, recordUnchanged: before === after };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ */
/* The record is a record: the gate reads it and may not write it      */
/* ------------------------------------------------------------------ */

test('the gate leaves the probe record byte-identical when it passes', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    links: [{ url: 'https://example.com/', verdict: 'ok', httpCode: '200' }],
  });
  assert.equal(result.code, 0, result.out);
  assert.equal(result.recordUnchanged, true, 'the gate wrote to the record it was judging');
});

test('the gate leaves the probe record byte-identical when it FAILS', async () => {
  // The 2026-09-14 shape exactly: an unprobed citation must not be able to
  // become a probed one by the act of being checked.
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://never-fetched.example/' } },
    links: [],
  });
  assert.equal(result.code, 1, result.out);
  assert.equal(result.recordUnchanged, true, 'a failing run wrote to the record');
});

test('the gate refuses --probe rather than quietly ignoring it', async () => {
  // A CI line reading `audit-link-health.mjs --probe` that silently did no
  // probing would be its own kind of lie. And a gate that accepted it would
  // be back where it started.
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    links: [{ url: 'https://example.com/', verdict: 'ok', httpCode: '200' }],
    extraArgs: ['--probe'],
  });
  assert.notEqual(result.code, 0, result.out);
  assert.match(result.out, /--probe is not accepted here/);
  assert.match(result.out, /probe:link-health/);
});

test('a missing probe record fails closed, naming the file', async () => {
  // It used to swallow the error and continue with zero rows. Technically a
  // failure - every citation becomes unprobed - but one whose message sends
  // the reader hunting through 1,400 citations instead of at one file.
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    record: false,
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /cannot read the probe record/);
  assert.match(result.out, /probe:link-health/);
});

test('an unparseable probe record fails closed', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    rawRecord: '{ this is not json',
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /not valid JSON/);
});

test('a row that does not say who probed it, and when, is not a probe', async () => {
  // Otherwise a hand-typed {"url": ..., "verdict": "ok"} is indistinguishable
  // from a fetch, and the record stops being a record of anything.
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    rawRecord: JSON.stringify({ links: [{ url: 'https://example.com/', verdict: 'ok' }] }),
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /unrecordedSourceUrl/);
  assert.match(result.out, /rows refused/);
});

test('the failure tells the author the exact command to probe the new URL', async () => {
  // A correct gate nobody can act on is an unusable gate. The message must
  // name the URL and the command, not a doc to go and read.
  const url = 'https://brand-new-source.example/page';
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: url } },
    links: [],
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /npm run probe:link-health -- --url https:\/\/brand-new-source\.example\/page/);
  assert.match(result.out, /git add .*probe-ledger\.json/);
});

/* ------------------------------------------------------------------ */
/* No build and no CI job may invoke the writer                        */
/* ------------------------------------------------------------------ */

/** Expand an npm script through `npm run <name>` references, one level at a time. */
async function expandBuildScript() {
  const pkg = JSON.parse(await readFile(join(NEXT, 'package.json'), 'utf8'));
  const scripts = pkg.scripts ?? {};
  const seen = new Set();
  const out = [];
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    const body = scripts[name];
    if (!body) return;
    out.push(body);
    for (const m of body.matchAll(/npm run ([\w:-]+)/g)) visit(m[1]);
  };
  visit('build');
  return out.join('\n');
}

test('no step reachable from `npm run build` can write the probe record', async () => {
  // The rule, not today's script list: whatever the build grows next, it may
  // not reach the prober or the disposition applier, and it may not hand the
  // gate a --probe flag.
  const body = await expandBuildScript();
  assert.doesNotMatch(body, /probe-link-health/, 'the build invokes the prober');
  assert.doesNotMatch(body, /probe:link-health/, 'the build invokes the prober');
  assert.doesNotMatch(body, /apply-link-dispositions/, 'the build rewrites the record via dispositions');
  assert.doesNotMatch(body, /--probe/, 'the build passes --probe to something');
});

/** Every workflow, with its comment lines stripped so prose cannot trip a rule. */
async function workflows() {
  const dir = join(REPO, '.github', 'workflows');
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert.ok(files.length > 0, 'no workflows found - has the path moved?');
  const out = [];
  for (const file of files) {
    const text = await readFile(join(dir, file), 'utf8');
    const code = text
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n');
    out.push({ file, text, code });
  }
  return out;
}

test('a workflow that reaches the prober is never in the merge path', async () => {
  // The rule, stated as the thing that actually matters: probing is allowed on
  // a schedule, because finding out a council page died is worth doing. It is
  // never allowed on a pull request or a push, because then a remote server
  // having a bad night reddens somebody's branch - and a check that cries wolf
  // is a check everyone merges through, including the time it is right.
  //
  // Read crudely and strictly: any `pull_request:` or `push:` key at the start
  // of a line counts. Over-strict is the safe direction; it can only forbid
  // more workflows from probing, never fewer.
  for (const { file, code } of await workflows()) {
    if (!/probe-link-health|probe:link-health/.test(code)) continue;
    assert.doesNotMatch(code, /^\s*pull_request:/m, `${file} probes on a pull request`);
    assert.doesNotMatch(code, /^\s*push:/m, `${file} probes on a push`);
  }
});

test('a workflow that reaches the prober proves it did not write the record', async () => {
  // Probing into a scratch copy is the intent; this asserts the workflow
  // checks its own intent at runtime rather than asserting the intent is
  // written down. A scheduled job that re-probed and committed would hand the
  // merge gate's evidence back to a machine - the same defect the split
  // removed, wearing a calendar instead of a build.
  for (const { file, code } of await workflows()) {
    if (!/probe-link-health\.mjs/.test(code)) continue;
    assert.match(
      code,
      /git diff --quiet -- ops\/records\//,
      `${file} probes without proving ops/records/ is untouched afterwards`
    );
  }
});

test('no build-path workflow mentions the prober in a run step at all', async () => {
  // Belt to the braces above: content-gate.yml and build-and-deploy.yml are the
  // merge path. Comments there explaining how a human probes are wanted; a step
  // that does it is not.
  for (const { file, code } of await workflows()) {
    if (!['content-gate.yml', 'build-and-deploy.yml'].includes(file)) continue;
    assert.doesNotMatch(code, /probe-link-health|probe:link-health/, `${file} invokes the prober`);
  }
});

test('the gate does not import the network half', async () => {
  // Structural, not stylistic: if audit-link-health.mjs cannot reach
  // link-health/probe.mjs, no flag, env var or hurried edit to a build line
  // can make the gate dial out or write a verdict.
  const source = await readFile(SCRIPT, 'utf8');
  const imports = [...source.matchAll(/^import[\s\S]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  assert.ok(
    !imports.some((spec) => spec.includes('link-health/probe.mjs') || spec.includes('probe-link-health')),
    `the gate imports the prober: ${imports.join(', ')}`
  );
});

test('the prober is the only script that writes the probe record', async () => {
  const { readdir } = await import('node:fs/promises');
  const scriptsDir = dirname(SCRIPT);
  const files = (await readdir(scriptsDir)).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'));
  const writers = [];
  for (const file of files) {
    const text = await readFile(join(scriptsDir, file), 'utf8');
    if (!/probe-ledger\.json/.test(text)) continue;
    // A script that names the record AND writes a file is a candidate writer.
    if (/writeFile\(\s*(RECORD|LEDGER)\b/.test(text)) writers.push(file);
  }
  assert.deepEqual(
    writers.sort(),
    ['apply-link-dispositions.mjs', 'probe-link-health.mjs'],
    'something other than the prober and the disposition applier writes the record'
  );
});

test('the prober exists and refuses to be imported for its side effects', async () => {
  // A cheap liveness check on the split: the file is there, it is executable
  // by node, and --dry-run against an empty corpus writes nothing.
  const dir = await mkdtemp(join(tmpdir(), 'pi-link-health-probe-'));
  try {
    const contentDir = join(dir, 'content');
    await mkdir(contentDir, { recursive: true });
    const recordPath = join(dir, 'probe-ledger.json');
    await writeFile(recordPath, JSON.stringify({ links: [] }));
    const before = sha(await readFile(recordPath, 'utf8'));
    const { stdout } = await run(process.execPath, [
      PROBER,
      '--dry-run',
      '--unrecorded',
      '--record',
      recordPath,
      '--content-dir',
      contentDir,
    ]);
    assert.match(stdout, /Nothing to probe/);
    assert.equal(sha(await readFile(recordPath, 'utf8')), before);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ */
/* The metrics themselves                                              */
/* ------------------------------------------------------------------ */

test('a clean corpus with a fully probed record passes', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    links: [{ url: 'https://example.com/', verdict: 'ok', httpCode: '200' }],
  });
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /PASS/);
});

test('a citation with no probe row fails: nothing ships unprobed', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    links: [],
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /unrecordedSourceUrl/);
});

test('a baseline written under the old metric name still holds the ceiling', async () => {
  // Renaming the concept must not silently drop a ceiling of 0 and let an
  // unprobed citation through - that would be this exact defect, reintroduced
  // by a rename.
  const dir = await mkdtemp(join(tmpdir(), 'pi-link-health-legacy-'));
  try {
    const contentDir = join(dir, 'content');
    await mkdir(contentDir, { recursive: true });
    await writeFile(
      join(contentDir, 'a.json'),
      JSON.stringify({ slug: 'a', website: 'https://never-fetched.example/' })
    );
    const recordPath = join(dir, 'probe-ledger.json');
    await writeFile(recordPath, JSON.stringify({ links: [] }));
    const baselinePath = join(dir, 'baseline.json');
    await writeFile(
      baselinePath,
      JSON.stringify({ ceilings: { unledgeredSourceUrl: 0, deadSourceUrlCited: 0, staleRedirectCited: 0 } })
    );
    await assert.rejects(
      run(process.execPath, [
        SCRIPT,
        '--assert',
        '--baseline',
        baselinePath,
        '--record',
        recordPath,
        '--content-dir',
        contentDir,
      ])
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a dead URL still cited fails', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://gone.example/' } },
    links: [{ url: 'https://gone.example/', verdict: 'dead', httpCode: '404' }],
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /deadSourceUrlCited/);
});

test('a blocked host is not counted dead', async () => {
  // The failure this guards: the council returns 403 to every robot. If that
  // read as dead, the gate would demand deleting the provenance of every
  // council-sourced record on the site.
  const result = await audit({
    records: { 'events/a.json': { slug: 'a', officialEventUrl: 'https://council.example/x' } },
    links: [{ url: 'https://council.example/x', verdict: 'blocked', httpCode: '403' }],
  });
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /blocked host cited \(not a fault\)\s+1/);
});

test('a record that declares itself unsourced disposes of its dead link', async () => {
  // An honest "no source" is a correct outcome. The claim stays visible to the
  // registry as unsupported instead of the link quietly rotting in place.
  const result = await audit({
    records: {
      'venues/a.json': { slug: 'a', website: 'https://gone.example/', sourceStatus: 'unsourced' },
    },
    links: [{ url: 'https://gone.example/', verdict: 'dead', httpCode: '404' }],
  });
  assert.equal(result.code, 0, result.out);
});

test('a moved URL that the record has not followed fails', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://old.example/' } },
    links: [
      {
        url: 'https://old.example/',
        verdict: 'moved',
        httpCode: '404',
        replacement: 'https://new.example/',
      },
    ],
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /staleRedirectCited/);
});

test('a non-source URL field is ignored', async () => {
  // heroImage.credit is not provenance. A gate that fired on every outbound
  // string in the corpus would be switched off within a week.
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', heroImage: { credit: 'https://photographer.example/' } } },
    links: [],
  });
  assert.equal(result.code, 0, result.out);
});

test('a missing baseline fails closed rather than reading as no regression', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    links: [{ url: 'https://example.com/', verdict: 'ok', httpCode: '200' }],
    baseline: false,
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /cannot read baseline/);
});

test('the ratchet holds inherited debt without blocking, and fails on one more', async () => {
  const twoDead = {
    'venues/a.json': { slug: 'a', website: 'https://gone.example/' },
    'venues/b.json': { slug: 'b', website: 'https://gone.example/' },
  };
  const links = [{ url: 'https://gone.example/', verdict: 'dead', httpCode: '404' }];

  const atCeiling = await audit({ records: twoDead, links, ceilings: { deadSourceUrlCited: 2 } });
  assert.equal(atCeiling.code, 0, atCeiling.out);

  const overCeiling = await audit({ records: twoDead, links, ceilings: { deadSourceUrlCited: 1 } });
  assert.equal(overCeiling.code, 1, overCeiling.out);
});

test('probe dates are reported and never asserted', async () => {
  // A row going stale is the calendar moving, not a change anyone made. The
  // gate must say how old its evidence is and must never fail because of it -
  // which is also why every fixture row here is dated 2026-01-01 and every
  // test still passes.
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    links: [{ url: 'https://example.com/', verdict: 'ok', httpCode: '200' }],
  });
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /probes dated .*\[reported only\]/);
});
