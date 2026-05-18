/**
 * Phase 6 — cross-reference audit.
 *
 * Walks every document type that holds references and reports any
 * dangling refs (target document doesn't exist). Weak refs survive
 * unbroken state; this script just surfaces them so we can fix or
 * accept each one.
 *
 *   Usage: node next/scripts/audit-references.mjs
 */
import {createClient} from '@sanity/client'
import {readFileSync} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

// Each entry: a GROQ query that projects the doc id + the *resolved* target
// of each reference field. When the target doesn't exist, the dereferenced
// projection returns null even though the original `_ref` is still set.
const CHECKS = [
  {
    label: 'venue.place',
    groq: `*[_type == "venue" && defined(place)]{
      "id": slug.current, "ref": place._ref, "target": place->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'place.relatedPlaces',
    groq: `*[_type == "place"]{
      "id": slug.current,
      "broken": relatedPlaces[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'itinerary.anchorStay',
    groq: `*[_type == "itinerary" && defined(anchorStay)]{
      "id": slug.current, "ref": anchorStay._ref, "target": anchorStay->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'itinerary.altStays',
    groq: `*[_type == "itinerary"]{
      "id": slug.current,
      "broken": altStays[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'itinerary.anchorTown',
    groq: `*[_type == "itinerary" && defined(anchorTown)]{
      "id": slug.current, "ref": anchorTown._ref, "target": anchorTown->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'itinerary.baseTowns',
    groq: `*[_type == "itinerary"]{
      "id": slug.current,
      "broken": baseTowns[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'itinerary.stops.venue',
    groq: `*[_type == "itinerary"]{
      "id": slug.current,
      "broken": stops[defined(venue)]{"ref": venue._ref, "target": venue->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'experience.place',
    groq: `*[_type == "experience" && defined(place)]{
      "id": slug.current, "ref": place._ref, "target": place->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'tour.operator',
    groq: `*[_type == "tour" && defined(operator)]{
      "id": slug.current, "ref": operator._ref, "target": operator->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'tourPackage.componentTours',
    groq: `*[_type == "tourPackage"]{
      "id": slug.current,
      "broken": componentTours[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'tourPackage.anchorStay',
    groq: `*[_type == "tourPackage" && defined(anchorStay)]{
      "id": slug.current, "ref": anchorStay._ref, "target": anchorStay->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'event.venue',
    groq: `*[_type == "event" && defined(venue)]{
      "id": slug.current, "ref": venue._ref, "target": venue->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'event.place',
    groq: `*[_type == "event" && defined(place)]{
      "id": slug.current, "ref": place._ref, "target": place->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'article.author',
    groq: `*[_type == "article" && defined(author)]{
      "id": slug.current, "ref": author._ref, "target": author->slug.current
    }[!defined(target)]`,
  },
  {
    label: 'article.relatedVenues',
    groq: `*[_type == "article"]{
      "id": slug.current,
      "broken": relatedVenues[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'article.relatedExperiences',
    groq: `*[_type == "article"]{
      "id": slug.current,
      "broken": relatedExperiences[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'article.relatedPlaces',
    groq: `*[_type == "article"]{
      "id": slug.current,
      "broken": relatedPlaces[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'article.relatedItineraries',
    groq: `*[_type == "article"]{
      "id": slug.current,
      "broken": relatedItineraries[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
  {
    label: 'article.relatedArticles',
    groq: `*[_type == "article"]{
      "id": slug.current,
      "broken": relatedArticles[]{"ref": _ref, "target": @->slug.current}[!defined(target)]
    }[count(broken) > 0]`,
  },
]

console.log('Cross-reference audit — Sanity dataset "production"\n')

let totalBroken = 0
for (const check of CHECKS) {
  const rows = await client.fetch(check.groq)
  if (rows.length === 0) {
    console.log(`  ✓ ${check.label.padEnd(36)} clean`)
    continue
  }

  // Two report shapes — single ref or array of broken refs per doc.
  let count = 0
  for (const r of rows) {
    if (Array.isArray(r.broken)) count += r.broken.length
    else count += 1
  }
  totalBroken += count
  console.log(`  ✗ ${check.label.padEnd(36)} ${count} dangling`)
  for (const r of rows.slice(0, 5)) {
    if (Array.isArray(r.broken)) {
      for (const b of r.broken.slice(0, 3)) {
        console.log(`      ${r.id}  →  ${b.ref}`)
      }
    } else {
      console.log(`      ${r.id}  →  ${r.ref}`)
    }
  }
  if (rows.length > 5) console.log(`      … ${rows.length - 5} more`)
}

console.log(`\nTotal dangling references: ${totalBroken}`)
console.log(
  totalBroken === 0
    ? '\n✓ All references resolve to existing documents.'
    : '\nDangling refs are tolerated (weak refs); fix in Studio when an editor touches the affected entity.',
)
