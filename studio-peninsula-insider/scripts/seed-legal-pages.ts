/**
 * Seed legalPage documents into Sanity.
 *
 * Creates one document per legal page, pre-populated with the existing
 * hardcoded content from the Astro pages. Idempotent — re-running will
 * overwrite with the seed data (so only use to initialise, not to sync
 * editor changes back).
 *
 *   Usage:
 *     SANITY_AUTH_TOKEN=<token> npx tsx scripts/seed-legal-pages.ts
 *
 *   Token needs write access to the production dataset.
 */
import {createClient} from '@sanity/client'

const client = createClient({
  projectId: 'a062b30n',
  dataset: 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_AUTH_TOKEN,
  useCdn: false,
})

// ---------------------------------------------------------------------------
// Helper to build a Portable Text block
// ---------------------------------------------------------------------------

type Mark = string
type BlockStyle = 'normal' | 'h2' | 'h3'

interface Span {
  _type: 'span'
  _key: string
  text: string
  marks?: Mark[]
}

interface PTBlock {
  _type: 'block'
  _key: string
  style: BlockStyle
  markDefs?: Array<{_type: string; _key: string; href?: string}>
  children: Span[]
  listItem?: 'bullet'
  level?: number
}

let keyCounter = 0
function key(): string {
  return `k${++keyCounter}`
}

function p(text: string, marks?: Mark[], markDefs?: PTBlock['markDefs']): PTBlock {
  return {
    _type: 'block', _key: key(), style: 'normal',
    markDefs: markDefs ?? [],
    children: [{_type: 'span', _key: key(), text, marks: marks ?? []}],
  }
}

function h2(text: string): PTBlock {
  return {_type: 'block', _key: key(), style: 'h2', markDefs: [], children: [{_type: 'span', _key: key(), text, marks: []}]}
}

function h3(text: string): PTBlock {
  return {_type: 'block', _key: key(), style: 'h3', markDefs: [], children: [{_type: 'span', _key: key(), text, marks: []}]}
}

function bullet(text: string): PTBlock {
  return {_type: 'block', _key: key(), style: 'normal', listItem: 'bullet', level: 1, markDefs: [], children: [{_type: 'span', _key: key(), text, marks: []}]}
}

// Paragraph with a mix of bold and linked spans. children provided directly.
function richP(markDefs: PTBlock['markDefs'], children: Span[]): PTBlock {
  return {_type: 'block', _key: key(), style: 'normal', markDefs: markDefs ?? [], children}
}

function span(text: string, marks: Mark[] = []): Span {
  return {_type: 'span', _key: key(), text, marks}
}

function linkDef(href: string): {_type: 'link'; _key: string; href: string} {
  const k = key()
  return {_type: 'link', _key: k, href}
}

// ---------------------------------------------------------------------------
// Privacy page body
// ---------------------------------------------------------------------------

const privacyFontsLink = linkDef('https://developers.google.com/fonts/faq/privacy')
const privacyEmailLink = linkDef('mailto:hello@peninsulainsider.com.au')
const privacyEmailLink2 = linkDef('mailto:hello@peninsulainsider.com.au')

const privacyBody: PTBlock[] = [
  p("Peninsula Insider is an independent editorial publication. We don't run display ads, we don't sell data, and we don't use third-party trackers. This policy explains the small amount of data we do collect and what happens to it."),

  h2('What we collect'),

  h3('Publication subscribers'),
  richP([], [
    span("When you subscribe to "),
    span("The Insider", ['em']),
    span(", we collect your "),
    span("email address", ['strong']),
    span(". That's it. We don't ask for your name, location, or anything else. Your email is stored with our email service provider and used solely to send you editorial editions."),
  ]),

  h3('Contact form and email'),
  p("If you email us - story tips, corrections, editorial enquiries - we receive whatever you choose to send. We store those emails in our editorial inbox and use them only for the purpose you wrote to us about. We don't add you to any mailing list unless you separately subscribe."),
  p("If you submit a Peninsula Day, story, photograph or editorial contribution to Peninsula Insider, you retain ownership of your content but grant us permission to review, store and potentially feature it within Peninsula Insider editorial coverage."),

  h3('Analytics'),
  p("We use privacy-respecting, cookie-free analytics to understand which pages are read and how visitors find the site. This data is aggregated and anonymous - we cannot identify individual visitors. No personal data is collected through analytics."),

  h2("What we don't collect"),
  bullet("We don't use cookies for tracking or advertising."),
  bullet("We don't run retargeting pixels or build user profiles."),
  bullet("We don't share, sell, or rent your email address to anyone, ever."),

  h2('Third-party services'),
  richP(
    [privacyFontsLink],
    [
      span("The site is hosted on "),
      span("GitHub Pages", ['strong']),
      span(". Fonts are served by "),
      span("Google Fonts", ['strong']),
      span(", which may log standard server request data (IP address, browser type) as described in "),
      span("Google's Fonts privacy FAQ", [privacyFontsLink._key]),
      span(". We have no access to that data."),
    ],
  ),
  p("Publication email delivery is handled by our email service provider, which processes your email address under a data-processing agreement with us. Your email is not shared with other clients or used for any purpose beyond delivering editorial editions."),

  h2('Affiliate and referral links'),
  p("Some Peninsula Insider pages may contain affiliate or referral links. Where this occurs, Peninsula Insider may earn a commission at no additional cost to the reader."),

  h2('Your rights'),
  richP([], [
    span("You can "),
    span("unsubscribe", ['strong']),
    span(" from The Insider at any time using the link at the bottom of every email. Once unsubscribed, your email address is removed from our active list."),
  ]),
  richP(
    [privacyEmailLink],
    [
      span("If you'd like us to delete any data we hold about you - including past emails you've sent us - write to "),
      span("hello@peninsulainsider.com.au", [privacyEmailLink._key]),
      span(" and we'll action it within 30 days."),
    ],
  ),

  h2('Australian Privacy Act'),
  richP([], [
    span("Peninsula Insider complies with the Australian Privacy Principles (APPs) under the "),
    span("Privacy Act 1988", ['em']),
    span(" (Cth). We are a small publication and the data we collect is minimal, but we take the obligations seriously."),
  ]),

  h2('Changes to this policy'),
  p("If we change this policy in any material way, we'll note the update date at the top of this page and, where practical, mention it in The Insider. We won't retroactively weaken your protections without consent."),

  h2('Contact'),
  richP(
    [privacyEmailLink2],
    [
      span("Questions about this policy: "),
      span("hello@peninsulainsider.com.au", [privacyEmailLink2._key]),
    ],
  ),
]

// ---------------------------------------------------------------------------
// Documents to seed
// ---------------------------------------------------------------------------

const pages = [
  {
    _id: 'legalPage-privacy',
    _type: 'legalPage',
    slug: {_type: 'slug', current: 'privacy'},
    title: 'Privacy Policy',
    eyebrow: 'Privacy',
    seoDescription: "How Peninsula Insider collects, stores, and uses your data. Short version: barely any, and never sold.",
    lastUpdated: '2026-05-15',
    body: privacyBody,
  },
]

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function seed() {
  for (const doc of pages) {
    console.log(`Seeding ${doc._id}…`)
    await client.createOrReplace(doc as any)
    console.log(`  Done.`)
  }
  console.log('All legal pages seeded.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
