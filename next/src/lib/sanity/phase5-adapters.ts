/**
 * Sanity → Astro adapters for Phase 5 entities:
 * experience, tour, tour-operator, tour-package.
 *
 * All four follow the same pattern as the venue/place/itinerary adapters:
 * fetch the Sanity doc, unpack refs to the legacy {id, collection} shape,
 * map heroImage to a Sanity CDN URL, return a `{id, data}` envelope so
 * existing Astro pages consume it without changes.
 */
import {sanityClient} from './client'
import {intentUrl} from './image'

const img = `{ asset->{_id}, alt, credit, caption, license }`

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

function blocksToText(blocks: Array<Record<string, unknown>> | null | undefined): string {
  if (!blocks || !Array.isArray(blocks)) return ''
  return blocks
    .map((b) => {
      const children = (b.children as Array<Record<string, unknown>> | undefined) ?? []
      return children.map((c) => (c.text as string) ?? '').join('')
    })
    .filter((l) => l.length > 0)
    .join('\n\n')
}

// ── Experience ──────────────────────────────────────────────────────────
const allExperiencesListQuery = `*[_type == "experience" && !(_id in path("drafts.**"))] | order(name asc){
  "slug": slug.current, publishedAt, sitemapExclude
}`

const experienceQuery = `*[_type == "experience" && slug.current == $slug][0]{
  _id, name, "slug": slug.current, type, zone, coordinates, address,
  website, bookingUrl, durationMinutes, difficulty, seasonBest,
  editorNote, tags, golf, dogFriendly, dogFriendlyNotes, offLeashNearby,
  waterAccessNearby, rainyDayDogSuitability, lastVerified, publishedAt,
  sitemapExclude,
  "placeSlug": place->slug.current,
  heroImage ${img}
}`

export async function fetchExperienceFromSanity(slug: string) {
  const d: any = await sanityClient.fetch(experienceQuery, {slug})
  if (!d) return null
  return {
    id: d.slug,
    slug: d.slug,
    data: {
      slug: d.slug,
      name: d.name,
      type: d.type,
      place: d.placeSlug ? {id: d.placeSlug, collection: 'places' as const} : '',
      zone: d.zone,
      coordinates: d.coordinates ?? undefined,
      address: d.address ?? undefined,
      website: d.website ?? undefined,
      bookingUrl: d.bookingUrl ?? undefined,
      durationMinutes: d.durationMinutes ?? undefined,
      difficulty: d.difficulty ?? undefined,
      seasonBest: d.seasonBest ?? [],
      editorNote: blocksToText(d.editorNote),
      tags: {
        mood: d.tags?.mood ?? [],
        season: d.tags?.season ?? [],
        audience: d.tags?.audience ?? [],
      },
      dogFriendly: !!d.dogFriendly,
      dogFriendlyNotes: d.dogFriendlyNotes ?? undefined,
      offLeashNearby: d.offLeashNearby ?? undefined,
      waterAccessNearby: d.waterAccessNearby ?? undefined,
      rainyDayDogSuitability: d.rainyDayDogSuitability ?? undefined,
      heroImage: imageOrFallback(d.heroImage ?? null, d.name, {
        docId: d._id, docType: 'experience', path: 'heroImage',
      }),
      gallery: [],
      golf: d.golf ?? undefined,
      lastVerified: new Date(d.lastVerified),
      publishedAt: new Date(d.publishedAt),
      sitemapExclude: !!d.sitemapExclude,
    },
  }
}

// ── Tour Operator ───────────────────────────────────────────────────────
const tourOperatorQuery = `*[_type == "tourOperator" && slug.current == $slug][0]{
  _id, name, "slug": slug.current, operatorType, intro, whatGoodAt,
  notSuitedFor, website, phone, pickupPoints, languages, maxCapacity,
  affiliateProgram, affiliateUrl, vetted, lastVerified, publishedAt,
  heroImage ${img}
}`

export async function fetchTourOperatorFromSanity(slug: string) {
  const d: any = await sanityClient.fetch(tourOperatorQuery, {slug})
  if (!d) return null
  return {
    id: d.slug,
    slug: d.slug,
    data: {
      slug: d.slug,
      name: d.name,
      operatorType: d.operatorType,
      intro: d.intro,
      whatGoodAt: d.whatGoodAt,
      notSuitedFor: d.notSuitedFor,
      website: d.website ?? undefined,
      phone: d.phone ?? undefined,
      pickupPoints: d.pickupPoints ?? [],
      languages: d.languages ?? ['en'],
      maxCapacity: d.maxCapacity ?? undefined,
      affiliateProgram: d.affiliateProgram ?? 'unknown',
      affiliateUrl: d.affiliateUrl ?? undefined,
      vetted: !!d.vetted,
      heroImage: imageOrFallback(d.heroImage ?? null, d.name, {
        docId: d._id, docType: 'tourOperator', path: 'heroImage',
      }),
      lastVerified: new Date(d.lastVerified),
      publishedAt: new Date(d.publishedAt),
    },
  }
}

