import {hasExplicitSeries,nextSeriesData,hasLegacyExceptions} from './intelligence-series.mjs';
import {ruleFor,occursInWindow} from './event-schedule.ts';
/**
 * Events helpers - chip filters, weekend bucketing, JSON-LD shapers.
 *
 * Kept separate from editorial.ts because that module is generic to all
 * collections; this is events-specific. Imported by /whats-on/ and the
 * by-mood pages, plus any embedded surface that needs filtered events.
 */

import type { CollectionEntry } from 'astro:content';
import { currentVerifiedPrice } from './event-publication.mjs';
import { USE_OCCURRENCE_MODEL } from './features';
import {
  bookingAvailability,
  dayIsoOf,
  isoOffsetFor,
  isCancelledRecord,
  occurrenceBounds,
  recordDisposition,
  staticEventSchemaStatus,
  spanBounds,
} from './event-occurrence.mjs';

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
 * Recurring events (weekly, monthly, ongoing) always pass - they are
 * assumed to occur in any given weekend window.
 */
/**
 * Returns true if the event has at least one occurrence inside the
 * [start, end] window. Recurrence-aware:
 *
 *  - one-off / annual / seasonal: single occurrence at startDate (or range
 *    if endDate is set). True if that range overlaps the window.
 *  - weekly: occurs every week on the same weekday. True if any day in
 *    the window shares that weekday - or trivially if the window is 7+
 *    days long (every weekday is covered).
 *  - monthly: occurs once per month. We trust startDate to be the NEXT
 *    occurrence; true if startDate falls in the window.
 *  - ongoing: continuous offering (e.g. permanent exhibition, daily
 *    studio). True for any future-facing window.
 *
 * This replaces the old "any recurring event passes" rule, which caused
 * weekly events to surface in time windows that didn't actually contain
 * one of their occurrences (e.g. a Saturday market appearing as "Today"
 * on a Tuesday).
 */
