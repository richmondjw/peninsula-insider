/**
 * V3 navigation source of truth.
 *
 * Five pillars, no overflow menu, three utility surfaces (Ask PI, What's On,
 * Subscribe). Designed against the V3 strategy doc: refuse the directory
 * sprawl, lead with reader intent.
 *
 * Pillar mega-panels carry three columns each: by intent (mood), by place
 * (geography), in voice (editorial entry-points). Capped at six items per
 * column so the panel reads as curation, not sitemap.
 *
 * Live URLs are kept where they exist; new sub-routes inside a pillar use
 * filter querystrings on the existing index pages so nothing 404s.
 */

export interface V3NavItem {
  key: string;
  label: string;
  href: string;
  /** Optional one-line dek for mobile + accessibility. */
  dek?: string;
}

export interface V3MegaColumn {
  /** Small caps eyebrow, e.g. "By the meal", "By the place", "In voice". */
  eyebrow: string;
  items: V3NavItem[];
}

export interface V3Pillar extends V3NavItem {
  /** Mega-panel columns. Three is the rhythm; two is allowed for narrower pillars. */
  columns: V3MegaColumn[];
  /** Hero image for the mega-panel left rail. */
  panelImage?: { src: string; alt: string };
}

export const v3Pillars: V3Pillar[] = [
  {
    key: 'eat',
    label: 'Eat & Drink',
    href: '/eat/',
    dek: 'Restaurants, cellar doors, cafes, bakeries.',
    panelImage: {
      src: '/images/sourced/article-long-lunch-01.webp',
      alt: 'A long lunch table on a Peninsula deck, late afternoon',
    },
    columns: [
      {
        eyebrow: 'By the meal',
        items: [
          { key: 'long-lunch',   label: 'Long lunch',     href: '/journal/the-long-lunch/' },
          { key: 'hatted',       label: 'Hatted dinner',  href: '/journal/three-italian-dinners/' },
          { key: 'breakfast',    label: 'Breakfast',      href: '/journal/breakfast-before-the-crowds/' },
          { key: 'cellar-door',  label: 'Cellar door',    href: '/journal/the-cellar-door-short-list/' },
          { key: 'cafe',         label: 'Cafe & bakery',  href: '/eat/?type=cafe' },
          { key: 'pantry',       label: 'Pantry & produce', href: '/journal/the-peninsula-pantry/' },
        ],
      },
      {
        eyebrow: 'By the place',
        items: [
          { key: 'red-hill',   label: 'Red Hill',     href: '/places/red-hill/' },
          { key: 'sorrento',   label: 'Sorrento',     href: '/places/sorrento/' },
          { key: 'flinders',   label: 'Flinders',     href: '/places/flinders/' },
          { key: 'mornington', label: 'Mornington',   href: '/places/mornington/' },
          { key: 'main-ridge', label: 'Main Ridge',   href: '/places/main-ridge/' },
          { key: 'merricks',   label: 'Merricks',     href: '/places/merricks/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'editors-table', label: "Editor's Table",      href: '/journal/?format=editors-table' },
          { key: 'shortlist',     label: 'The Shortlist',       href: '/journal/?format=shortlist' },
          { key: 'all-eat',       label: 'Every venue we cover', href: '/eat/' },
          { key: 'wine-hub',      label: 'Wine country guide',  href: '/wine/' },
        ],
      },
    ],
  },
  {
    key: 'stay',
    label: 'Stay',
    href: '/stay/',
    dek: 'Hotels, villas, cottages, glamping.',
    panelImage: {
      src: '/images/sourced/article-vineyard-villa-01.webp',
      alt: 'A vineyard villa at golden hour, Red Hill',
    },
    columns: [
      {
        eyebrow: 'By the trip',
        items: [
          { key: 'one-night',   label: 'One night',           href: '/journal/the-one-night-escape/' },
          { key: 'weekend',     label: 'A weekend',           href: '/plans/' },
          { key: 'family',      label: 'With kids',           href: '/journal/the-peninsula-with-kids/' },
          { key: 'romantic',    label: 'Two of you',          href: '/journal/the-couples-weekend/' },
          { key: 'wellness',    label: 'Wellness weekend',    href: '/journal/the-thermal-springs-weekend/' },
          { key: 'dog',         label: 'Dog friendly',        href: '/dog-friendly/' },
        ],
      },
      {
        eyebrow: 'By the room',
        items: [
          { key: 'hotels',     label: 'Hotels',          href: '/stay/?type=hotel' },
          { key: 'villas',     label: 'Villas & houses', href: '/stay/?type=villa' },
          { key: 'bnb',        label: 'B&Bs & cottages', href: '/stay/?type=bnb' },
          { key: 'glamping',   label: 'Glamping',        href: '/stay/?type=glamping' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'editors-rooms', label: "Editor's stays",       href: '/stay/?featured=true' },
          { key: 'all-stay',      label: 'Every room we cover',  href: '/stay/' },
        ],
      },
    ],
  },
  {
    key: 'explore',
    label: 'Explore',
    href: '/explore/',
    dek: 'Walks, beaches, towns, the back roads.',
    panelImage: {
      src: '/images/sourced/explore-hub-hero-01.webp',
      alt: 'A coast walk on the Peninsula back beaches',
    },
    columns: [
      {
        eyebrow: 'By the move',
        items: [
          { key: 'walks',     label: 'Walks',          href: '/walks/' },
          { key: 'beaches',   label: 'Beaches',        href: '/explore/?type=beach' },
          { key: 'lookouts',  label: 'Lookouts & drives', href: '/explore/?type=lookout' },
          { key: 'markets',   label: 'Markets',        href: '/explore/?type=market' },
          { key: 'galleries', label: 'Galleries',      href: '/explore/?type=gallery' },
          { key: 'on-water',  label: 'On the water',   href: '/boating/' },
        ],
      },
      {
        eyebrow: 'By the place',
        items: [
          { key: 'red-hill',     label: 'Red Hill & ridge',     href: '/places/red-hill/' },
          { key: 'sorrento',     label: 'Sorrento & cape',      href: '/places/sorrento/' },
          { key: 'mornington',   label: 'Mornington & bay',     href: '/places/mornington/' },
          { key: 'point-nepean', label: 'Point Nepean',         href: '/places/point-nepean/' },
          { key: 'flinders',     label: 'Flinders & coast',     href: '/places/flinders/' },
          { key: 'all-places',   label: 'Every town we cover',  href: '/places/' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'orientation', label: 'First-visit drive',     href: '/journal/the-peninsula-orientation-drive/' },
          { key: 'rainy',       label: "Rainy-day plans",       href: '/journal/the-rainy-day-peninsula-without-a-booking/' },
          { key: 'sunset',      label: 'Sunset moves',          href: '/journal/the-sunset-shortlist/' },
        ],
      },
    ],
  },
  {
    key: 'plans',
    label: 'Plans',
    href: '/plans/',
    dek: 'Pre-shaped weekends, itineraries, and guide-led days.',
    panelImage: {
      src: '/images/sourced/article-flinders-weekend-01.webp',
      alt: 'A shaped Peninsula weekend itinerary in Flinders',
    },
    columns: [
      {
        eyebrow: 'By the shape',
        items: [
          { key: 'one-night', label: 'One night',         href: '/journal/the-one-night-escape/' },
          { key: 'weekend',   label: 'Two-day weekend',   href: '/plans/?length=weekend' },
          { key: 'long',      label: 'Long weekend',      href: '/plans/?length=long' },
          { key: 'kids',      label: 'With kids',         href: '/journal/the-peninsula-with-kids/' },
          { key: 'wellness',  label: 'Wellness weekend',  href: '/journal/the-thermal-springs-weekend/' },
        ],
      },
      {
        eyebrow: 'Hand it to a guide',
        items: [
          { key: 'tours',     label: 'Operator tours',    href: '/tour/' },
          { key: 'packages',  label: 'Multi-day packages', href: '/tour-packages/' },
          { key: 'wine-day',  label: 'Wine-tour day',     href: '/tour/?type=wine' },
          { key: 'springs',   label: 'Hot-springs day',   href: '/tour/?type=wellness' },
        ],
      },
      {
        eyebrow: 'In voice',
        items: [
          { key: 'all-plans', label: 'Every plan we publish', href: '/plans/' },
          { key: 'all-tours', label: 'Every operator we trust', href: '/tour/' },
        ],
      },
    ],
  },
  {
    key: 'journal',
    label: 'Journal',
    href: '/journal/',
    dek: 'Long reads, dispatches, the Shortlist.',
    panelImage: {
      src: '/images/sourced/journal-hub-hero-01.webp',
      alt: 'The Peninsula Insider Journal',
    },
    columns: [
      {
        eyebrow: 'By the format',
        items: [
          { key: 'cover',       label: 'The Cover',          href: '/journal/?format=cover' },
          { key: 'long-read',   label: 'Long reads',         href: '/journal/?format=long-read' },
          { key: 'shortlist',   label: 'The Shortlist',      href: '/journal/?format=shortlist' },
          { key: 'dispatch',    label: 'Weekend dispatch',   href: '/journal/?format=weekend-picker' },
          { key: 'editors-table', label: "Editor's Table",   href: '/journal/?format=editors-table' },
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
  },
];

/** Utility surfaces that live alongside the five pillars but aren't pillars themselves. */
export const v3Utility = {
  ask:        { key: 'ask',        label: 'Ask PI',     href: '/ask/' },
  whatsOn:    { key: 'whats-on',   label: "What's On",  href: '/whats-on/' },
  subscribe:  { key: 'subscribe',  label: 'Subscribe',  href: '/newsletter/' },
  account:    { key: 'account',    label: 'Sign in',    href: '/account/' },
  pass:       { key: 'pass',       label: 'The Pass',   href: '/preview-insider-plans/' },
  search:     { key: 'search',     label: 'Search',     href: '/search/' },
};

/** Footer columns for the V3 colophon. Mirrors V2 footer departments but reorganised by V3 pillar. */
export const v3FooterDepartments: V3NavItem[] = [
  { key: 'eat',      label: 'Eat & Drink',  href: '/eat/' },
  { key: 'stay',     label: 'Stay',         href: '/stay/' },
  { key: 'explore',  label: 'Explore',      href: '/explore/' },
  { key: 'plans',    label: 'Plans',        href: '/plans/' },
  { key: 'journal',  label: 'Journal',      href: '/journal/' },
  { key: 'whats-on', label: "What's On",    href: '/whats-on/' },
  { key: 'ask',      label: 'Ask PI',       href: '/ask/' },
];

export const v3FooterAbout: V3NavItem[] = [
  { key: 'editorial-approach', label: 'Editorial Approach', href: '/editorial-approach/' },
  { key: 'partners',           label: 'Partner With Us',    href: '/partners/' },
  { key: 'contact',            label: 'Contact',            href: '/contact/' },
];
