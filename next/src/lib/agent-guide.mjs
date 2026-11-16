export const SITE = 'https://peninsulainsider.com.au';
export const agentDirectories = [
  { title: 'Eat', section: 'eat' },
  { title: 'Wine', section: 'wine' },
  { title: 'Stay', section: 'stay' },
  { title: 'Explore and plans', section: 'explore' },
  { title: 'Journal', section: 'journal' },
  { title: 'Events', section: 'whats-on' },
].map((directory) => ({ ...directory, href: `/agents/directories/${directory.section}.json`, htmlHref: `/agents/directories/${directory.section}-html.json` }));
export const agentRoutes = [
  { title: 'Events and dates', href: '/whats-on/upcoming.json', format: 'JSON', description: "Dated events, flexible experiences and offers. Read each item's date meaning, the feed window and any event status before answering.", companion: '/whats-on/', companionLabel: 'Browse What\'s On' },
  { title: 'Somewhere to eat', href: '/eat/', format: 'HTML', description: 'Find a place by the kind of visit, then follow its own page for the recommendation and practical details.' },
  { title: 'Wine and cellar doors', href: '/wine/', format: 'HTML', description: 'Keep estates, cellar doors and restaurants distinct, even when they share an address.' },
  { title: 'Somewhere to stay', href: '/stay/', format: 'HTML', description: 'Choose the setting and style of stay. Confirm availability and live prices with the operator.' },
  { title: 'A day or weekend plan', href: '/explore/plans/', format: 'HTML', description: 'A considered shape for a visit, with stops, pace and the details to check before setting out.' },
  { title: 'Walks and places to explore', href: '/explore/', format: 'HTML', description: 'Find walks, beaches and local experiences. Check official advice for changing conditions.' },
  { title: 'The stories behind a recommendation', href: '/journal/', format: 'HTML', description: 'Editorial context and local judgement. Keep opinion distinguishable from confirmed practical facts.' },
];
export const agentResources = [
  { title: 'Agent guide', href: '/agents/', description: 'Welcome, retrieval routes, field meanings, citation and permissions.' },
  { title: 'Formats and section indexes', href: '/agents/manifest.json', description: 'Choose a smaller section catalogue, read the format contract and find retry and caching guidance.' },
  { title: 'Latest representation changes', href: '/agents/changes.json', description: 'Added, changed and removed representations since the named prior snapshot. A removal alone does not establish a closure.' },
  { title: 'Compact page catalogue', href: '/agents/catalog.json', description: 'All sitemap pages, with canonical citations, Markdown links and content hashes.' },
  { title: 'Latest stories (RSS)', href: '/feed.xml', description: 'Recent published stories. Publication is not a new fact check.' },
  { title: 'Browse selected places and stories', href: '/site-index/', description: 'Editorial starting points by section; selected venue and story lists are not exhaustive.' },
  { title: 'Full URL directory', href: '/llms-full.txt', description: 'Sitemap-derived URLs, not full page content. Sitemap dates are not fact-check dates.' },
  { title: 'Sitemap', href: '/sitemap.xml', description: 'Canonical indexable pages for discovery.' },
  { title: 'About and editorial approach', href: '/about/', description: 'How the publication approaches recommendations and independence.' },
  { title: 'Corrections and contact', href: '/contact/?type=correction', description: 'Report the specific page and the detail that needs attention.' },
  { title: 'The Insider Note', href: '/dispatch/', description: 'Our newsletter.' },
  { title: 'Access and reuse terms', href: '/terms/', description: 'Read the permitted uses before collecting or reusing content.' },
];
export const agentCaveat = 'A publication date, sitemap date or new build does not mean every fact has been rechecked. If a source does not settle a detail, leave it unknown. Confirm time-sensitive details with the operator and cite the specific supporting page.';

export const agentDateGuidance = 'Use the timezone declared by the feed: Australia/Melbourne for Mornington Peninsula listings. Date-only values do not imply midnight. Read dateMeaning: occurrence is a dated event, availability is a flexible experience window, and validity is an offer window. A weekend availability date does not confirm a booked session. Read explicit weekend dates and any event status, then confirm current sessions, cancellations or changes with the organiser.';
