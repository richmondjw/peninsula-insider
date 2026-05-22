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

// Phase 2+ queries land here as we migrate each entity.
