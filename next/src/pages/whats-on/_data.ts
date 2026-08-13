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
import { eventAccessLabel, eventIsUnqualifiedFree } from '../../lib/event-access.mjs';

export type EventEntry = CollectionEntry<'events'>;

// ---------------------------------------------------------------------------
// Small date helpers (local time; the site is single-timezone editorial)
// ---------------------------------------------------------------------------

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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
  /** 1..5 = nth weekday of the month, -1 = last. Monthly only. */
  nth?: number;
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

function parseWeekday(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(sun|mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?)(?:day)?s?\b/);
  if (!m) return undefined;
  return DAY_WORDS[m[1]] ?? DAY_WORDS[`${m[1]}day`];
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
  const recur: string = data.recurrence ?? 'one-off';
  const noteText = [data.recurrenceNote, data.title, data.summary].filter(Boolean).join(' ');

  const seriesStart = start ?? today;
  // A recurring series without an explicit end runs to the far horizon.
  const seriesEnd =
    endRaw && endRaw > seriesStart && ['weekly', 'monthly', 'ongoing'].includes(recur)
      ? endRaw
      : addDays(today, FAR_HORIZON_DAYS);

  if (recur === 'weekly') {
    const day = parseWeekday(noteText);
    if (day !== undefined) return { kind: 'weekly', start: seriesStart, end: seriesEnd, day };
    if (next && next >= today) return { kind: 'range', start: next, end: next };
    return start && endRaw ? { kind: 'range', start, end: endRaw } : null;
  }

  if (recur === 'monthly') {
    const day = parseWeekday(noteText);
    const nth = parseNth(noteText);
    if (day !== undefined && nth !== undefined) {
      return { kind: 'monthly', start: seriesStart, end: seriesEnd, day, nth };
    }
    if (next && next >= today) return { kind: 'range', start: next, end: next };
    return null;
  }

  if (!start || !endRaw) return null;

  // Annual / seasonal / one-off / ongoing: a plain date range. When the
  // listed dates are past but the cron has computed a fresh occurrence,
  // shift the same span onto it.
  if (endRaw < today && next && next >= today) {
    const spanDays = Math.round((endRaw.getTime() - start.getTime()) / 86400000);
    return { kind: 'range', start: next, end: addDays(next, Math.max(0, spanDays)) };
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
  if (rule.kind === 'range') return true;
  if (d.getDay() !== rule.day) return false;
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
    /cancelled/i.test(data.verificationStatus ?? '') ||
    /^cancelled:/i.test(data.summary ?? '') ||
    data.skipThis === true
  );
}

/** All live events with their rule and display fields, appeal-sorted. */
export async function loadLiveEvents(now: Date): Promise<LiveEvent[]> {
  const today = startOfDay(now);
  const entries = await getCollection('events', ({ data }) => data.status === 'published');
  const out: LiveEvent[] = [];
  for (const event of entries) {
    const data = event.data as Record<string, any>;
    if (isCancelled(data)) continue;
    const rule = ruleFor(event, now);
    if (!rule) continue;
    if (startOfDay(rule.end) < today) continue;

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
    for (const live of events) {
      if (!occursOnDay(live.rule, day)) continue;
      if (live.rule.kind === 'range') {
        if (seenRanges.has(live.slug)) continue;
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
    groups.push({ iso: isoDate(day), heading: dayHeading(day), items });
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

function firstDayInWindow(rule: OccurrenceRule, win: ScopeWindow): Date | null {
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
  nth?: number; // nth weekday of month (-1 = last)
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
    if (live.rule.nth !== undefined) entry.nth = live.rule.nth;
    return entry;
  });
}
