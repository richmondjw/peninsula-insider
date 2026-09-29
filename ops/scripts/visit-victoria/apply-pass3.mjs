#!/usr/bin/env node
/**
 * apply-pass3.mjs
 *
 * Third pass: brings further Works from the download onto the pages they show,
 * chiefly town galleries (Sorrento's village, piers and shops, Mornington's
 * paddleboarders, Point Nepean, Cape Schanck, St Andrews Beach) and the aerials
 * of The Continental Sorrento. Same provenance, credit and derivative rules as
 * apply-entity-map.mjs; approval recorded in ops/records/visit-victoria/pass3-map.json.
 *
 *   node ops/scripts/visit-victoria/apply-pass3.mjs --picked <picked.json> --annotations <ann.json> --source "<download dir>" [--write]
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(path.join(REPO, 'next/package.json'));
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const WRITE = args.includes('--write');
const PICKED = JSON.parse(fs.readFileSync(arg('--picked'), 'utf8'));
const ANN = new Map(JSON.parse(fs.readFileSync(arg('--annotations'), 'utf8')).map((a) => [a.assetKey, a]));
const SOURCE = arg('--source');
const REC = path.join(REPO, 'ops/records/visit-victoria');
const C = path.join(REPO, 'next/src/content');
const map = JSON.parse(fs.readFileSync(path.join(REC, 'entity-map.json'), 'utf8'));
const cat = new Map(JSON.parse(fs.readFileSync(path.join(REC, `download-${map.batch}`, 'catalogue.json'), 'utf8')).works.map((w) => [w.assetKey, w]));
const TERMS = 'Victoria Content Hub Terms and Conditions (last modified 21 Sep 2026)';
const PLACE_CAP = 18;

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
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
function captionFor(subject, placeName) {
  let c = subject.replace(/\s+-\s+/g, ', ').replace(/,?\s*Mornington Peninsula$/i, '').trim();
  if (placeName && !c.toLowerCase().includes(placeName.toLowerCase())) c += `, ${placeName}`;
  return `${c}, Mornington Peninsula.`;
}

const read = (key) => { const f = path.join(C, `${key}.json`); return { f, d: JSON.parse(fs.readFileSync(f, 'utf8')) }; };
const approved = []; const rejected = []; const placements = []; const derivatives = [];
const byTarget = new Map();
for (const p of PICKED) {
  const a = ANN.get(p.assetKey);
  if (!a || a.matchesSubject === false) { rejected.push({ assetKey: p.assetKey, why: a?.note || 'no annotation' }); continue; }
  if (!byTarget.has(p.target)) byTarget.set(p.target, []);
  byTarget.get(p.target).push(p);
}

for (const [target, works] of byTarget) {
  const { f, d } = read(target);
  const placeName = target.startsWith('places/') ? d.name : (d.place ? read(`places/${d.place}`).d.name : null);
  const refs = works.map((p) => {
    const w = cat.get(p.assetKey); const a = ANN.get(p.assetKey); const creator = creatorName(w.creator);
    const caption = target.startsWith('places/') ? captionFor(w.subject, placeName) : (d.heroImage?.caption ?? captionFor(d.name, placeName));
    return {
      ref: {
        src: `/images/visit-victoria/${p.assetKey}-${slugify(w.subject)}.webp`,
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
        rightsEstablishedOn: '2026-09-29',
        rightsStatus: 'recorded',
        decorative: false,
        provenanceReview: 'verified',
      },
      w, a,
    };
  });
  const gallery = d.gallery ?? [];
  // A venue whose new Works include an aerial or establishing landscape leads with it.
  let heroSet = false;
  if (target.startsWith('venues/')) {
    const lead = refs.find((r) => ['aerial', 'establishing'].includes(r.a.shotType) && r.w.orientation === 'landscape');
    if (lead) {
      if (d.heroImage?.src) gallery.unshift(d.heroImage);
      d.heroImage = lead.ref; heroSet = true;
      placements.push({ assetKey: lead.w.assetKey, surface: 'site', entity: target, field: 'heroImage', src: lead.ref.src, pass: 3, role: 'hero-upgrade' });
      derivatives.push({ w: lead.w, ref: lead.ref, longEdge: 2000 });
    }
  }
  const cap = target.startsWith('places/') ? PLACE_CAP : gallery.length + refs.length;
  for (const r of refs) {
    if (heroSet && r.ref.src === d.heroImage.src) continue;
    if (gallery.length >= cap || gallery.some((g) => g.src === r.ref.src)) continue;
    gallery.push(r.ref);
    placements.push({ assetKey: r.w.assetKey, surface: 'site', entity: target, field: `gallery[${gallery.length - 1}]`, src: r.ref.src, pass: 3, role: 'gallery' });
    derivatives.push({ w: r.w, ref: r.ref, longEdge: 1280 });
    approved.push({ assetKey: r.w.assetKey, entity: target });
  }
  d.gallery = gallery;
  if (heroSet) approved.push({ assetKey: assetKeyFromSrc(d.heroImage.src), entity: target, hero: true });
  console.log(`${target}: +${refs.length} works${heroSet ? ', new hero' : ''}`);
  if (WRITE) fs.writeFileSync(f, JSON.stringify(d, null, 2) + '\n');
}
function assetKeyFromSrc(src) { return (src.match(/\/(vv-\d+)-/) || [])[1]; }

if (!WRITE) { console.log(`dry run: ${derivatives.length} derivatives, ${rejected.length} rejected`); process.exit(0); }

const sharp = require('sharp');
const OUT = path.join(REPO, 'next/public/images/visit-victoria');
let made = 0;
for (const { w, ref, longEdge } of derivatives) {
  const out = path.join(REPO, 'next/public', ref.src);
  if (fs.existsSync(out)) continue;
  const creator = creatorName(w.creator);
  await sharp(path.join(SOURCE, w.file), { limitInputPixels: false })
    .rotate()
    .resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 76, effort: 5 })
    .withExif({ IFD0: { Artist: creator ?? 'Visit Victoria', Copyright: `${creator ? creator + ', ' : ''}courtesy of Visit Victoria. Victoria Content Hub asset ${w.vvAssetId}. Not for re-use.` } })
    .toFile(out);
  made++;
}

// Records: annotations, the pass 3 approval map, the where-used ledger.
const annPath = path.join(REC, `download-${map.batch}`, 'annotations.json');
const annRec = JSON.parse(fs.readFileSync(annPath, 'utf8'));
const known = new Set(annRec.works.map((a) => a.assetKey));
for (const p of PICKED) { const a = ANN.get(p.assetKey); if (a && !known.has(a.assetKey)) annRec.works.push({ ...a, pass: 3 }); }
fs.writeFileSync(annPath, JSON.stringify(annRec, null, 1) + '\n');
fs.writeFileSync(path.join(REC, 'pass3-map.json'), JSON.stringify({
  record: 'Visit Victoria pass 3 approvals',
  approvedBy: 'james (comprehensive implementation approved 2026-09-29: "go for it")',
  approvedAt: new Date().toISOString(),
  altBy: 'claude-vision-draft',
  writtenBy: 'ops/scripts/visit-victoria/apply-pass3.mjs',
  approved, rejected,
}, null, 1) + '\n');
const lp = path.join(REC, 'placements.json');
const ledger = JSON.parse(fs.readFileSync(lp, 'utf8'));
ledger.placements = [...ledger.placements.filter((p) => p.pass !== 3), ...placements];
ledger.pass3At = new Date().toISOString();
fs.writeFileSync(lp, JSON.stringify(ledger, null, 1) + '\n');
console.log(`derivatives made ${made}; placements ${placements.length}; rejected ${rejected.length}`);
