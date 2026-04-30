import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Peninsula Insider  -  Content schema
//
// Astro v6 Content Layer format. Each collection declares its own glob loader
// pointing at the JSON or Markdown files under src/content/<name>/.
// Schemas are unchanged from the v5 legacy config — only the wrapper shape
// is new.

const zone = z.enum([
  'bayside',
  'hinterland',
  'red-hill-plateau',
  'ocean-coast',
  'back-beaches',
  'tip',
]);

const season = z.enum(['spring', 'summer', 'autumn', 'winter', 'all-year']);

const mood = z.enum([
  'long-lunch',
  'anniversary',
  'family',
  'rainy-day',
  'sunset',
  'slow',
  'wellness',
  'romance',
  'first-date',
  'big-group',
  'solo',
  'quick-bite',
  'weekend-escape',
  'cellar-door',
  'walk',
  'beach',
  'fireplace',
  'view',
  'rooftop',
  'garden',
  'waterfront',
  'golf',
]);

const audience = z.enum([
  'couples',
  'families',
  'solo',
  'group',
  'locals',
  'first-timers',
]);

const imageLicense = z.enum([
  'original-commissioned',
  'venue-media-kit',
  'visit-victoria',
  'wikimedia-cc0',
  'wikimedia-cc-by',
  'wikimedia-cc-by-sa',
  'tmp-unsplash',
  'tmp-wikimedia',
  'tmp-pexels',
  'other-licensed',
]);

const coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const imageRef = z.object({
  src: z.string(),
  alt: z.string(),
  credit: z.string(),
  license: imageLicense.default('venue-media-kit'),
  caption: z.string().optional(),
});

const tagBlock = z.object({
  mood: z.array(mood).default([]),
  season: z.array(season).default([]),
  audience: z.array(audience).default([]),
});

const authorityBlock = z
  .object({
    hats: z.number().min(0).max(3).optional(),
    hallidayScore: z.number().min(0).max(100).optional(),
    awards: z.array(z.string()).default([]),
    pressMentions: z.array(z.string()).default([]),
  })
  .optional();

const venues = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/venues' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    type: z.enum([
      'restaurant',
      'winery',
      'cafe',
      'bakery',
      'pub',
      'brewery',
      'distillery',
      'producer',
      'market',
      'hotel',
      'villa',
      'cottage',
      'glamping',
      'farm-stay',
      'spa',
    ]),
    place: reference('places'),
    zone,
    coordinates,
    address: z.string(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    bookingUrl: z.string().url().optional(),
    bookingProvider: z
      .enum([
        'opentable',
        'tock',
        'resy',
        'sevenrooms',
        'direct',
        'booking.com',
        'stayz',
        'airbnb',
        'peninsula-hot-springs',
        'none',
      ])
      .optional(),
    priceBand: z.enum(['$', '$$', '$$$', '$$$$']),
    authority: authorityBlock,
    signature: z.string(),
    editorNote: z.string(),
    tags: tagBlock,
    dogFriendly: z.boolean().default(false),
    dogFriendlyNotes: z.string().optional(),
    dogsAllowedOutdoorsOnly: z.boolean().optional(),
    offLeashNearby: z.boolean().optional(),
    waterAccessNearby: z.boolean().optional(),
    dogAmenities: z.array(z.enum(['bowl', 'outdoor-seating', 'enclosed-area', 'treats', 'dog-menu'])).default([]),
    nearbyVet: z.string().optional(),
    nearbyDaycare: z.string().optional(),
    rainyDayDogSuitability: z.enum(['low', 'medium', 'high']).optional(),
    heroImage: imageRef,
    gallery: z.array(imageRef).default([]),
    affiliateNote: z.string().optional(),
    featuredPartner: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const experiences = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/experiences' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    type: z.enum([
      'walk',
      'beach',
      'wellness',
      'tour',
      'attraction',
      'gallery',
      'park',
      'lookout',
      'market',
      'workshop',
      'golf-course',
    ]),
    place: reference('places'),
    zone,
    coordinates,
    address: z.string().optional(),
    website: z.string().url().optional(),
    bookingUrl: z.string().url().optional(),
    durationMinutes: z.number().positive().optional(),
    difficulty: z.enum(['easy', 'moderate', 'hard']).optional(),
    seasonBest: z.array(season).default([]),
    editorNote: z.string(),
    tags: tagBlock,
    dogFriendly: z.boolean().default(false),
    dogFriendlyNotes: z.string().optional(),
    offLeashNearby: z.boolean().optional(),
    waterAccessNearby: z.boolean().optional(),
    nearbyVet: z.string().optional(),
    nearbyDaycare: z.string().optional(),
    rainyDayDogSuitability: z.enum(['low', 'medium', 'high']).optional(),
    heroImage: imageRef,
    gallery: z.array(imageRef).default([]),
    golf: z.any().optional(),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const places = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/places' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    kind: z.enum(['town', 'village', 'zone', 'ridge', 'beach', 'cape']),
    zone,
    coordinates,
    intro: z.string(),
    heroImage: imageRef,
    relatedPlaces: z.array(reference('places')).default([]),
    publishedAt: z.coerce.date(),
    tldr: z.array(z.string()).optional(),
    driveTime: z.string().optional(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    author: reference('authors'),
    houseByline: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    heroImage: imageRef,
    format: z.enum([
      'editors-letter',
      'long-lunch-list',
      'cellar-door-dispatch',
      'stay-notes',
      'slow-peninsula',
      'insider-edit',
      'interview',
      'investigation',
      'service',
      'weekend-picker',
      'hub-guide',
      'trail-guide',
      'venue-guide',
    ]),
    tags: z.array(z.string()).default([]),
    relatedVenues: z.array(reference('venues')).default([]),
    relatedExperiences: z.array(reference('experiences')).default([]),
    relatedPlaces: z.array(reference('places')).default([]),
    relatedArticles: z.array(reference('articles')).default([]),
    relatedItineraries: z.array(reference('itineraries')).default([]),
    readingTimeMinutes: z.number().positive().optional(),
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'review', 'scheduled', 'published']).default('draft'),
    lastVerified: z.coerce.date().optional(),
    clusterLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    sitemapExclude: z.boolean().default(false),
  }),
});

