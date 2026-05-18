import {defineType, defineField} from 'sanity'

export const itinerary = defineType({
  name: 'itinerary',
  title: 'Itinerary',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Editorial', default: true},
    {name: 'taxonomy', title: 'Taxonomy'},
    {name: 'anchor', title: 'Anchor stay & places'},
    {name: 'anatomy', title: 'Anatomy'},
    {name: 'stops', title: 'Stops'},
    {name: 'faq', title: 'FAQ'},
    {name: 'admin', title: 'Admin'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'editorial',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'dek',
      title: 'Dek',
      type: 'text',
      rows: 2,
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'editorNote',
      title: 'Editor note',
      type: 'text',
      rows: 6,
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'imageRef',
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'editorialFrame',
      title: 'Editorial frame',
      type: 'text',
      rows: 3,
      group: 'editorial',
    }),
    defineField({
      name: 'skipThese',
      title: 'What to skip',
      type: 'text',
      rows: 4,
      group: 'editorial',
      description: '60–100 word panel of what NOT to expect on this itinerary.',
    }),

    // Taxonomy
    defineField({
      name: 'audience',
      title: 'Audience',
      type: 'string',
      group: 'taxonomy',
      options: {list: ['couple', 'family', 'friends', 'solo', 'locals'].map((v) => ({title: v, value: v}))},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mood',
      title: 'Mood',
      type: 'string',
      group: 'taxonomy',
      options: {
        list: ['slow', 'indulgent', 'wellness', 'adventure', 'food-wine', 'mixed', 'quick'].map(
          (v) => ({title: v, value: v}),
        ),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lengthNights',
      title: 'Length (nights)',
      type: 'number',
      group: 'taxonomy',
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: 'duration',
      title: 'Duration (escape pack)',
      type: 'string',
      group: 'taxonomy',
    }),
    defineField({
      name: 'theme',
      title: 'Theme (max 2)',
      type: 'array',
      of: [{type: 'string'}],
      validation: (Rule) => Rule.max(2),
      group: 'taxonomy',
    }),
    defineField({name: 'occasion', title: 'Occasion', type: 'string', group: 'taxonomy'}),
    defineField({name: 'origin', title: 'Origin', type: 'string', group: 'taxonomy'}),
    defineField({name: 'budget', title: 'Budget', type: 'string', group: 'taxonomy'}),
    defineField({name: 'season', title: 'Season', type: 'string', group: 'taxonomy'}),

    // Anchor
    defineField({
      name: 'anchorStay',
      title: 'Anchor stay',
      type: 'reference',
      to: [{type: 'venue'}],
      group: 'anchor',
    }),
    defineField({name: 'anchorStayBlurb', title: 'Anchor stay blurb', type: 'text', rows: 3, group: 'anchor'}),
    defineField({
      name: 'altStays',
      title: 'Alternative stays',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'venue'}]}],
      group: 'anchor',
    }),
    defineField({
      name: 'anchorTown',
      title: 'Anchor town',
      type: 'reference',
      to: [{type: 'place'}],
      group: 'anchor',
    }),
    defineField({
      name: 'baseTowns',
      title: 'Base towns',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'place'}]}],
      group: 'anchor',
    }),

    // Anatomy
    defineField({
      name: 'drivingDistanceKm',
      title: 'Total driving distance (km)',
      type: 'number',
      group: 'anatomy',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'walkingIntensity',
      title: 'Walking intensity',
      type: 'string',
      group: 'anatomy',
      options: {list: ['low', 'moderate', 'high'].map((v) => ({title: v, value: v}))},
    }),
    defineField({
      name: 'budgetRangeAud',
      title: 'Budget range (AUD)',
      type: 'string',
      group: 'anatomy',
      description: 'e.g. "$850–$1,200 per couple".',
    }),
    defineField({
      name: 'costBreakdown',
      title: 'Cost breakdown',
      type: 'object',
      group: 'anatomy',
      fields: [
        defineField({name: 'stay', title: 'Stay', type: 'string'}),
        defineField({name: 'food', title: 'Food', type: 'string'}),
        defineField({name: 'drink', title: 'Drink', type: 'string'}),
        defineField({name: 'activities', title: 'Activities', type: 'string'}),
        defineField({name: 'fuel', title: 'Fuel', type: 'string'}),
      ],
    }),
    defineField({
      name: 'bookingChecklist',
      title: 'Booking checklist',
      type: 'array',
      group: 'anatomy',
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'item', title: 'Item', type: 'string'}),
            defineField({
              name: 'priority',
              title: 'Priority',
              type: 'string',
              options: {
                list: ['essential', 'recommended', 'optional'].map((v) => ({title: v, value: v})),
              },
              initialValue: 'recommended',
            }),
            defineField({
              name: 'windowWeeksAhead',
              title: 'Window weeks ahead',
              type: 'number',
              validation: (Rule) => Rule.min(0),
            }),
          ],
        },
      ],
    }),
    defineField({
      name: 'variations',
      title: 'Variations',
      type: 'array',
      group: 'anatomy',
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'string', validation: (R) => R.required()}),
            defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
            defineField({name: 'relatedItinerarySlug', title: 'Related itinerary (slug)', type: 'string'}),
          ],
          preview: {select: {title: 'label'}},
        },
      ],
    }),
    defineField({
      name: 'totalDriveMinutes',
      title: 'Total drive minutes',
      type: 'number',
      group: 'anatomy',
      validation: (Rule) => Rule.min(0),
    }),

    // Stops
    defineField({
      name: 'stops',
      title: 'Stops',
      type: 'array',
      group: 'stops',
      of: [{type: 'itineraryStop'}],
      validation: (Rule) => Rule.required().min(1),
    }),

    // FAQ
    defineField({
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      group: 'faq',
      of: [
        {
          type: 'object',
          fields: [
            defineField({name: 'question', title: 'Question', type: 'string', validation: (R) => R.required()}),
            defineField({name: 'answer', title: 'Answer', type: 'text', rows: 3, validation: (R) => R.required()}),
          ],
          preview: {select: {title: 'question'}},
        },
      ],
    }),

    // Admin
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'admin',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'lastVerified', title: 'Last verified', type: 'date', group: 'admin'}),
    defineField({
      name: 'sitemapExclude',
      title: 'Exclude from sitemap',
      type: 'boolean',
      group: 'admin',
      initialValue: false,
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'dek', media: 'heroImage'},
  },
})
