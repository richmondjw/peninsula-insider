#!/usr/bin/env node
/**
 * audit-coordinates-landmask.mjs - the fine-grained half of the map
 * accuracy fix (2026-08-21). lint-coordinates.mjs only checks that a
 * coordinate is somewhere within the Peninsula bounding box; it can't
 * tell land from water (that's exactly how the Point Nepean pins ended
 * up in the bay while still passing the bounding-box check).
 *
 * This reverse-geocodes every venue/experience/place coordinate against
 * OpenStreetMap Nominatim and flags anything that resolves to water,
 * a coastline, or nothing at all.
 *
 * NOT wired into `npm run build`: it's a network call per entry with a
 * mandatory rate limit (OSM's usage policy caps the public Nominatim
 * instance at 1 request/second and requires an identifying User-Agent -
 * both honoured below), so a full run takes ~4 minutes for the current
 * ~218 entries and would be a bad addition to every deploy. Run this
 * on demand or wire it into a periodic job (matches the cron-assert.py
 * pattern already used elsewhere in this org) instead.
 *
 * Usage: node scripts/audit-coordinates-landmask.mjs
 * Writes a report to ../ops/reports/map-coordinates-landmask-<date>.md
 * and exits 0 always (this is an audit, not a build gate) - read the
 * report / console output for findings.
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'src', 'content');
const reportsDir = join(here, '..', '..', 'ops', 'reports');

const COLLECTIONS = ['venues', 'experiences', 'places'];
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'PeninsulaInsiderCoordinateAudit/1.0 (internal editorial data-quality check)';
const RATE_LIMIT_MS = 1100; // OSM Nominatim usage policy: max 1 req/sec, padded

// class/type pairs Nominatim returns for open water, bays, straits etc.
// (a hit here means the coordinate reverse-geocodes to water, not land)
function isWaterResult(result) {
  if (!result) return true; // no result at all - almost always open water
  const { class: cls, type } = result;
  if (cls === 'natural' && ['water', 'bay', 'strait', 'coastline', 'reef'].includes(type)) return true;
  if (cls === 'waterway') return true;
  if (cls === 'place' && type === 'sea') return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status} for ${lat},${lng}`);
  }
  const body = await res.json();
  // Nominatim returns {} (no error field, empty object) when there's no result.
  if (!body || Object.keys(body).length === 0 || body.error) return null;
  return body;
}

function loadEntries() {
  const entries = [];
  for (const collection of COLLECTIONS) {
    const dir = join(contentDir, collection);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      const coords = data.coordinates;
      if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
        entries.push({ collection, file, name: data.name, address: data.address ?? '', coords });
      }
    }
  }
  return entries;
}

async function main() {
  const entries = loadEntries();
  console.log(`audit-coordinates-landmask: reverse-geocoding ${entries.length} entries (rate-limited, ~${Math.ceil(entries.length * RATE_LIMIT_MS / 1000 / 60)} min)...\n`);

  const flagged = [];
  const errored = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const { lat, lng } = entry.coords;
    process.stdout.write(`  [${i + 1}/${entries.length}] ${entry.collection}/${entry.file}... `);
    try {
      const result = await reverseGeocode(lat, lng);
      if (isWaterResult(result)) {
        const label = result ? `${result.class}/${result.type} ("${result.display_name}")` : 'no reverse match';
        console.log(`WATER (${label})`);
        flagged.push({ ...entry, reverse: result, reason: label });
      } else {
        console.log(`OK (${result.class}/${result.type})`);
      }
    } catch (err) {
      console.log(`ERROR (${err.message})`);
      errored.push({ ...entry, error: err.message });
    }
    if (i < entries.length - 1) await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n${flagged.length} flagged as water/no-match, ${errored.length} lookup errors, ${entries.length - flagged.length - errored.length} confirmed on land.\n`);

  const date = new Date().toISOString().slice(0, 10);
  const reportPath = join(reportsDir, `map-coordinates-landmask-${date}.md`);
  mkdirSync(reportsDir, { recursive: true });

  const lines = [];
  lines.push(`# Map coordinate land-mask audit — ${date}`);
  lines.push('');
  lines.push(`Reverse-geocoded ${entries.length} venue/experience/place coordinates against OpenStreetMap Nominatim. This is the fine-grained follow-up to \`lint:coordinates\` (bounding box only) - see that script's header comment for why both exist.`);
  lines.push('');
  lines.push(`**${flagged.length} flagged as water or no reverse match. ${errored.length} lookup errors (network/rate-limit, not necessarily bad data — re-run to confirm).**`);
  lines.push('');
  if (flagged.length) {
    lines.push('## Flagged (likely in water)');
    lines.push('');
    for (const f of flagged) {
      lines.push(`- **${f.name}** (\`${f.collection}/${f.file}\`) — (${f.coords.lat}, ${f.coords.lng})`);
      lines.push(`  - address on file: ${f.address || '(none)'}`);
      lines.push(`  - reverse geocode: ${f.reason}`);
    }
    lines.push('');
  }
  if (errored.length) {
    lines.push('## Lookup errors (re-run to confirm - not a finding)');
    lines.push('');
    for (const e of errored) {
      lines.push(`- **${e.name}** (\`${e.collection}/${e.file}\`) — ${e.error}`);
    }
    lines.push('');
  }
  writeFileSync(reportPath, lines.join('\n') + '\n');
  console.log(`Report written to ${reportPath}`);
}

main().catch((err) => {
  console.error('audit-coordinates-landmask: fatal error', err);
  process.exit(1);
});