// ── Tour ────────────────────────────────────────────────────────────────
const tourQuery = `*[_type == "tour" && slug.current == $slug][0]{
  _id, name, "slug": slug.current, intro, whatHappens, whoSuits,
  whoDoesnt, experienceType, duration, theme, audience, occasion, origin,
  budgetBand, groupSize, priceLow, priceHigh, durationHours, maxGroupSize,
  departsFrom, languages, accessibility, bookingUrl, aggregatorGYG,
  aggregatorViator, bookingIntelligence, cancellationPolicy,
  lastVerified, publishedAt,
  "operatorSlug": operator->slug.current,
  faq[]{question, answer},
  heroImage ${img}
}`

export async function fetchTourFromSanity(slug: string) {
  const d: any = await sanityClient.fetch(tourQuery, {slug})
  if (!d) return null
  return {
    id: d.slug,
    slug: d.slug,
    data: {
      slug: d.slug,
      name: d.name,
      operatorSlug: d.operatorSlug ?? '',
      intro: d.intro,
      whatHappens: d.whatHappens,
      whoSuits: d.whoSuits,
      whoDoesnt: d.whoDoesnt,
      experienceType: d.experienceType,
      duration: d.duration,
      theme: d.theme ?? [],
      audience: d.audience,
      occasion: d.occasion ?? 'general',
      origin: d.origin,
      budgetBand: d.budgetBand,
      groupSize: d.groupSize,
      priceLow: d.priceLow ?? undefined,
      priceHigh: d.priceHigh ?? undefined,
      durationHours: d.durationHours ?? undefined,
      maxGroupSize: d.maxGroupSize ?? undefined,
      departsFrom: d.departsFrom ?? undefined,
      languages: d.languages ?? ['en'],
      accessibility: d.accessibility ?? undefined,
      bookingUrl: d.bookingUrl ?? undefined,
      aggregatorGYG: d.aggregatorGYG ?? undefined,
      aggregatorViator: d.aggregatorViator ?? undefined,
      bookingIntelligence: d.bookingIntelligence ?? undefined,
      cancellationPolicy: d.cancellationPolicy ?? undefined,
      faq: d.faq ?? [],
      heroImage: imageOrFallback(d.heroImage ?? null, d.name, {
        docId: d._id, docType: 'tour', path: 'heroImage',
      }),
      lastVerified: new Date(d.lastVerified),
      publishedAt: new Date(d.publishedAt),
    },
  }
}

// ── Tour Package ────────────────────────────────────────────────────────
const tourPackageQuery = `*[_type == "tourPackage" && slug.current == $slug][0]{
  _id, name, "slug": slug.current, occasion, audience, theme, bundleType,
  durationNights, intro, whyThisCombination, bookingSequence,
  priceLow, priceHigh, anchorStayBlurb, lastVerified, publishedAt,
  "componentTourSlugs": componentTours[]->slug.current,
  "anchorStaySlug": anchorStay->slug.current,
  "altStaySlug": altStay->slug.current,
  faq[]{question, answer},
  heroImage ${img}
}`

export async function fetchTourPackageFromSanity(slug: string) {
  const d: any = await sanityClient.fetch(tourPackageQuery, {slug})
  if (!d) return null
  return {
    id: d.slug,
    slug: d.slug,
    data: {
      slug: d.slug,
      name: d.name,
      occasion: d.occasion,
      audience: d.audience,
      theme: d.theme ?? [],
      bundleType: d.bundleType,
      durationNights: d.durationNights ?? undefined,
      componentTourSlugs: d.componentTourSlugs ?? [],
      anchorStaySlug: d.anchorStaySlug ?? undefined,
      anchorStayBlurb: d.anchorStayBlurb ?? undefined,
      altStaySlug: d.altStaySlug ?? undefined,
      priceLow: d.priceLow ?? undefined,
      priceHigh: d.priceHigh ?? undefined,
      intro: d.intro,
      whyThisCombination: d.whyThisCombination,
      bookingSequence: d.bookingSequence ?? undefined,
      faq: d.faq ?? [],
      heroImage: imageOrFallback(d.heroImage ?? null, d.name, {
        docId: d._id, docType: 'tourPackage', path: 'heroImage',
      }),
      lastVerified: new Date(d.lastVerified),
      publishedAt: new Date(d.publishedAt),
    },
  }
}

/**
 * All published experiences — lightweight list for sitemap generation.
 */
export async function fetchAllExperiencesFromSanity(): Promise<Array<{slug: string; data: {sitemapExclude: boolean; publishedAt: Date}}>> {
  const rows = (await sanityClient.fetch(allExperiencesListQuery)) as Array<{slug: string; publishedAt: string; sitemapExclude?: boolean}>
  return (rows ?? []).map((r) => ({
    slug: r.slug,
    data: {
      sitemapExclude: !!r.sitemapExclude,
      publishedAt: new Date(r.publishedAt),
    },
  }))
}
