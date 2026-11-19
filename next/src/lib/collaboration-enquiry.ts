import { BUSINESS_CATEGORIES, ENQUIRY_INTERESTS, buildEnquiryRow, buildContactRow, classifyOutcome } from './partner-enquiry.ts';
import type { EnquirySubmissionMeta, EnquiryOutcome } from './partner-enquiry.ts';

export const COLLABORATION_INTERESTS = {
  'dining-winery': 'Dining or winery experience',
  'stay-wellness-activity': 'Accommodation, wellness or activity',
  'voucher-product': 'Voucher or product',
  'future-giveaway': 'Future giveaway interest',
  'exclusive-experience': 'Exclusive experience idea',
  'sponsored-seasonal': 'Sponsored or seasonal collaboration',
  'celebrations-events': 'Celebrations or events',
  other: 'Other ideas',
} as const;
export const ACKNOWLEDGEMENT = 'I am authorised to enquire for this business. This is a nonbinding enquiry, not a commitment to provide a gift or payment. Any collaboration needs mutual agreement. Editorial recommendations, rankings and Insider Picks remain independent.';
export const UPDATES_CONSENT = 'I would like occasional emails about business opportunities from Peninsula Insider. This is optional. I can withdraw my preference by contacting Peninsula Insider.';
export const WORDING_VERSION = 'collaboration-2026-11-17-v1';
export const DETAIL_FIELDS = { estimated_value: 'Estimated value', quantity: 'Quantity', restrictions: 'Restrictions or redemption', timing: 'Preferred timing' };
const text = (v: unknown): string => typeof v === 'string' ? v.trim() : '';

export function collaborationValues(data: FormData): Record<string, unknown> {
  return { ...Object.fromEntries(data), collaboration_interests: data.getAll('collaboration_interests') };
}

/** Preferences submitted by the visitor, not verified authority or immutable consent evidence. */
export function prepareCollaboration(values: Record<string, unknown>): { values: Record<string, unknown>; error?: string } {
  const selected = Array.isArray(values.collaboration_interests) ? values.collaboration_interests : [];
  if (selected.some(v => typeof v !== 'string' || !Object.hasOwn(COLLABORATION_INTERESTS, v))) return { values, error: 'Choose an available collaboration interest.' };
  if (values.acknowledgement !== 'yes') return { values, error: 'Please acknowledge your authority to enquire and the nonbinding terms.' };
  if (!text(values.notes)) return { values, error: 'Please add a short description of your idea.' };
  const interests = [...new Set(selected)] as (keyof typeof COLLABORATION_INTERESTS)[];
  const primary = ENQUIRY_INTERESTS.find(v => v === values.interest) || (interests.includes('sponsored-seasonal') ? 'seasonal-campaign' : interests.includes('celebrations-events') ? 'event-promotion' : interests.length ? 'offers-experiences' : 'not-sure');
  const lines = [
    'Collaboration enquiry (' + WORDING_VERSION + ')',
    'Interests: ' + (interests.map(v => COLLABORATION_INTERESTS[v]).join('; ') || 'None selected'),
    'Description: ' + text(values.notes),
  ];
  if (interests.length) for (const [key, label] of Object.entries(DETAIL_FIELDS)) {
    if (text(values[key])) lines.push(label + ': ' + text(values[key]));
  }
  lines.push('Acknowledgement: yes; ' + ACKNOWLEDGEMENT);
  lines.push('Opportunity updates: ' + (values.opportunity_updates === 'yes' ? 'opted in' : 'not opted in') + '; wording: ' + UPDATES_CONSENT);
  const notes = lines.join('\n');
  if (notes.length > 2000) return { values, error: 'Your description and optional details are too long together. Please shorten them by at least ' + (notes.length - 2000) + ' characters. Nothing has been sent.' };
  return { values: { ...values, interest: primary, notes } };
}

/** Reduce before analytics: never pass free text, consent or identifiers. */
export function collaborationAnalytics(values: Record<string, unknown>): [string, unknown][] {
  return [
    ['business_category', BUSINESS_CATEGORIES.find(v => v === values.business_category) || ''],
    ['interest', ENQUIRY_INTERESTS.find(v => v === values.interest) || ''],
  ];
}

type WriteResult = { error: { code?: string } | null; status?: number };
type IntakeClient = { from(table: string): { insert(row: Record<string, unknown>): PromiseLike<WriteResult> } };
// A transport error or server failure cannot prove that the write did not commit.
function uncertain(result: WriteResult): boolean {
  return !!result.error && (!result.error.code || !result.status || result.status >= 500);
}

/** No retry. Only definite missing-table PGRST205 may use private intake. */
export async function submitCollaboration(c: IntakeClient, values: Record<string, unknown>, meta: EnquirySubmissionMeta): Promise<EnquiryOutcome> {
  try {
    const main = await c.from('partner_enquiries').insert(buildEnquiryRow(values, meta));
    if (main.error?.code === 'PGRST205' && main.status === 404) {
      const fallback = await c.from('submissions').insert({
        id: meta.id, category: 'other', title: `PARTNER ENQUIRY: ${meta.enquiryRef}`,
        body: `Intake type: partner-enquiry\nReference: ${meta.enquiryRef}\nBusiness: ${values.business_name}\nCategory: ${values.business_category}\nInterest: ${values.interest || ''}\nWebsite/social: ${values.website_or_instagram || ''}\n\n${values.notes || ''}`,
        submitter_name: values.contact_name, submitter_email: values.email,
        photo_urls: [], client_token: meta.clientToken ?? null,
      });
      return uncertain(fallback) ? 'uncertain' : fallback.error ? 'failed' : 'success';
    }
    if (main.error) return uncertain(main) ? 'uncertain' : 'failed';
    const contact = buildContactRow(values, meta.id);
    if (!contact) return 'unanswerable';
    const result = await c.from('partner_enquiry_contacts').insert(contact);
    if (uncertain(result)) return 'uncertain';
    return classifyOutcome({ enquiryInserted: true, contactInserted: !result.error });
  } catch {
    return 'uncertain';
  }
}
