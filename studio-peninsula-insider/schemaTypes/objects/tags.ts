import {defineType, defineField} from 'sanity'

const moodOptions = [
  'long-lunch',
  'anniversary',
  'family',
  'rainy-day',
  'sunset',
  'slow',
  'wellness',
  'romance',
  'first-date',
  'big-group',
  'solo',
  'quick-bite',
  'weekend-escape',
  'cellar-door',
  'walk',
  'beach',
  'fireplace',
  'view',
  'rooftop',
  'garden',
  'waterfront',
  'golf',
]

const seasonOptions = ['spring', 'summer', 'autumn', 'winter', 'all-year']

const audienceOptions = ['couples', 'families', 'solo', 'group', 'locals', 'first-timers']

/**
 * Faceted editorial tags. Each axis (mood/season/audience) is a closed
 * vocabulary so hub-page filters can rely on stable values.
 */
export const tags = defineType({
  name: 'tags',
  title: 'Tags',
  type: 'object',
  fields: [
    defineField({
      name: 'mood',
      title: 'Mood',
      type: 'array',
      of: [{type: 'string'}],
      options: {list: moodOptions.map((v) => ({title: v, value: v}))},
    }),
    defineField({
      name: 'season',
      title: 'Season',
      type: 'array',
      of: [{type: 'string'}],
      options: {list: seasonOptions.map((v) => ({title: v, value: v}))},
    }),
    defineField({
      name: 'audience',
      title: 'Audience',
      type: 'array',
      of: [{type: 'string'}],
      options: {list: audienceOptions.map((v) => ({title: v, value: v}))},
    }),
  ],
})
