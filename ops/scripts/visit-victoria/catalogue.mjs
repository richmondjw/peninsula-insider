#!/usr/bin/env node
/**
 * catalogue.mjs
 *
 * Reads a folder of Works downloaded from the Victoria Content Hub and writes one
 * catalogue row per Work: Visit Victoria asset id, sha256, dimensions, the rights
 * text embedded in the file, the creator, a normalised subject, the region, and the
 * exclusions the house rules demand (ops/records/visit-victoria/README.md).
 *
 * The embedded metadata is read because the licence requires us to comply with the
 * restrictions carried in it. The catalogue exists so the editorial team, and the
 * internal tools that support it, can choose approved assets (clarification Q1).
 * It is never a training set.
 *
 * Deterministic: no network, no model. The download folder lives outside the tree,
 * so the output is a record, not a report. Writing it is a deliberate act:
 *
 *   node ops/scripts/visit-victoria/catalogue.mjs --source "<dir>"                 # summary only
 *   node ops/scripts/visit-victoria/catalogue.mjs --source "<dir>" --batch 2026-09-28 --write
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const SOURCE = arg('--source');
const BATCH = arg('--batch') || '2026-09-28';
const WRITE = args.includes('--write');
const NO_HASH = args.includes('--no-hash');
if (!SOURCE) { console.error('usage: catalogue.mjs --source <dir> [--batch YYYY-MM-DD] [--write] [--no-hash]'); process.exit(2); }

// Subject spelling fixes seen in the 2026-09-28 download. Filename subject wins over
// the embedded title, which carries typos ("Aba Thermal Springs").
const SUBJECT_FIXES = [
  [/\bKackalope\b/i, 'Jackalope'],
  [/\bEpicurian\b/i, 'Epicurean'],
  [/\bJimmyRum\b/i, 'Jimmy Rum'],
  [/^Enchanted Adventures$/i, 'Enchanted Adventure'],
];

// Subjects that must never be placed. Reason is carried into the row.
const EXCLUDE = [
  { test: /\bMax's at Red Hill\b/i, reason: 'venue permanently closed' },
];

// Region: the licence only permits promoting the region a Work was taken in.
const REGION_RULES = [
  { test: /\b(Curlewis|Bellarine)\b/i, region: 'bellarine-peninsula' },
  { test: /\bMcClelland\b/i, region: 'greater-frankston' },
];
const PENINSULA_CITY = /MORNINGTON PENINSULA/i;

const PEOPLE = /\b(couple|friends?|women|woman|men|man|people|family|families|kids?|child(ren)?|girls?|boys?|group|guests?|lady|ladies|golfers?|diners?|swimmers?|bathers?)\b/i;

function readHead(p, n) {
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(n);
  const got = fs.readSync(fd, buf, 0, n, 0);
  fs.closeSync(fd);
  return buf.subarray(0, got);
}

function jpegDims(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

function tiffDims(p) {
  const fd = fs.openSync(p, 'r');
  const rd = (off, n) => { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, off); return b; };
  try {
    const hdr = rd(0, 8);
    const le = hdr.toString('ascii', 0, 2) === 'II';
    const r16 = (b, o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
    const r32 = (b, o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
    const ifd = r32(hdr, 4);
    const n = r16(rd(ifd, 2), 0);
    const entries = rd(ifd + 2, n * 12);
    let w = null, h = null;
    for (let k = 0; k < n; k++) {
      const e = k * 12; const tag = r16(entries, e); const type = r16(entries, e + 2);
      const v = type === 3 ? r16(entries, e + 8) : r32(entries, e + 8);
      if (tag === 256) w = v; if (tag === 257) h = v;
    }
    return w && h ? { w, h } : null;
  } finally { fs.closeSync(fd); }
}

function tiffXmp(p) {
  // XMP in these TIFFs sits near the end of the file; scan the tail.
  const size = fs.statSync(p).size;
  const n = Math.min(size, 4_000_000);
  const fd = fs.openSync(p, 'r');
  const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, size - n); fs.closeSync(fd);
  return b.toString('latin1');
}

const decode = (s) => s == null ? null : s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#xA;/g, '\n').replace(/&amp;/g, '&')
  .replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim() || null;
const attr = (x, name) => { const m = x.match(new RegExp(`${name}="([^"]*)"`)); return m ? decode(m[1]) : null; };
const el = (x, name) => { const m = x.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? m[1] : null; };
const lis = (s) => s ? [...s.matchAll(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/g)].map((m) => decode(m[1])).filter(Boolean) : [];
const one = (x, name) => attr(x, name) ?? (lis(el(x, name))[0] ?? decode(el(x, name)?.replace(/<[^>]+>/g, '')) ?? null);

function sha256(p) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(p, 'r'); const b = Buffer.alloc(8 << 20); let n;
  while ((n = fs.readSync(fd, b, 0, b.length, null)) > 0) h.update(b.subarray(0, n));
  fs.closeSync(fd);
  return h.digest('hex');
}

function normaliseSubject(base) {
  let s = base.replace(/[ _-]*\d{5,}\s*$/, '').replace(/\s*-\s*$/, '').trim();
  for (const [re, rep] of SUBJECT_FIXES) s = s.replace(re, rep);
  return s;
}

const files = fs.readdirSync(SOURCE).filter((f) => /\.(jpe?g|tiff?)$/i.test(f)).sort();
const rows = [];
const seenIds = new Map();
for (const [i, f] of files.entries()) {
  const p = path.join(SOURCE, f);
  const isTif = /\.tiff?$/i.test(f);
  const bytes = fs.statSync(p).size;
  const head = isTif ? null : readHead(p, 2_000_000);
  const s = isTif ? tiffXmp(p) : head.toString('latin1');
  const a = s.indexOf('<x:xmpmeta'); const b = s.indexOf('</x:xmpmeta>');
  const x = a >= 0 && b > a ? Buffer.from(s.slice(a, b), 'latin1').toString('utf8') : '';
  let dims = null;
  try { dims = isTif ? tiffDims(p) : jpegDims(head); } catch { dims = null; }
  const base = f.replace(/\.(jpe?g|tiff?)$/i, '');
  const id = base.match(/(\d{5,})\s*$/)?.[1] ?? null;
  const subject = normaliseSubject(base);
  const keywords = lis(el(x, 'dc:subject'));
  const creator = lis(el(x, 'dc:creator')).join('; ') || null;
  const rightsText = one(x, 'dc:rights');
  const usageTerms = one(x, 'xmpRights:UsageTerms');
  const embeddedCity = attr(x, 'photoshop:City');
  const title = one(x, 'dc:title');
  const description = one(x, 'dc:description');
  const hay = [subject, title, description, ...keywords].filter(Boolean).join(' | ');

  let region = 'mornington-peninsula';
  for (const r of REGION_RULES) if (r.test.test(hay)) { region = r.region; break; }
  const regionTagConflict = !!(embeddedCity && !PENINSULA_CITY.test(embeddedCity) && region === 'mornington-peninsula');

  const excluded = EXCLUDE.find((e) => e.test.test(subject));
  const w = dims?.w ?? null; const h = dims?.h ?? null;
  const q = w && h ? w / h : null;
  const kw = keywords.join(' ').toLowerCase();

  const row = {
    assetKey: id ? `vv-${id}` : `vv-file-${crypto.createHash('sha1').update(f).digest('hex').slice(0, 10)}`,
    vvAssetId: id,
    file: f,
    bytes,
    sha256: NO_HASH ? null : sha256(p),
    width: w, height: h,
    orientation: q == null ? null : q > 1.05 ? 'landscape' : q < 0.95 ? 'portrait' : 'square',
    subject,
    embeddedTitle: title,
    embeddedDescription: description,
    keywords,
    creator,
    rightsText,
    usageTerms,
    embeddedCity,
    region,
    regionTagConflict,
    dateCreated: attr(x, 'photoshop:DateCreated') ?? attr(x, 'xmp:CreateDate'),
    peopleSignal: PEOPLE.test(hay) ? 'yes' : keywords.length ? 'none-in-metadata' : 'unknown',
    shotHint: /\b(aerial|drone)\b/.test(kw) ? 'aerial'
      : /\b(food|dining|lunch|dinner|produce|dish|breakfast)\b/.test(kw) ? 'food'
      : /\binterior\b/.test(kw) ? 'interior' : null,
    seasonHint: ['spring', 'summer', 'autumn', 'winter'].find((sn) => kw.includes(sn)) ?? null,
    firstNationsSignal: /\b(aboriginal|indigenous|first nations|traditional owner|boon ?wurrung|bunurong)\b/i.test(hay),
    credit: creator ? `Photo: ${creator.replace(/;.*/, '').trim()}, courtesy of Visit Victoria` : 'Photo courtesy of Visit Victoria',
    status: excluded ? 'excluded' : region !== 'mornington-peninsula' ? 'out-of-region' : 'available',
    statusReason: excluded?.reason ?? (region !== 'mornington-peninsula' ? `taken in ${region}; may only promote that region` : null),
  };
  if (row.vvAssetId) {
    if (seenIds.has(row.vvAssetId)) row.duplicateOf = seenIds.get(row.vvAssetId);
    else seenIds.set(row.vvAssetId, f);
  }
  rows.push(row);
  if (!NO_HASH && (i + 1) % 100 === 0) process.stderr.write(`hashed ${i + 1}/${files.length}\n`);
}

// Byte-identical files under different names.
const byHash = new Map();
for (const r of rows) if (r.sha256) {
  if (byHash.has(r.sha256)) r.identicalTo = byHash.get(r.sha256);
  else byHash.set(r.sha256, r.file);
}

const count = (pred) => rows.filter(pred).length;
const subjects = [...new Set(rows.map((r) => r.subject))];
const summary = {
  works: rows.length,
  subjects: subjects.length,
  available: count((r) => r.status === 'available'),
  outOfRegion: count((r) => r.status === 'out-of-region'),
  excluded: count((r) => r.status === 'excluded'),
  regionTagConflict: count((r) => r.regionTagConflict),
  withCreator: count((r) => r.creator),
  withEmbeddedRights: count((r) => r.rightsText || r.usageTerms),
  peopleSignal: count((r) => r.peopleSignal === 'yes'),
  peopleUnknown: count((r) => r.peopleSignal === 'unknown'),
  firstNationsSignal: count((r) => r.firstNationsSignal),
  duplicateAssetIds: count((r) => r.duplicateOf),
  byteIdentical: count((r) => r.identicalTo),
  missingDimensions: count((r) => !r.width),
};
console.log(JSON.stringify(summary, null, 2));

if (WRITE) {
  const dir = path.join(REPO, 'ops/records/visit-victoria', `download-${BATCH}`);
  fs.mkdirSync(dir, { recursive: true });
  const record = {
    record: 'Victoria Content Hub download catalogue',
    batch: BATCH,
    writtenBy: `ops/scripts/visit-victoria/catalogue.mjs --write (${process.env.USERNAME || process.env.USER || 'unknown'})`,
    writtenAt: new Date().toISOString(),
    sourceFolder: SOURCE,
    terms: 'ops/records/visit-victoria/content-hub-terms-2026-09-21.md',
    clarification: 'ops/records/visit-victoria/clarification-2026-09-29.md',
    note: 'Originals are not in git. A row is evidence the Work was downloaded under the recorded terms; placement still needs an approved entity-map entry.',
    summary,
    works: rows,
  };
  fs.writeFileSync(path.join(dir, 'catalogue.json'), JSON.stringify(record, null, 1) + '\n');
  console.log(`wrote ${path.join(dir, 'catalogue.json')}`);
}
