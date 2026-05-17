/**
 * Phase 2 diff tool — JSON vs Sanity place data.
 *
 *   Usage: node next/scripts/diff-places.mjs [slug1 slug2 ...]
 */
import {createClient} from '@sanity/client'
import {readFileSync, readdirSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const placesDir = join(__dirname, '..', 'src', 'content', 'places')

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

const placeQuery = `*[_type == "place" && slug.current == $slug][0]{
  name, "slug": slug.current, kind, zone, factualLede, intro, signature,
  insiderNote, tldr, bestFor, notFor, bestSeason, worstTime, stayDuration,
  bestDay, skip, driveTime, featured, sitemapExclude, publishedAt,
  coordinates,
  "relatedPlaces": relatedPlaces[]->slug.current
}`

const COMPARE = [
  'name', 'slug', 'kind', 'zone', 'factualLede', 'intro', 'signature',
  'insiderNote', 'tldr', 'bestFor', 'notFor', 'bestSeason', 'worstTime',
  'stayDuration', 'bestDay', 'skip', 'driveTime',
  'featured', 'sitemapExclude',
  'coordinates.lat', 'coordinates.lng',
  'relatedPlaces',
]

const BOOLEAN_FIELDS = new Set(['featured', 'sitemapExclude'])

function get(obj, path) {
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj)
}

function normValue(v, path) {
  if (BOOLEAN_FIELDS.has(path)) return v ? 'true' : 'false'
  if (v == null) return null
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}

function diffOne(json, sanity) {
  const mismatches = []
  for (const path of COMPARE) {
    let j, s
    if (path === 'relatedPlaces') {
      j = JSON.stringify((json.relatedPlaces ?? []).map((r) => (typeof r === 'string' ? r : r.id ?? r.slug)).sort())
      s = JSON.stringify((sanity.relatedPlaces ?? []).sort())
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
      : readdirSync(placesDir)
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.replace(/\.json$/, ''))
          .sort()

  let clean = 0
  let withDiff = 0
  const allMismatches = []

  for (const slug of slugs) {
    const json = JSON.parse(readFileSync(join(placesDir, `${slug}.json`), 'utf8'))
    const sanity = await client.fetch(placeQuery, {slug})
    if (!sanity) {
      console.log(`  ! ${slug}: not in Sanity`)
      withDiff++
      continue
    }
    const m = diffOne(json, sanity)
    if (m.length === 0) clean++
    else {
      withDiff++
      allMismatches.push({slug, mismatches: m})
    }
  }

  console.log(`\nDiff: ${clean} clean / ${withDiff} with mismatches`)
  if (allMismatches.length === 0) return

  const byField = new Map()
  for (const {slug, mismatches} of allMismatches) {
    for (const m of mismatches) {
      const arr = byField.get(m.path) ?? []
      arr.push({slug, ...m})
      byField.set(m.path, arr)
    }
  }
  console.log('\nMismatches by field:')
  for (const [path, entries] of [...byField.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${path.padEnd(24)} ${String(entries.length).padStart(2)} places`)
    for (const e of entries.slice(0, 2)) {
      console.log(`    ${e.slug}: JSON=${String(e.json).slice(0, 50)}  Sanity=${String(e.sanity).slice(0, 50)}`)
    }
  }
}

void main()
