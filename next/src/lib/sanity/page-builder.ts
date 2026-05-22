import {getSanityReadClient} from './client'
import {intentUrl, type ImageIntent} from './image'

export type PageTemplateType =
  | 'standardPage'
  | 'landingPage'
  | 'guidePage'
  | 'articlePage'
  | 'listingPage'
  | 'eventPage'
  | 'homepage'

export interface PageBuilderImage {
  asset?: {_id: string}
  alt?: string
  caption?: string
  credit?: string
  license?: string
}

export interface CmsPage {
  _id: string
  _type: 'page'
  title: string
  slug: string
  templateType: PageTemplateType
  seoTitle?: string
  seoDescription?: string
  ogImage?: PageBuilderImage
  noIndex?: boolean
  sections: Array<Record<string, unknown>>
}

const imageProjection = `{
  asset->{_id},
  alt,
  credit,
  caption,
  license
}`

const pageBySlugQuery = `*[
  _type == "page" &&
  slug.current == $slug &&
  !(_id in path("drafts.**"))
][0]{
  _id,
  _type,
  title,
  "slug": slug.current,
  templateType,
  seoTitle,
  seoDescription,
  "ogImage": ogImage ${imageProjection},
  noIndex,
  sections[]{
    ...,
    "image": image ${imageProjection},
    features[]{
      ...,
      "image": image ${imageProjection}
    },
    cards[]{
      ...,
      "image": image ${imageProjection}
    },
    manualReferences[]->{
      _id,
      _type,
      title,
      name,
      "slug": slug.current,
      dek,
      summary,
      intro,
      "image": select(
        defined(heroImage.asset) => heroImage ${imageProjection},
        defined(image.asset) => image ${imageProjection}
      )
    }
  }
}`

const previewPageBySlugQuery = `*[
  _type == "page" &&
  slug.current == $slug
] | order(_updatedAt desc)[0]{
  _id,
  _type,
  title,
  "slug": slug.current,
  templateType,
  seoTitle,
  seoDescription,
  "ogImage": ogImage ${imageProjection},
  noIndex,
  sections[]{
    ...,
    "image": image ${imageProjection},
    features[]{
      ...,
      "image": image ${imageProjection}
    },
    cards[]{
      ...,
      "image": image ${imageProjection}
    },
    manualReferences[]->{
      _id,
      _type,
      title,
      name,
      "slug": slug.current,
      dek,
      summary,
      intro,
      "image": select(
        defined(heroImage.asset) => heroImage ${imageProjection},
        defined(image.asset) => image ${imageProjection}
      )
    }
  }
}`

/** Lightweight query — slugs only, used by getStaticPaths to enumerate CMS pages. */
const allPageSlugsQuery = `*[_type == "page" && !(_id in path("drafts.**"))][].slug.current`

export function normalizePageSlug(pathname: string): string {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  return slug || 'home'
}

export function pagePathFromSlug(slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '')
  return clean === 'home' ? '/' : `/${clean}/`
}

export async function fetchPageBySlug(slug: string, preview = false): Promise<CmsPage | null> {
  const cleanSlug = slug.replace(/^\/+|\/+$/g, '') || 'home'
  return getSanityReadClient(preview).fetch(preview ? previewPageBySlugQuery : pageBySlugQuery, {slug: cleanSlug})
}

/**
 * Fetch all published CMS page slugs for getStaticPaths. Returns raw slugs
 * as stored in Sanity (no leading/trailing slashes). Used by [...slug].astro
 * to enumerate every CMS page at build time.
 *
 * The 'home' slug is excluded — index.astro handles the homepage directly.
 */
export async function fetchAllPageSlugsFromSanity(): Promise<string[]> {
  const slugs = (await getSanityReadClient().fetch(allPageSlugsQuery)) as (string | null)[]
  return (slugs ?? []).filter((s): s is string => Boolean(s) && s !== 'home')
}

export function imageUrl(image: PageBuilderImage | undefined | null, intent: ImageIntent = 'card'): string | undefined {
  if (!image?.asset?._id) return undefined
  return intentUrl(image, intent)
}

export function imageAlt(image: PageBuilderImage | undefined | null, fallback = ''): string {
  return image?.alt || fallback
}
