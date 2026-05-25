/**
 * Peninsula Insider — events importer (Phase 4 — events portion).
 *
 * Events are mostly scraper-imported (76 of 91 auto-discovered), with an
 * editorial overlay (editor verdict, kids grade, lens tags, etc). This
 * importer copies the snapshot of JSON state into Sanity but does not
 * touch the cron pipeline — that's a separate workstream and would
 * eventually need to write into Sanity directly.
 *
 *   Usage:
 *     npx tsx scripts/import-events.ts             # all
 *     npx tsx scripts/import-events.ts <slug> …    # named only
 *
 * Idempotent: `_id = 'event-<slug>'`.
 */
import {createClient} from '@sanity/client'
import {readFile, readdir} from 'node:fs/promises'
import {join, dirname, basename} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const eventsDir = join(repoRoot, 'next', 'src', 'content', 'events')
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

interface Override {
  entity_slug: string
  field_path: string
  public_url: string | null
  alt_text: string | null
  caption: string | null
  credit: string | null
}

async function fetchOverrides(): Promise<Map<string, Override>> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/cms_image_slots?select=entity_slug,field_path,public_url,alt_text,caption,credit&entity_type=eq.event&status=eq.published&limit=500`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'pi',
      },
    },
  )
  if (!r.ok) return new Map()
  const rows = (await r.json()) as Override[]
  const m = new Map<string, Override>()
  for (const row of rows) if (row.field_path === 'hero') m.set(row.entity_slug, row)
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

function textToBlocks(text: string | undefined | null): Array<Record<string, unknown>> {
  if (!text) return []
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((para, i) => ({
      _type: 'block',
      _key: `b${i}`,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: `s${i}`, text: para, marks: []}],
    }))
}

function unpackRef(r: any): string | null {
  if (!r) return null
  if (typeof r === 'string') return r
  return r.id ?? r.slug ?? null
}

async function importEvent(file: string, overrides: Map<string, Override>) {
  const slug = file.replace(/\.json$/, '')
  const raw = JSON.parse(await readFile(join(eventsDir, file), 'utf8'))
  const override = overrides.get(slug)

  let heroAssetId: string | null = null
  let kind: 'cms' | 'astro' | 'failed' = 'failed'
  if (override?.public_url) {
    heroAssetId = await uploadImage(override.public_url)
    if (heroAssetId) kind = 'cms'
    else if (raw.heroImage?.src) {
      heroAssetId = await uploadImage(raw.heroImage.src)
      if (heroAssetId) kind = 'astro'
    }
  } else if (raw.heroImage?.src) {
    heroAssetId = await uploadImage(raw.heroImage.src)
    if (heroAssetId) kind = 'astro'
  }

  const venueSlug = unpackRef(raw.venue)
  const placeSlug = unpackRef(raw.place)

  const doc: Record<string, any> = {
    _id: `event-${slug}`,
    _type: 'event',
    title: raw.title,
    slug: {_type: 'slug', current: raw.slug ?? slug},
    summary: raw.summary,
    description: raw.description,
    eventId: raw.eventId,
    startDate: raw.startDate ? new Date(raw.startDate).toISOString() : new Date().toISOString(),
    endDate: raw.endDate ? new Date(raw.endDate).toISOString() : undefined,
    startTime: raw.startTime,
    endTime: raw.endTime,
    season: raw.season,
    month: raw.month,
    category: raw.category,
    subcategory: raw.subcategory,
    recurrence: raw.recurrence ?? 'one-off',
    recurrenceNote: raw.recurrenceNote,
    venue: venueSlug ? {_type: 'reference', _ref: `venue-${venueSlug}`, _weak: true} : undefined,
    venueName: raw.venueName,
    place: placeSlug ? {_type: 'reference', _ref: `place-${placeSlug}`, _weak: true} : undefined,
    venueRegion: raw.venueRegion,
    suburb: raw.suburb,
    streetAddress: raw.streetAddress,
    coordinates: raw.coordinates,
    indoorOutdoor: raw.indoorOutdoor,
    bookingUrl: raw.bookingUrl,
    ticketingUrl: raw.ticketingUrl,
    officialEventUrl: raw.officialEventUrl,
    bookingRequired: raw.bookingRequired,
    freePaid: raw.freePaid,
    priceRange: raw.priceRange,
    priceTier: raw.priceTier,
    suitableFor: raw.suitableFor,
    audienceTags: raw.audienceTags ?? [],
    familyFriendly: raw.familyFriendly,
    petFriendly: raw.petFriendly,
    accessibilityNotes: raw.accessibilityNotes,
    weather: raw.weather ?? 'mixed',
    weatherDependency: raw.weatherDependency,
    weatherShape: raw.weatherShape,
    organiser: raw.organiser,
    primarySourceUrl: raw.primarySourceUrl,
    secondarySourceUrl: raw.secondarySourceUrl,
    verificationStatus: raw.verificationStatus,
    lastCheckedDate: raw.lastCheckedDate,
    visitorAppealScore: raw.visitorAppealScore,
    editorialPriority: raw.editorialPriority,
    nearbyAttractions: raw.nearbyAttractions,
    suggestedItineraryPairing: raw.suggestedItineraryPairing,
    nextOccurrence: raw.nextOccurrence ? new Date(raw.nextOccurrence).toISOString() : undefined,

    // Editorial overlay
    kidsGrade: raw.kidsGrade,
    kidsGradeNote: raw.kidsGradeNote,
    worthTheDrive: !!raw.worthTheDrive,
    firstTimer: !!raw.firstTimer,
    standoutOfMonth: !!raw.standoutOfMonth,
    skipThis: !!raw.skipThis,
    skipReason: raw.skipReason,
    skipInstead: raw.skipInstead,
    editorVerdict: raw.editorVerdict,
    whyWeCare: raw.whyWeCare,
    pairingProse: raw.pairingProse,
    editorVisited: !!raw.editorVisited,
    featuredInDispatch: raw.featuredInDispatch,
    lens: raw.lens ?? [],
    editorNote: textToBlocks(raw.editorNote),

    // Admin
    status: raw.status ?? 'published',
    publishedAt: raw.publishedAt
      ? new Date(raw.publishedAt).toISOString()
      : new Date().toISOString(),
    internalNotes: raw.internalNotes,
    manualFollowUpRequired: !!raw.manualFollowUpRequired,
    sitemapExclude: !!raw.sitemapExclude,
  }

  if (heroAssetId) {
    doc.heroImage = {
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: heroAssetId},
      alt: override?.alt_text ?? raw.heroImage?.alt ?? raw.title,
      credit: override?.credit ?? raw.heroImage?.credit ?? 'venue-media-kit',
      license: raw.heroImage?.license ?? 'venue-media-kit',
      caption: override?.caption ?? raw.heroImage?.caption,
    }
  }

  for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k]

  await client.createOrReplace(doc)
  console.log(`  ✓ event/${slug}${heroAssetId ? ` (hero: ${kind})` : ''}`)
}

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('SANITY_AUTH_TOKEN not set.')
    process.exit(1)
  }
  const args = process.argv.slice(2)
  const files = (await readdir(eventsDir)).filter((f) => f.endsWith('.json'))
  const queue =
    args.length > 0 ? files.filter((f) => args.includes(f.replace(/\.json$/, ''))) : files

  const overrides = await fetchOverrides()
  console.log(`Found ${overrides.size} event hero overrides in Supabase\n`)
  console.log(`=== events (${queue.length}) ===`)

  let ok = 0
  let failed = 0
  for (const file of queue) {
    try {
      await importEvent(file, overrides)
      ok++
    } catch (err) {
      console.error(`  ✗ ${file}:`, (err as Error).message)
      failed++
    }
  }

  console.log(`\nDone: ${ok} imported, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

void main()
