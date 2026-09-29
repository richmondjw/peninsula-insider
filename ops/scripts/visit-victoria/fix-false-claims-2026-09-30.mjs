#!/usr/bin/env node
/**
 * fix-false-claims-2026-09-30.mjs - one-off correction, kept as the audit trail.
 *
 * The licence gate (next/scripts/lint-visit-victoria.mjs) found seven article
 * heroes labelled license "visit-victoria" that are not Visit Victoria Works:
 * older /images/sourced/ files carrying a false rights claim.
 *
 *   - four have a Wikimedia Commons record in next/public/images/sourced/LICENSES.md:
 *     the label and credit are corrected to that record;
 *   - three have no record at all: the claim cannot be corrected, so the hero is
 *     replaced by a licensed Visit Victoria photograph of the article's subject
 *     (or, for a round-up, a featured place, marked illustrative).
 *
 *   node ops/scripts/visit-victoria/fix-false-claims-2026-09-30.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ART = path.join(REPO, 'next/src/content/articles');
const C = path.join(REPO, 'next/src/content');
const WRITE = process.argv.includes('--write');

const RELABEL = {
  'point-nepean-national-park-guide.mdx': { license: 'wikimedia-cc-by-sa', credit: 'Philip Mallis / Wikimedia Commons (CC-BY-SA-4.0)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Looking_out_towards_the_waves_near_Cheviot_Hill_at_Point_Nepean_in_Portsea,_Victoria.jpg' },
  'things-to-do-mornington-peninsula.mdx': { license: 'wikimedia-cc-by-sa', credit: 'DenisFrolow / Wikimedia Commons (CC-BY-SA-4.0)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cape_Schanck_walking_trail.jpg' },
  'free-things-to-do-mornington-peninsula.mdx': { license: 'wikimedia-cc-by', credit: 'CSIRO / Wikimedia Commons (CC-BY-3.0)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:CSIRO_ScienceImage_1961_Chardonnay_grapes_at_the_Main_Ridge_Estate.jpg' },
  'mornington-peninsula-beach-guide.mdx': { license: 'wikimedia-cc-by-sa', credit: 'Simone Kealy / Wikimedia Commons (CC-BY-SA-4.0)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Portsea_beaches.jpg' },
};
// Replacement: [entity, matcher on the recorded description, illustrative?]
const REPLACE = {
  'cape-schanck-guide.mdx': ['places/cape-schanck', /lighthouse/i, false],
  'two-bays-walk-mornington-peninsula.mdx': ['places/cape-schanck', /boardwalk|walk|track/i, true],
  'where-to-eat-mornington-peninsula.mdx': ['venues/rare-hare', /plate|dish|dining|table/i, true],
};

const HERO_BLOCK = /^heroImage:[ \t]*\r?\n(?:[ \t]+\S.*\r?\n?)*/m;
const q = (v) => JSON.stringify(String(v));
function yamlBlock(ref) {
  const lines = ['heroImage:'];
  for (const [k, v] of Object.entries(ref)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) { if (v.length) lines.push(`  ${k}:`, ...v.map((x) => `    - ${q(x)}`)); }
    else if (typeof v === 'boolean') lines.push(`  ${k}: ${v}`);
    else lines.push(`  ${k}: ${q(v)}`);
  }
  return lines.join('\n') + '\n';
}
function heroOf(fm) { const m = fm.match(HERO_BLOCK); return m ? m[0] : null; }

// Photographs already leading another article, so a replacement is not a repeat.
const used = new Set();
for (const f of fs.readdirSync(ART)) {
  const t = fs.readFileSync(path.join(ART, f), 'utf8');
  const m = t.match(/heroImage:[\s\S]*?src:\s*"?([^"\n]+)"?/); if (m) used.add(m[1].trim());
}

for (const [file, fix] of Object.entries({ ...RELABEL, ...REPLACE })) {
  const p = path.join(ART, file);
  const text = fs.readFileSync(p, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
  const block = heroOf(fm);
  if (!block || !/license:\s*"?visit-victoria/.test(block)) { console.log(`${file}: no false claim, skipped`); continue; }
  let next;
  if (Array.isArray(fix)) {
    const [entity, want, illustrative] = fix;
    const d = JSON.parse(fs.readFileSync(path.join(C, `${entity}.json`), 'utf8'));
    const pool = [d.heroImage, ...(d.gallery ?? [])].filter((r) => r?.license === 'visit-victoria' && r.src?.startsWith('/images/visit-victoria/'));
    const pick = pool.find((r) => want.test(r.alt ?? '') && !used.has(r.src)) ?? pool.find((r) => !used.has(r.src)) ?? pool[0];
    used.add(pick.src);
    next = yamlBlock(illustrative ? { ...pick, depictionStatus: 'illustrative' } : pick);
    console.log(`${file}: replaced with ${pick.src}${illustrative ? ' (illustrative)' : ''}`);
  } else {
    next = block
      .replace(/^(\s*license:\s*).*$/m, `$1${q(fix.license)}`)
      .replace(/^(\s*credit:\s*).*$/m, `$1${q(fix.credit)}`);
    if (!/^\s*sourceUrl:/m.test(next)) next = next.replace(/\n?$/, `\n  sourceUrl: ${q(fix.sourceUrl)}\n`).replace(/\n\n/g, '\n');
    console.log(`${file}: relabelled ${fix.license}`);
  }
  if (WRITE) fs.writeFileSync(p, text.replace(block, next));
}
