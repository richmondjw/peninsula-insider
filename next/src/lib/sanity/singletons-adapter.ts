/**
 * Sanity adapters for page-level singletons.
 *
 *   - homepageCover  -> drives index.astro's <section class="cover">
 *   - megaRail       -> drives V4MegaRail.astro
 *   - siteSettings   -> drives masthead label, edition, footer links, brand imagery
 *   - pageHero(slug) -> drives the SubpageHero override for a given hub
 */
import {getSanityReadClient, sanityClient} from './client'
import {intentUrl} from './image'

type FetchOpts = {preview?: boolean}

const img = `{ asset->{_id}, alt, credit, caption, license }`

type SanityImageRef = {
  asset?: {_id: string}
  alt?: string | null
  credit?: string | null
  caption?: string | null
  license?: string | null
} | null

interface StegaCtx {
  docId: string
  docType: string
  path: string
}

/**
 * Strip zero-width Unicode characters that vercelStegaCombine embeds into URLs
 * for the admin edit overlay. These chars are invisible in text but corrupt
 * CDN image URLs — Sanity CDN does not strip them, causing images to 404.
 * Strip from any URL before using as an <img src>.
 */
function cleanSrc(url: string): string {
  // U+200B, U+200C, U+200D zero-width space/non-joiner/joiner + U+FEFF BOM
  return url.replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
}

function imageOrFallback(
  image: SanityImageRef,
  fallback: string,
  fallbackAlt: string,
  ctx?: StegaCtx,
) {
  if (!image?.asset) return {src: fallback, alt: fallbackAlt}
  return {src: cleanSrc(intentUrl(image, 'hero', ctx)), alt: image.alt ?? fallbackAlt}
}

/** Small-icon variant: thumb-intent URL (320w), suits logos / avatars. */
function iconOrFallback(
  image: SanityImageRef,
  fallback: string,
  fallbackAlt: string,
  ctx?: StegaCtx,
) {
  if (!image?.asset) return {src: fallback, alt: fallbackAlt}
  return {src: cleanSrc(intentUrl(image, 'thumb', ctx)), alt: image.alt ?? fallbackAlt}
}

/** OG-intent (1200x630) variant for share-card fallback imagery. */
function ogOrFallback(
  image: SanityImageRef,
  fallback: string,
  fallbackAlt: string,
  ctx?: StegaCtx,
) {
  if (!image?.asset) return {src: fallback, alt: fallbackAlt}
  return {src: cleanSrc(intentUrl(image, 'og', ctx)), alt: image.alt ?? fallbackAlt}
}

// Homepage cover ----------------------------------------------------------

const homepageCoverQuery = `*[_id == "homepageCover"][0]{
  activeSceneIndex,
  coverDate,
  scenes[]{
    id, label, hours, caption, headline, dispatch, primaryHref, primaryLabel,
    "image": image ${img}
  }
}`

export interface HomepageCoverScene {
  id: string
  label: string
  hours: string
  image: string
  imageAlt: string
  caption: string
  headline: string
  dispatch: string
  primaryHref: string
  primaryLabel: string
}

export async function fetchHomepageCoverFromSanity(opts: FetchOpts = {}): Promise<{
  scenes: HomepageCoverScene[]
  activeIndex: number
  coverDate: string | null
} | null> {
  // Homepage cover edits are made from the live-site admin overlay. Use the
  // fresh published client here so an immediate refresh after an image patch
  // does not re-render from Sanity CDN's stale copy.
  const d: any = await (opts.preview ? getSanityReadClient(true) : sanityClient).fetch(homepageCoverQuery)
  if (!d?.scenes?.length) return null
  return {
    scenes: d.scenes.map((s: any, idx: number) => {
      const i = imageOrFallback(s.image, '/images/sourced/home-cover.webp', s.label ?? '', {
        docId: 'homepageCover',
        docType: 'homepageCover',
        path: `scenes[${idx}].image`,
      })
      return {
        id: s.id ?? '',
        label: s.label ?? '',
        hours: s.hours ?? '',
        image: i.src,
        imageAlt: i.alt,
        caption: s.caption ?? '',
        headline: s.headline ?? '',
        dispatch: s.dispatch ?? '',
        primaryHref: s.primaryHref ?? '#',
        primaryLabel: s.primaryLabel ?? 'Read',
      }
    }),
    activeIndex: d.activeSceneIndex ?? 0,
    coverDate: d.coverDate ?? null,
  }
}

// Mega-rail ---------------------------------------------------------------

const megaRailQuery = `*[_id == "megaRail"][0]{
  entries[]{
    key, label, href, eyebrow,
    "image": image ${img}
  }
}`

export interface MegaRailEntry {
  key: string
  label: string
  href: string
  eyebrow?: string
  imageSrc?: string
  imageAlt?: string
}

