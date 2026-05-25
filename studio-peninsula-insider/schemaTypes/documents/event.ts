import {defineType, defineField} from 'sanity'

const categoryOptions = [
  'food-wine','market','festival','cellar-door','community','arts','wellness',
  'live-music','racing-sport','family-programs','exhibition','civic','nature','writers-ideas',
]
const recurrenceOptions = ['one-off','weekly','monthly','annual','seasonal','ongoing']
const weatherOptions = ['all-weather','sunny-only','rainy-day-rescue','weather-proof','mixed']
const statusOptions = ['draft','review','scheduled','published','expired','past','archived']
const priceTierOptions = ['free','under-50','50-150','over-150','unknown']

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Editorial overlay', default: true},
    {name: 'core', title: 'Core facts'},
    {name: 'when', title: 'When'},
    {name: 'where', title: 'Where'},
    {name: 'money', title: 'Booking & price'},
    {name: 'audience', title: 'Audience'},
    {name: 'sources', title: 'Sources & verification'},
    {name: 'admin', title: 'Admin'},
  ],
  fields: [
    // ── Editorial overlay (the human-edited fields) ─────────────────────
    defineField({name: 'editorVerdict', title: 'Editor verdict', type: 'text', rows: 4, group: 'editorial'}),
    defineField({name: 'whyWeCare', title: 'Why we care', type: 'text', rows: 3, group: 'editorial'}),
    defineField({name: 'editorNote', title: 'Editor note', type: 'array', of: [{type: 'block'}], group: 'editorial'}),
    defineField({name: 'pairingProse', title: 'Pairing prose', type: 'text', rows: 3, group: 'editorial'}),
    defineField({
      name: 'kidsGrade', title: 'Kids grade', type: 'string', group: 'editorial',
      options: {list: ['A','B','C','not-for-kids'].map(v=>({title:v,value:v}))},
    }),
    defineField({name: 'kidsGradeNote', title: 'Kids grade note', type: 'text', rows: 3, group: 'editorial'}),
    defineField({name: 'worthTheDrive', title: 'Worth the drive', type: 'boolean', group: 'editorial', initialValue: false}),
    defineField({name: 'firstTimer', title: 'First-timer pick', type: 'boolean', group: 'editorial', initialValue: false}),
    defineField({name: 'standoutOfMonth', title: 'Standout of month', type: 'boolean', group: 'editorial', initialValue: false}),
    defineField({name: 'skipThis', title: 'Skip this', type: 'boolean', group: 'editorial', initialValue: false}),
    defineField({name: 'skipReason', title: 'Skip reason', type: 'text', rows: 2, group: 'editorial'}),
    defineField({name: 'skipInstead', title: 'Skip — go instead', type: 'string', group: 'editorial'}),
    defineField({name: 'editorVisited', title: 'Editor visited', type: 'boolean', group: 'editorial', initialValue: false}),
    defineField({
      name: 'lens', title: 'Lens (audience hooks)', type: 'array', of: [{type: 'string'}], group: 'editorial',
      options: {list: ['weekend-pick','date-idea','family-saturday','rainy-day','worth-the-drive','free','school-holidays','walk-in','ticketed','locals-know'].map(v=>({title:v,value:v}))},
    }),
    defineField({
      name: 'featuredInDispatch', title: 'Featured in dispatch', type: 'object', group: 'editorial',
      fields: [
        defineField({name: 'issue', title: 'Issue', type: 'string'}),
        defineField({name: 'note', title: 'Note', type: 'string'}),
      ],
    }),
    defineField({name: 'heroImage', title: 'Hero image', type: 'imageRef', group: 'editorial'}),

    // ── Core ────────────────────────────────────────────────────────────
    defineField({name: 'title', title: 'Title', type: 'string', group: 'core', validation: (R) => R.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', group: 'core', options: {source: 'title'}, validation: (R) => R.required()}),
    defineField({name: 'summary', title: 'Summary', type: 'text', rows: 3, group: 'core', validation: (R) => R.required()}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 5, group: 'core'}),
    defineField({name: 'eventId', title: 'Event ID', type: 'string', group: 'core', description: 'External ID for spreadsheet sync.'}),
    defineField({
      name: 'category', title: 'Category', type: 'string', group: 'core',
      options: {list: categoryOptions.map(v=>({title:v,value:v}))},
      validation: (R) => R.required(),
    }),
    defineField({name: 'subcategory', title: 'Subcategory', type: 'string', group: 'core'}),
    defineField({
      name: 'recurrence', title: 'Recurrence', type: 'string', group: 'core',
      options: {list: recurrenceOptions.map(v=>({title:v,value:v}))},
      initialValue: 'one-off',
    }),
    defineField({name: 'recurrenceNote', title: 'Recurrence note', type: 'string', group: 'core'}),

    // ── When ────────────────────────────────────────────────────────────
    defineField({name: 'startDate', title: 'Start date', type: 'datetime', group: 'when', validation: (R) => R.required()}),
    defineField({name: 'endDate', title: 'End date', type: 'datetime', group: 'when'}),
    defineField({name: 'startTime', title: 'Start time', type: 'string', group: 'when'}),
    defineField({name: 'endTime', title: 'End time', type: 'string', group: 'when'}),
    defineField({
      name: 'season', title: 'Season', type: 'string', group: 'when',
      options: {list: ['spring','summer','autumn','winter'].map(v=>({title:v,value:v}))},
    }),
    defineField({name: 'month', title: 'Month', type: 'string', group: 'when'}),
    defineField({name: 'nextOccurrence', title: 'Next occurrence', type: 'datetime', group: 'when', description: 'Auto-computed by cron for recurring events.'}),

    // ── Where ───────────────────────────────────────────────────────────
    defineField({name: 'venue', title: 'Venue', type: 'reference', to: [{type: 'venue'}], group: 'where', weak: true}),
    defineField({name: 'venueName', title: 'Venue name (unstructured)', type: 'string', group: 'where'}),
    defineField({name: 'place', title: 'Place', type: 'reference', to: [{type: 'place'}], group: 'where', weak: true}),
    defineField({name: 'venueRegion', title: 'Venue region', type: 'string', group: 'where'}),
    defineField({name: 'suburb', title: 'Suburb', type: 'string', group: 'where'}),
    defineField({name: 'streetAddress', title: 'Street address', type: 'string', group: 'where'}),
    defineField({name: 'coordinates', title: 'Coordinates', type: 'coordinates', group: 'where'}),
    defineField({name: 'indoorOutdoor', title: 'Indoor / outdoor', type: 'string', group: 'where'}),

    // ── Money ───────────────────────────────────────────────────────────
    defineField({name: 'bookingUrl', title: 'Booking URL', type: 'url', group: 'money'}),
    defineField({name: 'ticketingUrl', title: 'Ticketing URL', type: 'url', group: 'money'}),
    defineField({name: 'officialEventUrl', title: 'Official event URL(s)', type: 'string', group: 'money'}),
    defineField({name: 'bookingRequired', title: 'Booking required', type: 'string', group: 'money'}),
    defineField({name: 'freePaid', title: 'Free / paid', type: 'string', group: 'money'}),
    defineField({name: 'priceRange', title: 'Price range', type: 'string', group: 'money'}),
    defineField({
      name: 'priceTier', title: 'Price tier', type: 'string', group: 'money',
      options: {list: priceTierOptions.map(v=>({title:v,value:v}))},
    }),

    // ── Audience ────────────────────────────────────────────────────────
    defineField({name: 'suitableFor', title: 'Suitable for', type: 'string', group: 'audience'}),
    defineField({
      name: 'audienceTags', title: 'Audience tags', type: 'array', of: [{type: 'string'}], group: 'audience',
      options: {list: ['couples','families','solo','groups','first-timers','locals','cultural-visitors','foodies','all-ages','adults-only','art-lovers','music-fans'].map(v=>({title:v,value:v}))},
    }),
    defineField({name: 'familyFriendly', title: 'Family friendly', type: 'boolean', group: 'audience'}),
    defineField({name: 'petFriendly', title: 'Pet friendly', type: 'boolean', group: 'audience'}),
    defineField({name: 'accessibilityNotes', title: 'Accessibility notes', type: 'text', rows: 3, group: 'audience'}),
    defineField({
      name: 'weather', title: 'Weather', type: 'string', group: 'audience',
      options: {list: weatherOptions.map(v=>({title:v,value:v}))},
      initialValue: 'mixed',
    }),
    defineField({name: 'weatherDependency', title: 'Weather dependency', type: 'string', group: 'audience'}),
    defineField({
      name: 'weatherShape', title: 'Weather shape', type: 'string', group: 'audience',
      options: {list: ['all-weather','wet-friendly','fair-weather-only','unknown'].map(v=>({title:v,value:v}))},
    }),

    // ── Sources ─────────────────────────────────────────────────────────
    defineField({
      name: 'organiser', title: 'Organiser', type: 'object', group: 'sources',
      fields: [
        defineField({name: 'name', title: 'Name', type: 'string'}),
        defineField({name: 'website', title: 'Website', type: 'url'}),
        defineField({name: 'contact', title: 'Contact', type: 'string'}),
        defineField({name: 'instagram', title: 'Instagram', type: 'url'}),
        defineField({name: 'facebook', title: 'Facebook', type: 'url'}),
      ],
    }),
    defineField({name: 'primarySourceUrl', title: 'Primary source URL', type: 'string', group: 'sources'}),
    defineField({name: 'secondarySourceUrl', title: 'Secondary source URL', type: 'string', group: 'sources'}),
    defineField({name: 'verificationStatus', title: 'Verification status', type: 'string', group: 'sources'}),
    defineField({name: 'lastCheckedDate', title: 'Last checked', type: 'date', group: 'sources'}),
    defineField({name: 'visitorAppealScore', title: 'Visitor appeal score (0–5)', type: 'number', group: 'sources', validation: (R) => R.min(0).max(5)}),
    defineField({name: 'editorialPriority', title: 'Editorial priority (0–5)', type: 'number', group: 'sources', validation: (R) => R.min(0).max(5)}),
    defineField({name: 'nearbyAttractions', title: 'Nearby attractions', type: 'text', rows: 2, group: 'sources'}),
    defineField({name: 'suggestedItineraryPairing', title: 'Suggested itinerary pairing', type: 'text', rows: 2, group: 'sources'}),

    // ── Admin ───────────────────────────────────────────────────────────
    defineField({
      name: 'status', title: 'Status', type: 'string', group: 'admin',
      options: {list: statusOptions.map(v=>({title:v,value:v}))},
      initialValue: 'published',
    }),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime', group: 'admin', validation: (R) => R.required()}),
    defineField({name: 'internalNotes', title: 'Internal notes', type: 'text', rows: 3, group: 'admin'}),
    defineField({name: 'manualFollowUpRequired', title: 'Manual follow-up required', type: 'boolean', group: 'admin', initialValue: false}),
    defineField({name: 'sitemapExclude', title: 'Exclude from sitemap', type: 'boolean', group: 'admin', initialValue: false}),
  ],
  preview: {select: {title: 'title', subtitle: 'category', media: 'heroImage'}},
})
