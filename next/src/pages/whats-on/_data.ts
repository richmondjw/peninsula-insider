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
 *  - category shelves (Markets, Live music, Food & wine, Exhibitions &
 *    arts, Major events)
 *  - the compact feed payload for /whats-on/feed.json (HUB-11: the month+
 *    horizon ships as fetch-on-demand JSON, never as hidden DOM)
 */
import {
  listingDateLabel,
  partitionWindow,
  recurrenceLabel,
  resolveListingOccurrence,
  spanLabel,
  untilLabel,
} from '../../lib/whatson-listing.mjs';
import { rotateDaily } from '../../lib/daily-rotation';
import { getCollection, type CollectionEntry } from 'astro:content';
import { routeSlug, eventCategoryLabel } from '../../lib/editorial';
import { emptyDayMessage } from '../../lib/whatson-empty-state.mjs';
import { eventAccessLabel, eventIsUnqualifiedFree } from '../../lib/event-access.mjs';
import { USE_OCCURRENCE_MODEL } from '../../lib/features';
import {
  isCancelledRecord,
  occurrenceSchemaStatus,
  recordDisposition,
} from '../../lib/event-occurrence.mjs';

export type EventEntry = CollectionEntry<'events'>;

// ---------------------------------------------------------------------------
// Small date helpers. The site's editorial calendar is Mornington Peninsula
// time, not the build machine's timezone. Represent calendar days as UTC
// midnight so the existing date-only arithmetic stays deterministic in CI.
// ---------------------------------------------------------------------------

import { startOfDay, addDays, isoDate, rangeLabel, dayHeading, weekendWindow, SCHOOL_HOLIDAY_RANGES, schoolHolidayWindow, ruleFor, occursOnDay, occursInWindow, type ScopeWindow, type OccurrenceRule } from '../../lib/event-schedule';
export { startOfDay, addDays, isoDate, rangeLabel, dayHeading, weekendWindow, SCHOOL_HOLIDAY_RANGES, schoolHolidayWindow, ruleFor, occursOnDay, occursInWindow, type ScopeWindow, type OccurrenceRule } from '../../lib/event-schedule';

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
  /**
   * The row meta without the time: place, then access where it says more
   * than the category does. A row puts the time (or its date token) first,
   * so the two never repeat each other.
   */
  details: string[];
  free: boolean;
  accessLabel: string | null;
  appeal: number;
  /**
   * PI-008. `statusLabel` is the short reader-facing note a listing row shows
   * ("Sold out", "Cancelled", "New date"); null when there is nothing to say.
   * `promotable` is stricter than being listable: a pick or a homepage slot is
   * an active recommendation, and a sold-out or unverified record has not
   * earned one. Both are inert when the occurrence model is flagged off.
   */
  statusLabel: string | null;
  promotable: boolean;
}

/**
 * Whether an event is still a current, indexable event destination.
 *
 * `status` remains the editorial safety switch: a record deliberately marked
 * archived must not regain indexability merely because a generic recurrence
 * rule can be inferred from old prose. For published records, the shared
 * recurrence rule is the source of truth, so recurring series stay live when
 * their original dated occurrence has passed but a valid future cadence exists.
 *
 * PI-008 adds the two axes the rule cannot see. `expiresAt` ends a record
 * independently of when its last occurrence runs, and a postponement with no
 * announced date leaves nothing to list it under. Both are gated on the
 * occurrence-model flag, so PUBLIC_EVENT_OCCURRENCE_MODEL=off returns the
 * previous three-line test exactly.
 */
export function isCurrentEvent(event: EventEntry, now: Date): boolean {
  if (event.data.status !== 'published') return false;
  if (USE_OCCURRENCE_MODEL && !recordDisposition(event.data as Record<string, any>, now).listable) {
    return false;
  }
  const rule = ruleFor(event, now);
  return rule !== null && startOfDay(rule.end) >= startOfDay(now);
}

// Abbreviations whose full stop does not end a sentence ("Pt. Leo", "St. Andrews").
const NOT_A_SENTENCE_END = /(?:^|\s)(?:Pt|St|Mt|Dr|Mr|Mrs|Ms|No|Rd|Ave|Hwy|approx|vs|e\.g|i\.e)\.$/i;

