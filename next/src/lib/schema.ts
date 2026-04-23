const SITE = 'https://peninsulainsider.com.au';

export function buildWinerySchema(data: any, slug: string) {
  const sameAs = [
    data.website,
    data.sameAs?.mpva,
    data.sameAs?.halliday,
  ].filter(Boolean);

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': ['Winery', 'LocalBusiness'],
    name: data.name,
    url: `${SITE}/wine/${slug}`,
    ...(data.signature || data.editorVerdict
      ? { description: data.signature ?? data.editorVerdict }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(data.heroImage?.src && !data.heroImage.src.includes('placeholder')
      ? { image: `${SITE}${data.heroImage.src}` }
      : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: data.address,
      addressRegion: 'VIC',
      addressCountry: 'AU',
    },
    ...(data.coordinates?.lat != null
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: data.coordinates.lat,
            longitude: data.coordinates.lng,
          },
        }
      : {}),
    areaServed: {
      '@type': 'Place',
      name: 'Mornington Peninsula wine region',
    },
    ...(data.phone ? { telephone: data.phone } : {}),
    ...(data.priceBand ? { priceRange: data.priceBand } : {}),
    knowsAbout: [
      'Pinot Noir',
      'Chardonnay',
      'Cool-climate winemaking',
      ...(data.wines?.keyVarieties ?? []),
    ],
  };

  if (data.visiting?.openingHours?.length) {
    schema.openingHoursSpecification = data.visiting.openingHours.map((h: any) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: Array.isArray(h.days) ? h.days : [h.days],
      opens: h.opens,
      closes: h.closes,
    }));
  }

  if (data.editorVerdict) {
    schema.review = {
      '@type': 'Review',
      author: { '@type': 'Organization', name: 'Peninsula Insider' },
      reviewBody: data.editorVerdict,
    };
  }

  return schema;
}

export function buildRestaurantSchema(data: any, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: data.restaurant.name,
    url: `${SITE}/wine/${slug}#restaurant`,
    ...(data.restaurant.cuisine ? { servesCuisine: data.restaurant.cuisine } : {}),
    ...(data.restaurant.priceRange ? { priceRange: data.restaurant.priceRange } : {}),
    address: data.address,
    containedInPlace: {
      '@type': 'Winery',
      name: data.name,
      url: `${SITE}/wine/${slug}`,
    },
    acceptsReservations: data.restaurant.reservations !== false,
  };
}

export function buildAccommodationSchema(data: any, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: data.accommodation.name,
    url: `${SITE}/wine/${slug}#accommodation`,
    containedInPlace: {
      '@type': 'Winery',
      name: data.name,
    },
  };
}

export function buildFaqSchema(faq: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; url?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function buildItemListSchema(
  name: string,
  description: string,
  url: string,
  items: Array<{ name: string; slug: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    url,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Winery',
        name: item.name,
        url: `${SITE}/wine/${item.slug}`,
      },
    })),
  };
}