// /escape/ taxonomy — 7 axes from peninsula_insider_escape_v1 pack.
// All seven axes are optional with sensible defaults so legacy itineraries
// (which only carried `audience` + `mood` + `lengthNights`) continue to validate.
// Pre-publish gate (lib/escape.ts) enforces non-default values for new commissions.
const escapeDuration = z.enum([
  'half-day',
  'day',
  'one-night',
  'weekend',
  'three-night',
  'midweek',
  'week',
]);

const escapeTheme = z.enum([
  'wine',
  'food',
  'food+wine',
  'wellness',
  'coastal',
  'hinterland',
  'golf',
  'wedding',
  'cultural',
  'adventure',
  'cycling',
  'surfing',
  'producer',
  'garden',
  'general',
]);

const escapeOccasion = z.enum([
  'none',
  'birthday',
  'anniversary',
  'proposal',
  'honeymoon',
  'babymoon',
  'christmas',
  'new-year',
  'easter',
  'mothers-day',
  'fathers-day',
  'valentines',
  'special',
  'milestone',
  'reunion',
  'work-retreat',
  'wedding-guest',
]);

const escapeBudget = z.enum(['luxe', 'mid', 'budget', 'mixed']);

const escapeOrigin = z.enum(['melbourne', 'interstate', 'international', 'ferry', 'train']);

const escapeSeason = z.enum([
  'year-round',
  'summer',
  'autumn',
  'winter',
  'spring',
  'christmas-period',
  'easter-period',
  'school-holidays',
  'whale-season',
  'rainy',
]);

