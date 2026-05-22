/**
 * Sanity → Astro itinerary-shape adapter.
 *
 * Mirrors the Astro content-collection itinerary shape so the plans/[slug]
 * itinerary branch consumes it unchanged. Venue references are unpacked
 * from Sanity refs back into legacy {id, collection: 'venues'} shape.
 */
import {sanityClient} from './client'
import {intentUrl} from './image'

const imageProjection = `{ asset->{_id}, alt, credit, caption, license }`

const allItinerariesListQuery = `*[_type == "itinerary" && !(_id in path("drafts.**"))] | order(publishedAt desc){
  "slug": slug.current, publishedAt, sitemapExclude
}`

const itineraryBySlugQuery = `*[_type == "itinerary" && slug.current == $slug][0]{
  _id, title, "slug": slug.current, dek, audience, mood, lengthNights,
  duration, theme, occasion, origin, budget, season,
  editorialFrame, skipThese, drivingDistanceKm, walkingIntensity,
  budgetRangeAud, costBreakdown, bookingChecklist, variations,
  totalDriveMinutes, editorNote, publishedAt, lastVerified, sitemapExclude,
  heroImage ${imageProjection},
  "anchorStaySlug": anchorStay->slug.current,
  anchorStayBlurb,
  "anchorTownSlug": anchorTown->slug.current,
  "altStaySlugs": altStays[]->slug.current,
  "baseTownSlugs": baseTowns[]->slug.current,
  faq[]{question, answer},
  stops[]{
    day, order, timeOfDay, note, timeRange, practical, driveMinutesToNext,
    "venueSlug": venue->slug.current,
    experienceSlug
  }
}`

type SanityImageRef = {
  asset?: {_id: string}
  alt?: string | null
  credit?: string | null
  caption?: string | null
  license?: string | null
} | null

interface SanityItinerary {
  _id: string
  title: string
  slug: string
  dek: string
  audience: string
  mood: string
  lengthNights: number
  duration?: string
  theme?: string[]
  occasion?: string
  origin?: string
  budget?: string
  season?: string
  editorialFrame?: string | null
  skipThese?: string | null
  drivingDistanceKm?: number | null
  walkingIntensity?: string | null
  budgetRangeAud?: string | null
  costBreakdown?: Record<string, string | undefined> | null
  bookingChecklist?: Array<{item: string; priority?: string; windowWeeksAhead?: number}> | null
  variations?: Array<{label: string; body?: string; relatedItinerarySlug?: string}> | null
  totalDriveMinutes?: number
  editorNote: string
  publishedAt: string
  lastVerified?: string | null
  sitemapExclude?: boolean | null
  heroImage?: SanityImageRef
  anchorStaySlug?: string | null
  anchorStayBlurb?: string | null
  anchorTownSlug?: string | null
  altStaySlugs?: string[] | null
  baseTownSlugs?: string[] | null
  faq?: Array<{question: string; answer: string}> | null
  stops: Array<{
    day: number
    order: number
    timeOfDay: string
    note?: string
    timeRange?: string
    practical?: string
    driveMinutesToNext?: number
    venueSlug?: string | null
    experienceSlug?: string | null
  }>
}

function imageRefToAstroShape(
  img: SanityImageRef,
  fallbackAlt: string,
  ctx?: {docId: string; docType: string; path: string},
) {
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

export async function fetchItineraryFromSanity(slug: string) {
  const doc = (await sanityClient.fetch(itineraryBySlugQuery, {slug})) as SanityItinerary | null
  if (!doc) return null
  return {
    id: doc.slug,
    slug: doc.slug,
    data: {
      slug: doc.slug,
      title: doc.title,
      dek: doc.dek,
      audience: doc.audience,
      mood: doc.mood,
      lengthNights: doc.lengthNights,
      duration: doc.duration,
      theme: doc.theme ?? [],
      occasion: doc.occasion ?? 'none',
      origin: doc.origin ?? 'melbourne',
      budget: doc.budget ?? 'mixed',
      season: doc.season ?? 'year-round',
      editorialFrame: doc.editorialFrame ?? undefined,
      skipThese: doc.skipThese ?? undefined,
      drivingDistanceKm: doc.drivingDistanceKm ?? undefined,
      walkingIntensity: doc.walkingIntensity ?? undefined,
      budgetRangeAud: doc.budgetRangeAud ?? undefined,
      costBreakdown: doc.costBreakdown ?? undefined,
      bookingChecklist: (doc.bookingChecklist ?? []).map((b) => ({
        item: b.item,
        priority: b.priority ?? 'recommended',
        windowWeeksAhead: b.windowWeeksAhead,
      })),
      variations: (doc.variations ?? []).map((v) => ({
        label: v.label,
        body: v.body,
        relatedItinerary: v.relatedItinerarySlug,
      })),
      totalDriveMinutes: doc.totalDriveMinutes,
      editorNote: doc.editorNote,
      publishedAt: new Date(doc.publishedAt),
      lastVerified: doc.lastVerified ? new Date(doc.lastVerified) : undefined,
      sitemapExclude: !!doc.sitemapExclude,
      heroImage: imageRefToAstroShape(doc.heroImage ?? null, doc.title, {
        docId: doc._id,
        docType: 'itinerary',
        path: 'heroImage',
      }),
      anchorStay: doc.anchorStaySlug
        ? {id: doc.anchorStaySlug, collection: 'venues' as const}
        : undefined,
      anchorStayBlurb: doc.anchorStayBlurb ?? undefined,
      anchorTown: doc.anchorTownSlug
        ? {id: doc.anchorTownSlug, collection: 'places' as const}
        : undefined,
      altStays: (doc.altStaySlugs ?? []).map((s) => ({id: s, collection: 'venues' as const})),
      baseTowns: (doc.baseTownSlugs ?? []).map((s) => ({id: s, collection: 'places' as const})),
      faq: doc.faq ?? [],
      stops: doc.stops
        .slice()
        .sort((a, b) => a.day - b.day || a.order - b.order)
        .map((s) => ({
          day: s.day,
          order: s.order,
          timeOfDay: s.timeOfDay,
          note: s.note,
          timeRange: s.timeRange,
          practical: s.practical,
          driveMinutesToNext: s.driveMinutesToNext,
          venue: s.venueSlug ? {id: s.venueSlug, collection: 'venues' as const} : undefined,
          experience: s.experienceSlug
            ? {id: s.experienceSlug, collection: 'experiences' as const}
            : undefined,
        })),
    },
  }
}

/**
 * All published itineraries — lightweight list for sitemap generation.
 * Returns minimal shape (slug + sitemapExclude + publishedAt).
 */
export async function fetchAllItinerariesFromSanity(): Promise<Array<{slug: string; data: {sitemapExclude: boolean; publishedAt: Date}}>> {
  const rows = (await sanityClient.fetch(allItinerariesListQuery)) as Array<{slug: string; publishedAt: string; sitemapExclude?: boolean}>
  return (rows ?? []).map((r) => ({
    slug: r.slug,
    data: {
      sitemapExclude: !!r.sitemapExclude,
      publishedAt: new Date(r.publishedAt),
    },
  }))
}
