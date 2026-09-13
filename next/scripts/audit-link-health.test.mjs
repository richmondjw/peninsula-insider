/**
 * Tests for the source-link gate.
 *
 * Two properties matter more than any individual metric, and both are asserted
 * here against fixture trees rather than the live corpus:
 *
 *   1. THE GATE NEVER TOUCHES THE NETWORK unless --probe is passed. Every test
 *      in this file runs offline; if the default path ever grew a fetch, these
 *      would hang or fail on a machine with no egress, which is the point. A
 *      link checker that dials out during CI fails at 3am with no code change,
 *      and a gate that cries wolf is a gate nobody reads.
 *
 *   2. A BLOCKED HOST IS NOT A DEAD HOST. The council is this corpus's
 *      most-cited publisher and refuses most automated reads. If `blocked` ever
 *      counted toward the dead metric, the gate would demand the deletion of a
 *      third of the site's provenance over a robots policy.
 *
 * Nothing here pins a date, because nothing in the gate reads one.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./audit-link-health.mjs', import.meta.url));

const CEILINGS = {
  unledgeredSourceUrl: 0,
  deadSourceUrlCited: 0,
  staleRedirectCited: 0,
};

/**
 * Build a fixture corpus plus a ledger, and audit it.
 *
 *   records  { 'venues/a.json': {...} }  content records
 *   links    [ { url, verdict, ... } ]   ledger rows
 */
async function audit({ records = {}, links = [], ceilings = {}, baseline = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-link-health-'));
  try {
    const contentDir = join(dir, 'content');
    await mkdir(contentDir, { recursive: true });

    for (const [name, record] of Object.entries(records)) {
      const abs = join(contentDir, name);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, JSON.stringify(record, null, 2));
    }

    const ledgerPath = join(dir, 'ledger.json');
    await writeFile(ledgerPath, JSON.stringify({ links }));

    const baselinePath = join(dir, 'baseline.json');
    if (baseline) {
      await writeFile(baselinePath, JSON.stringify({ ceilings: { ...CEILINGS, ...ceilings } }));
    }

    const args = [
      SCRIPT,
      '--assert',
      '--baseline',
      baselinePath,
      '--ledger',
      ledgerPath,
      '--content-dir',
      contentDir,
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

test('a clean corpus with a fully probed ledger passes', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    links: [{ url: 'https://example.com/', verdict: 'ok', httpCode: '200' }],
  });
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /PASS/);
});

test('a citation with no ledger row fails: nothing ships unprobed', async () => {
  const result = await audit({
    records: { 'venues/a.json': { slug: 'a', website: 'https://example.com/' } },
    links: [],
  });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /unledgeredSourceUrl/);
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
