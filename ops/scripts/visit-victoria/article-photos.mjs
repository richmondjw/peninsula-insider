#!/usr/bin/env node
/**
 * article-photos.mjs
 *
 * Gives the articles Search Console shows demand for (batch 1, 2026-09-30) a
 * strip of licensed photographs of the places they cover, and a licensed hero
 * where the current one is uncleared or a stand-in. Photographs are copied from
 * the entity records that already hold them (credit, caption, provenance
 * intact). A hero chosen to show a featured place rather than the article's
 * subject is marked illustrative. Never touches a page with a CMS hero override.
 *
 *   node ops/scripts/visit-victoria/article-photos.mjs [--write]
 *   then: node ops/scripts/visit-victoria/record-placements.mjs --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(path.join(REPO, 'next/package.json'));
const YAML = require('yaml');
const C = path.join(REPO, 'next/src/content');
const REC = path.join(REPO, 'ops/records/visit-victoria');
const WRITE = process.argv.includes('--write');
const overrides = JSON.parse(fs.readFileSync(path.join(REC, 'cms-hero-overrides-2026-09-29.json'), 'utf8')).overrides.article;

// slug: { hero?: [entity, illustrative], gallery: [[entity, count], ...] }
const PLAN = {
  'peninsula-hot-springs-vs-alba': { gallery: [['venues/peninsula-hot-springs', 4], ['venues/alba-thermal-springs', 4]] },
  'luxury-hotels-mornington-peninsula': {
    hero: ['venues/jackalope', true],
    gallery: [['venues/jackalope', 2], ['venues/lindenderry', 2], ['venues/the-continental-sorrento', 2], ['venues/peninsula-hot-springs-eco-lodges', 2]],
  },
  'mornington-peninsula-golf-guide': {
    hero: ['experiences/the-national-golf-club', true],
    gallery: [['experiences/flinders-golf-club', 2], ['experiences/moonah-links', 2], ['experiences/the-dunes-golf-links', 2], ['experiences/st-andrews-beach-golf-course', 2]],
  },
  'best-golf-courses-mornington-peninsula': {
    hero: ['experiences/moonah-links', true],
    gallery: [['experiences/the-national-golf-club', 2], ['experiences/st-andrews-beach-golf-course', 2], ['experiences/flinders-golf-club', 2], ['experiences/the-dunes-golf-links', 2]],
  },
  'the-sorrento-weekend': { gallery: [['places/sorrento', 8]] },
};

const annotations = new Map(JSON.parse(fs.readFileSync(path.join(REC, 'download-2026-09-28/annotations.json'), 'utf8')).works.map((a) => [a.assetKey, a]));
const catalogue = new Map(JSON.parse(fs.readFileSync(path.join(REC, 'download-2026-09-28/catalogue.json'), 'utf8')).works.map((w) => [w.assetKey, w]));
const keyOf = (src) => (src.match(/\/(vv-\d+)-/) || [])[1];
const rank = (r) => (catalogue.get(keyOf(r.src))?.orientation === 'landscape' ? 0 : 5) + ({ aerial: 0, establishing: 0, wide: 1, interior: 2, food: 3, detail: 4 }[annotations.get(keyOf(r.src))?.shotType] ?? 3);
const pool = (entity) => {
  const d = JSON.parse(fs.readFileSync(path.join(C, `${entity}.json`), 'utf8'));
  return [d.heroImage, ...(d.gallery ?? [])].filter((r) => r?.license === 'visit-victoria' && r.rightsStatus === 'recorded').map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map((x) => x.r);
};

// Photographs already leading another article are not reused as a hero.
const usedHeroes = new Set();
const files = fs.readdirSync(path.join(C, 'articles'));
for (const f of files) { const m = fs.readFileSync(path.join(C, 'articles', f), 'utf8').match(/heroImage:[\s\S]*?src:\s*"?([^"\n]+)"?/); if (m) usedHeroes.add(m[1].trim()); }

const q = (v) => JSON.stringify(String(v));
function refLines(ref, indent) {
  const pad = ' '.repeat(indent); const out = [];
  for (const [k, v] of Object.entries(ref)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) { if (v.length) out.push(`${pad}${k}:`, ...v.map((x) => `${pad}  - ${q(x)}`)); }
    else if (typeof v === 'boolean') out.push(`${pad}${k}: ${v}`);
    else out.push(`${pad}${k}: ${q(v)}`);
  }
  return out;
}
const heroYaml = (ref) => ['heroImage:', ...refLines(ref, 2)].join('\n') + '\n';
const galleryYaml = (refs) => ['gallery:', ...refs.flatMap((r) => { const l = refLines(r, 4); l[0] = '  - ' + l[0].trimStart(); return l; })].join('\n') + '\n';
const HERO_BLOCK = /^heroImage:[ \t]*\r?\n(?:[ \t]+\S.*\r?\n?)*/m;
const GALLERY_BLOCK = /^gallery:[ \t]*\r?\n(?:[ \t]+\S.*\r?\n?)*/m;

for (const [slug, plan] of Object.entries(PLAN)) {
  const file = files.find((f) => f.replace(/\.mdx?$/, '') === slug);
  if (!file) { console.log(`${slug}: no article`); continue; }
  const p = path.join(C, 'articles', file);
  const text = fs.readFileSync(p, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = YAML.parse(m[1]);
  let front = m[1];
  const notes = [];
  if (plan.hero) {
    if (overrides.includes(slug)) notes.push('hero kept (CMS override)');
    else if (fm.heroImage?.license === 'visit-victoria') notes.push('hero already licensed');
    else {
      const [entity, illustrative] = plan.hero;
      const pick = pool(entity).find((r) => !usedHeroes.has(r.src)) ?? pool(entity)[0];
      usedHeroes.add(pick.src);
      front = front.replace(HERO_BLOCK, heroYaml(illustrative ? { ...pick, depictionStatus: 'illustrative' } : pick));
      notes.push(`hero ${pick.src}${illustrative ? ' (illustrative)' : ''}`);
    }
  }
  const heroSrc = (YAML.parse(front).heroImage ?? {}).src;
  const gallery = [];
  for (const [entity, count] of plan.gallery) {
    for (const r of pool(entity)) {
      if (gallery.filter((g) => g._from === entity).length >= count) break;
      if (r.src === heroSrc || gallery.some((g) => g.src === r.src)) continue;
      gallery.push({ ...r, _from: entity });
    }
  }
  const clean = gallery.map(({ _from, ...r }) => r);
  front = GALLERY_BLOCK.test(front) ? front.replace(GALLERY_BLOCK, galleryYaml(clean)) : front.replace(/\s*$/, '\n') + galleryYaml(clean);
  notes.push(`gallery ${clean.length}`);
  console.log(`${slug}: ${notes.join('; ')}`);
  if (WRITE) fs.writeFileSync(p, text.replace(m[1], front.replace(/\n$/, '')));
}
