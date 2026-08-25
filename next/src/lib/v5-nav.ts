/**
 * V5 navigation source of truth.
 *
 * Implements future-ia.md section 3: seven pillars kept verbatim, mega
 * panels cut to 1 intro line + a hard cap of 5 curated links + 1 to 2
 * browse links + 1 editor's rail pin. One unified utility launcher
 * ("Ask PI or search") replaces the separate Search and Ask entries.
 * Mobile drawer is wayfinding only: 13 single-level items plus the one
 * permitted Dispatch CTA. Bottom action bar: Ask, Map, Save, Trip.
 *
 * Budget is CI-enforced by scripts/lint-nav-budget.mjs:
 *   total header choices <= 55, drawer items (incl. CTA) <= 14.
 *
 * NOTE for the budget lint: this file must stay dependency-free (no
 * imports) and its interfaces must stay flat (no nested braces) so the
 * lint can strip types and evaluate the config. Voice rules per
 * BRAND-PI.md: no em-dashes, no tourism adjectives, no exclamation
 * marks, noun-phrase links.
 *
 * Rail pins carry the editorial data shape inherited from the v4 rail,
 * whose data source was retired with the v4 tree in P3-5;
 * V5MegaPanel marks the pin fields up with editableText() so each pin
 * is CMS-editable in place (entityType 'page', entitySlug 'nav-<key>').
 */

export interface V5NavLink {
  key: string;
  label: string;
  href: string;
}

export interface V5Rail {
  eyebrow: string;
  title: string;
  verdict: string;
  href: string;
  cta?: string;
  /** An optional build-time expiry. Expired seasonal pins resolve to fallback. */
  expiresAt?: string;
  fallback?: Omit<V5Rail, 'expiresAt' | 'fallback'>;
}

export interface V5Pillar {
  key: string;
  label: string;
  /** Canonical hub URL. The panel's first browse link points here. */
  hub: string;
  /** One intro line, PI voice. */
  intro: string;
  /** Hard cap 5. Curated noun-phrase links. */
  curated: V5NavLink[];
  /** 1 to 2 browse links (hub plus at most one adjacent surface). */
  browse: V5NavLink[];
  /** Editor's rail: exactly one pinned verdict. */
  rail: V5Rail;
}

