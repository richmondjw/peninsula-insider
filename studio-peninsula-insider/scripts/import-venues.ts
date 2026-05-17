/**
 * Peninsula Insider — venue importer (Phase 1, full set).
 *
 * Reads venue JSONs from next/src/content/venues, uploads hero images
 * (preferring Supabase override → JSON path) and upserts Sanity documents.
 *
 *   Usage:
 *     npx tsx scripts/import-venues.ts              # all 141 venues
 *     npx tsx scripts/import-venues.ts <slug1> …    # named venues only
 *     npx tsx scripts/import-venues.ts --seed       # PoC 5-venue seed
 *
 * Idempotent — `_id = 'venue-<slug>'` so re-runs update in place.
 *
 * Override merge: for each venue, the importer consults pi.cms_image_slots
 * for a published `venue/<slug>/hero` row. If present, that public_url is
 * downloaded and uploaded to Sanity instead of the JSON's heroImage.src.
 * Migration provenance is set so we can audit later.
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

// Supabase public read endpoint for the CMS overrides table. Anon-key read
// is gated by RLS to status='published' rows, which is exactly what we want.
const SUPABASE_URL = 'https://tjjhpvslpysfklwpqmgz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_JlZuo95QvNZi2ZNrFyK-Cw_2y0U7HLp'

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_AUTH_TOKEN,
  useCdn: false,
})

// ── Override fetch (one-shot at startup) ────────────────────────────────

interface VenueOverride {
  entity_slug: string
  field_path: string
  public_url: string | null
  alt_text: string | null
  caption: string | null
  credit: string | null
}

async function fetchVenueOverrides(): Promise<Map<string, VenueOverride>> {
  const url =
    `${SUPABASE_URL}/rest/v1/cms_image_slots` +
    `?select=entity_slug,field_path,public_url,alt_text,caption,credit` +
    `&entity_type=eq.venue&status=eq.published&limit=1000`
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept-Profile': 'pi',
    },
  })
  if (!r.ok) {
    console.warn(`  ! Supabase override fetch failed: ${r.status}`)
    return new Map()
  }
  const rows = (await r.json()) as VenueOverride[]
  const map = new Map<string, VenueOverride>()
  for (const row of rows) {
    if (row.field_path === 'hero') map.set(row.entity_slug, row)
  }
  console.log(`Found ${map.size} published venue hero overrides in Supabase\n`)
  return map
}

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

async function uploadImageAsset(src: string): Promise<string | null> {
  // Two source shapes:
  //   - "/images/sourced/foo.webp"     → relative to next/public, read from disk
  //   - "https://….supabase.co/…/foo.jpg" → remote, fetch then upload
  try {
    let buf: Buffer
    let filename: string

    if (src.startsWith('http://') || src.startsWith('https://')) {
      const r = await fetch(src)
      if (!r.ok) throw new Error(`fetch ${r.status}`)
      buf = Buffer.from(await r.arrayBuffer())
      filename = basename(new URL(src).pathname)
    } else {
      const rel = src.replace(/^\/+/, '')
      const abs = join(imagesRoot, rel)
      buf = await readFile(abs)
      filename = basename(abs)
    }

    const asset = await client.assets.upload('image', buf, {filename})
    return asset._id
  } catch (err) {
    console.error(`  ! failed to upload ${src}: ${(err as Error).message}`)
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

async function importVenue(
  slug: string,
  overrides: Map<string, VenueOverride>,
): Promise<void> {
  const path = join(venuesDir, `${slug}.json`)
  const raw = JSON.parse(await readFile(path, 'utf8'))

  const override = overrides.get(slug)
  const overrideUrl = override?.public_url
  const jsonSrc = raw.heroImage?.src
  let heroSrcKind: 'cms-image-slots' | 'astro-content' | 'failed' = 'failed'

  console.log(`→ ${slug}${overrideUrl ? '  (using Supabase override)' : ''}`)
  const placeId = await upsertPlaceStub(raw.place)

  // Try the override first if one exists; on failure fall back to the JSON
  // src so we never end up with a hero-less doc when both sources existed.
  let heroAssetId: string | null = null
  if (overrideUrl) {
    heroAssetId = await uploadImageAsset(overrideUrl)
    if (heroAssetId) heroSrcKind = 'cms-image-slots'
    else if (jsonSrc) {
      console.warn(`  ! override upload failed, falling back to JSON src`)
      heroAssetId = await uploadImageAsset(jsonSrc)
      if (heroAssetId) heroSrcKind = 'astro-content'
    }
  } else if (jsonSrc) {
    heroAssetId = await uploadImageAsset(jsonSrc)
    if (heroAssetId) heroSrcKind = 'astro-content'
  }

  // Gallery uploads — sequential to keep the rate-limit friendly. Empty for
  // most venues, so this is cheap in aggregate.
  const galleryItems: Array<Record<string, unknown>> = []
  for (const img of raw.gallery ?? []) {
    if (!img?.src) continue
    const id = await uploadImageAsset(img.src)
    if (!id) continue
    galleryItems.push({
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: id},
      alt: img.alt ?? '',
      credit: img.credit ?? 'venue-media-kit',
      license: img.license ?? 'venue-media-kit',
      caption: img.caption,
    })
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

    // Editorial
    signature: raw.signature,
    whyWeGo: raw.whyWeGo,
    editorNote: textToBlocks(raw.editorNote ?? ''),
    editorVerdict: raw.editorVerdict,
    bestFor: raw.bestFor,
    ifOnlyOneThing: raw.ifOnlyOneThing,
    pairWith: raw.pairWith,
    tags: raw.tags,

    // Wine-specific
    subregion: raw.subregion,
    wines: raw.wines,
    visiting: raw.visiting,
    restaurant: raw.restaurant,
    accommodation: raw.accommodation,
    sameAs: raw.sameAs,

    // FAQ — normalise key shape (some JSONs already use {q,a}; if they used
    // {question,answer} we'd map here; current data is already {q,a}).
    faq: raw.faq,

    // Authority + commerce
    authority: raw.authority,
    affiliateNote: raw.affiliateNote,
    featuredPartner: !!raw.featuredPartner,
    editorPick: !!raw.editorPick,

    // Dog
    dogFriendly: !!raw.dogFriendly,
    dogFriendlyNotes: raw.dogFriendlyNotes,
    dogsAllowedOutdoorsOnly: raw.dogsAllowedOutdoorsOnly,
    offLeashNearby: raw.offLeashNearby,
    waterAccessNearby: raw.waterAccessNearby,
    dogAmenities: raw.dogAmenities ?? [],
    rainyDayDogSuitability: raw.rainyDayDogSuitability,

    // Location + ops
    hoursNote: raw.hoursNote,
    liveStatusUrl: raw.liveStatusUrl,

    // Admin
    lastVerified: raw.lastVerified,
    lastFactVerified: raw.lastFactVerified,
    publishedAt: raw.publishedAt
      ? new Date(raw.publishedAt).toISOString()
      : new Date().toISOString(),
    sitemapExclude: !!raw.sitemapExclude,
  }

  if (heroAssetId) {
    doc.heroImage = {
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: heroAssetId},
      alt: override?.alt_text ?? raw.heroImage?.alt ?? raw.name,
      credit: override?.credit ?? raw.heroImage?.credit ?? 'venue-media-kit',
      license: raw.heroImage?.license ?? 'venue-media-kit',
      caption: override?.caption ?? raw.heroImage?.caption,
    }
  }

  if (galleryItems.length > 0) doc.gallery = galleryItems

  // Strip undefined so Sanity doesn't store null literals.
  for (const k of Object.keys(doc)) {
    if (doc[k] === undefined) delete doc[k]
  }

  await client.createOrReplace(doc)
  console.log(`  ✓ ${slug} (hero: ${heroSrcKind})`)
}

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('SANITY_AUTH_TOKEN not set. Export the write token before running.')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const useSeed = args.includes('--seed')
  const slugArgs = args.filter((a) => !a.startsWith('--'))

  // Available venue files on disk.
  const have = new Set((await readdir(venuesDir)).filter((f) => f.endsWith('.json')).map((f) =>
    f.replace(/\.json$/, ''),
  ))

  let slugs: string[]
  if (useSeed) {
    slugs = SEED_SLUGS
  } else if (slugArgs.length > 0) {
    slugs = slugArgs
  } else {
    slugs = [...have].sort()
    console.log(`Full venue import: ${slugs.length} venues queued\n`)
  }

  const missing = slugs.filter((s) => !have.has(s))
  if (missing.length > 0) {
    console.warn(`! missing venue JSONs (skipping): ${missing.join(', ')}`)
  }

  // Fetch all venue/hero overrides once up-front.
  const overrides = await fetchVenueOverrides()

  let ok = 0
  let failed = 0
  for (const slug of slugs.filter((s) => have.has(s))) {
    try {
      await importVenue(slug, overrides)
      ok++
    } catch (err) {
      console.error(`  ✗ ${slug}:`, (err as Error).message)
      failed++
    }
  }

  console.log(`\nDone: ${ok} imported, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

void main()
