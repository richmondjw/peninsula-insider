/**
 * Peninsula Insider — typed GROQ queries.
 *
 * One named export per query. The shape Astro components consume is
 * controlled here, so component code stays clean of GROQ projections.
 *
 * Convention: each entity has `<entity>BySlug` (single-document fetch)
 * and `all<Entities>` (list fetch, sorted by editorial-default order).
 *
 * Add new queries as phases progress. The first batch ships in Phase 1
 * for venues; further phases extend this file.
 */

// ── Image projection — reused everywhere ────────────────────────────────
//
// Returns the asset reference (for Sanity's image URL builder), the
// hotspot/crop data (so responsive crops respect the editor's focal point),
// and the metadata fields we hung off the imageRef object type.
const imageProjection = `{
  ...,
  asset->{
    _id,
    _ref,
    metadata { lqip, dimensions { width, height, aspectRatio } }
  }
}`

// ── Place projection (used as `place->` from venues etc.) ───────────────
const placeProjection = `{
  _id,
  name,
  "slug": slug.current,
  kind,
  zone
}`

// ── Venue ───────────────────────────────────────────────────────────────
export const venueBySlugQuery = `*[_type == "venue" && slug.current == $slug][0]{
  _id,
  _updatedAt,
  name,
  "slug": slug.current,
  type,
  place-> ${placeProjection},
  zone,
  coordinates,
  address,
  phone,
  website,
  bookingUrl,
  bookingProvider,
  priceBand,
  signature,
  editorNote,
  heroImage ${imageProjection},
  gallery[] ${imageProjection},
  tags,
  authority,
  dogFriendly,
  dogFriendlyNotes,
  dogsAllowedOutdoorsOnly,
  offLeashNearby,
  waterAccessNearby,
  dogAmenities,
  rainyDayDogSuitability,
  affiliateNote,
  featuredPartner,
  editorPick,
  hoursNote,
  liveStatusUrl,
  lastVerified,
  publishedAt,
  sitemapExclude
}`

export const allVenueSlugsQuery = `*[_type == "venue" && !(_id in path("drafts.**"))]{
  "slug": slug.current
}`

export const allVenuesQuery = `*[_type == "venue" && !(_id in path("drafts.**"))] | order(name asc){
  _id,
  name,
  "slug": slug.current,
  type,
  place-> ${placeProjection},
  zone,
  priceBand,
  signature,
  heroImage ${imageProjection},
  tags,
  editorPick,
  featuredPartner
}`

// ── Place ────────────────────────────────────────────────────────────────────

export const placeBySlugQuery = `*[_type == "place" && slug.current == $slug][0]{
  _id,
  name,
  "slug": slug.current,
  kind,
  zone,
  coordinates,
  factualLede,
  intro,
  signature,
  insiderNote,
  tldr,
  bestFor,
  notFor,
  bestSeason,
  worstTime,
  stayDuration,
  bestDay,
  skip,
  driveTime,
  featured,
  publishedAt,
  sitemapExclude,
  heroImage ${imageProjection},
  "relatedPlaces": relatedPlaces[]->{ "slug": slug.current, name, kind, zone }
}`

export const allPlacesQuery = `*[_type == "place" && !(_id in path("drafts.**"))] | order(name asc){
  _id,
  name,
  "slug": slug.current,
  kind,
  zone,
  coordinates,
  factualLede,
  intro,
  signature,
  insiderNote,
  tldr,
  bestFor,
  notFor,
  bestSeason,
  worstTime,
  stayDuration,
  bestDay,
  skip,
  driveTime,
  featured,
  publishedAt,
  sitemapExclude,
  heroImage ${imageProjection},
  "relatedPlaces": relatedPlaces[]->{ "slug": slug.current, name, kind, zone }
}`

// ── Venue (full — includes all fields needed by detail pages) ────────────────

export const allVenuesFullQuery = `*[_type == "venue" && !(_id in path("drafts.**"))] | order(name asc){
  _id,
  _updatedAt,
  name,
  "slug": slug.current,
  type,
  place-> ${placeProjection},
  zone,
  coordinates,
  address,
  phone,
  website,
  bookingUrl,
  bookingProvider,
  priceBand,
  signature,
  whyWeGo,
  editorNote,
  editorVerdict,
  bestFor,
  ifOnlyOneThing,
  pairWith,
  heroImage ${imageProjection},
  gallery[] ${imageProjection},
  tags,
  authority,
  subregion,
  wines,
  visiting,
  restaurant,
  accommodation,
  sameAs,
  faq[]{q, a},
  dogFriendly,
  dogFriendlyNotes,
  dogsAllowedOutdoorsOnly,
  offLeashNearby,
  waterAccessNearby,
  dogAmenities,
  rainyDayDogSuitability,
  affiliateNote,
  featuredPartner,
  editorPick,
  hoursNote,
  liveStatusUrl,
  lastVerified,
  lastFactVerified,
  publishedAt,
  sitemapExclude
}`

// ── Itinerary ────────────────────────────────────────────────────────────────

const itineraryImageProjection = `{ asset->{_id}, alt, credit, caption, license }`

const itineraryFields = `
  _id, title, "slug": slug.current, dek, audience, mood, lengthNights,
  duration, theme, occasion, origin, budget, season,
  editorialFrame, skipThese, drivingDistanceKm, walkingIntensity,
  budgetRangeAud, costBreakdown, bookingChecklist, variations,
  totalDriveMinutes, editorNote, publishedAt, lastVerified, sitemapExclude,
  heroImage ${itineraryImageProjection},
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
`

export const itineraryBySlugQuery = `*[_type == "itinerary" && slug.current == $slug][0]{${itineraryFields}}`

export const allItinerariesQuery = `*[_type == "itinerary" && !(_id in path("drafts.**"))] | order(publishedAt desc){${itineraryFields}}`

// ── Event ────────────────────────────────────────────────────────────────────

const eventImageProjection = `{ asset->{_id}, alt, credit, caption, license }`

const eventFields = `
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
  heroImage ${eventImageProjection},
  "editorNoteText": pt::text(editorNote)
`

export const eventBySlugQuery = `*[_type == "event" && slug.current == $slug][0]{${eventFields}}`

export const allEventsQuery = `*[_type == "event" && !(_id in path("drafts.**")) && status != "archived"] | order(startDate asc){${eventFields}}`
