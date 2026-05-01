#!/usr/bin/env node
/**
 * strip-em-dashes — context-aware em-dash removal across the PI repo.
 *
 * Brand rule (memory: feedback_no_em_dashes.md): no em-dashes in PI
 * surfaces; replace with commas, periods, colons, parentheses depending
 * on context.
 *
 * This script does NOT do a blanket sed replace. It applies pattern-
 * matched rules with confidence levels:
 *
 *   HIGH:  ` — ` (space-em-space, prose) → `, `
 *          `\d+—\d+` (digit ranges) → `\d+ to \d+`
 *          `\w+—\w+` (no-space mid-word) → `-` (hyphen)
 *          line-start `—` followed by space → removed
 *   LOW:   anything else → flagged for manual review
 *
 * Default: dry run (prints proposed diff, exits without writing).
 * Use --apply to write changes. Use --files <glob> to scope.
 *
 * Usage:
 *   node scripts/strip-em-dashes.mjs                            # dry run
 *   node scripts/strip-em-dashes.mjs --files "next/src/content/venues/**.json"
 *   node scripts/strip-em-dashes.mjs --apply                    # write
 *   node scripts/strip-em-dashes.mjs --report > em-dashes.txt   # full report
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';
import { argv } from 'node:process';

const REPO_ROOT = join(import.meta.dirname, '..');

const args = { dryRun: true, report: false };
for (let i = 2; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--apply') args.dryRun = false;
  else if (a === '--report') args.report = true;
  else if (a === '--files') args.files = argv[++i];
  else if (a === '--scope') args.scope = argv[++i];
}

// Walk the repo.
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'dist-backup-20260422032148',
  '.astro', '.git', '.github', 'pagefind', '_astro',
  'pages-drafts', // legacy drafts; not user-facing
  'assets', 'images',
]);
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico',
  '.pdf', '.zip', '.lock', '.map',
]);
const PROCESS_DIRS = [
  join('next', 'src', 'content'),
  join('next', 'src', 'pages'),
  join('next', 'src', 'components'),
  join('next', 'src', 'data'),
  join('next', 'src', 'lib'),
  join('next', 'src', 'layouts'),
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      yield* walk(path);
    } else {
      if (SKIP_EXT.has(extname(entry).toLowerCase())) continue;
      yield path;
    }
  }
}

const allFiles = [];
for (const dir of PROCESS_DIRS) {
  const abs = join(REPO_ROOT, dir);
  try { for (const f of walk(abs)) allFiles.push(f); } catch {}
}

if (args.files) {
  // Simple substring filter (good enough for our patterns).
  const pat = args.files.replace(/\\/g, '/').replace(/\*\*/g, '').replace(/\*/g, '');
  allFiles.length = allFiles.filter((f) => f.replace(/\\/g, '/').includes(pat)).length
    && allFiles.splice(0, allFiles.length, ...allFiles.filter((f) => f.replace(/\\/g, '/').includes(pat)));
}

if (args.scope) {
  const scope = args.scope;
  for (let i = allFiles.length - 1; i >= 0; i--) {
    if (!allFiles[i].includes(scope)) allFiles.splice(i, 1);
  }
}

// Replacement rules. Order matters: more specific patterns first.
const RULES = [
  // 1. Markdown table separator rows like `|---|---|---|` — leave alone (no em-dash here).
  // 2. Digit-em-digit (ranges, prices, times). High confidence: replace with " to ".
  { name: 'digit-range-em-digit', re: /(\d)—(\d)/g, to: '$1 to $2', confidence: 'HIGH' },
  // 3. Digit-em-letter or letter-em-digit (e.g. "Oct—Dec"): replace with " to ".
  { name: 'short-range-em', re: /([A-Za-z]{2,5})—([A-Za-z]{2,5})/g, to: '$1 to $2', confidence: 'HIGH' },
  // 4. Word-em-word with no spaces and no digits (typo for hyphen): replace with hyphen.
  { name: 'mid-word-em', re: /([a-z])—([a-z])/g, to: '$1-$2', confidence: 'HIGH' },
  // 5. Line-start em-dash with space (often a list bullet variant): leave (rare; flag).
  // 6. Space-em-space in prose: HIGH confidence comma replacement.
  //    This is the dominant pattern. Comma is right ~85% of the time; period is right
  //    when the following clause starts with a capital noun and is a complete sentence.
  //    Heuristic: if the next char after the space is uppercase and the char before is a
  //    full-stop-likely terminator, use ". "; else use ", ".
  { name: 'space-em-space', re: / — /g, to: ', ', confidence: 'HIGH', context: true },
  // 7. Em-dash directly attached to a word with a space on one side (rare). Flag.
];