const itineraries = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/itineraries' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    dek: z.string(),

    // Legacy axes — kept for back-compat with the 6 itineraries pre-pack.
    audience: z.enum(['couple', 'family', 'friends', 'solo', 'locals']),
    mood: z.enum([
      'slow',
      'indulgent',
      'wellness',
      'adventure',
      'food-wine',
      'mixed',
      'quick',
    ]),
    lengthNights: z.number().int().nonnegative(),

    // 7-axis taxonomy from /escape/ pack. Optional during the migration window
    // so legacy entries don't fail validation; new commissions must populate.
    duration: escapeDuration.optional(),
    theme: z.array(escapeTheme).max(2).default([]),
    occasion: escapeOccasion.default('none'),
    origin: escapeOrigin.default('melbourne'),
    budget: escapeBudget.default('mixed'),
    season: escapeSeason.default('year-round'),

    // Conversion architecture — anchor stay drives the 3-placement rule
    // (hero CTA, day-N "where you sleep" block, related rail).
    anchorStay: reference('venues').optional(),
    anchorStayBlurb: z.string().optional(),
    altStays: z.array(reference('venues')).default([]),
    anchorTown: reference('places').optional(),
    baseTowns: z.array(reference('places')).default([]),

    // Anatomy fields beyond stops — populated as itineraries graduate to the
    // canonical 11-section template.
    editorialFrame: z.string().optional(),
    drivingDistanceKm: z.number().nonnegative().optional(),
    walkingIntensity: z.enum(['low', 'moderate', 'high']).optional(),
    budgetRangeAud: z.string().optional(), // e.g. "$850–$1,200 per couple"
    costBreakdown: z
      .object({
        stay: z.string().optional(),
        food: z.string().optional(),
        drink: z.string().optional(),
        activities: z.string().optional(),
        fuel: z.string().optional(),
      })
      .optional(),
    bookingChecklist: z
      .array(
        z.object({
          item: z.string(),
          priority: z.enum(['essential', 'recommended', 'optional']).default('recommended'),
          windowWeeksAhead: z.number().nonnegative().optional(),
        })
      )
      .default([]),
    variations: z
      .array(
        z.object({
          label: z.string(), // e.g. "Rainy day", "With kids", "Luxe-up"
          body: z.string(),
          relatedItinerary: z.string().optional(), // slug of sibling itinerary
        })
      )
      .default([]),
    skipThese: z.string().optional(), // 60–100 word "what to skip" panel
    faq: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),

    // Existing fields preserved.
    stops: z.array(
      z.object({
        day: z.number().int().positive(),
        order: z.number().int().positive(),
        venue: reference('venues').optional(),
        experience: reference('experiences').optional(),
        note: z.string().optional(),
        timeOfDay: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night']),
        timeRange: z.string().optional(), // e.g. "9:30–10:30am" — preferred over timeOfDay
        practical: z.string().optional(), // "Booking required · 90 min · $$ · Parking on-site"
        driveMinutesToNext: z.number().nonnegative().optional(),
      })
    ),
    totalDriveMinutes: z.number().nonnegative().optional(),
    heroImage: imageRef,
    editorNote: z.string(),
    publishedAt: z.coerce.date(),
    lastVerified: z.coerce.date().optional(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/events' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    venue: reference('venues').optional(),
    place: reference('places'),
    bookingUrl: z.string().url().optional(),
    category: z.enum([
      'food-wine',
      'market',
      'festival',
      'cellar-door',
      'community',
      'arts',
      'wellness',
      'live-music',
      'racing-sport',
      'family-programs',
      'exhibition',
      'civic',
      'nature',
      'writers-ideas',
    ]),
    recurrence: z
      .enum(['one-off', 'weekly', 'monthly', 'annual', 'seasonal', 'ongoing'])
      .default('one-off'),
    kidsGrade: z.enum(['A', 'B', 'C', 'not-for-kids']).optional(),
    kidsGradeNote: z.string().optional(),
    worthTheDrive: z.boolean().default(false),
    firstTimer: z.boolean().default(false),
    weather: z
      .enum(['all-weather', 'sunny-only', 'rainy-day-rescue', 'weather-proof', 'mixed'])
      .default('mixed'),
    skipThis: z.boolean().default(false),
    skipReason: z.string().optional(),
    editorVerdict: z.string().optional(),
    lens: z
      .array(
        z.enum([
          'weekend-pick',
          'date-idea',
          'family-saturday',
          'rainy-day',
          'worth-the-drive',
          'free',
          'school-holidays',
          'walk-in',
          'ticketed',
          'locals-know',
        ])
      )
      .default([]),
    editorNote: z.string().optional(),
    heroImage: imageRef.optional(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    role: z.enum(['editor', 'contributor', 'guest']),
    bio: z.string(),
    photo: imageRef.optional(),
    links: z
      .object({
        site: z.string().url().optional(),
        instagram: z.string().url().optional(),
        twitter: z.string().url().optional(),
      })
      .optional(),
    publishedAt: z.coerce.date(),
  }),
});

// ─── Tour vertical collections ───────────────────────────────────────────────

const tourOperators = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tour-operators' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    operatorType: z.enum(['volume', 'wine-specialist', 'premium-private', 'activity-specialist']),
    website: z.string().url().optional(),
    phone: z.string().optional(),
    pickupPoints: z.array(z.string()).default([]),
    languages: z.array(z.string()).default(['en']),
    maxCapacity: z.number().positive().optional(),
    affiliateProgram: z.enum(['yes', 'no', 'unknown']).default('unknown'),
    affiliateUrl: z.string().url().optional(),
    vetted: z.boolean().default(false),
    intro: z.string(),
    whatGoodAt: z.string(),
    notSuitedFor: z.string(),
    heroImage: imageRef,
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
  }),
});

