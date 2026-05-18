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

export const sanityClient = createClient({
  ...baseConfig,
  token: process.env.SANITY_READ_TOKEN,
})

export const sanityClientFresh = createClient({
  ...baseConfig,
  useCdn: false,
  token: process.env.SANITY_READ_TOKEN,
})

export const sanityPreviewClient = createClient({
  ...baseConfig,
  useCdn: false,
  perspective: 'previewDrafts',
  token: process.env.SANITY_PREVIEW_TOKEN,
  stega: {
    enabled: true,
    studioUrl,
  },
})

export function getSanityReadClient(preview: boolean = false) {
  return preview ? sanityPreviewClient : sanityClient
}

export function sanityReadEnabled(
  entity:
    | 'venues'
    | 'places'
    | 'articles'
    | 'events'
    | 'itineraries'
    | 'tours'
    | 'tour-operators'
    | 'tour-packages'
    | 'experiences'
    | 'page-level',
): boolean {
  if (process.env.SANITY_READ_ENABLED !== 'true') return false
  const flag = `SANITY_${entity.toUpperCase().replace(/-/g, '_')}_ENABLED`
  return process.env[flag] === 'true'
}
