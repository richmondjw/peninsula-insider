/**
 * Peninsula Insider — Phase 5 importer.
 *
 * Imports four entity types in dependency order:
 *   tourOperators → tours (need operator refs)
 *                 → tourPackages (need tour + venue refs)
 *   experiences   (no inter-dependencies)
 *
 *   Usage: npx tsx scripts/import-phase5.ts [experiences|tour-operators|tours|tour-packages|all]
 *
 * Idempotent. Each entity stored by `<type>-<slug>` ID convention.
 */
import {createClient} from '@sanity/client'
import {readFile, readdir} from 'node:fs/promises'
import {join, dirname, basename} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
const contentRoot = join(repoRoot, 'next', 'src', 'content')
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

async function fetchOverrides(entityType: string): Promise<Map<string, Override>> {
  const url = `${SUPABASE_URL}/rest/v1/cms_image_slots?select=entity_slug,field_path,public_url,alt_text,caption,credit&entity_type=eq.${entityType}&status=eq.published&limit=500`
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept-Profile': 'pi',
    },
  })
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

async function resolveHero(raw: any, override?: Override) {
  let assetId: string | null = null
  let kind: 'cms' | 'astro' | 'failed' = 'failed'

  if (override?.public_url) {
    assetId = await uploadImage(override.public_url)
    if (assetId) kind = 'cms'
    else if (raw.heroImage?.src) {
      assetId = await uploadImage(raw.heroImage.src)
      if (assetId) kind = 'astro'
    }
  } else if (raw.heroImage?.src) {
    assetId = await uploadImage(raw.heroImage.src)
    if (assetId) kind = 'astro'
  }

  if (!assetId) return {heroImage: undefined, kind}

  return {
    heroImage: {
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: assetId},
      alt: override?.alt_text ?? raw.heroImage?.alt ?? raw.name ?? raw.title,
      credit: override?.credit ?? raw.heroImage?.credit ?? 'venue-media-kit',
      license: raw.heroImage?.license ?? 'venue-media-kit',
      caption: override?.caption ?? raw.heroImage?.caption,
    },
    kind,
  }
}

function strip<T extends Record<string, unknown>>(o: T): T {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete (o as any)[k]
  return o
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

// ── Experiences ─────────────────────────────────────────────────────────
async function importExperience(slug: string, overrides: Map<string, Override>) {
  const raw = JSON.parse(await readFile(join(contentRoot, 'experiences', `${slug}.json`), 'utf8'))
  const placeSlug = typeof raw.place === 'string' ? raw.place : raw.place?.id ?? raw.place?.slug
  const {heroImage, kind} = await resolveHero(raw, overrides.get(slug))

  const doc = strip({
    _id: `experience-${slug}`,
    _type: 'experience',
    name: raw.name,
    slug: {_type: 'slug', current: raw.slug ?? slug},
    type: raw.type,
    place: placeSlug ? {_type: 'reference', _ref: `place-${placeSlug}`} : undefined,
    zone: raw.zone,
    coordinates: raw.coordinates,
    address: raw.address,
    website: raw.website,
    bookingUrl: raw.bookingUrl,
    durationMinutes: raw.durationMinutes,
    difficulty: raw.difficulty,
    seasonBest: raw.seasonBest,
    editorNote: textToBlocks(raw.editorNote),
    tags: raw.tags,
    golf: raw.golf,
    dogFriendly: !!raw.dogFriendly,
    dogFriendlyNotes: raw.dogFriendlyNotes,
    offLeashNearby: raw.offLeashNearby,
    waterAccessNearby: raw.waterAccessNearby,
    rainyDayDogSuitability: raw.rainyDayDogSuitability,
    heroImage,
    lastVerified: raw.lastVerified,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : new Date().toISOString(),
    sitemapExclude: !!raw.sitemapExclude,
  })
  await client.createOrReplace(doc)
  console.log(`  ✓ experience/${slug} (hero: ${kind})`)
}

// ── Tour operators ──────────────────────────────────────────────────────
async function importTourOperator(slug: string, overrides: Map<string, Override>) {
  const raw = JSON.parse(await readFile(join(contentRoot, 'tour-operators', `${slug}.json`), 'utf8'))
  const {heroImage, kind} = await resolveHero(raw, overrides.get(slug))

  const doc = strip({
    _id: `tourOperator-${slug}`,
    _type: 'tourOperator',
    name: raw.name,
    slug: {_type: 'slug', current: raw.slug ?? slug},
    operatorType: raw.operatorType,
    intro: raw.intro,
    whatGoodAt: raw.whatGoodAt,
    notSuitedFor: raw.notSuitedFor,
    heroImage,
    website: raw.website,
    phone: raw.phone,
    pickupPoints: raw.pickupPoints,
    languages: raw.languages,
    maxCapacity: raw.maxCapacity,
    affiliateProgram: raw.affiliateProgram,
    affiliateUrl: raw.affiliateUrl,
    vetted: !!raw.vetted,
    lastVerified: raw.lastVerified,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : new Date().toISOString(),
  })
  await client.createOrReplace(doc)
  console.log(`  ✓ tourOperator/${slug} (hero: ${kind})`)
}

// ── Tours ───────────────────────────────────────────────────────────────
async function importTour(slug: string, overrides: Map<string, Override>) {
  const raw = JSON.parse(await readFile(join(contentRoot, 'tours', `${slug}.json`), 'utf8'))
  const {heroImage, kind} = await resolveHero(raw, overrides.get(slug))

  const doc = strip({
    _id: `tour-${slug}`,
    _type: 'tour',
    name: raw.name,
    slug: {_type: 'slug', current: raw.slug ?? slug},
    operator: {_type: 'reference', _ref: `tourOperator-${raw.operatorSlug}`, _weak: true},
    intro: raw.intro,
    whatHappens: raw.whatHappens,
    whoSuits: raw.whoSuits,
    whoDoesnt: raw.whoDoesnt,
    heroImage,
    experienceType: raw.experienceType,
    duration: raw.duration,
    theme: raw.theme,
    audience: raw.audience,
    occasion: raw.occasion,
    origin: raw.origin,
    budgetBand: raw.budgetBand,
    groupSize: raw.groupSize,
    priceLow: raw.priceLow,
    priceHigh: raw.priceHigh,
    durationHours: raw.durationHours,
    maxGroupSize: raw.maxGroupSize,
    departsFrom: raw.departsFrom,
    languages: raw.languages,
    accessibility: raw.accessibility,
    bookingUrl: raw.bookingUrl,
    aggregatorGYG: raw.aggregatorGYG,
    aggregatorViator: raw.aggregatorViator,
    bookingIntelligence: raw.bookingIntelligence,
    cancellationPolicy: raw.cancellationPolicy,
    faq: (raw.faq ?? []).map((f: any, i: number) => ({_key: `f${i}`, question: f.question, answer: f.answer})),
    lastVerified: raw.lastVerified,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : new Date().toISOString(),
  })
  await client.createOrReplace(doc)
  console.log(`  ✓ tour/${slug} (hero: ${kind})`)
}

// ── Tour packages ───────────────────────────────────────────────────────
async function importTourPackage(slug: string, overrides: Map<string, Override>) {
  const raw = JSON.parse(await readFile(join(contentRoot, 'tour-packages', `${slug}.json`), 'utf8'))
  const {heroImage, kind} = await resolveHero(raw, overrides.get(slug))

  const componentTourSlugs: string[] = raw.componentTourSlugs ?? []
  const doc = strip({
    _id: `tourPackage-${slug}`,
    _type: 'tourPackage',
    name: raw.name,
    slug: {_type: 'slug', current: raw.slug ?? slug},
    occasion: raw.occasion,
    audience: raw.audience,
    theme: raw.theme,
    bundleType: raw.bundleType,
    durationNights: raw.durationNights,
    componentTours: componentTourSlugs.map((s, i) => ({
      _type: 'reference', _key: `ct${i}`, _ref: `tour-${s}`,
      // Weak — tolerate stale data without failing the import. Editors can
      // see and fix dangling refs in the Studio.
      _weak: true,
    })),
    anchorStay: raw.anchorStaySlug
      ? {_type: 'reference', _ref: `venue-${raw.anchorStaySlug}`, _weak: true}
      : undefined,
    anchorStayBlurb: raw.anchorStayBlurb,
    altStay: raw.altStaySlug
      ? {_type: 'reference', _ref: `venue-${raw.altStaySlug}`, _weak: true}
      : undefined,
    priceLow: raw.priceLow,
    priceHigh: raw.priceHigh,
    intro: raw.intro,
    whyThisCombination: raw.whyThisCombination,
    bookingSequence: raw.bookingSequence,
    heroImage,
    faq: (raw.faq ?? []).map((f: any, i: number) => ({_key: `f${i}`, question: f.question, answer: f.answer})),
    lastVerified: raw.lastVerified,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt).toISOString() : new Date().toISOString(),
  })
  await client.createOrReplace(doc)
  console.log(`  ✓ tourPackage/${slug} (hero: ${kind})`)
}

