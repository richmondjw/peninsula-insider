/**
 * Keystatic CMS configuration — spike/keystatic branch
 *
 * This is a proof-of-concept mapping of Peninsula Insider content collections
 * to Keystatic's local editor UI. It uses local storage mode so Emma can
 * run the dev server and edit content without any GitHub/cloud setup.
 *
 * Usage: pnpm dev  →  visit http://localhost:4321/keystatic
 *
 * IMPORTANT: This is a spike — do NOT merge to main without:
 *   1. Deciding on storage: 'local' vs GitHub-backed
 *   2. Gating the keystatic() integration behind an env var or removing it
 *   3. Removing the `output: 'hybrid'` change if not needed
 *
 * Schema source: src/content/venues/*.json and src/content/articles/*.md
 */

import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: 'richmondjw/peninsula-insider',
    branchPrefix: 'keystatic/',
  },

  ui: {
    brand: {
      name: 'Peninsula Insider',
    },
  },

  collections: {
    // -------------------------------------------------------------------------
    // VENUES — JSON files in src/content/venues/
    // Core editorial fields mapped; technical/SEO fields (sitemapExclude,
    // gallery[], coordinates{}) left as read-only or omitted for the spike.
    // -------------------------------------------------------------------------
    venues: collection({
      label: 'Venues',
      slugField: 'name',
      path: 'next/src/content/venues/*',
      format: { data: 'json' },
      schema: {
        name: fields.text({
          label: 'Venue name',
          validation: { isRequired: true },
        }),
        type: fields.select({
          label: 'Venue type',
          options: [
            { label: 'Restaurant', value: 'restaurant' },
            { label: 'Winery / cellar door', value: 'winery' },
            { label: 'Cafe', value: 'cafe' },
            { label: 'Spa', value: 'spa' },
            { label: 'Accommodation / hotel', value: 'hotel' },
            { label: 'Accommodation / cottage', value: 'cottage' },
            { label: 'Accommodation / B&B', value: 'bnb' },
            { label: 'Beach / nature', value: 'beach' },
            { label: 'Bar', value: 'bar' },
            { label: 'Bakery', value: 'bakery' },
            { label: 'Market', value: 'market' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'restaurant',
        }),
        place: fields.text({
          label: 'Place / suburb slug',
          description: 'e.g. red-hill, sorrento, flinders',
        }),
        zone: fields.text({
          label: 'Zone slug',
          description: 'e.g. red-hill, bay-coast, ocean-coast',
        }),
        address: fields.text({ label: 'Street address' }),
        phone: fields.text({ label: 'Phone' }),
        website: fields.url({ label: 'Website URL' }),
        bookingUrl: fields.url({ label: 'Booking URL' }),
        bookingProvider: fields.select({
          label: 'Booking provider',
          options: [
            { label: 'Direct', value: 'direct' },
            { label: 'OpenTable', value: 'opentable' },
            { label: 'Resy', value: 'resy' },
            { label: 'SevenRooms', value: 'sevenrooms' },
            { label: 'Airbnb', value: 'airbnb' },
            { label: 'None', value: 'none' },
          ],
          defaultValue: 'direct',
        }),
        priceBand: fields.select({
          label: 'Price band',
          options: [
            { label: '$', value: '$' },
            { label: '$$', value: '$$' },
            { label: '$$$', value: '$$$' },
            { label: '$$$$', value: '$$$$' },
          ],
          defaultValue: '$$',
        }),
        signature: fields.text({
          label: 'Signature (one-liner)',
          description: 'Short editorial pitch — shown in cards and previews.',
          multiline: true,
        }),
        editorNote: fields.text({
          label: 'Editor note',
          description: 'Full editorial write-up. Markdown ok.',
          multiline: true,
        }),
        whyWeGo: fields.text({
          label: 'Why we go',
          description: 'One-sentence reason.',
          multiline: true,
        }),
        ifOnlyOneThing: fields.text({
          label: 'If only one thing',
          description: 'The single best move at this venue.',
          multiline: true,
        }),
        bestFor: fields.array(
          fields.text({ label: 'Tag' }),
          {
            label: 'Best for',
          }
        ),
        pairWith: fields.array(
          fields.text({ label: 'Venue name' }),
          {
            label: 'Pair with (venue names)',
          }
        ),
        featuredPartner: fields.checkbox({
          label: 'Featured partner',
          defaultValue: false,
        }),
        publishedAt: fields.date({ label: 'Published date' }),
        lastVerified: fields.date({ label: 'Last verified' }),
      },
    }),

    // -------------------------------------------------------------------------
    // ARTICLES — Markdown files in src/content/articles/
    // Front matter fields mapped; body content is the document field.
    // -------------------------------------------------------------------------
    articles: collection({
      label: 'Articles',
      slugField: 'title',
      path: 'next/src/content/articles/*',
      format: { contentField: 'body' },
      schema: {
        title: fields.text({
          label: 'Title',
          validation: { isRequired: true },
        }),
        dek: fields.text({
          label: 'Dek (subtitle)',
          description: 'Appears below the headline in article header.',
          multiline: true,
        }),
        author: fields.text({
          label: 'Author slug',
          description: 'e.g. "editorial", or an author slug from authors/',
          defaultValue: 'editorial',
        }),
        houseByline: fields.checkbox({
          label: 'House byline',
          defaultValue: true,
        }),
        publishedAt: fields.date({
          label: 'Published date',
          validation: { isRequired: true },
        }),
        lastVerified: fields.date({ label: 'Last verified' }),
        format: fields.select({
          label: 'Format',
          options: [
            { label: 'Slow Peninsula', value: 'slow-peninsula' },
            { label: 'Hub Guide', value: 'hub-guide' },
            { label: 'Area Guide', value: 'area-guide' },
            { label: 'Weekend picks', value: 'weekend-picks' },
            { label: 'Feature', value: 'feature' },
            { label: 'Standard', value: 'standard' },
          ],
          defaultValue: 'standard',
        }),
        tags: fields.array(
          fields.text({ label: 'Tag' }),
          {
            label: 'Tags',
          }
        ),
        featured: fields.checkbox({
          label: 'Featured',
          defaultValue: false,
        }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Published', value: 'published' },
            { label: 'Draft', value: 'draft' },
            { label: 'Archived', value: 'archived' },
          ],
          defaultValue: 'draft',
        }),
        readingTimeMinutes: fields.integer({
          label: 'Reading time (minutes)',
          defaultValue: 5,
        }),
        body: fields.markdoc({
          label: 'Body',
        }),
      },
    }),
  },
});
