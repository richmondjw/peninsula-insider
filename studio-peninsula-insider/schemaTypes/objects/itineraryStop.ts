import {defineType, defineField} from 'sanity'

/**
 * One stop on an itinerary day. References a venue OR an experience by
 * slug (string) — kept as strings during the migration so itineraries
 * don't depend on experiences being in Sanity yet. Phase 6 will convert
 * these to proper Sanity references.
 */
export const itineraryStop = defineType({
  name: 'itineraryStop',
  title: 'Itinerary stop',
  type: 'object',
  fields: [
    defineField({
      name: 'day',
      title: 'Day',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'order',
      title: 'Order within day',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'venue',
      title: 'Venue (slug)',
      type: 'reference',
      to: [{type: 'venue'}],
      description: 'Optional. Reference a venue document.',
    }),
    defineField({
      name: 'experienceSlug',
      title: 'Experience (slug)',
      type: 'string',
      description:
        'Optional. Experience slug — kept as a string during migration; will become a reference once Phase 5 lands.',
    }),
    defineField({
      name: 'note',
      title: 'Note',
      type: 'text',
      rows: 3,
      description: 'Editorial note for this stop.',
    }),
    defineField({
      name: 'timeOfDay',
      title: 'Time of day',
      type: 'string',
      options: {
        list: ['morning', 'midday', 'afternoon', 'evening', 'night'].map((v) => ({
          title: v,
          value: v,
        })),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'timeRange', title: 'Time range', type: 'string', description: 'e.g. "9:30–10:30am". Preferred over timeOfDay when known.'}),
    defineField({name: 'practical', title: 'Practical info', type: 'string'}),
    defineField({
      name: 'driveMinutesToNext',
      title: 'Drive minutes to next stop',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
  ],
  preview: {
    select: {
      day: 'day',
      order: 'order',
      venue: 'venue.name',
      exp: 'experienceSlug',
      time: 'timeOfDay',
    },
    prepare: ({day, order, venue, exp, time}) => ({
      title: `Day ${day} · ${order}. ${venue || exp || '(unset)'}`,
      subtitle: time,
    }),
  },
})
