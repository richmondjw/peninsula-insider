/**
 * Sanity → Astro event-shape adapter.
 *
 * Mirrors the legacy Astro content-collection event shape so
 * whats-on/[slug].astro can consume it unchanged. The editor-note PT
 * body is flattened back to a plain string with \n\n paragraph breaks
 * (the existing template renders it as plain prose; Portable Text
 * rendering for events isn't needed in the initial migration).
 */
import {sanityClient} from './client'
import {intentUrl} from './image'

const img = `{ asset->{_id}, alt, credit, caption, license }`

const eventBySlugQuery = `*[_type == "event" && slug.current == $slug][0]{
  _id, title, "slug": slug.current, summary, description, eventId,
  startDate, endDate, startTime, endTime, season, month,
  category, subcategory, recurrence, recurrenceNote,
  venueName, venueRegion, suburb, streetAddress, coordinates, indoorOutdoor,
  bookingUrl, ticketingUrl, officialEventUrl, bookingRequired, freePaid,
  priceRange, priceTier, suitableFor, audienceTags, familyFriendly,
  petFriendly, accessibilityNotes, weather, weatherDependency, weatherShape,
  organiser, primarySourceUrl, secondarySourceUrl, verificationStatus,
  lastCheckedDate, visitorAppealScore, editorialPriority,
  nearbyAttractions, suggestedItineraryPairing, nextOccurrence,
  kidsGrade, kidsGradeNote, worthTheDrive, firstTimer, standoutOfMonth,
  skipThis, skipReason, skipInstead, editorVerdict, whyWeCare,
  pairingProse, editorVisited, featuredInDispatch, lens,
  status, publishedAt, internalNotes, manualFollowUpRequired, sitemapExclude,
  "venueSlug": venue->slug.current,
  "placeSlug": place->slug.current,
  heroImage ${img},
  "editorNoteText": pt::text(editorNote)
}`

type SanityImageRef = {
  asset?: {_id: string}
  alt?: string | null
  credit?: string | null
  caption?: string | null
  license?: string | null
} | null

function imageOrFallback(image: SanityImageRef, fallbackAlt: string) {
  if (!image?.asset) {
    return undefined // events allow missing hero
  }
  return {
    src: intentUrl(image, 'hero'),
    alt: image.alt ?? fallbackAlt,
    credit: image.credit ?? '',
    license: image.license ?? 'venue-media-kit',
    caption: image.caption ?? undefined,
  }
}

export async function fetchEventFromSanity(slug: string) {
  const d: any = await sanityClient.fetch(eventBySlugQuery, {slug})
  if (!d) return null
  return {
    id: d.slug,
    slug: d.slug,
    data: {
      slug: d.slug,
      title: d.title,
      summary: d.summary,
      description: d.description ?? undefined,
      eventId: d.eventId ?? undefined,
      startDate: new Date(d.startDate),
      endDate: d.endDate ? new Date(d.endDate) : undefined,
      startTime: d.startTime ?? undefined,
      endTime: d.endTime ?? undefined,
      season: d.season ?? undefined,
      month: d.month ?? undefined,
      venue: d.venueSlug ? {id: d.venueSlug, collection: 'venues' as const} : undefined,
      venueName: d.venueName ?? undefined,
      place: d.placeSlug ? {id: d.placeSlug, collection: 'places' as const} : undefined,
      venueRegion: d.venueRegion ?? undefined,
      suburb: d.suburb ?? undefined,
      streetAddress: d.streetAddress ?? undefined,
      coordinates: d.coordinates ?? undefined,
      indoorOutdoor: d.indoorOutdoor ?? undefined,
      bookingUrl: d.bookingUrl ?? undefined,
      ticketingUrl: d.ticketingUrl ?? undefined,
      officialEventUrl: d.officialEventUrl ?? undefined,
      bookingRequired: d.bookingRequired ?? undefined,
      freePaid: d.freePaid ?? undefined,
      priceRange: d.priceRange ?? undefined,
      priceTier: d.priceTier ?? undefined,
      category: d.category,
      subcategory: d.subcategory ?? undefined,
      recurrence: d.recurrence ?? 'one-off',
      recurrenceNote: d.recurrenceNote ?? undefined,
      suitableFor: d.suitableFor ?? undefined,
      audienceTags: d.audienceTags ?? [],
      familyFriendly: d.familyFriendly ?? undefined,
      petFriendly: d.petFriendly ?? undefined,
      accessibilityNotes: d.accessibilityNotes ?? undefined,
      weather: d.weather ?? 'mixed',
      weatherDependency: d.weatherDependency ?? undefined,
      weatherShape: d.weatherShape ?? undefined,
      organiser: d.organiser ?? undefined,
      primarySourceUrl: d.primarySourceUrl ?? undefined,
      secondarySourceUrl: d.secondarySourceUrl ?? undefined,
      verificationStatus: d.verificationStatus ?? undefined,
      lastCheckedDate: d.lastCheckedDate ? new Date(d.lastCheckedDate) : undefined,
      visitorAppealScore: d.visitorAppealScore ?? undefined,
      editorialPriority: d.editorialPriority ?? undefined,
      nearbyAttractions: d.nearbyAttractions ?? undefined,
      suggestedItineraryPairing: d.suggestedItineraryPairing ?? undefined,
      nearestVenues: [], // not migrated in this pass
      nextOccurrence: d.nextOccurrence ? new Date(d.nextOccurrence) : undefined,
      kidsGrade: d.kidsGrade ?? undefined,
      kidsGradeNote: d.kidsGradeNote ?? undefined,
      kidsGradeAuto: undefined,
      worthTheDrive: !!d.worthTheDrive,
      firstTimer: !!d.firstTimer,
      skipThis: !!d.skipThis,
      skipReason: d.skipReason ?? undefined,
      skipInstead: d.skipInstead ?? undefined,
      editorVerdict: d.editorVerdict ?? undefined,
      whyWeCare: d.whyWeCare ?? undefined,
      standoutOfMonth: !!d.standoutOfMonth,
      pairingProse: d.pairingProse ?? undefined,
      editorVisited: !!d.editorVisited,
      featuredInDispatch: d.featuredInDispatch ?? undefined,
      relatedArticles: [],
      lens: d.lens ?? [],
      editorNote: d.editorNoteText ?? '',
      heroImage: imageOrFallback(d.heroImage ?? null, d.title),
      internalNotes: d.internalNotes ?? undefined,
      manualFollowUpRequired: !!d.manualFollowUpRequired,
      status: d.status ?? 'published',
      publishedAt: new Date(d.publishedAt),
      sitemapExclude: !!d.sitemapExclude,
    },
  }
}
