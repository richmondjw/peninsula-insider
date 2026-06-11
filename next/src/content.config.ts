import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Peninsula Insider  -  Content schema (cache-bust: 2026-05-24)
//
// Astro v6 Content Layer format. Each collection declares its own glob loader
// pointing at the JSON or Markdown files under src/content/<name>/.
// Schemas are unchanged from the v5 legacy config — only the wrapper shape
// is new.

const zone = z.enum([
  'mornington',      // was 'bayside'
  'bay-coast',       // new — covers Dromana–Rye coastal strip
  'red-hill',        // was 'red-hill-plateau'
  'hinterland',      // unchanged
  'peninsula-tip',   // was 'tip' and 'back-beaches' (consolidated)
  'ocean-coast',     // unchanged
  'western-port',    // unchanged
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
  'outdoor',
  'surf',
  'worth-the-drive',
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
  // Free-form attribution string. Set to the literal "jem" for any photo
  // taken by James and Emma; templates (lib/editorial.formatHeroCredit)
  // render that sentinel as "Photograph by jem". Anything else renders
  // as "Photo · {credit}".
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
      'producer',      // deprecated — keep during migration, remove after PR-3
      'providore',     // NEW — farmgate, cheesemonger, fishmonger, produce store
      'market',
      'hotel',
      'villa',
      'cottage',
      'glamping',
      'farm-stay',
      'spa',
      'walk',
      'beach',
      'activity',
    ]),
    /**
     * Optional free-text sub-classification within a type.
     * Examples: type=cafe + subtype=roaster, type=providore + subtype=fishmonger.
     * Surfaced as a secondary chip on venue cards and detail pages.
     */
    subtype: z.string().optional(),
    /**
     * Estate grouping — links this venue to a parent multi-venue estate.
     * When set, VenueDetailTemplate renders an EstateCluster block showing
     * sibling venues. Value matches an estateSlug from the confirmed
     * multi-venue estate list (see PR-7 spec).
     */
    estateSlug: z.string().optional(),
    estateLabel: z.string().optional(),
    /**
     * Editorial tier — drives verdict block visibility and listing sort order.
     *   destination  full editorial treatment, verdict block shown
     *   recommended  listed and linked, no verdict block
     *   directory    directory-only entry, minimal page
     */
    venueTier: z.enum(['destination', 'recommended', 'directory']).default('destination'),
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
    /**
     * Editorial pick flag. Set true on venues that are surfaced as curated
     * highlights on hub pages (Plans hub stay highlights, Wine hub benchmarks).
     * Distinct from featuredPartner (commercial) — this is a purely editorial
     * signal. Hubs filter by type + editorPick to build their curated rails.
     * Editorial team can update via schema; no source-code change needed.
     */
    editorPick: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    /**
     * Free-text hours summary surfaced on the venue page (e.g.
     * "Sat–Sun 11am–5pm" or "Closed Tue–Wed"). Optional. When absent,
     * the page falls back to the "Check live status" link only.
     */
    hoursNote: z.string().optional(),
    /**
     * Optional override for the live-status link URL. When omitted the
     * page builds a Google Maps search query from the venue name and
     * address, which is generally good enough to land on the operator's
     * Google profile with current open/closed state and live hours.
     */
    liveStatusUrl: z.string().url().optional(),
    /**
     * Entity signals — 3–5 short noun phrases (2–4 words each) naming what
     * the venue is distinctively known for. Renders as a chip row below the
     * signature line (see VenueDetailTemplate.astro) and is emitted as
     * schema.org additionalProperty for entity recognition (Google) and
     * structured extraction (AI). Specific named facts, not promotional copy.
     */
    knownFor: z.array(z.string()).min(3).max(5).optional(),
    /**
     * Editorial recommendation layer — replaces thin directory-style copy.
     * whyWeGo:     One-line insider positioning statement (leads the page).
     * bestFor:     Short audience/mood tags for the Worth Knowing panel.
     * ifOnlyOneThing: Single best-bet recommendation.
     * pairWith:    Nearby or complementary venues to combine with.
     */
    whyWeGo: z.string().optional(),
    bestFor: z.array(z.string()).optional(),
    ifOnlyOneThing: z.string().optional(),
    pairWith: z.array(z.string()).optional(),
    /**
     * Worth Knowing panel — quick-scan trust layer.
     * Structured fields that surface on the venue page as a scannable
     * recommendation panel. All optional; panel renders only when at
     * least one field is present.
     */
    worthKnowing: z.object({
      bestSeason: z.string().optional(),
      timing: z.string().optional(),
      atmosphere: z.string().optional(),
      worksWellWith: z.array(z.string()).optional(),
      goodFor: z.array(z.string()).optional(),
      lessIdealFor: z.string().optional(),
    }).optional(),
    /**
     * Seasonal intelligence — optional per-season guidance blocks.
     * Rendered as a section on the venue page when present.
     * Keys: autumn | winter | spring | summer
     */
    seasonalNotes: z.object({
      autumn: z.string().optional(),
      winter: z.string().optional(),
      spring: z.string().optional(),
      summer: z.string().optional(),
    }).optional(),
    /**
     * Venue status — for closed/paused venues.
     * Omit for active venues (defaults to active).
     */
    status: z.enum(['active', 'closed', 'paused', 'seasonal', 'permanently_closed']).default('active'),
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
    /**
     * Optional link to a parent venue when the experience is venue-owned
     * (e.g. a winery tour, a restaurant garden experience). Used by
     * VenueDetailTemplate to surface owned experiences inline.
     */
    venueSlug: z.string().optional(),
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
    /**
     * Region this place belongs to. Set on all 37 place JSONs in PR-2.
     * Used by RegionDetailTemplate (PR-6) to build the places strip.
     */
    regionSlug: z.string().optional(),
    regionLabel: z.string().optional(),
    coordinates,
    /**
     * One-sentence factual lede — schema-friendly, sits above the editorial intro
     * paragraph in the rendered page. Used as the SEO meta description and the
     * Place JSON-LD `description` when present, falling back to `intro`. Format:
     * "[Place] is a [type] on the Mornington Peninsula's [geographic descriptor],
     * [distance] from Melbourne[, optional feature]."
     */
    factualLede: z.string().optional(),
    intro: z.string(),
    heroImage: imageRef,
    relatedPlaces: z.array(reference('places')).default([]),
    publishedAt: z.coerce.date(),
    tldr: z.array(z.string()).optional(),
    driveTime: z.string().optional(),
    /**
     * Editorial trip-planning fields. Surface on /explore/places/[slug] pages — the
     * place-detail template renders each conditionally so partially-filled
     * places (e.g. arthurs-seat) still render cleanly.
     *
     *   signature     one-sentence editorial tagline
     *   bestFor       short audience tags ("quiet weekends", "golf")
     *   notFor        anti-audience tags ("cheap accommodation")
     *   bestSeason    free-text season label ("late spring")
     *   worstTime     free-text avoid-this-window
     *   stayDuration  recommended length ("two nights")
     *   bestDay       sentence describing a perfect day — rendered as a timeline
     *   insiderNote   one-line editor's note, treated as pull-quote
     *   skip          one-liner of "what NOT to expect"
     */
    signature: z.string().optional(),
    bestFor: z.array(z.string()).optional(),
    notFor: z.array(z.string()).optional(),
    bestSeason: z.string().optional(),
    worstTime: z.string().optional(),
    stayDuration: z.string().optional(),
    bestDay: z.string().optional(),
    insiderNote: z.string().optional(),
    skip: z.string().optional(),
    /**
     * Editorial featured flag. Set true on places surfaced as curated
     * highlights on hub pages (Plans hub place rail). Editors update
     * the JSON; no source-code change needed.
     */
    featured: z.boolean().default(false),
    sitemapExclude: z.boolean().default(false),
  }),
});

