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
 * Stega configuration shared by the public + preview clients.
 *
 * Stega injects invisible Unicode markers into every string returned by
 * a Sanity query. Sanity's @sanity/visual-editing overlay reads those
 * markers to know which doc + field each rendered element binds to,
 * which is what makes click-to-edit work.
 *
 * Default behaviour (when public traffic loads the site outside of
 * Studio Presentation) is: the invisible markers are present in the
 * HTML, but unless an overlay script is mounted there's nothing to
 * read them. They render as zero-width chars, no visual side effect.
 *
 * Caveat worth knowing: a public visitor copying body text from the
 * site will also copy the invisible chars. We accept that trade in
 * exchange for click-to-edit on every Sanity-bound surface across
 * the public site, not just /preview/ SSR routes.
 */
const stegaConfig = {
  enabled: true,
  studioUrl,
}

export const sanityClient = createClient({
  ...baseConfig,
  token: process.env.SANITY_READ_TOKEN,
  stega: stegaConfig,
})

export const sanityClientFresh = createClient({
  ...baseConfig,
  useCdn: false,
  token: process.env.SANITY_READ_TOKEN,
  stega: stegaConfig,
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