const configuredV5Pillars = [

  // 1. EAT & DRINK ----------------------------------------------------------
  {
    key: 'eat',
    label: 'Eat & Drink',
    hub: '/eat/',
    intro: 'Where to eat well, from beach kiosk to two hats.',
    curated: [
      { key: 'long-lunch', label: 'The long lunch',            href: '/journal/the-long-lunch/' },
      { key: 'breakfast',  label: 'Breakfast before the crowds', href: '/journal/breakfast-before-the-crowds/' },
      { key: 'cafes',      label: 'Cafes',                     href: '/eat/cafes/' },
      { key: 'breweries',  label: 'Breweries',                 href: '/eat/breweries/' },
    ],
    browse: [
      { key: 'all-eat', label: 'All places to eat', href: '/eat/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'Laura at Pt Leo Estate',
      verdict: 'Sit at the bar, not the dining room. Better view, faster service. The kingfish is the order.',
      href: '/eat/laura-pt-leo/',
    },
  },

  // 2. STAY -----------------------------------------------------------------
  {
    key: 'stay',
    label: 'Stay',
    hub: '/stay/',
    intro: 'Rooms by what the trip needs, not by star count.',
    curated: [
      { key: 'one-night', label: 'The one-night escape', href: '/explore/plans/the-one-night-escape/' },
      { key: 'kids',      label: 'With kids',            href: '/journal/mornington-peninsula-with-kids/' },
      { key: 'villas',    label: 'Villas & houses',      href: '/stay/villas/' },
      { key: 'glamping',  label: 'Glamping',             href: '/stay/glamping/' },
    ],
    browse: [
      { key: 'all-stay', label: 'All stays', href: '/stay/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'Jackalope',
      verdict: 'The architecture is doing the work. Book Doot Doot Doot for dinner the same night, the room rate justifies the splurge.',
      href: '/stay/jackalope/',
    },
  },

  // 3. WINE -----------------------------------------------------------------
  {
    key: 'wine',
    label: 'Wine',
    hub: '/wine/',
    intro: 'The cellar doors we would actually send you to.',
    curated: [
      { key: 'best-cellar', label: 'Best cellar doors',         href: '/wine/best-cellar-doors/' },
      { key: 'cellar-door', label: 'Cellar doors',              href: '/wine/best-cellar-doors/' },
      { key: 'producers',   label: 'Appointment producers',     href: '/wine/appointment-producers/' },
      { key: 'shortlist',   label: 'The cellar-door shortlist', href: '/journal/the-cellar-door-short-list/' },
      { key: 'winery-weddings', label: 'Winery wedding venues', href: '/weddings/winery-wedding-venues-mornington-peninsula/' },
    ],
    browse: [
      { key: 'all-wine', label: 'All wine regions', href: '/wine/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'Ten Minutes by Tractor',
      verdict: 'Three vineyards, one table, and the Wallis Pinot is the pour. The architecture does the rest.',
      href: '/wine/ten-minutes-by-tractor/',
    },
  },

  // 4. EXPLORE --------------------------------------------------------------
  {
    key: 'explore',
    label: 'Explore',
    hub: '/explore/',
    intro: "Every move on the Peninsula that isn't a meal or a bed.",
    curated: [
      { key: 'walks', label: 'Walks & trails',   href: '/explore/walks/' },
      { key: 'golf',  label: 'Golf',             href: '/explore/golf/' },
      { key: 'dog',   label: 'Dog-friendly',     href: '/dog-friendly/' },
      { key: 'tours', label: 'Tours & charters', href: '/tour/' },
    ],
    browse: [
      { key: 'all-places', label: 'All places', href: '/explore/places/' },
      { key: 'map',        label: 'Open the map', href: '/map/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'Bushrangers Bay walk',
      verdict: 'A properly wild coast walk with a steep descent and a real payoff. Check conditions before you go, then allow enough time for the climb back.',
      href: '/explore/bushrangers-bay-walk/',
      cta: 'Plan the walk',
    },
  },

  // 5. PLANS ----------------------------------------------------------------
  // Canonical decision engine and plan detail pages live under /explore/plans/.
  {
    key: 'plans',
    label: 'Plans',
    hub: '/explore/plans/',
    intro: 'The weekend, already shaped. Pick one and make it yours.',
    curated: [
      { key: 'ridge-sea', label: 'Ridge to Sea, two nights', href: '/explore/plans/ridge-to-sea-two-night-escape/' },
      { key: 'sorrento',  label: 'Sorrento, off-season',     href: '/explore/plans/sorrento-off-season-weekend/' },
      { key: 'one-night', label: 'The one-night escape',     href: '/explore/plans/the-one-night-escape/' },
      { key: 'family',    label: 'The family day out',       href: '/explore/plans/the-family-day-out/' },
      { key: 'weddings',  label: 'Weddings',                 href: '/weddings/' },
    ],
    browse: [
      { key: 'all-plans', label: 'All plans', href: '/explore/plans/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'Ridge to Sea',
      verdict: 'Two nights, Red Hill down to Flinders. The order matters: ridge first, coast second, and the Friday-night arrival makes the whole thing work.',
      href: '/explore/plans/ridge-to-sea-two-night-escape/',
      cta: 'Open the plan',
    },
  },

  // 6. WHAT'S ON ------------------------------------------------------------
  {
    key: 'whats-on',
    label: "What's On",
    hub: '/whats-on/',
    intro: 'The events calendar with an opinion attached.',
    curated: [
      { key: 'weekend-edit', label: 'The weekend edit', href: '/journal/autumn-weekend-edit/' },
      { key: 'rainy',        label: 'When it rains',    href: '/journal/rainy-day-peninsula/' },
      { key: 'kids',         label: 'With kids',        href: '/journal/mornington-peninsula-with-kids/' },
    ],
    browse: [
      { key: 'all-whats-on', label: 'Everything on this weekend', href: '/whats-on/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'MPRG school holiday workshops',
      verdict: 'Starts 1 July in Mornington, indoor, practical, and actually useful if the school-holiday weather turns. Book early.',
      href: '/whats-on/mornington-peninsula-regional-gallery-school-holiday-workshops/',
      cta: 'Plan your visit',
      expiresAt: '2026-08-01',
      fallback: {
        eyebrow: "Editor's note",
        title: 'The weekend edit',
        verdict: 'Three calls, selected for the days ahead. Check dates before you make the drive.',
        href: '/whats-on/',
        cta: 'See what is on',
      },
    },
  },

  // 7. JOURNAL --------------------------------------------------------------
  {
    key: 'journal',
    label: 'Journal',
    hub: '/journal/',
    intro: 'Long reads and the Shortlist, every issue, every piece.',
    curated: [
      { key: 'shortlist',   label: 'The cellar-door shortlist', href: '/journal/the-cellar-door-short-list/' },
      { key: 'long-lunch',  label: 'The long lunch',            href: '/journal/the-long-lunch/' },
      { key: 'one-night',   label: 'The one-night escape',      href: '/explore/plans/the-one-night-escape/' },
      { key: 'orientation', label: 'The first-visit drive',     href: '/explore/plans/the-peninsula-orientation-drive/' },
    ],
    browse: [
      { key: 'all-journal', label: 'Every issue, every piece', href: '/journal/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'Insider Picks, 12 August',
      verdict: 'Three things worth making time for this week, chosen by the desk.',
      href: '/journal/insider-picks-2026-08-12/',
      cta: 'Read the picks',
      expiresAt: '2026-08-19',
      fallback: {
        eyebrow: "Editor's note",
        title: 'The Journal',
        verdict: 'Guides and stories to help shape the next Peninsula day.',
        href: '/journal/',
        cta: 'Browse the Journal',
      },
    },
  },
];

/**
 * Seasonal rails must fail closed. A stale recommendation is worse than an
 * evergreen one, so an expired pin is replaced at build time with its neutral
 * fallback rather than remaining visible until someone remembers to edit it.
 */
const today = new Date().toISOString().slice(0, 10);
export const v5Pillars: V5Pillar[] = configuredV5Pillars.map((pillar) => {
  const { rail } = pillar;
  if (rail.expiresAt && rail.fallback && rail.expiresAt < today) {
    return { ...pillar, rail: rail.fallback };
  }
  return pillar;
});

/**
 * Masthead utilities. Three choices, both breakpoints (NAV-05: one
 * capability set everywhere). The launcher opens the existing search
 * overlay ([data-open-search]) which carries the existing Ask PI
 * escalation; /search/ is the no-JS fallback. Deeper unification of
 * search and Ask is a later wave. Saved points at the /me/ reader layer.
 */
export const v5Utilities = {
  launcher: { key: 'launcher', label: 'Search', href: '/search/' },
  saved:    { key: 'saved',    label: 'Saved',            href: '/me/saved/' },
  menu:     { key: 'menu',     label: 'Menu' },
};

/**
 * Mobile drawer: wayfinding only. 13 single-level rows, no accordions,
 * no split targets. Groups render with plain-text labels (not headings).
 */
export interface V5DrawerItem {
  key: string;
  label: string;
  href: string;
  group: string;
}

export const v5DrawerItems: V5DrawerItem[] = [
  { key: 'eat',       label: 'Eat & Drink',        href: '/eat/',                 group: 'pillars' },
  { key: 'stay',      label: 'Stay',               href: '/stay/',                group: 'pillars' },
  { key: 'wine',      label: 'Wine',               href: '/wine/',                group: 'pillars' },
  { key: 'explore',   label: 'Explore',            href: '/explore/',             group: 'pillars' },
  { key: 'plans',     label: 'Plans',              href: '/explore/plans/',       group: 'pillars' },
  { key: 'whats-on',  label: "What's On",          href: '/whats-on/',            group: 'pillars' },
  { key: 'journal',   label: 'Journal',            href: '/journal/',             group: 'pillars' },
  { key: 'saved',     label: 'Saved',              href: '/me/saved/',            group: 'mine' },
  { key: 'trip',      label: 'My Trip',            href: '/me/trip/',             group: 'mine' },
  { key: 'account',   label: 'Account',            href: '/account/',             group: 'mine' },
  { key: 'about',     label: 'About',              href: '/about/',               group: 'trust' },
  { key: 'editorial', label: 'Editorial approach', href: '/editorial-approach/',  group: 'trust' },
  { key: 'contact',   label: 'Contact',            href: '/contact/',             group: 'trust' },
];

/** The one CTA permitted in the drawer. */
export const v5DrawerCta = {
  key: 'dispatch',
  label: 'The Insider Note',
  dek: 'The Peninsula worth knowing. Weekly.',
  ctaLabel: 'Join The Insider Note',
  href: '/dispatch/',
};

/**
 * Bottom action bar (mobile, <=1023px): the on-Peninsula verbs.
 * Ask opens the launcher (search overlay with Ask escalation); Map,
 * Save and Trip link to the existing surfaces for now.
 */
export interface V5BarItem {
  key: string;
  label: string;
  href: string;
  opensSearch?: boolean;
  evt?: string;
}

export const v5BottomBar: V5BarItem[] = [
  // Ask PI hidden until bug fix: { key: 'ask', label: 'Ask PI', href: '/search/', opensSearch: true, evt: 'ask_open' },
  { key: 'map',  label: 'Map',     href: '/map/',       evt: 'map_toggle' },
  { key: 'save', label: 'Saved',   href: '/me/saved/' },
  { key: 'trip', label: 'My Trip', href: '/me/trip/' },
];

/** Footer, future-ia.md section 3.3: three columns plus one Dispatch block. */
export const v5FooterSections: V5NavLink[] = [
  { key: 'eat',      label: 'Eat & Drink', href: '/eat/' },
  { key: 'stay',     label: 'Stay',        href: '/stay/' },
  { key: 'wine',     label: 'Wine',        href: '/wine/' },
  { key: 'explore',  label: 'Explore',     href: '/explore/' },
  { key: 'plans',    label: 'Plans',       href: '/explore/plans/' },
  { key: 'whats-on', label: "What's On",   href: '/whats-on/' },
  { key: 'journal',  label: 'Journal',     href: '/journal/' },
  // Weddings is not a masthead pillar (the seven are kept verbatim per
  // future-ia.md), but it is a real hub with commercial intent, so it earns a
  // permanent site-wide internal link here alongside its home in the Plans panel.
  { key: 'weddings', label: 'Weddings',    href: '/weddings/' },
];

export const v5FooterAbout: V5NavLink[] = [
  { key: 'about',     label: 'About',              href: '/about/' },
  { key: 'editorial', label: 'Editorial approach', href: '/editorial-approach/' },
  { key: 'partners',  label: 'Partners',           href: '/partners/' },
  { key: 'contact',   label: 'Contact',            href: '/contact/' },
];

export const v5FooterFinePrint: V5NavLink[] = [
  { key: 'privacy',       label: 'Privacy',       href: '/privacy/' },
  { key: 'terms',         label: 'Terms',         href: '/terms/' },
  { key: 'accessibility', label: 'Accessibility', href: '/accessibility/' },
  { key: 'corrections',   label: 'Corrections',   href: '/corrections/' },
];
