/**
 * Phase 7 — seed page-level singletons.
 *
 * Creates fixed-ID singleton documents for the homepage cover, mega-rail,
 * site settings, and a handful of page heroes. Seeds from the current
 * hardcoded values in next/src/pages/index.astro and the Supabase
 * page/_global/* overrides.
 *
 *   Usage: npx tsx scripts/seed-singletons.ts
 *
 * Idempotent: createOrReplace by fixed _id. Re-running with edited fields
 * here overwrites Studio-edited values — once editors take over, this
 * script should only be re-run when adding NEW singletons.
 */
import {createClient} from '@sanity/client'
import {readFile} from 'node:fs/promises'
import {join, dirname, basename} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')
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

async function imageRefFromSrc(src: string, alt: string) {
  const id = await uploadImage(src)
  if (!id) return null
  return {
    _type: 'imageRef',
    asset: {_type: 'reference', _ref: id},
    alt,
    credit: 'venue-media-kit',
    license: 'venue-media-kit',
  }
}

// ── Site settings ────────────────────────────────────────────────────────
async function seedSiteSettings() {
  console.log('→ siteSettings')
  await client.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    mastheadLabel: 'Peninsula Insider',
    tagline: 'An editorial guide, not a directory.',
    editionLabel: 'Autumn Insider · May 2026',
    edition: 'May',
    editionYear: 2026,
    footerLinks: [
      {_key: 'about', label: 'About', href: '/about/'},
      {_key: 'contact', label: 'Contact', href: '/contact/'},
      {_key: 'privacy', label: 'Privacy', href: '/privacy/'},
      {_key: 'terms', label: 'Terms', href: '/terms/'},
      {_key: 'newsletter', label: 'Newsletter', href: '/newsletter/'},
    ],
    social: {},
  })
  console.log('  ✓ siteSettings')
}

// ── Homepage cover ───────────────────────────────────────────────────────
const HOMEPAGE_SCENES = [
  {
    id: 'flinders-weekend',
    label: 'THE SLOW SIDE',
    hours: '7 MIN READ',
    imageSrc: '/images/sourced/explore-bushrangers-bay-walk-01.webp',
    imageAlt:
      'Bushrangers Bay headland and Bass Strait below Cape Schanck, on the slow southern coast of the Mornington Peninsula',
    caption: 'Bushrangers Bay, south coast',
    headline: 'The <em>other</em> Peninsula weekend.',
    dispatch:
      'When Red Hill is booked out and Sorrento feels like a queue, there is another version of the Peninsula weekend, south of everything, closer to the ocean, and slower on purpose.',
    primaryHref: '/journal/a-flinders-weekend/',
    primaryLabel: 'Read',
  },
  {
    id: 'late-walks',
    label: 'THE WALK',
    hours: '7 MIN READ',
    imageSrc: '/images/sourced/home-cover-back-beach-horses-01.jpg',
    imageAlt: 'Horses on a Peninsula ocean back beach, Bass Strait in the background',
    caption: 'Back beach, Bass Strait side',
    headline: 'When the light <em>starts improving.</em>',
    dispatch:
      'Bushrangers Bay for a full reset. Cape Schanck boardwalk when time is short. Sorrento Back Beach for mood rather than route. The four walks that earn the second drink.',
    primaryHref: '/journal/the-peninsulas-best-late-afternoon-walks/',
    primaryLabel: 'Read',
  },
  {
    id: 'cover',
    label: 'THE COVER STORY',
    hours: '9 MIN READ',
    imageSrc: '/images/sourced/category-restaurant-01.webp',
    imageAlt:
      'Warm, polished restaurant interior with a marble bar, timber stools, and low lighting. The kind of room that suits a Peninsula hatted-restaurant shortlist.',
    caption: 'Peninsula dining room',
    headline: 'The Hatted Restaurants of the <em>Peninsula.</em>',
    dispatch:
      'Four two-hat restaurants. Seven one-hat tables. Barragunda is the debut, Tedesca took Regional Restaurant of the Year, and Laura is still where the long lunch happens. The complete list, with booking realities.',
    primaryHref: '/journal/hatted-restaurants-mornington-peninsula-2025/',
    primaryLabel: 'Read the cover story',
  },
  {
    id: 'cape-schanck',
    label: 'THE COMPLETE GUIDE',
    hours: '8 MIN READ',
    imageSrc: '/images/sourced/explore-cape-schanck-lighthouse-01.webp',
    imageAlt:
      'Cape Schanck lighthouse above the basalt clifftop coastline, Mornington Peninsula National Park',
    caption: 'Cape Schanck, Mornington Peninsula National Park',
    headline: 'The lighthouse at the edge of <em>everything.</em>',
    dispatch:
      'The 1859 limestone lighthouse, the boardwalk to Pulpit Rock, and the walk to Bushrangers Bay. The grounds are free from 6am. Here is the full structure of the day.',
    primaryHref: '/journal/cape-schanck-guide/',
    primaryLabel: 'Read the guide',
  },
]

