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

/** Decode a payload back to a SharedPlan. Returns null on malformed input. */
export function decodePlan(encoded: string | null | undefined): SharedPlan | null {
  if (!encoded) return null;
  try {
    const json = base64UrlDecode(encoded);
    const parsed = JSON.parse(json);
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return null;
    return parsed as SharedPlan;
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
