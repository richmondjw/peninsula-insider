/**
 * Audience persona registry — drives the AudiencePicker component.
 *
 * Each persona maps to a section-specific destination URL when one exists,
 * and falls back to a cross-section default when it does not. Section keys
 * match the masthead nav lanes: eat, stay, wine, explore, escape, fishing,
 * boating. Adding a new persona or a new per-section route is the only
 * place you should need to touch.
 *
 * All routes verified present in the Astro page tree on 2026-05-03.
 */

export type SectionKey =
  | 'home'
  | 'eat'
  | 'stay'
  | 'wine'
  | 'explore'
  | 'escape'
  | 'fishing'
  | 'boating';

export interface AudiencePersona {
  /** Stable id used in URLs and analytics. */
  slug: string;
  /** Tile title — short noun phrase, two words ideal. */
  label: string;
  /** Editorial dek under the label. One line. */
  dek: string;
  /** Single-character mark (✦ ◆ ◯ ○ etc) shown top-left of the tile. */
  mark: string;
  /**
   * Per-section destination map. `default` is used when the current section
   * does not have a tailored route, or when the picker is rendered outside
   * any section (e.g. homepage).
   */
  routes: Partial<Record<SectionKey, string>> & { default: string };
}

export const audiencePersonas: AudiencePersona[] = [
  {
    slug: 'couples-weekend',
    label: 'Couples weekend',
    dek: 'Long lunches, slow stays, no schedules.',
    mark: '◆',
    routes: {
      eat: '/eat/date-night/',
      stay: '/stay/couples/',
      wine: '/wine/best-cellar-doors/',
      explore: '/explore/spas-and-wellness/',
      escape: '/plans/mornington-peninsula-itinerary/',
      default: '/plans/mornington-peninsula-itinerary/',
    },
  },
  {
    slug: 'family-with-kids',
    label: 'Family with kids',
    dek: 'Rooms that welcome them, days that hold them.',
    mark: '✦',
    routes: {
      eat: '/eat/family-friendly/',
      stay: '/stay/cottages/',
      wine: '/explore/family-friendly/',
      explore: '/explore/family-friendly/',
      escape: '/explore/family-friendly/',
      default: '/explore/family-friendly/',
    },
  },
  {
    slug: 'long-lunch',
    label: 'Long lunch',
    dek: 'Three-hour tables, hatted kitchens, vineyard fires.',
    mark: '◯',
    routes: {
      eat: '/eat/hatted-restaurants/',
      stay: '/stay/winery-accommodation/',
      wine: '/wine/best-cellar-doors/',
      explore: '/eat/long-lunch/',
      escape: '/eat/hatted-restaurants/',
      default: '/eat/hatted-restaurants/',
    },
  },
  {
    slug: 'wine-curious',
    label: 'Wine curious',
    dek: 'Cellar doors picked by what the wine actually does.',
    mark: '◇',
    routes: {
      eat: '/eat/cellar-door-lunch/',
      stay: '/stay/winery-accommodation/',
      wine: '/wine/best-cellar-doors/',
      explore: '/wine/best-cellar-doors/',
      escape: '/wine/best-cellar-doors/',
      default: '/wine/best-cellar-doors/',
    },
  },
  {
    slug: 'wellness-reset',
    label: 'Wellness reset',
    dek: 'Hot springs, walks that go the long way, slow rooms.',
    mark: '○',
    routes: {
      eat: '/eat/long-lunch/',
      stay: '/stay/wellness-retreats/',
      wine: '/explore/spas-and-wellness/',
      explore: '/explore/spas-and-wellness/',
      escape: '/explore/spas-and-wellness/',
      default: '/explore/spas-and-wellness/',
    },
  },
  {
    slug: 'dog-days',
    label: 'Bring the dog',
    dek: 'Tables, beaches, and rooms where dogs sit at the foot.',
    mark: '◐',
    routes: {
      eat: '/eat/dog-friendly/',
      stay: '/stay/dog-friendly/',
      wine: '/wine/dog-friendly/',
      explore: '/dog-friendly/',
      escape: '/dog-friendly/',
      default: '/dog-friendly/',
    },
  },
  {
    slug: 'big-group',
    label: 'Big group, corporate',
    dek: 'Tables of twelve, villas that sleep ten, retreats that book.',
    mark: '◑',
    routes: {
      eat: '/eat/long-lunch/',
      stay: '/stay/villas/',
      wine: '/wine/best-cellar-doors/',
      explore: '/corporate-events/',
      escape: '/corporate-events/',
      default: '/corporate-events/',
    },
  },
  {
    slug: 'first-time',
    label: 'First-time visitor',
    dek: "If it's your first weekend on the Peninsula, start here.",
    mark: '✚',
    routes: {
      eat: '/eat/best-restaurants/',
      stay: '/stay/where-to-stay-mornington-peninsula/',
      wine: '/wine/best-wineries-mornington-peninsula/',
      explore: '/plans/mornington-peninsula-itinerary/',
      escape: '/plans/mornington-peninsula-itinerary/',
      default: '/plans/mornington-peninsula-itinerary/',
    },
  },
];

/** Resolve a persona's destination URL for the current section. */
export function personaRoute(
  persona: AudiencePersona,
  section: SectionKey | undefined,
): string {
  if (section && persona.routes[section]) {
    return persona.routes[section] as string;
  }
  return persona.routes.default;
}
