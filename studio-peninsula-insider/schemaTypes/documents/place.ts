import {defineType, defineField} from 'sanity'

/**
 * Place — a town, village, ridge, beach, cape, or zone on the Peninsula.
 * Mirrors the Astro content-collection schema in next/src/content.config.ts.
 *
 * Places are the lattice for everything else: venues, experiences, events,
 * itineraries all reference a `place`. Editorial trip-planning fields
 * (signature, bestFor, bestDay, etc.) drive the PlaceDetailTemplate hero
 * and "is this place for you?" panels.
 */
export const place = defineType({
  name: 'place',
  title: 'Place',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Editorial', default: true},
    {name: 'planning', title: 'Trip planning'},
    {name: 'location', title: 'Location'},
    {name: 'admin', title: 'Admin'},
  ],
  fields: [
    // ── Editorial ────────────────────────────────────────────────────────
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'editorial',
      validation: (Rule) => Rule.required(),
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
      name: 'factualLede',
      title: 'Factual lede',
      type: 'text',
      rows: 3,
      group: 'editorial',
      description:
        'One-sentence factual lede. Sits above the editorial intro and is used as the SEO meta description.',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 5,
      group: 'editorial',
      description: 'Editorial intro paragraph that opens the place page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'signature',
      title: 'Signature',
      type: 'text',
      rows: 2,
      group: 'editorial',
      description: 'One-sentence editorial tagline. Surfaces as a pull-quote.',
    }),
    defineField({
      name: 'insiderNote',
      title: "Insider's note",
      type: 'text',
      rows: 2,
      group: 'editorial',
      description: 'Editor pull-quote shown alongside the at-a-glance card.',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'imageRef',
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'editorial',
      initialValue: false,
      description: 'Surface this place on curated hub rails (Plans hub, etc).',
    }),

    // ── Trip planning ────────────────────────────────────────────────────
    defineField({
      name: 'tldr',
      title: 'TL;DR',
      type: 'array',
      of: [{type: 'string'}],
      group: 'planning',
      description:
        'Numbered editorial summary surfaced on the place page. Each item is one sentence.',
    }),
    defineField({
      name: 'bestFor',
      title: 'Best for',
      type: 'array',
      of: [{type: 'string'}],
      group: 'planning',
      description: 'Audience tags, e.g. "quiet weekends", "first-timers".',
    }),
    defineField({
      name: 'notFor',
      title: 'Not for',
      type: 'array',
      of: [{type: 'string'}],
      group: 'planning',
      description: 'Anti-audience tags, e.g. "cheap accommodation".',
    }),
    defineField({
      name: 'bestSeason',
      title: 'Best season',
      type: 'string',
      group: 'planning',
      description: 'Free-text season label, e.g. "late spring".',
    }),
    defineField({
      name: 'worstTime',
      title: 'Worst time',
      type: 'string',
      group: 'planning',
      description: 'Free-text avoid-this-window.',
    }),
    defineField({
      name: 'stayDuration',
      title: 'Recommended stay duration',
      type: 'string',
      group: 'planning',
      description: 'e.g. "two nights".',
    }),
    defineField({
      name: 'bestDay',
      title: 'A perfect day',
      type: 'text',
      rows: 6,
      group: 'planning',
      description: 'Sentence(s) describing a perfect day — rendered as a timeline.',
    }),
    defineField({
      name: 'skip',
      title: 'What to skip',
      type: 'text',
      rows: 3,
      group: 'planning',
      description: 'One-liner of what NOT to expect.',
    }),
    defineField({
      name: 'driveTime',
      title: 'Drive time',
      type: 'string',
      group: 'planning',
      description: 'Free-text, e.g. "75 min from Melbourne CBD".',
    }),

    // ── Location ─────────────────────────────────────────────────────────
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      group: 'location',
      options: {
        list: ['town', 'village', 'zone', 'ridge', 'beach', 'cape'].map((v) => ({
          title: v,
          value: v,
        })),
      },
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
      name: 'relatedPlaces',
      title: 'Related places',
      type: 'array',
      group: 'location',
      of: [{type: 'reference', to: [{type: 'place'}]}],
    }),

    // ── Admin ────────────────────────────────────────────────────────────
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
    select: {title: 'name', subtitle: 'kind', media: 'heroImage'},
  },
  orderings: [{title: 'Name A→Z', name: 'nameAsc', by: [{field: 'name', direction: 'asc'}]}],
})
