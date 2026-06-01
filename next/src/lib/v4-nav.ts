/**
 * V4 navigation source of truth.
 *
 * Six pillars (Eat & Drink, Stay, Wine, Explore, What's On, Journal) with
 * editorial mega-panel content per pillar. Places and Plans were folded into
 * Explore in the v5 typographic refactor (down from eight pillars). All copy
 * follows BRAND-PI.md voice rules: no em-dashes, no tourism adjectives,
 * specific over generic, column items as noun phrases (≤3 words), eyebrows as
 * prepositional phrases.
 *
 * Curation discipline: every column capped at 6 items. The mega menu reads
 * as edited, not exhaustive.
 *
 * Editorial pin: a typographic editor's nomination per pillar, rendered by
 * V4MegaPin with no image. Easy to swap on the next issue; change the rail
 * block per pillar.
 */

export interface V4NavItem {
  key: string;
  label: string;
  href: string;
  /** For "live" entries on What's On col 1: render with sage indicator dot. */
  live?: boolean;
}

export interface V4MegaColumn {
  /** Small caps eyebrow, e.g. "By the meal", "By the venue", "In voice". */
  eyebrow: string;
  items: V4NavItem[];
}

export interface V4MegaRail {
  /** Eyebrow above the title, e.g. "Editor's pick · Autumn '26". */
  eyebrow: string;
  /** Pin's name, e.g. "Laura". */
  title: string;
  /** Italic verdict line in PI voice. 1 to 2 sentences. */
  verdict: string;
  /** URL the pin links to. */
  href: string;
  /** Optional CTA label override. Defaults to "Read the verdict". */
  cta?: string;
}

export interface V4MegaTopBanner {
  /** e.g. "This weekend, Sat 10 to Sun 11 May" */
  text: string;
  /** Optional CTA label, e.g. "Read this weekend's letter →" */
  ctaLabel?: string;
  /** Optional CTA href. */
  ctaHref?: string;
  /** Optional icon rendered before the CTA label. 'peninsula-map' = Peninsula silhouette. */
  icon?: 'peninsula-map';
}

export interface V4Pillar extends V4NavItem {
  /** Sentence-form intro inside the panel. PI voice, no em-dashes. */
  intro: string;
  /** Optional banner above the columns (used by What's On and Explore). */
  topBanner?: V4MegaTopBanner;
  /** Editorial pin (typographic, no image). */
  rail: V4MegaRail;
  /** 2 or 3 columns; Journal uses 2. */
  columns: V4MegaColumn[];
  /** Sentence-form Ask-PI footer in voice. Always ends "Ask PI →". */
  askLine: string;
}

/** ----------------------------------------------------------------------
 *  PILLARS
 *
 *  Order: Eat & Drink → Stay → Wine → Explore → What's On → Journal.
 *  Category pillars (intent-driven discovery) lead. Explore is the umbrella
 *  for Places, Plans, and experiences. What's On and Journal trail as the
 *  editorial and temporal surfaces. Places and Plans are no longer top-level
 *  pillars; they live inside the Explore panel.
 * ---------------------------------------------------------------------- */

