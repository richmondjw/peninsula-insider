/**
 * V4 navigation source of truth.
 *
 * Seven pillars (Eat & Drink, Wine, Stay, Explore, Plans, What's On, Journal)
 * with editorial mega-panel content per pillar. All copy follows BRAND-PI.md
 * voice rules: no em-dashes, no tourism adjectives, specific over generic,
 * column items as noun phrases (≤3 words), eyebrows as prepositional phrases.
 *
 * Curation discipline: every column capped at 6 items. The mega menu reads
 * as edited, not exhaustive.
 *
 * Image-rail picks: editor's nomination per pillar for the autumn 2026 issue.
 * Easy to swap on the next issue — change the rail block per pillar.
 */

export interface V4NavItem {
  key: string;
  label: string;
  href: string;
  /** For "live" entries on What's On col 1 — render with sage indicator dot. */
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
  /** Italic verdict line in PI voice. 1–2 sentences. */
  verdict: string;
  /** Image src and alt. */
  image: string;
  imageAlt: string;
  /** URL the rail links to. */
  href: string;
  /** Optional CTA label override. Defaults to "Open the verdict →". */
  cta?: string;
}

export interface V4MegaTopBanner {
  /** e.g. "This weekend, Sat 10 – Sun 11 May" */
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
  /** Optional banner above the columns (used by What's On). */
  topBanner?: V4MegaTopBanner;
  /** Image rail (editor's pin). */
  rail: V4MegaRail;
  /** 2 or 3 columns; Journal uses 2. */
  columns: V4MegaColumn[];
  /** Sentence-form Ask-PI footer in voice. Always ends "Ask PI →". */
  askLine: string;
}

/** ----------------------------------------------------------------------
 *  PILLARS
 *
 *  Order: What's On → Plans → Eat & Drink → Wine → Stay → Explore → Journal.
 *  What's On leads because the highest-intent question on a Peninsula
 *  weekend is "what's happening this Saturday?" — the live calendar wins
 *  the first slot. Plans follows because pre-shaped weekends are the
 *  next step. Editorial pillars come after intent.
 * ---------------------------------------------------------------------- */

