#!/usr/bin/env node
/**
 * Comprehensive venue image fix — round 2.
 * Fixes: blocked stay images, dedicated-image mismatches, pub geographic
 * images, pubs/cafes/bakeries/breweries/producers/markets/restaurants
 * with cross-venue duplicates on /eat/ and /stay/.
 */
const fs = require('fs');
const path = require('path');
const BASE = 'src/content/venues';

// [slug, src, alt, credit, license]
const FIXES = [
  // ─── STAY VENUES ──────────────────────────────────────────────────────────
  // Real venue photos (actual buildings)
  ['hotel-sorrento',
   '/images/sourced/venue-sorrento-hotel-01.webp',
   'Hotel Sorrento — historic heritage building, Sorrento, Mornington Peninsula',
   'Biatch / Wikimedia Commons (Public Domain)', 'wikimedia-cc0'],
  ['the-continental-sorrento',
   '/images/sourced/venue-continental-sorrento-01.webp',
   'The Continental Hotel, Sorrento — landmark heritage façade on the Mornington Peninsula',
   'Blstch / Wikimedia Commons (Public Domain)', 'wikimedia-cc0'],
  ['flinders-hotel',
   '/images/sourced/venue-flinders-hotel-01.webp',
   'Flinders Hotel — the iconic country pub in the Mornington Peninsula hinterland',
   'Mattinbgn / Wikimedia Commons (CC BY-SA 3.0)', 'wikimedia-cc-by-sa'],

  // Cottage / villa stays (blocked category-cottage-01.webp)
  ['crittenden-villas',
   '/images/sourced/article-vineyard-villa-01.webp',
   'Vineyard estate villa, Mornington Peninsula — Crittenden Estate Villas, Dromana',
   'Peninsula Insider', 'other-licensed'],
  ['hillview-cottages',
   '/images/sourced/journal-late-afternoon-walks-01.webp',
   'Afternoon light on the Peninsula hinterland — Hillview Cottages, Red Hill',
   'Peninsula Insider', 'other-licensed'],
  ['polperro-villas',
   '/images/sourced/article-couples-weekend-01.webp',
   'Couples weekend at a Mornington Peninsula winery estate — Polperro Villas',
   'Peninsula Insider', 'other-licensed'],
  ['sorrento-coastal-retreat',
   '/images/sourced/explore-sorrento-ocean-baths-01.webp',
   'Sorrento ocean baths and coastline — Sorrento Coastal Retreat',
   'Peninsula Insider', 'other-licensed'],

  // Glamping (blocked category-glamping-01.webp)
  ['peninsula-hot-springs-glamping',
   '/images/sourced/explore-greens-bush-01.webp',
   'Greens Bush walking trail, Mornington Peninsula — Peninsula Hot Springs Glamping',
   'Peninsula Insider', 'other-licensed'],

  // ─── VENUES WITH DEDICATED IMAGES NOT BEING USED ─────────────────────────
  ['tedesca-osteria',
   '/images/sourced/venue-tedesca-osteria-01.webp',
   'Tedesca Osteria — Italian country dining room in the Red Hill vineyard landscape',
   'Peninsula Insider', 'other-licensed'],
  ['ashcombe-maze',
   '/images/sourced/venue-ashcombe-maze-01.webp',
   'Ashcombe Maze and Lavender Gardens, Shoreham — Mornington Peninsula attraction',
   'DenisFrolow / Wikimedia Commons (CC BY-SA 4.0)', 'wikimedia-cc-by-sa'],

  // ─── PUBS — geographic explore images, each unique ────────────────────────
  ['portsea-hotel',
   '/images/sourced/venue-portsea-hotel-01.webp',
   'Portsea Hotel — fireplace and interior of the iconic Peninsula pub, Portsea',
   'Chris Olszewski (Kgbo) / Wikimedia Commons (CC BY-SA 4.0)', 'wikimedia-cc-by-sa'],
  ['balnarring-pub',
   '/images/sourced/explore-balnarring-beach-01.webp',
   'Balnarring beach and bay, Mornington Peninsula — Balnarring Pub',
   'Peninsula Insider', 'other-licensed'],
  ['dromana-hotel',
   '/images/sourced/venue-dromana-pier-01.webp',
   'Dromana Pier from McCrae, Port Phillip Bay — Dromana Hotel',
   'Michael J Wyllie / Wikimedia Commons (CC BY-SA 4.0)', 'wikimedia-cc-by-sa'],
  ['merricks-hotel',
   '/images/sourced/explore-gunnamatta-01.webp',
   'Gunnamatta ocean beach, Mornington Peninsula — Merricks Hotel',
   'Peninsula Insider', 'other-licensed'],
  ['mornington-hotel',
   '/images/sourced/explore-mornington-foreshore-01.webp',
   'Mornington foreshore and harbour, Mornington Peninsula',
   'Peninsula Insider', 'other-licensed'],
  ['rye-hotel',
   '/images/sourced/explore-rye-ocean-beach-01.webp',
   'Rye ocean beach, Mornington Peninsula back beach',
   'Peninsula Insider', 'other-licensed'],
  ['sorrento-hotel',
   '/images/sourced/explore-portsea-front-beach-01.webp',
   'Portsea front beach, Port Phillip Bay — Sorrento Hotel',
   'Peninsula Insider', 'other-licensed'],
  ['the-bay-hotel-mornington',
   '/images/sourced/explore-mount-martha-beach-01.webp',
   'Mount Martha beach, Mornington Peninsula — The Bay Hotel Mornington',
   'Peninsula Insider', 'other-licensed'],

  // ─── CAFES — unique images per café ──────────────────────────────────────
  ['afloat-mornington',
   '/images/sourced/explore-mprg-01.webp',
   'Mornington Peninsula Regional Gallery and foreshore — Afloat Mornington',
   'Peninsula Insider', 'other-licensed'],
  ['barmah-park',
   '/images/sourced/article-dog-friendly-01.webp',
   'Dog-friendly Peninsula café country — Barmah Park, Moorooduc',
   'Peninsula Insider', 'other-licensed'],
  ['commonfolk-coffee',
   '/images/sourced/article-sunset-01.webp',
   'Sunset over the Mornington Peninsula — Commonfolk Coffee, Mornington',
   'Peninsula Insider', 'other-licensed'],
  ['flinders-pier-takeaway',
   '/images/sourced/explore-cape-schanck-lighthouse-01.webp',
   'Cape Schanck lighthouse and headland — near Flinders Pier Takeaway',
   'Peninsula Insider', 'other-licensed'],
  ['ouest-france-bistro',
   '/images/sourced/place-mount-martha-01.webp',
   'Mount Martha coastline, Mornington Peninsula — Ouest France Bistro',
   'Peninsula Insider', 'other-licensed'],
  ['rocker',
   '/images/sourced/explore-farnsworth-track-01.webp',
   'Farnsworth Track, Mornington Peninsula hinterland — Rocker café',
   'Peninsula Insider', 'other-licensed'],
  ['small-stone-pantry',
   '/images/sourced/article-kids-peninsula-01.webp',
   'Peninsula family café country — Small Stone Pantry, Dromana',
   'Peninsula Insider', 'other-licensed'],
  ['somers-general',
   '/images/sourced/place-balnarring-01.webp',
   'Balnarring village, Mornington Peninsula — Somers General Store',
   'Peninsula Insider', 'other-licensed'],
  ['sorrento-gelato',
   '/images/sourced/place-sorrento-01.webp',
   'Sorrento village and bay, Mornington Peninsula — Sorrento Gelato',
   'Peninsula Insider', 'other-licensed'],
  ['store-ten',
   '/images/sourced/article-orientation-drive-01.webp',
   'Mornington Peninsula wine country drive — Store Ten café',
   'Peninsula Insider', 'other-licensed'],
  ['stringers-mornington',
   '/images/sourced/explore-point-nepean-fort-01.webp',
   'Point Nepean fort walk, Mornington Peninsula — Stringers, Mornington',
   'Peninsula Insider', 'other-licensed'],
  ['flinders-general-store',
   '/images/sourced/place-flinders-01.webp',
   'Flinders village and rolling hills, Mornington Peninsula',
   'Peninsula Insider', 'other-licensed'],

  // ─── BAKERIES ─────────────────────────────────────────────────────────────
  ['balnarring-bakehouse',
   '/images/sourced/article-red-hill-saturday-01.webp',
   'Red Hill and Balnarring Saturday morning — Balnarring Bakehouse',
   'Peninsula Insider', 'other-licensed'],
  ['flinders-sourdough',
   '/images/sourced/explore-two-bays-walk-01.webp',
   'Two Bays walking track, Mornington Peninsula — Flinders Sourdough',
   'Peninsula Insider', 'other-licensed'],
  ['johnny-ripe',
   '/images/sourced/place-red-hill-01.webp',
   'Red Hill village, Mornington Peninsula — Johnny Ripe bakery',
   'Peninsula Insider', 'other-licensed'],
  ['red-hill-bakery',
   '/images/sourced/venue-red-hill-general-store-01.webp',
   'Red Hill village streetscape, Mornington Peninsula — Red Hill Bakery',
   'Mrdhrns / Wikimedia Commons (CC BY-SA 4.0)', 'wikimedia-cc-by-sa'],
  ['sorrento-bakery',
   '/images/sourced/article-sorrento-weekend-01.webp',
   'Sorrento weekend morning, Mornington Peninsula — Sorrento Bakery',
   'Peninsula Insider', 'other-licensed'],
  ['sourdough-kitchen',
   '/images/sourced/place-mornington-01.webp',
   'Mornington town and bay, Mornington Peninsula — Sourdough Kitchen',
   'Peninsula Insider', 'other-licensed'],

  // ─── BREWERIES / DISTILLERY ───────────────────────────────────────────────
  ['bass-and-flinders',
   '/images/sourced/article-cellar-door-01.webp',
   'Peninsula cellar door — Bass & Flinders Distillery, Dromana',
   'Peninsula Insider', 'other-licensed'],
  ['jetty-road-brewery',
   '/images/sourced/explore-arthurs-seat-lookout-01.webp',
   'Arthurs Seat lookout above Dromana — Jetty Road Brewery',
   'Peninsula Insider', 'other-licensed'],
  ['mornington-peninsula-brewery',
   '/images/sourced/article-chardonnay-case-01.webp',
   'Peninsula craft production — Mornington Peninsula Brewery',
   'Peninsula Insider', 'other-licensed'],
  ['red-hill-brewery',
   '/images/sourced/article-long-lunch-01.webp',
   'Long lunch in Peninsula wine and beer country — Red Hill Brewery',
   'Peninsula Insider', 'other-licensed'],
  ['st-andrews-beach-brewery',
   '/images/sourced/explore-cape-schanck-boardwalk-01.webp',
   'Cape Schanck boardwalk and coast — St Andrews Beach Brewery, Rye',
   'Peninsula Insider', 'other-licensed'],
  ['two-bays-brewing',
   '/images/sourced/article-beach-swimming-01.webp',
   'Mornington Peninsula bay swimming — Two Bays Brewing, Dromana',
   'Peninsula Insider', 'other-licensed'],

  // ─── PRODUCERS ────────────────────────────────────────────────────────────
  ['main-ridge-dairy',
   '/images/sourced/article-producer-trail-01.webp',
   'Peninsula producer trail — Main Ridge Dairy, Mornington Peninsula',
   'Peninsula Insider', 'other-licensed'],
  ['peninsula-fresh-organics',
   '/images/sourced/article-rainy-day-01.webp',
   'Peninsula farm produce — Peninsula Fresh Organics, Mornington',
   'Peninsula Insider', 'other-licensed'],
  ['red-hill-cheese',
   '/images/sourced/article-hatted-restaurants-01.webp',
   'Peninsula artisan produce — Red Hill Cheese, Mornington Peninsula',
   'Peninsula Insider', 'other-licensed'],
  ['red-hill-truffles',
   '/images/sourced/place-moorooduc-01.webp',
   'Moorooduc and Red Hill farm country — Red Hill Truffles',
   'Peninsula Insider', 'other-licensed'],

  // ─── MARKETS ──────────────────────────────────────────────────────────────
  ['balnarring-market',
   '/images/sourced/article-picnic-01.webp',
   'Balnarring market day picnic — Peninsula country markets',
   'Peninsula Insider', 'other-licensed'],
  ['mornington-farmers-market',
   '/images/sourced/article-peninsula-pantry-01.webp',
   'Peninsula farmers market produce — Mornington Farmers Market',
   'Peninsula Insider', 'other-licensed'],
  ['red-hill-market',
   '/images/sourced/article-flinders-weekend-01.webp',
   'Red Hill and Mornington Peninsula south market country',
   'Peninsula Insider', 'other-licensed'],

  // ─── RESTAURANTS — fix duplicate place-merricks & highest-profile fixes ──
  ['laura-pt-leo',
   '/images/sourced/venue-pt-leo-sculpture-01.webp',
   'Laura at Pt. Leo Estate — sculpture park and vineyard dining, Merricks',
   'Emma White / Wikimedia Commons (CC BY-SA 4.0)', 'wikimedia-cc-by-sa'],
  ['merricks-general-wine-store',
   '/images/sourced/place-merricks-01.webp',
   'Merricks village wine country, Mornington Peninsula',
   'Peninsula Insider', 'other-licensed'],
  ['point-leo-wine-terrace',
   '/images/sourced/place-main-ridge-01.webp',
   'Main Ridge wine country and Chardonnay vines — Pt. Leo Wine Terrace, Merricks',
   'CSIRO / Wikimedia Commons (CC BY 3.0)', 'wikimedia-cc-by'],
  ['the-baths-sorrento',
   '/images/sourced/explore-sorrento-ferry-01.webp',
   'Sorrento waterfront and Queenscliff ferry — The Baths Restaurant, Sorrento',
   'Peninsula Insider', 'other-licensed'],
  ['stillwater-crittenden',
   '/images/sourced/place-dromana-01.webp',
   'Dromana and Arthurs Seat wine country — Stillwater at Crittenden',
   'Peninsula Insider', 'other-licensed'],
  ['rare-hare',
   '/images/sourced/venue-jackalope-hotel-01.webp',
   'Jackalope Hotel and winery estate, Merricks North — Rare Hare Restaurant',
   'Peninsula Insider', 'other-licensed'],
  ['doot-doot-doot',
   '/images/sourced/place-cape-schanck-01.webp',
   'Cape Schanck wine country — Doot Doot Doot at Jackalope, Red Hill',
   'Peninsula Insider', 'other-licensed'],
  ['pier-street-flinders',
   '/images/sourced/place-rye-01.webp',
   'Southern Peninsula wine country — Pier Street, Flinders',
   'Peninsula Insider', 'other-licensed'],
  ['pho-rosebud',
   '/images/sourced/place-rosebud-01.webp',
   'Rosebud, Mornington Peninsula — Pho Rosebud',
   'Peninsula Insider', 'other-licensed'],
  ['martha-s-table',
   '/images/sourced/place-safety-beach-01.webp',
   "Safety Beach, Mornington Peninsula — Martha's Table",
   'Peninsula Insider', 'other-licensed'],
];

let updated = 0;
const errors = [];
const seen = new Map();

// Duplicate check within this fix set
for (const [slug, src] of FIXES) {
  const fname = src.split('/').pop();
  if (seen.has(fname)) {
    errors.push(`PLAN DUPE: ${fname} for ${seen.get(fname)} AND ${slug}`);
  }
  seen.set(fname, slug);
}

if (errors.length) {
  console.error('PLAN ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`Plan OK — ${FIXES.length} fixes, no internal duplicates.\n`);

for (const [slug, src, alt, credit, license] of FIXES) {
  const fp = path.join(BASE, `${slug}.json`);
  if (!fs.existsSync(fp)) { errors.push(`MISSING: ${slug}`); continue; }
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  data.heroImage = { src, alt, credit, license };
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  OK  ${slug.padEnd(38)} → ${src.split('/').pop()}`);
  updated++;
}

console.log(`\n✓ ${updated} venues updated`);
if (errors.length) { console.error('\nERRORS:', errors.join('\n')); process.exit(1); }
