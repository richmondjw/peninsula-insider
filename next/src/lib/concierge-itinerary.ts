/**
 * Concierge → Itinerary contract (Phase 3 WS3D).
 *
 * Defines the JSON shape the Ask The Insider backend should emit when a
 * user prompt looks like an itinerary request ("plan me a Saturday in
 * Red Hill", "two-night couples weekend", "rainy day with kids"). The
 * front-end recognises this payload, renders a "Sequence in builder"
 * CTA, and ingests into pi:itinerary:v1 when the user clicks.
 *
 * Until the backend speaks this format, the contract is documented but
 * unused - the recogniser quietly does nothing on responses that lack
 * an `itinerary` field.
 *
 * BACKEND CONTRACT
 * ================
 * The concierge response should optionally include an `itinerary` field
 * alongside its existing `prose` and `recommendations` (or whatever the
 * current shape is). When present:
 *
 *   {
 *     "itinerary": {
 *       "title": "A Red Hill Saturday",      // editorial title; optional
 *       "framing": "Long lunch...",          // 1–2 sentence dek; optional
 *       "items": [
 *         { "kind": "venue",      "slug": "montalto",                "dayId": "",      "note": "" },
 *         { "kind": "experience", "slug": "arthurs-seat-walk",       "dayId": "",      "note": "" },
 *         { "kind": "venue",      "slug": "ten-minutes-by-tractor",  "dayId": "day-1", "note": "Lunch reservation 1 pm" },
 *         { "kind": "event",      "slug": "red-hill-market",         "dayId": "day-1", "note": "" }
 *       ],
 *       "days": [
 *         { "id": "day-1", "label": "Saturday" }
 *       ]
 *     }
 *   }
 *
 * RULES
 *  - `kind` must be 'venue' | 'event' | 'experience'.
 *  - `slug` must match an existing slug in the corresponding collection;
 *    items with unknown slugs are dropped silently on the front end.
 *  - `dayId` is optional. Empty string means ungrouped.
 *  - `note` is optional free text. Stays in local storage; not encoded
 *    into share URLs (see `/itinerary/` for the share rule).
 *  - `days` is optional. If present and an item references an unknown
 *    dayId, the item lands ungrouped.
 *  - Titles and framings are surfaced to the user but are not persisted
 *    to local storage (the user's own itinerary belongs to them, not
 *    the concierge that suggested it).
 */

export type ItineraryItemKind = 'venue' | 'event' | 'experience';

export interface ConciergeItineraryItem {
  kind: ItineraryItemKind;
  slug: string;
  dayId?: string;
  note?: string;
}

export interface ConciergeItineraryDay {
  id: string;
  label: string;
}

export interface ConciergeItinerary {
  title?: string;
  framing?: string;
  items: ConciergeItineraryItem[];
  days?: ConciergeItineraryDay[];
}

/**
 * Validate an arbitrary value as a ConciergeItinerary. Returns null if
 * it doesn't conform; this is intentionally permissive (accept and
 * coerce reasonable variations) since the producer is an LLM.
 */
export function parseConciergeItinerary(input: unknown): ConciergeItinerary | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const itemsRaw = raw.items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) return null;
  const items: ConciergeItineraryItem[] = [];
  for (const it of itemsRaw) {
    if (!it || typeof it !== 'object') continue;
    const itAny = it as Record<string, unknown>;
    const kind = String(itAny.kind ?? '').toLowerCase();
    if (kind !== 'venue' && kind !== 'event' && kind !== 'experience') continue;
    const slug = String(itAny.slug ?? '').trim();
    if (!slug) continue;
    items.push({
      kind: kind as ItineraryItemKind,
      slug,
      dayId: typeof itAny.dayId === 'string' ? itAny.dayId : '',
      note: typeof itAny.note === 'string' ? itAny.note : '',
    });
  }
  if (items.length === 0) return null;

  const daysRaw = raw.days;
  const days: ConciergeItineraryDay[] = [];
  if (Array.isArray(daysRaw)) {
    for (const d of daysRaw) {
      if (!d || typeof d !== 'object') continue;
      const dAny = d as Record<string, unknown>;
      const id = String(dAny.id ?? '').trim();
      const label = String(dAny.label ?? '').trim();
      if (!id) continue;
      days.push({ id, label: label || id });
    }
  }

  return {
    title: typeof raw.title === 'string' ? raw.title : undefined,
    framing: typeof raw.framing === 'string' ? raw.framing : undefined,
    items,
    days: days.length > 0 ? days : undefined,
  };
}

/**
 * Encode a ConciergeItinerary into a URL fragment usable on
 * /itinerary/?ai=<encoded>. base64url-encodes the JSON to keep the
 * URL compact and safe across email/SMS forwarding.
 */
export function encodeConciergeItinerary(it: ConciergeItinerary): string {
  const json = JSON.stringify(it);
  // btoa requires Latin-1; encode as UTF-8 first.
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = (typeof btoa !== 'undefined' ? btoa(binary) : '');
  // base64url
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a base64url payload back into a ConciergeItinerary. Returns
 * null on any parse failure - the front end falls back to a plain
 * empty itinerary in that case.
 */
export function decodeConciergeItinerary(encoded: string): ConciergeItinerary | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = (typeof atob !== 'undefined' ? atob(padded) : '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return parseConciergeItinerary(parsed);
  } catch {
    return null;
  }
}