// ── Runner ──────────────────────────────────────────────────────────────
async function listSlugs(dir: string): Promise<string[]> {
  return (await readdir(join(contentRoot, dir)))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
}

async function runExperiences() {
  const ovs = await fetchOverrides('experience')
  console.log(`\n=== experiences (${ovs.size} overrides) ===`)
  const slugs = await listSlugs('experiences')
  for (const s of slugs) try { await importExperience(s, ovs) } catch (err) { console.error(`  ✗ ${s}:`, (err as Error).message) }
}

async function runTourOperators() {
  const ovs = await fetchOverrides('tour-operator')
  console.log(`\n=== tour operators (${ovs.size} overrides) ===`)
  const slugs = await listSlugs('tour-operators')
  for (const s of slugs) try { await importTourOperator(s, ovs) } catch (err) { console.error(`  ✗ ${s}:`, (err as Error).message) }
}

async function runTours() {
  const ovs = await fetchOverrides('tour')
  console.log(`\n=== tours (${ovs.size} overrides) ===`)
  const slugs = await listSlugs('tours')
  for (const s of slugs) try { await importTour(s, ovs) } catch (err) { console.error(`  ✗ ${s}:`, (err as Error).message) }
}

async function runTourPackages() {
  const ovs = await fetchOverrides('tour-package')
  console.log(`\n=== tour packages (${ovs.size} overrides) ===`)
  const slugs = await listSlugs('tour-packages')
  for (const s of slugs) try { await importTourPackage(s, ovs) } catch (err) { console.error(`  ✗ ${s}:`, (err as Error).message) }
}

async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('SANITY_AUTH_TOKEN not set.')
    process.exit(1)
  }

  const target = (process.argv[2] ?? 'all').toLowerCase()
  // Order: operators first (tours reference them), then tours (packages
  // reference them), then packages. Experiences anytime.
  if (target === 'all' || target === 'tour-operators') await runTourOperators()
  if (target === 'all' || target === 'tours') await runTours()
  if (target === 'all' || target === 'tour-packages') await runTourPackages()
  if (target === 'all' || target === 'experiences') await runExperiences()

  console.log('\nDone.')
}

void main()