const regions = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/regions' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    /** One-line editorial tagline. Used as SEO meta description. */
    tagline: z.string().optional(),
    /** Editorial introduction paragraph. 80 to 120 words. */
    intro: z.string(),
    heroImage: imageRef,
    /** The zone enum values that fall within this region. */
    zones: z.array(zone),
    /** Place slugs within this region. */
    places: z.array(reference('places')),
    /** Slugs of adjacent regions for cross-linking in the template footer. */
    adjacentRegions: z.array(z.string()).default([]),
    /** Geographic centroid for map rendering and JSON-LD. */
    coordinates: coordinates.optional(),
    publishedAt: z.coerce.date(),
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
      'peninsula-notes',
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
    aiSummary: z.array(z.string()).optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    sitemapExclude: z.boolean().default(false),
    /**
     * Editorial section this article belongs to. Articles tagged "plans" are
     * suppressed from the Journal index and surfaced in the Plans index instead.
     * The URL stays at /journal/[slug] until the full /explore/plans/[slug] routing
     * sprint lands; this flag is the lightweight first step.
     */
    section: z.enum(['journal', 'plans']).default('journal'),
    /**
     * Shape of the trip a plans article describes. Drives the four-group
     * editorial layout on /explore/plans/. Optional at the schema level because
     * journal-section articles don't need it; required (editorially) for
     * any article with section: plans that wants to appear in the
     * grouped "Peninsula planning guides" section.
     *
     *   one-night → focused single-overnight reset
     *   two-night → the canonical weekend shape
     *   day-trip  → no overnight, return same day
     *   seasonal  → anchored to a specific season, event, or weather window
     */
    planShape: z
      .enum(['one-night', 'two-night', 'day-trip', 'seasonal'])
      .optional(),
    /**
     * Structured dispatch payload for weekend-picker articles. When present,
     * the /whats-on/this-weekend/ template renders the picks as scannable
     * cards (hero, "at a glance" row, per-day cards, rainy-day backup) and
     * the same data feeds the weekly HTML email at ops/email/dispatch-weekly.html.
     *
     * Optional — articles without it fall back to plain markdown rendering.
     * Editors keep writing the long-form body in markdown; `dispatch` is the
     * structured layer for the scannable surface and the email.
     */
    dispatch: z
      .object({
        // One-line editor's framing of the weekend ("Mid-May gives the
        // Peninsula back to itself. One forest morning, one market Sunday.")
        editorLine: z.string(),
        // Weather hint shown in the top strip. Free text so editors can
        // write "Cool, dry, autumn light" or "Rain Saturday afternoon".
        weather: z.string().optional(),
        // The marquee booking — the one thing to lock in.
        lead: z.object({
          title: z.string(),
          when: z.string(),                 // "Saturday 16 May, 11am–1:30pm"
          where: z.string(),                // "Red Hill & Main Ridge forests"
          price: z.string().optional(),     // "$85 per person"
          who: z.string().optional(),       // "Capped at 15"
          summary: z.string(),
          bookingLabel: z.string().optional(), // "Book via The Kitchen"
          bookingUrl: z.string().url().optional(),
          eventRef: z.string().optional(),  // matching events/[slug] for venue link
        }),
        // Saturday + Sunday picks if present.
        saturday: z.object({
          title: z.string(),
          when: z.string(),
          where: z.string(),
          price: z.string().optional(),
          summary: z.string(),
          bookingLabel: z.string().optional(),
          bookingUrl: z.string().url().optional(),
          eventRef: z.string().optional(),
        }).optional(),
        sunday: z.object({
          title: z.string(),
          when: z.string(),
          where: z.string(),
          price: z.string().optional(),
          summary: z.string(),
          bookingLabel: z.string().optional(),
          bookingUrl: z.string().url().optional(),
          eventRef: z.string().optional(),
        }).optional(),
        // The indoor / weather-changes backup.
        rainyDay: z.object({
          title: z.string(),
          when: z.string(),
          where: z.string(),
          price: z.string().optional(),
          summary: z.string(),
          bookingLabel: z.string().optional(),
          bookingUrl: z.string().url().optional(),
          eventRef: z.string().optional(),
        }).optional(),
        // One-line close ("Don't add more to either day. Let the Peninsula's
        // own pace do the work.")
        weekendShape: z.string().optional(),
      })
      .optional(),
  }),
});

