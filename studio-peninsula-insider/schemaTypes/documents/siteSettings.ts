import {defineType, defineField} from 'sanity'

/**
 * Site settings — singleton. One document, _id = 'siteSettings'.
 * Holds the small set of cross-page values that today live as inline
 * constants in the masthead, footer, and BaseLayout: edition date,
 * social handles, footer links, and brand / utility imagery.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({name: 'mastheadLabel', title: 'Masthead label', type: 'string', initialValue: 'Peninsula Insider'}),
    defineField({name: 'tagline', title: 'Tagline', type: 'string', initialValue: 'An editorial guide, not a directory.'}),
    defineField({name: 'editionLabel', title: 'Edition label', type: 'string', description: 'e.g. "Autumn Insider · May 2026".'}),
    defineField({name: 'edition', title: 'Edition month', type: 'string'}),
    defineField({name: 'editionYear', title: 'Edition year', type: 'number'}),
    defineField({
      name: 'footerLinks', title: 'Footer links', type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'label', title: 'Label', type: 'string'}),
          defineField({name: 'href', title: 'URL', type: 'string'}),
        ],
        preview: {select: {title: 'label', subtitle: 'href'}},
      }],
    }),
    defineField({
      name: 'social', title: 'Social handles', type: 'object',
      fields: [
        defineField({name: 'instagram', title: 'Instagram', type: 'url'}),
        defineField({name: 'facebook', title: 'Facebook', type: 'url'}),
        defineField({name: 'twitter', title: 'Twitter / X', type: 'url'}),
      ],
    }),

    // Brand & utility imagery. Each falls back to its current hardcoded
    // /images/* path in the adapter, so pre-seed render is byte-equivalent.
    defineField({
      name: 'logo',
      title: 'Site logo',
      type: 'imageRef',
      description: 'Primary brand logo. Falls back to /images/pi-logo-new.svg if unset.',
    }),
    defineField({
      name: 'conciergeAvatar',
      title: 'Concierge avatar',
      type: 'imageRef',
      description: 'Avatar for "The Insider" concierge across the drawer, /ask, AskPICTA, InsiderAsk, and 404. Falls back to /images/pi-concierge.svg.',
    }),
    defineField({
      name: 'ogFallback',
      title: 'Open Graph fallback image',
      type: 'imageRef',
      description: 'Default share-card image when a page has no per-page hero. Falls back to /images/sourced/home-cover.webp.',
    }),
    defineField({
      name: 'notFoundImage',
      title: '404 page graphic',
      type: 'imageRef',
      description: 'Image shown on the 404 page. Defaults to the concierge avatar; override for a dedicated 404 illustration.',
    }),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
