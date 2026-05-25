import {defineType, defineField} from 'sanity'

/**
 * Latitude / longitude pair for venue + place + experience locations.
 * Validation matches the Astro content-collection coordinates schema.
 */
export const coordinates = defineType({
  name: 'coordinates',
  title: 'Coordinates',
  type: 'object',
  fields: [
    defineField({
      name: 'lat',
      title: 'Latitude',
      type: 'number',
      validation: (Rule) => Rule.required().min(-90).max(90),
    }),
    defineField({
      name: 'lng',
      title: 'Longitude',
      type: 'number',
      validation: (Rule) => Rule.required().min(-180).max(180),
    }),
  ],
})
