#!/usr/bin/env node
/**
 * Batch-update eat/ subpages: replace <article class="article"> hero blocks
 * with the new <SubpageHero> component.
 *
 * For each page:
 *  1. Adds import SubpageHero
 *  2. Replaces the <article class="article">…</article> block
 */
const fs = require('fs');
const path = require('path');

const BASE = 'src/pages/eat';

// Per-page config: image, alt, caption, category label
const CONFIG = {
  'bakeries': {
    category: 'Bakeries',
    heroImage: '/images/sourced/explore-dromana-beach-01.webp',
    imageAlt: 'Dromana beach morning light, Mornington Peninsula',
    imageCaption: 'Mornington Peninsula',
  },
  'cafes': {
    category: 'Cafes',
    heroImage: '/images/sourced/explore-mprg-01.webp',
    imageAlt: 'Mornington Peninsula Regional Gallery and foreshore, Mornington',
    imageCaption: 'Mornington',
  },
  'markets': {
    category: 'Markets',
    heroImage: '/images/sourced/article-red-hill-saturday-01.webp',
    imageAlt: 'Red Hill Saturday morning, Mornington Peninsula — market day',
    imageCaption: 'Red Hill · Saturday morning',
  },
  'pubs': {
    category: 'Pubs',
    heroImage: '/images/sourced/place-portsea-01.webp',
    imageAlt: 'Portsea coastline, Mornington Peninsula — gateway to the Peninsula\'s best pubs',
    imageCaption: 'Portsea · Mornington Peninsula',
  },
  'best-restaurants': {
    category: 'Best Restaurants',
    heroImage: '/images/sourced/article-hatted-restaurants-01.webp',
    imageAlt: 'Open kitchen at a Peninsula fine dining restaurant — hatted dining on the Mornington Peninsula',
    imageCaption: 'Peninsula fine dining',
  },
  'brunch': {
    category: 'Brunch',
    heroImage: '/images/sourced/explore-mount-martha-beach-01.webp',
    imageAlt: 'Mount Martha beach, Mornington Peninsula — morning light and bay views',
    imageCaption: 'Mount Martha · Mornington Peninsula',
  },
  'cellar-door-lunch': {
    category: 'Cellar Door Lunch',
    heroImage: '/images/sourced/article-cellar-door-01.webp',
    imageAlt: 'Peninsula cellar door wine tasting — estate dining on the Mornington Peninsula',
    imageCaption: 'Red Hill plateau',
  },
  'date-night': {
    category: 'Date Night',
    heroImage: '/images/sourced/article-couples-weekend-01.webp',
    imageAlt: 'Couples weekend at a Mornington Peninsula vineyard estate — Peninsula date night',
    imageCaption: 'Mornington Peninsula',
  },
  'dog-friendly': {
    category: 'Dog-Friendly',
    heroImage: '/images/sourced/article-dog-friendly-01.webp',
    imageAlt: 'Dog-friendly Peninsula — outdoor dining and café culture on the Mornington Peninsula',
    imageCaption: 'Mornington Peninsula',
  },
  'family-friendly': {
    category: 'Family-Friendly',
    heroImage: '/images/sourced/article-kids-peninsula-01.webp',
    imageAlt: 'Family day out on the Mornington Peninsula — dining with kids',
    imageCaption: 'Mornington Peninsula',
  },
  'fine-dining': {
    category: 'Fine Dining',
    heroImage: '/images/sourced/venue-lindenderry-01.webp',
    imageAlt: 'Lindenderry at Red Hill — boutique hotel and fine dining on the Mornington Peninsula',
    imageCaption: 'Red Hill · Mornington Peninsula',
  },
  'hatted-restaurants': {
    category: 'Hatted Restaurants',
    heroImage: '/images/sourced/venue-pt-leo-sculpture-01.webp',
    imageAlt: 'Pt. Leo Estate sculpture park and fine dining, Merricks — two-hat Peninsula restaurant',
    imageCaption: 'Pt. Leo Estate · Merricks',
  },
  'long-lunch': {
    category: 'Long Lunch',
    heroImage: '/images/sourced/article-long-lunch-01.webp',
    imageAlt: 'Long lunch at a Peninsula vineyard restaurant — wine country dining on the Mornington Peninsula',
    imageCaption: 'Peninsula wine country',
  },
  'no-booking': {
    category: 'Walk-In',
    heroImage: '/images/sourced/explore-mornington-foreshore-01.webp',
    imageAlt: 'Mornington foreshore and harbour — casual dining and walk-in venues on the Peninsula',
    imageCaption: 'Mornington',
  },
  'paddock-to-plate': {
    category: 'Paddock to Plate',
    heroImage: '/images/sourced/article-producer-trail-01.webp',
    imageAlt: 'Peninsula producer trail — farm-to-table dining on the Mornington Peninsula',
    imageCaption: 'Red Hill hinterland',
  },
  'seafood': {
    category: 'Seafood',
    heroImage: '/images/sourced/article-seafood-01.webp',
    imageAlt: 'Fresh seafood on the Mornington Peninsula — waterfront dining and fish kitchens',
    imageCaption: 'Mornington Peninsula coast',
  },
  'waterfront': {
    category: 'Waterfront',
    heroImage: '/images/sourced/explore-sorrento-ferry-01.webp',
    imageAlt: 'Sorrento waterfront and Queenscliff ferry, Port Phillip Bay — Peninsula waterfront dining',
    imageCaption: 'Sorrento · Port Phillip Bay',
  },
};

