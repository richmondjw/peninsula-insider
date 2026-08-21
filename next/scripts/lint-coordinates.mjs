#!/usr/bin/env node
/**
 * lint-coordinates.mjs - sanity-check every venue/experience/place
 * coordinate against a bounding box for the Mornington Peninsula.
 *
 * The content schema only checks that lat/lng are valid coordinates
 * anywhere on Earth (-90..90 / -180..180) - nothing checks that a
 * Peninsula Insider entry is actually ON the Peninsula. This catches
 * gross errors: wrong sign, transposed digits, wrong suburb entirely,
 * a coordinate typed into the wrong field.
 *
 * This is a COARSE gate, not a land/water check. A coordinate can
 * pass this script and still be in the bay - see the Point Nepean
 * incident (2026-08-21): four entries were geocoded from a park-level
 * address rather than the specific site, which was within bounds but
 * landed pins in the water because Point Nepean is a narrow spit.
 * Catching that class of error needs a coastline/land-mask check
 * (reverse-geocode each coordinate and diff against the stored
 * `address`, or a point-in-polygon test against an OSM coastline) -
 * out of scope for this script, flagged as a follow-up.
 *
 * Usage: node scripts/lint-coordinates.mjs   (from next/)
 * Exits 1 on any entry outside the box.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'src', 'content');

// Generous bounding box around the Mornington Peninsula (roughly Mount
// Eliza to Cape Schanck to Hastings/Somers), padded ~10-15km beyond the
// current dataset's real extremes so ordinary new entries don't false-
// positive. Tightening this further would need real geographic care.
const LAT_MIN = -38.6;
const LAT_MAX = -38.1;
const LNG_MIN = 144.6;
const LNG_MAX = 145.35;

// The three collections that actually render on /map/ (map.astro).
// Other collections (events, regions, fishingLocations, boatRamps,
// boatHire) also have a coordinates field but aren't on the map today;
// add them here if that changes.
const COLLECTIONS = ['venues', 'experiences', 'places'];

const failures = [];
let checked = 0;

for (const collection of COLLECTIONS) {
  const dir = join(contentDir, collection);
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    console.error(`lint-coordinates: could not read ${dir}`);
    process.exit(1);
  }

  for (const file of files) {
    const path = join(dir, file);
    let data;
    try {
      data = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      failures.push(`${collection}/${file}: invalid JSON (${err.message})`);
      continue;
    }

    const coords = data.coordinates;
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      continue; // coordinates are optional/absent on some entries - not this script's concern
    }

    checked++;
    const { lat, lng } = coords;
    if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
      failures.push(
        `${collection}/${file}: (${lat}, ${lng}) is outside the Mornington Peninsula bounding box ` +
        `(lat ${LAT_MIN}..${LAT_MAX}, lng ${LNG_MIN}..${LNG_MAX})`,
      );
    }
  }
}

console.log(`coordinate bounds: checked ${checked} entries across ${COLLECTIONS.join(', ')}`);

if (failures.length) {
  console.error('\nFAIL:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('OK: all coordinates within the Peninsula bounding box.');
