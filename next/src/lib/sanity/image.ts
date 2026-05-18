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
import {sanityClient} from './client'

const builder = imageUrlBuilder(sanityClient)

export type ImageIntent = 'hero' | 'card' | 'thumb' | 'gallery' | 'og'

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

/** Convenience: build the canonical URL for a given intent. */
export function intentUrl(source: SanityImageSource, intent: ImageIntent): string {
  const cfg = intentDefaults[intent]
  let b = builder.image(source).width(cfg.width).auto('format').fit('max')
  if (cfg.height) b = b.height(cfg.height).fit('crop')
  return b.quality(cfg.quality).url()
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
