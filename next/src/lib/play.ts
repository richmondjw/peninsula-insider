/**
 * play.ts - the one place the site knows about "Where in the Peninsula is PI?"
 *
 * Every promo surface (masthead beacon, conditions ticker, route ribbons,
 * homepage band, journal card, corner peek) reads from here. Rolling a new
 * case or prize window means editing this file, nothing else.
 *
 * The game itself lives at play.peninsulainsider.com.au (separate repo,
 * richmondjw/where-is-pi). Prize entries are recorded there; the site only
 * sends players across, tagged by surface so GA4 can rank the placements.
 */

/** Every open case, oldest first. The newest is the one the site promotes. */
const CASES = [
  {
    id: '01',
    title: 'Took her coffee to go',
    /** Place slugs on PI's route, in order. */
    places: ['mornington', 'cape-schanck', 'main-ridge', 'red-hill'],
    /** Venue slug where she is found. */
    venue: 'montalto',
    image: '/images/play/case-01-mornington.webp',
  },
  {
    id: '02',
    title: 'Took the long way to dinner',
    places: ['red-hill', 'balnarring', 'point-leo', 'flinders'],
    venue: 'moke-dining',
    image: '/images/play/case-02-red-hill.webp',
  },
] as const;

export type PlayCase = (typeof CASES)[number];

export const PLAY = {
  /** Master switch. False removes every surface at build time. */
  enabled: true,
  url: 'https://play.peninsulainsider.com.au/',
  cases: CASES,
  /** The case every promo surface leads with: the newest one. */
  case: CASES[CASES.length - 1] as PlayCase,
  draw: {
    period: '2026-10',
    partner: 'Doot Doot Doot, Jackalope',
    partnerSlug: 'doot-doot-doot',
    prize: '$250 to dine',
    closes: 'Sunday 11 October 2026',
  },
} as const;

export type PlayRole = 'found' | 'route' | 'prize';

/** The case this entity belongs to, newest first (Red Hill is on both routes). */
export function playCaseFor(kind: 'place' | 'venue', slug: string): PlayCase | null {
  if (!PLAY.enabled) return null;
  for (const c of [...CASES].reverse()) {
    if (kind === 'venue' && slug === c.venue) return c;
    if (kind === 'place' && (c.places as readonly string[]).includes(slug)) return c;
  }
  return null;
}

/** What, if anything, this entity has to do with an open case. */
export function playRole(kind: 'place' | 'venue', slug: string): PlayRole | null {
  if (!PLAY.enabled) return null;
  const c = playCaseFor(kind, slug);
  if (kind === 'venue' && c) return 'found';
  if (kind === 'venue' && slug === PLAY.draw.partnerSlug) return 'prize';
  if (kind === 'place' && c) return 'route';
  return null;
}

/** Outbound link to the game, tagged with the surface that sent the reader. */
export function playUrl(surface: string): string {
  const u = new URL(PLAY.url);
  u.searchParams.set('utm_source', 'peninsulainsider.com.au');
  u.searchParams.set('utm_medium', 'site');
  u.searchParams.set('utm_campaign', `where-is-pi-case-${PLAY.case.id}`);
  u.searchParams.set('utm_content', surface);
  return u.toString();
}

/** One line, used wherever the prize is mentioned. Always names the partner. */
export const PRIZE_LINE = `Find her and go in the draw for ${PLAY.draw.prize} at ${PLAY.draw.partner}.`;
