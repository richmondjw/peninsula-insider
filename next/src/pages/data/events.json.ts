/**
 * /data/events.json — machine-readable export of current and upcoming
 * events for AI agents. Static, generated at build time. Past one-off
 * events are excluded; recurring events are kept. Verification fields
 * (verificationStatus, lastChecked) are included so consumers can weight
 * freshness — this is the strongest trust signal the events data carries.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug, isUpcoming } from '../../lib/editorial';
import {
  SITE_URL,
  DATA_LICENSE_NOTE,
  isPublicEntry,
  compact,
  jsonResponse,
} from '../../lib/agent-data';

export const prerender = true;

export const GET: APIRoute = async () => {
  const events = (await getCollection('events'))
    .filter(isPublicEntry)
    .filter((e) => {
      if (['weekly', 'monthly', 'ongoing'].includes(e.data.recurrence ?? '')) return true;
      return isUpcoming(e.data.endDate ?? e.data.startDate);
    });

  const items = events
    .map((e) =>
      compact({
        slug: routeSlug(e),
        title: e.data.title,
        url: `${SITE_URL}/whats-on/${routeSlug(e)}/`,
        summary: e.data.summary,
        startDate: e.data.startDate?.toISOString().slice(0, 10),
        endDate: e.data.endDate?.toISOString().slice(0, 10),
        startTime: e.data.startTime,
        endTime: e.data.endTime,
        recurrence: e.data.recurrence,
        category: e.data.category,
        subcategory: e.data.subcategory,
        venueName: e.data.venueName,
        venueSlug: e.data.venue ? String(e.data.venue.id ?? e.data.venue) : undefined,
        place: e.data.place ? String(e.data.place.id ?? e.data.place) : undefined,
        suburb: e.data.suburb,
        streetAddress: e.data.streetAddress,
        coordinates: e.data.coordinates,
        indoorOutdoor: e.data.indoorOutdoor,
        freePaid: e.data.freePaid,
        bookingRequired: e.data.bookingRequired,
        bookingUrl: e.data.bookingUrl,
        officialEventUrl: e.data.officialEventUrl,
        audienceTags: e.data.audienceTags,
        petFriendly: e.data.petFriendly,
        accessibilityNotes: e.data.accessibilityNotes,
        verificationStatus: e.data.verificationStatus,
        lastChecked: e.data.lastCheckedDate?.toISOString().slice(0, 10),
      })
    )
    .sort((a, b) => String(a.startDate ?? '').localeCompare(String(b.startDate ?? '')));

  return jsonResponse({
    publisher: 'Peninsula Insider',
    site: SITE_URL,
    license: DATA_LICENSE_NOTE,
    generatedAt: new Date().toISOString(),
    count: items.length,
    events: items,
  });
};
