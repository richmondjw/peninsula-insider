#!/usr/bin/env node
/**
 * assert-baseline-placement.mjs — a ratchet ceiling may not be filed where the
 * build's cleanup will silently eat it.
 *
 * `ops/reports/` is build output. The standing instruction when working in this
 * repository is to revert it wholesale before committing, and that instruction
 * is correct: every file there can be reproduced by running the build again.
 *
 * A ratchet baseline cannot. It is policy — a ceiling a person chose for how
 * much of a known defect a gate will tolerate — and the one thing a wholesale
 * revert does to an unstaged policy edit is destroy it without saying so.
 * Tightening a gate is exactly such an edit. Filed under `ops/reports/`, a
 * deliberate ratchet-down that had not yet been staged would vanish into the
 * habitual cleanup, leaving the gate looser than its author intended, with no
 * error and no diff. A loosening disappears the same way, which is worse.
 *
 * Baselines therefore live in `ops/baselines/`, which no build writes and so no
 * cleanup reverts. This gate is what stops that convention depending on anybody
 * remembering it.
 *
 * It asserts the rule, not today's file list. Two nets:
 *
 *   MISFILED   Nothing under `ops/reports/` may be a ratchet baseline. Caught by
 *              name (a .json whose filename says "baseline") and, for a file
 *              renamed around that, by shape: a JSON object carrying a
 *              top-level `ceilings`, `floors` or `maxTargets` is a ratchet
 *              whatever it is called.
 *
 *   STALE      No source file, script, workflow or document may point a
 *              baseline path back into `ops/reports/`. A gate born with its
 *              ceiling in the wrong place is the recurrence this catches, and a
 *              comment that misdescribes where policy lives teaches the wrong
 *              lesson to the next person who reads it.
 *
 * Nothing here is time-driven, nothing is random and nothing touches the
 * network. The same tree yields the same verdict on any machine on any date.
 *
 * Usage:
 *   node scripts/assert-baseline-placement.mjs [--root path] [--quiet]
 *
 * Exits 1 if either net catches something. `--root` points the whole check at a
 * different tree, which is how the tests drive it against fixtures.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(SCRIPTS, '..');
const REPO = path.resolve(NEXT, '..');

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const ROOT = path.resolve(getArg('--root', REPO));
const QUIET = args.includes('--quiet');

/** Where ceilings belong, and where they must not be. */
const BASELINE_DIR = path.join('ops', 'baselines');
const REPORTS_DIR = path.join('ops', 'reports');

/**
 * A ratchet by shape rather than by name. Every baseline in this repository
 * states its ceilings as one of these top-level keys; a file that does so is a
 * ceiling however it has been named.
 */
const RATCHET_KEYS = ['ceilings', 'floors', 'maxTargets'];

/** Directories no check descends into: vendored, generated or binary. */
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  '.astro',
  '_astro',
  '.pi-autofix',
  '.pi-image-intelligence',
  '__pycache__',
]);

/** Only these are read as text by the stale-pointer net. */
const TEXT_EXTENSIONS = new Set([
  '.mjs',
  '.cjs',
  '.js',
  '.ts',
  '.tsx',
  '.astro',
  '.json',
  '.yml',
  '.yaml',
  '.md',
  '.sh',
  '.py',
]);

/**
 * Files exempt from the stale-pointer net, each for a reason that is about the
 * file's nature rather than its convenience:
 *
 *  - this checker and its test necessarily contain the pattern they hunt for;
 *  - CHANGELOG.md is append-only history, and history is allowed to record
 *    where a file used to live;
 *  - package-lock.json is generated and enormous.
 */
const POINTER_EXEMPT = new Set(
  [
    'next/scripts/assert-baseline-placement.mjs',
    'next/scripts/assert-baseline-placement.test.mjs',
    'CHANGELOG.md',
    'next/package-lock.json',
  ].map((p) => p.split('/').join(path.sep))
);

/**
 * A path that points a baseline into the reports directory, in either of the
 * two spellings this repository uses: a slash path in a comment, workflow or
 * document, and a `path.join` segment list in a script.
 *
 * Built from parts so this file is not itself an offender — the exemption above
 * covers it, and a checker that would fail its own check is a trap for whoever
 * next widens the net.
 */
