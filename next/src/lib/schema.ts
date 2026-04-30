const SITE = 'https://peninsulainsider.com.au';

// PI-EXP-045: interim publisher logo — same asset BaseLayout uses for Organization schema.
// Replace with /logo.png (≥112×112px square) once a proper logo asset is created.
export const PUBLISHER_LOGO_URL = `${SITE}/images/sourced/home-cover.webp`;

// Always returns an absolute URL with a trailing slash.
// File URLs (.png, .webp, .jpg) are intentionally excluded by callers.
export const absUrl = (path: string): string => {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  const withSlash = normalised.endsWith('/') ? normalised : `${normalised}/`;
  return `${SITE}${withSlash}`;
};

const PENINSULA_PLACE = {
  '@type': 'Place',
  name: 'Mornington Peninsula',
  address: {
    '@type': 'PostalAddress',
    addressRegion: 'Victoria',
    addressCountry: 'AU',
  },
} as const;

export function buildWinerySchema(data: any, slug: string, section = 'wine') {
  const sameAs = [
    data.website,
    data.sameAs?.mpva,
    data.sameAs?.halliday,
  ].filter(Boolean);

  const pageUrl = absUrl(`/${section}/${slug}`);

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': ['Winery', 'LocalBusiness'],
    name: data.name,
    url: pageUrl,
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

export function buildRestaurantSchema(data: any, slug: string, section = 'wine') {
  const pageUrl = absUrl(`/${section}/${slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: data.restaurant.name,
    url: `${pageUrl}#restaurant`,
    ...(data.restaurant.cuisine ? { servesCuisine: data.restaurant.cuisine } : {}),
    ...(data.restaurant.priceRange ? { priceRange: data.restaurant.priceRange } : {}),
    address: data.address,
    containedInPlace: {
      '@type': 'Winery',
      name: data.name,
      url: pageUrl,
    },
    acceptsReservations: data.restaurant.reservations !== false,
  };
}

export function buildAccommodationSchema(data: any, slug: string, section = 'wine') {
  const pageUrl = absUrl(`/${section}/${slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: data.accommodation.name,
    url: `${pageUrl}#accommodation`,
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

// ─── ItemList ────────────────────────────────────────────────────────────────

type OrderDirection = 'Ascending' | 'Descending';

interface ItemListItem {
  name: string;
  path: string;            // relative path, e.g. '/explore/sorrento-back-beach'
  description?: string;
  itemType?: string;       // e.g. 'TouristAttraction', 'Beach', 'Winery'. Defaults to 'Thing'.
  addressLocality?: string;
}

interface BuildItemListInput {
  name: string;
  description?: string;
  listPath: string;        // relative path of the list page itself
  items: ItemListItem[];
  orderDirection?: OrderDirection; // default 'Descending': position 1 = best/top pick
}

export const buildItemListSchema = ({
  name,
  description,
  listPath,
  items,
  orderDirection = 'Descending',
}: BuildItemListInput) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  description,
  url: absUrl(listPath),
  numberOfItems: items.length,
  itemListOrder: `https://schema.org/ItemListOrder${orderDirection}`,
  itemListElement: items.map((it, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    item: {
      '@type': it.itemType ?? 'Thing',
      name: it.name,
      url: absUrl(it.path),
      ...(it.description ? { description: it.description } : {}),
      ...(it.addressLocality
        ? {
            address: {
              '@type': 'PostalAddress',
              addressLocality: it.addressLocality,
              addressRegion: 'VIC',
              addressCountry: 'AU',
            },
          }
        : {}),
    },
  })),
});

// ─── CollectionPage ──────────────────────────────────────────────────────────

interface BuildCollectionPageInput {
  name: string;
  description: string;
  path: string;         // relative canonical path
  dateModified: string; // ISO 8601
}

export const buildCollectionPageSchema = ({
  name,
  description,
  path,
  dateModified,
}: BuildCollectionPageInput) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name,
  description,
  url: absUrl(path),
  inLanguage: 'en-AU',
  isPartOf: {
    '@type': 'WebSite',
    name: 'Peninsula Insider',
    url: absUrl('/'),
  },
  about: PENINSULA_PLACE,
  dateModified,
});

// ─── TouristDestination (for /places/[slug]/) ─────────────────────────────────

interface BuildTouristDestinationInput {
  name: string;
  path: string;
  description: string;
  touristTypes?: string[];
  includesAttractions?: Array<{ name: string; path: string }>;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
}

