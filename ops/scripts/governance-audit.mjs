#!/usr/bin/env node
// Peninsula Insider — Governance field audit
//
// Scans content collections for governance violations and emits a structured
// exception list. This is the audit version (informational, comprehensive).
// For the gating / lint version that fails CI on violations, see
// ops/scripts/governance-lint.mjs (which imports the same rule set).
//
// Usage:
//   node ops/scripts/governance-audit.mjs                     # writes report to ops/reports/governance/exceptions-YYYY-MM-DD.md
//   node ops/scripts/governance-audit.mjs --report=PATH       # explicit report path
//   node ops/scripts/governance-audit.mjs --json              # JSON output to stdout
//   node ops/scripts/governance-audit.mjs --collection=venues # restrict to one collection

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const CONTENT_ROOT = join(REPO_ROOT, 'next', 'src', 'content');

const args = process.argv.slice(2);
const opts = {
  report: null,
  json: false,
  collection: null,
};
for (const a of args) {
  if (a.startsWith('--report=')) opts.report = a.slice('--report='.length);
  else if (a === '--json') opts.json = true;
  else if (a.startsWith('--collection=')) opts.collection = a.slice('--collection='.length);
}

// --- Rules ---

// Severities:
//   ERROR    — violates a published-content invariant. Must be fixed.
//   WARN     — likely problem, worth surfacing.
//   INFO     — soft signal, useful trend data.

const TEMP_LICENSES = new Set(['tmp-unsplash', 'tmp-wikimedia', 'tmp-pexels']);
const KNOWN_LICENSES = new Set([
  'original-commissioned',
  'venue-media-kit',
  'visit-victoria',
  'wikimedia-cc0',
  'wikimedia-cc-by',
  'wikimedia-cc-by-sa',
  'tmp-unsplash',
  'tmp-wikimedia',
  'tmp-pexels',
  'other-licensed',
]);

const EVERGREEN_VERIFICATION_DAYS = 365; // Anything verified > 1 year ago is stale
const VERIFICATION_WARN_DAYS = 180;       // Soft warning at 6 months

const TODAY = new Date('2026-05-10T00:00:00Z'); // explicit so output is deterministic

function daysAgo(date) {
  if (!date) return Infinity;
  const d = new Date(date);
  if (isNaN(+d)) return Infinity;
  return Math.floor((TODAY - d) / 86_400_000);
}

// --- Collection definitions ---

const COLLECTIONS = [
  { name: 'venues', dir: 'venues', kind: 'json', requireLastVerified: true, requireHero: true, requireGalleryLicense: true },
  { name: 'experiences', dir: 'experiences', kind: 'json', requireLastVerified: true, requireHero: true, requireGalleryLicense: true },
  { name: 'places', dir: 'places', kind: 'json', requireLastVerified: false, requireHero: true, requireGalleryLicense: false },
  { name: 'articles', dir: 'articles', kind: 'md', requireLastVerified: true, requireHero: true, requireGalleryLicense: false },
  { name: 'events', dir: 'events', kind: 'json', requireLastVerified: false, requireHero: false, requireGalleryLicense: false },
  { name: 'quick-notes', dir: 'quick-notes', kind: 'md', requireLastVerified: false, requireHero: false, requireGalleryLicense: false },
];

function makeFinding(file, severity, rule, message) {
  return {
    file: relative(REPO_ROOT, file).replaceAll('\\', '/'),
    severity,
    rule,
    message,
  };
}

