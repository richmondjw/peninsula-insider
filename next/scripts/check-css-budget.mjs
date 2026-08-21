#!/usr/bin/env node
/**
 * check-css-budget.mjs - enforce a hard ceiling on total stylesheet size.
 *
 * Why this exists (salt-and-limestone-project-plan.md P3-8):
 * the sheet reached 17,611 lines across 12 files (global.css alone was
 * 11,171). Four generations of design tokens accumulated side by side
 * because nothing ever failed when a sheet grew, so drift was invisible
 * until a full audit. This guard makes regrowth loud instead of silent.
 *
 * What it does:
 *   - sums the line count of every next/src/styles/*.css
 *   - prints a per-file table plus the total against the budget
 *   - compares each file against its recorded baseline so a failure can
 *     name the file that grew and by how much
 *   - exits 1 when the total exceeds TOTAL_BUDGET
 *
 * Raising the budget is a deliberate act. If you need more room, delete
 * something first: the point of the ceiling is that new CSS displaces old
 * CSS rather than stacking on top of it. If a raise really is justified,
 * bump TOTAL_BUDGET and refresh BASELINE in the same commit, and say why
 * in the commit message.
 *
 * Usage:
 *   node scripts/check-css-budget.mjs             (from next/)
 *   node next/scripts/check-css-budget.mjs        (from repo root)
 *   node scripts/check-css-budget.mjs --baseline  print a BASELINE block
 *                                                 to paste in after an
 *                                                 intentional refactor
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Total line ceiling across next/src/styles/*.css.
//
// Measured 15,311 lines immediately after the P3-2/P3-4/P3-5 cleanup
// (down from 17,611: v3.css deleted, v4.css reduced to a tombstone,
// global.css 11,171 -> 10,765, primitives.css extracted). 16,100 gives
// roughly 5 percent headroom, so ordinary maintenance does not trip the
// guard but a new token generation or a duplicated component sheet does.
//
// P3-8 in the project plan names 10,000 as the eventual target. That is
// an aspiration, not today's number, and a guard that fails on the day it
// lands gets deleted rather than obeyed. Ratchet this down as global.css
// is further decomposed: every meaningful reduction should be followed by
// lowering TOTAL_BUDGET to the new measured figure plus 5 percent, so the
// ceiling tracks reality instead of drifting above it.
const TOTAL_BUDGET = 16100;

// Measured line counts at the time the budget was set. Used only to make
// the failure message actionable ("global.css grew by N lines"). Files
// absent here are reported as newly added.
const BASELINE = {
  'account.css': 304,
  'concierge.css': 1025,
  'edition.css': 506,
  'global.css': 10765,
  'inline-edit.css': 875,
  'magenta-stone.css': 170,
  'primitives.css': 649,
  'search.css': 697,
  'tailwind.css': 14,
  'v4.css': 1,
  'v5-tokens.css': 112,
  'v6-tokens.css': 193,
};

const HERE = dirname(fileURLToPath(import.meta.url));
const STYLES_DIR = join(HERE, '..', 'src', 'styles');

if (!existsSync(STYLES_DIR)) {
  console.error(`css budget: styles directory not found at ${STYLES_DIR}`);
  process.exit(1);
}

// Line count = number of newline-terminated lines, matching `wc -l`, so a
// figure quoted here can be reproduced from the shell without argument.
function countLines(file) {
  const text = readFileSync(join(STYLES_DIR, file), 'utf8');
  let n = 0;
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') n += 1;
  return n;
}

const files = readdirSync(STYLES_DIR)
  .filter((f) => f.endsWith('.css'))
  .sort();

const rows = files.map((name) => {
  const lines = countLines(name);
  const base = Object.prototype.hasOwnProperty.call(BASELINE, name) ? BASELINE[name] : null;
  return { name, lines, base, delta: base === null ? null : lines - base };
});

const total = rows.reduce((sum, r) => sum + r.lines, 0);

if (process.argv.includes('--baseline')) {
  console.log('const BASELINE = {');
  for (const r of rows) console.log(`  '${r.name}': ${r.lines},`);
  console.log('};');
  console.log(`// total ${total}`);
  process.exit(0);
}

// -- Report ------------------------------------------------------------
const nameWidth = Math.max(
  12,
  ...rows.map((r) => r.name.length),
  ...Object.keys(BASELINE).map((n) => n.length)
);
const pad = (s, w) => String(s).padEnd(w);
const padStart = (s, w) => String(s).padStart(w);

console.log('css budget:');
console.log(`  ${pad('file', nameWidth)}  ${padStart('lines', 7)}  ${padStart('vs base', 9)}`);
console.log(`  ${'-'.repeat(nameWidth)}  ${'-'.repeat(7)}  ${'-'.repeat(9)}`);
for (const r of rows) {
  let note;
  if (r.base === null) note = 'new';
  else if (r.delta === 0) note = '0';
  else note = (r.delta > 0 ? '+' : '') + r.delta;
  console.log(`  ${pad(r.name, nameWidth)}  ${padStart(r.lines, 7)}  ${padStart(note, 9)}`);
}
// Files in BASELINE that no longer exist are a shrink, not a fault.
const removed = Object.keys(BASELINE).filter((n) => !files.includes(n));
for (const n of removed) {
  console.log(`  ${pad(n, nameWidth)}  ${padStart('deleted', 7)}  ${padStart(-BASELINE[n], 9)}`);
}
console.log(`  ${'-'.repeat(nameWidth)}  ${'-'.repeat(7)}  ${'-'.repeat(9)}`);
console.log(`  ${pad('TOTAL', nameWidth)}  ${padStart(total, 7)}  / ${TOTAL_BUDGET}`);

if (total <= TOTAL_BUDGET) {
  console.log(`\nOK: stylesheets within budget (${TOTAL_BUDGET - total} lines of headroom).`);
  process.exit(0);
}

// -- Failure -----------------------------------------------------------
const over = total - TOTAL_BUDGET;
const grew = rows.filter((r) => r.delta !== null && r.delta > 0).sort((a, b) => b.delta - a.delta);
const added = rows.filter((r) => r.base === null);

console.error(`\nFAIL: stylesheets total ${total} lines, ${over} over the budget of ${TOTAL_BUDGET}.`);
if (grew.length) {
  console.error('\nFiles that grew since the budget was set:');
  for (const r of grew) {
    console.error(`  - ${r.name}: ${r.base} -> ${r.lines} lines (+${r.delta})`);
  }
}
if (added.length) {
  console.error('\nStylesheets added since the budget was set:');
  for (const r of added) console.error(`  - ${r.name}: ${r.lines} lines`);
}
if (!grew.length && !added.length) {
  console.error('\nNo single file grew past its baseline; the total is simply over.');
}
console.error(
  '\nFix by deleting or consolidating CSS, not by raising the ceiling. ' +
    'Look for duplicated token generations, dead component rules, and ' +
    'selectors that now live in a v6 token file. If the growth is genuinely ' +
    'warranted, bump TOTAL_BUDGET and refresh BASELINE (node scripts/check-css-budget.mjs --baseline) ' +
    'in the same commit and justify it there.'
);
process.exit(1);
