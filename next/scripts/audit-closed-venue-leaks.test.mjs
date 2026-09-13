/**
 * Tests for the closed-venue gate.
 *
 * The gate runs inside `npm run build`, so a false failure blocks every deploy
 * and a false pass lets a reader be sent to a business that no longer exists.
 * Both directions are asserted here against fixture trees rather than the live
 * corpus.
 *
 * Nothing in this file pins a date, because nothing in the gate reads one. The
 * closed set comes from the content records and the occurrences come from the
 * built files, so the same tree gives the same answer today and next April.
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
const SCRIPT = fileURLToPath(new URL('./audit-closed-venue-leaks.mjs', import.meta.url));

/**
 * Build a fixture tree and audit it.
 *
 *   venues    { 'a.json': {...} }        the venue collection
 *   pages     { '/eat/': '<html>' }      built routes, written as index.html
 *   ceilings  { '/eat/': 1 }             the ratchet baseline
 */
async function audit({ venues = {}, pages = {}, ceilings = {}, baseline = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-closed-venue-'));
  try {
    const contentDir = join(dir, 'venues');
    const distDir = join(dir, 'dist');
    await mkdir(contentDir, { recursive: true });
    await mkdir(distDir, { recursive: true });

    for (const [name, record] of Object.entries(venues)) {
      await writeFile(join(contentDir, name), JSON.stringify(record, null, 2));
    }
    for (const [route, html] of Object.entries(pages)) {
      const abs = route.endsWith('/')
        ? join(distDir, route.slice(1), 'index.html')
        : join(distDir, route.slice(1));
      await mkdir(join(abs, '..'), { recursive: true });
      await writeFile(abs, html);
    }

    const baselinePath = join(dir, 'baseline.json');
    if (baseline) {
      await writeFile(baselinePath, JSON.stringify({ ceilings }, null, 2));
    }

    const args = [
      SCRIPT,
      '--dist',
      distDir,
      '--content',
      contentDir,
      '--baseline',
      baselinePath,
      '--assert',
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

const OPEN = { slug: 'open-cafe', name: 'Open Cafe', type: 'cafe' };
const CLOSED_STATUS = {
  slug: 'shut-bistro',
  name: 'Shut Bistro',
  type: 'restaurant',
  status: 'permanently_closed',
};
/** The La Baracca shape: closure recorded on the OTHER field, no `status`. */
const CLOSED_OPERATING = {
  slug: 'la-baracca',
  name: "La Baracca at T'Gallant",
  type: 'restaurant',
  operatingStatus: 'permanently-closed',
};

const listing = (...slugs) =>
  `<html><body><ul>${slugs
    .map((s) => `<li><a href="/eat/${s}/">${s}</a></li>`)
    .join('')}</ul></body></html>`;

test('a clean build passes', async () => {
  const result = await audit({
    venues: { 'open.json': OPEN, 'shut.json': CLOSED_STATUS },
    pages: { '/eat/': listing('open-cafe') },
  });
  assert.equal(result.code, 0);
  assert.match(result.out, /PASS/);
});

test('a new listing surface naming a closed venue fails', async () => {
  const result = await audit({
    venues: { 'open.json': OPEN, 'shut.json': CLOSED_STATUS },
    pages: { '/eat/': listing('open-cafe'), '/stay/': listing('open-cafe', 'shut-bistro') },
  });
  assert.equal(result.code, 1);
  assert.match(result.out, /\/stay\//);
  assert.match(result.out, /shut-bistro/);
});

test('a closure recorded only on operatingStatus is caught', async () => {
  // The half of the defect the old status-only predicate missed entirely.
  const result = await audit({
    venues: { 'baracca.json': CLOSED_OPERATING },
    pages: { '/eat/': listing('la-baracca') },
  });
  assert.equal(result.code, 1);
  assert.match(result.out, /la-baracca/);
  assert.match(result.out, /operatingStatus/);
});

test('a closed venue is caught by display name alone', async () => {
  // A card that prints the name without linking the slug is the same defect.
  const result = await audit({
    venues: { 'shut.json': CLOSED_STATUS },
    pages: { '/guides/winter/': '<html><body><p>Try Shut Bistro.</p></body></html>' },
  });
  assert.equal(result.code, 1);
  assert.match(result.out, /guides\/winter/);
});

test("a closed venue's own detail page is never a leak", async () => {
  // The page is expected to exist and to say the venue has closed. Deleting it
  // would delete a live URL, so the gate must not push anyone towards that.
  const result = await audit({
    venues: { 'shut.json': CLOSED_STATUS },
    pages: {
      '/eat/shut-bistro/': '<html><body><h1>Shut Bistro</h1><p>This venue is closed.</p></body></html>',
    },
  });
  assert.equal(result.code, 0);
  assert.match(result.out, /PASS/);
});

test('a page inside the baseline may not grow', async () => {
  const both = listing('shut-bistro', 'la-baracca');
  const held = await audit({
    venues: { 'shut.json': CLOSED_STATUS, 'baracca.json': CLOSED_OPERATING },
    pages: { '/saved/': listing('shut-bistro') },
    ceilings: { '/saved/': 1 },
  });
  assert.equal(held.code, 0);

  const grown = await audit({
    venues: { 'shut.json': CLOSED_STATUS, 'baracca.json': CLOSED_OPERATING },
    pages: { '/saved/': both },
    ceilings: { '/saved/': 1 },
  });
  assert.equal(grown.code, 1);
  assert.match(grown.out, /2 > baseline 1/);
});

test('a slug that is only a prefix of another is not a false positive', async () => {
  const result = await audit({
    venues: { 'shut.json': CLOSED_STATUS },
    pages: { '/eat/': listing('shut-bistro-annexe') },
  });
  assert.equal(result.code, 0);
});

test('a missing baseline fails closed', async () => {
  const result = await audit({
    venues: { 'shut.json': CLOSED_STATUS },
    pages: { '/eat/': listing('open-cafe') },
    baseline: false,
  });
  assert.equal(result.code, 1);
  assert.match(result.out, /cannot read baseline/);
});

test('an empty dist fails closed rather than reporting no leaks', async () => {
  const result = await audit({ venues: { 'shut.json': CLOSED_STATUS }, pages: {} });
  assert.equal(result.code, 1);
  assert.match(result.out, /nothing to audit/);
});