const R = 'reports';
const B = 'baseline\\.json';
const STALE_PATTERNS = [
  new RegExp(`ops/${R}/[^\\s'"\`)]*${B}`),
  // The segment list must be inside ONE call: no `)` may intervene. Without
  // that, a script that reads a report and a baseline from adjacent statements
  // reads as an offender, which is how this net first failed.
  new RegExp(`['"\`]${R}['"\`]\\s*,[^)]{0,160}?${B}`),
];

async function walk(dir, onFile) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.isDirectory()) {
      await walk(path.join(dir, entry.name), onFile);
    } else if (entry.isFile()) {
      await onFile(path.join(dir, entry.name));
    }
  }
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

/** MISFILED: a ceiling sitting in the directory the build reverts. */
async function findMisfiledBaselines() {
  const found = [];
  const reports = path.join(ROOT, REPORTS_DIR);
  try {
    if (!(await stat(reports)).isDirectory()) return found;
  } catch {
    return found;
  }

  await walk(reports, async (file) => {
    if (path.extname(file) !== '.json') return;

    const name = path.basename(file);
    if (/baseline/i.test(name)) {
      found.push({ file, why: 'its name says it is a baseline' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

    const keys = RATCHET_KEYS.filter((k) =>
      Object.prototype.hasOwnProperty.call(parsed, k)
    );
    if (keys.length > 0) {
      found.push({
        file,
        why: `it carries ${keys.map((k) => `\`${k}\``).join(' and ')}, which is the shape of a ratchet`,
      });
    }
  });

  return found;
}

/** STALE: something still points a baseline at the reports directory. */
async function findStalePointers() {
  const found = [];

  await walk(ROOT, async (file) => {
    if (!TEXT_EXTENSIONS.has(path.extname(file))) return;
    if (POINTER_EXEMPT.has(path.relative(ROOT, file))) return;

    let text;
    try {
      // A generated blob megabytes wide is not where anyone writes a path by
      // hand, and reading it costs more than the net is worth.
      if ((await stat(file)).size > 2_000_000) return;
      text = await readFile(file, 'utf8');
    } catch {
      return;
    }
    if (!text.includes('baseline.json')) return;

    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (STALE_PATTERNS.some((p) => p.test(line))) {
        found.push({ file, line: i + 1, text: line.trim() });
      }
    });

    // A `path.join` segment list can straddle several lines. Re-test the whole
    // file for that spelling, and report it once if no single line caught it.
    if (
      !found.some((f) => f.file === file) &&
      STALE_PATTERNS[1].test(text)
    ) {
      found.push({ file, line: null, text: 'path segments spanning several lines' });
    }
  });

  return found;
}

const misfiled = await findMisfiledBaselines();
const stale = await findStalePointers();

if (!QUIET) {
  console.log('\nBaseline placement');
  console.log(`  ceilings belong in   ${BASELINE_DIR.split(path.sep).join('/')}/`);
  console.log(`  never in             ${REPORTS_DIR.split(path.sep).join('/')}/`);
}

if (misfiled.length === 0 && stale.length === 0) {
  if (!QUIET) console.log('  OK: no ratchet baseline is filed where the build reverts.\n');
  process.exit(0);
}

console.error('');
if (misfiled.length > 0) {
  console.error(`  FAIL: ${misfiled.length} ratchet baseline(s) filed under ops/reports/:`);
  for (const m of misfiled) console.error(`    ${rel(m.file)} — ${m.why}`);
  console.error('');
  console.error('  ops/reports/ is build output and is reverted wholesale before');
  console.error('  committing, so a deliberate ratchet-down filed there is discarded');
  console.error('  silently and the gate is left looser than its author intended.');
  console.error(`  Move the file to ops/baselines/ and update the gate that reads it.`);
  console.error('  See ops/baselines/README.md.');
}
if (stale.length > 0) {
  if (misfiled.length > 0) console.error('');
  console.error(`  FAIL: ${stale.length} reference(s) still point a baseline into ops/reports/:`);
  for (const s of stale) {
    console.error(`    ${rel(s.file)}${s.line ? `:${s.line}` : ''} — ${s.text}`);
  }
  console.error('');
  console.error('  A ceiling read from ops/reports/ is a ceiling the build can erase.');
  console.error('  Point it at ops/baselines/ instead. See ops/baselines/README.md.');
}
console.error('');
process.exit(1);
