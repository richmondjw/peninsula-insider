import {defineType, defineField} from 'sanity'

export const wines = defineType({
  name: 'wines',
  title: 'Wines',
  type: 'object',
  fields: [
    defineField({name: 'winemaker', title: 'Winemaker', type: 'string'}),
    defineField({
      name: 'keyVarieties',
      title: 'Key varieties',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({name: 'topLabel', title: 'Top label', type: 'string'}),
  ],
})