export function eventInWindow(event: Event, start: Date, end: Date): boolean {
  if(hasLegacyExceptions(event.data)){
    const rule=ruleFor(event as any,start);
    return !!rule && occursInWindow(rule,{start,end,label:''});
  }
  if(hasExplicitSeries(event.data)) return event.data.seriesOccurrences!.some(s=>new Date(s.date)>=start && new Date(s.date)<=end);
  const recurrence = event.data.recurrence as string;
  const eStart = event.data.startDate;
  const eEnd = event.data.endDate ?? event.data.startDate;
  const dayMs = 24 * 60 * 60 * 1000;

  if (recurrence === 'weekly') {
    // Window of 7 days or more always contains every weekday once.
    if (end.getTime() - start.getTime() >= 6 * dayMs) return true;
    const eventWeekday = eStart.getDay();
    // Walk the window day by day looking for a match. Cheap because the
    // typical window here is 1–7 days.
    for (
      let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      cursor <= end;
      cursor = new Date(cursor.getTime() + dayMs)
    ) {
      if (cursor.getDay() === eventWeekday) return true;
    }
    return false;
  }

  if (recurrence === 'monthly') {
    // Trust startDate to be the next occurrence the content team has set.
    return eStart >= start && eStart <= end;
  }

  if (recurrence === 'ongoing') {
    // Continuous; show in any future-facing window.
    return end >= new Date();
  }

  // Default (one-off, annual, seasonal): range-overlap check.
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
  const data = nextSeriesData(event.data) as Event['data'];
  const cancelled = isCancelledRecord(data);
  const slug = data.slug;
  const url = `${siteUrl}/whats-on/${slug}/`;
  const nextOccurrence = (data as any).nextOccurrence
    ? new Date((data as any).nextOccurrence)
    : undefined;
  const usesNextOccurrence =
    !cancelled &&
    ['weekly', 'monthly', 'annual'].includes(String((data as any).recurrence ?? '')) &&
    nextOccurrence;
  const eventStartDate = usesNextOccurrence ? nextOccurrence : data.startDate;
  const eventEndDate = usesNextOccurrence ? nextOccurrence : (data.endDate ?? data.startDate);

  // PI-008: the offset used to be the literal +10:00, on every event, all
  // year. Melbourne is +11:00 from October to April, which is most of the
  // calendar this site sells, so every daylight-saving event has been
  // publishing its times an hour late to search engines and assistants.
  // occurrenceBounds resolves the wall clock through Intl instead, which also
  // gets the two transition days right: 01:30 to 03:30 is one hour on the
  // first Sunday in October and three on the first Sunday in April.
  const startDayIso = dayIsoOf(eventStartDate) ?? eventStartDate.toISOString().slice(0, 10);
  const endDayIso = dayIsoOf(eventEndDate) ?? startDayIso;
  const stampedISO = (instant: Date, dayIso: string, clock: string) =>
    `${dayIso}T${clock}:00${isoOffsetFor(instant)}`;

  const startISO = (() => {
    if (!data.startTime) return startDayIso;
    const bounds = occurrenceBounds(data as Record<string, unknown>, startDayIso, {
      isFinalDay: startDayIso === endDayIso,
    });
    return stampedISO(bounds.startsAt, startDayIso, data.startTime);
  })();
  const endISO = (() => {
    if (data.endTime) {
      // spanBounds, not occurrenceBounds: a multi-day run finishes on its own
      // calendar day, which can sit on the other side of a daylight-saving
      // transition from the day it opened. Resolving the end clock against
      // the START day takes the offset from the wrong end of the run - NWOP
      // 2026 (5 Sep AEST to 22 Nov AEDT) published its 16:00 close as
      // 16:00+10:00, an hour late. For a single-day record, including a
      // cross-midnight one, spanBounds delegates straight back to
      // occurrenceBounds on the start day, so nothing else moves.
      const bounds = spanBounds(data as Record<string, unknown>, startDayIso, endDayIso);
      // A cross-midnight occurrence finishes on the following calendar day.
      // Stamping the end time onto the start day produced an endDate before
      // the startDate, which is invalid Event schema.
      const realEndDay = dayIsoOf(bounds.endsAt) ?? endDayIso;
      const spanEndDay = endDayIso > startDayIso ? endDayIso : realEndDay;
      return stampedISO(bounds.endsAt, spanEndDay, data.endTime);
    }
    // Missing end times are unknown, even for a date range. Do not invent
    // midnight or reuse the start instant as an asserted finishing time.
    return !data.startTime && data.endDate ? endDayIso : undefined;
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
    ...(endISO ? { endDate: endISO } : {}),
    // Static pages retain exceptional statuses but omit Scheduled after build.
    //
    // PI-008 adds the two states the pair could not express. A postponed event
    // is not cancelled and is not going ahead on the date shown; a rescheduled
    // one is going ahead on a different date, and schema.org wants the old one
    // declared as previousStartDate so an assistant holding the stale date can
    // reconcile it.
    ...(() => {
      if (!USE_OCCURRENCE_MODEL && !hasExplicitSeries(data) && !hasLegacyExceptions(data)) {
        return cancelled
          ? { eventStatus: 'https://schema.org/EventCancelled' }
          : {};
      }
      const disposition = recordDisposition(data as Record<string, unknown>);
      const eventStatus = staticEventSchemaStatus(disposition.status);
      const previous = (data as Record<string, unknown>).postponedFrom ?? data.startDate;
      const previousStartDate = (data as any)._occurrencePreviousStartDate ?? dayIsoOf(previous);
      return {
        ...(eventStatus ? { eventStatus } : {}),
        ...(disposition.status === 'rescheduled' && previous
          ? { previousStartDate }
          : {}),
      };
    })(),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
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

  // A booking URL establishes where to book, not inventory. Only an
  // explicit booking status supports an availability assertion.
  if (data.ticketingUrl || data.bookingUrl) {
    const availability = bookingAvailability(String(data.bookingStatus ?? 'unknown'));
    const withdrawn = cancelled || data.postponed || ['expired', 'past', 'archived'].includes(data.status);
    ld.offers = {
      '@type': 'Offer',
      url: data.ticketingUrl ?? data.bookingUrl,
      ...(!withdrawn && availability ? { availability } : {}),
    };
  }

  // Dates above describe the selected occurrence. A frequency or title does not
  // establish a bounded series rule or its exceptions; do not infer a Schedule.

  return ld;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/** Verified, current prices are explicitly authorised for What's On.
 * Legacy paid tiers remain organiser-only; free-access distinctions survive.
 */
export function eventPriceLabel(data: Event['data'], now: Date = new Date()): string {
  return currentVerifiedPrice(data, now)?.label ?? 'Check organiser for pricing';
}

/** Whether the price row has a verified price or qualified access label. */
export function eventHasKnownPrice(data: Event['data'], now: Date = new Date()): boolean {
  return currentVerifiedPrice(data, now) !== null;
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
  data = nextSeriesData(data) as Event['data'];
  const cancelled = isCancelledRecord(data);
  if ((data as any)._occurrenceEffectiveDate && data.postponed && !data.rescheduledTo) return '';
  if((hasExplicitSeries(data)||hasLegacyExceptions(data)) && data.startTime && !data.endTime) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const fmtDateTime = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const nextOccurrence = (data as any).nextOccurrence
    ? new Date((data as any).nextOccurrence)
    : undefined;
  const usesNextOccurrence =
    !cancelled &&
    ['weekly', 'monthly', 'annual'].includes(String((data as any).recurrence ?? '')) &&
    nextOccurrence;
  const start = usesNextOccurrence ? new Date(nextOccurrence) : new Date(data.startDate);
  const end = usesNextOccurrence
    ? new Date(nextOccurrence)
    : (data.endDate ? new Date(data.endDate) : new Date(start));

  let dates: string;
  if (data.startTime) {
    // PI-008: this used to subtract a hardcoded ten hours ("better to be
    // slightly off than to misrender DST"), which put every event between
    // October and April into a reader's calendar an hour late. The Melbourne
    // offset for the actual instant is now resolved through Intl, so there is
    // nothing left to be slightly off about.
    let startLocal: Date;
    let endLocal: Date;
    const dayIso = dayIsoOf(start) ?? start.toISOString().slice(0, 10);
    const endDayIso = dayIsoOf(end) ?? dayIso;
    const bounds = occurrenceBounds(data as Record<string, unknown>, dayIso, {
      isFinalDay: dayIso === endDayIso,
    });
    startLocal = bounds.startsAt;
    if (data.endTime && endDayIso > dayIso) {
      endLocal = occurrenceBounds(data as Record<string, unknown>, endDayIso, {
        isFirstDay: false,
        isFinalDay: true,
      }).endsAt;
    } else if (data.endTime) {
      endLocal = bounds.endsAt;
    } else {
      // Default to a 2-hour block when no end time is given, unchanged.
      endLocal = new Date(startLocal.getTime() + 2 * 60 * 60 * 1000);
    }
    dates = `${fmtDateTime(startLocal)}/${fmtDateTime(endLocal)}`;
  } else {
    // All-day. Google's date format is exclusive of the end day, so add a day.
    const endPlusOne = new Date(end);
    // Date-only content is UTC-normalised; a local DST shift must not shorten the day.
    endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);
    dates = `${fmtDate(start)}/${fmtDate(endPlusOne)}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: data.title,
    dates,
    details: `${data.summary}\n\nDetails: ${canonical}`,
    location: [data.venueName, data.streetAddress, data.suburb, 'Mornington Peninsula, VIC, Australia']
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
/**
 * `kind` was added for PI-024. The three branches below are not equivalent:
 * a ticketing or booking URL carries reservation intent, an organiser's
 * homepage does not. booking_outbound_clicked counts only the first two, so
 * the caller needs to know which branch it got rather than guessing from the
 * label string.
 */
export function eventBookingTarget(
  data: Event['data'],
): { href: string; label: string; kind: 'tickets' | 'booking' | 'organiser' } | null {
  if (data.ticketingUrl) return { href: data.ticketingUrl, label: 'Get tickets', kind: 'tickets' };
  if (data.bookingUrl) return { href: data.bookingUrl, label: 'Book or check details', kind: 'booking' };
  if (data.organiser?.website) return { href: data.organiser.website, label: 'Visit organiser', kind: 'organiser' };
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
