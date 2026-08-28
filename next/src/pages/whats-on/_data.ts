/**
 * _data.ts - private data loader for /whats-on/ (v5 rebuild, T-601).
 *
 * Not a route (underscore prefix). Only /whats-on/index.astro and
 * /whats-on/feed.json.ts import this; no shared loader was touched.
 *
 * Responsibilities:
 *  - load live (published, non-cancelled, not-yet-over) events once
 *  - turn each event's recurrence data into ONE occurrence rule that both
 *    the server (default weekend view) and the client (feed.json island)
 *    can expand deterministically
 *  - date-scope windows: this weekend (Fri-Sun), next weekend, VIC school
 *    holidays, custom range, month ahead
 *  - PI's picks: the weekend-picks collection entry for the current
 *    weekend, falling back to lens/appeal scoring (exactly 3)
 *  - category shelves (Markets, Live music, Food & wine, Openings,
 *    Major events)
 *  - the compact feed payload for /whats-on/feed.json (HUB-11: the month+
 *    horizon ships as fetch-on-demand JSON, never as hidden DOM)
 */
import { rotateDaily } from '../../lib/daily-rotation';
import { getCollection, type CollectionEntry } from 'astro:content';
import { routeSlug, eventCategoryLabel } from '../../lib/editorial';
import { emptyDayMessage } from '../../lib/whatson-empty-state.mjs';
import { eventAccessLabel, eventIsUnqualifiedFree } from '../../lib/event-access.mjs';

export type EventEntry = CollectionEntry<'events'>;

// ---------------------------------------------------------------------------
// Small date helpers. The site's editorial calendar is Mornington Peninsula
// time, not the build machine's timezone. Represent calendar days as UTC
// midnight so the existing date-only arithmetic stays deterministic in CI.
// ---------------------------------------------------------------------------

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
  return new Date(y, m - 1, d);
}

export function auSeasonWord(d: Date): string {
  const m = d.getMonth();
  if (m === 11 || m <= 1) return 'summer';
  if (m <= 4) return 'autumn';
  if (m <= 7) return 'winter';
  return 'spring';
}

/** "Fri 11 - Sun 13 July" (en dash; em dashes are banned house-wide). */
export function rangeLabel(start: Date, end: Date): string {
  const dow = (d: Date) => d.toLocaleDateString('en-AU', { weekday: 'short' });
  const day = (d: Date) => d.getDate();
  const month = (d: Date) => d.toLocaleDateString('en-AU', { month: 'long' });
  if (isoDate(start) === isoDate(end)) return `${dow(start)} ${day(start)} ${month(start)}`;
  if (start.getMonth() === end.getMonth()) {
    return `${dow(start)} ${day(start)} – ${dow(end)} ${day(end)} ${month(end)}`;
  }
  return `${dow(start)} ${day(start)} ${month(start)} – ${dow(end)} ${day(end)} ${month(end)}`;
}

export function dayHeading(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ---------------------------------------------------------------------------
// Scope windows
// ---------------------------------------------------------------------------

export interface ScopeWindow {
  start: Date;
  end: Date;
  label: string;
}

/** Fri-Sun window containing `now` (Sun still counts) or the next one. */
export function weekendWindow(now: Date, offsetWeeks = 0): ScopeWindow {
  const today = startOfDay(now);
  const dow = today.getDay(); // 0 Sun .. 6 Sat
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
  return [...new Set(days)];
}
function parseNth(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\b/);
  return m ? NTH_WORDS[m[1]] : undefined;
}

const FAR_HORIZON_DAYS = 370;

/** Derive the single occurrence rule for an event, or null when undated. */
export function ruleFor(event: EventEntry, now: Date): OccurrenceRule | null {
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
    const day = days[0] ?? start?.getDay();
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
  const nth = Math.floor((d.getDate() - 1) / 7) + 1;
  const isLast = d.getDate() + 7 > new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { nth, isLast };
}

