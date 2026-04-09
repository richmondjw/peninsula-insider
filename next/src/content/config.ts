import { defineCollection, reference, z } from 'astro:content';

// Peninsula Insider — Content schema
//
// This file is the typed contract for every entity in the Astro rebuild.
// The goal is simple: AI agents should be able to author content directly
// into git, with build-time validation catching drift before it reaches prod.

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
  type: 'data',
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
    heroImage: imageRef,
    gallery: z.array(imageRef).default([]),
    affiliateNote: z.string().optional(),
    featuredPartner: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
  }),
});

const experiences = defineCollection({
  type: 'data',
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
    heroImage: imageRef,
    gallery: z.array(imageRef).default([]),
    lastVerified: z.coerce.date(),
    publishedAt: z.coerce.date(),
  }),
});

const places = defineCollection({
  type: 'data',
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
  }),
});

const articles = defineCollection({
  type: 'content',
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
    ]),
    tags: z.array(z.string()).default([]),
    relatedVenues: z.array(reference('venues')).default([]),
    relatedExperiences: z.array(reference('experiences')).default([]),
    readingTimeMinutes: z.number().positive().optional(),
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'review', 'scheduled', 'published']).default('draft'),
  }),
});

const itineraries = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    dek: z.string(),
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
    stops: z.array(
      z.object({
        day: z.number().int().positive(),
        order: z.number().int().positive(),
        venue: reference('venues').optional(),
        experience: reference('experiences').optional(),
        note: z.string().optional(),
        timeOfDay: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night']),
      })
    ),
    totalDriveMinutes: z.number().nonnegative().optional(),
    heroImage: imageRef,
    editorNote: z.string(),
    publishedAt: z.coerce.date(),
  }),
});

const events = defineCollection({
  type: 'data',
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
    // Recurrence is editorial, not ical — 'one-off', 'weekly', 'monthly',
    // 'annual' or 'seasonal' is the level of detail readers actually need.
    recurrence: z
      .enum(['one-off', 'weekly', 'monthly', 'annual', 'seasonal', 'ongoing'])
      .default('one-off'),
    // Editorial differentiators — the wedge against the DMO.
    // Kids Grade: A/B/C (see peninsula-insider-events-intelligence-2026-04-09.md).
    kidsGrade: z.enum(['A', 'B', 'C', 'not-for-kids']).optional(),
    kidsGradeNote: z.string().optional(),
    // Worth The Drive From Melbourne: binary, no hedging.
    worthTheDrive: z.boolean().default(false),
    // First-time visitor filter — 'start here' events.
    firstTimer: z.boolean().default(false),
    // Weather disposition — solves the #1 Peninsula planning anxiety.
    weather: z
      .enum(['all-weather', 'sunny-only', 'rainy-day-rescue', 'weather-proof', 'mixed'])
      .default('mixed'),
    // Skip-this block (monthly): exactly one event can be the month's skip,
    // with one honest paragraph explaining why.
    skipThis: z.boolean().default(false),
    skipReason: z.string().optional(),
    // Editor verdict — the one-line opinion that nobody else in the market
    // is brave enough to write.
    editorVerdict: z.string().optional(),
    // Free-text short categories for filter chips on whats-on index.
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
  }),
});

const authors = defineCollection({
  type: 'data',
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

export const collections = {
  venues,
  experiences,
  places,
  articles,
  itineraries,
  events,
  authors,
};
