/**
 * /explore/plans/ - itinerary helpers (file kept named escape.ts for git history;
 * URL section migrated from /explore/plans/ to /explore/plans/ on 2026-05-10).
 *
 * Implements the conversion-vertical specs from peninsula_insider_escape_v1:
 *   - 7-axis taxonomy labels
 *   - anchor-stay 3-placement rule (hero CTA / day-N block / footer rail)
 *   - schema builders that wrap the generic ones in lib/schema.ts with the
 *     escape-specific shape (TouristTrip with day-by-day ItemList per day,
 *     CollectionPage+ItemList for hubs, FAQPage)
 *
 * Reference: escape_anatomy_spec.md, escape_taxonomy_spec.md, escape_schema_blocks.md
 */

import {
  absUrl,
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFaqSchema,
  buildItemListSchema,
  buildTouristTripSchema,
} from './schema';

// ─── Taxonomy labels ─────────────────────────────────────────────────────────

export const durationLabel: Record<string, string> = {
  'half-day':    'Half day',
  day:           'Day trip',
  'one-night':   'One night',
  weekend:       'Weekend (2 nights)',
  'three-night': 'Three nights',
  midweek:       'Midweek',
  week:          'A full week',
};

export const themeLabel: Record<string, string> = {
  wine:        'Wine',
  food:        'Food',
  'food+wine': 'Food & wine',
  wellness:    'Wellness',
  coastal:     'Coastal',
  hinterland:  'Hinterland',
  golf:        'Golf',
  wedding:     'Wedding',
  cultural:    'Cultural',
  adventure:   'Adventure',
  cycling:     'Cycling',
  surfing:     'Surfing',
  producer:    'Producer trail',
  garden:      'Gardens',
  general:     'General',
};

export const occasionLabel: Record<string, string> = {
  none:           '',
  birthday:       'Birthday',
  anniversary:    'Anniversary',
  proposal:       'Proposal',
  honeymoon:      'Honeymoon',
  babymoon:       'Babymoon',
  christmas:      'Christmas',
  'new-year':     'New Year',
  easter:         'Easter',
  'mothers-day':  "Mother's Day",
  'fathers-day':  "Father's Day",
  valentines:     "Valentine's",
  special:        'Special occasion',
  milestone:      'Milestone',
  reunion:        'Reunion',
  'work-retreat': 'Work retreat',
  'wedding-guest':'Wedding guest',
};

export const budgetLabel: Record<string, string> = {
  luxe:   'Luxe',
  mid:    'Mid-budget',
  budget: 'Budget',
  mixed:  'Flexible budget',
};

export const seasonLabel: Record<string, string> = {
  'year-round':       'Year-round',
  summer:             'Summer',
  autumn:             'Autumn',
  winter:             'Winter',
  spring:             'Spring',
  'christmas-period': 'Christmas period',
  'easter-period':    'Easter period',
  'school-holidays':  'School holidays',
  'whale-season':     'Whale season',
  rainy:              'Rainy day',
};

// Old-schema audience values map onto pack-shape audience labels for display.
export const audienceDisplay: Record<string, string> = {
  couple:   'Couples',
  couples:  'Couples',
  family:   'Family',
  friends:  'Friends',
  solo:     'Solo',
  locals:   'Locals',
  group:    'Group',
  'multi-gen': 'Multi-gen',
};

/**
 * Pack expects `duration` on every itinerary; legacy entries only carry
 * `lengthNights`. This derives the duration axis when it isn't set explicitly,
 * so the rest of the pipeline can rely on a single field.
 */
export function deriveDuration(data: any): string | undefined {
  if (data?.duration) return data.duration;
  const n = data?.lengthNights;
  if (n === undefined || n === null) return undefined;
  if (n === 0) return 'day';
  if (n === 1) return 'one-night';
  if (n === 2) return 'weekend';
  if (n === 3) return 'three-night';
  if (n >= 4 && n <= 6) return 'midweek';
  if (n >= 7) return 'week';
  return undefined;
}