// --- Frontmatter parser (minimal — just enough for our fields) ---
function parseFrontmatter(text) {
  // Normalise line endings so regex anchors and indentation logic both work
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const m = normalised.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const yaml = m[1];
  const out = {};
  // Walk the YAML manually. Supports:
  //   key: scalar
  //   key:
  //     subkey: scalar
  //     subkey: "string"
  // Does NOT support arrays-of-objects, anchors, multi-line scalars, etc.
  // We only need a handful of fields, so this is OK.
  const lines = yaml.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const topMatch = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!topMatch) { i++; continue; }
    const [, key, rest] = topMatch;
    if (rest.trim() === '') {
      // Block — collect indented children
      const child = {};
      i++;
      while (i < lines.length) {
        const cl = lines[i];
        if (!/^\s+\S/.test(cl)) break;
        const cm = cl.match(/^\s+([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
        if (cm) child[cm[1]] = unquote(cm[2].trim());
        i++;
      }
      out[key] = child;
      continue;
    }
    out[key] = unquote(rest.trim());
    i++;
  }
  return out;
}

function unquote(s) {
  if (!s) return s;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// --- Per-collection scanners ---

async function scanCollection(coll) {
  const dir = join(CONTENT_ROOT, coll.dir);
  let files;
  try {
    files = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    return [{ severity: 'WARN', rule: 'collection-missing', message: `${coll.dir}: directory not found`, file: dir }];
  }
  const findings = [];
  for (const ent of files) {
    if (ent.isDirectory()) continue;
    if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue;
    if (coll.kind === 'json' && !ent.name.endsWith('.json')) continue;
    if (coll.kind === 'md' && !ent.name.endsWith('.md') && !ent.name.endsWith('.mdx')) continue;
    const file = join(dir, ent.name);
    const fileFindings = await scanFile(coll, file);
    findings.push(...fileFindings);
  }
  return findings;
}

async function scanFile(coll, file) {
  const findings = [];
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (e) {
    return [makeFinding(file, 'ERROR', 'unreadable', `cannot read: ${e.message}`)];
  }

  let data;
  if (coll.kind === 'json') {
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return [makeFinding(file, 'ERROR', 'json-invalid', `JSON parse failed: ${e.message}`)];
    }
  } else {
    data = parseFrontmatter(raw);
    if (!data) {
      return [makeFinding(file, 'ERROR', 'frontmatter-missing', 'no YAML frontmatter')];
    }
  }

  // R1: lastVerified required and fresh
  if (coll.requireLastVerified) {
    if (!data.lastVerified) {
      findings.push(makeFinding(file, 'ERROR', 'lastVerified-missing', 'lastVerified field is required'));
    } else {
      const age = daysAgo(data.lastVerified);
      if (age > EVERGREEN_VERIFICATION_DAYS) {
        findings.push(makeFinding(file, 'ERROR', 'lastVerified-stale', `lastVerified ${age}d ago (> ${EVERGREEN_VERIFICATION_DAYS}d)`));
      } else if (age > VERIFICATION_WARN_DAYS) {
        findings.push(makeFinding(file, 'WARN', 'lastVerified-aging', `lastVerified ${age}d ago (> ${VERIFICATION_WARN_DAYS}d)`));
      }
    }
  }

  // R2: heroImage required, with credit + license
  if (coll.requireHero) {
    const hero = data.heroImage;
    if (!hero) {
      findings.push(makeFinding(file, 'ERROR', 'heroImage-missing', 'heroImage required'));
    } else {
      if (!hero.src) {
        findings.push(makeFinding(file, 'ERROR', 'heroImage-src-missing', 'heroImage.src required'));
      }
      if (!hero.alt || hero.alt.trim().length < 10) {
        findings.push(makeFinding(file, 'WARN', 'heroImage-alt-thin', `heroImage.alt is ${hero.alt ? `"${hero.alt}" (${hero.alt.length} chars)` : 'missing'}`));
      }
      if (!hero.credit || hero.credit.trim() === '') {
        findings.push(makeFinding(file, 'ERROR', 'heroImage-credit-missing', 'heroImage.credit required'));
      }
      // license is optional in schema (default 'venue-media-kit') but we still want to flag tmp-*
      if (hero.license) {
        if (!KNOWN_LICENSES.has(hero.license)) {
          findings.push(makeFinding(file, 'ERROR', 'heroImage-license-unknown', `heroImage.license="${hero.license}" not in the allowed set`));
        } else if (TEMP_LICENSES.has(hero.license)) {
          findings.push(makeFinding(file, 'WARN', 'heroImage-license-temporary', `heroImage.license="${hero.license}" — temporary placeholder, replace with permanent license`));
        }
      }
    }
  }

  // R3: gallery licenses (where applicable)
  if (coll.requireGalleryLicense && Array.isArray(data.gallery)) {
    for (let i = 0; i < data.gallery.length; i++) {
      const g = data.gallery[i];
      if (g.license && TEMP_LICENSES.has(g.license)) {
        findings.push(makeFinding(file, 'WARN', 'gallery-license-temporary', `gallery[${i}].license="${g.license}" — temporary placeholder`));
      }
      if (g.license && !KNOWN_LICENSES.has(g.license)) {
        findings.push(makeFinding(file, 'ERROR', 'gallery-license-unknown', `gallery[${i}].license="${g.license}" not allowed`));
      }
      if (!g.credit) {
        findings.push(makeFinding(file, 'ERROR', 'gallery-credit-missing', `gallery[${i}].credit required`));
      }
    }
  }

  // R4: placeholder image markers
  if (data.heroImage?.src) {
    if (/placeholder|tmp[-_]/.test(data.heroImage.src)) {
      findings.push(makeFinding(file, 'WARN', 'heroImage-placeholder-path', `heroImage.src="${data.heroImage.src}" — looks like a placeholder`));
    }
  }

  // R5: published-flag sanity for articles
  if (coll.name === 'articles') {
    if (data.status && data.status !== 'published' && data.status !== 'draft') {
      findings.push(makeFinding(file, 'WARN', 'article-status-unknown', `status="${data.status}"`));
    }
    if (data.publishedAt && daysAgo(data.publishedAt) < 0) {
      findings.push(makeFinding(file, 'INFO', 'article-future-publish', `publishedAt is in the future (${data.publishedAt})`));
    }
  }

  return findings;
}

// --- Main ---

const allFindings = [];
const collections = opts.collection ? COLLECTIONS.filter((c) => c.name === opts.collection) : COLLECTIONS;
for (const coll of collections) {
  const findings = await scanCollection(coll);
  for (const f of findings) {
    allFindings.push({ collection: coll.name, ...f });
  }
}

const counts = { ERROR: 0, WARN: 0, INFO: 0 };
for (const f of allFindings) counts[f.severity] = (counts[f.severity] || 0) + 1;

if (opts.json) {
  console.log(JSON.stringify({ counts, findings: allFindings }, null, 2));
  process.exit(counts.ERROR > 0 ? 1 : 0);
}

// Console summary
const totalFiles = new Set(allFindings.map((f) => f.file)).size;
console.log(`Governance audit — ${TODAY.toISOString().slice(0, 10)}`);
console.log(`  ERROR: ${counts.ERROR}`);
console.log(`  WARN:  ${counts.WARN}`);
console.log(`  INFO:  ${counts.INFO}`);
console.log(`  files-with-findings: ${totalFiles}`);

// Markdown report
const reportPath = opts.report || join(REPO_ROOT, 'ops', 'reports', 'governance', `exceptions-${TODAY.toISOString().slice(0, 10)}.md`);
await mkdir(dirname(reportPath), { recursive: true });

const lines = [];
lines.push(`# Peninsula Insider — Governance Audit Exceptions`);
lines.push(`**Date:** ${TODAY.toISOString().slice(0, 10)}`);
lines.push(`**Tool:** \`ops/scripts/governance-audit.mjs\``);
lines.push(`**Scope:** structured content collections (\`next/src/content/*\`)`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`| Severity | Count |`);
lines.push(`|---|---|`);
lines.push(`| ERROR | ${counts.ERROR} |`);
lines.push(`| WARN  | ${counts.WARN}  |`);
lines.push(`| INFO  | ${counts.INFO}  |`);
lines.push(`| Files with findings | ${totalFiles} |`);
lines.push('');
lines.push('## Rules');
lines.push('');
lines.push('- `lastVerified-missing` (ERROR) — required field absent on a collection that requires it');
lines.push(`- \`lastVerified-stale\` (ERROR) — last verified > ${EVERGREEN_VERIFICATION_DAYS} days ago`);
lines.push(`- \`lastVerified-aging\` (WARN) — last verified > ${VERIFICATION_WARN_DAYS} days ago`);
lines.push('- `heroImage-missing` / `heroImage-src-missing` / `heroImage-credit-missing` (ERROR)');
lines.push('- `heroImage-license-unknown` / `gallery-license-unknown` (ERROR) — license value not in the allowed set');
lines.push('- `heroImage-license-temporary` / `gallery-license-temporary` (WARN) — `tmp-*` placeholder license');
lines.push('- `heroImage-alt-thin` (WARN) — alt text < 10 chars');
lines.push('- `heroImage-placeholder-path` (WARN) — image path contains "placeholder" or "tmp"');
lines.push('- `gallery-credit-missing` (ERROR) — gallery item without credit');
lines.push('- `article-status-unknown` (WARN), `article-future-publish` (INFO)');
lines.push('');

// Group by collection
const byCollection = {};
for (const f of allFindings) {
  byCollection[f.collection] ||= [];
  byCollection[f.collection].push(f);
}

for (const [coll, findings] of Object.entries(byCollection).sort()) {
  if (findings.length === 0) continue;
  lines.push(`## ${coll}`);
  lines.push('');
  // Group by rule for tighter reading
  const byRule = {};
  for (const f of findings) {
    byRule[f.rule] ||= [];
    byRule[f.rule].push(f);
  }
  for (const [rule, fs] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) {
    const sev = fs[0].severity;
    lines.push(`### \`${rule}\` (${sev}) — ${fs.length} occurrence${fs.length === 1 ? '' : 's'}`);
    lines.push('');
    for (const f of fs.slice(0, 50)) {
      lines.push(`- \`${f.file}\` — ${f.message}`);
    }
    if (fs.length > 50) lines.push(`- _… +${fs.length - 50} more_`);
    lines.push('');
  }
}

if (allFindings.length === 0) {
  lines.push('No exceptions found.');
}

await writeFile(reportPath, lines.join('\n'));
console.log(`report: ${relative(REPO_ROOT, reportPath).replaceAll('\\', '/')}`);

process.exit(counts.ERROR > 0 ? 1 : 0);
