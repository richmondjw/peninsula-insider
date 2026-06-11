/**
 * Shared helpers for the /data/*.json machine-readable exports.
 *
 * These endpoints publish the public subset of the content collections as
 * static JSON at build time, so AI agents and integrators can consume the
 * editorial entity data without scraping HTML. See
 * docs/ai-agent-readiness-review-2026-06-10.md.
 *
 * Rules:
 *  - Public fields only. Internal editorial fields (price bands, workflow
 *    flags, CMS plumbing) are never exported — BRAND-PI "no pricing on
 *    site" applies to these surfaces too.
 *  - Entries flagged sitemapExclude or permanently closed are skipped, so
 *    the exports mirror exactly what the HTML site publishes.
 */
import { venueHrefPrefix, routeSlug } from './editorial';

export const SITE_URL = 'https://peninsulainsider.com.au';

export const DATA_LICENSE_NOTE =
  'Editorial data from Peninsula Insider (peninsulainsider.com.au). ' +
  'Cite as "Peninsula Insider" with a link to the entity URL. Prices are ' +
  'deliberately not published; confirm current prices and hours with the ' +
  'operator via the booking or website link.';

export function venueUrl(entry: any): string {
  return `${SITE_URL}${venueHrefPrefix(entry.data.type)}/${routeSlug(entry)}/`;
}

export function isPublicVenue(entry: any): boolean {
  return entry.data.sitemapExclude !== true && entry.data.status !== 'permanently_closed';
}

export function isPublicEntry(entry: any): boolean {
  return entry.data.sitemapExclude !== true;
}

/** Drop undefined / null / empty-array values so the JSON stays compact. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload, null, 1), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
