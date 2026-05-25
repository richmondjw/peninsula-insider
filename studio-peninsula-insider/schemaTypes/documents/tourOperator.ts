import {defineType, defineField} from 'sanity'

export const tourOperator = defineType({
  name: 'tourOperator',
  title: 'Tour operator',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (R) => R.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'name', maxLength: 96}, validation: (R) => R.required()}),
    defineField({
      name: 'operatorType', title: 'Operator type', type: 'string',
      options: {list: ['volume','wine-specialist','premium-private','activity-specialist'].map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({name: 'intro', title: 'Intro', type: 'text', rows: 4, validation: (R) => R.required()}),
    defineField({name: 'whatGoodAt', title: 'What they are good at', type: 'text', rows: 3, validation: (R) => R.required()}),
    defineField({name: 'notSuitedFor', title: 'Not suited for', type: 'text', rows: 3, validation: (R) => R.required()}),
    defineField({name: 'heroImage', title: 'Hero image', type: 'imageRef', validation: (R) => R.required()}),
    defineField({name: 'website', title: 'Website', type: 'url'}),
    defineField({name: 'phone', title: 'Phone', type: 'string'}),
    defineField({name: 'pickupPoints', title: 'Pickup points', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'languages', title: 'Languages', type: 'array', of: [{type: 'string'}], initialValue: ['en']}),
    defineField({name: 'maxCapacity', title: 'Max capacity', type: 'number', validation: (R) => R.positive()}),
    defineField({
      name: 'affiliateProgram', title: 'Affiliate program', type: 'string',
      options: {list: ['yes','no','unknown'].map(v=>({title:v,value:v}))}, initialValue: 'unknown',
    }),
    defineField({name: 'affiliateUrl', title: 'Affiliate URL', type: 'url'}),
    defineField({name: 'vetted', title: 'Vetted', type: 'boolean', initialValue: false}),
    defineField({name: 'lastVerified', title: 'Last verified', type: 'date', validation: (R) => R.required()}),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime', validation: (R) => R.required()}),
  ],
  preview: {select: {title: 'name', subtitle: 'operatorType', media: 'heroImage'}},
})
