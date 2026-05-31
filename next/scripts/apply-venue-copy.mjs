#!/usr/bin/env node
/**
 * apply-venue-copy.mjs
 *
 * Applies the Perplexity-authored copy package to all production venue JSONs.
 *
 * Rules:
 *  - Reads CMS Fields JSON block from each .md in the copy package
 *  - Converts " — " → ", " (PI house rule: no em-dashes)
 *  - Fixes 7 known bestFor governance violations
 *  - Merges ONLY these 6 fields into production JSONs (all other fields untouched):
 *    knownFor, signature, whyWeGo, editorNote, bestFor, ifOnlyOneThing
 *  - Special slug mapping: crittenden-restaurant.md → stillwater-crittenden.json
 *  - Skips any copy slug with no matching production JSON (and vice versa)
 *
 * Run: node scripts/apply-venue-copy.mjs [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DRY_RUN = process.argv.includes('--dry-run');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENUES_DIR = path.join(__dirname, '..', 'src', 'content', 'venues');
const COPY_DIR = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Local'),
  'Temp', 'venue-copy', 'venue-copy'
);

const TIERS = ['tier-1-destination', 'tier-2-recommended', 'tier-3-directory'];
const FIELDS = ['knownFor', 'signature', 'whyWeGo', 'editorNote', 'bestFor', 'ifOnlyOneThing'];

// Slug override: copy slug → production slug
const SLUG_MAP = {
  'crittenden-restaurant': 'stillwater-crittenden',
};

// bestFor governance fixes: non-governed → governed
const BESTFOR_FIX = {
  'Long lunch':       'Long lunches',
  'Garden afternoons':'Scenic views',
  'Romantic escapes': 'Couples',
  'Kids activities':  'Family outings',
  'Weekend day trips':'Weekend escapes',
};

// Strip em-dashes from any string value (recursively handles arrays)
function stripEmDash(val) {
  if (typeof val === 'string') return val.replace(/ — /g, ', ');
  if (Array.isArray(val)) return val.map(stripEmDash);
  return val;
}

// Fix bestFor governance violations
function fixBestFor(tags) {
  if (!Array.isArray(tags)) return tags;
  return tags.map(t => BESTFOR_FIX[t] ?? t);
}

// Extract the CMS Fields JSON block from a .md file
function extractCmsFields(mdPath) {
  const text = fs.readFileSync(mdPath, 'utf8');
  const m = text.match(/## CMS Fields[\s\S]*?```json([\s\S]*?)```/);
  if (!m) throw new Error(`No CMS Fields block in ${path.basename(mdPath)}`);
  return JSON.parse(m[1].trim());
}

// ── Main ──────────────────────────────────────────────────────────────────────

const report = { updated: [], skipped: [], errors: [] };

for (const tier of TIERS) {
  const tierDir = path.join(COPY_DIR, tier);
  const files = fs.readdirSync(tierDir).filter(f => f.endsWith('.md') && f !== '_SUMMARY.md');

  for (const file of files) {
    const copySlug = file.replace('.md', '');
    const prodSlug = SLUG_MAP[copySlug] ?? copySlug;
    const prodPath = path.join(VENUES_DIR, `${prodSlug}.json`);

    if (!fs.existsSync(prodPath)) {
      report.skipped.push({ copySlug, reason: 'no matching production JSON' });
      continue;
    }

    let cmsFields;
    try {
      cmsFields = extractCmsFields(path.join(tierDir, file));
    } catch (e) {
      report.errors.push({ copySlug, error: e.message });
      continue;
    }

    // Apply transformations to the 6 fields
    const updates = {};
    for (const field of FIELDS) {
      if (cmsFields[field] === undefined) continue;
      let val = cmsFields[field];
      val = stripEmDash(val);
      if (field === 'bestFor') val = fixBestFor(val);
      updates[field] = val;
    }

    // Load production JSON, merge, write back
    const prod = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
    const changed = [];
    for (const [field, newVal] of Object.entries(updates)) {
      const oldVal = JSON.stringify(prod[field]);
      const nVal = JSON.stringify(newVal);
      if (oldVal !== nVal) changed.push(field);
      prod[field] = newVal;
    }

    if (!DRY_RUN) {
      fs.writeFileSync(prodPath, JSON.stringify(prod, null, 2) + '\n', 'utf8');
    }

    report.updated.push({
      slug: prodSlug,
      copySlug: copySlug !== prodSlug ? copySlug : undefined,
      changed,
      tier: tier.replace('tier-', ''),
    });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`VENUE COPY MIGRATION${DRY_RUN ? ' (DRY RUN — no files written)' : ''}`);
console.log('─'.repeat(60));
console.log(`\nUpdated: ${report.updated.length}`);
console.log(`Skipped: ${report.skipped.length}`);
console.log(`Errors:  ${report.errors.length}`);

if (report.errors.length) {
  console.log('\n── ERRORS ──');
  for (const e of report.errors) console.log(`  ${e.copySlug}: ${e.error}`);
}

if (report.skipped.length) {
  console.log('\n── SKIPPED ──');
  for (const s of report.skipped) console.log(`  ${s.copySlug}: ${s.reason}`);
}

// Show which fields changed per venue (condensed)
const fieldChange = {};
for (const u of report.updated) {
  for (const f of u.changed) fieldChange[f] = (fieldChange[f] || 0) + 1;
}
console.log('\n── FIELDS CHANGED (across all venues) ──');
for (const [f, n] of Object.entries(fieldChange)) console.log(`  ${f}: ${n} venues`);

// Spot-check: show first 5 and last 5 updated
console.log('\n── SAMPLE UPDATED ──');
const sample = [...report.updated.slice(0, 5), ...report.updated.slice(-5)];
for (const u of sample) {
  const slug = u.copySlug ? `${u.slug} (from ${u.copySlug})` : u.slug;
  console.log(`  ${slug} [${u.tier}] — ${u.changed.join(', ') || 'no changes'}`);
}

// Em-dash verification: scan written files for any remaining em-dashes
if (!DRY_RUN) {
  let emDashRemaining = 0;
  for (const u of report.updated) {
    const txt = fs.readFileSync(path.join(VENUES_DIR, `${u.slug}.json`), 'utf8');
    if (txt.includes('—')) emDashRemaining++;
  }
  console.log(`\n── EM-DASH CHECK (post-write) ──`);
  console.log(`  Files still containing em-dash: ${emDashRemaining} (expect 0)`);
}

console.log('\n' + '─'.repeat(60) + '\n');
