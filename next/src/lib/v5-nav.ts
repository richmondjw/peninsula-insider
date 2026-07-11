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
 * Rail pins carry the same editorial data shape as the v4 rail (the
 * existing rail data source, v4-nav.ts) so the pin copy migrates 1:1;
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

export const v5Pillars: V5Pillar[] = [

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
      { key: 'one-night', label: 'The one-night escape', href: '/journal/the-one-night-escape/' },
      { key: 'kids',      label: 'With kids',            href: '/journal/the-peninsula-with-kids/' },
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
    intro: 'The cellar doors worth your afternoon, every one visited first.',
    curated: [
      { key: 'best-cellar', label: 'Best cellar doors',         href: '/wine/best-cellar-doors/' },
      { key: 'cellar-door', label: 'Cellar doors',              href: '/wine/cellar-doors/' },
      { key: 'producers',   label: 'Appointment producers',     href: '/wine/appointment-producers/' },
      { key: 'shortlist',   label: 'The cellar-door shortlist', href: '/journal/the-cellar-door-short-list/' },
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
      verdict: 'Two hours, almost nobody on it after lunch, and the wildflowers come out late April. Park at Cape Schanck, not Boneo.',
      href: '/explore/bushrangers-bay-walk/',
      cta: 'Plan the walk',
    },
  },

  // 5. PLANS ----------------------------------------------------------------
  // Canonical decision engine now lives at /plans/ (v5). Plan detail pages
  // resolve at /plans/<slug>/ via pages/plans/[slug].astro.
  {
    key: 'plans',
    label: 'Plans',
    hub: '/plans/',
    intro: 'The weekend, already shaped. Pick one and make it yours.',
    curated: [
      { key: 'ridge-sea', label: 'Ridge to Sea, two nights', href: '/plans/ridge-to-sea-two-night-escape/' },
      { key: 'sorrento',  label: 'Sorrento, off-season',     href: '/plans/sorrento-off-season-weekend/' },
      { key: 'one-night', label: 'The one-night escape',     href: '/plans/the-one-night-escape/' },
      { key: 'family',    label: 'The family day out',       href: '/plans/the-family-day-out/' },
    ],
    browse: [
      { key: 'all-plans', label: 'All plans', href: '/plans/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'Ridge to Sea',
      verdict: 'Two nights, Red Hill down to Flinders. The order matters: ridge first, coast second, and the Friday-night arrival makes the whole thing work.',
      href: '/plans/ridge-to-sea-two-night-escape/',
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
      { key: 'rainy',        label: 'When it rains',    href: '/journal/the-rainy-day-peninsula-without-a-booking/' },
      { key: 'kids',         label: 'With kids',        href: '/journal/the-peninsula-with-kids/' },
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
      { key: 'one-night',   label: 'The one-night escape',      href: '/journal/the-one-night-escape/' },
      { key: 'orientation', label: 'The first-visit drive',     href: '/journal/the-peninsula-orientation-drive/' },
    ],
    browse: [
      { key: 'all-journal', label: 'Every issue, every piece', href: '/journal/' },
    ],
    rail: {
      eyebrow: "Editor's pick · Winter '26",
      title: 'On the quiet authority of a good autumn',
      verdict: 'The season the Peninsula stops performing. Vintage trucks finished, weekend crowds thinning, the producers finally with time.',
      href: '/journal/',
      cta: 'Read the cover',
    },
  },
];

/**
 * Masthead utilities. Three choices, both breakpoints (NAV-05: one
 * capability set everywhere). The launcher opens the existing search
 * overlay ([data-open-search]) which carries the existing Ask PI
 * escalation; /search/ is the no-JS fallback. Deeper unification of
 * search and Ask is a later wave. Saved points at the /me/ reader layer.
 */
export const v5Utilities = {
  launcher: { key: 'launcher', label: 'Ask PI or search', href: '/search/' },
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
  { key: 'plans',     label: 'Plans',              href: '/plans/',               group: 'pillars' },
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
  label: 'The Dispatch',
  dek: "The Sunday email. What's worth your weekend, chosen by PI.",
  ctaLabel: 'Join the Dispatch',
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
  { key: 'ask',  label: 'Ask PI',  href: '/search/',    opensSearch: true, evt: 'ask_open' },
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
  { key: 'plans',    label: 'Plans',       href: '/plans/' },
  { key: 'whats-on', label: "What's On",   href: '/whats-on/' },
  { key: 'journal',  label: 'Journal',     href: '/journal/' },
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