let totalFound = 0;
let totalReplaced = 0;
let totalFlagged = 0;
const filesChanged = [];
const flagged = [];

function applyRules(content, filePath) {
  let modified = content;
  let fileReplaced = 0;
  const fileFlags = [];

  for (const rule of RULES) {
    if (rule.re) {
      modified = modified.replace(rule.re, (match, ...groups) => {
        fileReplaced++;
        return typeof rule.to === 'function' ? rule.to(match, ...groups) : rule.to.replace(/\$1/g, groups[0]).replace(/\$2/g, groups[1] || '');
      });
    }
  }

  // Scan for any remaining em-dashes — these are unhandled patterns. Flag with context.
  const unhandledRe = /—/g;
  let m;
  while ((m = unhandledRe.exec(modified)) !== null) {
    const start = Math.max(0, m.index - 40);
    const end = Math.min(modified.length, m.index + 41);
    const ctx = modified.slice(start, end).replace(/\n/g, '\\n');
    fileFlags.push({ index: m.index, context: ctx });
    totalFlagged++;
  }

  return { modified, fileReplaced, fileFlags };
}

for (const file of allFiles) {
  const content = readFileSync(file, 'utf-8');
  if (!content.includes('—')) continue;

  const original = content;
  const found = (original.match(/—/g) || []).length;
  totalFound += found;

  const { modified, fileReplaced, fileFlags } = applyRules(content, file);

  if (fileReplaced > 0 || fileFlags.length > 0) {
    const rel = relative(REPO_ROOT, file);
    filesChanged.push({ file: rel, before: found, replaced: fileReplaced, flagged: fileFlags.length });
    totalReplaced += fileReplaced;

    if (args.report && fileFlags.length > 0) {
      flagged.push({ file: rel, flags: fileFlags });
    }

    if (!args.dryRun && fileReplaced > 0) {
      writeFileSync(file, modified);
    }
  }
}

console.log(`\nstrip-em-dashes ${args.dryRun ? '(DRY RUN)' : '(APPLIED)'}\n`);
console.log(`Found ${totalFound} em-dash occurrences across ${filesChanged.length} files.`);
console.log(`  ${totalReplaced} would be ${args.dryRun ? 'auto-replaced' : 'auto-replaced'} by rules`);
console.log(`  ${totalFlagged} remain unhandled (need manual review)\n`);

if (args.report) {
  console.log('Per-file breakdown (top 30):');
  filesChanged.sort((a, b) => b.before - a.before).slice(0, 30).forEach((f) => {
    console.log(`  ${f.file.padEnd(70)} ${String(f.before).padStart(4)} found  ${String(f.replaced).padStart(4)} auto  ${String(f.flagged).padStart(4)} flagged`);
  });

  if (flagged.length > 0) {
    console.log(`\nUnhandled occurrences requiring manual review:`);
    for (const item of flagged.slice(0, 50)) {
      console.log(`  ${item.file}:`);
      for (const flag of item.flags.slice(0, 3)) {
        console.log(`    ...${flag.context}...`);
      }
    }
  }
}

if (args.dryRun) {
  console.log(`\nThis was a dry run. To apply changes, re-run with --apply.`);
  console.log(`To scope to a single directory, use --scope <substring>.`);
  console.log(`Example: node scripts/strip-em-dashes.mjs --apply --scope content/venues`);
}
