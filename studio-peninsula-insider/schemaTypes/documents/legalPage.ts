import {defineType, defineField} from 'sanity'

/**
 * Legal / policy page — one document per static legal page.
 * Slugs: 'privacy', 'terms', 'accessibility', 'complaints', 'corrections',
 * 'ethics', 'editorial-approach', etc.
 *
 * Pages pull this at build time via fetchLegalPageFromSanity(slug) and
 * fall back to hardcoded markup if the doc doesn't exist yet.
 */
export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal / policy page',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      description: 'URL slug matching the page path, e.g. "privacy", "terms", "accessibility".',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow label',
      type: 'string',
      description: 'Small label above the title (optional). e.g. "Privacy", "Legal".',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'date',
      options: {dateFormat: 'MMMM D YYYY'},
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (R) =>
                      R.uri({allowRelative: true, scheme: ['https', 'http', 'mailto', 'tel']}),
                  }),
                ],
              },
            ],
          },
        },
      ],
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
    prepare: ({title, subtitle}) => ({
      title: title ?? 'Untitled page',
      subtitle: subtitle ? `/${subtitle}/` : undefined,
    }),
  },
})
