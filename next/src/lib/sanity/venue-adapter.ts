/**
 * Sanity → Astro venue-shape adapter.
 *
 * VenueDetailTemplate.astro consumes an Astro content-collection venue with
 * a specific data shape (`venue.data.heroImage.src`, `venue.data.place` as
 * a reference string, etc). To keep the template untouched during the
 * dual-run cutover, we fetch from Sanity and return a value with the same
 * outer shape: `{ id, data: { ...legacy fields } }`.
 *
 * Once Phase 1 fully cuts over and the JSON path is deleted, this adapter
 * can be inlined into a single Sanity-native template and the legacy shape
 * dropped. For now, the adapter is the seam.
 */
import {getSanityReadClient} from './client'
import {intentUrl} from './image'
import {venueBySlugQuery, allVenueSlugsQuery, allVenuesQuery} from './queries'

type SanityImageRef = {
  asset?: {_id: string; metadata?: {dimensions?: {width: number; height: number}}}
  alt?: string | null
  credit?: string | null
  caption?: string | null
  license?: string | null
} | null

interface SanityVenue {
  _id: string
  _updatedAt: string
  name: string
  slug: string
  type: string
  place: {_id: string; name: string; slug: string; kind?: string; zone?: string} | null
  zone: string
  coordinates?: {lat: number; lng: number} | null
  address: string
  phone?: string | null
  website?: string | null
  bookingUrl?: string | null
  bookingProvider?: string | null
  priceBand: string
  signature: string
  whyWeGo?: string | null
  editorNote?: Array<Record<string, unknown>> | null
  editorVerdict?: string | null
  bestFor?: string[] | null
  ifOnlyOneThing?: string | null
  pairWith?: string[] | null
  heroImage?: SanityImageRef
  gallery?: SanityImageRef[] | null
  tags?: {mood?: string[]; season?: string[]; audience?: string[]} | null
  authority?: Record<string, unknown> | null
  subregion?: string | null
  wines?: Record<string, unknown> | null
  visiting?: Record<string, unknown> | null
  restaurant?: Record<string, unknown> | null
  accommodation?: Record<string, unknown> | null
  sameAs?: Record<string, unknown> | null
  faq?: Array<{q: string; a: string}> | null
  dogFriendly?: boolean | null
  dogFriendlyNotes?: string | null
  dogsAllowedOutdoorsOnly?: boolean | null
  offLeashNearby?: boolean | null
  waterAccessNearby?: boolean | null
  dogAmenities?: string[] | null
  rainyDayDogSuitability?: string | null
  affiliateNote?: string | null
  featuredPartner?: boolean | null
  editorPick?: boolean | null
  hoursNote?: string | null
  liveStatusUrl?: string | null
  lastVerified: string
  lastFactVerified?: string | null
  publishedAt: string
  sitemapExclude?: boolean | null
}

/**
 * Astro template-friendly shape. Mirrors the existing
 * `venue.data` shape (Zod-defined in next/src/content.config.ts).
 */
export interface AdaptedVenue {
  id: string
  slug: string
  data: {
    slug: string
    name: string
    type: string
    place: {id: string; collection: 'places'} | string
    zone: string
    coordinates?: {lat: number; lng: number}
    address: string
    phone?: string
    website?: string
    bookingUrl?: string
    bookingProvider?: string
    priceBand: string
    signature: string
    whyWeGo?: string
    editorNote: string
    editorVerdict?: string
    bestFor?: string[]
    ifOnlyOneThing?: string
    pairWith?: string[]
    tags: {mood: string[]; season: string[]; audience: string[]}
    authority?: Record<string, unknown>
    heroImage: {src: string; alt: string; credit: string; license: string; caption?: string}
    gallery: Array<{src: string; alt: string; credit: string; license: string; caption?: string}>
    dogFriendly: boolean
    dogFriendlyNotes?: string
    dogsAllowedOutdoorsOnly?: boolean
    offLeashNearby?: boolean
    waterAccessNearby?: boolean
    dogAmenities: string[]
    rainyDayDogSuitability?: string
    affiliateNote?: string
    featuredPartner: boolean
    editorPick: boolean
    hoursNote?: string
    liveStatusUrl?: string
    lastVerified: Date
    publishedAt: Date
    sitemapExclude: boolean
    // Wine-specific extras passed through; VenueDetailTemplate uses these
    // when section === 'wine'.
    subregion?: string
    wines?: Record<string, unknown>
    visiting?: Record<string, unknown>
    restaurant?: Record<string, unknown>
    accommodation?: Record<string, unknown>
    sameAs?: Record<string, unknown>
    faq?: Array<{question: string; answer: string}>
  }
}

/** Convert Portable Text blocks back to a plain-text/\n\n string, the format
 *  the legacy template expected before the migration. Headings and lists
 *  flatten to text; bold/italic strip. Phase 3 (articles) will replace this
 *  with a proper Portable Text renderer for richer formatting. */
