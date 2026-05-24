/**
 * Seed pageHero singletons for 10 section hubs that previously had
 * hardcoded heroes inline in their Astro pages (dog-friendly, corporate-
 * events x2, weddings x2, walks x2, spa, explore/markets, explore/golf).
 *
 * PR C of the click-to-edit-images series cut these pages over to the
 * shared SectionHero / GuideHero pageHero dual-read path. With no
 * pageHero document present, both components fall back to the
 * Astro-prop defaults so unauthenticated render is byte-equivalent.
 * This script creates the pageHero docs so editors can override from
 * Studio.
 *
 *   Usage: SANITY_WRITE_TOKEN=... npx tsx scripts/seed-section-hub-heroes.ts
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

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

interface HubHero {
  slug: string
  imagePath: string
  eyebrow: string
  title: string
}

const HUBS: HubHero[] = [
  {
    slug: 'dog-friendly',
    imagePath: '/images/sourced/dog-beach-emma-01.webp',
    eyebrow: 'Peninsula Insider',
    title: 'Dog-friendly Peninsula',
  },
  {
    slug: 'corporate-events',
    imagePath: '/images/sourced/venue-jackalope-hotel-01.webp',
    eyebrow: 'Peninsula Insider · Corporate',
    title: 'Corporate retreats & events',
  },
  {
    slug: 'corporate-events/best-corporate-retreat-venues-mornington-peninsula',
    imagePath: '/images/sourced/venue-jackalope-hotel-01.webp',
    eyebrow: 'Corporate retreats',
    title: 'The best corporate retreat venues',
  },
  {
    slug: 'weddings',
    imagePath: '/images/sourced/article-vineyard-villa-01.webp',
    eyebrow: 'Peninsula Insider · Weddings',
    title: 'Weddings on the Peninsula',
  },
  {
    slug: 'weddings/winery-wedding-venues-mornington-peninsula',
    imagePath: '/images/sourced/article-vineyard-villa-01.webp',
    eyebrow: 'Weddings',
    title: 'Winery wedding venues',
  },
  {
    slug: 'walks',
    imagePath: '/images/sourced/explore-hub-hero-01.webp',
    eyebrow: 'Peninsula Insider · Walks',
    title: 'Walks across the Peninsula',
  },
  {
    slug: 'walks/easy-walks-mornington-peninsula',
    imagePath: '/images/sourced/explore-cape-schanck-boardwalk-01.webp',
    eyebrow: 'Walks',
    title: 'Easy walks on the Peninsula',
  },
  {
    slug: 'spa',
    imagePath: '/images/sourced/spa-alba-thermal-springs-01.webp',
    eyebrow: 'Peninsula Insider · Spa',
    title: 'Spa & thermal springs',
  },
  {
    slug: 'explore/markets',
    imagePath: '/images/sourced/article-red-hill-saturday-01.webp',
    eyebrow: 'Explore · Markets',
    title: 'Markets across the Peninsula',
  },
  {
    slug: 'explore/golf',
    imagePath: '/images/sourced/golf-rye-sunrise-01.webp',
    eyebrow: 'Explore · Golf',
    title: 'Golf on the Peninsula',
  },
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
  if (!process.env.SANITY_WRITE_TOKEN) {
    console.error('SANITY_WRITE_TOKEN not set.')
    process.exit(1)
  }

  for (const h of HUBS) {
    console.log(`→ ${h.slug}`)
    const assetId = await uploadImage(h.imagePath)
    const image = assetId
      ? {
          _type: 'imageRef',
          asset: {_type: 'reference', _ref: assetId},
          alt: h.title,
          credit: 'venue-media-kit',
          license: 'venue-media-kit',
        }
      : undefined

    await client.createOrReplace({
      _id: idForSlug(h.slug),
      _type: 'pageHero',
      pathSlug: h.slug,
      eyebrow: h.eyebrow,
      title: h.title,
      image,
    })
    console.log(`  ✓ ${idForSlug(h.slug)}`)
  }

  console.log('\nDone.')
}

void seed()
