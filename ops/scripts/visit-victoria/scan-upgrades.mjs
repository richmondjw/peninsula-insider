#!/usr/bin/env node
/**
 * scan-upgrades.mjs - the standing image upgrade scan.
 *
 * Answers, for James's weekly review, "where could the licensed Visit Victoria
 * library honestly improve the site now?" in three lists:
 *
 *   ready     upgrades that use photographs already on the site, found by the
 *             pass 2 planner (apply-pass2.mjs in dry-run mode): weak heroes
 *             on articles and events, town, plan and region galleries,
 *             entity heroes. Nothing is changed.
 *   suggest   Works in the download not yet on the site whose subject matches
 *             an existing page. They need approval, alt text and a derivative
 *             (apply-pass3.mjs) before use.
 *   listings  subjects in the download with no page on the site: candidates for
 *             new listings, which need verified facts before anything else.
 *
 * Writes ops/reports/visit-victoria/upgrade-scan.{json,md} (regenerable reports)
 * and prints a one-line summary plus a fingerprint so a scheduled job can tell
 * whether anything changed since the last run.
 *
 *   node ops/scripts/visit-victoria/scan-upgrades.mjs
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REC = path.join(REPO, 'ops/records/visit-victoria');
const OUT = path.join(REPO, 'ops/reports/visit-victoria');
const C = path.join(REPO, 'next/src/content');

// 1. Ready: the pass 2 planner, dry run.
execFileSync(process.execPath, [path.join(REPO, 'ops/scripts/visit-victoria/apply-pass2.mjs')], { stdio: 'ignore' });
const p2 = JSON.parse(fs.readFileSync(path.join(OUT, 'pass2.json'), 'utf8')).report;
const ready = {
  entityHeroes: p2.heroUpgrades,
  articleHeroes: p2.articles,
  eventHeroes: p2.events,
  galleries: [...p2.placeGalleries, ...p2.itineraries, ...p2.regions].filter((l) => !/: \+0 photographs/.test(l)),
};

// 2 and 3. Unplaced Works, matched to pages by name.
const map = JSON.parse(fs.readFileSync(path.join(REC, 'entity-map.json'), 'utf8'));
const works = JSON.parse(fs.readFileSync(path.join(REC, `download-${map.batch}`, 'catalogue.json'), 'utf8')).works;
const ledger = JSON.parse(fs.readFileSync(path.join(REC, 'placements.json'), 'utf8'));
const placed = new Set(ledger.placements.map((p) => p.assetKey));
// Rejections from every approval record (entity-map.json and each *-map.json).
const rejected = new Set(fs.readdirSync(REC).filter((f) => f.endsWith('map.json'))
  .flatMap((f) => (JSON.parse(fs.readFileSync(path.join(REC, f), 'utf8')).rejected ?? []).map((r) => r.assetKey)));
const STOP = new Set(['the', 'at', 'and', 'of', 'a', 'in', 'on', 'mornington', 'peninsula', 'estate', 'golf', 'course', 'winery', 'hotel', 'club', 'links']);
const toks = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
const pages = [];
for (const coll of ['venues', 'experiences', 'tour-operators', 'tours', 'places']) {
  const dir = path.join(C, coll);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (d.status && /closed/i.test(d.status)) continue;
    const t = toks(d.name);
    if (t.length) pages.push({ key: `${coll}/${d.slug}`, name: d.name, t });
  }
}
// A town name alone is not a match for a business ("Hotel Sorrento" is not
// every photograph of Sorrento), so a non-place page must share a word that is
// not a place name, and "Port Phillip" names the bay, not an estate.
const placeTokens = new Set([...pages.filter((p) => p.key.startsWith('places/')).flatMap((p) => p.t), 'port', 'phillip', 'bay', 'beach']);
function match(subject) {
  const st = toks(subject);
  let best = null;
  for (const p of pages) {
    if (!p.key.startsWith('places/') && !p.t.some((t) => !placeTokens.has(t))) continue;
    const inter = p.t.filter((t) => st.includes(t)).length;
    const score = inter / p.t.length;
    if (inter && score >= 0.99 && (!best || p.t.length > best.p.t.length)) best = { p, score };
  }
  return best?.p ?? null;
}
// Approved placements are the strongest evidence: a subject already placed on a
// page (first placement on an entity, not an article or event) maps its unplaced
// siblings to that page.
const bySubject = new Map();
const worksByKey = new Map(works.map((w) => [w.assetKey, w]));
for (const p of ledger.placements) {
  if (p.pass === 2 || /^(articles|events|regions|itineraries)\//.test(p.entity)) continue;
  const w = worksByKey.get(p.assetKey);
  const page = pages.find((x) => x.key === p.entity);
  if (w && page && !bySubject.has(w.subject)) bySubject.set(w.subject, page);
}
const suggest = new Map(); const listings = new Map();
for (const w of works) {
  if (w.status !== 'available' || w.identicalTo || placed.has(w.assetKey) || rejected.has(w.assetKey)) continue;
  const page = bySubject.get(w.subject) ?? match(w.subject);
  const bucket = page ? suggest : listings;
  const k = page ? page.key : w.subject;
  if (!bucket.has(k)) bucket.set(k, { page: page?.name ?? null, subjects: new Set(), works: [] });
  bucket.get(k).subjects.add(w.subject);
  bucket.get(k).works.push(w.assetKey);
}
const toList = (m) => [...m].map(([k, v]) => ({ key: k, page: v.page, subjects: [...v.subjects], count: v.works.length, sample: v.works.slice(0, 5) }))
  .sort((a, b) => b.count - a.count);
const suggestList = toList(suggest);
const listingList = toList(listings);

const counts = {
  ready: Object.values(ready).reduce((n, l) => n + l.length, 0),
  suggestWorks: suggestList.reduce((n, s) => n + s.count, 0),
  suggestPages: suggestList.length,
  listingSubjects: listingList.length,
};
const fingerprint = crypto.createHash('sha1').update(JSON.stringify({ ready, s: suggestList.map((s) => [s.key, s.count]), l: listingList.map((l) => l.key) })).digest('hex').slice(0, 12);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'upgrade-scan.json'), JSON.stringify({ generatedAt: new Date().toISOString(), fingerprint, counts, ready, suggest: suggestList, listings: listingList }, null, 1) + '\n');
const md = [
  `# Visit Victoria image upgrade scan`, '',
  `Generated ${new Date().toISOString()} by \`ops/scripts/visit-victoria/scan-upgrades.mjs\`. Fingerprint \`${fingerprint}\`.`, '',
  `- **Ready** (photographs already on the site): ${counts.ready}. Apply with \`node ops/scripts/visit-victoria/apply-pass2.mjs --write\`, then build.`,
  `- **Suggest** (in the download, need approval and alt text): ${counts.suggestWorks} Works for ${counts.suggestPages} existing pages.`,
  `- **New-listing candidates** (subjects with no page): ${counts.listingSubjects}.`, '',
  '## Ready', '',
  ...Object.entries(ready).flatMap(([k, l]) => (l.length ? [`### ${k} (${l.length})`, ...l.map((x) => `- ${x}`), ''] : [])),
  '## Suggest', '',
  ...suggestList.map((s) => `- \`${s.key}\` (${s.page}): ${s.count} Works, e.g. ${s.sample.join(', ')}`), '',
  '## New-listing candidates', '',
  ...listingList.map((l) => `- ${l.key}: ${l.count} Works`), '',
];
fs.writeFileSync(path.join(OUT, 'upgrade-scan.md'), md.join('\n'));
console.log(`upgrade scan ${fingerprint}: ready ${counts.ready}, suggest ${counts.suggestWorks} Works for ${counts.suggestPages} pages, new-listing candidates ${counts.listingSubjects}. Report: ops/reports/visit-victoria/upgrade-scan.md`);
