#!/usr/bin/env node
/**
 * taxonomy-lint.mjs
 *
 * Validates every controlled-vocabulary field in every content collection
 * against the canonical taxonomy at src/taxonomy/facet-taxonomy.yaml.
 *
 * Phase A of the data architecture plan
 * (vault: 07-projects/peninsula-insider/data-architecture-assessment-2026-05-16.md).
 *
 * Modes
 * -----
 *   default        Warn-only. Reports unmapped values + deprecation warnings.
 *                  Exits 0 unless YAML itself is broken.
 *   --strict       Exits 1 on any unmapped value in a strict_collections
 *                  collection. Promoted on policy.promote_to_gate_on date.
 *   --changed=REF  Only lint files changed vs REF (e.g. origin/main).
 *   --json         Machine-readable JSON output.
 *
 * Usage
 * -----
 *   npm run lint:taxonomy
 *   npm run lint:taxonomy:strict
 *   node scripts/taxonomy-lint.mjs --changed=origin/main
 *   node scripts/taxonomy-lint.mjs --json
 *
 * Exit codes
 * ----------
 *   0  Clean (or warn-only mode with no fatal YAML issues)
 *   1  Fatal: YAML missing/malformed, or --strict + unmapped strict values
 *   2  Internal error
 */

import { execSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEXT_ROOT = resolve(__dirname, '..');
const CONTENT_ROOT = resolve(NEXT_ROOT, 'src/content');
const TAXONOMY_PATH = resolve(NEXT_ROOT, 'src/taxonomy/facet-taxonomy.yaml');

// ─── argv ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opts = { strict: false, changed: null, json: false };
for (const a of args) {
  if (a === '--strict') opts.strict = true;
  else if (a === '--json') opts.json = true;
  else if (a === '--changed') opts.changed = 'main';
  else if (a.startsWith('--changed=')) opts.changed = a.slice('--changed='.length);
}

// ─── load taxonomy ────────────────────────────────────────────────────────
let taxonomy;
try {
  const raw = await readFile(TAXONOMY_PATH, 'utf8');
  taxonomy = parseYaml(raw);
} catch (err) {
  console.error(`[FATAL] Cannot load taxonomy at ${relative(NEXT_ROOT, TAXONOMY_PATH)}: ${err.message}`);
  process.exit(1);
}

if (!taxonomy?.facets || !taxonomy?.mappings || !taxonomy?.policy) {
  console.error('[FATAL] facet-taxonomy.yaml is missing one of: facets, mappings, policy');
  process.exit(1);
}

// Resolve `values_from` shortcuts in mappings (one mapping reusing another's values).
for (const [colName, fields] of Object.entries(taxonomy.mappings)) {
  for (const [fieldName, spec] of Object.entries(fields)) {
    if (spec?.values_from && !spec.values) {
      const [srcCol, ...srcField] = spec.values_from.split('.');
      const srcFieldKey = srcField.join('.');
      const src = taxonomy.mappings?.[srcCol]?.[srcFieldKey];
      if (!src?.values) {
        console.error(`[FATAL] ${colName}.${fieldName} values_from "${spec.values_from}" not resolvable`);
        process.exit(1);
      }
      spec.values = src.values;
    }
  }
}

// Build a quick lookup of canonical values per facet for cross-check.
const facetValues = {};
for (const [facetName, facet] of Object.entries(taxonomy.facets)) {
  facetValues[facetName] = new Set(Object.keys(facet.values || {}));
}

const strictCols = new Set(taxonomy.policy.strict_collections || []);
const advisoryCols = new Set(taxonomy.policy.advisory_collections || []);
const deprecationHints = taxonomy.policy.deprecation_path || {};

const promoteOn = taxonomy.policy.promote_to_gate_on
  ? new Date(taxonomy.policy.promote_to_gate_on)
  : null;
const isPastPromotion = promoteOn && new Date() >= promoteOn;
const effectiveStrict = opts.strict || isPastPromotion;

// ─── changed-file scoping ─────────────────────────────────────────────────
let changedSet = null;
if (opts.changed) {
  try {
    const out = execSync(`git diff --name-only ${opts.changed}...HEAD`, {
      cwd: resolve(NEXT_ROOT, '..'),
      encoding: 'utf8',
    });
    changedSet = new Set(out.trim().split('\n').filter(Boolean));
  } catch (err) {
    console.error(`[WARN] Could not compute changed files vs ${opts.changed}; linting full corpus.`);
  }
}

// ─── walk content collections ─────────────────────────────────────────────
async function* walkContent(root) {
  for (const ent of await readdir(root, { withFileTypes: true })) {
    const p = join(root, ent.name);
    if (ent.isDirectory()) yield* walkContent(p);
    else if (['.json', '.md', '.mdx'].includes(extname(ent.name))) yield p;
  }
}

const findings = []; // { level, file, collection, field, value, hint }

function recordFinding(level, file, collection, field, value, hint = null) {
  findings.push({
    level, file: relative(resolve(NEXT_ROOT, '..'), file),
    collection, field, value, hint,
  });
}

// Map content folder name → collection key in mappings.
// Astro collection keys are not 1:1 with folder names in all cases.
const FOLDER_TO_COLLECTION = {
  'venues': 'venues',
  'experiences': 'experiences',
  'events': 'events',
  'itineraries': 'itineraries',
  'tours': 'tours',
  'tour-packages': 'tour-packages',
  'tour-operators': null,        // no taxonomy fields (yet)
  'articles': 'articles',
  'quick-notes': 'quick-notes',
  'local-secrets': 'local-secrets',
  'places': null,
  'authors': null,
  'editorial_blocks': null,
  'insiders-thirty': null,
  'weekend-picks': null,
  'signature-events': null,
  'species': null,
  'boat-hire': null,
  'boat-ramps': null,
  'fishing-charters': null,
  'fishing-locations': null,
};

// Extract field value from parsed entry, supporting dotted paths like "tags.mood"
function getField(entry, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), entry);
}

