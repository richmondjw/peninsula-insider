/**
 * Seed pageHero singletons for /eat and /tour subpage heroes.
 *
 * PR E of the click-to-edit-images series wired up every /eat and /tour
 * subpage to pass `entitySlug` to SubpageHero / SectionHero so the title
 * and hero image become CMS-editable. With no pageHero document present
 * the components fall back to Astro-prop defaults (byte-equivalent public
 * render). This script creates the pageHero docs so editors can override
 * from Studio.
 *
 *   Usage: SANITY_AUTH_TOKEN=... npx tsx scripts/seed-eat-tour-hub-heroes.ts
 *          (SANITY_WRITE_TOKEN is also honoured)
 *
 * Idempotent: createOrReplace by fixed _id derived from pathSlug.
 */
import {createClient} from '@sanity/client'
import {readFile} from 'node:fs/promises'
import {join, dirname, basename} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const imagesRoot = join(repoRoot, 'next', 'public')

const token = process.env.SANITY_AUTH_TOKEN || process.env.SANITY_WRITE_TOKEN

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  token,
  useCdn: false,
})

interface HubHero {
  slug: string
  imagePath: string
  eyebrow: string
  category?: string
  title: string
}

const HUBS: HubHero[] = [
  // /eat subpages
  {slug: 'eat/bakeries', imagePath: '/images/sourced/explore-dromana-beach-01.webp', eyebrow: 'Eat & Drink', category: 'Bakeries', title: 'Best Bakeries on the Mornington Peninsula'},
  {slug: 'eat/best-restaurants', imagePath: '/images/sourced/article-hatted-restaurants-01.webp', eyebrow: 'Eat & Drink', category: 'Best Restaurants', title: 'The Best Restaurants on the Mornington Peninsula'},
  {slug: 'eat/brunch', imagePath: '/images/sourced/explore-mount-martha-beach-01.webp', eyebrow: 'Eat & Drink', category: 'Brunch', title: 'Best Brunch on the Mornington Peninsula'},
  {slug: 'eat/cafes', imagePath: '/images/sourced/explore-mprg-01.webp', eyebrow: 'Eat & Drink', category: 'Cafes', title: 'Best Cafes on the Mornington Peninsula'},
  {slug: 'eat/cellar-door-lunch', imagePath: '/images/sourced/article-cellar-door-01.webp', eyebrow: 'Eat & Drink', category: 'Cellar Door Lunch', title: 'Cellar Door Lunch on the Mornington Peninsula'},
  {slug: 'eat/date-night', imagePath: '/images/sourced/article-couples-weekend-01.webp', eyebrow: 'Eat & Drink', category: 'Date Night', title: 'Date Night on the Mornington Peninsula'},
  {slug: 'eat/dog-friendly', imagePath: '/images/sourced/article-dog-friendly-01.webp', eyebrow: 'Eat & Drink', category: 'Dog-Friendly', title: 'Dog-Friendly Dining on the Mornington Peninsula'},
  {slug: 'eat/family-friendly', imagePath: '/images/sourced/article-kids-peninsula-01.webp', eyebrow: 'Eat & Drink', category: 'Family-Friendly', title: 'Family-Friendly Dining on the Mornington Peninsula'},
  {slug: 'eat/fine-dining', imagePath: '/images/sourced/venue-lindenderry-01.webp', eyebrow: 'Eat & Drink', category: 'Fine Dining', title: 'Fine Dining on the Mornington Peninsula'},
  {slug: 'eat/hatted-restaurants', imagePath: '/images/sourced/venue-pt-leo-sculpture-01.webp', eyebrow: 'Eat & Drink', category: 'Hatted Restaurants', title: 'Hatted Restaurants on the Mornington Peninsula'},
  {slug: 'eat/long-lunch', imagePath: '/images/sourced/article-long-lunch-01.webp', eyebrow: 'Eat & Drink', category: 'Long Lunch', title: 'The Long Lunch on the Mornington Peninsula'},
  {slug: 'eat/markets', imagePath: '/images/sourced/article-red-hill-saturday-01.webp', eyebrow: 'Eat & Drink', category: 'Markets', title: 'Best Markets on the Mornington Peninsula'},
  {slug: 'eat/no-booking', imagePath: '/images/sourced/explore-mornington-foreshore-01.webp', eyebrow: 'Eat & Drink', category: 'Walk-In', title: 'Walk-In Restaurants on the Mornington Peninsula'},
  {slug: 'eat/paddock-to-plate', imagePath: '/images/sourced/article-producer-trail-01.webp', eyebrow: 'Eat & Drink', category: 'Paddock to Plate', title: 'Paddock to Plate on the Mornington Peninsula'},
  {slug: 'eat/pubs', imagePath: '/images/sourced/place-portsea-01.webp', eyebrow: 'Eat & Drink', category: 'Pubs', title: 'Best Pubs on the Mornington Peninsula'},
  {slug: 'eat/seafood', imagePath: '/images/sourced/article-seafood-01.webp', eyebrow: 'Eat & Drink', category: 'Seafood', title: 'Best Seafood on the Mornington Peninsula'},
  {slug: 'eat/waterfront', imagePath: '/images/sourced/explore-sorrento-ferry-01.webp', eyebrow: 'Eat & Drink', category: 'Waterfront', title: 'Waterfront Restaurants on the Mornington Peninsula'},

  // /tour hub + subpages
  {slug: 'tour', imagePath: '/images/sourced/wine-hub-hero-01.webp', eyebrow: 'Tours', title: 'Operator-led experiences on the <em>Mornington Peninsula</em>'},
  {slug: 'tour/small-group-tours', imagePath: '/images/sourced/category-winery-06.webp', eyebrow: 'Tours', category: 'Small Group', title: 'Small-Group Tours'},
  {slug: 'tour/wine-tours', imagePath: '/images/sourced/venue-montalto-banner-01.webp', eyebrow: 'Tours', category: 'Wine & Cellar Door', title: 'Peninsula Wine Tours'},
  {slug: 'tour/private-tours', imagePath: '/images/sourced/spa-treatment-room-rose-01.webp', eyebrow: 'Tours', category: 'Private & Bespoke', title: 'Private Tours — Mornington Peninsula'},
  {slug: 'tour/hot-springs-tours', imagePath: '/images/sourced/spa-peninsula-hot-springs-hilltop-01.webp', eyebrow: 'Tours', category: 'Wellness & Hot Springs', title: 'Hot Springs Tours on the Mornington Peninsula'},
  {slug: 'tour/for-families', imagePath: '/images/sourced/explore-two-bays-walk-01.webp', eyebrow: 'Tours', category: 'For Families', title: 'Family Tours on the Mornington Peninsula'},
  {slug: 'tour/full-day-tours', imagePath: '/images/sourced/explore-arthurs-seat-lookout-01.webp', eyebrow: 'Tours', category: 'Full Day', title: 'Full Day Tours'},
  {slug: 'tour/fishing-tours', imagePath: '/images/sourced/explore-portsea-front-beach-01.webp', eyebrow: 'Tours · Fishing', title: '<em>Fishing tours</em> on the Mornington Peninsula'},
  {slug: 'tour/for-couples', imagePath: '/images/sourced/article-picnic-01.webp', eyebrow: 'Tours', category: 'For Couples', title: 'Couples Tours on the Mornington Peninsula'},
  {slug: 'tour/operators', imagePath: '/images/sourced/place-mornington-01.webp', eyebrow: 'Tours', category: 'Operators', title: 'Mornington Peninsula Tour Operators'},
]

