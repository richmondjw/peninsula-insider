/**
 * The clock a build's dated output was written against.
 *
 * `astro build` pins one instant for every What's On surface
 * (PI_ASTRO_BUILD_NOW, set in astro.config.mjs) and records it in
 * dist/whats-on/upcoming.json as `generatedAt`. The checks that run later in
 * the same `npm run build` chain used to read the wall clock again, so a build
 * that started before midnight in Melbourne and reached them after it was
 * judged against a day it was never built for.
 *
 * A check may judge the build by the build's own instant, but only while its
 * own clock agrees that instant is recent. The recorded instant can never move
 * the date further than that window, so a feed left over from an earlier day
 * is still stale.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Longest gap between `astro build` starting and a later step in the same
 * chain judging its output. CI builds take minutes and their jobs time out
 * well inside this.
 */
export const BUILD_CLOCK_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const describeAge = (ms) => {
  const minutes = Math.round(Math.abs(ms) / 60_000);
  return minutes < 120 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} h`;
};

/**
 * Decide whether a recorded build instant may stand in for `now`.
 *
 * @param {unknown} generatedAt  The feed's `generatedAt` value.
 * @param {Date} now             The checking step's own clock.
 * @returns {{ accepted: true, instant: Date } | { accepted: false, reason: string }}
 */
export function acceptBuildInstant(generatedAt, now = new Date(), maxAgeMs = BUILD_CLOCK_MAX_AGE_MS) {
  if (typeof generatedAt !== 'string' || !ISO_INSTANT.test(generatedAt)) {
    return { accepted: false, reason: 'the feed records no usable generatedAt' };
  }
  const instant = new Date(generatedAt);
  if (!Number.isFinite(instant.getTime())) {
    return { accepted: false, reason: 'the feed records no usable generatedAt' };
  }
  const age = now.getTime() - instant.getTime();
  if (age < 0) {
    return { accepted: false, reason: `generatedAt ${generatedAt} is ${describeAge(age)} ahead of this clock` };
  }
  if (age > maxAgeMs) {
    return {
      accepted: false,
      reason: `generatedAt ${generatedAt} is ${describeAge(age)} old; a build's own clock is accepted for ${describeAge(maxAgeMs)}`,
    };
  }
  return { accepted: true, instant };
}

/** Same decision, read from a built site directory. */
export function readBuildInstant(siteDir, now = new Date(), maxAgeMs = BUILD_CLOCK_MAX_AGE_MS) {
  const path = join(siteDir, 'whats-on', 'upcoming.json');
  if (!existsSync(path)) return { accepted: false, reason: 'no /whats-on/upcoming.json to read a build instant from' };
  let feed;
  try {
    feed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { accepted: false, reason: '/whats-on/upcoming.json is not valid JSON' };
  }
  return acceptBuildInstant(feed?.generatedAt, now, maxAgeMs);
}
