/**
 * Build responsive public-image URLs without proxying or copying assets.
 *
 * Supabase public object URLs can be transformed by the same public storage
 * service. Keep non-Supabase and signed/private URLs untouched so this helper
 * never changes their access semantics.
 */

const PUBLIC_OBJECT_PATH = '/storage/v1/object/public/';
const PUBLIC_RENDER_PATH = '/storage/v1/render/image/public/';

export function isTransformablePublicImage(src) {
  if (typeof src !== 'string' || src.length === 0) return false;
  try {
    const url = new URL(src);
    return url.protocol === 'https:'
      && url.hostname.endsWith('.supabase.co')
      && url.pathname.startsWith(PUBLIC_OBJECT_PATH);
  } catch {
    return false;
  }
}

export function transformedPublicImage(src, { width, height, quality = 75 } = {}) {
  if (!isTransformablePublicImage(src)) return src;
  const parsedWidth = Number(width);
  const parsedHeight = Number(height);
  if (!Number.isFinite(parsedWidth) || parsedWidth <= 0 || !Number.isFinite(parsedHeight) || parsedHeight <= 0) {
    return src;
  }
  const w = Math.max(1, Math.round(parsedWidth));
  const h = Math.max(1, Math.round(parsedHeight));
  const q = Math.min(100, Math.max(20, Math.round(Number(quality) || 75)));

  const url = new URL(src);
  url.pathname = url.pathname.replace(PUBLIC_OBJECT_PATH, PUBLIC_RENDER_PATH);
  url.searchParams.set('width', String(w));
  url.searchParams.set('height', String(h));
  url.searchParams.set('resize', 'cover');
  url.searchParams.set('quality', String(q));
  return url.toString();
}

export function responsivePublicImage(
  src,
  {
    widths = [320, 480, 640, 960],
    aspectRatio = 3 / 2,
    quality = 75,
    fallbackWidth = 640,
    sizes = '(max-width: 48rem) 100vw, (max-width: 72rem) 50vw, 33vw',
  } = {},
) {
  if (!isTransformablePublicImage(src)) {
    return { src, srcset: undefined, sizes: undefined };
  }

  if (!Number.isFinite(Number(aspectRatio)) || Number(aspectRatio) <= 0) {
    return { src, srcset: undefined, sizes: undefined };
  }

  const cleanWidths = [...new Set(widths)]
    .map((width) => Math.max(1, Math.round(Number(width) || 0)))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const heightFor = (width) => Math.max(1, Math.round(width / aspectRatio));
  const render = (width) => transformedPublicImage(src, {
    width,
    height: heightFor(width),
    quality,
  });

  return {
    src: render(fallbackWidth),
    srcset: cleanWidths.map((width) => `${render(width)} ${width}w`).join(', '),
    sizes,
  };
}
