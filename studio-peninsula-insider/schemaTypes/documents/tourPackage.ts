import {defineType, defineField} from 'sanity'

export const tourPackage = defineType({
  name: 'tourPackage',
  title: 'Tour package',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (R) => R.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'name'}, validation: (R) => R.required()}),
    defineField({
      name: 'occasion', title: 'Occasion', type: 'string',
      options: {list: ['anniversary','hens','bucks','corporate','birthday','family-reunion','school','general','winter','foodies'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'audience', title: 'Audience', type: 'string',
      options: {list: ['adults','families','solo','couples','seniors','general'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({name: 'theme', title: 'Theme (max 2)', type: 'array', of: [{type: 'string'}], validation: (R) => R.max(2)}),
    defineField({
      name: 'bundleType', title: 'Bundle type', type: 'string',
      options: {list: ['sequential-day','stay-anchored','flexible'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({name: 'durationNights', title: 'Duration (nights)', type: 'number', validation: (R) => R.min(0)}),
    defineField({
      name: 'componentTours', title: 'Component tours', type: 'array',
      of: [{type: 'reference', to: [{type: 'tour'}]}],
    }),
    defineField({name: 'anchorStay', title: 'Anchor stay', type: 'reference', to: [{type: 'venue'}]}),
    defineField({name: 'anchorStayBlurb', title: 'Anchor stay blurb', type: 'text', rows: 3}),
    defineField({name: 'altStay', title: 'Alternative stay', type: 'reference', to: [{type: 'venue'}]}),
    defineField({name: 'priceLow', title: 'Price (low)', type: 'number'}),
    defineField({name: 'priceHigh', title: 'Price (high)', type: 'number'}),
    defineField({name: 'intro', title: 'Intro', type: 'text', rows: 3, validation: (R) => R.required()}),
    defineField({name: 'whyThisCombination', title: 'Why this combination', type: 'text', rows: 4, validation: (R) => R.required()}),
    defineField({name: 'bookingSequence', title: 'Booking sequence', type: 'text', rows: 3}),
    defineField({name: 'heroImage', title: 'Hero image', type: 'imageRef', validation: (R) => R.required()}),
    defineField({
      name: 'faq', title: 'FAQ', type: 'array',
      of: [{type: 'object', fields: [
        defineField({name: 'question', title: 'Question', type: 'string', validation: (R)=>R.required()}),
        defineField({name: 'answer', title: 'Answer', type: 'text', rows: 3, validation: (R)=>R.required()}),
      ], preview: {select: {title: 'question'}}}],
    }),
    defineField({name: 'lastVerified', title: 'Last verified', type: 'date', validation: (R) => R.required()}),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime', validation: (R) => R.required()}),
  ],
  preview: {select: {title: 'name', subtitle: 'occasion', media: 'heroImage'}},
})
