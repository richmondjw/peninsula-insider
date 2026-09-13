/**
 * event-occurrence.mjs - the occurrence model (PI-008).
 *
 * Before this module an event record answered "is it still on?" with a single
 * blunt test: does its last calendar day fall on or after today. Five genuinely
 * independent facts were collapsed into that one answer, so none of them could
 * be stated, queried or corrected on its own:
 *
 *   1. WHEN it runs          startDate/endDate + startTime/endTime, in a real
 *                            timezone, including occurrences that cross midnight
 *   2. WHETHER it will run   cancelled / postponed / rescheduled
 *   3. WHETHER you can book  bookingStatus (sold out is not cancelled)
 *   4. WHEN we last checked  lastVerifiedAt, against sourceUpdatedAt
 *   5. WHEN the record dies  expiresAt, which is not the same instant as the
 *                            end of the last occurrence
 *
 * Each axis is now its own field and its own function here. A sold-out market
 * is still on. A postponed festival has no date at all and must not be listed
 * under its old one. A record whose source changed after we last verified it is
 * not wrong, it is unchecked, and it loses promotion until a human looks.
 *
 * TIMEZONE. The Peninsula publishes on Melbourne time; CI builds in UTC and
 * readers arrive from anywhere. Every wall clock in a record is Melbourne local
 * unless the record says otherwise, and wallClockToInstant below converts it to
 * a real instant through Intl rather than the hardcoded +10:00 that
 * src/lib/events.ts has been stamping into JSON-LD all year. That constant is
 * wrong for the whole of daylight saving, October to April, which is most of
 * the calendar the site actually sells.
 *
 * Two DST cases this gets right and arithmetic does not:
 *   - the first Sunday in October, when 02:00 to 03:00 does not exist, so a
 *     01:30 to 03:30 session really lasts one hour
 *   - the first Sunday in April, when 02:00 to 03:00 happens twice, so the same
 *     01:30 to 03:30 session really lasts three
 *
 * NO IMPORTS, plain JavaScript. Half the consumers are Astro modules, the other
 * half are build scripts node runs with no bundler and no TypeScript toolchain
 * (scripts/audit-event-safeguards.mjs runs inside `npm run build`). The same
 * constraint governs src/lib/season.ts and src/lib/event-access.mjs. Do not add
 * a dependency here without checking both kinds of caller still load.
 *
 * Season is NOT derived here. src/lib/season.ts is the single source of truth
 * for that and there is a test that catches anyone deriving one from getMonth().
 */

export const PENINSULA_TZ = 'Australia/Melbourne';

/**
 * How long the renderer will trust the expiry job before falling back to the
 * previous behaviour. The job runs daily in content-freshness.yml, so this is
 * seven consecutive failures, not a tight leash. See occurrenceModelEnabled.
 */
export const EXPIRY_MAX_AGE_HOURS = 168;

const MINUTE = 60000;
const _formatters = new Map();

function formatterFor(tz) {
  let f = _formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    _formatters.set(tz, f);
  }
  return f;
}

/** Local calendar and clock parts for an instant, in `tz`. */
export function zonedParts(instant, tz = PENINSULA_TZ) {
  const parts = formatterFor(tz).formatToParts(instant);
  const num = (type) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year: num('year'),
    month: num('month'),
    day: num('day'),
    hour: num('hour') % 24,
    minute: num('minute'),
    second: num('second'),
  };
}

