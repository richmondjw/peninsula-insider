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
        // SSR landing (next/src/pages/preview/index.astro). Must be a
        // /preview/ route so the Visual Editing overlay mounts on the
        // default-no-doc-selected iframe — public paths like '/' are
        // statically prerendered and can't host the channel handshake.
        preview: '/preview/',
        previewMode: {
          // Trailing slashes are mandatory: Vercel does a 308 trailing-slash
          // redirect on the bare path, and the 308 response strips the
          // Set-Cookie header. Without the slash, the preview cookie never
          // lands and the Visual Editing overlay fails with "Unable to
          // connect" because middleware never sees sanityPreview=true.
          enable: '/api/preview/enable/',
          disable: '/api/preview/disable/',
        },
      },
      resolve: {
        locations: {
          // Presentation routes to /preview/<section>/<slug> — SSR routes
          // that render with the stega-encoded preview client. Public URLs
          // (/wine/<slug>/ etc.) stay prerendered for fast public traffic.
          venue: defineLocations({
            select: {name: 'name', slug: 'slug.current', type: 'type'},
            resolve: (doc) => {
              const slug = doc?.slug
              if (!slug) return null
              const type = String(doc?.type ?? '')
              const wineTypes = ['winery', 'producer', 'brewery', 'distillery']
              const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa']
              const section = wineTypes.includes(type)
                ? 'wine'
                : stayTypes.includes(type)
                  ? 'stay'
                  : 'eat'
              return {locations: [{title: doc?.name ?? slug, href: `/preview/${section}/${slug}/`}]}
            },
          }),
          place: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/preview/places/${doc.slug}/`}]}
                : null,
          }),
          article: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.title ?? doc.slug, href: `/preview/journal/${doc.slug}/`}]}
                : null,
          }),
          experience: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/preview/explore/${doc.slug}/`}]}
                : null,
          }),
          itinerary: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.title ?? doc.slug, href: `/preview/plans/${doc.slug}/`}]}
                : null,
          }),
          event: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.title ?? doc.slug, href: `/preview/whats-on/${doc.slug}/`}]}
                : null,
          }),
          tour: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/preview/tour/${doc.slug}/`}]}
                : null,
          }),
          tourOperator: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/preview/tour-operators/${doc.slug}/`}]}
                : null,
          }),
          tourPackage: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc?.name ?? doc.slug, href: `/preview/tour-packages/${doc.slug}/`}]}
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
