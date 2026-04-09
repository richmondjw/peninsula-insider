// Peninsula Insider — Content schema (Phase 1 scaffold)
//
// This file is the single source of truth for the shape of every atomic
// entity on Peninsula Insider. Edit carefully. Schema breaking changes
// fail the build, which is the point.
//
// The seven collections, per the roadmap (§ 4.2):
//   • venues       — every restaurant, winery, cafe, hotel, villa, etc.
//   • experiences  — wellness, walks, beaches, tours, attractions
//   • places       — zones, towns, ridgelines (Red Hill, Sorrento, Merricks)
//   • articles     — Journal long-form pieces (JSON front-matter + MD body)
//   • itineraries  — curated multi-stop trip plans
//   • events       — dated events (festivals, tastings, openings)
//   • authors      — contributor / editor profiles
//
// AI authoring contract:
// A research subagent can produce a validated entity record from
// natural language + web research in seconds. Every field below must
// therefore be (a) explicit, (b) typed, (c) documented, (d) optional
// where the information may genuinely not exist.

import { defineCollection, z } from 'astro:content';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const coordinates = z.object({
  lat: z.number(),
  lng: z.number(),
});

const imageRef = z.object({
  src: z.string(),
  alt: z.string(),
  credit: z.string(),
  license: z
    .enum([
      'original-commissioned',
      'venue-media-kit',
      'visit-victoria',
      'tmp-unsplash',
      'tmp-wikimedia',
      'tmp-pexels',
      'other-licensed',
    ])
    .default('venue-media-kit'),
  caption: z.string().optional(),
});

// The editorial tags exposed to intent-page generators and the map.
// Keep these tightly controlled — drifted tag vocab becomes content debt.
const tagBlock = z.object({
  mood: z.array(
    z.enum([
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
    ])
  ),
  season: z.array(z.enum(['spring', 'summer', 'autumn', 'winter', 'all-year'])),
  audience: z.array(
    z.enum(['couples', 'families', 'solo', 'group', 'locals', 'first-timers'])
  ),
});

const authorityBlock = z
  .object({
    hats: z.number().min(0).max(3).optional(), // Good Food Guide hats
    hallidayScore: z.number().optional(), // Halliday wine score
    awards: z.array(z.string()).optional(),
    pressMentions: z.array(z.string()).optional(),
  })
  .optional();

// ---------------------------------------------------------------------------
// venues
// ---------------------------------------------------------------------------

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
    // references the `places` collection slug
    place: z.string(),
    zone: z.enum([
      'bayside',
      'hinterland',
      'red-hill-plateau',
      'ocean-coast',
      'back-beaches',
      'tip',
    ]),
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
    signature: z.string(), // signature dish, wine, room
    editorNote: z.string(), // 2–3 paragraphs of opinion, not neutral summary
    tags: tagBlock,
    heroImage: imageRef,
    gallery: z.array(imageRef).default([]),
    affiliateNote: z.string().optional(), // editorial disclosure if applicable
    featuredPartner: z.boolean().default(false),
    lastVerified: z.date(),
    publishedAt: z.date(),
  }),
});

// ---------------------------------------------------------------------------
// experiences
// ---------------------------------------------------------------------------

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
    place: z.string(),
    zone: z.enum([
      'bayside',
      'hinterland',
      'red-hill-plateau',
      'ocean-coast',
      'back-beaches',
      'tip',
    ]),
    coordinates,
    address: z.string().optional(),
    website: z.string().url().optional(),
    bookingUrl: z.string().url().optional(),
    durationMinutes: z.number().optional(),
    difficulty: z.enum(['easy', 'moderate', 'hard']).optional(),
    seasonBest: z.array(z.enum(['spring', 'summer', 'autumn', 'winter', 'all-year'])),
    editorNote: z.string(),
    tags: tagBlock,
    heroImage: imageRef,
    gallery: z.array(imageRef).default([]),
    lastVerified: z.date(),
    publishedAt: z.date(),
  }),
});

// ---------------------------------------------------------------------------
// places
// ---------------------------------------------------------------------------

const places = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    kind: z.enum(['town', 'village', 'zone', 'ridge', 'beach', 'cape']),
    zone: z.enum([
      'bayside',
      'hinterland',
      'red-hill-plateau',
      'ocean-coast',
      'back-beaches',
      'tip',
    ]),
    coordinates,
    intro: z.string(), // 200-word editor-written intro for the place hub page
    heroImage: imageRef,
    relatedPlaces: z.array(z.string()).default([]),
    publishedAt: z.date(),
  }),
});

// ---------------------------------------------------------------------------
// articles (The Insider's Journal)
// ---------------------------------------------------------------------------

const articles = defineCollection({
  type: 'content', // markdown body + front-matter
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    dek: z.string(), // 1–2 sentence subtitle
    author: z.string(), // references the `authors` collection slug
    houseByline: z.boolean().default(false), // true = "By The Peninsula Insider"
    publishedAt: z.date(),
    updatedAt: z.date().optional(),
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
    ]),
    tags: z.array(z.string()).default([]),
    relatedVenues: z.array(z.string()).default([]),
    relatedExperiences: z.array(z.string()).default([]),
    readingTimeMinutes: z.number().optional(),
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'review', 'scheduled', 'published']).default('draft'),
  }),
});

// ---------------------------------------------------------------------------
// itineraries
// ---------------------------------------------------------------------------

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
    lengthNights: z.number(),
    stops: z.array(
      z.object({
        day: z.number(),
        order: z.number(),
        venue: z.string().optional(), // slug reference
        experience: z.string().optional(), // slug reference
        note: z.string().optional(),
        timeOfDay: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night']),
      })
    ),
    totalDriveMinutes: z.number().optional(),
    heroImage: imageRef,
    editorNote: z.string(),
    publishedAt: z.date(),
  }),
});

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

const events = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    startDate: z.date(),
    endDate: z.date().optional(),
    venue: z.string().optional(), // slug reference
    place: z.string(), // slug reference
    bookingUrl: z.string().url().optional(),
    category: z.enum([
      'food-wine',
      'market',
      'festival',
      'cellar-door',
      'community',
      'arts',
      'wellness',
    ]),
    editorNote: z.string().optional(),
    heroImage: imageRef.optional(),
    publishedAt: z.date(),
  }),
});

// ---------------------------------------------------------------------------
// authors
// ---------------------------------------------------------------------------

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
    publishedAt: z.date(),
  }),
});

// ---------------------------------------------------------------------------
// export
// ---------------------------------------------------------------------------

export const collections = {
  venues,
  experiences,
  places,
  articles,
  itineraries,
  events,
  authors,
};
