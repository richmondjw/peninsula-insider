// lint-content-caps.mjs — T-201 (2026-07-11)
//
// Enforces the master length caps from the v5 content guidelines
// (workspace/peninsula-insider-redesign/06-content-system/content-guidelines.md
// §2 + §5) on the structured content where they are mechanically detectable:
//
//   - Hub / best-of stand-first  ≤ 80 words   src/content/editorial_blocks/*.md body   (§3.1)
//   - Verdict-class copy         ≤ 25 words   JSON keys: verdict, ifOnlyOneThing       (§3.5)
//   - Venue card summary         ≤ 22 words   JSON key: signature (also ≤ 140 chars)   (§3.4)
//   - CTA label                  ≤ 3 words    JSON keys: cta / ctaLabel / ctaText,
//                                             or cta object's label/text               (§3.6)
//                                             ("Add to My Trip" exempt by name, §3.6)
//
// Modes:
//   node scripts/lint-content-caps.mjs               WARN (default): print every
//                                                    violation, always exit 0.
//   node scripts/lint-content-caps.mjs --strict      exit 1 only for violations NOT in
//                                                    content-caps-allowlist.json — the
//                                                    allowlist is seeded with every path
//                                                    failing at adoption time, so CI can
//                                                    flip to strict without a bang.
//   node scripts/lint-content-caps.mjs --update-allowlist
//                                                    rewrite the allowlist from current
//                                                    violations (use only to re-baseline).
//
// NOT wired into the build chain yet (per T-201). Run via `npm run lint:content-caps`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_PATH = path.join(NEXT_ROOT, 'scripts', 'content-caps-allowlist.json');
const SKIP = /_archive|__pycache__/;

const STRICT = process.argv.includes('--strict');
const UPDATE = process.argv.includes('--update-allowlist');

const CAPS = {
  standFirstWords: 80,
  verdictWords: 25,
  cardSummaryWords: 22,
  cardSummaryChars: 140,
  ctaWords: 3,
};
const CTA_EXEMPT = new Set(['Add to My Trip']); // fixed product name, §3.6

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const rel = (p) => path.relative(NEXT_ROOT, p).split(path.sep).join('/');

const violations = []; // { id, message }
function add(file, ref, message) {
  violations.push({ id: `${rel(file)}::${ref}`, message });
}

// --- JSON: recursive key walk over src/content and src/data ---------------
function checkJsonValue(file, key, value, keyPath) {
  if (typeof value === 'string') {
    const w = words(value);
    if (key === 'verdict' || key === 'ifOnlyOneThing') {
      if (w > CAPS.verdictWords) {
        add(file, keyPath, `verdict ${w} words (cap ${CAPS.verdictWords}): "${value.slice(0, 80)}"`);
      }
    } else if (key === 'signature') {
      if (w > CAPS.cardSummaryWords || value.length > CAPS.cardSummaryChars) {
        add(file, keyPath, `card summary ${w} words / ${value.length} chars (cap ${CAPS.cardSummaryWords}w / ${CAPS.cardSummaryChars}ch): "${value.slice(0, 80)}"`);
      }
    } else if (/^cta(Label|Text|_label|_text)?$/i.test(key)) {
      if (!CTA_EXEMPT.has(value.trim()) && words(value) > CAPS.ctaWords) {
        add(file, keyPath, `CTA label ${words(value)} words (cap ${CAPS.ctaWords}): "${value.slice(0, 60)}"`);
      }
    }
  }
}

function walkJson(file, node, keyPath) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkJson(file, v, `${keyPath}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const kp = keyPath ? `${keyPath}.${k}` : k;
      checkJsonValue(file, k, v, kp);
      // cta as an object: its label/text carry the CTA cap
      if (k === 'cta' && v && typeof v === 'object' && !Array.isArray(v)) {
        for (const sub of ['label', 'text']) {
          if (typeof v[sub] === 'string' && !CTA_EXEMPT.has(v[sub].trim()) && words(v[sub]) > CAPS.ctaWords) {
            add(file, `${kp}.${sub}`, `CTA label ${words(v[sub])} words (cap ${CAPS.ctaWords}): "${v[sub].slice(0, 60)}"`);
          }
        }
      }
      walkJson(file, v, kp);
    }
  }
}

// --- Markdown: editorial_blocks stand-firsts ------------------------------
function checkStandFirst(file) {
  const raw = fs.readFileSync(file, 'utf8');
  let body = raw;
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    if (end !== -1) body = raw.slice(end + 4);
  }
  const w = words(body.replace(/[#>*_`]/g, ' '));
  if (w > CAPS.standFirstWords) {
    add(file, 'body', `stand-first ${w} words (cap ${CAPS.standFirstWords})`);
  }
}

// --- Walk ------------------------------------------------------------------
function walkDir(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (SKIP.test(full) || e.name.startsWith('_')) continue;
    if (e.isDirectory()) { walkDir(full, fn); continue; }
    fn(full);
  }
}

for (const root of ['src/content', 'src/data']) {
  walkDir(path.join(NEXT_ROOT, root), (file) => {
    if (path.extname(file) === '.json') {
      let data;
      try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch { return; } // malformed JSON is another lint's job
      walkJson(file, data, '');
    }
  });
}
walkDir(path.join(NEXT_ROOT, 'src/content/editorial_blocks'), (file) => {
  if (['.md', '.mdx'].includes(path.extname(file))) checkStandFirst(file);
});

// --- Report ----------------------------------------------------------------
let allowlist = [];
if (fs.existsSync(ALLOWLIST_PATH)) {
  try { allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8')).allow ?? []; }
  catch { console.error(`! Could not parse ${rel(ALLOWLIST_PATH)}; treating allowlist as empty.`); }
}
const allowed = new Set(allowlist);

if (UPDATE) {
  const out = {
    _comment: 'T-201 content-caps allowlist. Every entry is a pre-existing violation grandfathered at adoption (2026-07-11) so --strict can gate NEW copy without a bang. Remove entries as copy is rewritten to the v5 caps; never add new ones for new copy.',
    allow: [...new Set(violations.map((v) => v.id))].sort(),
  };
  fs.writeFileSync(ALLOWLIST_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`Allowlist rewritten with ${out.allow.length} entries -> ${rel(ALLOWLIST_PATH)}`);
  process.exit(0);
}

const fresh = violations.filter((v) => !allowed.has(v.id));
const grandfathered = violations.length - fresh.length;

if (violations.length === 0) {
  console.log('✓ Content caps clean (stand-first ≤80w, verdict ≤25w, card summary ≤22w, CTA ≤3w).');
  process.exit(0);
}

console.log(`Content-caps violations: ${violations.length} total (${grandfathered} allowlisted, ${fresh.length} new)\n`);
for (const v of violations) {
  const tag = allowed.has(v.id) ? 'ALLOWLISTED' : (STRICT ? 'FAIL' : 'WARN');
  console.log(`  [${tag}] ${v.id}\n      ${v.message}`);
}

if (STRICT && fresh.length > 0) {
  console.error(`\n✗ ${fresh.length} violation(s) not in content-caps-allowlist.json. Tighten the copy (content-guidelines.md §2) — do not extend the allowlist for new copy.`);
  process.exit(1);
}
console.log(STRICT ? '\n✓ No new violations beyond the grandfathered allowlist.' : '\n(warn mode: exit 0 — pass --strict to gate on non-allowlisted violations)');
process.exit(0);
