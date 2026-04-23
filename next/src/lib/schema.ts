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
