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

export function titleize(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function placeLabel(place: any) {
  return titleize(String(place?.id ?? place ?? ''));
}

export function routeSlug(entry: any) {
  return entry.slug ?? entry.id ?? entry?.data?.slug ?? entry?.data?.id;
}
