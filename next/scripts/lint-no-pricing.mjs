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
//   - Prose dollar figures in content (.md) and data (.json) files. The
//     BOS §5.3 hard rule covers ALL reader-facing surfaces, and the 2026-07
//     audit found 680+ dollar figures that reached production through this
//     gap. Exemptions are listed in PROSE_ALLOW (B2B rate cards).
//
// What this does NOT catch (intentional):
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
  // Sanity adapters — data-layer passthrough from Sanity → Astro shape.
  // Same justification as content.config.ts: the FIELDS are preserved so
  // historical data survives, but the templates that consume the
  // adapters don't render them. If a price field ever appears in an
  // .astro template, the rule still fires on that file.
  'lib/sanity/event-adapter.ts',
  'lib/sanity/phase5-adapters.ts',
  'lib/sanity/queries.ts', // GROQ query definitions — data-layer field selection only, not rendered
]);

// Reader-facing prose surfaces that may carry dollar figures. These sell
// advertising and partnership inventory (B2B rate cards), not venues; the
// trust rationale for the no-pricing rule does not apply to our own rates.
const PROSE_ALLOW = [
  'pages/partners/advertising-kit/',
  'pages/partners/founders-prospectus/',
  'pages/_archive/',
  'pages-drafts/',
];

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

// Prose pattern: any literal dollar figure in reader-facing content.
const PROSE_PRICE = /\$\s?\d/;

walk(ROOT, (file) => {
  const ext = path.extname(file);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (file.endsWith('lint-no-pricing.mjs')) return;
  if (PROSE_ALLOW.some((p) => rel.startsWith(p))) return;

  // Prose scan: content and data files plus page templates.
  if (['.md', '.mdx', '.json', '.astro'].includes(ext)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|<!--)/.test(line)) return;
      if (PROSE_PRICE.test(line)) {
        violations.push({ file: rel, line: i + 1, pattern: 'Dollar figure in reader-facing copy', text: line.trim().slice(0, 120) });
      }
    });
  }

  // Renderer scan (original behaviour).
  if (!['.astro', '.ts', '.tsx', '.js', '.mjs'].includes(ext)) return;
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
