/**
 * Events helpers — chip filters, weekend bucketing, JSON-LD shapers.
 *
 * Kept separate from editorial.ts because that module is generic to all
 * collections; this is events-specific. Imported by /whats-on/ and the
 * by-mood pages, plus any embedded surface that needs filtered events.
 */

import type { CollectionEntry } from 'astro:content';

export type Event = CollectionEntry<'events'>;

// ─── Time + weekend bucketing ────────────────────────────────────────────────

/**
 * Returns the Saturday-Sunday window starting on the next upcoming Saturday
 * (or today if today is Saturday, or yesterday if today is Sunday).
 * Times are AEST midnight to end-of-Sunday.
 */
export function upcomingWeekend(now: Date = new Date()): { start: Date; end: Date; label: string } {
  const day = 24 * 60 * 60 * 1000;
  const dow = now.getDay(); // 0 = Sun, 6 = Sat
  let satOffset = 0;
  if (dow === 0) satOffset = -1; // Sun → yesterday's Saturday
  else if (dow === 6) satOffset = 0; // Today is Saturday
  else satOffset = 6 - dow; // Mon-Fri → days until Saturday

  const sat = new Date(now.getTime() + satOffset * day);
  sat.setHours(0, 0, 0, 0);
  const sun = new Date(sat.getTime() + day);
  const end = new Date(sun.getTime() + day - 1);

  const label = formatWeekendLabel(sat, sun);
  return { start: sat, end, label };
}

function formatWeekendLabel(sat: Date, sun: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
  const satStr = fmt(sat);
  const sunStr = fmt(sun);
  // "9 to 10 May" if same month, "30 May to 1 June" if not
  if (sat.getMonth() === sun.getMonth()) {
    return `${sat.getDate()} to ${sunStr}`;
  }
  return `${satStr} to ${sunStr}`;
}

/**
 * True if the event runs at any point within the supplied window.
 * Recurring events (weekly, monthly, ongoing) always pass — they are
 * assumed to occur in any given weekend window.
 */
export function eventInWindow(event: Event, start: Date, end: Date): boolean {
  const recurring = ['weekly', 'monthly', 'ongoing'].includes(event.data.recurrence as string);
  if (recurring) return true;
  const eStart = event.data.startDate;
  const eEnd = event.data.endDate ?? event.data.startDate;
  return eEnd >= start && eStart <= end;
}

// ─── Chip filters ────────────────────────────────────────────────────────────

export interface ChipDefinition {
  slug: string;
  label: string;
  hubLabel: string;        // shorter version for the chip bar
  eyebrow: string;          // editorial eyebrow on the mood page
  heading: string;          // editorial heading on the mood page
  framing: string;          // intro paragraph on the mood page
  filter: (event: Event) => boolean;
  defaultSort?: (a: Event, b: Event) => number;
  // Optional cap on number of events shown
  limit?: number;
}

const sortByAppealDescending = (a: Event, b: Event): number => {
  const aScore = a.data.visitorAppealScore ?? 0;
  const bScore = b.data.visitorAppealScore ?? 0;
  return bScore - aScore;
};

const sortByDateAscending = (a: Event, b: Event): number => {
  return a.data.startDate.getTime() - b.data.startDate.getTime();
};

export const chips: ChipDefinition[] = [
  {
    slug: 'this-weekend',
    label: 'This weekend',
    hubLabel: 'This weekend',
    eyebrow: 'This weekend',
    heading: 'What we would actually go to this weekend',
    framing:
      'The Peninsula has more on than any one weekend can hold. These are the events we would prioritise, ranked by what they are actually like to attend, not what the marketing copy claims.',
    filter: (event) => {
      const { start, end } = upcomingWeekend();
      return eventInWindow(event, start, end);
    },
    defaultSort: sortByAppealDescending,
    limit: 12,
  },
  {
    slug: 'when-it-rains',
    label: 'When it rains',
    hubLabel: 'When it rains',
    eyebrow: 'Wet-weather rescue',
    heading: 'Rooms with a roof, in case the forecast turns',
    framing:
      'Indoor events that hold up regardless of the weather. Galleries, cellar doors with proper restaurant tables, hot springs, treatment rooms. The Peninsula has more wet-weather options than people think.',
    filter: (event) =>
      event.data.weatherShape === 'all-weather' ||
      event.data.weather === 'rainy-day-rescue' ||
      event.data.weather === 'weather-proof',
    defaultSort: sortByAppealDescending,
    limit: 20,
  },
  {
    slug: 'worth-the-drive',
    label: 'Worth the drive',
    hubLabel: 'Worth the drive',
    eyebrow: 'Worth the trip from Melbourne',
    heading: 'Events that justify the ninety-minute drive',
    framing:
      'Most regional event sites pretend the drive is free. We do not. These are the events worth booking accommodation for, or the day trip from Melbourne that earns its travel time.',
    filter: (event) =>
      Boolean(event.data.worthTheDrive) ||
      (event.data.visitorAppealScore ?? 0) >= 5,
    defaultSort: sortByAppealDescending,
    limit: 20,
  },
  {
    slug: 'free-family',
    label: 'Free family',
    hubLabel: 'Free family',
    eyebrow: 'Free, kid-shaped',
    heading: 'Free events with kids actually in mind',
    framing:
      'Free entry plus an honest kids grade. We use a three-band scale: A means kids will love it, B means tolerable for them, C means technically family-friendly but actually exhausting. These are A and B only.',
    filter: (event) => {
      const isFree = event.data.priceTier === 'free' || (event.data.freePaid?.toLowerCase().includes('free') ?? false);
      const isKidFriendly =
        event.data.kidsGrade === 'A' ||
        event.data.kidsGrade === 'B' ||
        (event.data.kidsGrade == null && event.data.kidsGradeAuto === 'B') ||
        Boolean(event.data.familyFriendly);
      return isFree && isKidFriendly;
    },
    defaultSort: sortByDateAscending,
    limit: 20,
  },
  {
    slug: 'after-dark',
    label: 'After dark',
    hubLabel: 'After dark',
    eyebrow: 'Evening on the Peninsula',
    heading: 'Things that start after the sun goes down',
    framing:
      'Concerts, twilight cellar doors, evening bathing sessions, dinners that count as events. The Peninsula is sometimes accused of closing at five; this is the counter-argument.',
    filter: (event) => {
      if (!event.data.startTime) return false;
      // "18:00" or later, treating as string for comparison
      return event.data.startTime >= '18:00';
    },
    defaultSort: sortByDateAscending,
    limit: 20,
  },
];

