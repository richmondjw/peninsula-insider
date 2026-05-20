/**
 * Sanity → Astro article-shape adapter.
 *
 * Returns an article wrapper that mirrors the Astro content-collection
 * shape, with the body as Portable Text. The legacy journal/[slug] page
 * uses Astro's `render(article)` which won't work on a Sanity-sourced
 * doc, so the page checks `articleFromSanity === true` and dispatches
 * to a Portable Text renderer for the body. All other fields render
 * via the existing template paths.
 */
import Slugger from 'github-slugger'
import {sanityClient} from './client'
import {intentUrl} from './image'

const img = `{ asset->{_id}, alt, credit, caption, license }`

const articleBySlugQuery = `*[_type == "article" && slug.current == $slug][0]{
  _id, title, "slug": slug.current, dek, houseByline, format, tags, featured,
  readingTimeMinutes, status, publishedAt, updatedAt, lastVerified, sitemapExclude,
  aiSummary,
  "authorSlug": author->slug.current,
  heroImage ${img},
  body,
  faq[]{question, answer},
  clusterLinks[]{label, href},
  "relatedVenueSlugs": relatedVenues[]->slug.current,
  "relatedExperienceSlugs": relatedExperiences[]->slug.current,
  "relatedPlaceSlugs": relatedPlaces[]->slug.current,
  "relatedItinerarySlugs": relatedItineraries[]->slug.current,
  "relatedArticleSlugs": relatedArticles[]->slug.current
}`

type SanityImageRef = {
  asset?: {_id: string}
  alt?: string | null
  credit?: string | null
  caption?: string | null
  license?: string | null
} | null

function imageOrFallback(
  image: SanityImageRef,
  fallbackAlt: string,
  ctx?: {docId: string; docType: string; path: string},
) {
  if (!image?.asset) {
    return {src: '/images/sourced/home-cover.webp', alt: fallbackAlt, credit: '', license: 'venue-media-kit'}
  }
  return {
    src: intentUrl(image, 'hero', ctx),
    alt: image.alt ?? fallbackAlt,
    credit: image.credit ?? '',
    license: image.license ?? 'venue-media-kit',
    caption: image.caption ?? undefined,
  }
}

export interface AdaptedArticle {
  id: string
  slug: string
  /** When true, journal/[slug] uses the Portable Text renderer for body. */
  __fromSanity: true
  body: Array<Record<string, unknown>>
  data: {
    slug: string
    title: string
    dek: string
    author: {id: string; collection: 'authors'}
    houseByline: boolean
    publishedAt: Date
    updatedAt?: Date
    heroImage: {src: string; alt: string; credit: string; license: string; caption?: string}
    format: string
    tags: string[]
    relatedVenues: Array<{id: string; collection: 'venues'}>
    relatedExperiences: Array<{id: string; collection: 'experiences'}>
    relatedPlaces: Array<{id: string; collection: 'places'}>
    relatedItineraries: Array<{id: string; collection: 'itineraries'}>
    relatedArticles: Array<{id: string; collection: 'articles'}>
    readingTimeMinutes?: number
    featured: boolean
    status: string
    lastVerified?: Date
    clusterLinks?: Array<{label: string; href: string}>
    aiSummary?: string[]
    faq?: Array<{question: string; answer: string}>
    sitemapExclude: boolean
  }
}

export interface PTHeading {
  slug: string
  text: string
  depth: number
}

/**
 * Extract headings from a Portable Text body, matching Astro's own
 * heading-collection logic (github-slugger, same pass order).
 *
 * Only processes top-level `block` nodes whose `style` is h1–h6.
 * Text content is assembled by concatenating the `text` value of
 * every span-type child, stripping any marks.
 *
 * The returned array is structurally identical to the `headings` array
 * returned by Astro's `render()`, so it can be passed directly to
 * `<HubGuideTOC>` and all existing TOC plumbing.
 */
export function extractHeadingsFromPT(
  blocks: Array<Record<string, unknown>>,
): PTHeading[] {
  const slugger = new Slugger()
  const headings: PTHeading[] = []
  const headingStyles = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

  for (const block of blocks) {
    if (block._type !== 'block') continue
    const style = String(block.style ?? 'normal')
    if (!headingStyles.has(style)) continue

    const depth = parseInt(style[1], 10)
    // Concatenate text from all span children
    const text = ((block.children as Array<Record<string, unknown>>) ?? [])
      .filter((c) => c._type === 'span')
      .map((c) => String(c.text ?? ''))
      .join('')

    const slug = slugger.slug(text)
    headings.push({depth, slug, text})
  }

  return headings
}

export async function fetchArticleFromSanity(slug: string): Promise<AdaptedArticle | null> {
  const d: any = await sanityClient.fetch(articleBySlugQuery, {slug})
  if (!d) return null

  const refs = (slugs: string[] | null | undefined, c: any) =>
    (slugs ?? []).map((s) => ({id: s, collection: c as const}))

  return {
    id: d.slug,
    slug: d.slug,
    __fromSanity: true,
    body: d.body ?? [],
    data: {
      slug: d.slug,
      title: d.title,
      dek: d.dek,
      author: {id: d.authorSlug ?? 'editorial', collection: 'authors'},
      houseByline: !!d.houseByline,
      publishedAt: new Date(d.publishedAt),
      updatedAt: d.updatedAt ? new Date(d.updatedAt) : undefined,
      heroImage: imageOrFallback(d.heroImage ?? null, d.title, {
        docId: d._id,
        docType: 'article',
        path: 'heroImage',
      }),
      format: d.format,
      tags: d.tags ?? [],
      relatedVenues: refs(d.relatedVenueSlugs, 'venues'),
      relatedExperiences: refs(d.relatedExperienceSlugs, 'experiences'),
      relatedPlaces: refs(d.relatedPlaceSlugs, 'places'),
      relatedItineraries: refs(d.relatedItinerarySlugs, 'itineraries'),
      relatedArticles: refs(d.relatedArticleSlugs, 'articles'),
      readingTimeMinutes: d.readingTimeMinutes ?? undefined,
      featured: !!d.featured,
      status: d.status,
      lastVerified: d.lastVerified ? new Date(d.lastVerified) : undefined,
      clusterLinks: d.clusterLinks ?? [],
      aiSummary: d.aiSummary ?? [],
      faq: d.faq ?? [],
      sitemapExclude: !!d.sitemapExclude,
    },
  }
}
