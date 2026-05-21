/**
 * Peninsula Insider — Sanity client.
 * Three clients: published (CDN), fresh (no-CDN), preview (drafts + stega).
 */
import {createClient, type ClientConfig} from '@sanity/client'

const projectId = 'a062b30n'
const dataset = 'production'
const apiVersion = '2025-01-01'
const studioUrl = 'https://peninsula-insider.sanity.studio'

const baseConfig: ClientConfig = {
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
}

/**
 * Stega was enabled on the production client in PR #191 to give the admin
 * overlay an auto-binding path. Disabled here because the invisible
 * Unicode markers were appended to image URLs as well as strings — and
 * the CSS `url(...)` parser includes them as part of the URL, producing
 * 404s on every place-card / hero / event-card that uses
 * `background-image: url(...)` (and only those — <img src> tolerates
 * the chars). The overlay still binds via:
 *   - explicit data-pi-edit attrs (most components — Rounds B/C/E)
 *   - data-pi-sanity-singleton-* attrs (singletons — Round B)
 *   - pi.image_bindings table (bind-on-the-spot — Round F)
 * Preview client keeps stega — /preview/ SSR routes render only inside
 * Studio's iframe so the chars never reach public traffic.
 */
export const sanityClient = createClient({
  ...baseConfig,
  token: process.env.SANITY_READ_TOKEN,
  stega: {enabled: false},
})

export const sanityPreviewClient = createClient({
  ...baseConfig,
  useCdn: false,
  perspective: 'drafts',
  token: process.env.SANITY_PREVIEW_TOKEN,
  stega: {
    enabled: true,
    studioUrl,
  },
})

export function getSanityReadClient(preview: boolean = false) {
  return preview ? sanityPreviewClient : sanityClient
}