// /explore/plans/ taxonomy — 7 axes from peninsula_insider_escape_v1 pack.
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

    // 7-axis taxonomy from /explore/plans/ pack. Optional during the migration window
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

// ─── Events ────────────────────────────────────────────────────────────────
//
// Schema is split into three concerns by ownership:
//   1. Identity + machine-imported facts (overwritten by import script)
//   2. Derived fields (recomputed by cron from machine fields)
//   3. Editorial overlay (hand-written, preserved across re-imports)
//
// The import-events config (scripts/import-events.config.ts) names each
// field's owner so the import script never overwrites editorial work.
//
// All new fields are optional so the existing 16 hand-curated events keep
// validating without modification.
//
const events = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/events' }),
  schema: z.object({
    // ─── Identity ──────────────────────────────────────────────────────────
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    eventId: z.string().optional(), // e.g. MP-EVT-0001, for spreadsheet sync

    // ─── When ──────────────────────────────────────────────────────────────
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    startTime: z.string().optional(), // "11:00"
    endTime: z.string().optional(),
    season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
    month: z.string().optional(), // "May", "June" etc.

    // ─── Where ─────────────────────────────────────────────────────────────
    venue: reference('venues').optional(),
    venueName: z.string().optional(),
    place: reference('places').optional(),
    venueRegion: z.string().optional(),
    suburb: z.string().optional(),
    streetAddress: z.string().optional(),
    coordinates: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
    indoorOutdoor: z.string().optional(),

    // ─── Money ─────────────────────────────────────────────────────────────
    bookingUrl: z.string().url().optional(),
    ticketingUrl: z.string().url().optional(),
    officialEventUrl: z.string().optional(), // may have multi-URL "|" separators
    bookingRequired: z.string().optional(),
    freePaid: z.string().optional(),
    priceRange: z.string().optional(),
    priceTier: z
      .enum(['free', 'under-50', '50-150', 'over-150', 'unknown'])
      .optional(),

    // ─── Categorisation ────────────────────────────────────────────────────
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
    subcategory: z.string().optional(),
    recurrence: z
      .enum(['one-off', 'weekly', 'monthly', 'annual', 'seasonal', 'ongoing'])
      .default('one-off'),
    recurrenceNote: z.string().optional(),

    // ─── Audience ──────────────────────────────────────────────────────────
    suitableFor: z.string().optional(),
    audienceTags: z
      .array(
        z.enum([
          'couples',
          'families',
          'solo',
          'groups',
          'first-timers',
          'locals',
          'cultural-visitors',
          'foodies',
          'all-ages',
          'adults-only',
          'art-lovers',
          'music-fans',
        ])
      )
      .default([]),
    familyFriendly: z.boolean().optional(),
    petFriendly: z.boolean().optional(),
    accessibilityNotes: z.string().optional(),

    // ─── Weather ───────────────────────────────────────────────────────────
    weather: z
      .enum(['all-weather', 'sunny-only', 'rainy-day-rescue', 'weather-proof', 'mixed'])
      .default('mixed'),
    weatherDependency: z.string().optional(),
    weatherShape: z
      .enum(['all-weather', 'wet-friendly', 'fair-weather-only', 'unknown'])
      .optional(),

    // ─── Organiser ─────────────────────────────────────────────────────────
    organiser: z
      .object({
        name: z.string().optional(),
        website: z.string().optional(),
        contact: z.string().optional(),
        instagram: z.string().optional(),
        facebook: z.string().optional(),
      })
      .optional(),

    // ─── Sources & verification ────────────────────────────────────────────
    primarySourceUrl: z.string().optional(),
    secondarySourceUrl: z.string().optional(),
    verificationStatus: z.string().optional(),
    lastCheckedDate: z.coerce.date().optional(),
    visitorAppealScore: z.number().min(0).max(5).optional(),
    editorialPriority: z.number().min(0).max(5).optional(),

    // ─── Cross-link source data (raw text, drives derived fields) ─────────
    nearbyAttractions: z.string().optional(),
    suggestedItineraryPairing: z.string().optional(),
    nearestVenues: z.array(reference('venues')).default([]),

    // ─── Derived occurrence fields (cron-recomputed for recurring) ────────
    nextOccurrence: z.coerce.date().optional(),

    // ─── Editorial overlay (human-written, never overwritten) ─────────────
    worthTheDrive: z.boolean().default(false),
    firstTimer: z.boolean().default(false),
    skipThis: z.boolean().default(false),
    skipReason: z.string().optional(),
    skipInstead: z.string().optional(),
    editorVerdict: z.string().optional(),
    whyWeCare: z.string().optional(),
    standoutOfMonth: z.boolean().default(false),
    pairingProse: z.string().optional(),
    editorVisited: z.boolean().default(false),
    featuredInDispatch: z
      .object({
        issue: z.string(),
        note: z.string().optional(),
      })
      .optional(),
    relatedArticles: z.array(reference('articles')).default([]),
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

    // ─── Internal (never rendered to the public surface) ──────────────────
    internalNotes: z.string().optional(),
    manualFollowUpRequired: z.boolean().default(false),

    // ─── Lifecycle ─────────────────────────────────────────────────────────
    status: z
      .enum(['draft', 'review', 'scheduled', 'published', 'expired', 'past', 'archived'])
      .default('published'),
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

// Quick Note — daily-cadence editorial briefs.
// Three time horizons rendered on /quick-note/:
//   "now"   - last 6h
//   "today" - last 24h
//   "week"  - last 7d (then archived from the live page)
// One Markdown file per brief, src/content/quick-notes/<slug>.md.
const quickNotes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/quick-notes' }),
  schema: z.object({
    headline: z.string().max(140),
    dek: z.string().max(320).optional(),
    section: z.enum([
      'eat', 'stay', 'wine', 'explore', 'spa', 'golf',
      'whats-on', 'weather', 'note',
    ]),
    tag: z.enum([
      'opening-window',  // booking opens / window available
      'menu-change',     // restaurant menu / cellar door release
      'closure',         // venue / track / beach closure
      'event',           // dated event in the next ~2 weeks
      'weather',         // tide / sunset / fire / rainfall window
      'editor-note',     // editorial musing, no external trigger
      'pricing',         // price change worth flagging
      'safety',          // urgent: fire, beach, swim warning
    ]),
    publishedAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
    verifiedAt: z.coerce.date().optional(),
    verifiedBy: z.string().optional(),
    verdict: z.string().max(140).optional(),  // pull-quote-style verdict
    sources: z.array(z.object({
      kind: z.enum(['venue-site', 'phone', 'email', 'visit', 'press', 'social', 'gov', 'partner']),
      url: z.string().url().optional(),
      note: z.string().optional(),
      checkedAt: z.coerce.date().optional(),
    })).default([]),
    relatedVenue: z.string().optional(),
    relatedArticle: z.string().optional(),
    image: imageRef.optional(),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
  }),
});