async function seedHomepageCover() {
  console.log('→ homepageCover')
  const scenes: any[] = []
  for (const [i, s] of HOMEPAGE_SCENES.entries()) {
    const img = await imageRefFromSrc(s.imageSrc, s.imageAlt)
    if (!img) {
      console.warn(`  ! scene "${s.id}" hero unavailable`)
      continue
    }
    scenes.push({
      _type: 'coverScene',
      _key: `scene${i}`,
      id: s.id,
      label: s.label,
      hours: s.hours,
      image: img,
      caption: s.caption,
      headline: s.headline,
      dispatch: s.dispatch,
      primaryHref: s.primaryHref,
      primaryLabel: s.primaryLabel,
    })
  }

  await client.createOrReplace({
    _id: 'homepageCover',
    _type: 'homepageCover',
    activeSceneIndex: 0,
    scenes,
    coverDate: '2026-05-13',
  })
  console.log(`  ✓ homepageCover (${scenes.length} scenes)`)
}

// ── Mega-rail ────────────────────────────────────────────────────────────
const RAIL_ENTRIES = [
  {key: 'whats-on', label: "What's on", href: '/whats-on/'},
  {key: 'escape', label: 'Plans', href: '/plans/'},
  {key: 'eat', label: 'Eat & Drink', href: '/eat/'},
  {key: 'wine', label: 'Wine', href: '/wine/'},
  {key: 'stay', label: 'Stay', href: '/stay/'},
]

interface PageOverride {
  field_path: string
  public_url: string | null
  alt_text: string | null
  caption: string | null
}

async function fetchPageGlobalOverrides(): Promise<Map<string, PageOverride>> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/cms_image_slots?select=field_path,public_url,alt_text,caption&entity_type=eq.page&entity_slug=eq._global&status=eq.published&limit=200`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'pi',
      },
    },
  )
  if (!r.ok) return new Map()
  const rows = (await r.json()) as PageOverride[]
  const m = new Map<string, PageOverride>()
  for (const row of rows) m.set(row.field_path, row)
  return m
}

async function seedMegaRail() {
  console.log('→ megaRail')
  const overrides = await fetchPageGlobalOverrides()

  const entries: any[] = []
  for (const [i, e] of RAIL_ENTRIES.entries()) {
    const o = overrides.get(`mega-rail.${e.key}`)
    let img = null
    if (o?.public_url) img = await imageRefFromSrc(o.public_url, o.alt_text ?? e.label)
    entries.push({
      _type: 'railEntry',
      _key: `rail${i}`,
      key: e.key,
      label: e.label,
      href: e.href,
      image: img ?? undefined,
    })
  }

  await client.createOrReplace({
    _id: 'megaRail',
    _type: 'megaRail',
    entries,
  })
  console.log(`  ✓ megaRail (${entries.length} entries)`)
}

// ── Page heroes ──────────────────────────────────────────────────────────
//
// Seeds page heroes for the hubs that had a `page/<slug>/hero` override in
// the legacy Supabase layer. The full list of page/<slug> overrides shows
// six hub heroes registered: whats-on, plans, eat-cafes, places,
// tour-operators, events.

const PAGE_HERO_SLUGS = ['whats-on', 'plans', 'eat-cafes', 'places', 'tour-operators', 'events']

async function fetchPageHeroOverrides(): Promise<Map<string, PageOverride>> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/cms_image_slots?select=entity_slug,field_path,public_url,alt_text,caption&entity_type=eq.page&field_path=eq.hero&status=eq.published&limit=200`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept-Profile': 'pi',
      },
    },
  )
  if (!r.ok) return new Map()
  const rows = (await r.json()) as Array<PageOverride & {entity_slug: string}>
  const m = new Map<string, PageOverride>()
  for (const row of rows) m.set(row.entity_slug, row)
  return m
}

async function seedPageHeroes() {
  console.log('→ pageHero singletons')
  const overrides = await fetchPageHeroOverrides()

  let count = 0
  for (const slug of PAGE_HERO_SLUGS) {
    const o = overrides.get(slug)
    if (!o?.public_url) {
      console.log(`  - ${slug} (no override)`)
      continue
    }
    const img = await imageRefFromSrc(o.public_url, o.alt_text ?? slug)
    await client.createOrReplace({
      _id: `pageHero-${slug}`,
      _type: 'pageHero',
      pathSlug: slug,
      image: img ?? undefined,
    })
    console.log(`  ✓ pageHero-${slug}`)
    count++
  }
  console.log(`  (${count} page heroes seeded)`)
}

// ── Runner ──────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.SANITY_AUTH_TOKEN) {
    console.error('SANITY_AUTH_TOKEN not set.')
    process.exit(1)
  }
  await seedSiteSettings()
  await seedHomepageCover()
  await seedMegaRail()
  await seedPageHeroes()
  console.log('\nDone.')
}

void main()
