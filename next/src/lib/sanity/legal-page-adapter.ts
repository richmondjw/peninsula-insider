/**
 * Sanity adapter for legalPage documents.
 *
 * Legal pages (privacy, terms, accessibility, complaints, etc.) are authored
 * in Sanity Studio and fetched at build time. If the document doesn't exist
 * yet, the caller falls back to hardcoded markup — so pages render correctly
 * before a doc is seeded.
 */
import {sanityClient} from './client'

const legalPageQuery = `*[_type == "legalPage" && slug.current == $slug][0]{
  _id, title, "slug": slug.current, eyebrow, seoDescription, lastUpdated, body
}`

export interface LegalPageData {
  title: string
  eyebrow?: string
  seoDescription?: string
  /** ISO date string e.g. "2026-05-15" */
  lastUpdated?: string
  /** Raw Portable Text blocks — pass to <PortableTextBody blocks={...} /> */
  body: Array<Record<string, unknown>>
}

export async function fetchLegalPageFromSanity(slug: string): Promise<LegalPageData | null> {
  // Skip if no read token — avoids DNS failure crashing the build when
  // the token isn't configured locally (Sanity CDN still requires a token
  // even for public reads in some project configurations).
  if (!process.env.SANITY_READ_TOKEN) return null

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
  try {
    const result = await Promise.race([
      sanityClient.fetch(legalPageQuery, {slug}).then((d: any) => {
        if (!d) return null
        return {
          title: d.title ?? '',
          eyebrow: d.eyebrow ?? undefined,
          seoDescription: d.seoDescription ?? undefined,
          lastUpdated: d.lastUpdated ?? undefined,
          body: Array.isArray(d.body) ? d.body : [],
        } as LegalPageData
      }).catch(() => null),
      timeout,
    ])
    return result
  } catch {
    return null
  }
}

/** Format an ISO date string as a human-readable date, e.g. "15 May 2026". */
export function formatLegalDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-AU', {day: 'numeric', month: 'long', year: 'numeric'})
}