// Editorial framing blocks — hub intros, best-of framing, homepage cover copy.
// These are the editorial sentences that historically lived hard-coded inside
// .astro pages and were therefore invisible to the concierge corpus. Migrating
// them here makes them queryable. Pages can opt to render them by importing
// from this collection (see lib/editorial.ts), or keep their hard-coded copy
// during the migration window — either way the concierge sees them.
const editorial_blocks = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/editorial_blocks' }),
  schema: z.object({
    title: z.string(),
    kind: z
      .enum(['hub_intro', 'best_of_intro', 'homepage_cover', 'hub_faq', 'town_intro', 'category_intro'])
      .default('hub_intro'),
    section: z.string().optional(), // e.g. "Eat & Drink"
    region: z.string().optional(),   // e.g. "red-hill"
    place: z.string().optional(),
    pageHref: z.string().optional(), // canonical page this framing belongs to
    publishedAt: z.coerce.date(),
    lastVerified: z.coerce.date().optional(),
    status: z.enum(['draft', 'published']).default('published'),
  }),
});

/**
 * The Insider's 30 (Phase 6 WS6C). Annual editor-selected ranked list
 * of 30 venues across the Peninsula. One JSON file per year — the
 * file's `year` field is canonical, the slug (`2026`, `2027`, etc.)
 * is purely the route key. Each entry holds an ordered array of
 * exactly 30 ranked picks; renderer enforces the cap.
 */
