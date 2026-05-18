import {defineType, defineField} from 'sanity'

/**
 * External canonical URLs used in JSON-LD `sameAs` and as the "live status"
 * link. Free-form key/value so editors can add new platforms without a
 * schema migration (Google Business, Halliday, official site, Instagram).
 */
export const sameAs = defineType({
  name: 'sameAs',
  title: 'External links (sameAs)',
  type: 'object',
  fields: [
    defineField({name: 'officialSite', title: 'Official site', type: 'url'}),
    defineField({name: 'halliday', title: 'Halliday', type: 'url'}),
    defineField({name: 'googleBusiness', title: 'Google Business', type: 'url'}),
    defineField({name: 'instagram', title: 'Instagram', type: 'url'}),
    defineField({name: 'facebook', title: 'Facebook', type: 'url'}),
  ],
})
