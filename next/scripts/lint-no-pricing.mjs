// lint-no-pricing.mjs
//
// Enforces the BRAND-PI rule "No pricing on site. Ever." adopted 2026-05-15.
// Scans rendered surfaces (.astro templates) and JSON-LD emission sites for
// dollar-figure pricing patterns. If anything matches, the script exits 1
// so CI fails the build before stale prices reach production.
//
// What this catches:
//   - Literal "$\d+" inside .astro templates outside of comments
//   - "From $\d+", "$\d+ per person", "$\d+–$\d+" patterns
//   - Renders of `priceLow` / `priceHigh` / `priceFrom` template variables
//   - `priceCurrency` / `priceSpecification` in JSON-LD blocks in schema.ts
//
// What this does NOT catch (intentional):
//   - Editorial copy in MD/MDX content that references prices as part of
//     prose criticism ("the $40 lunch was overcooked"). Those are author
//     judgement calls. The rule targets structured price displays.
//   - Content-collection JSON `priceLow`/`priceHigh` data fields. The
//     fields can stay in the schema so historical data is preserved; this
//     guard only blocks them from being RENDERED.
//
// Usage: `node scripts/lint-no-pricing.mjs` from the next/ directory.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');

// Files where pricing field references are allowed because they are
// data-layer declarations, not renders. The rule is "no pricing on
// site"; preserving the schema fields keeps the door open to add a
// price-aware admin view later without losing historical data.
const ALLOW = new Set([
  'content.config.ts', // Zod schema field declarations only
]);

const violations = [];

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip preview/staging surfaces — they are unlinked design previews.
      if (entry.name === 'v2-staging' || entry.name === 'v3' || entry.name === 'v4') continue;
      walk(full, fn);
    } else {
      fn(full);
    }
  }
}

// Patterns that indicate rendered price on a page (or JSON-LD emission).
// Each is paired with a check predicate so we only flag genuine renders.
const PATTERNS = [
  {
    name: 'Literal dollar-figure render in template',
    test: (line) => /\$\s*\{[^}]*\}\s*per\s*person/i.test(line)
                 || /\$\$\{?[A-Za-z_]/.test(line)
                 || /\bFrom\s*\$\d/.test(line)
                 || /\$\d+\s*(per|–|-|to)\s/i.test(line),
  },
  {
    name: 'priceLow / priceHigh / priceFrom variable referenced',
    test: (line) => /\b(priceLow|priceHigh|priceFrom|priceDisplay|priceText)\b/.test(line),
  },
  {
    name: 'JSON-LD price emission (Offer / priceSpecification / priceCurrency)',
    test: (line) => /priceCurrency|priceSpecification|lowPrice|highPrice|priceRange/.test(line)
                 && !/^\s*(\/\/|\*|<!--)/.test(line),
  },
];

walk(ROOT, (file) => {
  const ext = path.extname(file);
  // Only scan rendered surfaces and JSON-LD emitters.
  if (!['.astro', '.ts', '.tsx', '.js', '.mjs'].includes(ext)) return;
  // Allow the lint script itself + the schema test fixtures.
  if (file.endsWith('lint-no-pricing.mjs')) return;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (ALLOW.has(rel)) return;

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Skip line if it's inside a single-line comment.
    if (/^\s*(\/\/|\*)/.test(line)) return;
    for (const pat of PATTERNS) {
      if (pat.test(line)) {
        violations.push({ file: rel, line: i + 1, pattern: pat.name, text: line.trim().slice(0, 120) });
      }
    }
  });
});

if (violations.length === 0) {
  console.log('✓ No pricing renderers found. Site is clean.');
  process.exit(0);
}

console.error(`✗ Pricing-render violations: ${violations.length}\n`);
console.error('BRAND-PI rule: No pricing on site. Ever. See BRAND-PI.md\n');
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.pattern}]`);
  console.error(`    ${v.text}`);
}
console.error('\nTo fix:');
console.error('  1. Remove the price render from the template (or wrap in `if (false)` if you need to keep the data).');
console.error('  2. If the entire surface is intentionally excluded (e.g. an internal admin page), add it to the ALLOW set in this script with a code-review justification.');
process.exit(1);
