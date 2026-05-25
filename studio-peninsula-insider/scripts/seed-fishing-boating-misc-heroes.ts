/**
 * Seed pageHero singletons for the fishing, boating, insiders-30, awards
 * and guides verticals. PR F of the click-to-edit-images series wires
 * those Astro pages to the SectionHero pageHero dual-read path; this
 * script creates the matching Studio docs so editors can override the
 * eyebrow / title / dek / image without a code change.
 *
 *   Usage: SANITY_WRITE_TOKEN=... npx tsx scripts/seed-fishing-boating-misc-heroes.ts
 *
 * Idempotent: createOrReplace by fixed _id derived from pathSlug.
 *
 * Pages with bespoke layouts that don't fit pageHero are intentionally
 * omitted here:
 *   - /insiders-30/map/ (custom map-canvas hero, no image)
 *   - /guides/<season>/ and /guides/easter-long-weekend/ (PrintLayout
 *     PDFs; covers are bespoke print artwork, not site heroes)
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
  eyebrow: string
  title: string
  dek?: string
  imagePath?: string
}

// Slugs mirror the entitySlug values already in the Astro pages.
// Convention: dash-separated path (e.g. `fishing-charters`).
const HEROES: HubHero[] = [
  {
    slug: 'fishing',
    eyebrow: 'Fishing',
    title: 'Fishing the <em>Mornington Peninsula</em>',
    dek: 'Three overlapping fisheries, Port Phillip Bay, Western Port, the Bass Strait fringe, twelve species, and a calendar that runs year-round. The editorial layer above the VFA data and below the operator brochures.',
    imagePath: '/images/sourced/explore-portsea-front-beach-01.webp',
  },
  {
    slug: 'fishing-charters',
    eyebrow: 'Fishing · Charters',
    title: 'Peninsula fishing charters, <em>compared</em>',
    dek: "The buyer's guide. Each operator profile names the species they actually target, the departure points they use, the vessel, the price band, and whether the licence is covered for the day.",
  },
  {
    slug: 'fishing-charters-first-charter-guide',
    eyebrow: 'Fishing · Charters',
    title: 'Your first <em>Peninsula fishing charter</em>',
    dek: 'Choosing a charter, knowing what is covered, packing the right kit, and not embarrassing yourself on the deck. The complete first-time guide.',
  },
  {
    slug: 'fishing-locations',
    eyebrow: 'Fishing · Locations',
    title: 'Where to <em>actually</em> fish on the Peninsula',
    dek: 'Twelve locations grouped by water body. Access, parking pressure, primary species, tide windows, and what each spot is and isn\'t suited to.',
  },
  {
    slug: 'fishing-seasons-snapper-run-oct-dec',
    eyebrow: 'Fishing · Seasons',
    title: 'The Peninsula <em>snapper season</em>, week by week',
    dek: 'The October to December snapper run is the most significant event in the Victorian recreational fishing calendar. Nothing else on the Peninsula concentrates as many anglers, charters, and local knowledge into a single 12-week window. This is how it actually unfolds.',
  },
  {
    slug: 'fishing-species',
    eyebrow: 'Fishing · Species',
    title: 'The 12 species that <em>actually</em> fish on the Peninsula',
    dek: 'Bag and size limits cite the Victorian Fisheries Authority verbatim. The editorial layer covers Peninsula-specific tide windows, where the species reliably runs, and which charters target it.',
  },
  {
    slug: 'boating',
    eyebrow: 'Boating',
    title: 'Boating the <em>Mornington Peninsula</em>',
    dek: 'Two clean choices: own a vessel and need a ramp, or do not own one and need a hire operator or skippered charter. The infrastructure is here. So are the avoidable mistakes.',
    imagePath: '/images/sourced/explore-portsea-front-beach-01.webp',
  },
  {
    slug: 'boating-hire',
    eyebrow: 'Boating · Hire',
    title: 'Self-drive boat hire on the <em>Peninsula</em>',
    dek: 'Tinnies and polycraft from Mornington, Sorrento, Rye, and Safety Beach. No-licence options for visitors. Half-day and full-day rates with the gear sometimes included, confirm with the operator.',
  },
  {
    slug: 'boating-ramps',
    eyebrow: 'Boating · Ramps',
    title: 'Peninsula boat ramps, <em>by use case</em>',
    dek: "Every metadata-only ramp directory tells you the lane count and the postcode. This one tells you whether you can launch at low tide and whether you'll get a park on Saturday morning.",
  },
  {
    slug: 'boating-tides-safety',
    eyebrow: 'Boating',
    title: 'Tides, weather, and safety on the <em>Peninsula</em>',
    dek: 'Pre-trip planning for Port Phillip Bay and Western Port. The reference stations to use, the conditions to read, the alternatives to know about. The kind of session that does not feature in the news is the one that started with the right pre-trip check.',
  },
  {
    slug: 'insiders-30',
    eyebrow: "The Insider's 30",
    title: 'Thirty places that <em>defined</em> the Peninsula this year.',
    dek: 'The annual editorial ranking. Thirty venues, ordered. No paid placements, no popularity contest, no sponsor influence.',
  },
  {
    slug: 'awards',
    eyebrow: 'The Peninsula Insider Awards',
    title: 'The Peninsula at its <em>best</em>, named.',
    dek: 'Nine categories. Editor selections and reader voting. Nominations open August, voting through September, results announced the first weekend of October. Independent, editorially gated, never paid.',
  },
  {
    slug: 'awards-nominate',
    eyebrow: 'Nominate',
    title: 'Tell us who should be on the <em>2026</em> ballot.',
    dek: 'Anyone can nominate. Editorial reviews every submission and lifts the strongest into the public ballot. The shortlist publishes in early September; voting follows.',
  },
  {
    slug: 'guides',
    eyebrow: 'Seasonal guides',
    title: 'The Peninsula, <em>by season</em>.',
    dek: 'Eight-page editorial guides, venues, walks, and a sample weekend, shaped for the time of year. Print one for the glove box, keep one in the kitchen drawer, forward one to the friend who is asking what to do.',
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

function idForSlug(slug: string): string {
  return `pageHero-${slug.replace(/\//g, '--')}`
}

async function seed() {
  if (!process.env.SANITY_WRITE_TOKEN) {
    console.error('SANITY_WRITE_TOKEN not set.')
    process.exit(1)
  }

  for (const h of HEROES) {
    console.log(`→ ${h.slug}`)
    let image: Record<string, unknown> | undefined
    if (h.imagePath) {
      const assetId = await uploadImage(h.imagePath)
      if (assetId) {
        image = {
          _type: 'imageRef',
          asset: {_type: 'reference', _ref: assetId},
          alt: h.title.replace(/<[^>]+>/g, ''),
          credit: 'editorial',
          license: 'editorial',
        }
      }
    }

    await client.createOrReplace({
      _id: idForSlug(h.slug),
      _type: 'pageHero',
      pathSlug: h.slug,
      eyebrow: h.eyebrow,
      title: h.title,
      ...(h.dek ? {dek: h.dek} : {}),
      ...(image ? {image} : {}),
    })
    console.log(`  ✓ ${idForSlug(h.slug)}`)
  }

  console.log('\nDone.')
}

void seed()
