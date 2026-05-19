/**
 * Peninsula Insider — Sanity image URL helper.
 *
 * Generates responsive image URLs from Sanity's Asset Pipeline with the
 * site's standard transform conventions baked in. Always emits AVIF/WebP
 * with sensible quality + format negotiation.
 *
 * Intents (size + crop bias) map to the surfaces where images appear so
 * call sites don't sprinkle pixel widths through templates:
 *
 *   hero    1920w, full-bleed editorial cover
 *   card    800w, listing card / hub rail
 *   thumb   320w, small inline thumbnail
 *   gallery 1200w, lightbox-friendly mid-size
 *   og      1200x630, Open Graph social card
 */
import imageUrlBuilder from '@sanity/image-url'
import type {SanityImageSource} from '@sanity/image-url/lib/types/types'
import {vercelStegaCombine} from '@vercel/stega'
import {sanityClient} from './client'

const builder = imageUrlBuilder(sanityClient)

const STUDIO_URL = 'https://peninsula-insider.sanity.studio'

export type ImageIntent = 'hero' | 'card' | 'thumb' | 'gallery' | 'og'

/**
 * Optional source-document context for stega-encoding the generated image
 * URL. When provided, intentUrl appends an invisible stega payload pointing
 * at the Studio intent URL for the underlying field, so the admin overlay's
 * stega-fallback resolver can decode docId + fieldPath off the rendered
 * <img src> even when the element lacks explicit `data-pi-edit` attrs.
 *
 * The encoded payload is whitespace-zero-width chars appended to the URL;
 * browsers, the Sanity CDN, and any consumer that trims/normalises the
 * string all ignore it.
 */
export interface SanitySourceContext {
  /** Sanity document `_id` */
  docId: string
  /** Sanity document `_type` (used to populate the Studio intent URL) */
  docType: string
  /** Dot/bracket-notation path to the image field (e.g. `heroImage`, `gallery[0]`) */
  path: string
}

const intentDefaults: Record<
  ImageIntent,
  {width: number; height?: number; quality: number}
> = {
  hero: {width: 1920, quality: 82},
  card: {width: 800, quality: 78},
  thumb: {width: 320, quality: 75},
  gallery: {width: 1200, quality: 80},
  og: {width: 1200, height: 630, quality: 82},
}

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

/**
 * Build a Sanity Studio intent URL for an `edit` action on the given doc + path.
 * Shape mirrors what @sanity/client's stega encoder emits, so the admin
 * overlay's `parseStudioIntentHref()` decodes it identically.
 */
function buildStudioIntentHref(ctx: SanitySourceContext): string {
  const segment = `id=${ctx.docId};type=${ctx.docType};path=${ctx.path}`
  return `${STUDIO_URL}/intent/edit/${encodeURIComponent(segment)}`
}

/**
 * Wrap a URL with a stega-encoded Sanity source marker, when context is
 * provided. Safe no-op when ctx is undefined.
 */
// withStega was a no-op for ctx=undefined, otherwise appended Sanity
// stega chars to the URL. Disabled because those invisible chars broke
// CSS `background-image: url(...)` parsing across dozens of components.
// Admin overlay binds via explicit data-pi-edit / data-pi-sanity-
// singleton-* attrs / pi.image_bindings, so the stega fallback isn't
// needed. Signature kept so call sites compile unchanged.
function withStega(url: string, _ctx?: SanitySourceContext): string {
  void _ctx
  return url
}
// Reference imports so build doesn't complain about them being unused.
void vercelStegaCombine
void buildStudioIntentHref

/** Convenience: build the canonical URL for a given intent. */
export function intentUrl(
  source: SanityImageSource,
  intent: ImageIntent,
  ctx?: SanitySourceContext,
): string {
  const cfg = intentDefaults[intent]
  let b = builder.image(source).width(cfg.width).auto('format').fit('max')
  if (cfg.height) b = b.height(cfg.height).fit('crop')
  return withStega(b.quality(cfg.quality).url(), ctx)
}

/**
 * Build a responsive srcset for a given intent. Returns the `src` + `srcset`
 * + `sizes` strings ready to drop on an `<img>` tag.
 */
export function responsiveSrc(
  source: SanityImageSource,
  intent: ImageIntent,
): {src: string; srcset: string; sizes: string} {
  const baseWidth = intentDefaults[intent].width
  const quality = intentDefaults[intent].quality

  // Three steps: 0.5x, 1x, 1.5x. The 1.5x covers HiDPI without doubling the
  // payload. Astro is already responsible for `<picture>` source format
  // selection at the component layer.
  const widths = [Math.round(baseWidth * 0.5), baseWidth, Math.round(baseWidth * 1.5)]
  const srcset = widths
    .map(
      (w) =>
        `${builder.image(source).width(w).auto('format').fit('max').quality(quality).url()} ${w}w`,
    )
    .join(', ')

  const src = builder
    .image(source)
    .width(baseWidth)
    .auto('format')
    .fit('max')
    .quality(quality)
    .url()

  const sizes =
    intent === 'hero'
      ? '100vw'
      : intent === 'card'
        ? '(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw'
        : intent === 'thumb'
          ? '320px'
          : intent === 'gallery'
            ? '(max-width: 720px) 100vw, 1200px'
            : '1200px'

  return {src, srcset, sizes}
}

/**
 * Low-quality image placeholder URL. 20px wide, very-compressed, blurred —
 * suitable for use as the initial `src` while the real image loads, giving
 * users a colour-correct shape during the transfer.
 */
export function lqipUrl(source: SanityImageSource): string {
  return builder.image(source).width(20).quality(20).blur(50).auto('format').url()
}
