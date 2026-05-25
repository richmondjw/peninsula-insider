import {defineType, defineField} from 'sanity'

export const experience = defineType({
  name: 'experience',
  title: 'Experience',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Editorial', default: true},
    {name: 'location', title: 'Location'},
    {name: 'practical', title: 'Practical'},
    {name: 'dog', title: 'Dog friendly'},
    {name: 'admin', title: 'Admin'},
  ],
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', group: 'editorial', validation: (R) => R.required()}),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug', group: 'editorial',
      options: {source: 'name', maxLength: 96}, validation: (R) => R.required(),
    }),
    defineField({
      name: 'type', title: 'Type', type: 'string', group: 'editorial',
      options: {list: ['walk','beach','wellness','tour','attraction','gallery','park','lookout','market','workshop','golf-course'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({name: 'editorNote', title: 'Editor note', type: 'array', of: [{type: 'block'}], group: 'editorial'}),
    defineField({name: 'heroImage', title: 'Hero image', type: 'imageRef', group: 'editorial', validation: (R) => R.required()}),
    defineField({name: 'gallery', title: 'Gallery', type: 'array', of: [{type: 'imageRef'}], group: 'editorial'}),
    defineField({name: 'tags', title: 'Tags', type: 'tags', group: 'editorial'}),

    defineField({name: 'place', title: 'Place', type: 'reference', to: [{type: 'place'}], group: 'location', validation: (R) => R.required()}),
    defineField({
      name: 'zone', title: 'Zone', type: 'string', group: 'location',
      options: {list: ['bayside','hinterland','red-hill-plateau','ocean-coast','back-beaches','tip'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({name: 'coordinates', title: 'Coordinates', type: 'coordinates', group: 'location'}),
    defineField({name: 'address', title: 'Address', type: 'string', group: 'location'}),

    defineField({name: 'website', title: 'Website', type: 'url', group: 'practical'}),
    defineField({name: 'bookingUrl', title: 'Booking URL', type: 'url', group: 'practical'}),
    defineField({name: 'durationMinutes', title: 'Duration (minutes)', type: 'number', group: 'practical', validation: (R)=>R.positive()}),
    defineField({
      name: 'difficulty', title: 'Difficulty', type: 'string', group: 'practical',
      options: {list: ['easy','moderate','hard'].map(v=>({title:v,value:v}))},
    }),
    defineField({
      name: 'seasonBest', title: 'Best season', type: 'array', of: [{type: 'string'}], group: 'practical',
      options: {list: ['spring','summer','autumn','winter','all-year'].map(v=>({title:v,value:v}))},
    }),
    defineField({name: 'golf', title: 'Golf data', type: 'object', group: 'practical', fields: [
      defineField({name: 'holes', title: 'Holes', type: 'number'}),
      defineField({name: 'access', title: 'Access', type: 'string'}),
      defineField({name: 'designer', title: 'Designer', type: 'string'}),
      defineField({name: 'year', title: 'Year built', type: 'number'}),
    ]}),

    defineField({name: 'dogFriendly', title: 'Dog friendly', type: 'boolean', group: 'dog', initialValue: false}),
    defineField({name: 'dogFriendlyNotes', title: 'Dog friendly notes', type: 'text', rows: 2, group: 'dog', hidden: ({document}) => !document?.dogFriendly}),
    defineField({name: 'offLeashNearby', title: 'Off-leash nearby', type: 'boolean', group: 'dog', hidden: ({document}) => !document?.dogFriendly}),
    defineField({name: 'waterAccessNearby', title: 'Water access nearby', type: 'boolean', group: 'dog', hidden: ({document}) => !document?.dogFriendly}),
    defineField({
      name: 'rainyDayDogSuitability', title: 'Rainy day suitability', type: 'string', group: 'dog',
      options: {list: ['low','medium','high'].map(v=>({title:v,value:v}))}, hidden: ({document}) => !document?.dogFriendly,
    }),

    defineField({name: 'lastVerified', title: 'Last verified', type: 'date', group: 'admin', validation: (R) => R.required()}),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime', group: 'admin', validation: (R) => R.required()}),
    defineField({name: 'sitemapExclude', title: 'Exclude from sitemap', type: 'boolean', group: 'admin', initialValue: false}),
  ],
  preview: {select: {title: 'name', subtitle: 'type', media: 'heroImage'}},
})
