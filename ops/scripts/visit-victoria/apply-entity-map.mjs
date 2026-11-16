#!/usr/bin/env node
/**
 * apply-entity-map.mjs
 *
 * Applies ops/records/visit-victoria/entity-map.json to the site:
 *   1. makes a web derivative of each approved Work (resize and re-encode only,
 *      which the licence permits as "reformatted ... for technical quality") into
 *      next/public/images/visit-victoria/;
 *   2. writes the hero and gallery imageRefs, with full provenance, into the entity
 *      JSON under next/src/content/;
 *   3. writes the where-used ledger ops/records/visit-victoria/placements.json.
 *
 * Retiring the CMS image overrides that would otherwise mask a new hero is a
 * separate, recorded database step (see placements.json `cmsRetired`).
 *
 *   node ops/scripts/visit-victoria/apply-entity-map.mjs --source "<download dir>"            # dry run
 *   node ops/scripts/visit-victoria/apply-entity-map.mjs --source "<download dir>" --write
 *
 * Needs sharp (next/node_modules). House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(path.join(REPO, 'next/package.json'));
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const SOURCE = arg('--source');
const WRITE = args.includes('--write');
if (!SOURCE) { console.error('usage: apply-entity-map.mjs --source <dir> [--write]'); process.exit(2); }

const RECORDS = path.join(REPO, 'ops/records/visit-victoria');
const map = JSON.parse(fs.readFileSync(path.join(RECORDS, 'entity-map.json'), 'utf8'));
const catalogue = JSON.parse(fs.readFileSync(path.join(RECORDS, `download-${map.batch}`, 'catalogue.json'), 'utf8'));
const byKey = new Map(catalogue.works.map((w) => [w.assetKey, w]));
const CONTENT = path.join(REPO, 'next/src/content');
const OUT_DIR = path.join(REPO, 'next/public/images/visit-victoria');
const PUBLIC_PREFIX = '/images/visit-victoria/';
const TERMS = 'Victoria Content Hub Terms and Conditions (last modified 21 Sep 2026)';
const ESTABLISHED = '2026-09-29';

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// Display names for creators recorded in capitals or as studio handles.
const CREATOR_NAMES = { 'TWO PALMS AUSTRALIA': 'Two Palms Australia', JESSEHISCOPHOTO: 'Jesse Hisco' };
function creatorName(raw) {
  if (!raw) return null;
  const first = raw.split(';')[0].trim();
  if (CREATOR_NAMES[first]) return CREATOR_NAMES[first];
  if (first === first.toUpperCase() && /[A-Z]/.test(first)) return first.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return first;
}

function permissionFor(w) {
  const embedded = [w.usageTerms, w.rightsText].find((t) => t && /promot|tourism|purpose/i.test(t));
  return embedded
    ? `Licensed at download (${map.batch}) under the ${TERMS}. Embedded usage terms: "${embedded}"`
    : `Licensed at download (${map.batch}) under the ${TERMS}.`;
}

function imageRefFor(key, caption) {
  const w = byKey.get(key); const a = map.assets[key];
  const creator = creatorName(w.creator);
  return {
    src: `${PUBLIC_PREFIX}${key}-${slugify(w.subject)}.webp`,
    alt: a.alt,
    credit: creator ? `${creator}, courtesy of Visit Victoria` : 'Courtesy of Visit Victoria',
    license: 'visit-victoria',
    caption,
    depicts: w.subject,
    depictionStatus: 'actual',
    ...(creator ? { creator } : {}),
    sourceUrl: `Victoria Content Hub asset ${w.vvAssetId}, downloaded ${map.batch}`,
    permission: permissionFor(w),
    permittedUses: ['website', 'social'],
    rightsHolder: 'Visit Victoria',
    rightsEstablishedOn: ESTABLISHED,
    rightsStatus: 'recorded',
    decorative: false,
    provenanceReview: 'verified',
  };
}

const heroKeys = new Set(map.entries.map((e) => e.hero).filter(Boolean));
const placements = [];
const derivatives = new Map(); // key -> { src, longEdge }
const touched = [];

for (const e of map.entries) {
  const file = path.join(CONTENT, `${e.entity}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const j = JSON.parse(raw);
  if (e.hero) {
    j.heroImage = imageRefFor(e.hero, e.caption);
    placements.push({ assetKey: e.hero, surface: 'site', entity: e.entity, field: 'heroImage', src: j.heroImage.src, replaced: e.previousHero ?? null });
  }
  j.gallery = e.gallery.map((k, i) => {
    const ref = imageRefFor(k, e.caption);
    placements.push({ assetKey: k, surface: 'site', entity: e.entity, field: `gallery[${i}]`, src: ref.src });
    return ref;
  });
  for (const k of [e.hero, ...e.gallery].filter(Boolean)) {
    const long = heroKeys.has(k) ? 2000 : 1280;
    const prev = derivatives.get(k);
    derivatives.set(k, { src: imageRefFor(k, '').src, longEdge: Math.max(long, prev?.longEdge ?? 0) });
  }
  const out = JSON.stringify(j, null, 2) + (raw.endsWith('\n') ? '\n' : '');
  if (out !== raw) touched.push(file);
  if (WRITE) fs.writeFileSync(file, out);
}

console.log(`entities ${map.entries.length}, files changed ${touched.length}, placements ${placements.length}, derivatives ${derivatives.size}`);
if (!WRITE) process.exit(0);

const sharp = require('sharp');
fs.mkdirSync(OUT_DIR, { recursive: true });
let made = 0; let bytes = 0;
for (const [key, d] of derivatives) {
  const w = byKey.get(key);
  const out = path.join(REPO, 'next/public', d.src);
  if (!fs.existsSync(out)) {
    const creator = creatorName(w.creator);
    await sharp(path.join(SOURCE, w.file), { limitInputPixels: false })
      .rotate()
      .resize({ width: d.longEdge, height: d.longEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 76, effort: 5 })
      .withExif({ IFD0: {
        Artist: creator ?? 'Visit Victoria',
        Copyright: `${creator ? creator + ', ' : ''}courtesy of Visit Victoria. Victoria Content Hub asset ${w.vvAssetId}. Not for re-use.`,
      } })
      .toFile(out);
    made++;
    if (made % 25 === 0) process.stderr.write(`derivatives ${made}/${derivatives.size}\n`);
  }
  bytes += fs.statSync(out).size;
}

const ledgerPath = path.join(RECORDS, 'placements.json');
const prior = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : {};
fs.writeFileSync(ledgerPath, JSON.stringify({
  record: 'Visit Victoria where-used ledger',
  purpose: 'Every placement of a Visit Victoria Work, so a takedown can be honoured the same day. Off-site placements (email, social) are appended by the job that makes them.',
  writtenBy: 'ops/scripts/visit-victoria/apply-entity-map.mjs --write',
  writtenAt: new Date().toISOString(),
  entityMap: 'ops/records/visit-victoria/entity-map.json',
  placements: [...(prior.placements ?? []).filter((p) => p.surface !== 'site'), ...placements],
  cmsRetired: prior.cmsRetired ?? [],
}, null, 1) + '\n');
console.log(`derivatives made ${made}, total ${(bytes / 1e6).toFixed(1)} MB; ledger ${ledgerPath}`);
