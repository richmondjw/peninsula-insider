/**
 * Peninsula Insider — venue importer (proof-of-concept).
 *
 * Reads venue JSONs from next/src/content/venues, uploads hero images
 * from next/public/images/sourced, and upserts Sanity documents.
 *
 *   Usage:  npx tsx scripts/import-venues.ts [slug1 slug2 …]
 *
 * With no args, imports the PoC seed list near the top of this file.
 * With slugs, imports only those venues. Idempotent — the document _id is
 * derived from the slug so re-runs update in place.
 *
 * Auth: requires `SANITY_AUTH_TOKEN` (write token) in the environment.
 * Token is never printed and never written to disk.
 */
import {createClient} from '@sanity/client'
import {readFile, readdir} from 'node:fs/promises'
import {join, dirname, basename} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const venuesDir = join(repoRoot, 'next', 'src', 'content', 'venues')
const placesDir = join(repoRoot, 'next', 'src', 'content', 'places')
const imagesRoot = join(repoRoot, 'next', 'public')

// PoC seed — five venues across types so Emma can see the editing surface
// for a restaurant, winery, spa, hotel, and cellar door in one sitting.
const SEED_SLUGS = [
  'alba-thermal-springs',
  'ten-minutes-by-tractor',
  'jackalope',
  'pt-leo-estate',
  'commonfolk-coffee',
]

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_AUTH_TOKEN,
  useCdn: false,
})

// ── Helpers ─────────────────────────────────────────────────────────────

function docId(type: string, slug: string): string {
  return `${type}-${slug}`
}

/** Convert an "Astro JSON" venue's plain-text editorNote into Portable Text. */
function textToBlocks(text: string): Array<Record<string, unknown>> {
  return text
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter((p) => p.length > 0)
    .map((para) => ({
      _type: 'block',
      _key: Math.random().toString(36).slice(2, 12),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: Math.random().toString(36).slice(2, 12),
          text: para,
          marks: [],
        },
      ],
    }))
}

async function uploadImageAsset(localSrc: string): Promise<string | null> {
  // localSrc is like "/images/sourced/foo.webp" — relative to next/public.
  const rel = localSrc.replace(/^\/+/, '')
  const abs = join(imagesRoot, rel)
  try {
    const buf = await readFile(abs)
    const asset = await client.assets.upload('image', buf, {
      filename: basename(abs),
    })
    return asset._id
  } catch (err) {
    console.error(`  ! failed to upload ${abs}:`, (err as Error).message)
    return null
  }
}

async function upsertPlaceStub(placeSlug: string): Promise<string> {
  const id = docId('place', placeSlug)
  const placePath = join(placesDir, `${placeSlug}.json`)
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(await readFile(placePath, 'utf8'))
  } catch {
    // Place file missing — fall back to inferred shape.
  }
  await client.createOrReplace({
    _id: id,
    _type: 'place',
    name: (data.name as string) ?? placeSlug.replace(/-/g, ' '),
    slug: {_type: 'slug', current: placeSlug},
    kind: (data.kind as string) ?? 'town',
    zone: (data.zone as string) ?? 'bayside',
  })
  return id
}

// ── Importer ────────────────────────────────────────────────────────────

async function importVenue(slug: string): Promise<void> {
  const path = join(venuesDir, `${slug}.json`)
  const raw = JSON.parse(await readFile(path, 'utf8'))

  console.log(`→ ${slug}`)
  const placeId = await upsertPlaceStub(raw.place)

  let heroAssetId: string | null = null
  if (raw.heroImage?.src) {
    heroAssetId = await uploadImageAsset(raw.heroImage.src)
  }

  const doc: Record<string, unknown> = {
    _id: docId('venue', slug),
    _type: 'venue',
    name: raw.name,
    slug: {_type: 'slug', current: raw.slug},
    type: raw.type,
    place: {_type: 'reference', _ref: placeId},
    zone: raw.zone,
    coordinates: raw.coordinates,
    address: raw.address,
    phone: raw.phone,
    website: raw.website,
    bookingUrl: raw.bookingUrl,
    bookingProvider: raw.bookingProvider,
    priceBand: raw.priceBand,
    signature: raw.signature,
    editorNote: textToBlocks(raw.editorNote ?? ''),
    tags: raw.tags,
    authority: raw.authority,
    dogFriendly: !!raw.dogFriendly,
    dogFriendlyNotes: raw.dogFriendlyNotes,
    dogsAllowedOutdoorsOnly: raw.dogsAllowedOutdoorsOnly,
    offLeashNearby: raw.offLeashNearby,
    waterAccessNearby: raw.waterAccessNearby,
    dogAmenities: raw.dogAmenities ?? [],
    rainyDayDogSuitability: raw.rainyDayDogSuitability,
    affiliateNote: raw.affiliateNote,
    featuredPartner: !!raw.featuredPartner,
    editorPick: !!raw.editorPick,
    hoursNote: raw.hoursNote,
    liveStatusUrl: raw.liveStatusUrl,
    lastVerified: raw.lastVerified,
    publishedAt: raw.publishedAt
      ? new Date(raw.publishedAt).toISOString()
      : new Date().toISOString(),
    sitemapExclude: !!raw.sitemapExclude,
  }

  if (heroAssetId) {
    doc.heroImage = {
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: heroAssetId},
      alt: raw.heroImage.alt ?? raw.name,
      credit: raw.heroImage.credit ?? 'venue-media-kit',
      license: raw.heroImage.license ?? 'venue-media-kit',
      caption: raw.heroImage.caption,
    }
  }

  // Strip undefined so Sanity doesn't store null literals.
  for (const k of Object.keys(doc)) {
    if (doc[k] === undefined) delete doc[k]
  }

  await client.createOrReplace(doc)
  console.log(`  ✓ ${slug}`)
}

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('SANITY_AUTH_TOKEN not set. Export the write token before running.')
    process.exit(1)
  }

  const argSlugs = process.argv.slice(2)
  const slugs = argSlugs.length > 0 ? argSlugs : SEED_SLUGS

  // Sanity check: warn on any missing JSON files.
  const have = new Set((await readdir(venuesDir)).map((f) => f.replace(/\.json$/, '')))
  const missing = slugs.filter((s) => !have.has(s))
  if (missing.length > 0) {
    console.warn(`! missing venue JSONs (skipping): ${missing.join(', ')}`)
  }

  for (const slug of slugs.filter((s) => have.has(s))) {
    try {
      await importVenue(slug)
    } catch (err) {
      console.error(`  ✗ ${slug}:`, (err as Error).message)
    }
  }
}

void main()
