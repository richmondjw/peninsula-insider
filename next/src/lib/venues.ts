/**
 * Venue helpers — opening-hours freshness, live-status URL fallback, and
 * verification chip copy. Discovery Layer Phase 1, workstream 3.
 *
 * Kept separate from editorial.ts because that module is generic across all
 * collections; this is venue-specific.
 */

import type { CollectionEntry } from 'astro:content';

export type Venue = CollectionEntry<'venues'>;

/**
 * Build a Google Maps search URL for a venue. Used as the live-status link
 * fallback when no explicit `liveStatusUrl` is set on the venue. Lands on
 * Google's place card where current open/closed state and hours are kept
 * fresh by Google's own data pipeline.
 */
export function googleMapsSearchUrl(name: string, address?: string | null): string {
  const query = [name, address, 'Mornington Peninsula', 'VIC', 'Australia']
    .filter((part) => part && String(part).trim().length > 0)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Resolve the live-status URL for a venue: explicit override first, then a
 * Google Maps fallback. Always returns a usable URL.
 */
export function resolveLiveStatusUrl(data: Venue['data']): string {
  if (data.liveStatusUrl && data.liveStatusUrl.trim()) {
    return data.liveStatusUrl.trim();
  }
  return googleMapsSearchUrl(data.name, data.address);
}

/**
 * Return a short freshness label for the venue's `lastVerified` date.
 * Optimised for legibility in a card chip or sidebar row:
 *   - "Verified this month" (≤ 35 days old)
 *   - "Verified [Mon] [YYYY]" otherwise
 *
 * The 35-day threshold rather than "this calendar month" handles the awkward
 * "verified yesterday but it's the 1st of next month" case where the calendar
 * answer would say "last month" even though the data is one day old.
 */
export function verifiedFreshnessLabel(lastVerified: Date | string | undefined): string | null {
  if (!lastVerified) return null;
  const date = typeof lastVerified === 'string' ? new Date(lastVerified) : lastVerified;
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 35) return 'Verified this month';
  return `Verified ${date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`;
}

/**
 * "How fresh" tier — used to colour the verification chip on cards.
 *   - 'fresh': verified in the last 35 days
 *   - 'recent': 36–120 days
 *   - 'stale': 121+ days (or unknown)
 *
 * The aim is to give readers a fast, honest signal about how recently the
 * editorial team confirmed the venue's status, without presenting a precise
 * age that would imply more accuracy than the verification rhythm warrants.
 */
export function verificationFreshness(
  lastVerified: Date | string | undefined,
): 'fresh' | 'recent' | 'stale' {
  if (!lastVerified) return 'stale';
  const date = typeof lastVerified === 'string' ? new Date(lastVerified) : lastVerified;
  if (Number.isNaN(date.getTime())) return 'stale';
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 35) return 'fresh';
  if (days <= 120) return 'recent';
  return 'stale';
}
