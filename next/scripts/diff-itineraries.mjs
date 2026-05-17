/**
 * Phase 4 diff — JSON vs Sanity itinerary data.
 *   Usage: node next/scripts/diff-itineraries.mjs [slug1 …]
 */
import {createClient} from '@sanity/client'
import {readFileSync, readdirSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '..', 'src', 'content', 'itineraries')

const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
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

const query = `*[_type == "itinerary" && slug.current == $slug][0]{
  title, "slug": slug.current, dek, audience, mood, lengthNights,
  totalDriveMinutes, editorNote, sitemapExclude,
  "anchorStaySlug": anchorStay->slug.current,
  "anchorTownSlug": anchorTown->slug.current,
  "altStaySlugs": altStays[]->slug.current,
  "baseTownSlugs": baseTowns[]->slug.current,
  faq[]{question, answer},
  stops[]{
    day, order, timeOfDay, note, timeRange, practical, driveMinutesToNext,
    "venueSlug": venue->slug.current,
    experienceSlug
  }
}`

const COMPARE = [
  'title', 'slug', 'dek', 'audience', 'mood', 'lengthNights',
  'totalDriveMinutes', 'editorNote', 'sitemapExclude',
  'anchorStay', 'anchorTown', 'altStays', 'baseTowns',
  'faq', 'stopsSummary',
]

const BOOL = new Set(['sitemapExclude'])

function get(o, p) { return p.split('.').reduce((a,k)=>a==null?a:a[k], o) }

function norm(v, path) {
  if (BOOL.has(path)) return v ? 'true' : 'false'
  if (v == null) return null
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}

function stopsSummary(stops) {
  return (stops ?? [])
    .slice()
    .sort((a, b) => a.day - b.day || a.order - b.order)
    .map((s) => `d${s.day}.${s.order}.${s.timeOfDay}:${s.venue ?? s.experience ?? s.venueSlug ?? s.experienceSlug ?? '?'}`)
    .join('|')
}

function unpack(ref) {
  return typeof ref === 'string' ? ref : ref?.id ?? ref?.slug ?? null
}

async function main() {
  const argSlugs = process.argv.slice(2)
  const slugs = argSlugs.length > 0 ? argSlugs : readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>f.replace(/\.json$/,'')).sort()

  let clean = 0
  let withDiff = 0
  const all = []

  for (const slug of slugs) {
    const json = JSON.parse(readFileSync(join(dir, `${slug}.json`), 'utf8'))
    const sanity = await client.fetch(query, {slug})
    if (!sanity) { console.log(`  ! ${slug}: not in Sanity`); withDiff++; continue }

    const mismatches = []
    for (const path of COMPARE) {
      let j, s
      if (path === 'anchorStay') {
        j = unpack(json.anchorStay); s = sanity.anchorStaySlug
      } else if (path === 'anchorTown') {
        j = unpack(json.anchorTown); s = sanity.anchorTownSlug
      } else if (path === 'altStays') {
        j = JSON.stringify((json.altStays ?? []).map(unpack).sort())
        s = JSON.stringify((sanity.altStaySlugs ?? []).sort())
      } else if (path === 'baseTowns') {
        j = JSON.stringify((json.baseTowns ?? []).map(unpack).sort())
        s = JSON.stringify((sanity.baseTownSlugs ?? []).sort())
      } else if (path === 'faq') {
        j = (json.faq ?? []).map(f=>`${f.question}|${f.answer}`).join('||')
        s = (sanity.faq ?? []).map(f=>`${f.question}|${f.answer}`).join('||')
      } else if (path === 'stopsSummary') {
        // Build summaries from each side using their respective shapes
        const js = (json.stops ?? []).map(st => ({
          day: st.day, order: st.order, timeOfDay: st.timeOfDay,
          venue: unpack(st.venue), experience: unpack(st.experience),
        }))
        const ss = (sanity.stops ?? []).map(st => ({
          day: st.day, order: st.order, timeOfDay: st.timeOfDay,
          venue: st.venueSlug, experience: st.experienceSlug,
        }))
        j = stopsSummary(js)
        s = stopsSummary(ss)
      } else {
        j = get(json, path); s = get(sanity, path)
      }
      const a = norm(j, path); const b = norm(s, path)
      if (a !== b) mismatches.push({path, json: a, sanity: b})
    }

    if (mismatches.length === 0) clean++
    else { withDiff++; all.push({slug, mismatches}) }
  }

  console.log(`\nDiff: ${clean} clean / ${withDiff} with mismatches`)
  if (all.length === 0) return

  const byField = new Map()
  for (const {slug, mismatches} of all) for (const m of mismatches) {
    const arr = byField.get(m.path) ?? []; arr.push({slug, ...m}); byField.set(m.path, arr)
  }
  for (const [path, entries] of [...byField.entries()].sort((a,b)=>b[1].length-a[1].length)) {
    console.log(`  ${path.padEnd(20)} ${String(entries.length).padStart(2)} itineraries`)
    for (const e of entries.slice(0,2)) console.log(`    ${e.slug}: JSON=${String(e.json).slice(0,80)}  Sanity=${String(e.sanity).slice(0,80)}`)
  }
}

void main()
