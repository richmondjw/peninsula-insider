/**
 * Site-wide navigation source of truth.
 *
 * Components that render nav (Masthead, PillarNav, Footer, mobile nav) all
 * import from here so the lanes stay in sync. The pillars list extends the
 * core masthead nav with golf and spa, which are real top-level lanes but
 * intentionally not in the masthead's seven-slot row.
 *
 * Editorial visual design is preserved — these arrays are shaped to feed the
 * existing markup without changing it.
 */

export interface NavItem {
  /** Stable key used for `aria-current` matching against a page's section. */
  key: string;
  label: string;
  href: string;
  /** Short editorial sub-line, used by the homepage pillar grid. */
  sub?: string;
  /** SVG `<path>` body for the pillar icon, when rendered in PillarNav. */
  icon?: string;
  /** One-line editorial dek used by the homepage TOC variant of PillarNav. */
  dek?: string;
}

/**
 * The masthead row. Order is editorial: the five pillars first, then the
 * dispatch lane (What's On) and the Journal. Spa, Golf, and Tours live
 * in the mega-menu (`mastheadMoreNav`) under the trailing "More" trigger.
 *
 * The `more` item is rendered as a button with a dropdown panel rather than
 * a plain anchor; see `Masthead.astro` for the markup.
 */
export const mastheadNav: NavItem[] = [
  { key: 'quick-note', label: 'Quick Note',  href: '/quick-note' },
  { key: 'eat',        label: 'Eat & Drink', href: '/eat'        },
  { key: 'stay',       label: 'Stay',        href: '/stay'       },
  { key: 'wine',       label: 'Wine',        href: '/wine'       },
  { key: 'explore',    label: 'Explore',     href: '/explore'    },
  { key: 'escape',     label: 'Plans',       href: '/escape'     },
  { key: 'whats-on',   label: "What’s On", href: '/whats-on'  },
  { key: 'journal',    label: 'Journal',     href: '/journal'    },
];

/**
 * Mega-menu items for the "More" trigger in the masthead. These lanes are real
 * top-level sections that don't fit the seven-slot magazine row but are too
 * commercially important to live only in the footer. Order is editorial,
 * grouped loosely: experience-led first (Tours, Boating, Golf, Spa & Wellness,
 * Fishing), then audience/occasion (Dog Friendly, Weddings, Corporate).
 *
 * Keeping this list short (eight items) so the panel reads as a curated
 * set rather than a sitemap dump.
 */
export const mastheadMoreNav: NavItem[] = [
  { key: 'tour',             label: 'Tours',          href: '/tour/',             dek: 'Operator-led day trips and packages.' },
  { key: 'boating',          label: 'Boating',        href: '/boating/',          dek: 'Charters, hire, ramps, and tides.' },
  { key: 'golf',             label: 'Golf',           href: '/golf/',             dek: 'Courses on the cape.' },
  { key: 'spa',              label: 'Spa & Wellness', href: '/spa/',              dek: 'Hot springs, saunas, retreats.' },
  { key: 'fishing',          label: 'Fishing',        href: '/fishing/',          dek: 'Species, spots, charters.' },
  { key: 'dog-friendly',     label: 'Dog Friendly',   href: '/dog-friendly/',     dek: 'Where the whole family is welcome.' },
  { key: 'weddings',         label: 'Weddings',       href: '/weddings/',         dek: 'Venues for the day.' },
  { key: 'corporate-events', label: 'Corporate',      href: '/corporate-events/', dek: 'Offsites, retreats, end-of-year.' },
];

/**
 * Homepage pillar strip — nine tiles with sub-lines and icons. The first
 * five mirror the masthead pillars; Tours sits next to Escape (booking-led
 * companion to Escape's self-drive); What's On replaces Journal in this
 * view; Golf + Spa round out the lane set.
 */
