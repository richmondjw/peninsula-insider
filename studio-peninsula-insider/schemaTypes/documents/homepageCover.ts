import {defineType, defineField} from 'sanity'

/**
 * Homepage cover — singleton, _id = 'homepageCover'.
 *
 * Replaces the hard-coded `scenes` array in next/src/pages/index.astro.
 * The "active" scene index drives which scene renders as the live cover;
 * the rest become rotation candidates. Eliminates the source of the
 * original cover-image flicker by giving editors a single dropdown to
 * change which scene is live.
 */
export const homepageCover = defineType({
  name: 'homepageCover',
  title: 'Homepage cover',
  type: 'document',
  fields: [
    defineField({
      name: 'activeSceneIndex',
      title: 'Active scene',
      type: 'number',
      description: '0-based index into the scenes array. The active scene renders as the live cover.',
      initialValue: 0,
      validation: (R) => R.required().min(0).integer(),
    }),
    defineField({
      name: 'scenes',
      title: 'Cover scenes',
      type: 'array',
      validation: (R) => R.min(1),
      of: [
        {
          type: 'object',
          name: 'coverScene',
          title: 'Cover scene',
          fields: [
            defineField({name: 'id', title: 'ID', type: 'string', validation: (R) => R.required()}),
            defineField({name: 'label', title: 'Label', type: 'string', description: 'e.g. "THE SLOW SIDE".'}),
            defineField({name: 'hours', title: 'Read time label', type: 'string', description: 'e.g. "7 MIN READ".'}),
            defineField({name: 'image', title: 'Image', type: 'imageRef', validation: (R) => R.required()}),
            defineField({name: 'caption', title: 'Image caption / location credit', type: 'string'}),
            defineField({name: 'headline', title: 'Headline (HTML allowed)', type: 'text', rows: 2, description: 'Supports inline <em>…</em>.', validation: (R) => R.required()}),
            defineField({name: 'dispatch', title: 'Dispatch (PI voice)', type: 'text', rows: 4, validation: (R) => R.required()}),
            defineField({name: 'primaryHref', title: 'Primary link', type: 'string', validation: (R) => R.required()}),
            defineField({name: 'primaryLabel', title: 'Primary label', type: 'string', initialValue: 'Read'}),
          ],
          preview: {select: {title: 'label', subtitle: 'id', media: 'image'}},
        },
      ],
    }),
    defineField({
      name: 'coverDate',
      title: 'Cover essay date',
      type: 'date',
      description: 'Used in the editorial meta line above the headline.',
    }),
  ],
  preview: {prepare: () => ({title: 'Homepage cover'})},
})