export function getChip(slug: string): ChipDefinition | undefined {
  return chips.find((c) => c.slug === slug);
}

/** Returns events filtered by a chip, sorted, limited. */
export function eventsForChip(chip: ChipDefinition, allEvents: Event[]): Event[] {
  const filtered = allEvents.filter(chip.filter);
  const sorted = chip.defaultSort ? [...filtered].sort(chip.defaultSort) : filtered;
  return chip.limit ? sorted.slice(0, chip.limit) : sorted;
}

// ─── Detail-page schema (Event JSON-LD) ──────────────────────────────────────

/**
 * Build a schema.org Event JSON-LD object for a given event.
 * Includes location, date, organiser, offers (if a ticket URL is set).
 * Pass the canonical site URL so the @id is absolute.
 */
export function eventJsonLd(event: Event, siteUrl: string): Record<string, unknown> {
  const data = event.data;
  const slug = data.slug;
  const url = `${siteUrl}/whats-on/${slug}/`;

  const startISO = (() => {
    if (data.startTime) {
      const d = data.startDate.toISOString().slice(0, 10);
      return `${d}T${data.startTime}:00+10:00`;
    }
    return data.startDate.toISOString();
  })();
  const endISO = (() => {
    const endDate = data.endDate ?? data.startDate;
    if (data.endTime) {
      const d = endDate.toISOString().slice(0, 10);
      return `${d}T${data.endTime}:00+10:00`;
    }
    return endDate.toISOString();
  })();

  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: data.venueName ?? 'Mornington Peninsula',
  };
  if (data.streetAddress || data.suburb) {
    location.address = {
      '@type': 'PostalAddress',
      streetAddress: data.streetAddress,
      addressLocality: data.suburb,
      addressRegion: 'VIC',
      addressCountry: 'AU',
    };
  }
  if (data.coordinates) {
    location.geo = {
      '@type': 'GeoCoordinates',
      latitude: data.coordinates.lat,
      longitude: data.coordinates.lng,
    };
  }

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': url,
    name: data.title,
    description: data.description ?? data.summary,
    startDate: startISO,
    endDate: endISO,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      data.indoorOutdoor === 'Indoor' || data.indoorOutdoor === 'Indoor / Outdoor'
        ? 'https://schema.org/MixedEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
    location,
    url,
  };

  if (data.organiser?.name) {
    ld.organizer = {
      '@type': 'Organization',
      name: data.organiser.name,
      url: data.organiser.website,
    };
  }

  if (data.heroImage?.src) {
    ld.image = data.heroImage.src.startsWith('http')
      ? data.heroImage.src
      : `${siteUrl}${data.heroImage.src}`;
  }

  if (data.ticketingUrl || data.bookingUrl) {
    ld.offers = {
      '@type': 'Offer',
      url: data.ticketingUrl ?? data.bookingUrl,
      availability: 'https://schema.org/InStock',
      priceCurrency: 'AUD',
      ...(data.priceTier === 'free' ? { price: '0' } : {}),
    };
  }

  return ld;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/**
 * Human-readable price label for the event sidebar. Falls back through the
 * priceTier enum when priceRange isn't filled in, then to a "Check organiser"
 * fallback so every event surfaces something rather than omitting the row.
 *
 * The project rule (Discovery Phase 1, workstream 4) is that every event page
 * shows a price line: even "Free" or "Check organiser" beats omission.
 */
