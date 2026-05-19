/**
 * Sanity adapters for page-level singletons.
 *
 *   - homepageCover  → drives index.astro's <section class="cover">
 *   - megaRail       → drives V4MegaRail.astro
 *   - siteSettings   → drives masthead label, edition, footer links
 *   - pageHero(slug) → drives the SubpageHero override for a given hub
 */
import {getSanityReadClient} from './client'
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

function imageOrFallback(image: SanityImageRef, fallback: string, fallbackAlt: string) {
  if (!image?.asset) return {src: fallback, alt: fallbackAlt}
  return {src: intentUrl(image, 'hero'), alt: image.alt ?? fallbackAlt}
}

// ── Homepage cover ───────────────────────────────────────────────────────

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
  const d: any = await getSanityReadClient(opts.preview).fetch(homepageCoverQuery)
  if (!d?.scenes?.length) return null
  return {
    scenes: d.scenes.map((s: any) => {
      const i = imageOrFallback(s.image, '/images/sourced/home-cover.webp', s.label ?? '')
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

// ── Mega-rail ────────────────────────────────────────────────────────────

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
  const d: any = await getSanityReadClient(opts.preview).fetch(megaRailQuery)
  if (!d?.entries?.length) return null
  return d.entries.map((e: any) => {
    if (!e.image?.asset) return {key: e.key, label: e.label, href: e.href, eyebrow: e.eyebrow}
    const i = imageOrFallback(e.image, '', e.label ?? '')
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

// ── Site settings ────────────────────────────────────────────────────────

const siteSettingsQuery = `*[_id == "siteSettings"][0]{
  mastheadLabel, tagline, editionLabel, edition, editionYear, social,
  footerLinks[]{label, href}
}`

export interface SiteSettings {
  mastheadLabel: string
  tagline: string
  editionLabel?: string
  edition?: string
  editionYear?: number
  footerLinks: Array<{label: string; href: string}>
  social: {instagram?: string; facebook?: string; twitter?: string}
}

export async function fetchSiteSettingsFromSanity(opts: FetchOpts = {}): Promise<SiteSettings | null> {
  const d: any = await getSanityReadClient(opts.preview).fetch(siteSettingsQuery)
  if (!d) return null
  return {
    mastheadLabel: d.mastheadLabel ?? 'Peninsula Insider',
    tagline: d.tagline ?? 'An editorial guide, not a directory.',
    editionLabel: d.editionLabel ?? undefined,
    edition: d.edition ?? undefined,
    editionYear: d.editionYear ?? undefined,
    footerLinks: d.footerLinks ?? [],
    social: d.social ?? {},
  }
}

// ── Page hero ────────────────────────────────────────────────────────────

const pageHeroQuery = `*[_type == "pageHero" && pathSlug == $slug][0]{
  pathSlug, title, eyebrow, category, dek,
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
  const d: any = await getSanityReadClient(opts.preview).fetch(pageHeroQuery, {slug})
  if (!d) return null
  let imageSrc: string | undefined
  let imageAlt: string | undefined
  if (d.image?.asset) {
    const i = imageOrFallback(d.image, '', d.title ?? slug)
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
