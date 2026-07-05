/**
 * Itinerary helpers - Phase 3 WS3C.
 *
 * Pure functions used by the /itinerary/ page. Kept here rather than
 * inlined into the page so the same logic can serve a future place-hub
 * sequencer or an AI-generated payload (WS3D).
 *
 * Travel-time approach is deliberately simple per locked decision Q3:
 * haversine distance multiplied by an empirical Peninsula driving
 * constant. Not a Distance Matrix API; the rough estimate is good enough
 * for "is this a 15-minute or 50-minute drive". Revisit if reader
 * feedback says estimates are misleading.
 */

/** Haversine great-circle distance in kilometres between two lat/lng points. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // Earth radius, km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Convert a haversine distance to an estimated Peninsula driving time.
 * Empirical multiplier 1.3× crow-flies for the back-road geometry, plus
 * a 45 km/h average speed (rural, with one or two slowdowns through
 * villages). Returns minutes.
 */
export function drivingMinutes(distanceKm: number): number {
  const ROAD_MULTIPLIER = 1.3;
  const AVG_SPEED_KMH = 45;
  const roadKm = distanceKm * ROAD_MULTIPLIER;
  return (roadKm / AVG_SPEED_KMH) * 60;
}

/**
 * Format a driving-minutes estimate for display ("12 min", "45 min",
 * "1 h 10"). Snap to the nearest 5 minutes so the precision matches the
 * estimation method's actual confidence.
 */
export function formatTravelMinutes(minutes: number): string {
  const snapped = Math.max(1, Math.round(minutes / 5) * 5);
  if (snapped < 60) return `${snapped} min`;
  const h = Math.floor(snapped / 60);
  const m = snapped % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m}`;
}

/**
 * Build the Google Maps multi-stop directions URL for a sequence of
 * waypoints. The first item is treated as the origin, the last as the
 * destination, anything in between as a waypoint. Falls back to a single
 * search query if there's only one stop.
 *
 * Format reference:
 *   https://www.google.com/maps/dir/?api=1&origin=lat,lng&destination=lat,lng&waypoints=lat,lng%7Clat,lng
 */
export function googleMapsDirectionsUrl(
  stops: Array<{ lat: number; lng: number; name: string }>,
): string {
  if (!stops.length) return 'https://www.google.com/maps';
  if (stops.length === 1) {
    const p = stops[0];
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${p.lat},${p.lng} (${p.name})`,
    )}`;
  }
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map((w) => `${w.lat},${w.lng}`).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Itinerary item shape (client-side). Same identity convention as
 * pi:saved:v1 (kind + slug); adds a `dayId` for optional day grouping
 * and a `note` for free-text annotations between items.
 */
export interface ItineraryItem {
  kind: 'venue' | 'event';
  slug: string;
  /** Day grouping id (e.g. "day-1"). Empty string means ungrouped. */
  dayId: string;
  /** Free-text note shown above this item ("Lunch reservation", etc.). */
  note: string;
}

export interface ItineraryStore {
  version: 1;
  items: ItineraryItem[];
  /** Day labels ordered by display order. */
  days: Array<{ id: string; label: string }>;
}

export const EMPTY_ITINERARY: ItineraryStore = { version: 1, items: [], days: [] };

/**
 * Encode an itinerary into a URL-safe query string. Items become a
 * pipe-delimited list of `kind:slug:dayId` triples; days become a
 * pipe-delimited list of `id:label` pairs. Notes are intentionally not
 * encoded into the share URL - they stay private to the user's local
 * store.
 */
export function encodeItineraryToUrl(itinerary: ItineraryStore): URLSearchParams {
  const params = new URLSearchParams();
  if (itinerary.items.length > 0) {
    params.set(
      'i',
      itinerary.items
        .map((it) => `${it.kind}:${it.slug}:${it.dayId}`)
        .join('|'),
    );
  }
  if (itinerary.days.length > 0) {
    params.set(
      'd',
      itinerary.days.map((d) => `${d.id}:${encodeURIComponent(d.label)}`).join('|'),
    );
  }
  return params;
}

/**
 * Decode a URL query payload into an itinerary. Used by the /itinerary/
 * page when arriving from a shared URL.
 */
export function decodeItineraryFromUrl(params: URLSearchParams): ItineraryStore | null {
  const itemsRaw = params.get('i');
  if (!itemsRaw) return null;
  const items: ItineraryItem[] = itemsRaw.split('|').filter(Boolean).map((triple) => {
    const [kind, slug, dayId] = triple.split(':');
    return {
      kind: (kind === 'event' ? 'event' : 'venue'),
      slug: slug ?? '',
      dayId: dayId ?? '',
      note: '',
    };
  }).filter((it) => it.slug);

  const daysRaw = params.get('d');
  const days: Array<{ id: string; label: string }> = [];
  if (daysRaw) {
    daysRaw.split('|').filter(Boolean).forEach((pair) => {
      const [id, labelEnc] = pair.split(':');
      if (!id) return;
      let label: string;
      try {
        label = decodeURIComponent(labelEnc ?? id);
      } catch {
        label = labelEnc ?? id;
      }
      days.push({ id, label });
    });
  }
  return { version: 1, items, days };
}