/** Minutes east of UTC for `instant` in `tz` (Melbourne: 600 or 660). */
export function zoneOffsetMinutes(instant, tz = PENINSULA_TZ) {
  const p = zonedParts(instant, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const whole = instant.getTime() - (instant.getTime() % 1000);
  return Math.round((asUtc - whole) / MINUTE);
}

/** "+11:00" style offset for an instant, for structured data. */
export function isoOffsetFor(instant, tz = PENINSULA_TZ) {
  const minutes = zoneOffsetMinutes(instant, tz);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/**
 * A local wall clock, resolved to the instant it names.
 *
 * Three offsets are tried: the one in force at the naive UTC reading and the
 * ones a day either side. That covers both transitions without a table.
 *   - one or two candidates read back as the requested wall clock: the time is
 *     real, and when it is ambiguous (clocks went back) we take the FIRST of
 *     the two, which is the reading a person watching a clock would have used
 *   - no candidate reads back: the wall clock does not exist (clocks went
 *     forward), so we take the later candidate, which lands just past the gap
 *     rather than an hour before the time the record actually stated
 */
export function wallClockToInstant(year, month, day, hour, minute, tz = PENINSULA_TZ) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const offsets = new Set([
    zoneOffsetMinutes(new Date(naive), tz),
    zoneOffsetMinutes(new Date(naive - 86400000), tz),
    zoneOffsetMinutes(new Date(naive + 86400000), tz),
  ]);
  const candidates = [...offsets].map((off) => naive - off * MINUTE);
  const readsBack = (t) => {
    const p = zonedParts(new Date(t), tz);
    return p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute;
  };
  const valid = candidates.filter(readsBack);
  return new Date(valid.length ? Math.min(...valid) : Math.max(...candidates));
}

/** "HH:MM" to {hour, minute}, or null when the value is not a clock time. */
export function parseClock(value) {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(String(value ?? ''));
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** A date-only "YYYY-MM-DD" string, or null. */
export function parseDayIso(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').slice(0, 10));
  return m ? m[0] : null;
}

/**
 * The Melbourne calendar day a value falls on.
 *
 * Records carry date-only strings, which Astro coerces to UTC midnight. Reading
 * those back through the Melbourne calendar gives the same day (UTC midnight is
 * mid-morning here), and a record that ever carries a real timestamp gets the
 * editorial day rather than the UTC one. Same convention as startOfDay() in
 * pages/whats-on/_data.ts.
 */
export function dayIsoOf(value, tz = PENINSULA_TZ) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const plain = parseDayIso(value);
    if (plain) return plain;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = zonedParts(d, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Shift a "YYYY-MM-DD" by whole days, staying on the calendar. */
export function addDaysIso(dayIso, days) {
  const [y, m, d] = dayIso.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  const p = (n) => String(n).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}`;
}

function toDate(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const timezoneOf = (data) => data?.timezone || PENINSULA_TZ;

/**
 * The instant bounds of one occurrence, on one Melbourne day.
 *
 * `bounded` is the honest part. When a record states no end time we do NOT
 * invent a duration for it: the occurrence runs to the end of its Melbourne
 * day, which is exactly what every surface already assumed, and `bounded` is
 * false so callers and the safeguard audit can tell "we know it finished" from
 * "we never knew when it finished". Precision where the evidence exists, no
 * invention where it does not. The audit reports the unbounded ones so the
 * corpus can be improved; a made-up default duration would have hidden them.
 *
 * An `endTime` at or before `startTime` means the occurrence crosses midnight.
 * A record can override that reading in either direction with `endsNextDay`.
 *
 * A multi-day record is read as one continuous run, which is how
 * src/lib/events.ts has always built its JSON-LD: the start time belongs to
 * the first day and the end time to the last, and the days in between are
 * whole days. Pass isFirstDay/isFinalDay to say where on the span this day
 * sits; both default true, which is the single-day case.
 */
export function occurrenceBounds(data, dayIso, options = {}) {
  const tz = timezoneOf(data);
  const isFirstDay = options.isFirstDay !== false;
  const isFinalDay = options.isFinalDay !== false;
  const exception = options.exception ?? null;
  const startSource = isFirstDay ? (exception?.startTime ?? data?.startTime) : null;
  const startClock = parseClock(startSource) ?? { hour: 0, minute: 0 };
  const rawEnd = isFinalDay ? (exception?.endTime ?? data?.endTime) : null;
  const endClock = parseClock(rawEnd);

  const [y, m, d] = dayIso.split('-').map(Number);
  const startsAt = wallClockToInstant(y, m, d, startClock.hour, startClock.minute, tz);

  if (!endClock) {
    const [ny, nm, nd] = addDaysIso(dayIso, 1).split('-').map(Number);
    const endsAt = new Date(wallClockToInstant(ny, nm, nd, 0, 0, tz).getTime() - 1);
    return { startsAt, endsAt, crossesMidnight: false, bounded: false };
  }

  const startMinutes = startClock.hour * 60 + startClock.minute;
  const endMinutes = endClock.hour * 60 + endClock.minute;
  const declared = data?.endsNextDay;
  const crossesMidnight =
    typeof declared === 'boolean' ? declared : isFinalDay && endMinutes <= startMinutes;
  const endDayIso = crossesMidnight ? addDaysIso(dayIso, 1) : dayIso;
  const [ey, em, ed] = endDayIso.split('-').map(Number);
  const endsAt = wallClockToInstant(ey, em, ed, endClock.hour, endClock.minute, tz);
  return { startsAt, endsAt, crossesMidnight, bounded: true };
}

/**
 * The bounds of a run that spans several Melbourne days.
 *
 * A three-day festival listed under its opening day is not over at midnight on
 * that day, and treating it as one occurrence per day would label a run that is
 * still going as ended. The start time belongs to the first day, the end time
 * to the last, and everything between is inside the run.
 */
export function spanBounds(data, startDayIso, endDayIso, options = {}) {
  const first = occurrenceBounds(data, startDayIso, {
    ...options,
    isFirstDay: true,
    isFinalDay: startDayIso === endDayIso,
  });
  if (startDayIso === endDayIso) return first;
  const last = occurrenceBounds(data, endDayIso, { ...options, isFirstDay: false, isFinalDay: true });
  return {
    startsAt: first.startsAt,
    endsAt: last.endsAt,
    crossesMidnight: last.crossesMidnight,
    bounded: last.bounded,
  };
}

/** The occurrence-level exception for a given day, if the record declares one. */
export function exceptionFor(data, dayIso) {
  const list = Array.isArray(data?.occurrenceExceptions) ? data.occurrenceExceptions : [];
  return list.find((x) => parseDayIso(x?.date) === dayIso) ?? null;
}

/**
 * Whether the record was last verified before its own source last changed.
 *
 * This is the "late source update" case: the organiser moved the goalposts
 * after we signed the record off. The record is not known to be wrong, it is
 * known to be unchecked, so it keeps its listing and loses its promotion, and
 * it goes on the exception queue for a human. Both operands are stored fields,
 * so the answer never changes with the clock.
 */
export function sourceOutranksVerification(data) {
  const sourceUpdatedAt = toDate(data?.sourceUpdatedAt);
  if (!sourceUpdatedAt) return false;
  const verifiedAt = toDate(data?.lastVerifiedAt ?? data?.lastCheckedDate);
  if (!verifiedAt) return true;
  return sourceUpdatedAt.getTime() > verifiedAt.getTime();
}

/**
 * The cancellation test, lifted out of pages/whats-on/_data.ts so build scripts
 * can apply the same reading. `skipThis` is deliberately included: every
 * surface has always treated an editor's skip as a withdrawal.
 */
export function isCancelledRecord(data) {
  if (!data) return false;
  return (
    data.cancelled === true ||
    /cancelled/i.test(String(data.verificationStatus ?? '')) ||
    /^cancelled:/i.test(String(data.summary ?? '')) ||
    data.skipThis === true
  );
}

export const BOOKING_LABELS = {
  'sold-out': 'Sold out',
  waitlist: 'Waitlist only',
  closed: 'Bookings closed',
  open: null,
  'not-required': null,
  unknown: null,
};

/** schema.org availability for a booking status, or null when there is nothing to say. */
export function bookingAvailability(status) {
  switch (status) {
    case 'sold-out':
      return 'https://schema.org/SoldOut';
    case 'waitlist':
      return 'https://schema.org/LimitedAvailability';
    case 'closed':
      return 'https://schema.org/OutOfStock';
    case 'open':
      return 'https://schema.org/InStock';
    default:
      return null;
  }
}

/**
 * The record-level disposition: what is true of this event whatever day you
 * are looking at.
 *
 * `listable` answers "may this appear on a dated listing at all". `promotable`
 * is stricter: a pick, a homepage rail slot or an editor verdict is an active
 * recommendation, and an unverified or sold-out record has not earned one.
 */
export function recordDisposition(data, now = new Date()) {
  const reasons = [];
  const cancelled = isCancelledRecord(data);
  const postponed = data?.postponed === true;
  const rescheduledTo = dayIsoOf(data?.rescheduledTo);
  const expiresAt = toDate(data?.expiresAt);
  const expired = Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
  const unverified = sourceOutranksVerification(data);
  const bookingStatus = String(data?.bookingStatus ?? 'unknown');

  let status = 'scheduled';
  if (cancelled) status = 'cancelled';
  else if (postponed) status = rescheduledTo ? 'rescheduled' : 'postponed';

  if (expired) reasons.push('expired');
  if (cancelled) reasons.push('cancelled');
  if (status === 'postponed') reasons.push('postponed-without-new-date');
  if (unverified) reasons.push('source-newer-than-verification');

  // A postponed event with no announced date has no date to be listed under.
  // Cancellation is handled by the caller, because the sitemap deliberately
  // keeps cancelled URLs; an expired record is off every surface.
  const listable = !expired && status !== 'postponed';
  const promotable =
    listable &&
    status === 'scheduled' &&
    !unverified &&
    bookingStatus !== 'sold-out' &&
    bookingStatus !== 'closed';

  let label = null;
  if (status === 'cancelled') label = 'Cancelled';
  else if (status === 'postponed') label = 'Postponed';
  else if (status === 'rescheduled') label = 'New date';
  else label = BOOKING_LABELS[bookingStatus] ?? null;

  return { status, bookingStatus, rescheduledTo, expired, unverified, listable, promotable, label, reasons };
}

/**
 * One occurrence, fully resolved: when it runs, what state it is in, and
 * whether a reader can still act on it.
 *
 * `phase` is about the clock. `bookable` is about the reader. They come apart
 * on purpose: a Sunday visitor is allowed to look back across Friday and
 * Saturday, and Friday's row must say it has ended rather than quietly keep
 * offering a booking link. That is the acceptance criterion this function
 * exists to satisfy.
 */
export function resolveOccurrence(data, dayIso, now = new Date(), options = {}) {
  const exception = options.exception ?? exceptionFor(data, dayIso);
  // `endDayIso` says this row stands for a run of several days rather than one
  // occurrence on `dayIso`. Without it a festival listed under its opening day
  // reads as ended the moment that day closes, while it is still going.
  const endDayIso = options.endDayIso ?? dayIso;
  const bounds =
    endDayIso === dayIso
      ? occurrenceBounds(data, dayIso, { ...options, exception })
      : spanBounds(data, dayIso, endDayIso, { exception });
  const disposition = options.disposition ?? recordDisposition(data, now);

  let status = disposition.status;
  let label = disposition.label;
  let note = null;
  let sourceUrl = null;
  let soldOut = disposition.bookingStatus === 'sold-out' || disposition.bookingStatus === 'closed';

  if (exception) {
    note = exception.note ?? null;
    sourceUrl = exception.sourceUrl ?? null;
    if (exception.status === 'cancelled') {
      status = 'cancelled';
      label = 'Cancelled this time';
    } else if (exception.status === 'sold-out') {
      soldOut = true;
      label = 'Sold out';
    } else if (exception.status === 'rescheduled' || exception.status === 'postponed') {
      status = exception.rescheduledTo ? 'rescheduled' : 'postponed';
      label = exception.rescheduledTo ? 'Moved to another date' : 'Postponed';
    } else if (exception.status === 'moved') {
      label = exception.venueName ? `Moved to ${exception.venueName}` : 'Venue moved';
    } else if (exception.status === 'as-scheduled') {
      label = disposition.label;
    }
  }

  const t = now.getTime();
  const phase =
    t < bounds.startsAt.getTime() ? 'upcoming' : t <= bounds.endsAt.getTime() ? 'running' : 'past';

  const bookable = phase !== 'past' && status === 'scheduled' && !disposition.expired && !soldOut;

  if (phase === 'past' && !label) label = 'Ended';

  return {
    dayIso,
    startsAt: bounds.startsAt,
    endsAt: bounds.endsAt,
    crossesMidnight: bounds.crossesMidnight,
    bounded: bounds.bounded,
    status,
    phase,
    soldOut,
    bookable,
    label,
    note,
    sourceUrl,
    exception,
  };
}

/**
 * schema.org eventStatus for a resolved state, or null.
 *
 * Null matters. scripts/lint-seo-architecture.mjs fails the build on an
 * EventScheduled whose endDate is already past, so a finished event must emit
 * no status rather than a stale one. A cancellation keeps its status forever:
 * that it did not happen is still the answer to the reader's question.
 */
export function schemaEventStatus(status, { past = false } = {}) {
  if (status === 'cancelled') return 'https://schema.org/EventCancelled';
  if (status === 'postponed') return 'https://schema.org/EventPostponed';
  if (status === 'rescheduled') return 'https://schema.org/EventRescheduled';
  if (past) return null;
  return 'https://schema.org/EventScheduled';
}

/**
 * Every reason this record cannot be decided by machine, as exception-queue
 * entries. The expiry job writes these out; the safeguard audit gates on the
 * count so the queue cannot silently grow.
 *
 * Every class below compares stored fields with stored fields. None of them
 * consults the clock, so none can start failing on a quiet Tuesday with no
 * content change. That is the rule audit-event-safeguards.mjs was written to
 * enforce, and the reason staleVerificationDate is not gated there.
 */
export function occurrenceExceptionQueue(data) {
  const out = [];
  const add = (kind, detail) => out.push({ kind, detail });

  if (data?.postponed === true && !dayIsoOf(data?.rescheduledTo)) {
    add('postponed-without-new-date', 'postponed with no rescheduledTo; a human must chase the date');
  }
  if (data?.postponed === true && isCancelledRecord(data)) {
    add('contradictory-status', 'the record is both cancelled and postponed');
  }
  if (sourceOutranksVerification(data)) {
    add('source-newer-than-verification', 'sourceUpdatedAt is later than the last verification');
  }

  // Deliberately NOT "expiresAt before startDate". That is the whole point of
  // giving expiry its own field: a listing whose source only confirms it to
  // the end of October expires then, whatever December the event runs in.
  // Expiring before the record was even published is the real contradiction.
  const expiresAt = toDate(data?.expiresAt);
  const publishedAt = toDate(data?.publishedAt);
  if (expiresAt && publishedAt && expiresAt.getTime() < publishedAt.getTime()) {
    add(
      'expiry-before-publication',
      `expiresAt ${dayIsoOf(expiresAt)} precedes publishedAt ${dayIsoOf(publishedAt)}`
    );
  }

  const bookingStatus = String(data?.bookingStatus ?? 'unknown');
  if (
    (bookingStatus === 'sold-out' || bookingStatus === 'closed') &&
    !data?.bookingStatusSourceUrl &&
    !data?.bookingStatusNote
  ) {
    add('booking-status-without-source', `${bookingStatus} asserted with neither a note nor a source`);
  }

  const exceptions = Array.isArray(data?.occurrenceExceptions) ? data.occurrenceExceptions : [];
  for (const x of exceptions) {
    const day = parseDayIso(x?.date);
    if (!day) {
      add('exception-undated', `occurrenceExceptions entry with no usable date: ${JSON.stringify(x?.date ?? null)}`);
      continue;
    }
    if ((x.status === 'rescheduled' || x.status === 'moved') && !x.rescheduledTo && !x.venueName && !x.note) {
      add('exception-without-target', `${day} is ${x.status} with no new date, venue or note`);
    }
    if (x.status === 'postponed' && !x.rescheduledTo) {
      add('postponed-without-new-date', `${day} is postponed with no new date`);
    }
  }

  // A single-day record whose end time is at or before its start time is either
  // a cross-midnight occurrence or a typo, and the two are indistinguishable
  // unless the record says which. endsNextDay settles it.
  const start = parseClock(data?.startTime);
  const end = parseClock(data?.endTime);
  const sameDay = !data?.endDate || dayIsoOf(data.endDate) === dayIsoOf(data.startDate);
  if (start && end && sameDay && typeof data?.endsNextDay !== 'boolean') {
    if (end.hour * 60 + end.minute <= start.hour * 60 + start.minute) {
      add(
        'ambiguous-midnight-crossing',
        `${data.startTime} to ${data.endTime} on one day; set endsNextDay to say which`
      );
    }
  }

  return out;
}

/**
 * Is the new occurrence model live for this render?
 *
 * Three states, because two are not enough. `off` is the rollback: the previous
 * renderer, one env change, no revert. `on` forces the new model even when the
 * expiry job is unhealthy, which is what you want while debugging the job. The
 * default, `auto`, is the interlock the ticket asks for: if the expiry job has
 * not run, has reported a failure, or has gone quiet for a week, the renderer
 * restores the previous behaviour by itself and says so in the build log.
 * Degrading to code that has been serving readers all year is the safe
 * direction to fail.
 */
export function occurrenceModelEnabled({
  flag,
  health,
  now = new Date(),
  maxAgeHours = EXPIRY_MAX_AGE_HOURS,
} = {}) {
  const mode = flag === 'off' || flag === 'on' ? flag : 'auto';
  if (mode === 'off') return { enabled: false, mode, reason: 'flag-off' };
  if (mode === 'on') return { enabled: true, mode, reason: 'flag-forced' };
  if (!health || typeof health !== 'object') {
    return { enabled: false, mode, reason: 'expiry-state-missing' };
  }
  if (health.ok !== true) return { enabled: false, mode, reason: 'expiry-job-failed' };
  const generatedAt = toDate(health.generatedAt);
  if (!generatedAt) return { enabled: false, mode, reason: 'expiry-state-undated' };
  const ageHours = (now.getTime() - generatedAt.getTime()) / 3600000;
  if (ageHours > maxAgeHours) {
    return { enabled: false, mode, reason: `expiry-state-stale-${Math.round(ageHours)}h` };
  }
  return { enabled: true, mode, reason: 'healthy' };
}
