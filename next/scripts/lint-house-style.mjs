// lint-house-style.mjs
//
// Build-blocking guard for the BRAND-PI hard rules that the PR-time
// editorial checks cannot enforce when content lands on main directly
// (the agentic content engine pushes without a PR). Catches:
//   - em-dashes (—) in reader-facing content (md/mdx/json under src/content
//     and src/data)
// Replace with ' - ', a colon, a period, or parentheses.
//
// Usage: node scripts/lint-house-style.mjs   (wired into build:search)

import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src/content', 'src/data'];
const EXTS = new Set(['.md', '.mdx', '.json']);
const SKIP = /_archive|__pycache__/;

const violations = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (SKIP.test(full)) continue;
    if (e.isDirectory()) { walk(full); continue; }
    if (!EXTS.has(path.extname(e.name))) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes('—')) {
        violations.push(`${full}:${i + 1}  ${line.trim().slice(0, 100)}`);
      }
    });
  }
}
ROOTS.forEach((r) => fs.existsSync(r) && walk(r));

if (violations.length === 0) {
  console.log('✓ House style clean: no em-dashes in content.');
  process.exit(0);
}
console.error(`✗ Em-dash violations (BRAND-PI hard rule): ${violations.length}\n`);
violations.slice(0, 40).forEach((v) => console.error('  ' + v));
console.error("\nReplace with ' - ', a colon, a period, or parentheses.");
process.exit(1);
