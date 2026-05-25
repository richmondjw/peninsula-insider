import {defineType, defineField} from 'sanity'

/**
 * Page hero — multiple documents keyed by path slug. e.g. one document
 * per hub page (whats-on, places, eat-cafes, etc) with the SubpageHero
 * fields overridden. Maps onto the existing page/<slug>/hero pattern
 * from the legacy Supabase override layer.
 */
export const pageHero = defineType({
  name: 'pageHero',
  title: 'Page hero',
  type: 'document',
  fields: [
    defineField({
      name: 'pathSlug',
      title: 'Page slug',
      type: 'string',
      description: 'URL path slug, e.g. "whats-on", "places", "eat-cafes". Becomes the document _id key.',
      validation: (R) => R.required(),
    }),
    defineField({name: 'title', title: 'Hero title', type: 'string'}),
    defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
    defineField({name: 'category', title: 'Category label', type: 'string'}),
    defineField({name: 'image', title: 'Hero image', type: 'imageRef'}),
    defineField({name: 'dek', title: 'Dek / intro paragraph', type: 'text', rows: 3}),
  ],
  preview: {select: {title: 'title', subtitle: 'pathSlug', media: 'image'}},
})
