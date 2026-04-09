export const formatLabel: Record<string, string> = {
  'editors-letter': 'Editor\'s Letter',
  'long-lunch-list': 'Long Lunch List',
  'cellar-door-dispatch': 'Cellar Door Dispatch',
  'stay-notes': 'Stay Notes',
  'slow-peninsula': 'Slow Peninsula',
  'insider-edit': 'Insider Edit',
  interview: 'Interview',
  investigation: 'Investigation',
  service: 'Service',
};

export const typeLabel: Record<string, string> = {
  restaurant: 'Restaurant',
  winery: 'Winery',
  cafe: 'Café',
  bakery: 'Bakery',
  pub: 'Pub',
  brewery: 'Brewery',
  distillery: 'Distillery',
  producer: 'Producer',
  market: 'Market',
  hotel: 'Hotel',
  villa: 'Villa',
  cottage: 'Cottage',
  glamping: 'Glamping',
  'farm-stay': 'Farm Stay',
  spa: 'Spa',
};

export const stayTypes = ['hotel', 'villa', 'cottage', 'glamping', 'farm-stay', 'spa'];
export const wineTypes = ['winery', 'producer', 'brewery', 'distillery'];
export const eatTypes = ['restaurant', 'cafe', 'bakery', 'pub', 'market', 'winery'];

export function titleize(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function placeLabel(place: any) {
  return titleize(String(place?.id ?? place ?? ''));
}

export function venueHrefPrefix(type: string) {
  if (stayTypes.includes(type)) return '/stay';
  if (wineTypes.includes(type)) return '/wine';
  return '/eat';
}

export function routeSlug(entry: any) {
  return entry.slug ?? entry.id ?? entry?.data?.slug ?? entry?.data?.id;
}