const insidersThirty = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/insiders-thirty' }),
  schema: z.object({
    year: z.number().int().min(2026).max(2100),
    /** When the list was published. Used for archive sorting. */
    publishedAt: z.coerce.date(),
    /** Editor's framing for the year — drives the landing dek. */
    editorialFraming: z.string(),
    /** Optional editor's letter (markdown allowed). */
    editorsLetter: z.string().optional(),
    /** Hero image for the year's microsite cover. */
    heroImage: imageRef.optional(),
    /**
     * Ranked picks. Order = ranking. Each pick references either a
     * venue, an experience, or a place; exactly one should be set.
     * Unknown references are dropped silently at render time.
     */
    picks: z.array(z.object({
      rank: z.number().int().min(1).max(30),
      venue: reference('venues').optional(),
      experience: reference('experiences').optional(),
      place: reference('places').optional(),
      /** Editor's blurb for this rank — single sentence per the design. */
      blurb: z.string().min(20).max(400),
      /** Optional category tag for filtering on the microsite. */
      category: z.enum([
        'eat', 'wine', 'stay', 'walk', 'beach',
        'experience', 'wellness', 'place', 'event', 'producer',
      ]).optional(),
    })).max(30),
    sitemapExclude: z.boolean().default(false),
  }),
});

/**
 * Reader-submitted local secrets (Phase 4 WS4D). Approved submissions
 * are exported from the Supabase `pi.submissions` table to markdown
 * files in src/content/local-secrets/ by next/scripts/export-local-secrets.mjs.
 * Each file ships at build time as a static page under
 * /journal/local-secrets/<slug>/.
 */