// ─── Schema builders ─────────────────────────────────────────────────────────

interface SchemaItineraryDay {
  name: string;
  stops: Array<{
    name: string;
    path: string;
    stopType?: string;
  }>;
}

export interface ItinerarySchemaInput {
  /** Page slug under /explore/plans/ - drives canonical URL. */
  slug: string;
  title: string;
  description: string;
  audienceLabels?: string[];
  days: SchemaItineraryDay[];
  /** Anchor stay path (e.g. /stay/lindenderry/) for the conversion offer. */
  anchorStayPath?: string;
  budgetMinAud?: number;
  budgetMaxAud?: number;
  datePublished?: string;
  dateModified?: string;
  faq?: Array<{ question: string; answer: string }>;
}

/**
 * Returns the @graph for an itinerary detail page:
 *   TouristTrip + ItemList(days) (already merged inside buildTouristTripSchema)
 *   FAQPage (when faq provided)
 *   BreadcrumbList
 *
 * Caller emits each item as its own <script type="application/ld+json"> tag,
 * which is friendlier for validators than collapsing into a single @graph and
 * matches the existing convention elsewhere in the codebase.
 */
export function buildEscapeItinerarySchema(input: ItinerarySchemaInput) {
  const path = `/explore/plans/${input.slug}/`;

  const tripSchema = buildTouristTripSchema({
    name: input.title,
    path,
    description: input.description,
    touristType: input.audienceLabels?.length ? input.audienceLabels.join(', ') : undefined,
    days: input.days,
    offerUrl: input.anchorStayPath ? absUrl(input.anchorStayPath) : undefined,
    offerPriceAud:
      input.budgetMinAud && input.budgetMaxAud
        ? `${input.budgetMinAud}-${input.budgetMaxAud}`
        : undefined,
  });

  // Stamp dateModified on the trip so freshness signals match the on-page
  // "Last fact-verified" footer (escape_anatomy_spec.md §11).
  if (input.dateModified) {
    (tripSchema as Record<string, unknown>).dateModified = input.dateModified;
  }
  if (input.datePublished) {
    (tripSchema as Record<string, unknown>).datePublished = input.datePublished;
  }

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: absUrl('/') },
    { name: 'Plans', url: absUrl('/explore/plans/') },
    { name: input.title },
  ]);

  const faqSchema = input.faq?.length
    ? buildFaqSchema(input.faq.map((entry) => ({ q: entry.question, a: entry.answer })))
    : null;

  return { tripSchema, breadcrumbSchema, faqSchema };
}

export interface EscapeHubSchemaInput {
  /** Hub path under /explore/plans/ - e.g. /explore/plans/the-weekend-peninsula/ */
  path: string;
  name: string;
  description: string;
  dateModified: string;
  /** Itineraries surfaced on the hub, ordered from best to worst. */
  itineraries: Array<{
    slug: string;       // /explore/plans/{slug}/
    title: string;
    description?: string;
  }>;
  breadcrumbItems: Array<{ name: string; url?: string }>;
}

export function buildEscapeHubSchema(input: EscapeHubSchemaInput) {
  const collection = buildCollectionPageSchema({
    name: input.name,
    description: input.description,
    path: input.path,
    dateModified: input.dateModified,
  });

  const itemList = buildItemListSchema({
    name: input.name,
    description: input.description,
    listPath: input.path,
    items: input.itineraries.map((it) => ({
      name: it.title,
      path: `/explore/plans/${it.slug}/`,
      description: it.description,
      itemType: 'TouristTrip',
    })),
    orderDirection: 'Descending',
  });

  const breadcrumbs = buildBreadcrumbSchema(
    input.breadcrumbItems.map((item) => ({
      name: item.name,
      url: item.url ? absUrl(item.url) : undefined,
    }))
  );

  return { collection, itemList, breadcrumbs };
}
