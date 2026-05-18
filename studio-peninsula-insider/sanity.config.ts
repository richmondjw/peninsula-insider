import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {presentationTool, defineLocations} from 'sanity/presentation'
import {schemaTypes} from './schemaTypes'

const PREVIEW_URL = 'https://peninsulainsider.com.au'

export default defineConfig({
  name: 'default',
  title: 'Peninsula Insider',

  projectId: 'a062b30n',
  dataset: 'production',

  plugins: [
    structureTool(),

    /**
     * Presentation tool — Visual Editing.
     * Opens the live site in a split-screen iframe alongside the
     * document form. Editors click on rendered elements; the
     * corresponding field opens for editing.
     */
    presentationTool({
      previewUrl: {
        origin: PREVIEW_URL,
        preview: '/',
        previewMode: {
          enable: '/api/preview/enable',
          disable: '/api/preview/disable',
        },
      },
      resolve: {
        locations: {
          venue: defineLocations({
            select: {name: 'name', slug: 'slug.current', type: 'type'},
            resolve: (doc) => {
              const slug = doc?.slug
              if (!slug) return null
              const type = String(doc?.type ?? '')
              const wineTypes = ['winery', 'producer', 'brewery', 'distillery']
              const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa']
              const prefix = wineTypes.includes(type)
                ? '/wine'
                : stayTypes.includes(type)
                  ? '/stay'
                  : '/eat'
              return {locations: [{title: doc?.name ?? slug, href: `${prefix}/${slug}/`}]}
            },
          }),
          place: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/places/${doc.slug}/`}]}
                : null,
          }),
          article: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.title ?? doc.slug, href: `/journal/${doc.slug}/`}]}
                : null,
          }),
          experience: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/explore/${doc.slug}/`}]}
                : null,
          }),
          itinerary: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.title ?? doc.slug, href: `/plans/${doc.slug}/`}]}
                : null,
          }),
          event: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.title ?? doc.slug, href: `/whats-on/${doc.slug}/`}]}
                : null,
          }),
          tour: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/tour/${doc.slug}/`}]}
                : null,
          }),
          tourOperator: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/tour/operators/${doc.slug}/`}]}
                : null,
          }),
          tourPackage: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/tour-packages/${doc.slug}/`}]}
                : null,
          }),
          homepageCover: defineLocations({
            resolve: () => ({locations: [{title: 'Homepage', href: '/'}]}),
          }),
          megaRail: defineLocations({
            resolve: () => ({locations: [{title: 'Homepage', href: '/'}]}),
          }),
          siteSettings: defineLocations({
            resolve: () => ({locations: [{title: 'Homepage', href: '/'}]}),
          }),
          pageHero: defineLocations({
            select: {pathSlug: 'pathSlug'},
            resolve: (doc) =>
              doc?.pathSlug
                ? {locations: [{title: doc.pathSlug, href: `/${doc.pathSlug}/`}]}
                : null,
          }),
        },
      },
    }),

    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
