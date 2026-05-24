import {defineType, defineField} from 'sanity'

/**
 * Editorial authority signals for a venue — hats, Halliday score for wineries,
 * awards, press mentions. All optional. Surfaced on detail pages and used to
 * rank "best of" lists.
 */
export const authority = defineType({
  name: 'authority',
  title: 'Authority signals',
  type: 'object',
  fields: [
    defineField({
      name: 'hats',
      title: 'Good Food Guide hats',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(3).integer(),
      description: '0–3. Leave blank if venue is not hatted.',
    }),
    defineField({
      name: 'hallidayScore',
      title: 'Halliday score',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(100),
      description: 'Wineries only. Halliday Wine Companion score, 0–100.',
    }),
    defineField({
      name: 'awards',
      title: 'Awards',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Each entry is one award. Free-form text.',
    }),
    defineField({
      name: 'pressMentions',
      title: 'Press mentions',
      type: 'array',
      of: [{type: 'string'}],
    }),
  ],
})
