// lint-schema.mjs
//
// Validates every JSON-LD block in the built site. Schema markup is the
// primary machine-readable surface for AI search engines; a single
// malformed block silently drops a page out of rich results, so this
// guard keeps the markup from rotting. Companion to lint-no-pricing.mjs.
//
// Checks per <script type="application/ld+json"> block in dist/**/*.html:
//   1. Parses as JSON (the hard failure mode).
//   2. Has @context.
//   3. Has @type or @graph (and @graph nodes each have @type).
//
// Usage: node scripts/lint-schema.mjs   (run from next/, after astro build)
// Exits 1 on any violation. Run after `npm run build`; not wired into the
// build chain itself so a markup audit can't block an urgent deploy —
// CI should run it as a separate step.

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');

if (!fs.existsSync(DIST)) {
  console.error('✗ dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const violations = [];
let blocks = 0;
let pages = 0;

const SCRIPT_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, fn);
    else if (entry.name.endsWith('.html')) fn(full);
  }
}

function checkNode(node, file, where) {
  if (node == null || typeof node !== 'object') {
    violations.push({ file, problem: `${where}: node is not an object` });
    return;
  }
  if (!node['@type']) {
    violations.push({ file, problem: `${where}: missing @type` });
  }
}

walk(DIST, (file) => {
  pages += 1;
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(DIST, file);
  for (const match of html.matchAll(SCRIPT_RE)) {
    blocks += 1;
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch (err) {
      violations.push({ file: rel, problem: `JSON parse error: ${err.message.slice(0, 100)}` });
      continue;
    }
    if (!parsed['@context']) {
      violations.push({ file: rel, problem: 'missing @context' });
    }
    if (parsed['@graph']) {
      if (!Array.isArray(parsed['@graph']) || parsed['@graph'].length === 0) {
        violations.push({ file: rel, problem: '@graph is empty or not an array' });
      } else {
        parsed['@graph'].forEach((node, i) => checkNode(node, rel, `@graph[${i}]`));
      }
    } else {
      checkNode(parsed, rel, 'root');
    }
  }
});

if (violations.length === 0) {
  console.log(`✓ ${blocks} JSON-LD blocks across ${pages} pages all parse and carry @context/@type.`);
  process.exit(0);
}

console.error(`✗ JSON-LD violations: ${violations.length} (of ${blocks} blocks across ${pages} pages)\n`);
const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push(v.problem);
}
for (const [file, problems] of [...byFile.entries()].slice(0, 50)) {
  console.error(`  ${file}`);
  for (const p of problems) console.error(`    - ${p}`);
}
if (byFile.size > 50) console.error(`  ... and ${byFile.size - 50} more files`);
process.exit(1);
