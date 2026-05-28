/**
 * Import-events configuration.
 *
 * Names every field on the events schema by who owns it. The import script
 * reads this manifest and:
 *
 *   - MACHINE-OWNED fields are overwritten on every import.
 *   - DERIVED fields are computed during import from machine fields and
 *     overwritten alongside them.
 *   - EDITORIAL fields are read from the existing JSON file (if present)
 *     and merged back unchanged.
 *
 * Adding a field to the events schema? Add it to one of the three lists
 * below. If you forget, the import script will warn at runtime so silent
 * data loss is impossible.
 */

export const machineOwnedFields = [
  // Identity (machine — eventId is the join key)
  'eventId',
  'title',
  'summary',
  'description',

  // When
  'startDate',
  'endDate',
  'startTime',
  'endTime',
  'season',
  'month',

  // Where
  'venueName',
  'venueRegion',
  'suburb',
  'streetAddress',
  'coordinates',
  'indoorOutdoor',

  // Money
  'bookingUrl',
  'ticketingUrl',
  'officialEventUrl',
  'bookingRequired',
  'freePaid',
  'priceRange',

  // Categorisation
  'subcategory',
  'recurrence',
  'recurrenceNote',

  // Audience (raw)
  'suitableFor',
  'familyFriendly',
  'petFriendly',
  'accessibilityNotes',

  // Weather (raw)
  'weatherDependency',

  // Organiser
  'organiser',

  // Sources & verification
  'primarySourceUrl',
  'secondarySourceUrl',
  'verificationStatus',
  'lastCheckedDate',
  'visitorAppealScore',
  'editorialPriority',

  // Cross-link source data (raw text from spreadsheet)
  'nearbyAttractions',
  'suggestedItineraryPairing',

  // Internal (from spreadsheet "Issues / Notes")
  'internalNotes',
  'manualFollowUpRequired',
];

export const derivedFields = [
  // Computed during import from machine fields
  'priceTier',
  'weatherShape',
  'audienceTags',
  'category', // mapped from spreadsheet Primary Category + Subcategory
  'place', // mapped from suburb match against places collection
  'venue', // mapped from venueName match against venues collection
  'nearestVenues', // mapped from coordinates against venues collection
  'nextOccurrence', // recomputed nightly by cron
];

export const editorialOwnedFields = [
  // Hand-written, preserved across re-imports
  'worthTheDrive',
  'firstTimer',
  'skipThis',
  'skipReason',
  'skipInstead',
  'editorVerdict',
  'whyWeCare',
  'standoutOfMonth',
  'pairingProse',
  'editorVisited',
  'featuredInDispatch',
  'relatedArticles',
  'lens',
  'editorNote',
  'heroImage', // when the editor sources real venue photography
];

export const lifecycleFields = [
  // Machine-set on first import, editor can override afterwards
  'slug',
  'status',
  'publishedAt',
  'sitemapExclude',
];

/**
 * Maps spreadsheet "Primary Category" + "Subcategory" to PI's category enum.
 * Order matters; first match wins. Falls back to 'community' if nothing
 * matches — surfaces in the editorial review queue for reclassification.
 */
export const categoryMap = [
  // Subcategory-driven first (more specific)
  { match: /cellar door/i, category: 'cellar-door' },
  { match: /exhibition|gallery/i, category: 'exhibition' },
  { match: /market/i, category: 'market' },
  { match: /winery|wine/i, category: 'food-wine' },
  { match: /food|restaurant|dining/i, category: 'food-wine' },
  { match: /music|concert|gig/i, category: 'live-music' },
  { match: /race|sport/i, category: 'racing-sport' },
  { match: /family|kids|children/i, category: 'family-programs' },
  { match: /walk|hike|nature|outdoor/i, category: 'nature' },
  { match: /spa|wellness|hot springs/i, category: 'wellness' },
  { match: /writers|talks|ideas|literary/i, category: 'writers-ideas' },
  { match: /civic|council|community/i, category: 'community' },
  { match: /festival|major event/i, category: 'festival' },
  { match: /art|culture/i, category: 'arts' },
];

/**
 * Maps known suburbs to a `places` collection slug. Suburbs not on this
 * map fall through with an empty `place` ref — surfaces in the editorial
 * review queue.
 */
export const suburbToPlace = {
  Mornington: 'mornington',
  'Mount Martha': 'mount-martha',
  'Mt Martha': 'mount-martha',
  'Red Hill': 'red-hill',
  'Red Hill South': 'red-hill',
  Sorrento: 'sorrento',
  Portsea: 'portsea',
  Blairgowrie: 'blairgowrie',
  Rye: 'rye',
  Rosebud: 'rosebud',
  Dromana: 'dromana',
  'Safety Beach': 'safety-beach',
  'Main Ridge': 'main-ridge',
  'Cape Schanck': 'cape-schanck',
  Flinders: 'flinders',
  Shoreham: 'shoreham',
  Balnarring: 'balnarring',
  Merricks: 'merricks',
  'Merricks North': 'merricks',
  Hastings: 'hastings',
  Tuerong: 'tuerong',
  Moorooduc: 'moorooduc',
  'Point Nepean': 'point-nepean',
};