export function occursOnDay(rule: OccurrenceRule, day: Date): boolean {
  const d = startOfDay(day);
  if (d < startOfDay(rule.start) || d > startOfDay(rule.end)) return false;
  if (rule.months && !rule.months.includes(d.getMonth() + 1)) return false;
  if (rule.kind === 'range') return true;
  if (!(rule.days ?? [rule.day]).includes(d.getDay())) return false;
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

// ---------------------------------------------------------------------------
// Event loading + presentation helpers
// ---------------------------------------------------------------------------

export interface LiveEvent {
  event: EventEntry;
  rule: OccurrenceRule;
  slug: string;
  href: string;
  title: string;
  oneLiner: string;
  meta: string[];
  timeLabel: string;
  categoryLabel: string;
  placeLabel: string;
  free: boolean;
  accessLabel: string | null;
  appeal: number;
}

/**
 * Whether an event is still a current, indexable event destination.
 *
 * `status` remains the editorial safety switch: a record deliberately marked
 * archived must not regain indexability merely because a generic recurrence
 * rule can be inferred from old prose. For published records, the shared
 * recurrence rule is the source of truth, so recurring series stay live when
 * their original dated occurrence has passed but a valid future cadence exists.
 */
export function isCurrentEvent(event: EventEntry, now: Date): boolean {
  if (event.data.status !== 'published') return false;
  const rule = ruleFor(event, now);
  return rule !== null && startOfDay(rule.end) >= startOfDay(now);
}

export function truncateWords(text: unknown, maxWords: number): string {
  const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function timeLabelFor(startTime: unknown): string {
  if (typeof startTime !== 'string') return '';
  const m = startTime.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  let h = Number(m[1]);
  const mins = m[2];
  const suffix = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return mins === '00' ? `${h}${suffix}` : `${h}.${mins}${suffix}`;
}

function isCancelled(data: Record<string, any>): boolean {
  return (
    data.cancelled === true ||
    /cancelled/i.test(data.verificationStatus ?? '') ||
    /^cancelled:/i.test(data.summary ?? '') ||
    data.skipThis === true
  );
}

/**
 * Whether a record has been withdrawn because the event will not happen.
 *
 * Distinct from , which only answers "is this date still
 * ahead of us". A cancelled event can be both published and future-dated:
 * that is exactly the case the cancellation notice exists to serve. Exported
 * so surfaces that read the raw collection (place hubs, the homepage rail)
 * apply the same test as  instead of inventing their own.
 */
export function isCancelledEvent(event: EventEntry): boolean {
  return isCancelled(event.data as Record<string, any>);
}

export interface LoadLiveEventsOptions {
  /**
   * Keep cancelled records in the result. Only the sitemap sets this. The
   * cancellation notice stays indexable (see whats-on/[slug].astro), so
   * omitting it from the sitemap while the page still says index would
   * desynchronise the two and trip the sitemap-absent ratchet in
   * lint-seo-architecture.mjs. Reader-facing listings must never set it.
   */
  includeCancelled?: boolean;
}

/** All live events with their rule and display fields, appeal-sorted. */
export async function loadLiveEvents(
  now: Date,
  options: LoadLiveEventsOptions = {}
): Promise<LiveEvent[]> {
  const entries = await getCollection('events', ({ data }) => data.status === 'published');
  const out: LiveEvent[] = [];
  for (const event of entries) {
    const data = event.data as Record<string, any>;
    if (isCancelled(data) && !options.includeCancelled) continue;
    const rule = ruleFor(event, now);
    if (!rule || !isCurrentEvent(event, now)) continue;

    const slug = routeSlug(event);
    const categoryLabel = eventCategoryLabel[data.category] ?? '';
    const placeLabel = data.suburb || data.venueName || '';
    const timeLabel = timeLabelFor(data.startTime);
    const free = eventIsUnqualifiedFree(data);
    const accessLabel = eventAccessLabel(data);
    const meta = [timeLabel, placeLabel, categoryLabel].filter(Boolean).slice(0, 3);
    if (accessLabel) {
      if (meta.length === 3) meta[2] = accessLabel;
      else meta.push(accessLabel);
    }
    const appeal =
      (data.visitorAppealScore ?? 0) +
      (data.editorialPriority ?? 0) * 0.5 +
      (data.worthTheDrive ? 0.5 : 0) +
      (data.standoutOfMonth ? 0.5 : 0);

    out.push({
      event,
      rule,
      slug,
      href: `/whats-on/${slug}/`,
      title: data.title,
      oneLiner: truncateWords(data.editorVerdict ?? data.whyWeCare ?? data.summary, 20),
      meta,
      timeLabel,
      categoryLabel,
      placeLabel,
      free,
      accessLabel,
      appeal,
    });
  }
  return out.sort((a, b) => b.appeal - a.appeal || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// Day grouping (server side, default weekend view)
// ---------------------------------------------------------------------------

export interface DayGroup {
  iso: string;
  heading: string;
  continuingCount: number;
  emptyMessage: string;
  items: { live: LiveEvent; spanLabel: string }[];
}

/**
 * Group events by day across a window. Multi-day ranges appear once, on
 * their first active day, with a "runs to" span label; weekly/monthly
 * series appear on each matching day (each is a distinct occurrence).
 */
export function groupByDay(events: LiveEvent[], win: ScopeWindow): DayGroup[] {
  const dayCount =
    Math.round((startOfDay(win.end).getTime() - startOfDay(win.start).getTime()) / 86400000) + 1;
  const seenRanges = new Set<string>();
  const groups: DayGroup[] = [];
  for (let i = 0; i < Math.min(dayCount, 62); i += 1) {
    const day = addDays(win.start, i);
    const items: DayGroup['items'] = [];
    let continuingCount = 0;
    for (const live of events) {
      if (!occursOnDay(live.rule, day)) continue;
      if (live.rule.kind === 'range') {
        if (seenRanges.has(live.slug)) {
          continuingCount += 1;
          continue;
        }
        seenRanges.add(live.slug);
        const runsTo = startOfDay(live.rule.end) < startOfDay(win.end) ? live.rule.end : win.end;
        const spanLabel =
          isoDate(runsTo) > isoDate(day)
            ? `runs to ${runsTo.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}`
            : '';
        items.push({ live, spanLabel });
      } else {
        items.push({ live, spanLabel: '' });
      }
    }
    items.sort((a, b) => b.live.appeal - a.live.appeal || a.live.title.localeCompare(b.live.title));
    groups.push({
      iso: isoDate(day),
      heading: dayHeading(day),
      continuingCount,
      emptyMessage: emptyDayMessage(continuingCount),
      items,
    });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// PI's picks - exactly 3
// ---------------------------------------------------------------------------

export interface Pick {
  live: LiveEvent;
  verdict: string;
  dateISO: string;
  dayLabel: string;
}

export function firstDayInWindow(rule: OccurrenceRule, win: ScopeWindow): Date | null {
  const days =
    Math.round((startOfDay(win.end).getTime() - startOfDay(win.start).getTime()) / 86400000) + 1;
  for (let i = 0; i < days; i += 1) {
    const d = addDays(win.start, i);
    if (occursOnDay(rule, d)) return d;
  }
  return null;
}

export async function getPicks(events: LiveEvent[], win: ScopeWindow): Promise<Pick[]> {
  const inWindow = events.filter((e) => occursInWindow(e.rule, win));
  const bySlug = new Map(inWindow.map((e) => [e.slug, e]));
  const picks: Pick[] = [];

  const toPick = (live: LiveEvent, verdict: string): Pick => {
    const day = firstDayInWindow(live.rule, win) ?? win.start;
    return {
      live,
      verdict: truncateWords(verdict, 25),
      dateISO: isoDate(day),
      dayLabel: day.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  };

  // Editorial source of truth first: the weekend-picks entry whose Saturday
  // falls inside this window.
  const sheets = await getCollection('weekend-picks');
  const sheet = sheets.find((s) => {
    const sat = startOfDay(s.data.weekendStart);
    return sat >= startOfDay(win.start) && sat <= startOfDay(win.end);
  });
  if (sheet) {
    for (const p of [...sheet.data.picks].sort((a, b) => a.position - b.position)) {
      const live = bySlug.get(p.eventSlug);
      if (live) picks.push(toPick(live, p.editorVerdict));
      if (picks.length === 3) return picks;
    }
  }

  // Fallback: lens/appeal scoring over what is actually on this weekend.
  const chosen = new Set(picks.map((p) => p.live.slug));
  const scored = inWindow
    .filter((e) => !chosen.has(e.slug))
    .map((e) => {
      const data = e.event.data as Record<string, any>;
      const lens: string[] = Array.isArray(data.lens) ? data.lens : [];
      const score =
        (lens.includes('weekend-pick') ? 3 : 0) +
        (data.standoutOfMonth ? 2 : 0) +
        (data.editorVerdict ? 1 : 0) +
        e.appeal;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);
  // Same staleness as the homepage module: this score is static per event, so
  // the same three surface every day the window holds. Rotate through the top
  // of the ranking once per Melbourne day. The editorial sheet above returns
  // early and is never rotated.
  for (const { e } of rotateDaily(scored, new Date())) {
    picks.push(toPick(e, (e.event.data as any).editorVerdict ?? e.oneLiner));
    if (picks.length === 3) break;
  }

  // Quiet-weekend guard: the module always shows exactly 3, so top up from
  // the month ahead when the weekend itself cannot fill it.
  if (picks.length < 3) {
    const monthWin: ScopeWindow = { start: win.start, end: addDays(win.start, 31), label: '' };
    const have = new Set(picks.map((p) => p.live.slug));
    for (const e of events) {
      if (have.has(e.slug) || !occursInWindow(e.rule, monthWin)) continue;
      const day = firstDayInWindow(e.rule, monthWin) ?? monthWin.start;
      picks.push({
        live: e,
        verdict: truncateWords((e.event.data as any).editorVerdict ?? e.oneLiner, 25),
        dateISO: isoDate(day),
        dayLabel: day.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }),
      });
      if (picks.length === 3) break;
    }
  }
  return picks;
}

// ---------------------------------------------------------------------------
// Shelves - category entry points, anchor-linked
// ---------------------------------------------------------------------------

export interface Shelf {
  id: string;
  label: string;
  items: LiveEvent[];
}

const SHELF_DEFS: { id: string; label: string; cats: string[] }[] = [
  { id: 'markets', label: 'Markets', cats: ['market'] },
  { id: 'live-music', label: 'Live music', cats: ['live-music'] },
  { id: 'food-wine', label: 'Food & wine', cats: ['food-wine', 'cellar-door'] },
  { id: 'openings', label: 'Openings', cats: ['exhibition', 'arts'] },
  { id: 'major-events', label: 'Major events', cats: ['festival', 'racing-sport'] },
];

export function getShelves(events: LiveEvent[], now: Date, exclude: Set<string>): Shelf[] {
  const horizon: ScopeWindow = {
    start: startOfDay(now),
    end: addDays(startOfDay(now), 62),
    label: '',
  };
  return SHELF_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    items: events
      .filter(
        (e) =>
          def.cats.includes((e.event.data as any).category) &&
          !exclude.has(e.slug) &&
          occursInWindow(e.rule, horizon)
      )
      .slice(0, 4),
  }));
}

// ---------------------------------------------------------------------------
// Feed payload (the JSON island behind /whats-on/feed.json)
// ---------------------------------------------------------------------------

export interface FeedEntry {
  slug: string;
  href: string;
  t: string; // title
  d: string; // one-liner
  m: string[]; // meta chips
  k: 'range' | 'weekly' | 'monthly';
  s: string; // rule start ISO date
  e: string; // rule end ISO date
  wd?: number; // weekday
  wds?: number[]; // multiple weekdays
  nth?: number; // nth weekday of month (-1 = last)
  months?: number[];
}

export function feedFor(events: LiveEvent[]): FeedEntry[] {
  return events.map((live) => {
    const entry: FeedEntry = {
      slug: live.slug,
      href: live.href,
      t: live.title,
      d: live.oneLiner,
      m: live.meta,
      k: live.rule.kind,
      s: isoDate(live.rule.start),
      e: isoDate(live.rule.end),
    };
    if (live.rule.day !== undefined) entry.wd = live.rule.day;
    if (live.rule.days && live.rule.days.length > 1) entry.wds = live.rule.days;
    if (live.rule.nth !== undefined) entry.nth = live.rule.nth;
    if (live.rule.months) entry.months = live.rule.months;
    return entry;
  });
}
