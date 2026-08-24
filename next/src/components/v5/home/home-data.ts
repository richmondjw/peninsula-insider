/**
 * home-data - build-time selection helpers for the v5 homepage (T-401).
 *
 * Everything here runs at build time inside Astro frontmatter. Pure
 * functions, no DOM, no imports from client libs. The homepage is
 * deterministic: the same content tree always renders the same edition.
 *
 * The one hairy job is "This Weekend": resolve the editorial
 * weekend-picks entry for the upcoming weekend into event entries, and
 * when no entry exists for that weekend (the common case between
 * editorial pushes) fall back to a ranked read of the events collection
 * so the module never renders empty.
 */

import { rotateByMelbourneHours } from '../../../lib/daily-rotation';
import { eventIsUnqualifiedFree } from '../../../lib/event-access.mjs';
export interface WeekendWindow {
  /** ISO date (YYYY-MM-DD) of the weekend's Saturday, Melbourne calendar. */
  satISO: string;
  friday: Date;
  saturday: Date;
  sunday: Date;
  /** "12-13 July" style label (en dash, month boundary handled). */
  label: string;
}

/** A resolved homepage pick: the event entry plus the verdict to print. */
export interface WeekendPick {
  event: any;
  verdict: string;
}

/** Melbourne "now" as a plain Date carrying local wall-clock fields. */

export function melbourneNow(now: Date = new Date()): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The weekend the homepage speaks about. Monday to Saturday point at the
 * coming (or current) Saturday; Sunday still belongs to the weekend that
 * started yesterday.
 */
export function weekendWindow(now: Date = new Date()): WeekendWindow {
  const mel = melbourneNow(now);
  const day = mel.getDay(); // 0 Sun .. 6 Sat
  const offset = day === 0 ? -1 : 6 - day;
  const saturday = new Date(mel.getFullYear(), mel.getMonth(), mel.getDate() + offset);
  const friday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() - 1);
  const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
  const monthFmt = new Intl.DateTimeFormat('en-AU', { month: 'long' });
  const satMonth = monthFmt.format(saturday);
  const sunMonth = monthFmt.format(sunday);
  const label =
    satMonth === sunMonth
      ? `${saturday.getDate()}–${sunday.getDate()} ${sunMonth}`
      : `${saturday.getDate()} ${satMonth} – ${sunday.getDate()} ${sunMonth}`;
  return { satISO: isoOf(saturday), friday, saturday, sunday, label };
}

/**
 * Clamp a verdict to the 25-word hard cap (content-guidelines section 3.5)
 * by keeping whole sentences. Never cuts mid-sentence unless the first
 * sentence alone busts the cap, in which case it trims at a word boundary.
 */
export function clampVerdict(text: string | undefined | null, maxWords = 25): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const s of sentences) {
    const candidate = out ? `${out} ${s}` : s;
    if (candidate.split(' ').length <= maxWords) out = candidate;
    else break;
  }
  if (!out) out = `${clean.split(' ').slice(0, maxWords - 1).join(' ')}.`;
  return out;
}

const LIVE_STATUSES = new Set(['published', 'scheduled']);

/** Renderable on the homepage: live, not archived, not editor-skipped. */
export function isLiveEvent(e: any): boolean {
  if (!e?.data) return false;
  if (String(e.id ?? '').includes('archive')) return false;
  if (!LIVE_STATUSES.has(e.data.status ?? 'published')) return false;
  if (e.data.skipThis) return false;
  // A cancelled record can still be published and future-dated, and this
  // event carries the weekend-pick lens (+20 in fallbackScore). Without this
  // test the homepage rail would promote an event that is not happening.
  if (e.data.cancelled) return false;
  return Boolean(e.data.title);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
}

const ALWAYS_ON = new Set(['weekly', 'ongoing']);

/** Does this event have something happening on the given weekend? */
export function occursOnWeekend(e: any, win: WeekendWindow): boolean {
  const d = e.data;
  if (ALWAYS_ON.has(d.recurrence)) {
    return !d.endDate || d.endDate.getTime() >= win.friday.getTime();
  }
  const sunEnd = endOfDay(win.sunday).getTime();
  const fri = win.friday.getTime();
  if (d.nextOccurrence) {
    const t = d.nextOccurrence.getTime();
    if (t >= fri && t <= sunEnd) return true;
  }
  const start = d.startDate?.getTime();
  if (start === undefined) return false;
  const end = (d.endDate ?? d.startDate).getTime();
  return start <= sunEnd && end >= fri;
}

/** Still worth listing at all: not entirely in the past. */
export function isUpcomingEvent(e: any, now: Date): boolean {
  const d = e.data;
  if (ALWAYS_ON.has(d.recurrence)) {
    return !d.endDate || d.endDate.getTime() >= now.getTime() - 86400000;
  }
  const horizon = now.getTime() - 86400000;
  if (d.nextOccurrence && d.nextOccurrence.getTime() >= horizon) return true;
  if (d.startDate && d.startDate.getTime() >= horizon) return true;
  if (d.endDate && d.endDate.getTime() >= horizon) return true;
  return false;
}

function fallbackScore(e: any, win: WeekendWindow): number {
  const d = e.data;
  let score = 0;
  if (occursOnWeekend(e, win)) score += 100;
  if (Array.isArray(d.lens) && d.lens.includes('weekend-pick')) score += 20;
  if (d.worthTheDrive) score += 5;
  score += Number(d.editorialPriority ?? 0) * 2;
  score += Number(d.visitorAppealScore ?? 0);
  return score;
}

