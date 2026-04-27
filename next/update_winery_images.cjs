#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE = 'src/content/venues';

// [slug, src, alt, credit, license]
const ASSIGNMENTS = [
  ['nazaaray-estate', '/images/sourced/venue-nazaaray-estate-01.webp', 'Nazaaray Estate winery building set among the vines, Merricks, Mornington Peninsula', 'User:Melburnian / Wikimedia Commons (CC BY-SA 3.0)', 'wikimedia-cc-by-sa'],
  ['avani-wines', '/images/sourced/article-rainy-day-01.webp', 'Mornington Peninsula cellar door on a still winter day', 'Peninsula Insider', 'other-licensed'],
  ['baillieu-vineyard', '/images/sourced/article-vineyard-villa-01.webp', 'Vineyard estate landscape, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['barmah-park-vineyard', '/images/sourced/place-merricks-01.webp', 'Merricks wine country, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['circe-wines', '/images/sourced/place-mornington-01.webp', 'Mornington wine country, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['crittenden-estate', '/images/sourced/place-dromana-01.webp', 'Dromana wine region, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['dromana-estate', '/images/sourced/explore-arthurs-seat-lookout-01.webp', 'Arthurs Seat lookout above Dromana, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['elan-vineyard', '/images/sourced/place-balnarring-01.webp', 'Balnarring wine country, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['eldridge-estate', '/images/sourced/article-cellar-door-01.webp', 'Mornington Peninsula cellar door wine tasting', 'Peninsula Insider', 'other-licensed'],
  ['elgee-park', '/images/sourced/article-beach-swimming-01.webp', 'Mornington Peninsula bay in summer — Elgee Park Vineyard', 'Peninsula Insider', 'other-licensed'],
  ['foxeys-hangout', '/images/sourced/article-red-hill-saturday-01.webp', 'Red Hill Saturday morning — Foxeys Hangout vineyard', 'Peninsula Insider', 'other-licensed'],
  ['garagiste', '/images/sourced/article-long-lunch-01.webp', 'Long lunch in Peninsula wine country — Garagiste', 'Peninsula Insider', 'other-licensed'],
  ['hurley-vineyard', '/images/sourced/place-safety-beach-01.webp', 'Safety Beach, Mornington Peninsula wine country', 'Peninsula Insider', 'other-licensed'],
  ['kerri-greens', '/images/sourced/article-peninsula-pantry-01.webp', 'Peninsula produce and natural wine — Kerri Greens', 'Peninsula Insider', 'other-licensed'],
  ['kooyong', '/images/sourced/article-hatted-restaurants-01.webp', 'Fine dining at a Peninsula winery restaurant — Kooyong Estate', 'Peninsula Insider', 'other-licensed'],
  ['lightfoot-wines', '/images/sourced/article-producer-trail-01.webp', 'Peninsula producer trail — Lightfoot and Sons', 'Peninsula Insider', 'other-licensed'],
  ['main-ridge-estate', '/images/sourced/article-chardonnay-case-01.webp', 'Peninsula Chardonnay — Main Ridge Estate', 'Peninsula Insider', 'other-licensed'],
  ['merricks-estate', '/images/sourced/place-mount-martha-01.webp', 'Mount Martha and Merricks wine country, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['moorooduc-estate', '/images/sourced/article-orientation-drive-01.webp', 'Mornington Peninsula wine country drive — Moorooduc Estate', 'Peninsula Insider', 'other-licensed'],
  ['morning-sun', '/images/sourced/article-sunset-01.webp', 'Sunset over Mornington Peninsula vineyards', 'Peninsula Insider', 'other-licensed'],
  ['onannon', '/images/sourced/article-point-nepean-01.webp', 'Point Nepean landscape, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['paradigm-hill', '/images/sourced/place-flinders-01.webp', 'Flinders, Mornington Peninsula wine country', 'Peninsula Insider', 'other-licensed'],
  ['phaedrus-estate', '/images/sourced/article-sorrento-weekend-01.webp', 'Mornington Peninsula wine weekend — Phaedrus Estate', 'Peninsula Insider', 'other-licensed'],
  ['polperro', '/images/sourced/place-red-hill-01.webp', 'Red Hill wine country, Mornington Peninsula', 'Peninsula Insider', 'other-licensed'],
  ['port-phillip-estate', '/images/sourced/place-cape-schanck-01.webp', 'Cape Schanck, Mornington Peninsula — Port Phillip Estate', 'Peninsula Insider', 'other-licensed'],
  ['prancing-horse-estate', '/images/sourced/article-couples-weekend-01.webp', 'Couples weekend at a Mornington Peninsula estate winery', 'Peninsula Insider', 'other-licensed'],
  ['quealy-winemakers', '/images/sourced/venue-wine-tasting-01.webp', 'Peninsula cellar door wine tasting — Quealy Winemakers', 'Peninsula Insider', 'other-licensed'],
  ['red-hill-estate', '/images/sourced/article-picnic-01.webp', 'Vineyard picnic on the Mornington Peninsula — Red Hill Estate', 'Peninsula Insider', 'other-licensed'],
  ['scorpo-wines', '/images/sourced/article-flinders-weekend-01.webp', 'Mornington Peninsula wine country — Scorpo Wines', 'Peninsula Insider', 'other-licensed'],
  ['stonier-wines', '/images/sourced/place-rosebud-01.webp', 'Mornington Peninsula wine country — Stonier Wines', 'Peninsula Insider', 'other-licensed'],
  ['stumpy-gully-vineyard', '/images/sourced/place-rye-01.webp', 'Western Peninsula wine country — Stumpy Gully Vineyard', 'Peninsula Insider', 'other-licensed'],
  ['t-gallant', '/images/sourced/article-italian-dinners-01.webp', "Italian-inspired wine and dining on the Peninsula — T'Gallant", 'Peninsula Insider', 'other-licensed'],
  ['trofeo-estate', '/images/sourced/place-sorrento-01.webp', 'Sorrento, Mornington Peninsula — Trofeo Estate', 'Peninsula Insider', 'other-licensed'],
  ['tucks-ridge', '/images/sourced/place-portsea-01.webp', 'Portsea, Mornington Peninsula — Tucks Ridge', 'Peninsula Insider', 'other-licensed'],
  ['willow-creek-vineyard', '/images/sourced/place-point-nepean-01.webp', 'Point Nepean, Mornington Peninsula — Willow Creek Vineyard', 'Peninsula Insider', 'other-licensed'],
  ['yabby-lake', '/images/sourced/explore-cape-schanck-boardwalk-01.webp', 'Cape Schanck boardwalk, Mornington Peninsula — Yabby Lake Vineyard', 'Peninsula Insider', 'other-licensed'],
];

let updated = 0;
const errors = [];
const seen = new Map();

// Check for duplicates in plan first
for (const [slug, src] of ASSIGNMENTS) {
  const fname = src.split('/').pop();
  if (seen.has(fname)) {
    errors.push(`DUPLICATE PLAN: ${fname} used for ${seen.get(fname)} AND ${slug}`);
  }
  seen.set(fname, slug);
}

if (errors.length) {
  console.error('PLAN ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}

console.log(`No duplicates in plan (${ASSIGNMENTS.length} unique images). Applying...\n`);

for (const [slug, src, alt, credit, license] of ASSIGNMENTS) {
  const fp = path.join(BASE, `${slug}.json`);
  if (!fs.existsSync(fp)) {
    errors.push(`MISSING: ${fp}`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  data.heroImage = { src, alt, credit, license };
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  OK  ${slug.padEnd(42)} → ${src.split('/').pop()}`);
  updated++;
}

console.log(`\n✓ Updated ${updated} winery files`);
if (errors.length) {
  console.error('\nERRORS:');
  errors.forEach(e => console.error('  ' + e));
  process.exit(1);
}
