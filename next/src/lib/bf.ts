/**
 * Boating + Fishing vertical helpers.
 *
 * Source of truth: peninsula_insider_boating_fishing_v1 pack (30 Apr 2026) - * specifically bf_measurement_spec.md (events), bf_affiliate_economics.md
 * (UTM scheme), bf_taxonomy_spec.md (region labels and slug rules).
 *
 * Imported by /fishing/ and /boating/ pages and components. Stays a pure
 * module - no Astro or component imports - so it can also be loaded from
 * scripts/bf-import/.
 */

export const BF_REGIONS = ['port-phillip-bay', 'western-port', 'bass-strait-fringe'] as const;
export type BfRegion = (typeof BF_REGIONS)[number];

export const REGION_LABEL: Record<BfRegion, string> = {
  'port-phillip-bay': 'Port Phillip Bay',
  'western-port': 'Western Port',
  'bass-strait-fringe': 'Bass Strait fringe',
};

/**
 * The 12 GA4 events fired by the /fishing/ and /boating/ surfaces. Each event
 * carries a stable name and a typed payload. The pack documents these in
 * bf_measurement_spec.md §3 - keep this list and that spec in sync.
 */
export const BF_GA4_EVENTS = [
  'bf_charter_click',
  'bf_hire_click',
  'bf_species_view',
  'bf_ramp_view',
  'bf_tide_lookup',
  'bf_licence_click',
  'bf_tackle_click',
  'bf_comparison_click',
  'bf_cross_vertical_click',
  'bf_eat_cross_link',
  'bf_scroll_depth_50',
  'bf_scroll_depth_80',
] as const;

export type BfGa4Event = (typeof BF_GA4_EVENTS)[number];

/**
 * UTM medium values defined for /fishing/ and /boating/ outbound clicks.
 * Mirrors bf_affiliate_economics.md §4.
 */
export type BfUtmMedium =
  | 'affiliate-click'
  | 'fishing-vertical'
  | 'boating-vertical'
  | 'species-page'
  | 'ramp-page'
  | 'charter-page'
  | 'hire-page'
  | 'tackle-recommendation'
  | 'cross-vertical-rail'
  | 'comparison-rail'
  | 'anchor-stay-recommendation';

interface BuildUtmInput {
  destination: string;
  campaign: string;
  medium: BfUtmMedium;
  content?: string;
}

/**
 * Append the Peninsula Insider UTM tag set to an outbound URL. Token order
 * matches bf_affiliate_economics.md §4 - affiliate platforms that parse by
 * position need the affiliate token appended after these by the caller.
 */
export function buildBfUtm({ destination, campaign, medium, content }: BuildUtmInput): string {
  const params = new URLSearchParams();
  params.set('utm_source', 'peninsula-insider');
  params.set('utm_medium', medium);
  params.set('utm_campaign', campaign);
  if (content) params.set('utm_content', content);
  const sep = destination.includes('?') ? '&' : '?';
  return `${destination}${sep}${params.toString()}`;
}

/** The 12 species the pack ships in P0–P3, ordered by editorial priority. */
export const BF_SPECIES_ORDER = [
  'snapper',
  'king-george-whiting',
  'squid',
  'australian-salmon',
  'flathead',
  'bream',
  'garfish',
  'silver-trevally',
  'pinkies',
  'gummy-shark',
  'mulloway',
  'yellowtail-kingfish',
] as const;

/** The 6 ramps that ship at P2. */
export const BF_RAMPS_P2 = [
  'safety-beach-boat-ramp',
  'sorrento-boat-ramp',
  'rye-boat-ramp',
  'mornington-park-boat-ramp',
  'hastings-boat-ramp',
  'warneet-boat-ramp',
] as const;

/** Anchor + Featured tier charters for P5. The four [VERIFY] charters are
 *  intentionally absent - they require operator outreach before publish. */
export const BF_CHARTERS_P5 = [
  'im-hooked-fishing-charters',
  'proline-charters',
  'reel-time-fishing-charters',
  'western-port-fishing-charters',
] as const;

/** Tide-dependent ramps that carry mandatory safety statements. */
export const BF_TIDE_DEPENDENT_RAMPS = ['warneet-boat-ramp', 'tooradin-boat-ramp', 'safety-beach-boat-ramp'] as const;

/**
 * Format an ISO date as the on-page "Last fact-verified" stamp. Matches the
 * stamp shape used across the pack content drafts.
 */
export function formatVerifiedStamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Authoritative external links cited across the pack. */
export const BF_EXTERNAL = {
  vfa: 'https://vfa.vic.gov.au',
  vfaLicence: 'https://vfa.vic.gov.au/recreational-fishing/recreational-fishing-licence',
  betterBoating: 'https://www.betterboating.vic.gov.au',
  willyweather: 'https://tides.willyweather.com.au',
  bom: 'http://www.bom.gov.au/australia/tides/',
  parksVic: 'https://www.parks.vic.gov.au',
  maritimeSafety: 'https://www.maritimesafety.vic.gov.au',
  mornpenShire: 'https://www.mornpen.vic.gov.au',
} as const;
