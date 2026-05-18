import {defineType, defineField} from 'sanity'

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (R) => R.required()}),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug',
      options: {source: 'name'}, validation: (R) => R.required(),
    }),
    defineField({name: 'bio', title: 'Bio', type: 'text', rows: 4}),
    defineField({name: 'avatar', title: 'Avatar', type: 'imageRef'}),
    defineField({name: 'byline', title: 'Byline', type: 'string'}),
  ],
  preview: {select: {title: 'name', media: 'avatar'}},
})