export const pillarNav: NavItem[] = [
  {
    key: 'eat',
    href: '/eat',
    label: 'Eat & Drink',
    sub: 'Restaurants · Cellar Doors',
    dek: 'The dining rooms that justify the drive.',
    icon: `<path d="M8 2 L8 22 M8 2 C6 4 5 6 5 9 C5 11 6 12 8 12 M16 2 L16 9 M20 2 L20 9 M18 2 L18 9 M18 9 L18 22" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    key: 'stay',
    href: '/stay',
    label: 'Stay',
    sub: 'Hotels · Villas · Escapes',
    dek: 'Where to plant yourself for the weekend.',
    icon: `<path d="M3 11 L12 3 L21 11 M5 10 L5 20 L19 20 L19 10 M10 20 L10 14 L14 14 L14 20" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    key: 'wine',
    href: '/wine',
    label: 'Wine Country',
    sub: 'Wineries · Producers',
    dek: 'Walk-in cellar doors and appointment-only finds.',
    icon: `<path d="M7 3 L17 3 L16 10 C16 13 14 15 12 15 C10 15 8 13 8 10 Z M12 15 L12 20 M8 20 L16 20" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    key: 'explore',
    href: '/explore',
    label: 'Explore',
    sub: 'Walks · Beaches · Markets',
    dek: 'Coast paths, back-bay beaches, lookouts.',
    icon: `<circle cx="12" cy="12" r="9"/><path d="M12 3 L12 5 M12 19 L12 21 M3 12 L5 12 M19 12 L21 12 M14 10 L10 14 M10 10 L14 14" stroke-linecap="round"/>`,
  },
  {
    key: 'escape',
    href: '/escape',
    label: 'Plans',
    sub: 'Itineraries · Slow Travel',
    dek: 'Ready-made Peninsula days and weekends.',
    icon: `<path d="M2 20 L8 10 L12 15 L16 7 L22 20 Z M8 10 L10 13 M16 7 L14 11" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    key: 'tour',
    href: '/tour',
    label: 'Tours',
    sub: 'Operator-led Experiences',
    dek: 'Dolphin swims, vineyard runs, hot-spring shuttles.',
    icon: `<path d="M4 18 L20 18 L20 12 L16 12 L14 8 L10 8 L8 12 L4 12 Z M7 18 L7 20 M17 18 L17 20" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/>`,
  },
  {
    key: 'boating',
    href: '/boating',
    label: 'Boating',
    sub: 'Charters · Hire · Ramps',
    dek: 'Charters, hire, ramps, and the calendar of tides.',
    icon: `<path d="M3 17 L21 17 L19 21 L5 21 Z M5 17 L5 11 L19 11 L19 17 M12 11 L12 4 L17 11" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    key: 'whats-on',
    href: '/whats-on',
    label: "What’s On",
    sub: 'Weekend Picks · Events',
    dek: "This week's markets, openings, and festivals.",
    icon: `<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 9 L21 9 M8 3 L8 7 M16 3 L16 7 M7 13 L9 13 M12 13 L14 13 M17 13 L19 13 M7 17 L9 17 M12 17 L14 17" stroke-linecap="round"/>`,
  },
  {
    key: 'golf',
    href: '/golf',
    label: 'Golf',
    sub: 'Courses · Weekend Rounds',
    dek: 'Where to swing on the cape.',
    icon: `<path d="M6 3 L6 21 M6 4 L17 7 L6 10 M4 21 L8 21" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="1.2"/>`,
  },
  {
    key: 'spa',
    href: '/spa',
    label: 'Spa',
    sub: 'Hot Springs · Wellness',
    dek: 'Hot springs, steam, soak, and sauna country.',
    icon: `<path d="M4 20 L20 20 M6 17 L18 17 M5 17 C5 14 8 12 12 12 C16 12 19 14 19 17 M10 8 C10 7 11 6 11 5 C11 4 10 3 10 3 M14 9 C14 8 15 7 15 6 C15 5 14 4 14 4" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
];

/**
 * Footer "Sections" column. Mirrors the full lane set including spa, golf,
 * and the dispatch row, with trailing slashes on every href because the site
 * is configured `trailingSlash: 'always'`.
 */
export const footerSectionLinks: NavItem[] = [
  { key: 'eat',              label: 'Eat & Drink',     href: '/eat/' },
  { key: 'stay',             label: 'Stay',            href: '/stay/' },
  { key: 'wine',             label: 'Wine Country',    href: '/wine/' },
  { key: 'explore',          label: 'Explore',         href: '/explore/' },
  { key: 'golf',             label: 'Golf',            href: '/golf/' },
  { key: 'spa',              label: 'Spa & Wellness',  href: '/spa/' },
  { key: 'fishing',          label: 'Fishing',         href: '/fishing/' },
  { key: 'boating',          label: 'Boating',         href: '/boating/' },
  { key: 'escape',           label: 'Plans',           href: '/escape/' },
  { key: 'tour',             label: 'Tours',           href: '/tour/' },
  { key: 'tour-packages',    label: 'Tour Packages',   href: '/tour-packages/' },
  { key: 'whats-on',         label: "What's On",       href: '/whats-on/' },
  { key: 'journal',          label: 'Journal',         href: '/journal/' },
  { key: 'dog-friendly',     label: 'Dog Friendly',    href: '/dog-friendly/' },
  { key: 'weddings',         label: 'Weddings',        href: '/weddings/' },
  { key: 'corporate-events', label: 'Corporate',       href: '/corporate-events/' },
];

/**
 * Footer "About" column.
 */
export const footerAboutLinks: NavItem[] = [
  { key: 'about',       label: 'About',                href: '/about/' },
  { key: 'methodology', label: 'Methodology',          href: '/methodology/' },
  { key: 'map',         label: 'Map of the Peninsula', href: '/explore/map/' },
  { key: 'partners',    label: 'Partner with us',      href: '/partners/' },
  { key: 'contact',     label: 'Contact',              href: '/contact/' },
  { key: 'newsletter',  label: 'Newsletter',           href: '/newsletter/' },
  { key: 'privacy',     label: 'Privacy',              href: '/privacy/' },
  { key: 'cookies',     label: 'Cookie settings',      href: '#cookie-settings' },
];

/**
 * Curated set of place hubs to surface in the footer "Places" column. These
 * are the highest-intent place pages — the Footer can also load the live
 * places collection and merge in any others, but this list anchors the
 * editorial picks at the top.
 */
export const footerPlaceFeatured: ReadonlyArray<string> = [
  'red-hill',
  'sorrento',
  'flinders',
  'mornington',
  'portsea',
  'main-ridge',
  'mount-martha',
  'rye',
  'merricks',
  'balnarring',
  'dromana',
  'point-nepean',
];

/**
 * Build the footer "Places" column from the full places collection. Returns
 * the featured set first (in editorial order), then any additional published
 * places not already in the featured list, capped to keep the column short.
 *
 * Pass `places` from `getCollection('places')` so this stays a build-time
 * computation with no client JS.
 */
export function buildFooterPlaceLinks(
  places: Array<{ id?: string; slug?: string; data: { slug?: string; name: string; sitemapExclude?: boolean } }>,
  cap = 12,
): NavItem[] {
  const bySlug = new Map<string, { name: string }>();
  for (const p of places) {
    const slug = (p.data?.slug ?? p.slug ?? p.id ?? '').toString();
    if (!slug) continue;
    if (p.data?.sitemapExclude) continue;
    bySlug.set(slug, { name: p.data.name });
  }

  const ordered: NavItem[] = [];
  const seen = new Set<string>();

  for (const slug of footerPlaceFeatured) {
    const place = bySlug.get(slug);
    if (!place) continue;
    ordered.push({ key: slug, label: place.name, href: `/places/${slug}/` });
    seen.add(slug);
    if (ordered.length >= cap) break;
  }

  if (ordered.length < cap) {
    const extras: NavItem[] = [];
    for (const [slug, place] of bySlug) {
      if (seen.has(slug)) continue;
      extras.push({ key: slug, label: place.name, href: `/places/${slug}/` });
    }
    extras.sort((a, b) => a.label.localeCompare(b.label));
    for (const extra of extras) {
      if (ordered.length >= cap) break;
      ordered.push(extra);
    }
  }

  ordered.push({ key: 'all-places', label: 'All places', href: '/places/' });
  return ordered;
}
