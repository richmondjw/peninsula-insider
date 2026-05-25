import {defineType, defineField} from 'sanity'

/**
 * On-site restaurant block — used by wineries that operate a separate
 * dining venue (Pt. Leo / Laura, Ten Minutes by Tractor, etc).
 */
export const onSiteFood = defineType({
  name: 'onSiteFood',
  title: 'On-site restaurant',
  type: 'object',
  fields: [
    defineField({name: 'name', title: 'Restaurant name', type: 'string'}),
    defineField({
      name: 'hats',
      title: 'Hats',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(3).integer(),
    }),
    defineField({name: 'cuisine', title: 'Cuisine', type: 'string'}),
    defineField({name: 'reservations', title: 'Reservations required', type: 'boolean'}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 4}),
  ],
})