function blocksToText(blocks: Array<Record<string, unknown>> | null | undefined): string {
  if (!blocks || !Array.isArray(blocks)) return ''
  return blocks
    .map((b) => {
      const children = (b.children as Array<Record<string, unknown>> | undefined) ?? []
      return children.map((c) => (c.text as string) ?? '').join('')
    })
    .filter((line) => line.length > 0)
    .join('\n\n')
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

function adapt(doc: SanityVenue): AdaptedVenue {
  const heroImage = imageRefToAstroShape(doc.heroImage ?? null, doc.name, {
    docId: doc._id,
    docType: 'venue',
    path: 'heroImage',
  })
  const gallery = (doc.gallery ?? [])
    .filter((g): g is NonNullable<SanityImageRef> => g != null)
    .map((g, idx) =>
      imageRefToAstroShape(g, doc.name, {
        docId: doc._id,
        docType: 'venue',
        path: `gallery[${idx}]`,
      }),
    )

  return {
    id: doc.slug,
    slug: doc.slug,
    data: {
      slug: doc.slug,
      name: doc.name,
      type: doc.type,
      place: doc.place
        ? {id: doc.place.slug, collection: 'places' as const}
        : '',
      zone: doc.zone,
      coordinates: doc.coordinates ?? undefined,
      address: doc.address,
      phone: doc.phone ?? undefined,
      website: doc.website ?? undefined,
      bookingUrl: doc.bookingUrl ?? undefined,
      bookingProvider: doc.bookingProvider ?? undefined,
      priceBand: doc.priceBand,
      signature: doc.signature,
      whyWeGo: doc.whyWeGo ?? undefined,
      editorNote: blocksToText(doc.editorNote),
      editorVerdict: doc.editorVerdict ?? undefined,
      bestFor: doc.bestFor ?? undefined,
      ifOnlyOneThing: doc.ifOnlyOneThing ?? undefined,
      pairWith: doc.pairWith ?? undefined,
      tags: {
        mood: doc.tags?.mood ?? [],
        season: doc.tags?.season ?? [],
        audience: doc.tags?.audience ?? [],
      },
      authority: doc.authority ?? undefined,
      heroImage,
      gallery,
      dogFriendly: !!doc.dogFriendly,
      dogFriendlyNotes: doc.dogFriendlyNotes ?? undefined,
      dogsAllowedOutdoorsOnly: doc.dogsAllowedOutdoorsOnly ?? undefined,
      offLeashNearby: doc.offLeashNearby ?? undefined,
      waterAccessNearby: doc.waterAccessNearby ?? undefined,
      dogAmenities: doc.dogAmenities ?? [],
      rainyDayDogSuitability: doc.rainyDayDogSuitability ?? undefined,
      affiliateNote: doc.affiliateNote ?? undefined,
      featuredPartner: !!doc.featuredPartner,
      editorPick: !!doc.editorPick,
      hoursNote: doc.hoursNote ?? undefined,
      liveStatusUrl: doc.liveStatusUrl ?? undefined,
      lastVerified: new Date(doc.lastVerified),
      publishedAt: new Date(doc.publishedAt),
      sitemapExclude: !!doc.sitemapExclude,
      subregion: doc.subregion ?? undefined,
      wines: doc.wines ?? undefined,
      visiting: doc.visiting ?? undefined,
      restaurant: doc.restaurant ?? undefined,
      accommodation: doc.accommodation ?? undefined,
      sameAs: doc.sameAs ?? undefined,
      // Normalise FAQ to {question, answer} to match the Astro shape used
      // elsewhere on the site (article FAQ, place FAQ).
      faq: doc.faq?.map((f) => ({question: f.q, answer: f.a})),
    },
  }
}

/** Fetch a single venue from Sanity. Returns null if not found. */
export async function fetchVenueFromSanity(
  slug: string,
  opts: {preview?: boolean} = {},
): Promise<AdaptedVenue | null> {
  const client = getSanityReadClient(opts.preview ?? false)
  const doc = (await client.fetch(venueBySlugQuery, {slug})) as SanityVenue | null
  if (!doc) return null
  return adapt(doc)
}

/** All venue slugs in Sanity. Used to build getStaticPaths during the
 *  Sanity-only phase; for dual-run, the page still derives paths from JSON. */
export async function fetchAllVenueSlugsFromSanity(): Promise<string[]> {
  const rows = (await getSanityReadClient(false).fetch(allVenueSlugsQuery)) as Array<{slug: string}>
  return rows.map((r) => r.slug)
}

/** All published venues adapted to the Astro shape. Used by sitemap and
 *  any build-time page that needs the full venue list. */
export async function fetchAllVenuesFromSanity(): Promise<AdaptedVenue[]> {
  const docs = (await getSanityReadClient(false).fetch(allVenuesQuery)) as SanityVenue[]
  return (docs ?? []).map(adapt)
}