export const v4Pillars: V4Pillar[] = [

  // 1. WHAT'S ON ------------------------------------------------------------
  {
    key: 'whats-on',
    label: "What's On",
    href: '/whats-on/',
    intro: 'The events calendar with an opinion attached, kids-graded, weather-flagged, worth-the-drive labelled.',
    topBanner: {
      text: "This weekend's calendar",
      ctaLabel: "Read this weekend's letter →",
      ctaHref: '/whats-on/',
    },
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: "Mt Eliza Farmers' Market",
      verdict: "Sunday morning, Mt Eliza. Get there before 9 if you want a brunch table. Park at the village. Next occurrence: 4th Sunday of the month.",
      image: '/images/sourced/article-picnic-01.webp',
      imageAlt: "Mt Eliza Farmers' Market",
      href: '/whats-on/mt-eliza-farmers-market/',
      cta: 'Plan your visit →',
    },
    columns: [
      {
        eyebrow: 'This weekend',
        items: [
          { key: 'all-weekend',     label: 'All this weekend',  href: '/whats-on/' },
          { key: 'mt-eliza-market', label: "Mt Eliza Farmers'", href: '/whats-on/mt-eliza-farmers-market/' },
          { key: 'main-street',     label: 'Main Street fest',  href: '/whats-on/main-street-mornington-festival-2026/' },
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

  // 2. PLANS ----------------------------------------------------------------
  {
    key: 'escape',
    label: 'Plans',
    href: '/plans/',
    intro: 'Pre-shaped Peninsula days, by length, by guide, or by occasion.',
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'The Thermal Springs Weekend',
      verdict: "Hot springs without wasting the rest of the weekend. Two nights at a wine-country room, one long lunch, one steam.",
      image: '/images/sourced/spa-alba-thermal-springs-01.webp',
      imageAlt: 'Thermal springs pools on the Mornington Peninsula',
      href: '/journal/the-thermal-springs-weekend/',
    },
    columns: [
      {
        eyebrow: 'By the shape',
        items: [
          { key: 'one-night', label: 'One night',         href: '/journal/the-one-night-escape/' },
          { key: 'weekend',   label: 'Two-day weekend',   href: '/plans/' },
          { key: 'long',      label: 'Long weekend',      href: '/plans/' },
          { key: 'kids',      label: 'With kids',         href: '/journal/the-peninsula-with-kids/' },
          { key: 'wellness',  label: 'Wellness weekend',  href: '/journal/the-thermal-springs-weekend/' },
          { key: 'romantic',  label: 'Romantic two',      href: '/journal/the-couples-weekend/' },
        ],
      },
      {
        eyebrow: 'Hand it to a guide',
        items: [
          { key: 'tours',     label: 'Operator tours',     href: '/tour/' },
          { key: 'packages',  label: 'Multi-day packages', href: '/tour-packages/' },
          { key: 'wine-day',  label: 'Wine-tour day',      href: '/tour/' },
          { key: 'springs',   label: 'Hot-springs day',    href: '/tour/' },
          { key: 'golf-day',  label: 'Golf day',           href: '/golf/' },
          { key: 'dolphin',   label: 'Dolphin swim day',   href: '/tour/' },
        ],
      },
      {
        eyebrow: 'By the occasion',
        items: [
          { key: 'weddings',     label: 'Weddings',                  href: '/weddings/' },
          { key: 'corporate',    label: 'Corporate offsites',        href: '/corporate-events/' },
          { key: 'corp-guide',   label: 'How to plan a retreat',     href: '/journal/corporate-events-how-to-plan-peninsula-retreat/' },
          { key: 'group',        label: 'Group of six+',             href: '/plans/' },
          { key: 'eoy',          label: 'End-of-year offsite',       href: '/corporate-events/' },
        ],
      },
    ],
    askLine: 'Need the plan shaped around six adults on a Saturday? Ask PI →',
  },

  // 3. EAT & DRINK ----------------------------------------------------------
  {
    key: 'eat',
    label: 'Eat & Drink',
    href: '/eat/',
    intro: 'Three ways into Eat & Drink, pick the meal, the place, or the editorial route.',
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'Laura at Pt Leo Estate',
      verdict: 'Sit at the bar, not the dining room. Better view, faster service. The kingfish is the order.',
      image: '/images/sourced/article-hatted-restaurants-01.webp',
      imageAlt: 'Laura at Pt Leo Estate, the bar with the bay view',
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
          { key: 'pantry',       label: 'Pantry & produce', href: '/journal/the-peninsula-pantry/' },
        ],
      },
      {
        eyebrow: 'Where to eat',
        items: [
          { key: 'red-hill',   label: 'Red Hill dining',   href: '/places/red-hill/' },
          { key: 'sorrento',   label: 'Sorrento dining',   href: '/places/sorrento/' },
          { key: 'flinders',   label: 'Flinders dining',   href: '/places/flinders/' },
          { key: 'mornington', label: 'Mornington dining', href: '/places/mornington/' },
          { key: 'merricks',   label: 'Merricks dining',   href: '/places/merricks/' },
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

  // 4. WINE -----------------------------------------------------------------
  {
    key: 'wine',
    label: 'Wine',
    href: '/wine/',
    intro: "The Peninsula's strongest editorial authority, by venue type, by place, or by the call.",
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'Ten Minutes by Tractor',
      verdict: 'Three vineyards, one table, and the Wallis Pinot is the pour. The architecture does the rest.',
      image: '/images/sourced/article-cellar-door-01.webp',
      imageAlt: 'Ten Minutes by Tractor cellar door, Main Ridge',
      href: '/wine/ten-minutes-by-tractor/',
    },
    columns: [
      {
        eyebrow: 'By the venue',
        items: [
          { key: 'cellar-door',  label: 'Cellar door',         href: '/wine/cellar-doors/' },
          { key: 'producer',     label: 'Appointment producers', href: '/wine/appointment-producers/' },
          { key: 'best-cellar',  label: 'Best cellar doors',   href: '/wine/best-cellar-doors/' },
          { key: 'brewery',      label: 'Breweries',           href: '/wine/#breweries' },
          { key: 'distillery',   label: 'Distilleries',        href: '/wine/#distilleries' },
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

  // 5. STAY -----------------------------------------------------------------
  {
    key: 'stay',
    label: 'Stay',
    href: '/stay/',
    intro: 'Rooms by what the trip needs, by what kind of bed, or by editorial pick.',
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'Jackalope',
      verdict: 'The architecture is doing the work. Book Doot Doot Doot for dinner the same night, the room rate justifies the splurge.',
      image: '/images/sourced/article-vineyard-villa-01.webp',
      imageAlt: 'Jackalope hotel, Merricks North',
      href: '/stay/jackalope/',
    },
    columns: [
      {
        eyebrow: 'By the trip',
        items: [
          { key: 'one-night',  label: 'One night',         href: '/journal/the-one-night-escape/' },
          { key: 'weekend',    label: 'A weekend',         href: '/plans/' },
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


  // 6. PLACES ---------------------------------------------------------------
  {
    key: 'places',
    label: 'Places',
    href: '/places/',
    intro: 'Destination guides for every part of the Peninsula — where to base yourself, what each area is best for, and the local guides that go deeper.',
    rail: {
      eyebrow: "Editor’s pick · Autumn ✘’26",
      title: 'Red Hill',
      verdict: 'The plateau that defines Peninsula food and wine. Cellar doors, hatted restaurants and the ridgeline roads that make the weekend.',
      image: '/images/sourced/place-red-hill-01.webp',
      imageAlt: 'Red Hill vineyards and ridge, Mornington Peninsula',
      href: '/places/red-hill/',
    },
    columns: [
      {
        eyebrow: 'Destinations',
        items: [
          { key: 'red-hill',    label: 'Red Hill',    href: '/places/red-hill/' },
          { key: 'sorrento',    label: 'Sorrento',    href: '/places/sorrento/' },
          { key: 'flinders',    label: 'Flinders',    href: '/places/flinders/' },
          { key: 'mornington',  label: 'Mornington',  href: '/places/mornington/' },
          { key: 'main-ridge',  label: 'Main Ridge',  href: '/places/main-ridge/' },
          { key: 'all-places',  label: 'All destinations →', href: '/places/' },
        ],
      },
      {
        eyebrow: 'Category guides',
        items: [
          { key: 'red-hill-wine',   label: 'Red Hill Wine',    href: '/wine/red-hill/' },
          { key: 'flinders-wine',   label: 'Flinders Wine',    href: '/wine/flinders/' },
          { key: 'main-ridge-wine', label: 'Main Ridge Wine',  href: '/wine/main-ridge/' },
          { key: 'red-hill-stay',   label: 'Red Hill Stays',   href: '/stay/red-hill/' },
          { key: 'flinders-stay',   label: 'Flinders Stays',   href: '/stay/flinders/' },
          { key: 'sorrento-stay',   label: 'Sorrento Stays',   href: '/stay/sorrento/' },
        ],
      },
      {
        eyebrow: 'Discover on map',
        items: [
          { key: 'map',           label: 'Open the Peninsula map', href: '/map/' },
          { key: 'cape-schanck',  label: 'Cape Schanck',           href: '/places/cape-schanck/' },
          { key: 'merricks',      label: 'Merricks',               href: '/places/merricks/' },
          { key: 'portsea',       label: 'Portsea',                href: '/places/portsea/' },
          { key: 'mount-martha',  label: 'Mount Martha',           href: '/places/mount-martha/' },
          { key: 'where-to-base', label: 'Where to base yourself', href: '/explore/where-to-base-yourself/' },
        ],
      },
    ],
    askLine: 'Not sure which part of the Peninsula fits? Ask PI →',
  },

  // 7. EXPLORE --------------------------------------------------------------
  {
    key: 'explore',
    label: 'Explore',
    href: '/explore/',
    intro: "Every move on the Peninsula that isn't a meal or a bed.",
    topBanner: {
      text: "The whole Peninsula, on one screen.",
      ctaLabel: 'Explore The Insider Map',
      ctaHref: '/map/',
      icon: 'peninsula-map',
    },
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'Bushrangers Bay walk',
      verdict: 'Two hours, almost nobody on it after lunch, and the wildflowers come out late April. Park at Cape Schanck, not Boneo.',
      image: '/images/sourced/explore-bushrangers-bay-walk-01.webp',
      imageAlt: 'Bushrangers Bay walk, late afternoon light',
      href: '/explore/bushrangers-bay-walk/',
    },
    columns: [
      {
        eyebrow: 'By the move',
        items: [
          { key: 'walks',       label: 'Walks & trails',    href: '/explore/walks/' },
          { key: 'beaches',     label: 'Beaches',           href: '/explore/beaches/' },
          { key: 'markets',     label: 'Markets',           href: '/explore/markets/' },
          { key: 'hot-springs', label: 'Hot springs',       href: '/explore/hot-springs/' },
          { key: 'on-water',    label: 'On the water',      href: '/boating/' },
          { key: 'all-moves',   label: 'All experiences →', href: '/explore/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'orientation',  label: 'First-visit drive',   href: '/journal/the-peninsula-orientation-drive/' },
          { key: 'rainy',        label: 'Rainy-day plans',     href: '/journal/the-rainy-day-peninsula-without-a-booking/' },
          { key: 'sunset',       label: 'Sunset moves',        href: '/journal/the-sunset-drink/' },
          { key: 'cape-schanck', label: 'Cape Schanck guide',  href: '/journal/cape-schanck-guide/' },
          { key: 'dog',          label: 'Dog-friendly moves',  href: '/dog-friendly/' },
          { key: 'free',         label: 'Free things to do',   href: '/explore/free/' },
        ],
      },
    ],
    askLine: 'Want the walk only locals know? Ask PI →',
  },


  // 8. NOTEBOOK -------------------------------------------------------------
  // Minimal link-only pillar. No mega panel, no chevron.
  // Renders like Journal — calm editorial label, direct link.

  // 7. JOURNAL --------------------------------------------------------------
  {
    key: 'journal',
    label: 'Journal',
    href: '/journal/',
    intro: 'Long reads, dispatches, and the Shortlist, every issue, every piece.',
    rail: {
      eyebrow: 'Editor’s pick · Autumn ’26',
      title: 'On the quiet authority of a good autumn',
      verdict: "The season the Peninsula stops performing. Vintage trucks finished, weekend crowds thinning, the producers finally with time.",
      image: '/images/sourced/place-red-hill-01.webp',
      imageAlt: 'Vine rows in late-season colour, Red Hill',
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
          { key: 'editorial-approach', label: 'Editorial approach',       href: '/editorial-approach/' },
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
  subscribe: { key: 'subscribe', label: 'Join', href: '/newsletter/' },
  account:   { key: 'account',   label: 'Sign in / Save trip',   href: '/account/' },
  pass:      { key: 'pass',      label: 'The Pass',              href: '/preview-insider-plans/' },
};

/** ----------------------------------------------------------------------
 *  FOOTER (V4 reorganisation, 7 pillars + niche surfaces)
 * ---------------------------------------------------------------------- */

export const v4FooterDepartments: V4NavItem[] = [
  { key: 'eat',      label: 'Eat & Drink', href: '/eat/' },
  { key: 'places',   label: 'Places',      href: '/places/' },
  { key: 'wine',     label: 'Wine',        href: '/wine/' },
  { key: 'stay',     label: 'Stay',        href: '/stay/' },
  { key: 'explore',  label: 'Explore',     href: '/explore/' },
  { key: 'escape',   label: 'Plans',       href: '/plans/' },
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
  { key: 'editorial-approach', label: 'Editorial Approach', href: '/editorial-approach/' },
  { key: 'partners',           label: 'Partner With Us',    href: '/partners/' },
  { key: 'contact',            label: 'Contact',            href: '/contact/' },
];