// Parse frontmatter from .md/.mdx. Cheap parser — assumes well-formed
// YAML frontmatter delimited by `---`. Falls back to null on failure.
function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return null;
  const fm = raw.slice(3, end);
  try { return parseYaml(fm); } catch { return null; }
}

async function readEntry(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const ext = extname(filePath);
  if (ext === '.json') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return parseFrontmatter(raw);
}

function checkValue(spec, value, collection, field, filePath) {
  if (value == null) return;
  const values = spec.values || {};
  const dedupKey = `${collection}.${field}.${value}`;
  const inMapping = Object.prototype.hasOwnProperty.call(values, String(value));
  if (!inMapping) {
    if (spec.advisory_mode || advisoryCols.has(collection)) {
      recordFinding('WARN', filePath, collection, field, value,
        `unmapped (advisory); add to mappings.${collection}.${field}.values`);
    } else {
      recordFinding(effectiveStrict ? 'ERROR' : 'WARN', filePath, collection, field, value,
        `unmapped; add to mappings.${collection}.${field}.values or correct value`);
    }
    return;
  }
  const mapped = values[String(value)];
  if (mapped === 'drop') {
    // Only surface a deprecation WARN when there is an explicit migration
    // hint. Silent `drop` is correct projection behaviour for booleans and
    // generic "ignore this value" cases.
    const hint = deprecationHints[`${collection}.${field}.${value}`];
    if (hint) {
      recordFinding('WARN', filePath, collection, field, value, `deprecated: ${hint}`);
    }
  }
}

function lintEntry(entry, collection, filePath) {
  const fieldsSpec = taxonomy.mappings[collection];
  if (!fieldsSpec) return;
  for (const [fieldPath, spec] of Object.entries(fieldsSpec)) {
    if (spec?.free_text && !spec.advisory_mode) continue;
    const v = getField(entry, fieldPath);
    if (Array.isArray(v)) {
      for (const item of v) checkValue(spec, item, collection, fieldPath, filePath);
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      checkValue(spec, v, collection, fieldPath, filePath);
    }
  }
}

// ─── main pass ────────────────────────────────────────────────────────────
let filesScanned = 0;
try {
  for await (const filePath of walkContent(CONTENT_ROOT)) {
    if (changedSet) {
      const rel = relative(resolve(NEXT_ROOT, '..'), filePath).replaceAll('\\', '/');
      if (!changedSet.has(rel)) continue;
    }
    const folder = relative(CONTENT_ROOT, filePath).split(/[\\/]/)[0];
    const collection = FOLDER_TO_COLLECTION[folder];
    if (!collection) continue;
    const entry = await readEntry(filePath);
    if (!entry) continue;
    lintEntry(entry, collection, filePath);
    filesScanned++;
  }
} catch (err) {
  console.error(`[FATAL] Scan failed: ${err.message}`);
  process.exit(2);
}

// ─── output ───────────────────────────────────────────────────────────────
const warnCount = findings.filter((f) => f.level === 'WARN').length;
const errorCount = findings.filter((f) => f.level === 'ERROR').length;

if (opts.json) {
  process.stdout.write(JSON.stringify({
    taxonomyVersion: taxonomy.version,
    filesScanned,
    strictMode: effectiveStrict,
    warnOnlyUntil: taxonomy.policy.warn_only_until,
    findings,
    summary: { warn: warnCount, error: errorCount },
  }, null, 2) + '\n');
} else {
  for (const f of findings) {
    const tag = `[${f.level}]`;
    const where = `${f.collection}.${f.field} = ${JSON.stringify(f.value)}`;
    process.stdout.write(`${tag} ${f.file}  ${where}\n`);
    if (f.hint) process.stdout.write(`        ↳ ${f.hint}\n`);
  }
  process.stdout.write(`\nTaxonomy lint: ${filesScanned} files scanned. `);
  process.stdout.write(`WARN=${warnCount}, ERROR=${errorCount}, mode=${effectiveStrict ? 'strict' : 'warn-only'}.\n`);
  if (!effectiveStrict && promoteOn) {
    process.stdout.write(`Promotes to gate on ${taxonomy.policy.promote_to_gate_on}.\n`);
  }
}

process.exit(errorCount > 0 ? 1 : 0);