/**
 * Shorten a blurb to at most `maxWords` words without cutting a thought.
 *
 * Text that fits is returned whole. Otherwise the cut falls at the last
 * sentence end inside the limit, with no ellipsis, as long as that leaves a
 * real sentence. Failing that, it cuts at a word boundary, strips trailing
 * punctuation and appends a single ellipsis, so a blurb never ends ".…".
 */
export function truncateWords(text: unknown, maxWords: number): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ').filter(Boolean);
  if (words.length <= maxWords) return clean;
  const head = words.slice(0, maxWords);
  for (let i = head.length - 1; i >= 4; i -= 1) {
    const upTo = head.slice(0, i + 1).join(' ');
    if (/[.!?]["”’)]?$/.test(head[i]) && !NOT_A_SENTENCE_END.test(upTo)) return upTo;
  }
  return `${head.join(' ').replace(/[\s.,;:!?\-–]+$/, '')}…`;
}

/**
 * Typographic finish at render: curly quotes and apostrophes. Records arrive
 * from several feeds with straight quotes; the listing should not show them.
 */
export function smarten(text: unknown): string {
  return String(text ?? '')
    .replace(/(^|[\s([{])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{])'/g, '$1‘')
    .replace(/'/g, '’');
}

/**
 * A title or venue name, finished: curly quotes, and a spaced hyphen or dash
 * used as a separator ("Experience - Mornington") becomes a comma, per the
 * no-dash house voice. Number ranges ("5 - 7") are left alone.
 */
export function finishName(text: unknown): string {
  return smarten(String(text ?? '').replace(/(\D)\s+[-–]\s+(?=\D)/g, '$1, '));
}

const normaliseForCompare = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * The blurb a listing row may show, or '' when there is nothing in PI's voice
 * to say.
 *
 * Editorial copy leads (verdict, then why-we-care). A plain summary follows,
 * except when it is feed copy nobody has rewritten (organiser marketing) or a
 * feed stub that only restates the title ("<title> at <venue>."). In those
 * cases the first paragraph of the editor's note stands in if there is one,
 * and otherwise the row carries no blurb until copy is written.
 */
function listingDek(data: Record<string, any>): string {
  const editorial = data.editorVerdict ?? data.whyWeCare;
  if (editorial) return String(editorial);
  const summary = String(data.summary ?? '').trim();
  const unrewrittenFeed = /not editorially rewritten/i.test(String(data.provenance ?? ''));
  const restatesTitle =
    summary !== '' && normaliseForCompare(summary).startsWith(normaliseForCompare(data.title));
  if (summary && !unrewrittenFeed && !restatesTitle) return summary;
  const note = String(data.editorNote ?? '').split(/\n\s*\n/)[0]?.trim() ?? '';
  return note;
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
  // The reading itself now lives in lib/event-occurrence.mjs so the build
  // scripts apply the same one. Behaviour is unchanged: the raw flag, the
  // legacy verificationStatus and summary prose, and an editor's skipThis.
  return isCancelledRecord(data);
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
    // Expiry and postponement are record-level facts, so they are resolved
    // once here rather than per day. isCurrentEvent has already refused the
    // non-listable ones; this is the same answer, kept for display.
    const disposition = USE_OCCURRENCE_MODEL
      ? recordDisposition(data, now)
      : { label: null, promotable: true };

    const slug = routeSlug(event);
    const categoryLabel = eventCategoryLabel[data.category] ?? '';
    const placeLabel = finishName(data.suburb || data.venueName || '');
    const timeLabel = timeLabelFor(data.startTime);
    const free = eventIsUnqualifiedFree(data);
    const accessLabel = eventAccessLabel(data);
    const meta = [timeLabel, placeLabel, categoryLabel].filter(Boolean).slice(0, 3);
    if (accessLabel) {
      if (meta.length === 3) meta[2] = accessLabel;
      else meta.push(accessLabel);
    }
    const details = [placeLabel, accessLabel ?? categoryLabel].filter(Boolean);
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
      title: finishName(data.title),
      oneLiner: smarten(truncateWords(listingDek(data), 20)),
      meta,
      timeLabel,
      categoryLabel,
      placeLabel,
      details,
      free,
      accessLabel,
      appeal,
      statusLabel: disposition.label,
      promotable: disposition.promotable,
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
  items: DayItem[];
}

/**
 * One occurrence of one record, resolved. PI-008, per occurrence rather than
 * per record.
 *
 * A Sunday reader is allowed to look back over Friday and Saturday, which is
 * exactly why day granularity was not enough: Friday's 10am-to-2pm market was
 * still being offered with a live booking link at 4pm on Friday and all day
 * Saturday. `phase` is the clock's answer, `bookable` is the reader's, and
 * they come apart on purpose. With the flag off, every item reads
 * upcoming/bookable, which is the previous behaviour.
 *
 * `schemaStatus` travels with the rest so the markup on a page cannot
 * contradict the badge beside it. The listing used to derive its own from the
 * raw `cancelled` flag, which is one of the four signals that record a
 * cancellation and none of the occurrence-level exceptions; that derivation is
 * gone and this field replaced it.
 */
export interface OccurrenceState {
  phase: 'upcoming' | 'running' | 'past';
  bookable: boolean;
  status: string;
  statusLabel: string | null;
  schemaStatus: string | null;
}

export interface DayItem extends OccurrenceState {
  live: LiveEvent;
  spanLabel: string;
}

/**
 * Resolve one listing row through the occurrence model.
 *
 * Both the weekend grid and PI's picks come through here, so a badge and the
 * markup beside it are two readings of one answer rather than two answers.
 *
 * A range row stands for its whole run, not for one day of it: measuring a
 * festival that opens on Friday and finishes on Wednesday over `dayIso` alone
 * marked it Ended from Friday midnight.
 *
 * The flag governs the CLOCK half of the model - whether a row may read as
 * running or past, and whether its booking block disappears. It does not
 * govern which state the record is in: reading that from the raw `cancelled`
 * flag was wrong in every mode, so that correction is not behind the rollback
 * switch.
 */
export function occurrenceStateFor(live: LiveEvent, dayIso: string, now: Date): OccurrenceState {
  const occurrence = resolveListingOccurrence(live.event.data, live.rule, dayIso, now);
  const schemaStatus = occurrenceSchemaStatus(
    USE_OCCURRENCE_MODEL ? occurrence : { ...occurrence, phase: 'upcoming' }
  );
  if (!USE_OCCURRENCE_MODEL) {
    return {
      phase: 'upcoming',
      bookable: true,
      status: occurrence.status,
      statusLabel: live.statusLabel ?? null,
      schemaStatus,
    };
  }
  return {
    phase: occurrence.phase,
    bookable: occurrence.bookable,
    status: occurrence.status,
    statusLabel: occurrence.label ?? live.statusLabel ?? null,
    schemaStatus,
  };
}

export interface WeekendGroups {
  /** Everything on across more than one day of the window, listed once. */
  ongoing: OngoingItem[];
  /**
   * One group per day that has something tied to that day alone. A day whose
   * only listings are already in `ongoing` is left out rather than shown
   * empty; a day with nothing on at all keeps its heading and the quiet
   * message, so the reader can see it was checked.
   */
  days: DayGroup[];
}

export interface OngoingItem extends DayItem {
  /** The day this row's occurrence state (and its JSON-LD date) is read on. */
  dayIso: string;
}

/**
 * Group a window's events so each one shows once (WO1).
 *
 * The previous grouping pushed a weekly or multi-weekday series onto every
 * day it ran, so a Thursday-to-Sunday trail appeared three times in one
 * weekend. Now anything that runs on more than one day of the window goes
 * into `ongoing` with its date token ("Until 30 Apr 2027", "Every Thu to
 * Sun"); a day group holds only what is tied to that day. `exclude` drops
 * listings already shown higher on the page (PI's picks).
 *
 * A range row stands for its whole run, so its phase is measured over the
 * run, not over one day of it. A series in `ongoing` reads its state on the
 * first day in the window that has not already finished, so a Friday session
 * that has ended does not mark the weekend's series Ended.
 */
export function groupWeekend(
  events: LiveEvent[],
  win: ScopeWindow,
  now: Date = new Date(),
  exclude: Set<string> = new Set()
): WeekendGroups {
  const dayCount = Math.min(
    62,
    Math.round((startOfDay(win.end).getTime() - startOfDay(win.start).getTime()) / 86400000) + 1
  );
  const dayDates = Array.from({ length: dayCount }, (_, i) => addDays(win.start, i));
  const listed = events.filter((live) => !exclude.has(live.slug));
  const split = partitionWindow(listed, dayDates, (live: LiveEvent, day: Date) =>
    occursOnDay(live.rule, day)
  );
  const byAppeal = (a: DayItem, b: DayItem) =>
    b.live.appeal - a.live.appeal || a.live.title.localeCompare(b.live.title);

  const ongoing: OngoingItem[] = split.ongoing.map(({ item: live, dayIndexes }) => {
    const states = dayIndexes.map((i) => {
      const dayIso = isoDate(dayDates[i]);
      return { dayIso, state: occurrenceStateFor(live, dayIso, now) };
    });
    const chosen = states.find((s) => s.state.phase !== 'past') ?? states[states.length - 1];
    return {
      live,
      spanLabel: listingDateLabel(live.rule, win),
      dayIso: chosen.dayIso,
      ...chosen.state,
    };
  });
  ongoing.sort(byAppeal);

  const days: DayGroup[] = [];
  split.days.forEach(({ day, items, ongoingCount }) => {
    if (items.length === 0 && ongoingCount > 0) return;
    const dayIso = isoDate(day);
    const dayItems: DayItem[] = items.map((live: LiveEvent) => ({
      live,
      spanLabel: listingDateLabel(live.rule, win),
      ...occurrenceStateFor(live, dayIso, now),
    }));
    dayItems.sort(byAppeal);
    days.push({
      iso: dayIso,
      heading: dayHeading(day),
      continuingCount: ongoingCount,
      emptyMessage: emptyDayMessage(0),
      items: dayItems,
    });
  });
  return { ongoing, days };
}

// ---------------------------------------------------------------------------
// PI's picks - exactly 3
// ---------------------------------------------------------------------------

export interface Pick {
  live: LiveEvent;
  verdict: string;
  /** First day in the window the pick runs; the JSON-LD startDate. */
  dateISO: string;
  dayLabel: string;
  /**
   * Whether the card may show the calendar date block. Only a dated event
   * held inside the window earns one; an ongoing run or a series would
   * otherwise read as a one-off on the Friday it happens to include.
   */
  showDate: boolean;
  /** For picks without a date block: "Ongoing", "Every Sun", "Monthly". */
  badge: string;
  /**
   * The pick's own occurrence on `dateISO`, resolved exactly as a weekend row
   * is. A pick is a listing too, and its JSON-LD node has to answer the same
   * question the row beneath it answers.
   */
  occurrence: OccurrenceState;
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

export async function getPicks(
  events: LiveEvent[],
  win: ScopeWindow,
  now: Date = new Date()
): Promise<Pick[]> {
  const inWindow = events.filter((e) => occursInWindow(e.rule, win));
  const bySlug = new Map(inWindow.map((e) => [e.slug, e]));
  const picks: Pick[] = [];

  const toPick = (live: LiveEvent, verdict: string, scope: ScopeWindow = win): Pick => {
    const day = firstDayInWindow(live.rule, scope) ?? scope.start;
    const dateISO = isoDate(day);
    const { rule } = live;
    const showDate =
      rule.kind === 'range' &&
      startOfDay(rule.start) >= startOfDay(scope.start) &&
      startOfDay(rule.end) <= startOfDay(scope.end);
    const badge = showDate
      ? ''
      : rule.kind === 'range'
        ? 'Ongoing'
        : recurrenceLabel(rule, { short: true });
    return {
      live,
      verdict: smarten(truncateWords(verdict, 25)),
      dateISO,
      dayLabel: spanLabel(day, day),
      showDate,
      badge,
      occurrence: occurrenceStateFor(live, dateISO, now),
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
  //
  // PI-008 raises the bar here and ONLY here. A machine-generated pick is an
  // active recommendation, so sold out, bookings closed, or a source that
  // changed after the last verification all disqualify a record from being
  // promoted while leaving it perfectly listable. The editorial sheet above is
  // untouched: if an editor has chosen to lead with a sold-out signature event,
  // that is a decision, not a scoring accident. Inert when the flag is off.
  const chosen = new Set(picks.map((p) => p.live.slug));
  const scored = inWindow
    .filter((e) => !chosen.has(e.slug) && e.promotable)
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
  for (const { e } of rotateDaily(scored, now)) {
    picks.push(toPick(e, (e.event.data as any).editorVerdict ?? e.oneLiner));
    if (picks.length === 3) break;
  }

  return picks;
}

// ---------------------------------------------------------------------------
// Shelves - category entry points, anchor-linked
// ---------------------------------------------------------------------------

export interface ShelfItem {
  live: LiveEvent;
  /** The next date this listing is on ("Sat 17 Oct", "Until 22 Nov"). */
  when: string;
}

export interface Shelf {
  id: string;
  label: string;
  items: ShelfItem[];
}

// The arts shelf keeps its #openings anchor for existing links, but it is
// labelled for what it holds: exhibitions and permanent arts attractions are
// not openings. An "Openings" shelf needs a record-level flag for genuinely
// new venues or shows, which the events schema does not carry yet.
const SHELF_DEFS: { id: string; label: string; cats: string[] }[] = [
  { id: 'markets', label: 'Markets', cats: ['market'] },
  { id: 'live-music', label: 'Live music', cats: ['live-music'] },
  { id: 'food-wine', label: 'Food & wine', cats: ['food-wine', 'cellar-door'] },
  { id: 'openings', label: 'Exhibitions & arts', cats: ['exhibition', 'arts'] },
  { id: 'major-events', label: 'Major events', cats: ['festival', 'racing-sport'] },
];

/**
 * When a shelf listing is next on, as its lead token. A running range gives
 * its closing date, a future range its dates, a weekly series already under
 * way its cadence, and anything else the next date it occurs.
 */
export function nextDateLabel(rule: OccurrenceRule, now: Date, horizonDays = 62): string {
  const today = startOfDay(now);
  if (rule.kind === 'range') {
    const start = startOfDay(rule.start);
    const end = startOfDay(rule.end);
    if (start.getTime() === end.getTime()) return spanLabel(start, start);
    if (start <= today) return untilLabel(end, today);
    return spanLabel(start, end);
  }
  if (rule.kind === 'weekly' && startOfDay(rule.start) <= today) return recurrenceLabel(rule);
  for (let i = 0; i <= horizonDays; i += 1) {
    const d = addDays(today, i);
    if (occursOnDay(rule, d)) return spanLabel(d, d);
  }
  return recurrenceLabel(rule);
}

/**
 * Category shelves for the next two months. `exclude` carries every listing
 * already on the page above (picks, the ongoing strip and the day groups), so
 * a shelf only adds what the weekend did not show.
 */
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
      .slice(0, 4)
      .map((live) => ({ live, when: nextDateLabel(live.rule, now) })),
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
  tm?: string; // time label, when the record has one
  dt?: string[]; // meta without the time (place, access or category)
  k: 'range' | 'weekly' | 'monthly';
  s: string; // rule start ISO date
  e: string; // rule end ISO date
  wd?: number; // weekday
  wds?: number[]; // multiple weekdays
  nth?: number; // nth weekday of month (-1 = last)
  months?: number[];
  /**
   * PI-008 status note ("Sold out", "New date"), omitted when there is nothing
   * to say. The client island renders other date scopes from this payload, so
   * a record whose booking has closed must carry that fact across the wire or
   * the month-ahead view contradicts the weekend view above it.
   */
  x?: string;
  statusData?: Record<string, any>;
}

export function feedFor(events: LiveEvent[]): FeedEntry[] {
  return events.map((live) => {
    const entry: FeedEntry = {
      slug: live.slug,
      href: live.href,
      t: live.title,
      d: live.oneLiner,
      m: live.meta,
      ...(live.timeLabel ? { tm: live.timeLabel } : {}),
      dt: live.details,
      k: live.rule.kind,
      s: isoDate(live.rule.start),
      e: isoDate(live.rule.end),
      statusData: Object.fromEntries([
        'startTime', 'endTime', 'endsNextDay', 'timezone', 'cancelled', 'postponed',
        'rescheduledTo', 'bookingStatus', 'expiresAt', 'occurrenceExceptions',
      ].filter((key) => (live.event.data as any)[key] !== undefined)
        .map((key) => [key, (live.event.data as any)[key]])),
    };
    if (live.rule.day !== undefined) entry.wd = live.rule.day;
    if (live.rule.days && live.rule.days.length > 1) entry.wds = live.rule.days;
    if (live.rule.nth !== undefined) entry.nth = live.rule.nth;
    if (live.rule.months) entry.months = live.rule.months;
    if (live.statusLabel) entry.x = live.statusLabel;
    return entry;
  });
}
