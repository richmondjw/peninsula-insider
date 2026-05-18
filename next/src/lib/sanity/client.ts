/**
 * Peninsula Insider — Sanity client.
 *
 * Two clients are exported:
 *   - `sanityClient` — published-content reads. Token-less in dev (uses the
 *     public dataset), token-authenticated in production builds for higher
 *     rate limits and access to draft preview when explicitly requested.
 *   - `sanityPreviewClient` — same as above but with `perspective: 'previewDrafts'`,
 *     used by the secret preview routes to render draft content.
 *
 * The CDN-cached client is the default for normal SSR; build steps that need
 * fresh-from-origin data import `sanityClientFresh` instead.
 *
 * Tokens come from env vars only. Never hard-coded, never logged. If
 * `SANITY_READ_TOKEN` is missing in production, the client falls back to
 * anonymous reads of the public dataset — fine for the published view, but
 * preview won't work.
 */
import {createClient, type ClientConfig} from '@sanity/client'

const projectId = 'a062b30n'
const dataset = 'production'
const apiVersion = '2025-01-01'

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

/** Bypass the CDN — for build-time fetches that need the latest write. */
export const sanityClientFresh = createClient({
  ...baseConfig,
  useCdn: false,
  token: process.env.SANITY_READ_TOKEN,
})

/** Preview-drafts client — only used by the secret preview routes. */
export const sanityPreviewClient = createClient({
  ...baseConfig,
  useCdn: false,
  perspective: 'previewDrafts',
  token: process.env.SANITY_PREVIEW_TOKEN,
})

/**
 * Per-entity feature flag. Returns true when the entity should be read from
 * Sanity. Otherwise the Astro page should fall back to its existing JSON
 * `getCollection()` path. Master kill-switch is `SANITY_READ_ENABLED`.
 */
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
