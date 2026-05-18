import {defineType, defineField} from 'sanity'

/** Wine + spa visiting block — structured opening hours, fees, booking. */
export const visiting = defineType({
  name: 'visiting',
  title: 'Visiting details',
  type: 'object',
  fields: [
    defineField({
      name: 'openingHours',
      title: 'Opening hours',
      type: 'array',
      of: [{type: 'openingHourEntry'}],
    }),
    defineField({name: 'tastingFee', title: 'Tasting fee', type: 'string'}),
    defineField({
      name: 'bookingRequired',
      title: 'Booking required',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({name: 'cellarDoorNote', title: 'Cellar door note', type: 'text', rows: 3}),
  ],
})
