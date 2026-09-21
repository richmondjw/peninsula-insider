const EDITORIAL_TIME_ZONE = 'Australia/Melbourne';

function editorialDateParts(d: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EDITORIAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function startOfDay(d: Date): Date {
  const { year, month, day } = editorialDateParts(d);
  return new Date(Date.UTC(year, month - 1, day));
}
export function addDays(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}
export function isoDate(d: Date): string {
  const { year, month, day } = editorialDateParts(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${year}-${p(month)}-${p(day)}`;
}
function parseIsoLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "Fri 11 - Sun 13 July" (en dash; em dashes are banned house-wide). */
export function rangeLabel(start: Date, end: Date): string {
  const dow = (d: Date) => d.toLocaleDateString('en-AU', { weekday: 'short', timeZone: 'UTC' });
  const day = (d: Date) => d.getUTCDate();
  const month = (d: Date) => d.toLocaleDateString('en-AU', { month: 'long', timeZone: 'UTC' });
  if (isoDate(start) === isoDate(end)) return `${dow(start)} ${day(start)} ${month(start)}`;
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${dow(start)} ${day(start)} – ${dow(end)} ${day(end)} ${month(end)}`;
  }
  return `${dow(start)} ${day(start)} ${month(start)} – ${dow(end)} ${day(end)} ${month(end)}`;
}

export function dayHeading(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

// ---------------------------------------------------------------------------
// Scope windows
// ---------------------------------------------------------------------------

export interface ScopeWindow {
  start: Date;
  end: Date;
  label: string;
}

/**
 * The SELECTION weekend: Friday to Sunday, the window "what is on this
 * weekend" is answered over. Sunday still belongs to the weekend that began
 * on Friday, so a Sunday reader can look back across the whole of it.
 *
 * The homepage uses Saturday–Sunday and limits its picks to those dates.
 * This calendar includes Friday explicitly in its displayed date label.
 *
 * A Friday occurrence is therefore listable on the hub all weekend, and past
 * once Friday's end time has gone. resolveOccurrence, not this window, is what
 * stops it looking bookable on Sunday morning.
 */
export function weekendWindow(now: Date, offsetWeeks = 0): ScopeWindow {
  const today = startOfDay(now);
  const dow = today.getUTCDay(); // 0 Sun .. 6 Sat
  let fri: Date;
  if (dow === 0) fri = addDays(today, -2);
  else if (dow >= 5) fri = addDays(today, 5 - dow);
  else fri = addDays(today, 5 - dow);
  fri = addDays(fri, offsetWeeks * 7);
  const sun = addDays(fri, 2);
  return { start: fri, end: sun, label: rangeLabel(fri, sun) };
}

/**
 * VIC government school holiday ranges (2026 gazetted term dates plus the
 * summer tail into 2027). Maintained by hand; extend each December.
 */
export const SCHOOL_HOLIDAY_RANGES: { start: string; end: string; name: string }[] = [
  { start: '2026-03-28', end: '2026-04-12', name: 'Autumn school holidays' },
  { start: '2026-06-27', end: '2026-07-12', name: 'Winter school holidays' },
  { start: '2026-09-19', end: '2026-10-04', name: 'Spring school holidays' },
  { start: '2026-12-19', end: '2027-01-26', name: 'Summer school holidays' },
];

/** Current-or-next school holiday window, or null when the table runs out. */
export function schoolHolidayWindow(now: Date): (ScopeWindow & { name: string }) | null {
  const today = startOfDay(now);
  for (const r of SCHOOL_HOLIDAY_RANGES) {
    const end = parseIsoLocal(r.end);
    if (end < today) continue;
    const start = parseIsoLocal(r.start);
    const from = start > today ? start : today;
    return { start: from, end, label: rangeLabel(from, end), name: r.name };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Occurrence rules - one shape for server and client
// ---------------------------------------------------------------------------

export interface OccurrenceRule {
  kind: 'range' | 'weekly' | 'monthly';
  /** Inclusive bounds (for weekly/monthly these bound the series). */
  start: Date;
  end: Date;
  /** 0 Sun .. 6 Sat, weekly + monthly. */
  day?: number;
  /** Multiple weekdays for prose such as "Thursday to Sunday". */
  days?: number[];
  /** 1..5 = nth weekday of the month, -1 = last. Monthly only. */
  nth?: number;
  /** 1..12, when the recurrence note explicitly limits the operating season. */
  months?: number[];
}

const DAY_WORDS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tues: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thurs: 4, thur: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};
const NTH_WORDS: Record<string, number> = {
  first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3,
  fourth: 4, '4th': 4, fifth: 5, '5th': 5, last: -1,
};

const MONTH_WORDS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function applicableMonths(text: string): number[] | undefined {
  const lower = text.toLowerCase();
  const season = lower.match(/\b(spring|summer|autumn|winter)\b/);
  if (season && /\b(?:during|in|through|from|winter|summer|autumn|spring)\b/.test(lower)) {
    const months: Record<string, number[]> = {
      summer: [12, 1, 2], autumn: [3, 4, 5], winter: [6, 7, 8], spring: [9, 10, 11],
    };
    return months[season[1]];
  }
  const range = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:to|through|-)\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (!range) return undefined;
  const start = MONTH_WORDS[range[1]];
  const end = MONTH_WORDS[range[2]];
  const result: number[] = [];
  for (let month = start; ; month = (month % 12) + 1) {
    result.push(month);
    if (month === end) break;
  }
  return result;
}

function parseWeekday(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(sun|mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?)(?:day)?s?\b/);
  if (!m) return undefined;
  return DAY_WORDS[m[1]] ?? DAY_WORDS[`${m[1]}day`];
}
function parseWeekdays(text: string): number[] {
  const matches = [...text.toLowerCase().matchAll(/\b(sun|mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?)(?:day)?s?\b/g)];
  const days = matches
    .map((m) => DAY_WORDS[m[1]] ?? DAY_WORDS[`${m[1]}day`])
    .filter((day): day is number => day !== undefined);
  if (days.length === 2 && /\b(?:to|through)\b|[–-]/.test(text)) {
    const expanded = [days[0]];
    while (expanded.at(-1) !== days[1]) expanded.push((expanded.at(-1)! + 1) % 7);
    return expanded;
  }
  return [...new Set(days)];
}
function parseNth(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\b/);
  return m ? NTH_WORDS[m[1]] : undefined;
}

