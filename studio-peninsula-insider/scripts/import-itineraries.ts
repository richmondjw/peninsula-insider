/**
 * Peninsula Insider — itinerary importer (Phase 4).
 *
 *   Usage:
 *     npx tsx scripts/import-itineraries.ts             # all itineraries
 *     npx tsx scripts/import-itineraries.ts <slug> …    # named only
 *
 * Idempotent: `_id = 'itinerary-<slug>'`. References to venues are
 * resolved by `venue-<slug>` ID (Phase 1 venues are in place).
 * Experience references are kept as `experienceSlug` strings until
 * experiences phase lands.
 */
import {createClient} from '@sanity/client'
import {readFile, readdir} from 'node:fs/promises'
import {join, dirname, basename} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const itinerariesDir = join(repoRoot, 'next', 'src', 'content', 'itineraries')
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

interface ItnOverride {
  entity_slug: string
  field_path: string
  public_url: string | null
  alt_text: string | null
  caption: string | null
  credit: string | null
}

async function fetchOverrides(): Promise<Map<string, ItnOverride>> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/cms_image_slots?select=entity_slug,field_path,public_url,alt_text,caption,credit&entity_type=eq.itinerary&status=eq.published&limit=200`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'pi',
      },
    },
  )
  if (!r.ok) return new Map()
  const rows = (await r.json()) as ItnOverride[]
  const m = new Map<string, ItnOverride>()
  for (const row of rows) if (row.field_path === 'hero') m.set(row.entity_slug, row)
  console.log(`Found ${m.size} itinerary/hero overrides in Supabase\n`)
  return m
}

async function uploadImage(src: string): Promise<string | null> {
  try {
    let buf: Buffer
    let filename: string
    if (src.startsWith('http')) {
      const r = await fetch(src)
      if (!r.ok) throw new Error(`fetch ${r.status}`)
      buf = Buffer.from(await r.arrayBuffer())
      filename = basename(new URL(src).pathname)
    } else {
      buf = await readFile(join(imagesRoot, src.replace(/^\/+/, '')))
      filename = basename(src)
    }
    const a = await client.assets.upload('image', buf, {filename})
    return a._id
  } catch (err) {
    console.error(`  ! upload failed ${src}: ${(err as Error).message}`)
    return null
  }
}

function stops(raw: Array<Record<string, any>> | undefined) {
  return (raw ?? []).map((s, i) => {
    const stop: Record<string, unknown> = {
      _type: 'itineraryStop',
      _key: `s${i}`,
      day: s.day,
      order: s.order,
      timeOfDay: s.timeOfDay,
      note: s.note,
      timeRange: s.timeRange,
      practical: s.practical,
      driveMinutesToNext: s.driveMinutesToNext,
    }
    if (s.venue) {
      const venueSlug = typeof s.venue === 'string' ? s.venue : s.venue.id ?? s.venue.slug
      stop.venue = {_type: 'reference', _ref: `venue-${venueSlug}`}
    }
    if (s.experience) {
      stop.experienceSlug = typeof s.experience === 'string' ? s.experience : s.experience.id ?? s.experience.slug
    }
    for (const k of Object.keys(stop)) if (stop[k] === undefined) delete stop[k]
    return stop
  })
}

async function importItinerary(slug: string, overrides: Map<string, ItnOverride>) {
  const raw = JSON.parse(await readFile(join(itinerariesDir, `${slug}.json`), 'utf8'))
  const o = overrides.get(slug)
  console.log(`→ ${slug}${o ? '  (using Supabase override)' : ''}`)

  let heroAssetId: string | null = null
  let heroKind: 'cms' | 'astro' | 'failed' = 'failed'
  if (o?.public_url) {
    heroAssetId = await uploadImage(o.public_url)
    if (heroAssetId) heroKind = 'cms'
    else if (raw.heroImage?.src) {
      heroAssetId = await uploadImage(raw.heroImage.src)
      if (heroAssetId) heroKind = 'astro'
    }
  } else if (raw.heroImage?.src) {
    heroAssetId = await uploadImage(raw.heroImage.src)
    if (heroAssetId) heroKind = 'astro'
  }

  const anchorStaySlug =
    typeof raw.anchorStay === 'string' ? raw.anchorStay : raw.anchorStay?.id ?? raw.anchorStay?.slug
  const anchorTownSlug =
    typeof raw.anchorTown === 'string' ? raw.anchorTown : raw.anchorTown?.id ?? raw.anchorTown?.slug
  const altStays: string[] = (raw.altStays ?? []).map((v: any) =>
    typeof v === 'string' ? v : v.id ?? v.slug,
  )
  const baseTowns: string[] = (raw.baseTowns ?? []).map((p: any) =>
    typeof p === 'string' ? p : p.id ?? p.slug,
  )

  const doc: Record<string, unknown> = {
    _id: `itinerary-${slug}`,
    _type: 'itinerary',
    title: raw.title,
    slug: {_type: 'slug', current: raw.slug ?? slug},
    dek: raw.dek,
    audience: raw.audience,
    mood: raw.mood,
    lengthNights: raw.lengthNights,
    duration: raw.duration,
    theme: raw.theme,
    occasion: raw.occasion,
    origin: raw.origin,
    budget: raw.budget,
    season: raw.season,
    editorialFrame: raw.editorialFrame,
    drivingDistanceKm: raw.drivingDistanceKm,
    walkingIntensity: raw.walkingIntensity,
    budgetRangeAud: raw.budgetRangeAud,
    costBreakdown: raw.costBreakdown,
    bookingChecklist: (raw.bookingChecklist ?? []).map((b: any, i: number) => ({
      _key: `b${i}`,
      ...b,
    })),
    variations: (raw.variations ?? []).map((v: any, i: number) => ({
      _key: `v${i}`,
      label: v.label,
      body: v.body,
      relatedItinerarySlug: v.relatedItinerary,
    })),
    skipThese: raw.skipThese,
    faq: (raw.faq ?? []).map((f: any, i: number) => ({_key: `f${i}`, question: f.question, answer: f.answer})),
    stops: stops(raw.stops),
    totalDriveMinutes: raw.totalDriveMinutes,
    editorNote: raw.editorNote,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : new Date().toISOString(),
    lastVerified: raw.lastVerified,
    sitemapExclude: !!raw.sitemapExclude,
  }

  if (anchorStaySlug) doc.anchorStay = {_type: 'reference', _ref: `venue-${anchorStaySlug}`}
  if (raw.anchorStayBlurb) doc.anchorStayBlurb = raw.anchorStayBlurb
  if (anchorTownSlug) doc.anchorTown = {_type: 'reference', _ref: `place-${anchorTownSlug}`}
  if (altStays.length > 0)
    doc.altStays = altStays.map((s, i) => ({_type: 'reference', _key: `as${i}`, _ref: `venue-${s}`}))
  if (baseTowns.length > 0)
    doc.baseTowns = baseTowns.map((s, i) => ({_type: 'reference', _key: `bt${i}`, _ref: `place-${s}`}))

  if (heroAssetId) {
    doc.heroImage = {
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: heroAssetId},
      alt: o?.alt_text ?? raw.heroImage?.alt ?? raw.title,
      credit: o?.credit ?? raw.heroImage?.credit ?? 'venue-media-kit',
      license: raw.heroImage?.license ?? 'venue-media-kit',
      caption: o?.caption ?? raw.heroImage?.caption,
    }
  }

  for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k]

  await client.createOrReplace(doc)
  console.log(`  ✓ ${slug} (hero: ${heroKind}, stops: ${(doc.stops as unknown[]).length})`)
}

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('SANITY_AUTH_TOKEN not set.')
    process.exit(1)
  }
  const args = process.argv.slice(2)
  const have = new Set(
    (await readdir(itinerariesDir)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')),
  )
  const slugs = args.length > 0 ? args : [...have].sort()
  const overrides = await fetchOverrides()

  for (const slug of slugs.filter((s) => have.has(s))) {
    try {
      await importItinerary(slug, overrides)
    } catch (err) {
      console.error(`  ✗ ${slug}:`, (err as Error).message)
    }
  }
  console.log(`\nDone: ${slugs.length} itineraries processed.`)
}

void main()
