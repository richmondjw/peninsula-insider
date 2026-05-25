import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export const PATHS = {
  clientSecret: path.join(REPO_ROOT, 'ops', 'tokens', 'ga4-client-secret.json'),
  token: path.join(REPO_ROOT, 'ops', 'tokens', 'ga4-token.json'),
  property: path.join(REPO_ROOT, 'ops', 'tokens', 'ga4-property.json'),
  dataDir: path.join(REPO_ROOT, 'ops', 'data', 'ga4'),
  logsDir: path.join(REPO_ROOT, 'ops', 'logs', 'ga4'),
  reportsDir: path.join(REPO_ROOT, 'ops', 'reports', 'ga4'),
  dailyLog: path.join(REPO_ROOT, 'ops', 'reports', 'ga4', 'daily-log.md'),
};

export const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

// Set after auth.mjs writes ga4-property.json from GA4 admin.
// Property ID looks like "properties/123456789".
// Find it in GA4: Admin -> Property Settings -> Property ID.

// Conversion events we care about for the SEO -> commercial funnel audit.
// Edit as the conversion model evolves; pull.mjs reads this list.
export const CONVERSION_EVENTS = [
  'newsletter_signup',
  'concierge_query',
  'pass_subscribe_click',
  'operator_claim_start',
  'operator_claim_submit',
  'awards_engagement',
  'partner_enquiry',
  'itinerary_save',
];

// Channel groupings we map onto sessionSource/sessionMedium for the audit.
export const ORGANIC_FILTERS = {
  organicSearch: { sessionMedium: 'organic' },
  direct: { sessionMedium: '(none)' },
  referral: { sessionMedium: 'referral' },
};