export const v4Pillars: V4Pillar[] = [

  // 1. EAT & DRINK ----------------------------------------------------------
  {
    key: 'eat',
    label: 'Eat & Drink',
    href: '/eat/',
    intro: 'Three ways into Eat & Drink, pick the meal, the place, or the editorial route.',
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'Laura at Pt Leo Estate',
      verdict: 'Sit at the bar, not the dining room. Better view, faster service. The kingfish is the order.',
      href: '/eat/laura-pt-leo/',
    },
    columns: [
      {
        eyebrow: 'By the meal',
        items: [
          { key: 'long-lunch',   label: 'Long lunch',       href: '/journal/the-long-lunch/' },
          { key: 'hatted',       label: 'Hatted dinner',    href: '/journal/three-italian-dinners/' },
          { key: 'breakfast',    label: 'Breakfast',        href: '/journal/breakfast-before-the-crowds/' },
          { key: 'cellar-door',  label: 'Cellar door',      href: '/journal/the-cellar-door-short-list/' },
          { key: 'cafe',         label: 'Cafes',            href: '/eat/cafes/' },
          { key: 'brewery',      label: 'Breweries',        href: '/eat/breweries/' },
          { key: 'distillery',   label: 'Distilleries',     href: '/eat/distilleries/' },
          { key: 'providore',    label: 'Providores',       href: '/eat/providores/' },
        ],
      },
      {
        eyebrow: 'Where to eat',
        items: [
          { key: 'red-hill',   label: 'Red Hill dining',   href: '/explore/places/red-hill/' },
          { key: 'sorrento',   label: 'Sorrento dining',   href: '/explore/places/sorrento/' },
          { key: 'flinders',   label: 'Flinders dining',   href: '/explore/places/flinders/' },
          { key: 'mornington', label: 'Mornington dining', href: '/explore/places/mornington/' },
          { key: 'merricks',   label: 'Merricks dining',   href: '/explore/places/merricks/' },
          { key: 'all-venues', label: 'All venues →',       href: '/eat/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'editors-table', label: "Editor's Table",      href: '/journal/' },
          { key: 'shortlist',     label: 'The Shortlist',       href: '/journal/the-cellar-door-short-list/' },
          { key: 'pantry-piece',  label: 'Pantry & produce',    href: '/journal/the-peninsula-pantry/' },
          { key: 'all-eat',       label: 'Every venue we cover', href: '/eat/' },
        ],
      },
    ],
    askLine: 'Looking for the back-roads version? Ask PI →',
  },

  // 2. STAY -----------------------------------------------------------------
  {
    key: 'stay',
    label: 'Stay',
    href: '/stay/',
    intro: 'Rooms by what the trip needs, by what kind of bed, or by editorial pick.',
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'Jackalope',
      verdict: 'The architecture is doing the work. Book Doot Doot Doot for dinner the same night, the room rate justifies the splurge.',
      href: '/stay/jackalope/',
    },
    columns: [
      {
        eyebrow: 'By the trip',
        items: [
          { key: 'one-night',  label: 'One night',         href: '/journal/the-one-night-escape/' },
          { key: 'weekend',    label: 'A weekend',         href: '/explore/plans/' },
          { key: 'kids',       label: 'With kids',         href: '/journal/the-peninsula-with-kids/' },
          { key: 'romantic',   label: 'Two of you',        href: '/journal/the-couples-weekend/' },
          { key: 'wellness',   label: 'Wellness weekend',  href: '/spa/' },
          { key: 'dog',        label: 'Dog friendly',      href: '/dog-friendly/' },
        ],
      },
      {
        eyebrow: 'By the room',
        items: [
          { key: 'hotels',   label: 'Hotels',          href: '/stay/' },
          { key: 'villas',   label: 'Villas & houses', href: '/stay/villas/' },
          { key: 'bnb',      label: 'B&Bs & cottages', href: '/stay/cottages/' },
          { key: 'glamping', label: 'Glamping',        href: '/stay/glamping/' },
          { key: 'spa',      label: 'Spa retreats',    href: '/spa/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'best-spas',     label: 'Best spas',           href: '/journal/best-spas-mornington-peninsula/' },
          { key: 'dog-stays',     label: 'Dog-friendly stays',  href: '/journal/dog-friendly-accommodation-mornington-peninsula/' },
          { key: 'all-stay',      label: 'Every room we cover', href: '/stay/' },
        ],
      },
    ],
    askLine: 'Want the room that opens up on the cancellation list? Ask PI →',
  },

  // 3. WINE -----------------------------------------------------------------
  {
    key: 'wine',
    label: 'Wine',
    href: '/wine/',
    intro: "The Peninsula's strongest editorial authority, by venue type, by place, or by the call.",
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'Ten Minutes by Tractor',
      verdict: 'Three vineyards, one table, and the Wallis Pinot is the pour. The architecture does the rest.',
      href: '/wine/ten-minutes-by-tractor/',
    },
    columns: [
      {
        eyebrow: 'By the venue',
        items: [
          { key: 'cellar-door',  label: 'Cellar door',         href: '/wine/cellar-doors/' },
          { key: 'producer',     label: 'Appointment producers', href: '/wine/appointment-producers/' },
          { key: 'best-cellar',  label: 'Best cellar doors',   href: '/wine/best-cellar-doors/' },
        ],
      },
      {
        eyebrow: 'By the place',
        items: [
          { key: 'red-hill',    label: 'Red Hill Wine',    href: '/wine/red-hill/' },
          { key: 'main-ridge',  label: 'Main Ridge Wine',  href: '/wine/main-ridge/' },
          { key: 'merricks',    label: 'Merricks Wine',    href: '/wine/merricks/' },
          { key: 'balnarring',  label: 'Balnarring Wine',  href: '/wine/balnarring/' },
          { key: 'flinders',    label: 'Flinders Wine',    href: '/wine/flinders/' },
          { key: 'all-regions', label: 'All wine regions →', href: '/wine/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'cellar-shortlist', label: 'The cellar-door shortlist', href: '/journal/the-cellar-door-short-list/' },
          { key: 'chardonnay',       label: 'The Chardonnay case',       href: '/wine/chardonnay/' },
          { key: 'pinot-noir',       label: 'The Pinot benchmark',       href: '/wine/pinot-noir/' },
          { key: 'producer-trail',   label: 'The producer trail',        href: '/journal/the-producer-trail/' },
          { key: 'all-wine',         label: 'Every winery we cover',     href: '/wine/' },
        ],
      },
    ],
    askLine: 'After the ones not on the booking apps? Ask PI →',
  },

  // 4. EXPLORE --------------------------------------------------------------
  // Umbrella pillar. Absorbs the former Places and Plans pillars. Some hrefs
  // (/explore/places/, /explore/regions/, /explore/plans/) point at routes
  // created by later phases (PR-5 URL migration, PR-6 regions); per the spec
  // these nav links land now and the pages follow.
  {
    key: 'explore',
    label: 'Explore',
    href: '/explore/',
    intro: "Every move on the Peninsula that isn't a meal or a bed.",
    topBanner: {
      text: "The whole Peninsula, on one screen.",
      ctaLabel: 'Open the map',
      ctaHref: '/map/',
      icon: 'peninsula-map',
    },
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'Bushrangers Bay walk',
      verdict: 'Two hours, almost nobody on it after lunch, and the wildflowers come out late April. Park at Cape Schanck, not Boneo.',
      href: '/explore/bushrangers-bay-walk/',
      cta: 'Plan the walk',
    },
    columns: [
      {
        eyebrow: 'Places',
        items: [
          { key: 'sorrento',    label: 'Sorrento',          href: '/explore/places/sorrento/' },
          { key: 'red-hill',    label: 'Red Hill',           href: '/explore/places/red-hill/' },
          { key: 'flinders',    label: 'Flinders',           href: '/explore/places/flinders/' },
          { key: 'mornington',  label: 'Mornington',         href: '/explore/places/mornington/' },
          { key: 'all-places',  label: 'All places →',       href: '/explore/places/' },
        ],
      },
      {
        eyebrow: 'Regions',
        items: [
          { key: 'wine-country',   label: 'Red Hill & Merricks',    href: '/explore/regions/red-hill-wine-country/' },
          { key: 'peninsula-tip',  label: 'Sorrento & Portsea',     href: '/explore/regions/peninsula-tip/' },
          { key: 'mornington-bay', label: 'Mornington & the Bay',   href: '/explore/regions/mornington-bay-coast/' },
          { key: 'ocean-coast',    label: 'Flinders & Ocean Coast', href: '/explore/regions/ocean-coast/' },
          { key: 'all-regions',    label: 'All regions →',          href: '/explore/regions/' },
        ],
      },
      {
        eyebrow: 'Plans & moves',
        items: [
          { key: 'one-night',   label: 'One night',          href: '/explore/plans/one-night-escape/' },
          { key: 'weekend',     label: 'Two-day weekend',    href: '/explore/plans/' },
          { key: 'wellness',    label: 'Wellness weekend',   href: '/explore/plans/wellness-weekend/' },
          { key: 'walks',       label: 'Walks & trails',     href: '/explore/walks/' },
          { key: 'beaches',     label: 'Beaches',            href: '/explore/beaches/' },
          { key: 'map',         label: 'Open the map →',     href: '/map/' },
        ],
      },
    ],
    askLine: 'Not sure which part of the Peninsula fits? Ask PI →',
  },

  // 5. WHAT'S ON ------------------------------------------------------------
  {
    key: 'whats-on',
    label: "What's On",
    href: '/whats-on/',
    intro: 'The events calendar with an opinion attached, weather-flagged, worth-the-drive labelled.',
    topBanner: {
      text: "This weekend's calendar",
      ctaLabel: "Read this weekend's letter →",
      ctaHref: '/whats-on/',
    },
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: "Mt Eliza Farmers' Market",
      verdict: "Sunday morning, Mt Eliza. Get there before 9 if you want a brunch table. Park at the village. Next occurrence: 4th Sunday of the month.",
      href: '/whats-on/mt-eliza-farmers-market/',
      cta: 'Plan your visit →',
    },
    columns: [
      {
        eyebrow: 'This weekend',
        items: [
          { key: 'all-weekend',     label: 'All this weekend',  href: '/whats-on/' },
          { key: 'mt-eliza-market', label: "Mt Eliza Farmers'", href: '/whats-on/mt-eliza-farmers-market/' },
        ],
      },
      {
        eyebrow: 'Coming up',
        items: [
          { key: 'community',  label: 'Community markets', href: '/whats-on/' },
          { key: 'festivals',  label: 'Festivals',         href: '/whats-on/' },
          { key: 'seasonal',   label: 'Seasonal events',   href: '/whats-on/' },
          { key: 'all-coming', label: 'All upcoming →',    href: '/whats-on/' },
        ],
      },
      {
        eyebrow: 'By the mood',
        items: [
          { key: 'weekend-edit', label: 'Autumn weekend edit', href: '/journal/autumn-weekend-edit/' },
          { key: 'long-lunch',   label: 'Long-lunch Sunday',   href: '/journal/the-long-lunch/' },
          { key: 'rainy',        label: 'When it rains',       href: '/journal/the-rainy-day-peninsula-without-a-booking/' },
          { key: 'kids',         label: 'With kids',           href: '/journal/the-peninsula-with-kids/' },
          { key: 'all-events',   label: 'Every event →',       href: '/whats-on/' },
        ],
      },
    ],
    askLine: 'Need a Saturday plan that punishes nobody? Ask PI →',
  },

  // 6. JOURNAL --------------------------------------------------------------
  {
    key: 'journal',
    label: 'Journal',
    href: '/journal/',
    intro: 'Long reads, dispatches, and the Shortlist, every issue, every piece.',
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'On the quiet authority of a good autumn',
      verdict: "The season the Peninsula stops performing. Vintage trucks finished, weekend crowds thinning, the producers finally with time.",
      href: '/journal/',
      cta: 'Read the cover →',
    },
    columns: [
      {
        eyebrow: 'Cornerstones',
        items: [
          { key: 'cellar',      label: 'The cellar-door shortlist', href: '/journal/the-cellar-door-short-list/' },
          { key: 'long-lunch',  label: 'The long lunch',            href: '/journal/the-long-lunch/' },
          { key: 'one-night',   label: 'The one-night escape',      href: '/journal/the-one-night-escape/' },
          { key: 'rainy',       label: 'Rainy-day plans',           href: '/journal/the-rainy-day-peninsula-without-a-booking/' },
          { key: 'orientation', label: 'First-visit drive',         href: '/journal/the-peninsula-orientation-drive/' },
          { key: 'kids',        label: 'With kids',                 href: '/journal/the-peninsula-with-kids/' },
        ],
      },
      {
        eyebrow: 'By the read',
        items: [
          { key: 'all-journal',        label: 'Every issue, every piece', href: '/journal/' },
        ],
      },
    ],
    askLine: 'Looking for a piece you read three issues ago? Ask PI →',
  },
];