export const buildTouristDestinationSchema = ({
  name,
  path,
  description,
  touristTypes,
  includesAttractions,
  postalCode,
  latitude,
  longitude,
}: BuildTouristDestinationInput) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristDestination',
  name,
  url: absUrl(path),
  description,
  ...(touristTypes ? { touristType: touristTypes } : {}),
  ...(includesAttractions && includesAttractions.length
    ? {
        includesAttraction: includesAttractions.map((a) => ({
          '@type': 'TouristAttraction',
          name: a.name,
          url: absUrl(a.path),
        })),
      }
    : {}),
  address: {
    '@type': 'PostalAddress',
    addressLocality: name,
    addressRegion: 'Victoria',
    ...(postalCode ? { postalCode } : {}),
    addressCountry: 'AU',
  },
  ...(latitude && longitude
    ? { geo: { '@type': 'GeoCoordinates', latitude, longitude } }
    : {}),
});

// ─── TouristAttraction (for /explore/[entity]/) ───────────────────────────────

type AttractionSubtype =
  | 'Beach'
  | 'GolfCourse'
  | 'LandmarksOrHistoricalBuildings'
  | 'SportsActivityLocation'
  | null;

interface BuildTouristAttractionInput {
  name: string;
  path: string;
  description: string;
  subtype?: AttractionSubtype;
  streetAddress?: string;
  addressLocality: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  isAccessibleForFree?: boolean;
  touristTypes?: string[];
  amenities?: Array<{ name: string; value: boolean }>;
}

export const buildTouristAttractionSchema = ({
  name,
  path,
  description,
  subtype,
  streetAddress,
  addressLocality,
  postalCode,
  latitude,
  longitude,
  isAccessibleForFree,
  touristTypes,
  amenities,
}: BuildTouristAttractionInput) => ({
  '@context': 'https://schema.org',
  '@type': subtype ? ['TouristAttraction', subtype] : 'TouristAttraction',
  name,
  url: absUrl(path),
  description,
  address: {
    '@type': 'PostalAddress',
    ...(streetAddress ? { streetAddress } : {}),
    addressLocality,
    addressRegion: 'VIC',
    ...(postalCode ? { postalCode } : {}),
    addressCountry: 'AU',
  },
  ...(latitude && longitude
    ? { geo: { '@type': 'GeoCoordinates', latitude, longitude } }
    : {}),
  ...(typeof isAccessibleForFree === 'boolean' ? { isAccessibleForFree } : {}),
  ...(touristTypes ? { touristType: touristTypes } : {}),
  ...(amenities && amenities.length
    ? {
        amenityFeature: amenities.map((a) => ({
          '@type': 'LocationFeatureSpecification',
          name: a.name,
          value: a.value,
        })),
      }
    : {}),
});

// ─── TouristTrip (for /escape/[package]/ and itinerary articles) ──────────────

interface TripStop {
  name: string;
  path: string;
  stopType?: string; // e.g. 'TouristAttraction', 'FoodEstablishment', 'LodgingBusiness'
}

interface TripDay {
  name: string;      // e.g. 'Day 1 — Red Hill'
  stops: TripStop[];
}

interface BuildTouristTripInput {
  name: string;
  path: string;
  description: string;
  touristType?: string;       // e.g. 'Couples'
  days: TripDay[];
  offerUrl?: string;          // booking / stay URL
  offerPriceAud?: string;     // indicative total in AUD
}

export const buildTouristTripSchema = ({
  name,
  path,
  description,
  touristType,
  days,
  offerUrl,
  offerPriceAud,
}: BuildTouristTripInput) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristTrip',
  name,
  url: absUrl(path),
  description,
  ...(touristType ? { touristType } : {}),
  itinerary: days.map((day) => ({
    '@type': 'ItemList',
    name: day.name,
    // Days are chronological, not ranked — Ascending is correct here.
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: day.stops.map((stop, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': stop.stopType ?? 'TouristAttraction',
        name: stop.name,
        url: absUrl(stop.path),
      },
    })),
  })),
  ...(offerUrl
    ? {
        offers: {
          '@type': 'Offer',
          url: offerUrl,
          priceCurrency: 'AUD',
          ...(offerPriceAud ? { price: offerPriceAud } : {}),
        },
      }
    : {}),
});

// ─── Tour vertical schema builders ───────────────────────────────────────────

const TOUR_SITE = 'https://peninsulainsider.com.au';

