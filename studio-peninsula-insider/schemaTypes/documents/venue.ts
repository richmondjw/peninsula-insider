import {defineType, defineField} from 'sanity'

/**
 * Venue — a single editorial entry for a restaurant, winery, accommodation,
 * brewery, etc. Mirrors the Astro content-collection schema in
 * next/src/content.config.ts so the importer can map fields one-to-one.
 *
 * Field groups keep the editing form readable: editors see the essentials
 * (name, signature, place) first; tags + authority + dog details + admin
 * metadata tuck into their own tabs.
 */
export const venue = defineType({
  name: 'venue',
  title: 'Venue',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Editorial', default: true},
    {name: 'location', title: 'Location'},
    {name: 'commerce', title: 'Booking & price'},
    {name: 'authority', title: 'Authority'},
    {name: 'dog', title: 'Dog friendly'},
    {name: 'admin', title: 'Admin'},
  ],
  fields: [
    // ── Editorial ────────────────────────────────────────────────────────
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'editorial',
      validation: (Rule) => Rule.required().min(2).max(120),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'editorial',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      group: 'editorial',
      options: {
        list: [
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
        ].map((v) => ({title: v, value: v})),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'signature',
      title: 'Signature',
      type: 'text',
      group: 'editorial',
      rows: 2,
      description: 'One-sentence editorial pull-quote.',
      validation: (Rule) => Rule.required().max(400),
    }),
    defineField({
      name: 'editorNote',
      title: 'Editor note',
      type: 'array',
      of: [{type: 'block'}],
      group: 'editorial',
      description: 'The main editorial body. Supports headings, bold, italic, links.',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'imageRef',
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      group: 'editorial',
      of: [{type: 'imageRef'}],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'tags',
      group: 'editorial',
    }),
    defineField({
      name: 'editorPick',
      title: 'Editor pick',
      type: 'boolean',
      group: 'editorial',
      initialValue: false,
      description:
        'Surface this venue as a curated highlight on hub pages (Plans hub, Wine hub benchmarks).',
    }),

    // ── Location ─────────────────────────────────────────────────────────
    defineField({
      name: 'place',
      title: 'Place',
      type: 'reference',
      group: 'location',
      to: [{type: 'place'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'zone',
      title: 'Zone',
      type: 'string',
      group: 'location',
      options: {
        list: [
          'bayside',
          'hinterland',
          'red-hill-plateau',
          'ocean-coast',
          'back-beaches',
          'tip',
        ].map((v) => ({title: v, value: v})),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coordinates',
      title: 'Coordinates',
      type: 'coordinates',
      group: 'location',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'string',
      group: 'location',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
      group: 'location',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      group: 'location',
    }),
    defineField({
      name: 'hoursNote',
      title: 'Hours note',
      type: 'string',
      group: 'location',
      description: 'Free-text hours summary, e.g. "Sat–Sun 11am–5pm".',
    }),
    defineField({
      name: 'liveStatusUrl',
      title: 'Live status URL override',
      type: 'url',
      group: 'location',
      description:
        'Optional. When omitted, the page builds a Google Maps search from the venue name + address.',
    }),

    // ── Booking & price ──────────────────────────────────────────────────
    defineField({
      name: 'priceBand',
      title: 'Price band',
      type: 'string',
      group: 'commerce',
      options: {list: ['$', '$$', '$$$', '$$$$'].map((v) => ({title: v, value: v}))},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bookingUrl',
      title: 'Booking URL',
      type: 'url',
      group: 'commerce',
    }),
    defineField({
      name: 'bookingProvider',
      title: 'Booking provider',
      type: 'string',
      group: 'commerce',
      options: {
        list: [
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
        ].map((v) => ({title: v, value: v})),
      },
    }),
    defineField({
      name: 'affiliateNote',
      title: 'Affiliate note',
      type: 'string',
      group: 'commerce',
    }),
    defineField({
      name: 'featuredPartner',
      title: 'Featured partner',
      type: 'boolean',
      group: 'commerce',
      initialValue: false,
      description: 'Commercial flag — distinct from editorial pick.',
    }),

    // ── Authority ────────────────────────────────────────────────────────
    defineField({
      name: 'authority',
      title: 'Authority',
      type: 'authority',
      group: 'authority',
    }),

    // ── Dog friendly ─────────────────────────────────────────────────────
    defineField({
      name: 'dogFriendly',
      title: 'Dog friendly',
      type: 'boolean',
      group: 'dog',
      initialValue: false,
    }),
    defineField({
      name: 'dogFriendlyNotes',
      title: 'Dog friendly notes',
      type: 'text',
      rows: 2,
      group: 'dog',
      hidden: ({document}) => !document?.dogFriendly,
    }),
    defineField({
      name: 'dogsAllowedOutdoorsOnly',
      title: 'Dogs allowed outdoors only',
      type: 'boolean',
      group: 'dog',
      hidden: ({document}) => !document?.dogFriendly,
    }),
    defineField({
      name: 'offLeashNearby',
      title: 'Off-leash area nearby',
      type: 'boolean',
      group: 'dog',
      hidden: ({document}) => !document?.dogFriendly,
    }),
    defineField({
      name: 'waterAccessNearby',
      title: 'Water access nearby',
      type: 'boolean',
      group: 'dog',
      hidden: ({document}) => !document?.dogFriendly,
    }),
    defineField({
      name: 'dogAmenities',
      title: 'Dog amenities',
      type: 'array',
      of: [{type: 'string'}],
      group: 'dog',
      options: {
        list: ['bowl', 'outdoor-seating', 'enclosed-area', 'treats', 'dog-menu'].map((v) => ({
          title: v,
          value: v,
        })),
      },
      hidden: ({document}) => !document?.dogFriendly,
    }),
    defineField({
      name: 'rainyDayDogSuitability',
      title: 'Rainy day suitability (dogs)',
      type: 'string',
      group: 'dog',
      options: {list: ['low', 'medium', 'high'].map((v) => ({title: v, value: v}))},
      hidden: ({document}) => !document?.dogFriendly,
    }),

    // ── Admin ────────────────────────────────────────────────────────────
    defineField({
      name: 'lastVerified',
      title: 'Last verified',
      type: 'date',
      group: 'admin',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'admin',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sitemapExclude',
      title: 'Exclude from sitemap',
      type: 'boolean',
      group: 'admin',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'type',
      media: 'heroImage',
    },
  },
  orderings: [
    {
      title: 'Recently verified',
      name: 'lastVerifiedDesc',
      by: [{field: 'lastVerified', direction: 'desc'}],
    },
    {title: 'Name A→Z', name: 'nameAsc', by: [{field: 'name', direction: 'asc'}]},
  ],
})
