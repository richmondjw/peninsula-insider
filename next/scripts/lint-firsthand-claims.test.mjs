/**
 * Tests for the first-hand claim gate.
 *
 * The gate runs inside `npm run build` and inside the Content Gate workflow, so
 * a false failure blocks every deploy and a false pass lets an unsupported
 * trust claim reach readers. Both directions are asserted here, against fixture
 * corpora rather than the live content.
 *
 * The fixtures are not invented. The "must fail" strings are the exact ones
 * that shipped, and the "must pass" strings are real lines lifted from the
 * corpus that a sloppier pattern set would have flagged: "less visited",
 * "best drunk fresh", "the winemaker is often there in person". Those are the
 * lines that decide whether anyone leaves the gate switched on.
 *
 * The src/content case is the regression this file exists for. The 13 August
 * 2026 sweep covered only pages/ and layouts/, and two claims in
 * src/content/editorial_blocks/ survived it by a month.
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
const SCRIPT = fileURLToPath(new URL('./lint-firsthand-claims.mjs', import.meta.url));

/** Write a fake src/ tree and lint it. `files` maps a path under src/ to its text. */
async function lint(files) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-claimlint-'));
  try {
    const src = join(dir, 'src');
    for (const [rel, body] of Object.entries(files)) {
      const abs = join(src, rel);
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, body);
    }
    await mkdir(src, { recursive: true });
    try {
      const { stdout } = await run(process.execPath, [SCRIPT, '--root', src]);
      return { code: 0, out: stdout };
    } catch (error) {
      return { code: error.code ?? 1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const md = (body) => `---\ntitle: Fixture\n---\n\n${body}\n`;

// ── the known-bad strings ───────────────────────────────────────────────────

test('the cellar-door claim that shipped is caught', async () => {
  const { code, out } = await lint({
    'content/editorial_blocks/a.md': md(
      'This list is editorial. Every entry has been visited and the wine has been drunk at the source.'
    ),
  });
  assert.equal(code, 1);
  assert.match(out, /universal-visit/);
  assert.match(out, /method-claim/);
});

test('the restaurants claim that shipped is caught', async () => {
  const { code, out } = await lint({
    'content/editorial_blocks/b.md': md(
      'This list is built on editorial judgement: every entry has been visited and earned its sentence.'
    ),
  });
  assert.equal(code, 1);
  assert.match(out, /universal-visit/);
});

test('src/content is scanned, not just pages', async () => {
  // The 2026-08-13 sweep touched only pages/ and layouts/. A gate with the same
  // blind spot would be worthless, so this asserts the coverage directly.
  const bad = md('Every venue on this list has been personally visited.');
  const contentOnly = await lint({ 'content/venues/x.md': bad });
  assert.equal(contentOnly.code, 1);
  assert.match(contentOnly.out, /content\/venues\/x\.md/);

  for (const root of ['pages', 'layouts', 'components', 'data']) {
    const { code } = await lint({ [`${root}/x.md`]: bad });
    assert.equal(code, 1, `${root}/ was not scanned`);
  }
});

test('JSON content bodies are scanned', async () => {
  const { code, out } = await lint({
    'content/venues/x.json': JSON.stringify({
      editorNote: 'A fine room.\nOur editors have eaten at every table in it.',
    }),
  });
  assert.equal(code, 1);
  assert.match(out, /editorial-visit|method-claim/);
});

test('each rule fires on its own trigger', async () => {
  const cases = [
    ['universal-visit', 'All of which we have visited over the past year.'],
    ['editorial-visit', 'We visited the cellar door on a wet Tuesday.'],
    ['method-claim', 'Every room here was personally inspected before it was listed.'],
    ['firsthand', 'The rankings rest on first-hand research by the desk.'],
    ['in-person', 'Opening hours are checked in person before publication.'],
  ];
  for (const [rule, text] of cases) {
    const { code, out } = await lint({ 'content/x.md': md(text) });
    assert.equal(code, 1, `${rule} did not fail on: ${text}`);
    assert.match(out, new RegExp(rule), `${rule} did not fire on: ${text}`);
  }
});

// ── the clean copy that must keep passing ───────────────────────────────────

test('the corrected wording on the two live pages passes', async () => {
  const { code, out } = await lint({
    'pages/wine/best-cellar-doors.astro':
      '<p>This list is editorial, researched and ranked on editorial judgement, not paid placement.</p>',
    'pages/eat/best-restaurants.astro':
      "<p>This list is built on editorial judgement - every entry is researched and reviewed, and earned its place on merit.</p>",
    'content/editorial_blocks/a.md': md(
      'This list is editorial, researched and ranked on editorial judgement, not paid placement.'
    ),
  });
  assert.equal(code, 0, out);
});

test('real corpus lines that a sloppier pattern set would flag all pass', async () => {
  // Every one of these is a line that exists on the live site today.
  const corpus = [
    'Every property is independently researched and kept current.',
    'Every venue here is independently researched by the editorial desk. No paid placements.',
    'Every pick earns its place. Every verdict has a reason.',
    "Each entry is verified against the operator's current product.",
    'Every producer we track, one URL each. Narrow with the chips; sort by name or town.',
    'We do not accept every venue, and we do not guarantee coverage.',
    'Best visited mid-September mornings after rain. Forty-minute grassland loop.',
    'Broad foreshore, less visited, good for dogs that need room.',
    "The thermal springs complex at Fingal, the peninsula's most visited paid attraction.",
    'Ocean beaches not in the table above can still be visited, but swimming is not advised.',
    'not like you spent a weekend grinding 36 holes at a resort you could have visited anywhere in the country.',
    'Ocean Eight (Aylward Chardonnay, minimal oak, saline backbone, best drunk fresh).',
    'This is a wine that needs to be drunk at the correct temperature and with a proper glass.',
    'By Sunday afternoon you are tired, slightly drunk, and wondering why the weekend felt busier than the week.',
    'A private cellar-door tasting at one of the smaller producers where the winemaker is often there in person.',
    'the kind of slow walk you only get at properties where the founders are still on the ground.',
    'The gallery also has its permanent collection on the ground floor, which is worth the walk through.',
    'You have never been to the Mornington Peninsula. You have a free weekend.',
    'Mussels steamed in a rental kitchen with wine from the cellar door you visited that morning.',
    'Most guides to the Mornington Peninsula are written by people who visited once.',
    'Every venue referenced has its own page with editor notes, booking links, and nearby picks.',
    'check the policy of each property before travelling.',
    'Contact each producer directly. Booking windows vary; some open seasonally.',
  ];
  for (const line of corpus) {
    const { code, out } = await lint({ 'content/x.md': md(line) });
    assert.equal(code, 0, `false positive on: ${line}\n${out}`);
  }
});

test('a modal is a capability, not a claim', async () => {
  const { code, out } = await lint({
    'content/x.md': md('Every walk on this list can be walked in under an hour.'),
  });
  assert.equal(code, 0, out);
});

test('comment lines are not reader-facing copy', async () => {
  const { code, out } = await lint({
    'components/TrustNote.astro':
      '---\n/**\n * Never strengthen the claim (no "personally visited", no "every venue verified")\n */\n---\n<p>Independent editorial.</p>',
  });
  assert.equal(code, 0, out);
});

test('_archive is excluded because Astro does not route it', async () => {
  const { code, out } = await lint({
    'pages/_archive/old.astro': '<p>Every entry has been visited and the wine has been drunk at the source.</p>',
  });
  assert.equal(code, 0, out);
});

// ── the escape hatch ────────────────────────────────────────────────────────

test('an evidenced claim is allowed by the inline comment', async () => {
  const { code, out } = await lint({
    'content/articles/x.md': md(
      '<!-- pi-claim-lint-allow: editor attended the release lunch, 4 May 2026 -->\nWe visited on the morning of 4 May 2026.'
    ),
  });
  assert.equal(code, 0, out);
  assert.match(out, /1 evidenced claim\(s\) allowed/);
});

test('the allow comment works on the same line too', async () => {
  const { code, out } = await lint({
    'pages/x.astro':
      "<p>We visited the estate in May.</p> <!-- pi-claim-lint-allow: editor attended, 4 May 2026 -->",
  });
  assert.equal(code, 0, out);
});

test('an allow comment with no reason is itself a violation', async () => {
  const { code, out } = await lint({
    'content/articles/x.md': md('<!-- pi-claim-lint-allow: -->\nWe visited on the morning of 4 May 2026.'),
  });
  assert.equal(code, 1);
  assert.match(out, /allow-without-reason/);
});

test('a too-short reason does not buy a pass', async () => {
  const { code, out } = await lint({
    'content/articles/x.md': md('<!-- pi-claim-lint-allow: yes -->\nWe visited on the morning of 4 May 2026.'),
  });
  assert.equal(code, 1);
  assert.match(out, /allow-without-reason/);
});

// ── the live corpus ─────────────────────────────────────────────────────────

test('the real corpus is clean', async () => {
  // The gate is only credible if it is green on the thing it guards. This runs
  // it against src/ exactly as the build does.
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const { stdout } = await run(process.execPath, [SCRIPT], { cwd });
  assert.match(stdout, /No unsupported first-hand claims/);
});