const localSecrets = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/local-secrets' }),
  schema: z.object({
    title: z.string(),
    contributor: z.object({
      name: z.string(),
      handle: z.string().optional(),
    }),
    placeName: z.string().optional(),
    category: z.enum([
      'food', 'drink', 'wine', 'beach', 'walk', 'view',
      'experience', 'event', 'shop', 'service', 'wildlife', 'other',
    ]),
    submittedAt: z.coerce.date(),
    publishedAt: z.coerce.date(),
    editorNote: z.string().optional(),
    heroImage: imageRef.optional(),
    relatedVenues: z.array(reference('venues')).default([]),
    relatedPlaces: z.array(reference('places')).default([]),
    sitemapExclude: z.boolean().default(false),
  }),
});

/**
 * weekendPicks — the canonical editorial shortlist for an upcoming
 * weekend.
 *
 * One JSON file per weekend at `src/content/weekend-picks/YYYY-MM-DD.json`
 * (filename = the Saturday of that weekend in ISO date form). The What's
 * On page renders the entry whose `weekendStart` matches the current
 * upcoming weekend; if no entry exists, the page falls back to events
 * tagged with the `weekend-pick` lens.
 *
 * Per the editorial brief, the Picks list also powers newsletter, social
 * amplification, and AI retrieval — so this is the structured editorial
 * source of truth, not a UI convenience.
 */
const weekendPicks = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/weekend-picks' }),
  schema: z.object({
    weekendStart: z.coerce.date(),       // Saturday of the weekend, midnight local
    weekendLabel: z.string(),             // human-readable, e.g. "16-17 May 2026"
    editorIntro: z.string().optional(),   // optional one-paragraph intro
    picks: z.array(
      z.object({
        eventSlug: z.string(),            // matches an event ID/slug
        editorVerdict: z.string(),        // required for picks — keeps the bar high
        position: z.number().int(),       // 1-based render order, lower = higher
        featured: z.boolean().default(false),
      })
    ).min(1).max(10),
  }),
});

/**
 * signatureEvents — evergreen Signature Event landing pages.
 *
 * These are NOT dated event occurrences (those live in the `events`
 * collection). A Signature Event is one of the Peninsula's anchor
 * annual moments (Portsea Polo, Sorrento Writers Festival, Winter
 * Wine Weekend, etc.) and gets its own editorial page that lives
 * across years. The dated `events` entries link back to these
 * evergreen anchors when an occurrence runs.
 */
const signatureEvents = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/signature-events' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    tagline: z.string().optional(),
    summary: z.string(),
    /**
     * Editorial sort order on the What's On hub mini-grid. Lower numbers
     * surface first. Optional — entries without a value fall to the end,
     * then sort alphabetically by name. Moved out of the page .astro
     * (review #9) so editors can re-rank without touching code.
     */
    hubOrder: z.number().int().positive().optional(),
    monthAnchor: z.string(),
    season: season,
    location: z.string(),
    placeRef: reference('places').optional(),
    recurrence: z.string(),
    firstHeld: z.string().optional(),
    officialUrl: z.string().url().optional(),
    heroImage: z.string(),
    heroImageAlt: z.string(),
    heroImageCredit: z.string().optional(),
    whatItIs: z.string(),
    whoItsFor: z.string(),
    peninsulaCalendarContext: z.string(),
    gettingThere: z.string(),
    relatedPlaces: z.array(reference('places')).default([]),
    relatedPlans: z.array(z.string()).default([]),
    verificationStatus: z.enum(['verified', 'tentative', 'stub']).default('stub'),
    lastReviewed: z.coerce.date(),
    editorialNotes: z.string().optional(),
  }),
});

export const collections = {
  venues,
  experiences,
  places,
  regions,
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
  quickNotes,
  editorial_blocks,
  localSecrets,
  insidersThirty,
  'weekend-picks': weekendPicks,
  'signature-events': signatureEvents,
};