const tours = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tours' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    operatorSlug: z.string(),
    experienceType: z.enum(['food-wine','wildlife-nature','history-heritage','kayak-paddle','cycling','walking-hiking','scenic-sightseeing','cruise-sailing','art-culture','surf-water','private-charter','wellness']),
    duration: z.enum(['under-2h','half-day','full-day','multi-2n','multi-3n','multi-extended']),
    theme: z.array(z.enum(['romantic','family','adventure','relaxed','gourmet','wellness','educational','eco','seasonal'])).max(2).default([]),
    audience: z.enum(['adults','families','solo','couples','seniors','accessible','general']),
    occasion: z.enum(['anniversary','hens','bucks','corporate','birthday','family-reunion','school','general']).default('general'),
    origin: z.enum(['mornington','sorrento','portsea','red-hill','merricks','flinders','dromana','rosebud','rye','blairgowrie','peninsula-wide','melbourne-cbd']),
    budgetBand: z.enum(['budget','moderate','mid-range','premium','luxury']),
    groupSize: z.enum(['intimate','small-group','large-group','private-charter']),
    priceLow: z.number().positive().optional(),
    priceHigh: z.number().positive().optional(),
    durationHours: z.number().positive().optional(),
    maxGroupSize: z.number().positive().optional(),
    departsFrom: z.string().optional(),
    languages: z.array(z.string()).default(['en']),
    accessibility: z.string().optional(),
    bookingUrl: z.string().url().optional(),
    aggregatorGYG: z.string().url().optional(),
    aggregatorViator: z.string().url().optional(),
    intro: z.string(),
    whatHappens: z.string(),
    whoSuits: z.string(),
    whoDoesnt: z.string(),
    bookingIntelligence: z.string().optional(),
    cancellationPolicy: z.string().optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
    heroImage: imageRef,
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
  }),
});

const tourPackages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tour-packages' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    occasion: z.enum(['anniversary','hens','bucks','corporate','birthday','family-reunion','school','general','winter','foodies']),
    audience: z.enum(['adults','families','solo','couples','seniors','general']),
    theme: z.array(z.string()).max(2).default([]),
    bundleType: z.enum(['sequential-day','stay-anchored','flexible']),
    durationNights: z.number().nonnegative().optional(),
    componentTourSlugs: z.array(z.string()).default([]),
    anchorStaySlug: z.string().optional(),
    anchorStayBlurb: z.string().optional(),
    altStaySlug: z.string().optional(),
    priceLow: z.number().positive().optional(),
    priceHigh: z.number().positive().optional(),
    intro: z.string(),
    whyThisCombination: z.string(),
    bookingSequence: z.string().optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
    heroImage: imageRef,
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
  }),
});

// ─── Boating + Fishing vertical collections ──────────────────────────────────
//
// Source: peninsula_insider_boating_fishing_v1 pack (30 Apr 2026).
// Five entity collections — species, fishing-locations, fishing-charters,
// boat-ramps, boat-hire — mirror the /tour/ JSON-first pattern so prose
// authoring stays editable but invariants are enforced. Hub and pillar pages
// are MDX in src/pages/fishing/ and src/pages/boating/ rather than
// collections, since they are prose-heavy and one-of-a-kind.
//
// Slugs match the pack's bf_taxonomy_spec.md §5. The [VERIFY] flag is modelled
// as `verified: false` plus `status: 'draft'` — pre-publish gate enforces
// `status === 'published'` before sitemap inclusion.

const fishingRegion = z.enum(['port-phillip-bay', 'western-port', 'bass-strait-fringe']);

const speciesAvailability = z.enum(['peak', 'good', 'fair', 'rare', 'closed']);

const tideDependence = z.enum(['all-tide', 'mid-to-high', 'high-tide-only', 'tidal-extreme']);

const bfFaq = z.array(z.object({ question: z.string(), answer: z.string() }));

const bfStatus = z.enum(['draft', 'verify', 'published']);

// Entity collections are stored as Markdown with rich frontmatter — same
// pattern as `articles`. Frontmatter holds the structured fields needed by
// the schema builders and internal-link wiring; the MD body holds the
// editorial prose (rendered via <Content />). This keeps prose-heavy entity
// types easy to author and review while still enforcing invariants.

