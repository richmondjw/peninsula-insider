/**
 * Phase 0 smoke test — verifies Astro → Sanity pipeline is alive.
 *
 * Fetches the 5 PoC venues from Sanity and prints their names, hero image
 * URLs, and place references. If this runs clean, the read client, image
 * helper, and GROQ queries are all wired correctly.
 *
 * Usage:  node next/scripts/sanity-smoke.mjs
 * Reads tokens from next/.env.local automatically.
 */
import {createClient} from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2]
  }
} catch (err) {
  console.error('Could not read next/.env.local:', err.message)
  process.exit(1)
}

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  useCdn: false,
  token: process.env.SANITY_READ_TOKEN,
})
const urlFor = imageUrlBuilder(client)

const query = `*[_type == "venue"] | order(name asc){
  _id, name, "slug": slug.current, type,
  place->{name, "slug": slug.current},
  heroImage{
    asset->{_id, metadata{dimensions{width,height}}},
    alt, credit
  }
}`

const venues = await client.fetch(query)
console.log(`Found ${venues.length} venues in Sanity:\n`)
for (const v of venues) {
  const heroUrl = v.heroImage?.asset
    ? urlFor.image(v.heroImage).width(800).auto('format').url()
    : '(no hero)'
  console.log(`  ${v.name}  [${v.type}]`)
  console.log(`    slug:   ${v.slug}`)
  console.log(`    place:  ${v.place?.name} (${v.place?.slug})`)
  console.log(`    hero:   ${heroUrl}`)
  console.log(`    alt:    ${v.heroImage?.alt}`)
  console.log()
}
