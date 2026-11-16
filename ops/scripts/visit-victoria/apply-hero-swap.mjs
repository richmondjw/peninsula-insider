#!/usr/bin/env node
/**
 * apply-hero-swap.mjs - Search Console batch 5 (approved by James 2026-09-30:
 * "proceed" on retiring his CMS hero uploads for regions and towns).
 *
 * Seven region and town heroes take a Visit Victoria photograph already on the
 * site: the frame moves out of the entity's gallery (so it never shows twice)
 * or is copied from the place page that holds it. Their published
 * pi.cms_image_slots hero overrides (which win on the live site and carry no
 * alt, credit or licence) are set to draft by SQL run separately; this script
 * records them in the ledger's cmsRetired list and rewrites cmsRestoreSql so
 * every retirement is one statement away from undone.
 *
 * Rye is left alone: no Work in the library shows the town itself.
 *
 *   node ops/scripts/visit-victoria/apply-hero-swap.mjs [--write]
 *
 * House rules: no em-dashes, no exclamation marks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const C = path.join(REPO, 'next/src/content');
const LEDGER = path.join(REPO, 'ops/records/visit-victoria/placements.json');
const WRITE = process.argv.includes('--write');
const PROJECT = 'tjjhpvslpysfklwpqmgz';

// entity: [asset key, entity holding it, CMS override rows to retire]
const PLAN = {
  'regions/mornington-bay-coast': ['vv-163846', 'places/mornington', [['7e23953d-40a0-4932-8e28-cc3a567c23bf', 'heroImage', 'region/mornington-bay-coast/heroImage-1780528162705.jpg']]],
  'regions/ocean-coast': ['vv-161977', 'places/cape-schanck', [['4c080d95-d427-4c6e-bb4b-eab74abc19b0', 'heroImage', 'region/ocean-coast/heroImage-1780362788531.jpg']]],
  'regions/peninsula-tip': ['vv-22100103', 'regions/peninsula-tip', [['5bfee2e9-0667-47a3-aaea-ffac7c807bea', 'heroImage', 'region/peninsula-tip/heroImage-1780362840240.jpg']]],
  'places/cape-schanck': ['vv-161976', 'places/cape-schanck', [
    ['d94a6aae-b98b-4b12-b39e-190ecec580a1', 'hero', 'place/cape-schanck/hero-1778509901648.jpg'],
    ['03b932f0-9ae4-43c5-8daa-6a1a9ff48204', 'heroImage', 'place/cape-schanck/heroImage-1780312174603.jpg'],
  ]],
  'places/mornington': ['vv-163841', 'places/mornington', [['01e20bc3-9bdf-456a-81ef-e1aaee148686', 'hero', 'place/mornington/hero-1778505125440.jpg']]],
  'places/red-hill': ['vv-160356', 'places/red-hill', [['3599b538-820a-4dea-af49-6dc7513539e8', 'hero', 'place/red-hill/hero-1778769595300.jpg']]],
  'places/merricks': ['vv-25061244', 'places/merricks', [['f6c989b5-0e88-416b-8109-30b468ee2012', 'hero', 'place/merricks/hero-1778970156223.jpg']]],
};

const readRaw = (k) => fs.readFileSync(path.join(C, `${k}.json`), 'utf8');
const holds = (d, key) => [d.heroImage, ...(d.gallery ?? [])].find((r) => r?.license === 'visit-victoria' && r.src.includes(`/${key}-`));
const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const retiredAt = new Date().toISOString();

for (const [entity, [key, source, rows]] of Object.entries(PLAN)) {
  const raw = readRaw(entity);
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const d = JSON.parse(raw);
  const ref = holds(entity === source ? d : JSON.parse(readRaw(source)), key);
  if (!ref) throw new Error(`${entity}: ${key} not on ${source}`);
  const was = d.heroImage?.src;
  d.heroImage = { ...ref, depictionStatus: 'actual' };
  d.gallery = (d.gallery ?? []).filter((g) => g.src !== ref.src);
  console.log(`${entity.padEnd(30)} hero ${key} (was ${was}); gallery ${d.gallery.length}; retire ${rows.length} override(s)`);
  if (!WRITE) continue;
  fs.writeFileSync(path.join(C, `${entity}.json`), (JSON.stringify(d, null, 2) + '\n').replace(/\n/g, eol));
  const [collection, slug] = entity.split('/');
  for (const [id, fieldPath, storagePath] of rows) {
    if (ledger.cmsRetired.some((r) => r.id === id)) continue;
    ledger.cmsRetired.push({
      id, table: 'pi.cms_image_slots', project: PROJECT,
      entityType: collection === 'regions' ? 'region' : 'place', entitySlug: slug, fieldPath,
      publicUrl: `https://${PROJECT}.supabase.co/storage/v1/object/public/cms-assets/${storagePath}`,
      previousStatus: 'published', newStatus: 'draft', retiredAt,
      reason: 'Search Console batch 5: replaced by a licensed Visit Victoria hero at James\'s direction (2026-09-30); the upload had no alt text, credit or licence recorded.',
    });
  }
}
if (WRITE) {
  ledger.cmsRestoreSql = `update pi.cms_image_slots set status = 'published', updated_at = now() where id in (${ledger.cmsRetired.map((r) => `'${r.id}'`).join(', ')});`;
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
  console.log(`ledger: ${ledger.cmsRetired.length} retired overrides recorded`);
} else console.log('dry run');