const species = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/species' }),
  schema: z.object({
    slug: z.string(),
    commonName: z.string(),
    scientificName: z.string(),
    aliases: z.array(z.string()).default([]),
    primaryRegion: fishingRegion,
    secondaryRegions: z.array(fishingRegion).default([]),
    bagLimit: z.string(), // VFA-cited prose, e.g. "10 per person per day"
    sizeLimit: z.string(), // e.g. "28cm total length"
    closedSeason: z.string().optional(),
    licenceRequired: z.boolean().default(true),
    peakSeason: z.string(), // editorial, e.g. "Oct–Dec"
    seasonality: z
      .array(
        z.object({
          month: z.enum(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']),
          portPhillipBay: speciesAvailability,
          westernPort: speciesAvailability,
          bassStraitFringe: speciesAvailability,
        }),
      )
      .default([]),
    locationSlugs: z.array(z.string()).default([]),
    charterSlugs: z.array(z.string()).default([]),
    eatLinks: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    intro: z.string(),
    metaDescription: z.string(),
    faq: bfFaq.default([]),
    vfaCitationUrl: z.string().url(),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const fishingLocations = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/fishing-locations' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    locationType: z.enum(['pier', 'jetty', 'beach', 'rock-platform', 'inlet', 'foreshore']),
    region: fishingRegion,
    coordinates: coordinates.optional(),
    parking: z.string().optional(),
    accessibility: z.string().optional(),
    publicToilets: z.boolean().optional(),
    bestSeason: z.string().optional(),
    primarySpecies: z.array(z.string()).default([]), // species slugs
    nearestRampSlug: z.string().optional(),
    tideStation: z.string().optional(),
    tideNotes: z.string().optional(),
    safetyNotes: z.string().optional(),
    intro: z.string(),
    metaDescription: z.string(),
    faq: bfFaq.default([]),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const fishingCharters = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/fishing-charters' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    operatorWebsite: z.string().url().optional(),
    affiliateUrl: z.string().url().optional(),
    bookingProvider: z.enum(['direct', 'fishingbooker', 'getyourguide', 'viator', 'none']).default('none'),
    departurePoints: z.array(z.string()).default([]), // ramp slugs or display names
    vesselName: z.string().optional(),
    vesselType: z.string().optional(),
    capacityMin: z.number().int().nonnegative().optional(),
    capacityMax: z.number().int().nonnegative().optional(),
    priceLow: z.number().nonnegative().optional(),
    priceHigh: z.number().nonnegative().optional(),
    priceUnit: z.enum(['per-person', 'per-group', 'per-charter']).default('per-person'),
    targetSpecies: z.array(z.string()).default([]), // species slugs
    seasonalityNote: z.string().optional(),
    licenceCovered: z.enum(['covered', 'byo', 'unconfirmed']).default('unconfirmed'),
    cancellationPolicy: z.string().optional(),
    intro: z.string(),
    metaDescription: z.string(),
    whoSuits: z.string(),
    whoDoesnt: z.string(),
    faq: bfFaq.default([]),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const boatRamps = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/boat-ramps' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    region: fishingRegion,
    coordinates: coordinates.optional(),
    address: z.string().optional(),
    managingAuthority: z.string().optional(),
    laneCount: z.number().int().positive().optional(),
    surface: z.enum(['concrete', 'gravel', 'sealed', 'mixed']).optional(),
    fee: z.string().optional(),
    parkingCapacity: z.string().optional(),
    parkingPressure: z.enum(['low', 'medium', 'high']).optional(),
    tideDependence: tideDependence,
    tideStation: z.string().optional(),
    maxVesselLength: z.string().optional(),
    nearbyRampAlternatives: z.array(z.string()).default([]),
    accessibleSpecies: z.array(z.string()).default([]), // species slugs
    accessibleLocations: z.array(z.string()).default([]), // location slugs
    nearestHireSlug: z.string().optional(),
    safetyNotes: z.string().optional(),
    intro: z.string(),
    metaDescription: z.string(),
    faq: bfFaq.default([]),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const boatHire = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/boat-hire' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    operatorWebsite: z.string().url().optional(),
    affiliateUrl: z.string().url().optional(),
    bookingProvider: z.enum(['direct', 'getyourguide', 'viator', 'none']).default('direct'),
    departurePoint: z.string(),
    vesselTypes: z.array(z.string()).default([]),
    licenceRequired: z.boolean().default(false),
    priceLow: z.number().nonnegative().optional(),
    priceHigh: z.number().nonnegative().optional(),
    priceUnit: z.enum(['per-hour', 'per-half-day', 'per-day', 'per-session']).default('per-hour'),
    seasonalityNote: z.string().optional(),
    nearestRampSlug: z.string().optional(),
    coordinates: coordinates.optional(),
    intro: z.string(),
    metaDescription: z.string(),
    whoSuits: z.string(),
    whoDoesnt: z.string(),
    faq: bfFaq.default([]),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

export const collections = {
  venues,
  experiences,
  places,
  articles,
  itineraries,
  events,
  authors,
  tourOperators,
  tours,
  tourPackages,
  species,
  fishingLocations,
  fishingCharters,
  boatRamps,
  boatHire,
};