export function eventPriceLabel(data: Event['data']): string {
  if (data.priceTier === 'free' || data.freePaid?.toLowerCase().includes('free')) {
    return 'Free';
  }
  if (data.priceRange && data.priceRange.trim()) {
    return data.priceRange.trim();
  }
  switch (data.priceTier) {
    case 'under-50':
      return 'Under $50';
    case '50-150':
      return '$50 to $150';
    case 'over-150':
      return '$150 and up';
  }
  if (data.freePaid && data.freePaid.trim()) {
    return data.freePaid.trim();
  }
  return 'Check organiser';
}

/**
 * Returns true when we have enough confidence in the price field to label it
 * as a known price (rather than a "Check organiser" placeholder).
 */
export function eventHasKnownPrice(data: Event['data']): boolean {
  if (data.priceTier && data.priceTier !== 'unknown') return true;
  if (data.priceRange && data.priceRange.trim()) return true;
  if (data.freePaid && data.freePaid.trim()) return true;
  return false;
}

/**
 * "11:00 to 14:00" / "11:00" / null. Uses startTime/endTime as written; we
 * don't try to format because the schema is free-text.
 */
export function eventTimeLabel(data: Event['data']): string | null {
  if (data.startTime && data.endTime) return `${data.startTime} to ${data.endTime}`;
  if (data.startTime) return data.startTime;
  return null;
}

/**
 * Build a Google Calendar "Add to calendar" URL from an event. Uses the
 * pre-filled action URL (most-supported flow; works on desktop, iOS, and
 * Android via the calendar app picker).
 *
 * If only a date is known (no times), creates a single-day all-day event.
 * If startTime is given without endTime, defaults to a 2-hour block. If
 * neither end-date nor end-time is given, the event is treated as same-day.
 *
 * The dates string format Google expects is YYYYMMDDTHHMMSSZ for timed
 * events and YYYYMMDD/YYYYMMDD for all-day events.
 */
export function eventCalendarUrl(data: Event['data'], canonical: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const fmtDateTime = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const start = new Date(data.startDate);
  const end = data.endDate ? new Date(data.endDate) : new Date(start);

  let dates: string;
  if (data.startTime) {
    const [sh, sm] = data.startTime.split(':').map((n) => parseInt(n, 10) || 0);
    // Treat user-entered times as Melbourne local (AEST/AEDT). We render the
    // GCal URL in UTC. AEST is +10, AEDT is +11; we use +10 as a stable
    // baseline since the user can edit on import. Better to be slightly off
    // than to misrender DST.
    const startLocal = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), sh - 10, sm));
    let endLocal: Date;
    if (data.endTime) {
      const [eh, em] = data.endTime.split(':').map((n) => parseInt(n, 10) || 0);
      const endDate = data.endDate ? new Date(data.endDate) : start;
      endLocal = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), eh - 10, em));
    } else {
      // Default to 2-hour event when no end-time given.
      endLocal = new Date(startLocal.getTime() + 2 * 60 * 60 * 1000);
    }
    dates = `${fmtDateTime(startLocal)}/${fmtDateTime(endLocal)}`;
  } else {
    // All-day. Google's date format is exclusive of the end day, so add a day.
    const endPlusOne = new Date(end);
    endPlusOne.setDate(endPlusOne.getDate() + 1);
    dates = `${fmtDate(start)}/${fmtDate(endPlusOne)}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: data.title,
    dates,
    details: `${data.summary}\n\nDetails: ${canonical}`,
    location: [data.streetAddress, data.suburb, 'Mornington Peninsula, VIC, Australia']
      .filter(Boolean)
      .join(', '),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Pick the most specific ticket/booking URL available, with a flag indicating
 * whether the link points at a true ticket platform (vs. a generic booking
 * page). Used by the event sidebar to label the CTA correctly.
 */
export function eventBookingTarget(data: Event['data']): { href: string; label: string } | null {
  if (data.ticketingUrl) return { href: data.ticketingUrl, label: 'Get tickets' };
  if (data.bookingUrl) return { href: data.bookingUrl, label: 'Book or check details' };
  if (data.organiser?.website) return { href: data.organiser.website, label: 'Visit organiser' };
  return null;
}

/**
 * Plain-English recurrence label for the at-a-glance row.
 */
export function eventRecurrenceLabel(data: Event['data']): string {
  switch (data.recurrence) {
    case 'one-off':
      return 'One-off date';
    case 'weekly':
      return 'Recurs weekly';
    case 'monthly':
      return 'Recurs monthly';
    case 'annual':
      return 'Annual';
    case 'seasonal':
      return 'Seasonal run';
    case 'ongoing':
      return 'Ongoing programme';
    default:
      return data.recurrence;
  }
}

/**
 * Compact family-grade summary for the at-a-glance row. The longer narrative
 * note still renders as its own callout where present.
 */
export function eventFamilyGradeShort(data: Event['data']): string | null {
  switch (data.kidsGrade) {
    case 'A':
      return 'A — Fully kid-friendly';
    case 'B':
      return 'B — Family-suitable with care';
    case 'C':
      return 'C — Older kids only';
    case 'not-for-kids':
      return 'Adults only';
    default:
      return null;
  }
}
