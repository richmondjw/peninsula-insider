import {defineType, defineField} from 'sanity'

const formatOptions = [
  'editors-letter','long-lunch-list','cellar-door-dispatch','stay-notes',
  'slow-peninsula','insider-edit','interview','investigation','service',
  'weekend-picker','hub-guide','trail-guide','venue-guide',
]

const statusOptions = ['draft', 'review', 'scheduled', 'published']

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Editorial', default: true},
    {name: 'body', title: 'Body'},
    {name: 'related', title: 'Related'},
    {name: 'seo', title: 'SEO & FAQ'},
    {name: 'admin', title: 'Admin'},
  ],
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', group: 'editorial', validation: (R) => R.required()}),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug', group: 'editorial',
      options: {source: 'title', maxLength: 96}, validation: (R) => R.required(),
    }),
    defineField({name: 'dek', title: 'Dek', type: 'text', rows: 3, group: 'editorial', validation: (R) => R.required()}),
    defineField({
      name: 'author', title: 'Author', type: 'reference', to: [{type: 'author'}], group: 'editorial',
      validation: (R) => R.required(),
    }),
    defineField({name: 'houseByline', title: 'House byline', type: 'boolean', group: 'editorial', initialValue: false}),
    defineField({name: 'heroImage', title: 'Hero image', type: 'imageRef', group: 'editorial', validation: (R) => R.required()}),
    defineField({
      name: 'format', title: 'Format', type: 'string', group: 'editorial',
      options: {list: formatOptions.map((v) => ({title: v, value: v}))},
      validation: (R) => R.required(),
    }),
    defineField({name: 'tags', title: 'Tags', type: 'array', of: [{type: 'string'}], group: 'editorial'}),
    defineField({name: 'featured', title: 'Featured', type: 'boolean', group: 'editorial', initialValue: false}),
    defineField({name: 'readingTimeMinutes', title: 'Reading time (minutes)', type: 'number', group: 'editorial', validation: (R) => R.positive()}),

    // ── Body ─────────────────────────────────────────────────────────────
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'body',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Number', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
            ],
            annotations: [
              {
                name: 'link', title: 'Link', type: 'object',
                fields: [defineField({name: 'href', title: 'URL', type: 'string'})],
              },
            ],
          },
        },
        {type: 'alertBlock'},
        {type: 'practicalCallout'},
        {type: 'cellarDoorList'},
        {type: 'dogPolicyTable'},
        {type: 'subregionGrid'},
        {type: 'varietyGuide'},
      ],
    }),
    defineField({
      name: 'aiSummary',
      title: 'AI summary (bullets)',
      type: 'array',
      of: [{type: 'string'}],
      group: 'body',
      description: '"Start here" bullets surfaced above the article body.',
    }),

    // ── Related ──────────────────────────────────────────────────────────
    defineField({
      name: 'relatedVenues', title: 'Related venues', type: 'array',
      of: [{type: 'reference', to: [{type: 'venue'}], weak: true}], group: 'related',
    }),
    defineField({
      name: 'relatedExperiences', title: 'Related experiences', type: 'array',
      of: [{type: 'reference', to: [{type: 'experience'}], weak: true}], group: 'related',
    }),
    defineField({
      name: 'relatedPlaces', title: 'Related places', type: 'array',
      of: [{type: 'reference', to: [{type: 'place'}], weak: true}], group: 'related',
    }),
    defineField({
      name: 'relatedArticles', title: 'Related articles', type: 'array',
      of: [{type: 'reference', to: [{type: 'article'}], weak: true}], group: 'related',
    }),
    defineField({
      name: 'relatedItineraries', title: 'Related itineraries', type: 'array',
      of: [{type: 'reference', to: [{type: 'itinerary'}], weak: true}], group: 'related',
    }),
    defineField({
      name: 'clusterLinks', title: 'Cluster links', type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'label', title: 'Label', type: 'string'}),
          defineField({name: 'href', title: 'URL', type: 'string'}),
        ],
      }],
      group: 'related',
    }),

    // ── SEO + FAQ ────────────────────────────────────────────────────────
    defineField({
      name: 'faq', title: 'FAQ', type: 'array', group: 'seo',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'question', title: 'Question', type: 'string', validation: (R) => R.required()}),
          defineField({name: 'answer', title: 'Answer', type: 'text', rows: 3, validation: (R) => R.required()}),
        ],
        preview: {select: {title: 'question'}},
      }],
    }),

    // ── Admin ────────────────────────────────────────────────────────────
    defineField({
      name: 'status', title: 'Status', type: 'string', group: 'admin',
      options: {list: statusOptions.map((v) => ({title: v, value: v}))},
      initialValue: 'draft', validation: (R) => R.required(),
    }),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime', group: 'admin', validation: (R) => R.required()}),
    defineField({name: 'updatedAt', title: 'Updated at', type: 'datetime', group: 'admin'}),
    defineField({name: 'lastVerified', title: 'Last verified', type: 'date', group: 'admin'}),
    defineField({name: 'sitemapExclude', title: 'Exclude from sitemap', type: 'boolean', group: 'admin', initialValue: false}),
  ],
  preview: {select: {title: 'title', subtitle: 'format', media: 'heroImage'}},
  orderings: [
    {title: 'Published desc', name: 'pubDesc', by: [{field: 'publishedAt', direction: 'desc'}]},
    {title: 'Title A→Z', name: 'titleAsc', by: [{field: 'title', direction: 'asc'}]},
  ],
})
