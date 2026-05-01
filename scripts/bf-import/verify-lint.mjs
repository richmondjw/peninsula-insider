#!/usr/bin/env node
/**
 * verify-lint — fail the build if any published species page carries
 * a [VERIFY] flag in a regulatory field. Pack rule (T012,
 * bf_implementation_tickets.csv): the [VERIFY] linter rule fails the
 * build if any species page ships with unresolved [VERIFY] flags in
 * the bag-limits section.
 *
 * Scope:
 *   - HARD FAIL: species frontmatter regulatory fields (bagLimit,
 *     sizeLimit, closedSeason, peakSeason, vfaCitationUrl) carrying
 *     [VERIFY] when status: published. Pack rule.
 *   - WARN: [VERIFY] in user-facing prose on any published entity.
 *     Editorial-confidence signal that should usually be replaced
 *     with "confirm with operator" framing before publish.
 *
 * Usage:
 *   node scripts/bf-import/verify-lint.mjs            # warn + fail
 *   node scripts/bf-import/verify-lint.mjs --strict   # warn = fail
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { argv } from 'node:process';

const STRICT = argv.includes('--strict');
const REPO_ROOT = join(import.meta.dirname, '..', '..');
const COLLECTIONS = [
  'species',
  'fishing-locations',
  'fishing-charters',
  'boat-ramps',
  'boat-hire',
];

// Regulatory fields on species pages that MUST be VFA-verified before
// publish. Pack rule T012 is scoped to these.
const SPECIES_REGULATORY_FIELDS = [
  'bagLimit',
  'sizeLimit',
  'closedSeason',
  'peakSeason',
  'vfaCitationUrl',
];

let publishedFiles = 0;
const hardFails = [];
const warnings = [];

function splitFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return { fm: '', body: raw };
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return { fm: '', body: raw };
  return { fm: raw.slice(4, end), body: raw.slice(end + 5) };
}

for (const collection of COLLECTIONS) {
  const dir = join(REPO_ROOT, 'next', 'src', 'content', collection);
  if (!existsSync(dir)) continue;

  const files = readdirSync(dir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  for (const file of files) {
    const path = join(dir, file);
    const raw = readFileSync(path, 'utf-8');
    const statusMatch = raw.match(/^status:\s*(\w+)/m);
    const status = statusMatch ? statusMatch[1] : 'draft';
    if (status !== 'published') continue;
    publishedFiles++;

    const { fm, body } = splitFrontmatter(raw);
    const lines = raw.split('\n');

    // Hard fail: species regulatory fields with [VERIFY].
    if (collection === 'species') {
      for (const field of SPECIES_REGULATORY_FIELDS) {
        const re = new RegExp(`^${field}:.*\\[VERIFY\\]`, 'm');
        if (re.test(fm)) {
          const lineNo = lines.findIndex((l) => new RegExp(`^${field}:`).test(l)) + 1;
          hardFails.push({ collection, file, field, line: lineNo });
        }
      }
    }

    // Warn: any other [VERIFY] in published files.
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('[VERIFY]')) continue;
      // Skip if already counted as a hard fail.
      const isHardFail = collection === 'species' &&
        SPECIES_REGULATORY_FIELDS.some((f) => new RegExp(`^${f}:`).test(lines[i]));
      if (isHardFail) continue;
      warnings.push({ collection, file, line: i + 1, text: lines[i].trim().slice(0, 120) });
    }
  }
}

console.log(`bf-verify-lint: scanned ${publishedFiles} published entries.`);

if (warnings.length) {
  console.log(`\nWARN — ${warnings.length} [VERIFY] flags in published prose (editor pass recommended):`);
  for (const w of warnings) {
    console.log(`  ${w.collection}/${w.file} L${w.line}: ${w.text}`);
  }
}

if (hardFails.length) {
  console.error(`\nFAIL — ${hardFails.length} species page(s) ship with unresolved [VERIFY] flags in regulatory fields:`);
  for (const h of hardFails) {
    console.error(`  ${h.collection}/${h.file} L${h.line}: ${h.field}`);
  }
  console.error(`\nPack rule T012: VFA-grade species data must be verbatim. Fix the [VERIFY] flag with verified data, or revert status: published to status: draft.`);
  process.exit(1);
}

if (STRICT && warnings.length) {
  console.error(`\nFAIL — strict mode: ${warnings.length} prose [VERIFY] flag(s) treated as failures.`);
  process.exit(1);
}

console.log(`\nbf-verify-lint: regulatory check passed.`);
process.exit(0);
