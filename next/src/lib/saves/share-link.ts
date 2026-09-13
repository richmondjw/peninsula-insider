/**
 * Peninsula Insider - share-by-link encoding.
 *
 * Shareable plans are encoded into the URL itself, no server-side storage
 * required. Format:
 *
 *   /plan/?p=<base64url-encoded JSON>
 *
 * The encoded payload is a minimal projection of each saved item - kind,
 * slug, section, title, href, image - enough to render a read-only plan
 * card. A recipient can fork the plan into their own saves with one tap;
 * the recipient's local store stays the source of truth, and the
 * recipient does not need an account.
 *
 * Wave 4 of the Save & Share rebuild.
 */

import type { SavedItem } from './store';

export type SharedItem = Pick<
  SavedItem,
  'kind' | 'slug' | 'section' | 'title' | 'dek' | 'image_url' | 'href'
>;

export interface SharedPlan {
  v: 1;
  ts: number;
  items: SharedItem[];
}

/** Encode a list of saved items into a base64url-safe payload string. */
export function encodePlan(items: SavedItem[]): string {
  const payload: SharedPlan = {
    v: 1,
    ts: Date.now(),
    items: items.map((it) => ({
      kind: it.kind,
      slug: it.slug,
      section: it.section,
      title: it.title,
      dek: it.dek,
      image_url: it.image_url,
      href: it.href,
    })),
  };
  const json = JSON.stringify(payload);
  return base64UrlEncode(json);
}

/**
 * A shared plan arrives from an untrusted URL. Anyone can craft one and send
 * the link to a reader. Everything below treats the payload as hostile.
 *
 * The kinds a shared item may claim. Mirrors SaveKind in ./store.
 */
const SHARED_KINDS = new Set([
  'article',
  'venue',
  'place',
  'event',
  'experience',
  'itinerary',
  'tour',
  'tour-operator',
  'tour-package',
]);

/**
 * Saved hrefs are always site-relative paths built by us (`/eat/foo/`), so a
 * shared href may only ever be one of those.
 *
 * This is an allowlist on purpose. HTML-escaping a href does not make it safe:
 * `javascript:` and `data:` URLs contain none of the characters an escaper
 * replaces, so they survive it intact and stay clickable. Blocking a list of
 * bad schemes is also the wrong shape, because it fails open on whatever is
 * not on the list. Requiring a single leading slash accepts exactly what we
 * generate and rejects every scheme, plus protocol-relative `//evil.test`
 * links that would otherwise leave the site.
 */
function safeInternalHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (!href.startsWith('/')) return null;
  if (href.startsWith('//')) return null;
  // Control characters can be used to break a parser's scheme detection.
  if (/[\u0000-\u001F\u007F]/.test(href)) return null;
  return href;
}

/**
 * Images are a separate case from links. Saved covers are sometimes absolute
 * URLs on the Supabase storage host rather than site-relative paths, so the
 * href rule above would strip every shared image.
 *
 * A src still must not carry a scheme that can execute or smuggle content, so
 * this allows exactly two shapes: a site-relative path, or an https URL.
 * That rejects javascript:, data:, blob: and plain http.
 */
function safeImageSrc(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const src = value.trim();
  if (/[\u0000-\u001F\u007F]/.test(src)) return undefined;
  if (src.startsWith('//')) return undefined;
  if (src.startsWith('/')) return src;
  if (src.startsWith('https://')) return src;
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Validate one item. Returns null for anything malformed, so a single bad
 * entry drops out instead of throwing and blanking the whole page.
 */
function sanitiseSharedItem(raw: unknown): SharedItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const it = raw as Record<string, unknown>;

  if (typeof it.kind !== 'string' || !SHARED_KINDS.has(it.kind)) return null;
  if (typeof it.slug !== 'string' || !it.slug) return null;
  if (typeof it.title !== 'string' || !it.title) return null;

  const href = safeInternalHref(it.href);
  if (!href) return null;

  return {
    kind: it.kind as SharedItem['kind'],
    slug: it.slug,
    section: optionalString(it.section),
    title: it.title,
    dek: optionalString(it.dek),
    image_url: safeImageSrc(it.image_url),
    href,
  };
}

/**
 * Decode a payload back to a SharedPlan. Returns null on malformed input.
 *
 * Every item is validated here, at the trust boundary, rather than at each
 * render site. That matters because a recipient can fork a shared plan into
 * their own store: sanitising only on render would let a hostile href be
 * persisted and then re-rendered later from a surface that trusts its own
 * saved data.
 */
export function decodePlan(encoded: string | null | undefined): SharedPlan | null {
  if (!encoded) return null;
  try {
    const json = base64UrlDecode(encoded);
    const parsed = JSON.parse(json);
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return null;

    const items = parsed.items
      .map(sanitiseSharedItem)
      .filter((it: SharedItem | null): it is SharedItem => it !== null);

    return { v: 1, ts: typeof parsed.ts === 'number' ? parsed.ts : 0, items };
  } catch {
    return null;
  }
}

/** Build the full shareable URL for a plan. */
export function buildShareUrl(items: SavedItem[], origin?: string): string {
  const o = origin ?? (typeof location !== 'undefined' ? location.origin : 'https://peninsulainsider.com.au');
  return `${o}/plan/?p=${encodePlan(items)}`;
}

// --------------------------------------------------------------------------
// base64url helpers (no padding)
// --------------------------------------------------------------------------

function base64UrlEncode(input: string): string {
  if (typeof btoa === 'undefined') {
    // Node fallback for SSR contexts
    return Buffer.from(input, 'utf-8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  // Browser path - encode as UTF-8 first to handle multi-byte characters
  const utf8 = unescape(encodeURIComponent(input));
  return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  if (typeof atob === 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf-8');
  }
  return decodeURIComponent(escape(atob(padded)));
}
