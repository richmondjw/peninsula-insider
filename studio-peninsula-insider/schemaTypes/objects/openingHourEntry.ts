import {defineType, defineField} from 'sanity'

/**
 * One row of structured opening hours. A venue.visiting.openingHours array
 * stitches multiple of these together (e.g. weekdays vs weekends).
 */
export const openingHourEntry = defineType({
  name: 'openingHourEntry',
  title: 'Opening hours row',
  type: 'object',
  fields: [
    defineField({
      name: 'days',
      title: 'Days',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ].map((d) => ({title: d, value: d})),
      },
    }),
    defineField({name: 'opens', title: 'Opens', type: 'string'}),
    defineField({name: 'closes', title: 'Closes', type: 'string'}),
  ],
  preview: {
    select: {days: 'days', opens: 'opens', closes: 'closes'},
    prepare: ({days, opens, closes}) => ({
      title: (days || []).join(', ') || '(no days)',
      subtitle: opens && closes ? `${opens}–${closes}` : 'closed',
    }),
  },
})
