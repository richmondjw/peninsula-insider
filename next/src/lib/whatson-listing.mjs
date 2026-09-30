import { resolveOccurrence } from './event-occurrence.mjs';

// Listing vocabulary for /whats-on/, shared by the server render (_data.ts)
// and the client scope island (index.astro), so a row reads the same whichever
// side drew it. Dates here are UTC date-only values.
//
// Every date token keeps its parts together with U+00A0, so a meta line can
// wrap between tokens but never inside "30 Apr 2027".

const NBSP = ' ';
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const sameDay = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();

/** "Sat 17 Oct" */
function dayToken(d) {
  return [DOW_SHORT[d.getUTCDay()], d.getUTCDate(), MONTH_SHORT[d.getUTCMonth()]].join(NBSP);
}

/** "Sat 17 Oct", "Sat 17 – Sun 18 Oct" or "Sat 31 Oct – Sun 1 Nov". */
export function spanLabel(start, end) {
  if (sameDay(start, end)) return dayToken(start);
  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    return `${DOW_SHORT[start.getUTCDay()]}${NBSP}${start.getUTCDate()} – ${dayToken(end)}`;
  }
  return `${dayToken(start)} – ${dayToken(end)}`;
}

/** "To 22 Nov", with the year only when it differs from `reference`. */
export function untilLabel(end, reference) {
  const parts = [end.getUTCDate(), MONTH_SHORT[end.getUTCMonth()]];
  if (end.getUTCFullYear() !== reference.getUTCFullYear()) parts.push(end.getUTCFullYear());
  return `To ${parts.join(NBSP)}`;
}

const DOW_PLURAL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const DAY_MS = 86400000;
/** A run that closes this long after the window is "on all weekend", not news. */
const NEAR_CLOSE_DAYS = 30;

/**
 * The one cadence vocabulary for the page (WO22). Pick badges, row lead
 * tokens and shelf tokens all read from here, so one rule never gets two
 * names: "Daily", "Saturdays", "Thu to Sun", "Fri and Sun", "Monthly",
 * "To 22 Nov", "All weekend".
 *
 * A series gives its cadence. A range needs the window it is read against:
 * a one-day event gives nothing (its day heading says when), a run held
 * inside the window gives its own dates, and a run that covers a whole
 * weekend window and closes more than a month later reads "All weekend"
 * (its season end belongs on the detail page). Otherwise the closing date.
 */
export function cadenceLabel(rule, window) {
  if (rule.kind === 'monthly') return 'Monthly';
  if (rule.kind === 'weekly') {
    const days = rule.days && rule.days.length ? rule.days : rule.day !== undefined ? [rule.day] : [];
    if (days.length === 0) return 'Weekly';
    if (days.length >= 7) return 'Daily';
    if (days.length === 1) return DOW_PLURAL[days[0]];
    const consecutive = days.every((d, i) => i === 0 || d === (days[i - 1] + 1) % 7);
    if (consecutive && days.length >= 3) return `${DOW_SHORT[days[0]]} to ${DOW_SHORT[days[days.length - 1]]}`;
    const names = days.map((d) => DOW_SHORT[d]);
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  if (!window) return '';
  if (sameDay(rule.start, rule.end)) return '';
  if (rule.start >= window.start && rule.end <= window.end) return spanLabel(rule.start, rule.end);
  const windowDays = Math.round((window.end.getTime() - window.start.getTime()) / DAY_MS) + 1;
  const coversWindow = rule.start <= window.start && rule.end >= window.end;
  const closesLater = rule.end.getTime() - window.end.getTime() > NEAR_CLOSE_DAYS * DAY_MS;
  if (windowDays <= 3 && coversWindow && closesLater) return 'All weekend';
  return untilLabel(rule.end, window.start);
}

/**
 * The long-form cadence of a weekly or monthly series: "Every Saturday",
 * "Every Thu to Sun", "Every Fri and Sun", "Monthly". `short` abbreviates a
 * single weekday too ("Every Sun"). The listing itself now speaks
 * cadenceLabel() below; this form is kept for callers outside the listing.
 */
export function recurrenceLabel(rule, { short = false } = {}) {
  if (rule.kind === 'monthly') return 'Monthly';
  if (rule.kind !== 'weekly') return '';
  const days = rule.days && rule.days.length ? rule.days : rule.day !== undefined ? [rule.day] : [];
  if (days.length === 0) return 'Weekly';
  if (days.length === 1) return `Every ${(short ? DOW_SHORT : DOW_LONG)[days[0]]}`;
  const consecutive = days.every((d, i) => i === 0 || d === (days[i - 1] + 1) % 7);
  if (consecutive && days.length >= 3) {
    return `Every ${DOW_SHORT[days[0]]} to ${DOW_SHORT[days[days.length - 1]]}`;
  }
  const names = days.map((d) => DOW_SHORT[d]);
  return `Every ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The date token a listing row carries for a selected window: the shared
 * cadence vocabulary above, read against that window.
 *
 * Calendar selection is not an event closing date: a range that runs past the
 * window says when it closes ("To 22 Nov") unless the close is far off, a
 * range contained in the window gives its own dates, a one-day event needs no
 * token at all (the day heading above it already says when), and a series
 * gives its cadence.
 */
export function listingDateLabel(rule, window) {
  return cadenceLabel(rule, window);
}

/**
 * Split the listings of a window so each one shows once.
 *
 * Anything that occurs on more than one day of the window (a run, a weekly
 * series on several days, the same market every Saturday of a month) goes
 * into `ongoing`, once. Only a listing tied to a single day of the window is
 * filed under that day. `occursOn(item, day)` answers the calendar question.
 */
export function partitionWindow(items, days, occursOn) {
  const ongoing = [];
  const perDay = days.map((day) => ({ day, items: [], ongoingCount: 0 }));
  for (const item of items) {
    const hits = [];
    days.forEach((day, i) => {
      if (occursOn(item, day)) hits.push(i);
    });
    if (hits.length === 0) continue;
    if (hits.length === 1) {
      perDay[hits[0]].items.push(item);
      continue;
    }
    ongoing.push({ item, dayIndexes: hits });
    for (const i of hits) perDay[i].ongoingCount += 1;
  }
  return { ongoing, days: perDay };
}

/** A range row represents its entire published run, even when selection shows only part. */
export function resolveListingOccurrence(data, rule, dayIso, now = new Date()) {
  const iso = date => date.toISOString().slice(0, 10);
  const occurrence = resolveOccurrence(data, rule.kind === 'range' ? iso(rule.start) : dayIso, now,
    rule.kind === 'range' ? { endDayIso: iso(rule.end) } : {});
  // The occurrence model has exactly these three clock states. Preserve that union across JS/TS.
  const phase = /** @type {'upcoming' | 'running' | 'past'} */ (occurrence.phase);
  return { ...occurrence, phase };
}
