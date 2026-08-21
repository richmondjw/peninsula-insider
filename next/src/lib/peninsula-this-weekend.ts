/**
 * peninsula-this-weekend.ts
 *
 * Helpers for the rolling "Peninsula This Weekend" surface
 * (Brief 2 / Wave 2 staging push, 2026-05-10).
 *
 * The dispatch lived at /journal/peninsula-this-weekend-{date}/ - a
 * weekly-changing URL that AI assistants and external sources could
 * not reliably link to as "this weekend on the Peninsula". The new
 * pattern:
 *
 *   /whats-on/this-weekend/                       (rolling - always latest)
 *   /whats-on/this-weekend/archive/YYYY-MM-DD/    (per-week archive)
 *
 * The journal URL emits a redirect into the dated archive so inbound
 * traffic continues to resolve.
 */

import { routeSlug } from './editorial';

/**
 * True when an article looks like a Peninsula This Weekend dispatch.
 * Format gates the layer; slug prefix gates the URL pattern (so a
 * legacy weekend-picker that doesn't follow the URL pattern won't
 * be wrongly redirected).
 */
export function isPeninsulaThisWeekend(article: any): boolean {
  if (!article?.data) return false;
  if (article.data.format !== 'weekend-picker') return false;
  const slug = routeSlug(article);
  return slug.startsWith('peninsula-this-weekend');
}

/**
 * Stable archive slug for a PTW article - ISO date string (YYYY-MM-DD)
 * derived from publishedAt. Stable, sortable, and machine-readable so
 * AI assistants can resolve "Peninsula This Weekend for May 9" cleanly.
 */
export function ptwArchiveSlug(article: any): string {
  const d: Date = article.data.publishedAt;
  if (!(d instanceof Date)) return 'undated';
  return d.toISOString().split('T')[0];
}

/**
 * Canonical archive path for a PTW article.
 */
export function ptwArchivePath(article: any): string {
  return `/whats-on/this-weekend/archive/${ptwArchiveSlug(article)}/`;
}

/**
 * Sort PTW articles latest-first.
 */
export function sortPtwLatestFirst(articles: any[]): any[] {
  return [...articles].sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
}

/**
 * Pick the most recent PTW dispatch from the articles collection.
 * Returns null when no PTW articles exist.
 */
export function selectLatestPtw(articles: any[]): any | null {
  const ptw = articles.filter(isPeninsulaThisWeekend);
  if (ptw.length === 0) return null;
  return sortPtwLatestFirst(ptw)[0];
}

/**
 * Friday-of-weekend from publishedAt. PTW publishes Wed/Thu typically;
 * the "weekend window" is Friday-Sunday. We compute the next Friday on
 * or after publishedAt so the archive page can label its weekend window
 * cleanly.
 */
export function ptwWeekendFriday(article: any): Date {
  const d = new Date(article.data.publishedAt.getTime());
  while (d.getUTCDay() !== 5) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

/**
 * Friendly "9–10 May" weekend label.
 */
export function ptwWeekendLabel(article: any): string {
  const fri = ptwWeekendFriday(article);
  const sat = new Date(fri);
  sat.setUTCDate(fri.getUTCDate() + 1);
  const sun = new Date(fri);
  sun.setUTCDate(fri.getUTCDate() + 2);
  const monthFmt = new Intl.DateTimeFormat('en-AU', { month: 'long', timeZone: 'UTC' });
  const sunMonth = monthFmt.format(sun);
  const satMonth = monthFmt.format(sat);
  if (satMonth === sunMonth) {
    return `${sat.getUTCDate()}–${sun.getUTCDate()} ${sunMonth}`;
  }
  return `${sat.getUTCDate()} ${satMonth} – ${sun.getUTCDate()} ${sunMonth}`;
}

/**
 * ISO timestamp for the moment this dispatch's weekend closes
 * (Sunday 23:59 AEST). Used by the rolling /whats-on/this-weekend/ page
 * to detect at read time that a statically built dispatch has aged out,
 * so the page can say so instead of presenting a past weekend as current.
 */
export function ptwWeekendEndIso(article: any): string {
  const friday = ptwWeekendFriday(article);
  const sunday = new Date(friday);
  sunday.setUTCDate(friday.getUTCDate() + 2);
  sunday.setUTCHours(13, 59, 0, 0); // 23:59 AEST
  return sunday.toISOString();
}

/**
 * Build the Event JSON-LD schema for a PTW dispatch.
 *
 * Per Operational Definitions v1.2 (What's On layer): every What's On
 * surface should carry Event schema. PTW is the canonical "this weekend"
 * surface, so it gets the Event schema with the weekend window as
 * startDate/endDate, the Mornington Peninsula as location, and Peninsula
 * Insider as organizer.
 */
export function buildPtwEventSchema(article: any, canonicalUrl: string) {
  const friday = ptwWeekendFriday(article);
  const sunday = new Date(friday);
  sunday.setUTCDate(friday.getUTCDate() + 2);
  // End of Sunday in AEST (UTC+10). The weekend "window" closes Sunday
  // night, so the Event endDate is Sunday 23:59 local.
  sunday.setUTCHours(13, 59, 0, 0); // 23:59 AEST
  const start = new Date(friday);
  start.setUTCHours(7, 0, 0, 0); // 17:00 AEST Friday
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: article.data.title,
    description: article.data.dek,
    startDate: start.toISOString(),
    endDate: sunday.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: 'Mornington Peninsula',
      address: {
        '@type': 'PostalAddress',
        addressRegion: 'VIC',
        addressCountry: 'AU',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Peninsula Insider',
      url: 'https://peninsulainsider.com.au',
    },
    url: canonicalUrl,
    isAccessibleForFree: true,
  };
}
