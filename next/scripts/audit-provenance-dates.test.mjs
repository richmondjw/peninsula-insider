/**
 * Tests for the provenance-date gate.
 *
 * The gate runs inside `npm run build`, so a false failure blocks every deploy
 * and a false pass lets an unearned verification date reach a reader. Both
 * directions are asserted here against fixture trees rather than the live
 * corpus.
 *
 * Nothing in this file pins a date, because nothing in the gate reads one. The
 * metrics count properties of files, so a run today and a run next April give
 * the same answer for the same tree. That is the property
 * audit-event-safeguards.mjs had to learn by shipping a gate that would have
 * blocked every deploy four days later with no content change.
 */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL('./audit-provenance-dates.mjs', import.meta.url));

const CEILINGS = {
  publishPathStampsCheckDate: 0,
  visitWithoutVisitRecord: 0,
  checkedOnWithoutSource: 0,
  hardcodedVerificationDate: 0,
};

/**
 * Build a fixture tree and audit it.
 *
 *   scripts   { name: source }        a publish-path script
 *   records   { 'venues/a.json': {} } a content record
 *   pages     { name: source }        a template
 */
async function audit({ scripts = {}, records = {}, pages = {}, ceilings = {}, baseline = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-provenance-'));
  try {
    const scriptDir = join(dir, 'scripts');
    const contentDir = join(dir, 'content');
    const pagesDir = join(dir, 'pages');
    await mkdir(scriptDir, { recursive: true });
    await mkdir(join(contentDir, 'claims'), { recursive: true });
    await mkdir(pagesDir, { recursive: true });

    for (const [name, source] of Object.entries(scripts)) {
      await writeFile(join(scriptDir, name), source);
    }
    for (const [name, record] of Object.entries(records)) {
      const abs = join(contentDir, name);
      await mkdir(join(abs, '..'), { recursive: true });
      await writeFile(abs, JSON.stringify(record, null, 2));
    }
    for (const [name, source] of Object.entries(pages)) {
      await writeFile(join(pagesDir, name), source);
    }

    const baselinePath = join(dir, 'baseline.json');
    if (baseline) {
      await writeFile(baselinePath, JSON.stringify({ ceilings: { ...CEILINGS, ...ceilings } }));
    }

    const args = [SCRIPT, '--assert', '--baseline', baselinePath,
                  '--script-dir', scriptDir, '--content-dir', contentDir, '--pages-dir', pagesDir];
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

/* -- publish paths --------------------------------------------------- */

test('an empty tree passes', async () => {
  const { code } = await audit({});
  assert.equal(code, 0);
});

test('a publish path that stamps a check date from the clock fails', async () => {
  const { code, out } = await audit({
    scripts: {
      'apply-copy.py': "data['lastCheckedDate'] = date.today().isoformat()\n",
    },
  });
  assert.equal(code, 1);
  assert.match(out, /publishPathStampsCheckDate: 1 > baseline 0/);
});

test('the JavaScript spelling of the same defect fails too', async () => {
  const { code, out } = await audit({
    scripts: { 'regen.mjs': 'record.lastVerified = new Date().toISOString();\n' },
  });
  assert.equal(code, 1);
  assert.match(out, /STAMP/);
});

test('a comment naming the defect is not the defect', async () => {
  const { code } = await audit({
    scripts: {
      'apply-copy.py': "# never write data['lastCheckedDate'] = date.today() here\npass\n",
    },
  });
  assert.equal(code, 0);
});

test('a script that really checks may stamp, with a reason', async () => {
  const { code } = await audit({
    scripts: {
      'recheck.mjs':
        '// pi-check-stamp-allow: this job reads the operator page before writing\n' +
        'record.lastVerified = new Date().toISOString();\n',
    },
  });
  assert.equal(code, 0);
});

test('a bare allow marker is itself a violation', async () => {
  const { code } = await audit({
    scripts: {
      'recheck.mjs': '// pi-check-stamp-allow: ok\nrecord.lastVerified = new Date().toISOString();\n',
    },
  });
  assert.equal(code, 1);
});

/* -- visits ---------------------------------------------------------- */

test('a record claiming a visit with no visit record fails', async () => {
  const { code, out } = await audit({
    records: { 'venues/a.json': { slug: 'a', editorialProvenance: { method: 'visited' } } },
  });
  assert.equal(code, 1);
  assert.match(out, /visitWithoutVisitRecord: 1 > baseline 0/);
});

test('a documented visit passes', async () => {
  const { code } = await audit({
    records: {
      'venues/a.json': {
        slug: 'a',
        editorialProvenance: { method: 'visited', visit: { occurredOn: '2026-03-02' } },
      },
    },
  });
  assert.equal(code, 0);
});

test('the legacy editorVisited flag needs the same evidence', async () => {
  const { code, out } = await audit({
    records: { 'events/a.json': { slug: 'a', editorVisited: true } },
  });
  assert.equal(code, 1);
  assert.match(out, /editorVisited with no visit record/);
});

/* -- check dates ----------------------------------------------------- */

test('a check date with no source and no claim fails', async () => {
  const { code, out } = await audit({
    records: { 'venues/a.json': { slug: 'a', editorialProvenance: { checkedOn: '2026-09-01' } } },
  });
  assert.equal(code, 1);
  assert.match(out, /checkedOnWithoutSource: 1 > baseline 0/);
});

test('a check date naming its source passes', async () => {
  const { code } = await audit({
    records: {
      'venues/a.json': {
        slug: 'a',
        editorialProvenance: { checkedOn: '2026-09-01', source: 'https://example.com/hours' },
      },
    },
  });
  assert.equal(code, 0);
});

test('a check date backed by a registry claim passes', async () => {
  const { code } = await audit({
    records: {
      'venues/a.json': { slug: 'a', editorialProvenance: { checkedOn: '2026-09-01' } },
      'claims/venues/a/opening-hours.json': {
        claimId: 'venues/a/opening-hours',
        subject: { type: 'venues', slug: 'a' },
        assertedBy: [{ type: 'venues', slug: 'a' }],
      },
    },
  });
  assert.equal(code, 0);
});

/* -- templates ------------------------------------------------------- */

test('a hardcoded verification date in a template fails', async () => {
  const { code, out } = await audit({
    pages: { 'hub.astro': "<p>Last fact-verified 23 April 2026</p>\n" },
  });
  assert.equal(code, 1);
  assert.match(out, /hardcodedVerificationDate: 1 > baseline 0/);
});

test('the ISO spelling fails too', async () => {
  const { code } = await audit({
    pages: { 'hub.astro': "const lastVerifiedISO = '2026-04-30';\n" },
  });
  assert.equal(code, 1);
});

test('a derived stamp passes', async () => {
  const { code } = await audit({
    pages: { 'hub.astro': '<p>{provenance.stampLabel} {verificationStamp}</p>\n' },
  });
  assert.equal(code, 0);
});

test('a residue the ratchet already knows about does not fail', async () => {
  const { code } = await audit({
    pages: { 'hub.astro': '<p>Last fact-verified 23 April 2026</p>\n' },
    ceilings: { hardcodedVerificationDate: 1 },
  });
  assert.equal(code, 0);
});

/* -- the gate itself ------------------------------------------------- */

test('a missing baseline fails closed', async () => {
  const { code, out } = await audit({ baseline: false });
  assert.equal(code, 1);
  assert.match(out, /cannot read baseline/);
});