export async function fetchMegaRailFromSanity(opts: FetchOpts = {}): Promise<MegaRailEntry[] | null> {
  const d: any = await (opts.preview ? getSanityReadClient(true) : sanityClient).fetch(megaRailQuery)
  if (!d?.entries?.length) return null
  return d.entries.map((e: any, idx: number) => {
    if (!e.image?.asset) return {key: e.key, label: e.label, href: e.href, eyebrow: e.eyebrow}
    const i = imageOrFallback(e.image, '', e.label ?? '', {
      docId: 'megaRail',
      docType: 'megaRail',
      path: `entries[${idx}].image`,
    })
    return {
      key: e.key,
      label: e.label,
      href: e.href,
      eyebrow: e.eyebrow,
      imageSrc: i.src,
      imageAlt: i.alt,
    }
  })
}

// Site settings -----------------------------------------------------------

const siteSettingsQuery = `*[_id == "siteSettings"][0]{
  mastheadLabel, tagline, editionLabel, edition, editionYear, social,
  footerLinks[]{label, href},
  "logo": logo ${img},
  "conciergeAvatar": conciergeAvatar ${img},
  "ogFallback": ogFallback ${img},
  "notFoundImage": notFoundImage ${img}
}`

// Hardcoded paths preserved so any consumer that lands before the doc is
// seeded renders byte-identically to the current static markup.
const LOGO_FALLBACK = '/images/pi-logo-new.svg'
const CONCIERGE_FALLBACK = '/images/pi-concierge.svg'
const OG_FALLBACK = '/images/sourced/home-cover.webp'
const NOT_FOUND_FALLBACK = '/images/pi-concierge.svg'

export interface SiteSettingsImage {
  src: string
  alt: string
}

export interface SiteSettings {
  mastheadLabel: string
  tagline: string
  editionLabel?: string
  edition?: string
  editionYear?: number
  footerLinks: Array<{label: string; href: string}>
  social: {instagram?: string; facebook?: string; twitter?: string}
  logo: SiteSettingsImage
  conciergeAvatar: SiteSettingsImage
  ogFallback: SiteSettingsImage
  notFoundImage: SiteSettingsImage
}

export async function fetchSiteSettingsFromSanity(opts: FetchOpts = {}): Promise<SiteSettings | null> {
  const d: any = await (opts.preview ? getSanityReadClient(true) : sanityClient).fetch(siteSettingsQuery)
  if (!d) return null
  return {
    mastheadLabel: d.mastheadLabel ?? 'Peninsula Insider',
    tagline: d.tagline ?? 'An editorial guide, not a directory.',
    editionLabel: d.editionLabel ?? undefined,
    edition: d.edition ?? undefined,
    editionYear: d.editionYear ?? undefined,
    footerLinks: d.footerLinks ?? [],
    social: d.social ?? {},
    logo: iconOrFallback(d.logo, LOGO_FALLBACK, 'Peninsula Insider', {
      docId: 'siteSettings', docType: 'siteSettings', path: 'logo',
    }),
    conciergeAvatar: iconOrFallback(d.conciergeAvatar, CONCIERGE_FALLBACK, '', {
      docId: 'siteSettings', docType: 'siteSettings', path: 'conciergeAvatar',
    }),
    ogFallback: ogOrFallback(d.ogFallback, OG_FALLBACK, 'Peninsula Insider', {
      docId: 'siteSettings', docType: 'siteSettings', path: 'ogFallback',
    }),
    notFoundImage: iconOrFallback(d.notFoundImage, NOT_FOUND_FALLBACK, '', {
      docId: 'siteSettings', docType: 'siteSettings', path: 'notFoundImage',
    }),
  }
}

/** Default values used when the singleton doc hasn't been seeded yet -
 *  exposed for consumers that want to render without a network round-trip. */
export const SITE_SETTINGS_IMAGE_FALLBACKS = {
  logo: {src: LOGO_FALLBACK, alt: 'Peninsula Insider'} as SiteSettingsImage,
  conciergeAvatar: {src: CONCIERGE_FALLBACK, alt: ''} as SiteSettingsImage,
  ogFallback: {src: OG_FALLBACK, alt: 'Peninsula Insider'} as SiteSettingsImage,
  notFoundImage: {src: NOT_FOUND_FALLBACK, alt: ''} as SiteSettingsImage,
}

// Page hero ---------------------------------------------------------------

const pageHeroQuery = `*[_type == "pageHero" && pathSlug == $slug][0]{
  _id, pathSlug, title, eyebrow, category, dek,
  "image": image ${img}
}`

export async function fetchPageHeroFromSanity(slug: string, opts: FetchOpts = {}): Promise<{
  title?: string
  eyebrow?: string
  category?: string
  dek?: string
  imageSrc?: string
  imageAlt?: string
} | null> {
  const d: any = await (opts.preview ? getSanityReadClient(true) : sanityClient).fetch(pageHeroQuery, {slug})
  if (!d) return null
  let imageSrc: string | undefined
  let imageAlt: string | undefined
  if (d.image?.asset) {
    const i = imageOrFallback(d.image, '', d.title ?? slug, {
      docId: d._id,
      docType: 'pageHero',
      path: 'image',
    })
    imageSrc = i.src
    imageAlt = i.alt
  }
  return {
    title: d.title ?? undefined,
    eyebrow: d.eyebrow ?? undefined,
    category: d.category ?? undefined,
    dek: d.dek ?? undefined,
    imageSrc,
    imageAlt,
  }
}
