import {defineType, defineField} from 'sanity'

export const tour = defineType({
  name: 'tour',
  title: 'Tour',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Editorial', default: true},
    {name: 'taxonomy', title: 'Taxonomy'},
    {name: 'practical', title: 'Practical'},
    {name: 'booking', title: 'Booking'},
    {name: 'admin', title: 'Admin'},
  ],
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', group: 'editorial', validation: (R) => R.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', group: 'editorial', options: {source: 'name'}, validation: (R) => R.required()}),
    defineField({name: 'operator', title: 'Operator', type: 'reference', to: [{type: 'tourOperator'}], group: 'editorial', validation: (R) => R.required()}),
    defineField({name: 'intro', title: 'Intro', type: 'text', rows: 3, group: 'editorial', validation: (R) => R.required()}),
    defineField({name: 'whatHappens', title: 'What happens', type: 'text', rows: 5, group: 'editorial', validation: (R) => R.required()}),
    defineField({name: 'whoSuits', title: 'Who it suits', type: 'text', rows: 3, group: 'editorial', validation: (R) => R.required()}),
    defineField({name: 'whoDoesnt', title: "Who it doesn't suit", type: 'text', rows: 3, group: 'editorial', validation: (R) => R.required()}),
    defineField({name: 'heroImage', title: 'Hero image', type: 'imageRef', group: 'editorial', validation: (R) => R.required()}),
    defineField({
      name: 'faq', title: 'FAQ', type: 'array', group: 'editorial',
      of: [{type: 'object', fields: [
        defineField({name: 'question', title: 'Question', type: 'string', validation: (R)=>R.required()}),
        defineField({name: 'answer', title: 'Answer', type: 'text', rows: 3, validation: (R)=>R.required()}),
      ], preview: {select: {title: 'question'}}}],
    }),

    defineField({
      name: 'experienceType', title: 'Experience type', type: 'string', group: 'taxonomy',
      options: {list: ['food-wine','wildlife-nature','history-heritage','kayak-paddle','cycling','walking-hiking','scenic-sightseeing','cruise-sailing','art-culture','surf-water','private-charter','wellness'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'duration', title: 'Duration', type: 'string', group: 'taxonomy',
      options: {list: ['under-2h','half-day','full-day','multi-2n','multi-3n','multi-extended'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'theme', title: 'Theme (max 2)', type: 'array', of: [{type: 'string'}], group: 'taxonomy',
      options: {list: ['romantic','family','adventure','relaxed','gourmet','wellness','educational','eco','seasonal'].map(v=>({title:v,value:v}))},
      validation: (R) => R.max(2),
    }),
    defineField({
      name: 'audience', title: 'Audience', type: 'string', group: 'taxonomy',
      options: {list: ['adults','families','solo','couples','seniors','accessible','general'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'occasion', title: 'Occasion', type: 'string', group: 'taxonomy',
      options: {list: ['anniversary','hens','bucks','corporate','birthday','family-reunion','school','general'].map(v=>({title:v,value:v}))},
      initialValue: 'general',
    }),
    defineField({
      name: 'origin', title: 'Origin', type: 'string', group: 'taxonomy',
      options: {list: ['mornington','sorrento','portsea','red-hill','merricks','flinders','dromana','rosebud','rye','blairgowrie','peninsula-wide','melbourne-cbd'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'budgetBand', title: 'Budget band', type: 'string', group: 'taxonomy',
      options: {list: ['budget','moderate','mid-range','premium','luxury'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'groupSize', title: 'Group size', type: 'string', group: 'taxonomy',
      options: {list: ['intimate','small-group','large-group','private-charter'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),

    defineField({name: 'priceLow', title: 'Price (low)', type: 'number', group: 'practical', validation: (R) => R.positive()}),
    defineField({name: 'priceHigh', title: 'Price (high)', type: 'number', group: 'practical', validation: (R) => R.positive()}),
    defineField({name: 'durationHours', title: 'Duration (hours)', type: 'number', group: 'practical', validation: (R) => R.positive()}),
    defineField({name: 'maxGroupSize', title: 'Max group size', type: 'number', group: 'practical', validation: (R) => R.positive()}),
    defineField({name: 'departsFrom', title: 'Departs from', type: 'string', group: 'practical'}),
    defineField({name: 'languages', title: 'Languages', type: 'array', of: [{type: 'string'}], group: 'practical', initialValue: ['en']}),
    defineField({name: 'accessibility', title: 'Accessibility', type: 'text', rows: 2, group: 'practical'}),

    defineField({name: 'bookingUrl', title: 'Booking URL', type: 'url', group: 'booking'}),
    defineField({name: 'aggregatorGYG', title: 'GetYourGuide URL', type: 'url', group: 'booking'}),
    defineField({name: 'aggregatorViator', title: 'Viator URL', type: 'url', group: 'booking'}),
    defineField({name: 'bookingIntelligence', title: 'Booking intelligence', type: 'text', rows: 3, group: 'booking'}),
    defineField({name: 'cancellationPolicy', title: 'Cancellation policy', type: 'text', rows: 3, group: 'booking'}),

    defineField({name: 'lastVerified', title: 'Last verified', type: 'date', group: 'admin', validation: (R) => R.required()}),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime', group: 'admin', validation: (R) => R.required()}),
  ],
  preview: {select: {title: 'name', subtitle: 'experienceType', media: 'heroImage'}},
})
