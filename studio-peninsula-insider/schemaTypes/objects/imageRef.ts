import {defineType, defineField} from 'sanity'

/**
 * Peninsula Insider image with attribution.
 *
 * Mirrors the Astro content-collection `imageRef` shape (src, alt, credit,
 * license, caption). The binary lives in Sanity's Asset Pipeline; the
 * other fields hang off the image as metadata so they travel with the
 * asset across the site.
 *
 * Use this for hero images and gallery images on venues, places, events,
 * articles, experiences, itineraries, tours.
 */
export const imageRef = defineType({
  name: 'imageRef',
  title: 'Image',
  type: 'image',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description:
        'Descriptive alt text for screen readers and SEO. Describe what is in the image, not "image of …".',
      validation: (Rule) => Rule.required().min(4).max(200),
    }),
    defineField({
      name: 'credit',
      title: 'Credit',
      type: 'string',
      description:
        'Photographer or source. Use the literal "jem" for photos taken by James and Emma — templates render that as "Photograph by jem".',
      initialValue: 'venue-media-kit',
    }),
    defineField({
      name: 'license',
      title: 'License',
      type: 'string',
      options: {
        list: [
          {title: 'Original commissioned', value: 'original-commissioned'},
          {title: 'Venue media kit', value: 'venue-media-kit'},
          {title: 'Visit Victoria', value: 'visit-victoria'},
          {title: 'Wikimedia CC0', value: 'wikimedia-cc0'},
          {title: 'Wikimedia CC-BY', value: 'wikimedia-cc-by'},
          {title: 'Wikimedia CC-BY-SA', value: 'wikimedia-cc-by-sa'},
          {title: 'Temporary — Unsplash', value: 'tmp-unsplash'},
          {title: 'Temporary — Wikimedia', value: 'tmp-wikimedia'},
          {title: 'Temporary — Pexels', value: 'tmp-pexels'},
          {title: 'Other (licensed)', value: 'other-licensed'},
        ],
      },
      initialValue: 'venue-media-kit',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional photo caption shown beneath the image.',
    }),
  ],
})