async function uploadImage(src: string): Promise<string | null> {
  try {
    const buf = await readFile(join(imagesRoot, src.replace(/^\/+/, '')))
    const filename = basename(src)
    const a = await client.assets.upload('image', buf, {filename})
    return a._id
  } catch (err) {
    console.error(`  ! upload failed ${src}: ${(err as Error).message}`)
    return null
  }
}

// Sanity _id allows alphanumerics, hyphens, underscores and dots — not "/".
// Replace path separators with double-dash so the id stays unique per slug.
function idForSlug(slug: string): string {
  return `pageHero-${slug.replace(/\//g, '--')}`
}

async function seed() {
  if (!token) {
    console.error('SANITY_AUTH_TOKEN (or SANITY_WRITE_TOKEN) not set.')
    process.exit(1)
  }

  for (const h of HUBS) {
    console.log(`→ ${h.slug}`)
    const assetId = await uploadImage(h.imagePath)
    const image = assetId
      ? {
          _type: 'imageRef',
          asset: {_type: 'reference', _ref: assetId},
          alt: h.title.replace(/<[^>]+>/g, ''),
          credit: 'venue-media-kit',
          license: 'venue-media-kit',
        }
      : undefined

    await client.createOrReplace({
      _id: idForSlug(h.slug),
      _type: 'pageHero',
      pathSlug: h.slug,
      eyebrow: h.eyebrow,
      ...(h.category ? {category: h.category} : {}),
      title: h.title,
      image,
    })
    console.log(`  ✓ ${idForSlug(h.slug)}`)
  }

  console.log('\nDone.')
}

void seed()
