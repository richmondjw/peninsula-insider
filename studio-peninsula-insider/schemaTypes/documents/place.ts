import {defineType, defineField} from 'sanity'

/**
 * Minimal place document — needed now so the venue.place reference resolves
 * during the proof-of-concept migration. Full place schema (factualLede,
 * intro, bestFor, perfectDay, etc.) lands in a later migration phase.
 */
export const place = defineType({
  name: 'place',
  title: 'Place',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
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
  ],
  preview: {
    select: {title: 'name', subtitle: 'kind'},
  },
})
