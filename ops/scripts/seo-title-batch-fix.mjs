#!/usr/bin/env node
/**
 * One-shot batch: trim remaining Astro page titles to ≤60 chars.
 * Stage 1 of the SEO plan. Idempotent — if the title already matches the
 * target, the file is left alone.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const REPLACEMENTS = [
  // Journal hub pages
  ['next/src/pages/journal/best-brunch-mornington-peninsula.astro',
    'Best Brunch Mornington Peninsula 2026 | Peninsula Insider',
    'Best Brunch Mornington Peninsula · Peninsula Insider'],
  ['next/src/pages/journal/dog-friendly-mornington-peninsula.astro',
    'Dog-Friendly Mornington Peninsula 2026 — Beaches, Cafes & Stays | Peninsula Insider',
    'Dog-Friendly Mornington Peninsula · Peninsula Insider'],
  ['next/src/pages/journal/free-things-to-do-mornington-peninsula.astro',
    'Free Things to Do Mornington Peninsula 2026 | Peninsula Insider',
    'Free Things to Do Mornington Peninsula · Peninsula Insider'],
  ['next/src/pages/journal/mornington-peninsula-day-trip.astro',
    'Mornington Peninsula Day Trip from Melbourne 2026 | Peninsula Insider',
    'Mornington Peninsula Day Trip from Melbourne · Peninsula Insider'],
  ['next/src/pages/journal/mornington-peninsula-hot-springs-guide.astro',
    'Mornington Peninsula Hot Springs Guide 2026 | Peninsula Insider',
    'Mornington Peninsula Hot Springs Guide · Peninsula Insider'],
  ['next/src/pages/journal/mornington-peninsula-in-autumn.astro',
    'Mornington Peninsula in Autumn 2026 — What to Do & See | Peninsula Insider',
    'Mornington Peninsula in Autumn · Peninsula Insider'],
  ['next/src/pages/journal/mornington-peninsula-in-winter.astro',
    'Mornington Peninsula in Winter 2026 — What to Do | Peninsula Insider',
    'Mornington Peninsula in Winter · Peninsula Insider'],
  ['next/src/pages/journal/mornington-peninsula-itinerary.astro',
    'Mornington Peninsula Itinerary 2026 — Best 3-Day Plan | Peninsula Insider',
    'Mornington Peninsula Itinerary · Peninsula Insider'],
  ['next/src/pages/journal/mornington-peninsula-wedding-venues.astro',
    'Mornington Peninsula Wedding Venues 2026 | Peninsula Insider',
    'Mornington Peninsula Wedding Venues · Peninsula Insider'],
  ['next/src/pages/journal/mornington-peninsula-winery-tour.astro',
    'Mornington Peninsula Winery Tour 2026 — Self-Drive Guide | Peninsula Insider',
    'Mornington Peninsula Winery Tour · Peninsula Insider'],
  ['next/src/pages/journal/mornington-peninsula-with-kids.astro',
    'Mornington Peninsula with Kids 2026 — Family Guide | Peninsula Insider',
    'Mornington Peninsula with Kids · Peninsula Insider'],
  // Best-of hubs
  ['next/src/pages/eat/best-restaurants.astro',
    'Best Restaurants Mornington Peninsula 2026 | Peninsula Insider',
    'Best Restaurants Mornington Peninsula · Peninsula Insider'],
  ['next/src/pages/stay/best-accommodation.astro',
    'Best Accommodation Mornington Peninsula 2026 | Peninsula Insider',
    'Best Accommodation Mornington Peninsula · Peninsula Insider'],
  ['next/src/pages/wine/best-cellar-doors.astro',
    'Best Cellar Doors Mornington Peninsula 2026 | Peninsula Insider',
    'Best Cellar Doors Mornington Peninsula · Peninsula Insider'],
  ['next/src/pages/explore/best-walks.astro',
    'Best Walks Mornington Peninsula 2026 | Peninsula Insider',
    'Best Walks on the Mornington Peninsula · Peninsula Insider'],
  // Journal index
  ['next/src/pages/journal/index.astro',
    'Mornington Peninsula Travel Guide — Journal | Peninsula Insider',
    'Mornington Peninsula Journal · Peninsula Insider'],
];

let changed = 0, skipped = 0, missing = 0;
for (const [file, from, to] of REPLACEMENTS) {
  const path = resolve(ROOT, file);
  let src;
  try { src = readFileSync(path, 'utf8'); } catch { missing++; console.log(`MISSING: ${file}`); continue; }
  if (!src.includes(from)) {
    if (src.includes(to)) { skipped++; console.log(`ok (already fixed): ${file}`); }
    else { missing++; console.log(`SOURCE NOT FOUND: ${file}\n  expected: ${from}`); }
    continue;
  }
  writeFileSync(path, src.replace(from, to), 'utf8');
  console.log(`fixed (${to.length} chars): ${file}`);
  changed++;
}
console.log(`\nChanged: ${changed}, skipped: ${skipped}, missing: ${missing}`);