export function buildTourSchema(tour: any, operatorData: any) {
  const pageUrl = absUrl(`/tour/${tour.slug}`);
  const graph: any[] = [
    {
      '@type': ['TouristTrip', 'Service'],
      '@id': `${pageUrl}#TouristTrip`,
      name: tour.name,
      description: tour.intro,
      url: pageUrl,
      serviceType: 'Tour',
      ...(tour.durationHours ? { duration: `PT${tour.durationHours}H` } : {}),
      ...(tour.heroImage?.src ? { image: `${TOUR_SITE}${tour.heroImage.src}` } : {}),
      touristType: [tour.audience, ...(tour.theme || [])].filter(Boolean),
      availableLanguage: tour.languages || ['en'],
      provider: {
        '@type': 'LocalBusiness',
        '@id': absUrl(`/tour/operators/${tour.operatorSlug}`) + '#LocalBusiness',
        name: operatorData?.name || tour.operatorSlug,
        url: operatorData?.website || undefined,
      },
      ...(tour.bookingUrl || tour.aggregatorGYG ? {
        offers: {
          '@type': 'Offer',
          '@id': `${pageUrl}#Offer`,
          url: `${tour.bookingUrl || tour.aggregatorGYG}&utm_source=peninsula-insider&utm_medium=tour-vertical&utm_campaign=${tour.slug}&utm_content=hero`,
          priceCurrency: 'AUD',
          ...(tour.priceLow ? { price: String(tour.priceLow) } : { price: '0', description: 'Contact operator for pricing' }),
          ...(tour.priceLow && tour.priceHigh && tour.priceLow !== tour.priceHigh ? {
            priceSpecification: { '@type': 'PriceSpecification', minPrice: tour.priceLow, maxPrice: tour.priceHigh, priceCurrency: 'AUD' }
          } : {}),
          availability: 'https://schema.org/InStock',
          validFrom: tour.lastVerified,
          validThrough: new Date(new Date(tour.lastVerified).getTime() + 365*24*60*60*1000).toISOString().split('T')[0],
          seller: { '@type': 'LocalBusiness', name: operatorData?.name || tour.operatorSlug, url: operatorData?.website || '' },
        }
      } : {}),
      areaServed: { '@type': 'GeoShape', name: 'Mornington Peninsula' },
    },
  ];
  if (tour.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#FAQPage`,
      mainEntity: tour.faq.map((f: any) => ({
        '@type': 'Question', name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#BreadcrumbList`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Tours', item: absUrl('/tour/') },
      { '@type': 'ListItem', position: 3, name: tour.name, item: pageUrl },
    ],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildTourPackageSchema(pkg: any, componentToursData: any[]) {
  const pageUrl = absUrl(`/tour-packages/${pkg.slug}`);
  const graph: any[] = [
    {
      '@type': 'TouristTrip',
      '@id': `${pageUrl}#TouristTrip`,
      name: pkg.name,
      description: pkg.intro,
      url: pageUrl,
      ...(pkg.heroImage?.src ? { image: `${TOUR_SITE}${pkg.heroImage.src}` } : {}),
      ...(pkg.anchorStaySlug ? {
        locationCreatedIn: {
          '@type': 'LodgingBusiness',
          '@id': absUrl(`/stay/${pkg.anchorStaySlug}`) + '#LodgingBusiness',
          name: pkg.anchorStaySlug.replace(/-/g, ' '),
          url: absUrl(`/stay/${pkg.anchorStaySlug}`),
        }
      } : {}),
      subTrip: (pkg.componentTourSlugs || []).map((slug: string) => ({
        '@type': 'TouristTrip',
        '@id': absUrl(`/tour/${slug}`) + '#TouristTrip',
        name: componentToursData.find((t: any) => t.slug === slug)?.name || slug,
        url: absUrl(`/tour/${slug}`),
      })),
      ...(pkg.priceLow != null ? {
        offers: {
          '@type': 'AggregateOffer',
          '@id': `${pageUrl}#AggregateOffer`,
          lowPrice: String(pkg.priceLow),
          highPrice: String(pkg.priceHigh || pkg.priceLow),
          priceCurrency: 'AUD',
          offerCount: (pkg.componentTourSlugs || []).length,
        }
      } : {}),
    },
  ];
  if (pkg.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#FAQPage`,
      mainEntity: pkg.faq.map((f: any) => ({
        '@type': 'Question', name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#BreadcrumbList`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Tour Packages', item: absUrl('/tour-packages/') },
      { '@type': 'ListItem', position: 3, name: pkg.name, item: pageUrl },
    ],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildOperatorProfileSchema(operator: any, toursList: any[]) {
  const pageUrl = absUrl(`/tour/operators/${operator.slug}`);
  const graph: any[] = [
    {
      '@type': 'LocalBusiness',
      '@id': `${pageUrl}#LocalBusiness`,
      name: operator.name,
      url: operator.website || pageUrl,
      ...(operator.phone ? { telephone: operator.phone } : {}),
      ...(operator.languages ? { knowsLanguage: operator.languages } : {}),
      areaServed: { '@type': 'GeoShape', name: 'Mornington Peninsula' },
      currenciesAccepted: 'AUD',
    },
    {
      '@type': 'ItemList',
      '@id': `${pageUrl}#ItemList`,
      name: `Tours by ${operator.name}`,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: toursList.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'TouristTrip',
          '@id': absUrl(`/tour/${t.slug}`) + '#TouristTrip',
          name: t.name,
          url: absUrl(`/tour/${t.slug}`),
        },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#BreadcrumbList`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Tours', item: absUrl('/tour/') },
        { '@type': 'ListItem', position: 3, name: 'Operators', item: absUrl('/tour/operators/') },
        { '@type': 'ListItem', position: 4, name: operator.name, item: pageUrl },
      ],
    },
  ];
  return { '@context': 'https://schema.org', '@graph': graph };
}

// ─── Article (for /journal/ and /explore/ utility pages) ─────────────────────

interface BuildArticleInput {
  headline: string;
  description: string;
  path: string;
  datePublished: string;    // ISO 8601
  dateModified: string;     // ISO 8601 — match the on-page "Last fact-verified" stamp
  imageUrl: string;         // absolute URL to hero image
  publisherLogoUrl: string; // absolute URL; see PI-EXP-045 for logo asset decision
  articleSection?: string;  // e.g. 'Planning', 'Seasonal'
}

export const buildArticleSchema = ({
  headline,
  description,
  path,
  datePublished,
  dateModified,
  imageUrl,
  publisherLogoUrl,
  articleSection,
}: BuildArticleInput) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline,
  description,
  url: absUrl(path),
  mainEntityOfPage: absUrl(path),
  datePublished,
  dateModified,
  author: { '@type': 'Organization', name: 'Peninsula Insider' },
  publisher: {
    '@type': 'Organization',
    name: 'Peninsula Insider',
    url: absUrl('/'),
    logo: { '@type': 'ImageObject', url: publisherLogoUrl },
  },
  image: imageUrl,
  ...(articleSection ? { articleSection } : {}),
  about: {
    '@type': 'Place',
    name: 'Mornington Peninsula, Victoria, Australia',
  },
});

// ─── Boating + Fishing vertical schema builders ──────────────────────────────
//
// Source: peninsula_insider_boating_fishing_v1 — bf_schema_blocks.md.
// Six builders: species, fishing-location, charter-operator, boat-hire,
// boat-ramp, hub. All emit @graph nodes with stable @id = {url}#{Type}.
// No Review or AggregateRating (ACCC + authorship integrity).
// No Product (publisher/operator/traveller three-party model).

const REGION_LABEL: Record<string, string> = {
  'port-phillip-bay': 'Port Phillip Bay',
  'western-port': 'Western Port',
  'bass-strait-fringe': 'Bass Strait fringe',
};

export function buildSpeciesPageSchema(s: any) {
  const pageUrl = absUrl(`/fishing/species/${s.slug}/`);
  const graph: any[] = [
    {
      '@type': 'Article',
      '@id': `${pageUrl}#Article`,
      headline: `${s.commonName} on the Mornington Peninsula`,
      description: s.intro,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      datePublished: s.publishedAt,
      dateModified: s.lastVerified,
      author: { '@type': 'Organization', name: 'Peninsula Insider', url: absUrl('/') },
      publisher: {
        '@type': 'Organization',
        name: 'Peninsula Insider',
        url: absUrl('/'),
        logo: { '@type': 'ImageObject', url: PUBLISHER_LOGO_URL },
      },
      ...(s.heroImage?.src ? { image: `${SITE}${s.heroImage.src}` } : {}),
      about: {
        '@type': 'Thing',
        name: s.commonName,
        alternateName: [s.scientificName, ...(s.aliases ?? [])],
      },
      isBasedOn: s.vfaCitationUrl,
      articleSection: 'Fishing',
    },
  ];
  if (s.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#FAQPage`,
      mainEntity: s.faq.map((f: any) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#BreadcrumbList`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Fishing', item: absUrl('/fishing/') },
      { '@type': 'ListItem', position: 3, name: 'Species', item: absUrl('/fishing/species/') },
      { '@type': 'ListItem', position: 4, name: s.commonName, item: pageUrl },
    ],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildFishingLocationSchema(loc: any) {
  const pageUrl = absUrl(`/fishing/locations/${loc.slug}/`);
  const graph: any[] = [
    {
      '@type': 'Place',
      '@id': `${pageUrl}#Place`,
      name: loc.name,
      url: pageUrl,
      description: loc.intro,
      ...(loc.coordinates?.lat != null
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: loc.coordinates.lat,
              longitude: loc.coordinates.lng,
            },
          }
        : {}),
      containedInPlace: {
        '@type': 'Place',
        name: REGION_LABEL[loc.region] ?? loc.region,
      },
      ...(loc.heroImage?.src ? { image: `${SITE}${loc.heroImage.src}` } : {}),
    },
    {
      '@type': 'Article',
      '@id': `${pageUrl}#Article`,
      headline: loc.name,
      description: loc.intro,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      datePublished: loc.publishedAt,
      dateModified: loc.lastVerified,
      author: { '@type': 'Organization', name: 'Peninsula Insider', url: absUrl('/') },
      publisher: {
        '@type': 'Organization',
        name: 'Peninsula Insider',
        url: absUrl('/'),
        logo: { '@type': 'ImageObject', url: PUBLISHER_LOGO_URL },
      },
      articleSection: 'Fishing',
    },
  ];
  if (loc.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#FAQPage`,
      mainEntity: loc.faq.map((f: any) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#BreadcrumbList`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Fishing', item: absUrl('/fishing/') },
      { '@type': 'ListItem', position: 3, name: 'Locations', item: absUrl('/fishing/locations/') },
      { '@type': 'ListItem', position: 4, name: loc.name, item: pageUrl },
    ],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildCharterOperatorSchema(c: any) {
  const pageUrl = absUrl(`/fishing/charters/${c.slug}/`);
  const services = (c.targetSpecies ?? []).map((sp: string) => ({
    '@type': 'Service',
    name: `${sp.replace(/-/g, ' ')} fishing charter`,
    provider: { '@id': `${pageUrl}#LocalBusiness` },
    areaServed: { '@type': 'GeoShape', name: 'Mornington Peninsula' },
  }));
  const graph: any[] = [
    {
      '@type': ['LocalBusiness', 'TouristInformationCenter'],
      '@id': `${pageUrl}#LocalBusiness`,
      name: c.name,
      url: c.operatorWebsite ?? pageUrl,
      description: c.intro,
      ...(c.heroImage?.src ? { image: `${SITE}${c.heroImage.src}` } : {}),
      areaServed: { '@type': 'GeoShape', name: 'Mornington Peninsula' },
      ...(c.priceLow != null
        ? {
            priceRange:
              c.priceHigh != null && c.priceHigh !== c.priceLow
                ? `from $${c.priceLow}`
                : `$${c.priceLow}`,
          }
        : {}),
      currenciesAccepted: 'AUD',
    },
  ];
  if (services.length) {
    graph.push({
      '@type': 'OfferCatalog',
      '@id': `${pageUrl}#OfferCatalog`,
      name: `Fishing charters by ${c.name}`,
      itemListElement: services.map((svc: any, i: number) => ({
        '@type': 'Offer',
        position: i + 1,
        itemOffered: svc,
        ...(c.affiliateUrl ? { url: c.affiliateUrl } : {}),
        priceCurrency: 'AUD',
        ...(c.priceLow != null ? { price: String(c.priceLow) } : {}),
      })),
    });
  }
  if (c.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#FAQPage`,
      mainEntity: c.faq.map((f: any) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#BreadcrumbList`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Fishing', item: absUrl('/fishing/') },
      { '@type': 'ListItem', position: 3, name: 'Charters', item: absUrl('/fishing/charters/') },
      { '@type': 'ListItem', position: 4, name: c.name, item: pageUrl },
    ],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildBoatHireOperatorSchema(h: any) {
  const pageUrl = absUrl(`/boating/hire/${h.slug}/`);
  const graph: any[] = [
    {
      '@type': ['LocalBusiness', 'TouristInformationCenter'],
      '@id': `${pageUrl}#LocalBusiness`,
      name: h.name,
      url: h.operatorWebsite ?? pageUrl,
      description: h.intro,
      ...(h.heroImage?.src ? { image: `${SITE}${h.heroImage.src}` } : {}),
      areaServed: { '@type': 'GeoShape', name: 'Mornington Peninsula' },
      ...(h.priceLow != null ? { priceRange: `from $${h.priceLow}` } : {}),
      currenciesAccepted: 'AUD',
    },
  ];
  if (h.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#FAQPage`,
      mainEntity: h.faq.map((f: any) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#BreadcrumbList`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Boating', item: absUrl('/boating/') },
      { '@type': 'ListItem', position: 3, name: 'Boat hire', item: absUrl('/boating/hire/') },
      { '@type': 'ListItem', position: 4, name: h.name, item: pageUrl },
    ],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildBoatRampSchema(r: any) {
  const pageUrl = absUrl(`/boating/ramps/${r.slug}/`);
  const amenities: any[] = [];
  if (r.laneCount != null) amenities.push({ name: 'Launch lanes', value: String(r.laneCount) });
  if (r.surface) amenities.push({ name: 'Surface', value: r.surface });
  if (r.tideDependence) amenities.push({ name: 'Tide dependence', value: r.tideDependence });
  if (r.fee) amenities.push({ name: 'Fee', value: r.fee });

  const graph: any[] = [
    {
      '@type': 'Place',
      '@id': `${pageUrl}#Place`,
      name: r.name,
      url: pageUrl,
      description: r.intro,
      ...(r.coordinates?.lat != null
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: r.coordinates.lat,
              longitude: r.coordinates.lng,
            },
          }
        : {}),
      containedInPlace: {
        '@type': 'Place',
        name: REGION_LABEL[r.region] ?? r.region,
      },
      ...(amenities.length
        ? {
            amenityFeature: amenities.map((a) => ({
              '@type': 'LocationFeatureSpecification',
              name: a.name,
              value: a.value,
            })),
          }
        : {}),
      ...(r.heroImage?.src ? { image: `${SITE}${r.heroImage.src}` } : {}),
    },
    {
      '@type': 'Article',
      '@id': `${pageUrl}#Article`,
      headline: r.name,
      description: r.intro,
      url: pageUrl,
      mainEntityOfPage: pageUrl,
      datePublished: r.publishedAt,
      dateModified: r.lastVerified,
      author: { '@type': 'Organization', name: 'Peninsula Insider', url: absUrl('/') },
      publisher: {
        '@type': 'Organization',
        name: 'Peninsula Insider',
        url: absUrl('/'),
        logo: { '@type': 'ImageObject', url: PUBLISHER_LOGO_URL },
      },
      articleSection: 'Boating',
    },
  ];
  if (r.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#FAQPage`,
      mainEntity: r.faq.map((f: any) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#BreadcrumbList`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Boating', item: absUrl('/boating/') },
      { '@type': 'ListItem', position: 3, name: 'Boat ramps', item: absUrl('/boating/ramps/') },
      { '@type': 'ListItem', position: 4, name: r.name, item: pageUrl },
    ],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

interface BuildBfHubInput {
  name: string;
  description: string;
  path: string;
  dateModified: string;
  breadcrumbs: Array<{ name: string; path?: string }>;
  items: Array<{ name: string; path: string; description?: string; itemType?: string }>;
}

export function buildBfHubSchema({
  name,
  description,
  path,
  dateModified,
  breadcrumbs,
  items,
}: BuildBfHubInput) {
  const pageUrl = absUrl(path);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#CollectionPage`,
        name,
        description,
        url: pageUrl,
        inLanguage: 'en-AU',
        about: PENINSULA_PLACE,
        dateModified,
        isPartOf: { '@type': 'WebSite', name: 'Peninsula Insider', url: absUrl('/') },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#ItemList`,
        name,
        numberOfItems: items.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: items.map((it, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': it.itemType ?? 'Thing',
            name: it.name,
            url: absUrl(it.path),
            ...(it.description ? { description: it.description } : {}),
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#BreadcrumbList`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          ...(b.path ? { item: absUrl(b.path) } : { item: pageUrl }),
        })),
      },
    ],
  };
}
