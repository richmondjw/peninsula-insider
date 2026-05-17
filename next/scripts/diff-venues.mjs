/**
 * Phase 1 diff tool — JSON-path vs Sanity-path venue rendering.
 *
 * For every venue on disk:
 *   1. Fetch the Sanity adapter shape (read pipeline)
 *   2. Read the canonical JSON
 *   3. Normalise both to a comparable subset
 *   4. Diff field-by-field; report mismatches
 *
 * This isn't a full HTML diff (Astro isn't booted here) — it operates on
 * the data shape that gets passed to VenueDetailTemplate. If the data
 * matches, the template will render the same HTML modulo the heroImage URL
 * (intentionally different: JSON path serves /images/sourced/foo.webp,
 * Sanity path serves cdn.sanity.io/...). HeroImage URL difference is
 * expected and excluded from the diff.
 *
 *   Usage: node next/scripts/diff-venues.mjs [slug1 slug2 ...]
 */
import {createClient} from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import {readFileSync, readdirSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const venuesDir = join(__dirname, '..', 'src', 'content', 'venues')

// Load env from .env.local
const envPath = join(__dirname, '..', '.env.local')
const env = readFileSync(envPath, 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/)
  if (m) process.env[m[1]] = m[2]
}

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  useCdn: false,
  token: process.env.SANITY_READ_TOKEN,
})

const imageProjection = `{ asset->{_id}, alt, credit, caption, license }`
const placeProjection = `{ "slug": slug.current, name }`
const venueQuery = `*[_type == "venue" && slug.current == $slug][0]{
  name, "slug": slug.current, type, zone, address, phone, website, bookingUrl,
  bookingProvider, priceBand, signature, whyWeGo, editorVerdict,
  bestFor, ifOnlyOneThing, pairWith, tags, authority, subregion,
  wines, visiting, restaurant, accommodation, sameAs,
  "faq": faq[]{q, a},
  dogFriendly, featuredPartner, editorPick, hoursNote,
  liveStatusUrl, lastVerified, publishedAt, sitemapExclude,
  place-> ${placeProjection},
  heroImage ${imageProjection},
  coordinates,
  "editorNoteText": pt::text(editorNote)
}`

// Fields we compare. Excludes heroImage.src and gallery (CDN URL vs disk
// path — known different) and editorNote text (Portable Text re-flattens
// punctuation differently than the original; tracked but not gated).
const COMPARE = [
  'name', 'slug', 'type', 'zone', 'address', 'phone', 'website',
  'bookingUrl', 'bookingProvider', 'priceBand', 'signature', 'whyWeGo',
  'bestFor', 'ifOnlyOneThing', 'pairWith',
  'tags.mood', 'tags.season', 'tags.audience',
  'authority.hats', 'authority.hallidayScore',
  'subregion', 'wines.winemaker', 'wines.keyVarieties', 'wines.topLabel',
  'sameAs.officialSite', 'faq.length',
  'featuredPartner', 'editorPick', 'sitemapExclude',
  'place.slug', 'coordinates.lat', 'coordinates.lng',
]

function get(obj, path) {
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj)
}

const BOOLEAN_FIELDS = new Set([
  'featuredPartner',
  'editorPick',
  'sitemapExclude',
  'dogFriendly',
])

function normValue(v, path) {
  if (BOOLEAN_FIELDS.has(path)) {
    // Astro Zod defaults missing booleans to false. Treat null/undefined === false.
    return v ? 'true' : 'false'
  }
  if (v == null) return null
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}

function diffOne(json, sanity) {
  const mismatches = []
  for (const path of COMPARE) {
    let j, s
    // Adapt JSON shape → comparable
    if (path === 'place.slug') {
      j = typeof json.place === 'string' ? json.place : json.place?.id
      s = sanity.place?.slug
    } else if (path === 'faq.length') {
      j = (json.faq ?? []).length
      s = (sanity.faq ?? []).length
    } else {
      j = get(json, path)
      s = get(sanity, path)
    }
    const a = normValue(j, path)
    const b = normValue(s, path)
    if (a !== b) mismatches.push({path, json: a, sanity: b})
  }
  return mismatches
}

async function main() {
  const argSlugs = process.argv.slice(2)
  const slugs =
    argSlugs.length > 0
      ? argSlugs
      : readdirSync(venuesDir)
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.replace(/\.json$/, ''))
          .sort()

  let clean = 0
  let withDiff = 0
  const allMismatches = []

  for (const slug of slugs) {
    const json = JSON.parse(readFileSync(join(venuesDir, `${slug}.json`), 'utf8'))
    const sanity = await client.fetch(venueQuery, {slug})
    if (!sanity) {
      console.log(`  ! ${slug}: not in Sanity`)
      withDiff++
      continue
    }
    const mismatches = diffOne(json, sanity)
    if (mismatches.length === 0) {
      clean++
    } else {
      withDiff++
      allMismatches.push({slug, mismatches})
    }
  }

  console.log(`\nDiff summary: ${clean} clean / ${withDiff} with mismatches`)
  if (allMismatches.length === 0) return

  // Aggregate by field path to see systemic issues.
  const byField = new Map()
  for (const {slug, mismatches} of allMismatches) {
    for (const m of mismatches) {
      const arr = byField.get(m.path) ?? []
      arr.push({slug, ...m})
      byField.set(m.path, arr)
    }
  }
  console.log('\nMismatches by field (top affected fields):')
  const sorted = [...byField.entries()].sort((a, b) => b[1].length - a[1].length)
  for (const [path, entries] of sorted.slice(0, 15)) {
    console.log(`  ${path.padEnd(28)} ${String(entries.length).padStart(3)} venues`)
    for (const e of entries.slice(0, 2)) {
      const j = String(e.json).slice(0, 40)
      const s = String(e.sanity).slice(0, 40)
      console.log(`    ${e.slug}: JSON="${j}"  Sanity="${s}"`)
    }
  }
}

void main()
