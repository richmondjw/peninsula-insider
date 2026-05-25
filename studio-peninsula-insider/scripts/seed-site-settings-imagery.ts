/**
 * Seed brand & utility imagery into the existing siteSettings singleton.
 *
 * Uploads the current hardcoded images (logo, concierge avatar, OG fallback,
 * 404 graphic) to Sanity's Asset Pipeline and patches the existing
 * `siteSettings` document with imageRef references for each. Uses
 * `client.patch(...).set(...).commit()` (not createOrReplace) so existing
 * fields on the singleton — masthead label, footer links, social — are
 * preserved.
 *
 *   Usage: SANITY_WRITE_TOKEN=... npx tsx scripts/seed-site-settings-imagery.ts
 *
 * Idempotent: the patch overwrites only the four imagery fields. Re-running
 * uploads the same source files again (Sanity dedupes by content hash for
 * identical bytes, so no orphan assets pile up).
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

interface ImageSeed {
  field: 'logo' | 'conciergeAvatar' | 'ogFallback' | 'notFoundImage'
  path: string
  alt: string
}

const SEEDS: ImageSeed[] = [
  {field: 'logo', path: '/images/pi-logo-new.svg', alt: 'Peninsula Insider'},
  {field: 'conciergeAvatar', path: '/images/pi-concierge.svg', alt: 'The Insider, Peninsula Insider concierge'},
  {field: 'ogFallback', path: '/images/sourced/home-cover.webp', alt: 'Peninsula Insider'},
  {field: 'notFoundImage', path: '/images/pi-concierge.svg', alt: ''},
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

async function seed() {
  if (!process.env.SANITY_WRITE_TOKEN) {
    console.error('SANITY_WRITE_TOKEN not set.')
    process.exit(1)
  }

  const patchSet: Record<string, unknown> = {}

  for (const s of SEEDS) {
    console.log(`-> ${s.field}  (${s.path})`)
    const assetId = await uploadImage(s.path)
    if (!assetId) {
      console.warn(`  skipping ${s.field} (upload failed)`)
      continue
    }
    patchSet[s.field] = {
      _type: 'imageRef',
      asset: {_type: 'reference', _ref: assetId},
      alt: s.alt,
      credit: 'original-commissioned',
      license: 'original-commissioned',
    }
    console.log(`  ok ${assetId}`)
  }

  if (Object.keys(patchSet).length === 0) {
    console.error('No images uploaded — aborting patch.')
    process.exit(1)
  }

  console.log('\nPatching siteSettings document...')
  await client.patch('siteSettings').set(patchSet).commit()
  console.log('Done.')
}

void seed()
