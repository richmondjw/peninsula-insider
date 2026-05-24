/**
 * Seed pageHero singletons for the 10 hardcoded longform journal articles
 * (PR B of the click-to-edit-everywhere series).
 *
 * These articles live as standalone .astro files under
 * next/src/pages/journal/<slug>.astro and have handcrafted hero blocks
 * with hardcoded background-image URLs. After this script runs, each
 * page's dual-read will resolve its pageHero singleton by pathSlug
 * (e.g. "journal/mornington-peninsula-with-kids") and swap the hero
 * image to the asset uploaded here.
 *
 *   Usage: SANITY_AUTH_TOKEN=<write-token> npx tsx scripts/seed-longform-journal-heroes.ts
 *
 * Idempotent: createOrReplace keyed by a deterministic _id derived from
 * the slug. Re-running uploads the asset again (Sanity dedupes by hash)
 * and replaces the singleton doc.
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
  token: process.env.SANITY_AUTH_TOKEN ?? process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

interface HeroSeed {
  slug: string
  imageSrc: string
  title: string
}

const HEROES: HeroSeed[] = [
  {
    slug: 'journal/mornington-peninsula-with-kids',
    imageSrc: '/images/sourced/place-mornington-01.webp',
    title: 'The Peninsula with kids',
  },
  {
    slug: 'journal/mornington-peninsula-day-trip',
    imageSrc: '/images/sourced/place-red-hill-01.webp',
    title: 'A perfect day trip',
  },
  {
    slug: 'journal/best-brunch-mornington-peninsula',
    imageSrc: '/images/sourced/place-mornington-01.webp',
    title: 'Best brunch on the Peninsula',
  },
  {
    slug: 'journal/dog-friendly-mornington-peninsula',
    imageSrc: '/images/sourced/place-rye-01.webp',
    title: 'Dog-friendly Peninsula',
  },
  {
    slug: 'journal/mornington-peninsula-wedding-venues',
    imageSrc: '/images/sourced/article-vineyard-villa-01.webp',
    title: 'Wedding venues',
  },
  {
    slug: 'journal/mornington-peninsula-in-autumn',
    imageSrc: '/images/sourced/article-cellar-door-01.webp',
    title: 'The Peninsula in autumn',
  },
  {
    slug: 'journal/mornington-peninsula-itinerary',
    imageSrc: '/images/sourced/place-red-hill-01.webp',
    title: 'Peninsula itinerary',
  },
  {
    slug: 'journal/free-things-to-do-mornington-peninsula',
    imageSrc: '/images/sourced/explore-bushrangers-bay-walk-01.webp',
    title: 'Free things to do',
  },
  {
    slug: 'journal/mornington-peninsula-hot-springs-guide',
    imageSrc: '/images/sourced/place-rye-01.webp',
    title: 'Hot springs guide',
  },
  {
    slug: 'journal/mornington-peninsula-in-winter',
    imageSrc: '/images/sourced/article-cellar-door-01.webp',
    title: 'The Peninsula in winter',
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

function singletonIdForSlug(slug: string): string {
  // pageHero-journal-<slug>; Sanity _id allows letters, digits, dashes, underscores.
  return `pageHero-${slug.replace(/[^a-zA-Z0-9]+/g, '-')}`
}

async function seedOne(h: HeroSeed) {
  const assetId = await uploadImage(h.imageSrc)
  if (!assetId) {
    console.warn(`  - ${h.slug}: skipped (asset upload failed)`)
    return
  }
  const _id = singletonIdForSlug(h.slug)
  await client.createOrReplace({
    _id,
    _type: 'pageHero',
    pathSlug: h.slug,
    title: h.title,
    image: {
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: assetId},
      alt: h.title,
      credit: 'venue-media-kit',
      license: 'venue-media-kit',
    },
  })
  console.log(`  ✓ ${_id}  (${h.slug})`)
}

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN && !process.env.SANITY_WRITE_TOKEN) {
    console.error('SANITY_AUTH_TOKEN (or SANITY_WRITE_TOKEN) not set.')
    process.exit(1)
  }
  console.log('→ longform journal pageHero singletons')
  for (const h of HEROES) {
    await seedOne(h)
  }
  console.log(`\nDone. ${HEROES.length} pageHero docs created/replaced.`)
}

void main()
