import {defineType, defineField} from 'sanity'

/**
 * Mega-rail — singleton, _id = 'megaRail'.
 *
 * Five hub rails (whats-on, escape, eat, wine, stay) surfaced site-wide
 * by V4MegaRail.astro. Each rail has a hero image, label, and link
 * target. Replaces the page/_global/mega-rail.* Supabase overrides.
 */
export const megaRail = defineType({
  name: 'megaRail',
  title: 'Mega-rail',
  type: 'document',
  fields: [
    defineField({
      name: 'entries',
      title: 'Rail entries',
      type: 'array',
      validation: (R) => R.length(5),
      of: [
        {
          type: 'object',
          name: 'railEntry',
          fields: [
            defineField({
              name: 'key', title: 'Key', type: 'string',
              options: {list: ['whats-on', 'escape', 'eat', 'wine', 'stay'].map((v) => ({title: v, value: v}))},
              validation: (R) => R.required(),
            }),
            defineField({name: 'label', title: 'Label', type: 'string', validation: (R) => R.required()}),
            defineField({name: 'href', title: 'URL', type: 'string', validation: (R) => R.required()}),
            defineField({name: 'image', title: 'Image', type: 'imageRef'}),
            defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
          ],
          preview: {select: {title: 'label', subtitle: 'key', media: 'image'}},
        },
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Mega-rail'})},
})
