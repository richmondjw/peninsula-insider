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
  try {
    const d: any = await sanityClient.fetch(legalPageQuery, {slug})
    if (!d) return null
    return {
      title: d.title ?? '',
      eyebrow: d.eyebrow ?? undefined,
      seoDescription: d.seoDescription ?? undefined,
      lastUpdated: d.lastUpdated ?? undefined,
      body: Array.isArray(d.body) ? d.body : [],
    }
  } catch {
    return null
  }
}

/** Format an ISO date string as a human-readable date, e.g. "15 May 2026". */
export function formatLegalDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-AU', {day: 'numeric', month: 'long', year: 'numeric'})
}
