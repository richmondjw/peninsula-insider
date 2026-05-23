/**
 * Sanity → Astro place-shape adapter.
 *
 * Mirrors the existing Astro content-collection place shape so
 * PlaceDetailTemplate.astro consumes it unchanged.
 */
import {sanityClient} from './client'
import {intentUrl} from './image'

const imageProjection = `{ asset->{_id}, alt, credit, caption, license }`

const placeFields = `
  _id, name, "slug": slug.current, kind, zone,
  coordinates, factualLede, intro, signature, insiderNote,
  tldr, bestFor, notFor, bestSeason, worstTime, stayDuration, bestDay, skip,
  driveTime, featured, publishedAt, sitemapExclude,
  heroImage ${imageProjection},
  "relatedPlaces": relatedPlaces[]->{ "slug": slug.current, name, kind, zone }
`

const placeBySlugQuery = `*[_type == "place" && slug.current == $slug && !(_id in path("drafts.**"))][0]{${placeFields}}`

const allPlacesQuery = `*[_type == "place" && !(_id in path("drafts.**"))] | order(name asc){${placeFields}}`

type SanityImageRef = {
  asset?: {_id: string}
  alt?: string | null
  credit?: string | null
  caption?: string | null
  license?: string | null
} | null

interface SanityPlace {
  _id: string
  name: string
  slug: string
  kind: string
  zone: string
  coordinates?: {lat: number; lng: number} | null
  factualLede?: string | null
  intro: string
  signature?: string | null
  insiderNote?: string | null
  tldr?: string[] | null
  bestFor?: string[] | null
  notFor?: string[] | null
  bestSeason?: string | null
  worstTime?: string | null
  stayDuration?: string | null
  bestDay?: string | null
  skip?: string | null
  driveTime?: string | null
  featured?: boolean | null
  publishedAt: string
  sitemapExclude?: boolean | null
  heroImage?: SanityImageRef
  relatedPlaces?: Array<{slug: string; name: string; kind?: string; zone?: string}>
}

export interface AdaptedPlace {
  id: string
  slug: string
  data: {
    slug: string
    name: string
    kind: string
    zone: string
    coordinates?: {lat: number; lng: number}
    factualLede?: string
    intro: string
    signature?: string
    insiderNote?: string
    tldr?: string[]
    bestFor?: string[]
    notFor?: string[]
    bestSeason?: string
    worstTime?: string
    stayDuration?: string
    bestDay?: string
    skip?: string
    driveTime?: string
    featured: boolean
    publishedAt: Date
    sitemapExclude: boolean
    heroImage: {src: string; alt: string; credit: string; license: string; caption?: string}
    relatedPlaces: Array<{id: string; collection: 'places'}>
  }
}

function imageRefToAstroShape(
  img: SanityImageRef,
  fallbackAlt: string,
  ctx?: {docId: string; docType: string; path: string},
): {src: string; alt: string; credit: string; license: string; caption?: string} {
  if (!img?.asset) {
    return {
      src: '/images/sourced/home-cover.webp',
      alt: fallbackAlt,
      credit: '',
      license: 'venue-media-kit',
    }
  }
  return {
    src: intentUrl(img, 'hero', ctx),
    alt: img.alt ?? fallbackAlt,
    credit: img.credit ?? '',
    license: img.license ?? 'venue-media-kit',
    caption: img.caption ?? undefined,
  }
}

function adapt(doc: SanityPlace): AdaptedPlace {
  return {
    id: doc.slug,
    slug: doc.slug,
    data: {
      slug: doc.slug,
      name: doc.name,
      kind: doc.kind,
      zone: doc.zone,
      coordinates: doc.coordinates ?? undefined,
      factualLede: doc.factualLede ?? undefined,
      intro: doc.intro,
      signature: doc.signature ?? undefined,
      insiderNote: doc.insiderNote ?? undefined,
      tldr: doc.tldr ?? undefined,
      bestFor: doc.bestFor ?? undefined,
      notFor: doc.notFor ?? undefined,
      bestSeason: doc.bestSeason ?? undefined,
      worstTime: doc.worstTime ?? undefined,
      stayDuration: doc.stayDuration ?? undefined,
      bestDay: doc.bestDay ?? undefined,
      skip: doc.skip ?? undefined,
      driveTime: doc.driveTime ?? undefined,
      featured: !!doc.featured,
      publishedAt: new Date(doc.publishedAt),
      sitemapExclude: !!doc.sitemapExclude,
      heroImage: imageRefToAstroShape(doc.heroImage ?? null, doc.name, {
        docId: doc._id,
        docType: 'place',
        path: 'heroImage',
      }),
      relatedPlaces: (doc.relatedPlaces ?? []).map((r) => ({
        id: r.slug,
        collection: 'places' as const,
      })),
    },
  }
}

export async function fetchPlaceFromSanity(slug: string): Promise<AdaptedPlace | null> {
  const doc = (await sanityClient.fetch(placeBySlugQuery, {slug})) as SanityPlace | null
  if (!doc) return null
  return adapt(doc)
}

/**
 * Fetch all published places from Sanity, adapted to the Astro collection
 * shape. Used by places/[slug].astro getStaticPaths so place detail pages
 * are generated statically at build time rather than served via SSR.
 */
export async function fetchAllPlacesFromSanity(): Promise<AdaptedPlace[]> {
  const docs = (await sanityClient.fetch(allPlacesQuery)) as SanityPlace[]
  return (docs ?? []).filter((d) => d?.slug).map(adapt)
}
