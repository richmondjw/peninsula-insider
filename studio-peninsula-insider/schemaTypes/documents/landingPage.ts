import {defineType, defineField} from 'sanity'

/**
 * Landing / guide page — the editorial pages that currently live as
 * hardcoded markup inside `.astro` files (SEO category pages, hub guides,
 * long-form guides, corporate/about pages). One document per route.
 *
 * Migration target for the ~120 standalone pages identified in the
 * 2026-05 content audit (e.g. /eat/cafes/, /wine/red-hill/,
 * /explore/hot-springs/, /guides/winter/, /about/). The `path` field is
 * the canonical key (full route path) because slugs are not unique across
 * sections. Document id convention: `landingPage-<slugified-path>`.
 *
 * Astro reads this via a fetchLandingPageFromSanity(path) adapter and
 * falls back to the existing hardcoded page if the doc doesn't exist —
 * same dual-read pattern as every other entity.
 */
const sectionOptions = [
  'eat', 'wine', 'stay', 'explore', 'tour', 'guides', 'walks',
  'journal', 'fishing', 'boating', 'weddings', 'corporate-events',
  'corporate', 'other',
]

const jsonLdOptions = [
  'WebPage', 'CollectionPage', 'FAQPage', 'Article', 'TouristAttraction',
]

const statusOptions = ['draft', 'review', 'published']

export const landingPage = defineType({
  name: 'landingPage',
  title: 'Landing / guide page',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Editorial', default: true},
    {name: 'body', title: 'Body'},
    {name: 'curated', title: 'Curated lists'},
    {name: 'related', title: 'Related'},
    {name: 'seo', title: 'SEO & FAQ'},
    {name: 'admin', title: 'Admin'},
  ],
  fields: [
    // ── Editorial ──────────────────────────────────────────────────────
    defineField({
      name: 'title', title: 'Title', type: 'string', group: 'editorial',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'path', title: 'Route path', type: 'string', group: 'editorial',
      description: 'Full URL path this page renders at, with leading and trailing slash. e.g. "/eat/cafes/".',
      validation: (R) =>
        R.required().regex(/^\/.*\/$/, {name: 'path with leading and trailing slash'}),
    }),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug', group: 'editorial',
      options: {source: 'title', maxLength: 96},
      description: 'Convenience slug, derived from the title. The route path above is the canonical key.',
    }),
    defineField({
      name: 'section', title: 'Section', type: 'string', group: 'editorial',
      options: {list: sectionOptions.map((v) => ({title: v, value: v}))},
      description: 'Which part of the site this page belongs to — controls template and grouping.',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'eyebrow', title: 'Eyebrow label', type: 'string', group: 'editorial',
      description: 'Small label above the title (optional).',
    }),
    defineField({
      name: 'dek', title: 'Dek / intro', type: 'text', rows: 3, group: 'editorial',
      description: 'Short standfirst shown under the title.',
    }),
    defineField({
      name: 'heroImage', title: 'Hero image', type: 'imageRef', group: 'editorial',
    }),

    // ── Body ───────────────────────────────────────────────────────────
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'body',
      description: 'Main editorial prose. Supports the same rich embeds as articles.',
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

    // ── Curated lists ──────────────────────────────────────────────────
    // Replaces the hardcoded venue-slug arrays (fineDiningSlugs, cafeSlugs,
    // etc.). Each block is a headed, ordered list of references an editor
    // can reorder, add to, or remove in Studio.
    defineField({
      name: 'curatedCollections',
      title: 'Curated collections',
      type: 'array',
      group: 'curated',
      of: [{
        type: 'object',
        name: 'curatedCollection',
        fields: [
          defineField({name: 'heading', title: 'Heading', type: 'string'}),
          defineField({name: 'intro', title: 'Intro', type: 'text', rows: 2}),
          defineField({
            name: 'items', title: 'Items', type: 'array',
            of: [{
              type: 'reference',
              weak: true,
              to: [
                {type: 'venue'}, {type: 'place'}, {type: 'experience'},
                {type: 'tour'}, {type: 'tourOperator'}, {type: 'tourPackage'},
                {type: 'article'}, {type: 'itinerary'},
              ],
            }],
          }),
        ],
        preview: {select: {title: 'heading'}},
      }],
    }),

    // ── Related ────────────────────────────────────────────────────────
    defineField({
      name: 'relatedLinks', title: 'Related guides', type: 'array', group: 'related',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'label', title: 'Label', type: 'string'}),
          defineField({name: 'href', title: 'URL', type: 'string'}),
        ],
        preview: {select: {title: 'label', subtitle: 'href'}},
      }],
    }),

    // ── SEO + FAQ ──────────────────────────────────────────────────────
    defineField({
      name: 'seoTitle', title: 'SEO title', type: 'string', group: 'seo',
      description: 'Overrides the <title> tag if set; otherwise the page title is used.',
    }),
    defineField({
      name: 'seoDescription', title: 'SEO description', type: 'text', rows: 3, group: 'seo',
    }),
    defineField({
      name: 'jsonLdType', title: 'Structured data type', type: 'string', group: 'seo',
      options: {list: jsonLdOptions.map((v) => ({title: v, value: v}))},
      initialValue: 'WebPage',
    }),
    defineField({
      name: 'faq', title: 'FAQ', type: 'array', of: [{type: 'faqItem'}], group: 'seo',
    }),

    // ── Admin ──────────────────────────────────────────────────────────
    defineField({
      name: 'status', title: 'Status', type: 'string', group: 'admin',
      options: {list: statusOptions.map((v) => ({title: v, value: v}))},
      initialValue: 'draft', validation: (R) => R.required(),
    }),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime', group: 'admin'}),
    defineField({name: 'updatedAt', title: 'Updated at', type: 'datetime', group: 'admin'}),
    defineField({
      name: 'noindex', title: 'Hide from search engines', type: 'boolean', group: 'admin',
      initialValue: false,
    }),
    defineField({
      name: 'sitemapExclude', title: 'Exclude from sitemap', type: 'boolean', group: 'admin',
      initialValue: false,
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'path', media: 'heroImage'},
    prepare: ({title, subtitle, media}) => ({
      title: title ?? 'Untitled page',
      subtitle: subtitle ?? undefined,
      media,
    }),
  },
  orderings: [
    {title: 'Section', name: 'section', by: [{field: 'section', direction: 'asc'}, {field: 'title', direction: 'asc'}]},
    {title: 'Title A→Z', name: 'titleAsc', by: [{field: 'title', direction: 'asc'}]},
  ],
})