const FAR_HORIZON_DAYS = 370;

/** Derive the single occurrence rule for an event, or null when undated. */
export function ruleFor(event: { data: Record<string, any> }, now: Date): OccurrenceRule | null {
  const data = event.data as Record<string, any>;
  const today = startOfDay(now);
  const start: Date | undefined = data.startDate ? startOfDay(data.startDate) : undefined;
  const endRaw: Date | undefined = data.endDate ? startOfDay(data.endDate) : start;
  const next: Date | undefined = data.nextOccurrence ? startOfDay(data.nextOccurrence) : undefined;
  // A computed occurrence before a future series start contradicts the
  // record's own bounds. Ignore it instead of publishing the impossible date.
  const validNext = next && (!start || next >= start) ? next : undefined;
  const recur: string = data.recurrence ?? 'one-off';
  const noteText = [data.recurrenceNote, data.title, data.summary].filter(Boolean).join(' ');
  const months = applicableMonths(data.recurrenceNote ?? '');

  const seriesStart = start ?? today;
  // A recurring series without an explicit end runs to the far horizon.
  const seriesEnd =
    endRaw && endRaw > seriesStart && ['weekly', 'monthly', 'ongoing'].includes(recur)
      ? endRaw
      : addDays(today, FAR_HORIZON_DAYS);

  if (recur === 'weekly') {
    // Prefer explicit copy, but a weekly series' start date is also a valid
    // weekday anchor. Falling back to a continuous range made Friday-only
    // events appear on every day when the prose omitted the weekday.
    const days = parseWeekdays(data.recurrenceNote ?? '');
    const day = days[0] ?? start?.getUTCDay();
    if (day !== undefined) return { kind: 'weekly', start: seriesStart, end: seriesEnd, day, days: days.length ? days : undefined, months };
    if (validNext && validNext >= today) return { kind: 'range', start: validNext, end: validNext };
    return start && endRaw ? { kind: 'range', start, end: endRaw } : null;
  }

  if (recur === 'monthly') {
    const day = parseWeekday(noteText);
    const nth = parseNth(noteText);
    if (day !== undefined && nth !== undefined) {
      return { kind: 'monthly', start: seriesStart, end: seriesEnd, day, nth, months };
    }
    // Do not invent a monthly cadence from a stale nextOccurrence. Without an
    // explicit weekday + ordinal, expose only a dated future occurrence and
    // let the record drop out once that date passes.
    if (validNext && validNext >= today) return { kind: 'range', start: validNext, end: validNext };
    return start && start >= today && endRaw ? { kind: 'range', start, end: endRaw } : null;
  }

  if (!start || !endRaw) return null;

  // Annual / seasonal / one-off / ongoing: a plain date range. When the
  // listed dates are past but the cron has computed a fresh occurrence,
  // shift the same span onto it.
  if (endRaw < today && validNext && validNext >= today) {
    const spanDays = Math.round((endRaw.getTime() - start.getTime()) / 86400000);
    return { kind: 'range', start: validNext, end: addDays(validNext, Math.max(0, spanDays)) };
  }
  return { kind: 'range', start, end: endRaw };
}

function nthWeekdayIndex(d: Date): { nth: number; isLast: boolean } {
  const nth = Math.floor((d.getUTCDate() - 1) / 7) + 1;
  const isLast = d.getUTCDate() + 7 > new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return { nth, isLast };
}

export function occursOnDay(rule: OccurrenceRule, day: Date): boolean {
  const d = startOfDay(day);
  if (d < startOfDay(rule.start) || d > startOfDay(rule.end)) return false;
  if (rule.months && !rule.months.includes(d.getUTCMonth() + 1)) return false;
  if (rule.kind === 'range') return true;
  if (!(rule.days ?? [rule.day]).includes(d.getUTCDay())) return false;
  if (rule.kind === 'weekly') return true;
  const { nth, isLast } = nthWeekdayIndex(d);
  return rule.nth === -1 ? isLast : nth === rule.nth;
}

export function occursInWindow(rule: OccurrenceRule, win: ScopeWindow): boolean {
  const days = Math.round((startOfDay(win.end).getTime() - startOfDay(win.start).getTime()) / 86400000);
  for (let i = 0; i <= days; i += 1) {
    if (occursOnDay(rule, addDays(win.start, i))) return true;
  }
  return false;
}
