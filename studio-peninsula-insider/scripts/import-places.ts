/**
 * Peninsula Insider — place importer (Phase 2).
 *
 * Reads place JSONs from next/src/content/places, merges Supabase
 * place/hero overrides, and upserts Sanity documents. Two-pass: first
 * pass creates/updates each place with all fields *except* relatedPlaces
 * (because the targets may not exist yet); second pass attaches the
 * relatedPlaces references.
 *
 *   Usage:
 *     npx tsx scripts/import-places.ts             # all places
 *     npx tsx scripts/import-places.ts <slug> …    # named places only
 *
 * Idempotent: `_id = 'place-<slug>'`.
 */
import {createClient} from '@sanity/client'
import {readFile, readdir} from 'node:fs/promises'
import {join, dirname, basename} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const placesDir = join(repoRoot, 'next', 'src', 'content', 'places')
const imagesRoot = join(repoRoot, 'next', 'public')

const SUPABASE_URL = 'https://tjjhpvslpysfklwpqmgz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_JlZuo95QvNZi2ZNrFyK-Cw_2y0U7HLp'

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_AUTH_TOKEN,
  useCdn: false,
})

const docId = (slug: string) => `place-${slug}`

interface PlaceOverride {
  entity_slug: string
  field_path: string
  public_url: string | null
  alt_text: string | null
  caption: string | null
  credit: string | null
}

async function fetchPlaceOverrides(): Promise<Map<string, PlaceOverride>> {
  const url =
    `${SUPABASE_URL}/rest/v1/cms_image_slots` +
    `?select=entity_slug,field_path,public_url,alt_text,caption,credit` +
    `&entity_type=eq.place&status=eq.published&limit=1000`
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
  const rows = (await r.json()) as PlaceOverride[]
  const map = new Map<string, PlaceOverride>()
  for (const row of rows) {
    if (row.field_path === 'hero') map.set(row.entity_slug, row)
  }
  console.log(`Found ${map.size} published place hero overrides in Supabase\n`)
  return map
}

async function uploadImageAsset(src: string): Promise<string | null> {
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

async function upsertPlace(
  slug: string,
  overrides: Map<string, PlaceOverride>,
  pass: 'data' | 'refs',
): Promise<{relatedSlugs: string[]; name: string}> {
  const raw = JSON.parse(await readFile(join(placesDir, `${slug}.json`), 'utf8'))
  const override = overrides.get(slug)
  const overrideUrl = override?.public_url
  const jsonSrc = raw.heroImage?.src

  if (pass === 'data') {
    console.log(`→ ${slug}${override ? '  (using Supabase override)' : ''}`)
  }

  let heroSrcKind: 'cms-image-slots' | 'astro-content' | 'failed' = 'failed'
  let heroAssetId: string | null = null

  if (pass === 'data') {
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

    const doc: Record<string, unknown> = {
      _id: docId(slug),
      _type: 'place',
      name: raw.name,
      slug: {_type: 'slug', current: raw.slug},
      kind: raw.kind,
      zone: raw.zone,
      coordinates: raw.coordinates,
      factualLede: raw.factualLede,
      intro: raw.intro,
      signature: raw.signature,
      insiderNote: raw.insiderNote,
      tldr: raw.tldr,
      bestFor: raw.bestFor,
      notFor: raw.notFor,
      bestSeason: raw.bestSeason,
      worstTime: raw.worstTime,
      stayDuration: raw.stayDuration,
      bestDay: raw.bestDay,
      skip: raw.skip,
      driveTime: raw.driveTime,
      featured: !!raw.featured,
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

    for (const k of Object.keys(doc)) {
      if (doc[k] === undefined) delete doc[k]
    }

    await client.createOrReplace(doc)
    console.log(`  ✓ ${slug} (hero: ${heroSrcKind})`)
  } else {
    // refs pass — patch relatedPlaces only, after all docs exist
    const relatedSlugs: string[] = (raw.relatedPlaces ?? []).map((r: any) =>
      typeof r === 'string' ? r : r.id ?? r.slug,
    )
    if (relatedSlugs.length > 0) {
      await client
        .patch(docId(slug))
        .set({
          relatedPlaces: relatedSlugs.map((s) => ({
            _type: 'reference',
            _key: s,
            _ref: docId(s),
          })),
        })
        .commit()
      console.log(`  ✓ ${slug} → ${relatedSlugs.length} related place refs`)
    }
  }

  return {relatedSlugs: raw.relatedPlaces ?? [], name: raw.name}
}

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('SANITY_AUTH_TOKEN not set.')
    process.exit(1)
  }

  const argSlugs = process.argv.slice(2)
  const have = new Set(
    (await readdir(placesDir)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')),
  )
  const slugs = argSlugs.length > 0 ? argSlugs : [...have].sort()

  const missing = slugs.filter((s) => !have.has(s))
  if (missing.length > 0) {
    console.warn(`! missing place JSONs (skipping): ${missing.join(', ')}`)
  }
  const queue = slugs.filter((s) => have.has(s))

  const overrides = await fetchPlaceOverrides()

  console.log('=== Pass 1: data + heroes ===')
  for (const slug of queue) {
    try {
      await upsertPlace(slug, overrides, 'data')
    } catch (err) {
      console.error(`  ✗ ${slug}:`, (err as Error).message)
    }
  }

  console.log('\n=== Pass 2: relatedPlaces references ===')
  for (const slug of queue) {
    try {
      await upsertPlace(slug, overrides, 'refs')
    } catch (err) {
      console.error(`  ✗ ${slug}:`, (err as Error).message)
    }
  }

  console.log(`\nDone: ${queue.length} places processed.`)
}

void main()
