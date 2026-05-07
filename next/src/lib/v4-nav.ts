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
  /** Optional CTA label, e.g. "Read the dispatch →" */
  ctaLabel?: string;
  /** Optional CTA href. */
  ctaHref?: string;
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
      image: '/images/sourced/article-hatted-restaurants-01.webp',
      imageAlt: 'Laura at Pt Leo Estate, the bar with the bay view',
      href: '/eat/laura/',
    },
    columns: [
      {
        eyebrow: 'By the meal',
        items: [
          { key: 'long-lunch',   label: 'Long lunch',       href: '/journal/the-long-lunch/' },
          { key: 'hatted',       label: 'Hatted dinner',    href: '/journal/three-italian-dinners/' },
          { key: 'breakfast',    label: 'Breakfast',        href: '/journal/breakfast-before-the-crowds/' },
          { key: 'cellar-door',  label: 'Cellar door',      href: '/journal/the-cellar-door-short-list/' },
          { key: 'cafe',         label: 'Cafe & bakery',    href: '/eat/?type=cafe' },
          { key: 'pantry',       label: 'Pantry & produce', href: '/journal/the-peninsula-pantry/' },
        ],
      },
      {
        eyebrow: 'By the place',
        items: [
          { key: 'red-hill',   label: 'Red Hill',   href: '/places/red-hill/' },
          { key: 'sorrento',   label: 'Sorrento',   href: '/places/sorrento/' },
          { key: 'flinders',   label: 'Flinders',   href: '/places/flinders/' },
          { key: 'mornington', label: 'Mornington', href: '/places/mornington/' },
          { key: 'main-ridge', label: 'Main Ridge', href: '/places/main-ridge/' },
          { key: 'merricks',   label: 'Merricks',   href: '/places/merricks/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'editors-table', label: "Editor's Table",      href: '/journal/?format=editors-table' },
          { key: 'shortlist',     label: 'The Shortlist',       href: '/journal/?format=shortlist' },
          { key: 'pantry-piece',  label: 'Pantry & produce',    href: '/journal/the-peninsula-pantry/' },
          { key: 'all-eat',       label: 'Every venue we cover', href: '/eat/' },
        ],
      },
    ],
    askLine: 'Looking for the back-roads version? Ask PI →',
  },

  // 2. WINE -----------------------------------------------------------------
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
          { key: 'cellar-door',     label: 'Cellar door',       href: '/wine/?type=winery' },
          { key: 'producer',        label: 'Producer (no door)', href: '/wine/?type=producer' },
          { key: 'brewery',         label: 'Brewery',           href: '/wine/?type=brewery' },
          { key: 'distillery',      label: 'Distillery',        href: '/wine/?type=distillery' },
          { key: 'cidery',          label: 'Cidery',            href: '/wine/?type=cidery' },
          { key: 'pop-up',          label: 'Pop-up tasting',    href: '/wine/?type=pop-up' },
        ],
      },
      {
        eyebrow: 'By the place',
        items: [
          { key: 'red-hill',   label: 'Red Hill',   href: '/wine/red-hill/' },
          { key: 'main-ridge', label: 'Main Ridge', href: '/places/main-ridge/' },
          { key: 'merricks',   label: 'Merricks',   href: '/places/merricks/' },
          { key: 'mornington', label: 'Mornington', href: '/places/mornington/' },
          { key: 'balnarring', label: 'Balnarring', href: '/places/balnarring/' },
          { key: 'flinders',   label: 'Flinders',   href: '/places/flinders/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'cellar-shortlist', label: 'The cellar-door shortlist', href: '/journal/the-cellar-door-short-list/' },
          { key: 'chardonnay',       label: 'The Chardonnay case',       href: '/journal/the-chardonnay-case/' },
          { key: 'pinot-noir',       label: 'The Pinot benchmark',       href: '/wine/pinot-noir/' },
          { key: 'producer-trail',   label: 'The producer trail',        href: '/journal/?slug=the-producer-trail' },
          { key: 'all-wine',         label: 'Every winery we cover',     href: '/wine/' },
        ],
      },
    ],
    askLine: 'After the ones not on the booking apps? Ask PI →',
  },

  // 3. STAY -----------------------------------------------------------------
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
          { key: 'weekend',    label: 'A weekend',         href: '/escape/' },
          { key: 'kids',       label: 'With kids',         href: '/journal/the-peninsula-with-kids/' },
          { key: 'romantic',   label: 'Two of you',        href: '/journal/the-couples-weekend/' },
          { key: 'wellness',   label: 'Wellness weekend',  href: '/spa/' },
          { key: 'dog',        label: 'Dog friendly',      href: '/dog-friendly/' },
        ],
      },
      {
        eyebrow: 'By the room',
        items: [
          { key: 'hotels',   label: 'Hotels',          href: '/stay/?type=hotel' },
          { key: 'villas',   label: 'Villas & houses', href: '/stay/?type=villa' },
          { key: 'bnb',      label: 'B&Bs & cottages', href: '/stay/?type=bnb' },
          { key: 'glamping', label: 'Glamping',        href: '/stay/?type=glamping' },
          { key: 'spa',      label: 'Spa retreats',    href: '/spa/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'editors-stays', label: "Editor's stays",      href: '/stay/?featured=true' },
          { key: 'all-stay',      label: 'Every room we cover', href: '/stay/' },
        ],
      },
    ],
    askLine: 'Want the room that opens up on the cancellation list? Ask PI →',
  },

  // 4. EXPLORE --------------------------------------------------------------
  {
    key: 'explore',
    label: 'Explore',
    href: '/explore/',
    intro: "Every move on the Peninsula that isn't a meal or a bed.",
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
          { key: 'walks',     label: 'Walks',             href: '/walks/' },
          { key: 'beaches',   label: 'Beaches',           href: '/explore/?type=beach' },
          { key: 'lookouts',  label: 'Lookouts & drives', href: '/explore/?type=lookout' },
          { key: 'markets',   label: 'Markets',           href: '/explore/?type=market' },
          { key: 'galleries', label: 'Galleries',         href: '/explore/?type=gallery' },
          { key: 'on-water',  label: 'On the water',      href: '/boating/' },
        ],
      },
      {
        eyebrow: 'By the place',
        items: [
          { key: 'red-hill-ridge', label: 'Red Hill & ridge',     href: '/places/red-hill/' },
          { key: 'sorrento-cape',  label: 'Sorrento & cape',      href: '/places/sorrento/' },
          { key: 'mornington-bay', label: 'Mornington & bay',     href: '/places/mornington/' },
          { key: 'point-nepean',   label: 'Point Nepean',         href: '/places/point-nepean/' },
          { key: 'flinders-coast', label: 'Flinders & coast',     href: '/places/flinders/' },
          { key: 'all-places',     label: 'Every town we cover',  href: '/places/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'orientation', label: 'First-visit drive', href: '/journal/the-peninsula-orientation-drive/' },
          { key: 'rainy',       label: 'Rainy-day plans',   href: '/journal/the-rainy-day-peninsula-without-a-booking/' },
          { key: 'sunset',      label: 'Sunset moves',      href: '/journal/?slug=sunset-shortlist' },
          { key: 'water-guide', label: 'On the water guide', href: '/boating/' },
        ],
      },
    ],
    askLine: 'Want the walk only locals know? Ask PI →',
  },

  // 5. PLANS ----------------------------------------------------------------
  {
    key: 'escape',
    label: 'Plans',
    href: '/escape/',
    intro: 'Pre-shaped Peninsula days, by length, by guide, or by occasion.',
    rail: {
      eyebrow: "Editor's pick · Autumn '26",
      title: 'The Thermal Springs Weekend',
      verdict: "Hot springs without wasting the rest of the weekend. Two nights at a wine-country room, one long lunch, one steam.",
      image: '/images/sourced/article-couples-weekend-01.webp',
      imageAlt: 'A wellness weekend on the Peninsula',
      href: '/journal/the-thermal-springs-weekend/',
    },
    columns: [
      {
        eyebrow: 'By the shape',
        items: [
          { key: 'one-night', label: 'One night',         href: '/journal/the-one-night-escape/' },
          { key: 'weekend',   label: 'Two-day weekend',   href: '/escape/?length=weekend' },
          { key: 'long',      label: 'Long weekend',      href: '/escape/?length=long' },
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
          { key: 'wine-day',  label: 'Wine-tour day',      href: '/tour/?type=wine' },
          { key: 'springs',   label: 'Hot-springs day',    href: '/tour/?type=wellness' },
          { key: 'golf-day',  label: 'Golf day',           href: '/golf/' },
          { key: 'dolphin',   label: 'Dolphin swim day',   href: '/tour/?type=dolphin' },
        ],
      },
      {
        eyebrow: 'By the occasion',
        items: [
          { key: 'weddings',     label: 'Weddings',                  href: '/weddings/' },
          { key: 'corporate',    label: 'Corporate offsites',        href: '/corporate-events/' },
          { key: 'milestones',   label: 'Anniversaries & birthdays', href: '/escape/?occasion=milestone' },
          { key: 'group',        label: 'Group of six+',             href: '/escape/?group=six-plus' },
          { key: 'eoy',          label: 'End-of-year offsite',       href: '/corporate-events/?season=summer' },
        ],
      },
    ],
    askLine: 'Need the plan shaped around six adults on a Saturday? Ask PI →',
  },

  // 6. WHAT'S ON ------------------------------------------------------------
  {
    key: 'whats-on',
    label: "What's On",
    href: '/whats-on/',
    intro: 'The events calendar with an opinion attached, kids-graded, weather-flagged, worth-the-drive labelled.',
    topBanner: {
      text: "This weekend's calendar",
      ctaLabel: 'Read the dispatch →',
      ctaHref: '/whats-on/',
    },
    rail: {
      eyebrow: "Editor's pick this weekend",
      title: "Mornington Farmers' Market",
      verdict: "Saturday morning, Main Street. Get there before 9 or the Pinot vinegar from Quealy is gone. Park at the Pier.",
      image: '/images/sourced/article-picnic-01.webp',
      imageAlt: "Mornington Farmers' Market, Main Street",
      href: '/whats-on/mornington-farmers-market/',
      cta: 'See this week →',
    },
    columns: [
      {
        eyebrow: 'This weekend',
        items: [
          { key: 'pick-1', label: "Pick 1 (live)", href: '/whats-on/?lens=weekend-pick', live: true },
          { key: 'pick-2', label: "Pick 2 (live)", href: '/whats-on/?lens=weekend-pick', live: true },
          { key: 'pick-3', label: "Pick 3 (live)", href: '/whats-on/?lens=weekend-pick', live: true },
          { key: 'all-weekend', label: 'All this weekend →', href: '/whats-on/?when=this-weekend' },
        ],
      },
      {
        eyebrow: 'Coming up',
        items: [
          { key: 'next-weekend', label: 'Next weekend',  href: '/whats-on/?when=next-weekend' },
          { key: 'markets',      label: 'Markets',       href: '/whats-on/?category=market' },
          { key: 'festivals',    label: 'Festivals',     href: '/whats-on/?category=festival' },
          { key: 'long-weekend', label: 'Long weekends', href: '/whats-on/?when=long-weekend' },
          { key: 'seasonal',     label: 'Seasonal events', href: '/whats-on/?recurrence=seasonal' },
          { key: 'all-coming',   label: 'All upcoming →',  href: '/whats-on/' },
        ],
      },
      {
        eyebrow: 'By the mood',
        items: [
          { key: 'worth-drive',  label: 'Worth the drive',  href: '/whats-on/?lens=worth-the-drive' },
          { key: 'weather',      label: 'Weather-proof',    href: '/whats-on/?weather=proof' },
          { key: 'kids',         label: 'Kids welcome',     href: '/whats-on/?kids=easy' },
          { key: 'after-dark',   label: 'After dark',       href: '/whats-on/?lens=after-dark' },
          { key: 'long-lunch',   label: 'Long-lunch events', href: '/whats-on/?category=long-lunch' },
          { key: 'all-mood',     label: 'All moods →',      href: '/whats-on/' },
        ],
      },
    ],
    askLine: 'Need a Saturday plan that punishes nobody? Ask PI →',
  },

  // 7. JOURNAL --------------------------------------------------------------
  {
    key: 'journal',
    label: 'Journal',
    href: '/journal/',
    intro: 'Long reads, dispatches, and the Shortlist, every issue, every piece.',
    rail: {
      eyebrow: 'The cover · Vol 04',
      title: 'On the quiet authority of a good autumn',
      verdict: "The season the Peninsula stops performing. Vintage trucks finished, weekend crowds thinning, the producers finally with time.",
      image: '/images/sourced/place-red-hill-01.webp',
      imageAlt: 'Vine rows in late-season colour, Red Hill',
      href: '/journal/',
      cta: 'Read the cover →',
    },
    columns: [
      {
        eyebrow: 'By the format',
        items: [
          { key: 'cover',       label: 'The Cover',           href: '/journal/?format=cover' },
          { key: 'long-read',   label: 'Long reads',          href: '/journal/?format=long-read' },
          { key: 'shortlist',   label: 'The Shortlist',       href: '/journal/?format=shortlist' },
          { key: 'dispatch',    label: 'Weekend dispatch',    href: '/journal/?format=weekend-picker' },
          { key: 'editors-table', label: "Editor's Table",    href: '/journal/?format=editors-table' },
          { key: 'cellar-disp', label: 'Cellar-door dispatch', href: '/journal/?format=cellar-door-dispatch' },
        ],
      },
      {
        eyebrow: 'By the read',
        items: [
          { key: 'all-journal', label: 'Every issue, every piece', href: '/journal/' },
          { key: 'methodology', label: 'How we work',              href: '/methodology/' },
          { key: 'about',       label: 'About PI',                 href: '/about/' },
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
  subscribe: { key: 'subscribe', label: 'Get the dispatch',      href: '/newsletter/' },
  account:   { key: 'account',   label: 'Sign in / Save trip',   href: '/account/' },
  pass:      { key: 'pass',      label: 'The Pass',              href: '/preview-insider-plans/' },
};

/** ----------------------------------------------------------------------
 *  FOOTER (V4 reorganisation, 7 pillars + niche surfaces)
 * ---------------------------------------------------------------------- */

export const v4FooterDepartments: V4NavItem[] = [
  { key: 'eat',      label: 'Eat & Drink', href: '/eat/' },
  { key: 'wine',     label: 'Wine',        href: '/wine/' },
  { key: 'stay',     label: 'Stay',        href: '/stay/' },
  { key: 'explore',  label: 'Explore',     href: '/explore/' },
  { key: 'escape',   label: 'Plans',       href: '/escape/' },
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
  { key: 'about',       label: 'About',           href: '/about/' },
  { key: 'methodology', label: 'Methodology',     href: '/methodology/' },
  { key: 'partners',    label: 'Partner with us', href: '/partners/' },
  { key: 'pass',        label: 'The Pass',        href: '/preview-insider-plans/' },
  { key: 'newsletter',  label: 'The Dispatch',    href: '/newsletter/' },
  { key: 'contact',     label: 'Contact',         href: '/contact/' },
  { key: 'privacy',     label: 'Privacy',         href: '/privacy/' },
];