/** Utility surfaces in the masthead row, alongside the pillars. */
export const v4Utility = {
  search:    { key: 'search',    label: 'Search',                href: '/search/' },
  ask:       { key: 'ask',       label: 'Ask PI',                href: '/ask/' },
  subscribe: { key: 'subscribe', label: 'Join the Dispatch', href: '/dispatch/' },
  account:   { key: 'account',   label: 'Saved Places & Trips',   href: '/account/' },
  pass:      { key: 'pass',      label: 'The Pass',              href: '/preview-insider-plans/' },
};

/** ----------------------------------------------------------------------
 *  FOOTER (V4 reorganisation, 6 pillars + niche surfaces)
 * ---------------------------------------------------------------------- */

export const v4FooterDepartments: V4NavItem[] = [
  { key: 'eat',      label: 'Eat & Drink', href: '/eat/' },
  { key: 'stay',     label: 'Stay',        href: '/stay/' },
  { key: 'wine',     label: 'Wine',        href: '/wine/' },
  { key: 'explore',  label: 'Explore',     href: '/explore/' },
  { key: 'whats-on', label: "What's On",   href: '/whats-on/' },
  { key: 'journal',  label: 'Journal',     href: '/journal/' },
];

export const v4FooterNiche: V4NavItem[] = [
  { key: 'golf',             label: 'Golf',         href: '/golf/' },
  { key: 'spa',              label: 'Spa',          href: '/spa/' },
  { key: 'fishing',          label: 'Fishing',      href: '/fishing/' },
  { key: 'boating',          label: 'Boating',      href: '/boating/' },
  { key: 'dog-friendly',     label: 'Dog friendly', href: '/dog-friendly/' },
  { key: 'weddings',         label: 'Weddings',     href: '/weddings/' },
  { key: 'corporate-events', label: 'Corporate',    href: '/corporate-events/' },
];

export const v4FooterAbout: V4NavItem[] = [
  { key: 'about',              label: 'About Peninsula Insider', href: '/about/' },
  { key: 'partners',           label: 'Partner With Us',    href: '/partners/' },
  { key: 'contact',            label: 'Contact',            href: '/contact/' },
];