const IMPORT_LINE = `import SubpageHero from '../../components/SubpageHero.astro';`;
const BREADCRUMBS_IMPORT = `import Breadcrumbs from '../../components/Breadcrumbs.astro';`;

let updated = 0;
const errors = [];

for (const [slug, cfg] of Object.entries(CONFIG)) {
  const fp = path.join(BASE, `${slug}.astro`);
  if (!fs.existsSync(fp)) {
    errors.push(`MISSING: ${fp}`);
    continue;
  }

  let src = fs.readFileSync(fp, 'utf8');

  // 1. Add SubpageHero import if not present
  if (!src.includes('SubpageHero')) {
    src = src.replace(BREADCRUMBS_IMPORT, BREADCRUMBS_IMPORT + '\n' + IMPORT_LINE);
  }

  // 2. Find and replace the <article class="article"> block
  // Handles both compact (one-line) and multi-line formats
  const articleStart = src.indexOf('<article class="article">');
  const articleEnd = src.indexOf('</article>');
  if (articleStart === -1 || articleEnd === -1) {
    errors.push(`NO ARTICLE BLOCK: ${slug}`);
    continue;
  }

  const articleBlock = src.slice(articleStart, articleEnd + '</article>'.length);

  // Extract h1 title
  const titleMatch = articleBlock.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!titleMatch) {
    errors.push(`NO H1: ${slug}`);
    continue;
  }
  const title = titleMatch[1].trim();

  // Extract prose div content
  const proseStart = articleBlock.indexOf('<div class="prose">');
  const proseEnd = articleBlock.lastIndexOf('</div>');
  if (proseStart === -1 || proseEnd === -1) {
    errors.push(`NO PROSE: ${slug}`);
    continue;
  }
  const proseContent = articleBlock.slice(
    proseStart + '<div class="prose">'.length,
    proseEnd
  ).trim();

  // Build replacement
  const { category, heroImage, imageAlt, imageCaption } = cfg;
  const attrLines = [
    `  title="${title}"`,
    `  category="${category}"`,
    `  heroImage="${heroImage}"`,
    `  imageAlt="${imageAlt}"`,
    `  imageCaption="${imageCaption}"`,
  ].join('\n');

  const replacement =
    `<SubpageHero\n${attrLines}\n>\n  <div class="prose">\n    ${proseContent}\n  </div>\n</SubpageHero>`;

  src = src.slice(0, articleStart) + replacement + src.slice(articleEnd + '</article>'.length);

  fs.writeFileSync(fp, src, 'utf8');
  console.log(`  OK  ${slug}`);
  updated++;
}

console.log(`\n✓ ${updated} pages updated`);
if (errors.length) {
  console.error('\nERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
