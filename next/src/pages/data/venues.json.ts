/**
 * /data/venues.json — machine-readable venue export for AI agents.
 * Static, generated at build time from the venues collection.
 * Public fields only; see src/lib/agent-data.ts for the rules.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug } from '../../lib/editorial';
import {
  SITE_URL,
  DATA_LICENSE_NOTE,
  venueUrl,
  isPublicVenue,
  compact,
  jsonResponse,
} from '../../lib/agent-data';

export const prerender = true;

export const GET: APIRoute = async () => {
  const venues = (await getCollection('venues')).filter(isPublicVenue);

  const items = venues
    .map((v) =>
      compact({
        slug: routeSlug(v),
        name: v.data.name,
        type: v.data.type,
        subtype: v.data.subtype,
        url: venueUrl(v),
        place: String(v.data.place?.id ?? v.data.place ?? ''),
        zone: v.data.zone,
        address: v.data.address,
        coordinates: v.data.coordinates,
        phone: v.data.phone,
        website: v.data.website,
        bookingUrl: v.data.bookingUrl,
        bookingProvider: v.data.bookingProvider,
        signature: v.data.signature,
        whyWeGo: v.data.whyWeGo,
        bestFor: v.data.bestFor,
        knownFor: v.data.knownFor,
        dogFriendly: v.data.dogFriendly === true ? true : undefined,
        dogFriendlyNotes: v.data.dogFriendlyNotes,
        hoursNote: v.data.hoursNote,
        status: v.data.status !== 'active' ? v.data.status : undefined,
        lastFactVerified: v.data.lastFactVerified?.toISOString().slice(0, 10),
      })
    )
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));

  return jsonResponse({
    publisher: 'Peninsula Insider',
    site: SITE_URL,
    license: DATA_LICENSE_NOTE,
    generatedAt: new Date().toISOString(),
    count: items.length,
    venues: items,
  });
};
