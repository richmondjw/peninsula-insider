/**
 * sunset.ts - deterministic sunset time for the Mornington Peninsula.
 *
 * There is no weather or almanac API wired into this repo, and the
 * conditions strip must never display a number it cannot stand behind.
 * Sunset is the one field on that strip that is pure astronomy: it can be
 * computed exactly from a date and a coordinate, with no network call and
 * no editorial input. So we compute it.
 *
 * Algorithm: the standard NOAA / "sunrise equation" solar position model
 * (low-precision Meeus). Accurate to roughly +/- 1 minute at this latitude,
 * which is well inside the resolution of a masthead strip that prints
 * whole minutes.
 *
 * Everything below is a pure function of (date, lat, lon). Evaluated at
 * build time by the conditions strip, so no client JS is shipped.
 */

/** Sorrento / Peninsula reference point used by the conditions strip. */
export const PENINSULA_LAT = -38.35;
export const PENINSULA_LON = 144.9;
export const PENINSULA_TZ = 'Australia/Melbourne';

const RAD = Math.PI / 180;
const J2000 = 2451545.0;
const UNIX_EPOCH_JD = 2440587.5;
const MS_PER_DAY = 86400000;

/** Julian date at 00:00 UTC of the given UTC calendar day. */
function julianDayFromUTC(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) / MS_PER_DAY + UNIX_EPOCH_JD;
}

/** Julian date back to a JS Date. */
function dateFromJulian(jd: number): Date {
  return new Date(Math.round((jd - UNIX_EPOCH_JD) * MS_PER_DAY));
}

/**
 * The calendar day as it reads in the given IANA timezone. We need the
 * *local* day, not the UTC day: at UTC+10 the two diverge for ten hours
 * every day, and picking the wrong one shifts sunset by ~1 minute (or a
 * whole day at the boundary).
 */
function localCalendarDay(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { y: get('year'), m: get('month'), d: get('day') };
}

/**
 * Sunset as an absolute instant, or null if the sun does not set that day
 * (polar day / night). Never happens at -38.35, but the guard keeps the
 * function honest if the coordinates are ever changed.
 *
 * `zenith` is the solar zenith angle at the event. 90.833 degrees is the
 * standard "official" sunset: the sun's upper limb touching the horizon,
 * with mean atmospheric refraction folded in.
 */
export function getSunsetInstant(
  date: Date = new Date(),
  lat: number = PENINSULA_LAT,
  lon: number = PENINSULA_LON,
  timeZone: string = PENINSULA_TZ,
  zenith = 90.833,
): Date | null {
  const { y, m, d } = localCalendarDay(date, timeZone);

  // Julian day cycle: the integer count of days since J2000 that brackets
  // the target date. (Julian days start at noon UTC, so 00:00 UTC of the
  // target date sits at .5 and ceil() lands on the right cycle.)
  const jd = julianDayFromUTC(y, m, d);
  const n = Math.ceil(jd - J2000 + 0.0008);

  // Mean solar noon at this longitude.
  const jStar = n + 0.0009 - lon / 360;

  // Solar mean anomaly.
  const M = (357.5291 + 0.98560028 * jStar) % 360;

  // Equation of the centre.
  const C =
    1.9148 * Math.sin(M * RAD) +
    0.02 * Math.sin(2 * M * RAD) +
    0.0003 * Math.sin(3 * M * RAD);

  // Ecliptic longitude (perihelion argument 102.9372).
  const lambda = (M + C + 180 + 102.9372) % 360;

  // Solar transit (local apparent noon) as a Julian date.
  const jTransit =
    J2000 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);

  // Declination of the sun (obliquity 23.4397).
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));

  // Hour angle of the event.
  const cosOmega =
    (Math.cos(zenith * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  if (cosOmega > 1 || cosOmega < -1) return null; // sun never reaches the horizon

  const omega = Math.acos(cosOmega) / RAD;
  return dateFromJulian(jTransit + omega / 360);
}

/**
 * Sunset formatted for the conditions strip, e.g. "5:26 PM".
 * Returns null when there is no sunset to report.
 */
export function getSunsetLabel(
  date: Date = new Date(),
  lat: number = PENINSULA_LAT,
  lon: number = PENINSULA_LON,
  timeZone: string = PENINSULA_TZ,
): string | null {
  const instant = getSunsetInstant(date, lat, lon, timeZone);
  if (!instant) return null;
  return new Intl.DateTimeFormat('en-AU', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(instant)
    .replace(/\s*(am|pm)$/i, (_match, meridiem: string) => ` ${meridiem.toUpperCase()}`)
    .toUpperCase();
}
