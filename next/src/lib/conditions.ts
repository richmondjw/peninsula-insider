/**
 * conditions.ts - assembles the masthead conditions strip.
 *
 * Two rules govern this module:
 *
 * 1. Compute what can be computed. Sunset is astronomy (src/lib/sunset.ts)
 *    and the issue label is a calendar derivation. Neither is guessed and
 *    neither needs a human.
 *
 * 2. Never invent what cannot be computed. Air temperature and the sea/tide
 *    read have no data source in this repo. They come from the editorially
 *    maintained src/data/conditions.json, and if that file is empty or the
 *    observation has gone stale, the fields are dropped from the strip
 *    rather than filled with something plausible. A short honest strip is
 *    the correct failure mode; a full false one is not.
 *
 * Evaluated at build time, so the strip is as current as the last deploy.
 * The repo rebuilds daily (.github/workflows/daily-content.yml plus
 * pi-data-refresh.yml), which keeps the computed fields accurate.
 */

import rawConditions from '../data/conditions.json';
import { getSunsetLabel } from './sunset';
import { getAustralianSeason, melbourneCalendarParts } from './season';

export interface ConditionsStrip {
  /** e.g. "Sorrento", or null when no locus is configured. */
  place: string | null;
  /** e.g. "16" (degrees Celsius, whole). Null unless observed and fresh. */
  temperature: string | null;
  /** e.g. "5:26 PM". Null only if the sun does not set (never here). */
  sunset: string | null;
  /** e.g. "Bay glassy, tide low". Null unless observed and fresh. */
  sea: string | null;
  /** e.g. "Winter Insider · July 2026". Always present. */
  issue: string;
  /** e.g. "Winter 2026". The mobile reduction of the same derivation. */
  issueShort: string;
  /** True when the strip has nothing but the issue stamp to show. */
  isBare: boolean;
}

type RawConditions = {
  place?: string | null;
  temperatureC?: number | null;
  sea?: string | null;
  observedAt?: string | null;
  staleAfterHours?: number | null;
};

/** "Winter Insider · July 2026" plus its short form, derived from the date.
 *
 * Season and calendar parts both come from src/lib/season.ts, which is the
 * only place in the codebase that decides what season it is. The local
 * seasonForMonth/melbourneParts pair that used to live here was the one
 * timezone-correct implementation of four; it now serves the whole site
 * from the shared module instead. */
export function getIssueStamp(date: Date = new Date()): { full: string; short: string } {
  const { year, monthName } = melbourneCalendarParts(date);
  const season = getAustralianSeason(date);
  return {
    full: `${season} Insider · ${monthName} ${year}`,
    short: `${season} ${year}`,
  };
}

/** Trim a string field, returning null for anything blank or non-string. */
function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Is the editorial observation recent enough to publish? An unset, unparsable
 * or expired observedAt means no: the observed fields get dropped.
 */
function observationIsFresh(raw: RawConditions, now: Date): boolean {
  const stamp = cleanString(raw.observedAt);
  if (!stamp) return false;
  const observed = new Date(stamp);
  if (Number.isNaN(observed.getTime())) return false;
  const windowHours =
    typeof raw.staleAfterHours === 'number' && raw.staleAfterHours > 0 ? raw.staleAfterHours : 36;
  const ageHours = (now.getTime() - observed.getTime()) / 3600000;
  // Reject the future too: a mistyped year should not read as "very fresh".
  return ageHours >= -1 && ageHours <= windowHours;
}

export function getConditionsStrip(now: Date = new Date()): ConditionsStrip {
  const raw = rawConditions as RawConditions;
  const fresh = observationIsFresh(raw, now);

  const temperatureValue = raw.temperatureC;
  const temperature =
    fresh && typeof temperatureValue === 'number' && Number.isFinite(temperatureValue)
      ? String(Math.round(temperatureValue))
      : null;

  const sea = fresh ? cleanString(raw.sea) : null;
  const place = cleanString(raw.place);
  const sunset = getSunsetLabel(now);
  const issue = getIssueStamp(now);

  return {
    place,
    temperature,
    sunset,
    sea,
    issue: issue.full,
    issueShort: issue.short,
    isBare: !place && !temperature && !sunset && !sea,
  };
}