function soonestTime(e: any, now: Date): number {
  const d = e.data;
  if (ALWAYS_ON.has(d.recurrence)) return now.getTime(); // effectively "this weekend"
  const times = [d.nextOccurrence, d.startDate, d.endDate]
    .filter(Boolean)
    .map((x: Date) => x.getTime())
    .filter((t: number) => t >= now.getTime() - 86400000);
  return times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
}

/**
 * Resolve the three "This Weekend" picks.
 *
 * 1. If a weekend-picks entry exists for the upcoming weekend, its top
 *    picks (by position) win, carrying their hand-written verdicts.
 * 2. Any remaining slots fill from the events collection, ranked by
 *    weekend fit, the weekend-pick lens, and editorial priority.
 */
export function selectWeekendPicks(
  picksEntries: any[],
  events: any[],
  now: Date = new Date(),
): { picks: WeekendPick[]; window: WeekendWindow } {
  const win = weekendWindow(now);
  const out: WeekendPick[] = [];
  const used = new Set<string>();
  const slugOf = (e: any) => e.data.slug ?? e.id;
  const bySlug = new Map(events.map((e) => [slugOf(e), e]));

  const entry = picksEntries.find(
    (p) => p.data.weekendStart?.toISOString().slice(0, 10) === win.satISO,
  );
  if (entry) {
    const ordered = [...entry.data.picks].sort((a: any, b: any) => a.position - b.position);
    const editorialCandidates: WeekendPick[] = [];
    const editorialUsed = new Set<string>();
    for (const pick of ordered) {
      const ev = bySlug.get(pick.eventSlug);
      if (!ev || !isLiveEvent(ev) || editorialUsed.has(slugOf(ev))) continue;
      editorialUsed.add(slugOf(ev));
      editorialCandidates.push({ event: ev, verdict: clampVerdict(pick.editorVerdict) });
    }
    // The collection remains the source of truth, including its verdicts and
    // candidate set. The twice-daily cadence simply advances the visible
    // three through that curated shortlist; when it contains only three, the
    // same picks are shown in a different lead order.
    for (const candidate of rotateByMelbourneHours(editorialCandidates, now, 12)) {
      used.add(slugOf(candidate.event));
      out.push(candidate);
      if (out.length === 3) break;
    }
  }

  if (out.length < 3) {
    const mel = melbourneNow(now);
    const ranked = events
      .filter(isLiveEvent)
      .filter((e) => !used.has(slugOf(e)))
      .filter((e) => isUpcomingEvent(e, mel))
      .sort(
        (a, b) =>
          fallbackScore(b, win) - fallbackScore(a, win) ||
          soonestTime(a, mel) - soonestTime(b, mel),
      );
    // The ranking above is computed entirely from static event fields, so it
    // cannot change between builds, and the weekend window holds Monday to
    // Sunday. Left alone the module shows the same three items all week, which
    // is what it did for the 1-2 August weekend. Rotate the visible slice
    // through the top of the ranking twice per Melbourne day. The deploy
    // workflow rebuilds at each 12-hour boundary over Saturday and Sunday.
    // Editorial picks above are untouched: only this fallback rotates.
    for (const ev of rotateByMelbourneHours(ranked, now, 12)) {
      used.add(slugOf(ev));
      out.push({
        event: ev,
        verdict: clampVerdict(ev.data.editorVerdict ?? ev.data.whyWeCare ?? ev.data.summary),
      });
      if (out.length === 3) break;
    }
  }

  return { picks: out, window: win };
}

/** Pretty label for an event category slug. */
const CATEGORY_LABELS: Record<string, string> = {
  'food-wine': 'Food & wine',
  market: 'Market',
  festival: 'Festival',
  'cellar-door': 'Cellar door',
  community: 'Community',
  arts: 'Arts',
  wellness: 'Wellness',
  'live-music': 'Live music',
  'racing-sport': 'Racing & sport',
  'family-programs': 'Family',
  exhibition: 'Exhibition',
  civic: 'Civic',
  nature: 'Nature',
  'writers-ideas': 'Writers & ideas',
};

export function categoryLabel(category: string | undefined): string {
  if (!category) return '';
  return (
    CATEGORY_LABELS[category] ??
    category.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** Title-case a place reference ("red-hill" or {id:"red-hill"} -> "Red Hill"). */
export function placeLabel(place: unknown): string {
  const raw = String((place as any)?.id ?? place ?? '');
  if (!raw) return '';
  return raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The date to print on a pick card. Recurring weekly/ongoing events get no
 * date block (their recurrence chip does the work); dated events show the
 * next occurrence, but never a date already in the past.
 */
export function pickDateISO(e: any, now: Date = new Date()): string | undefined {
  const d = e.data;
  if (ALWAYS_ON.has(d.recurrence)) return undefined;
  const horizon = melbourneNow(now).getTime() - 86400000;
  const candidate = [d.nextOccurrence, d.startDate]
    .filter(Boolean)
    .find((x: Date) => x.getTime() >= horizon);
  return candidate ? candidate.toISOString() : undefined;
}

/** "Every Saturday" style chip for weekly events. */
export function recurrenceChip(e: any): string | undefined {
  const d = e.data;
  if (d.recurrence !== 'weekly') return undefined;
  if (d.recurrenceNote) return d.recurrenceNote;
  if (d.startDate) {
    const weekday = d.startDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      timeZone: 'Australia/Melbourne',
    });
    return `Every ${weekday}`;
  }
  return 'Weekly';
}

export function isFreeEvent(e: any): boolean {
  return eventIsUnqualifiedFree(e.data);
}

const SMALL_NUMBERS = [
  'none', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

/** Small counts read as words in verdict lines ("six worth planning around"). */
export function countWord(n: number): string {
  return n >= 1 && n < SMALL_NUMBERS.length ? SMALL_NUMBERS[n] : String(n);
}
