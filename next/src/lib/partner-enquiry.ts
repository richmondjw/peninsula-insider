/**
 * partner-enquiry.ts - the vocabulary, validation and outcome rules behind
 * the partner enquiry form on /partners/ (PI-015).
 *
 * WHAT THIS REPLACES. The form posted to
 * `https://formspree.io/f/peninsula-insider-partners` - a human-readable
 * placeholder, not a Formspree hashid - behind `var ENDPOINT_LIVE = false`.
 * Every submit was intercepted and turned into a `mailto:` handoff. Nothing
 * was recorded anywhere, and once the browser hands off to a mail client the
 * page cannot see whether a message was composed, sent or abandoned. Where no
 * mail handler existed, pressing Send did nothing at all and showed no error.
 * A business that filled it in believed it had contacted the publication.
 *
 * WHY THE REFERENCE IS MINTED IN THE BROWSER. Same constraint as the
 * corrections queue: this is a static build on GitHub Pages with no
 * application server, Supabase is reached straight from the page with the
 * publishable key, and RLS is the only gate. pi.partner_enquiries grants the
 * anonymous role INSERT and nothing else - a public SELECT would expose every
 * business that has ever considered a partnership - so a server-generated id
 * can never be read back to show the enquirer. The reference is generated
 * here, written as part of the insert, and printed on screen in the same tick.
 *
 * WHY THIS DOES NOT IMPORT corrections.ts. The two modules duplicate about
 * twenty lines of reference-minting. That is deliberate. Both are leaf modules
 * with zero imports so their tests can load them through Node's bare
 * TypeScript type-stripping with no bundler resolution, and the two queues are
 * otherwise unrelated: a shared minter would couple the editorial corrections
 * vocabulary to the commercial enquiry one for no reason but line count.
 *
 * Schema and reasoning: ops/migrations/2026-09-14-pi-partner-enquiries.sql
 * Tests: src/lib/partner-enquiry.test.mjs
 */

/* ==========================================================================
   Vocabulary. Mirrored exactly by CHECK constraints in the migration; the
   <select> elements on the page are built from these arrays, so the browser,
   the module and the database cannot drift.
   ========================================================================== */

export const BUSINESS_CATEGORIES = [
  'winery-cellar-door',
  'restaurant-dining',
  'accommodation',
  'wellness-spa',
  'tour-attraction',
  'event',
  'visitor-experience',
  'other',
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  'winery-cellar-door': 'Winery or cellar door',
  'restaurant-dining': 'Restaurant or dining venue',
  accommodation: 'Boutique accommodation',
  'wellness-spa': 'Wellness or spa experience',
  'tour-attraction': 'Tour or attraction',
  event: 'Premium local event',
  'visitor-experience': 'Visitor experience or destination business',
  other: 'Other',
};

export const ENQUIRY_INTERESTS = [
  'featured-profile',
  'seasonal-campaign',
  'event-promotion',
  'newsletter',
  'offers-experiences',
  'sponsorship',
  'not-sure',
] as const;
export type EnquiryInterest = (typeof ENQUIRY_INTERESTS)[number];

export const ENQUIRY_INTEREST_LABELS: Record<string, string> = {
  'featured-profile': 'Featured Partner Profile',
  'seasonal-campaign': 'Seasonal Campaign',
  'event-promotion': 'Event Promotion',
  newsletter: 'Newsletter Partnership',
  'offers-experiences': 'Offers and Experiences',
  sponsorship: 'Destination or Category Sponsorship',
  'not-sure': 'Not sure yet, would like to talk',
};

/** Commercial lifecycle, not an editorial one. Set by whoever works the queue. */
export const ENQUIRY_STATUSES = [
  'received',
  'in-review',
  'contacted',
  'in-conversation',
  'partnered',
  'declined',
  'closed',
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const PARTNERSHIPS_EMAIL = 'hello@peninsulainsider.com.au';

/* ==========================================================================
   Reference minting
   ========================================================================== */

/**
 * Crockford base32, minus I, L, O and U: a reference read down a phone line
 * or copied off a screenshot survives the trip, because there is no 1/I/l and
 * no 0/O confusion left to make.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const REF_PREFIX = 'PI-P';
const REF_RANDOM_LEN = 6;

/** PI-P-YYMMDD-XXXXXX, uppercase, no ambiguous glyphs. */
export const ENQUIRY_REF_PATTERN = /^PI-P-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/;

/**
 * Draw `count` values in [0, ALPHABET.length) from the best source available.
 * The modulo is unbiased because 256 is an exact multiple of 32.
 */
function randomIndices(count: number): number[] {
  const out: number[] = [];
  const c: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(count);
    c.getRandomValues(bytes);
    for (let i = 0; i < count; i++) out.push(bytes[i] % ALPHABET.length);
    return out;
  }
  for (let i = 0; i < count; i++) out.push(Math.floor(Math.random() * ALPHABET.length));
  return out;
}

/**
 * Mint an enquiry reference: PI-P-<YYMMDD>-<6 random base32 chars>.
 *
 * The date segment partitions the space by day, so two references only ever
 * collide within the same day, and six base32 characters is 32^6 =
 * 1,073,741,824 values per day. Partner enquiry volume is a handful a month.
 * A collision is not silent data loss either way: enquiry_ref carries a
 * UNIQUE constraint, so the insert fails loudly and the page reports a
 * failure rather than a false confirmation.
 *
 * Date is local on purpose. The reference is a human handle, not a timestamp;
 * pi.partner_enquiries.received_at is the record of when it landed.
 *
 * @param now   injectable clock, for tests
 * @param draw  injectable randomness, for tests
 */
export function generateEnquiryRef(
  now: Date = new Date(),
  draw: (count: number) => number[] = randomIndices,
): string {
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const tail = draw(REF_RANDOM_LEN)
    .map((n) => ALPHABET[((n % ALPHABET.length) + ALPHABET.length) % ALPHABET.length])
    .join('');
  return `${REF_PREFIX}-${yy}${mm}${dd}-${tail}`;
}

/** True for a string this module could have minted. */
export function isEnquiryRef(value: unknown): boolean {
  return typeof value === 'string' && ENQUIRY_REF_PATTERN.test(value.trim());
}

/* ==========================================================================
   Validation
   ========================================================================== */

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function textOrNull(value: unknown): string | null {
  const v = text(value);
  return v === '' ? null : v;
}

function oneOfOrNull<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const v = text(value);
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/**
 * The fields without which an enquiry cannot be acted on. Business name and
 * category say what is being asked about; contact name and email are what
 * makes it answerable, and an enquiry nobody can answer is a lost lead rather
 * than a record.
 */
export const REQUIRED_FIELDS = [
  'business_name',
  'contact_name',
  'email',
  'business_category',
] as const;

/** Human labels, in the words the form uses. One definition a test can pin. */
export const REQUIRED_FIELD_LABELS: Record<string, string> = {
  business_name: 'your business name',
  contact_name: 'a contact name',
  email: 'an email address',
  business_category: 'a business category',
};

/**
 * Deliberately loose, and the same shape as the CHECK constraint in the
 * migration. The job is to reject what obviously cannot be an address, not to
 * adjudicate RFC 5322 in a regex - every strict version in circulation
 * rejects addresses that work. The cost of a false reject here is a real
 * enquiry turned away at the door.
 */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isPlausibleEmail(value: unknown): boolean {
  const v = text(value);
  return v.length > 0 && v.length <= 240 && EMAIL_PATTERN.test(v);
}

/**
 * Which required fields are missing or unusable, by form field name.
 *
 * The browser enforces `required` itself. This exists for the three cases it
 * does not cover - a field holding nothing but whitespace, a category outside
 * the vocabulary, and an address that is not one - and so the rule has a
 * single definition the page, the test and the database agree on.
 */
export function missingRequiredFields(values: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const name of REQUIRED_FIELDS) {
    const v = text(values[name]);
    if (v === '') {
      missing.push(name);
      continue;
    }
    if (name === 'email' && !isPlausibleEmail(v)) missing.push(name);
    if (name === 'business_category' && !oneOfOrNull(v, BUSINESS_CATEGORIES)) missing.push(name);
  }
  return missing;
}

/** One sentence naming what is still outstanding, rather than making them hunt. */
export function describeMissingFields(names: readonly string[]): string {
  const labels = names.map((n) => REQUIRED_FIELD_LABELS[n] || n);
  if (labels.length === 0) return '';
  if (labels.length === 1) return 'Still needed: ' + labels[0] + '.';
  const head = labels.slice(0, -1).join(', ');
  return 'Still needed: ' + head + ' and ' + labels[labels.length - 1] + '.';
}

/* ==========================================================================
   Spam control - honeypot plus timing, no third party
   ========================================================================== */

/**
 * Minimum plausible time to compose an enquiry, in milliseconds. A person
 * typing a business name, a contact name, an email address, choosing a
 * category and usually adding a note does not arrive in two and a half
 * seconds. A script does.
 *
 * There is deliberately no upper bound. An operator who opens the form,
 * gets interrupted by a customer and comes back after lunch is the single
 * most normal thing this form will see, and rejecting that would throw away
 * real enquiries to catch nothing.
 *
 * The same number is a CHECK constraint on pi.partner_enquiries.compose_ms.
 * This copy is the fast path; that copy is the enforcement, because a bot
 * posting straight at PostgREST never runs this file.
 */
export const MIN_COMPOSE_MS = 2500;

export type SpamVerdict = 'ok' | 'honeypot' | 'too-fast' | 'no-timing';

/**
 * Classify a submission as human or machine on two signals that need no third
 * party, no CAPTCHA and no request to the reader.
 *
 *   honeypot   a field hidden from people and offered to machines. Anything
 *              in it means the submitter was reading the DOM, not the page.
 *   timing     how long the form was open before Send.
 *
 * `no-timing` is a distinct verdict from `too-fast` on purpose: a missing
 * timestamp means the script that stamps it never ran, which is what a
 * scripted POST looks like, but it is ALSO what a genuine reader with
 * JavaScript half-loaded looks like. Keeping them apart lets the caller treat
 * them differently and lets a test assert that neither one reaches success.
 *
 * Neither signal is unbeatable and this function does not pretend otherwise.
 * A bot that studies the form can send an empty trap and a plausible delay.
 * The point is that the cheap generic attack - POST every field at every
 * endpoint - fails, for free, without asking a human being to identify a
 * traffic light.
 */
export function classifySubmission(input: {
  honeypot?: unknown;
  composeMs?: unknown;
  minComposeMs?: number;
}): SpamVerdict {
  if (text(input.honeypot) !== '') return 'honeypot';

  const min = typeof input.minComposeMs === 'number' ? input.minComposeMs : MIN_COMPOSE_MS;
  const raw = input.composeMs;
  const ms = typeof raw === 'number' ? raw : Number.parseInt(text(raw), 10);
  if (!Number.isFinite(ms) || ms < 0) return 'no-timing';
  if (ms < min) return 'too-fast';
  return 'ok';
}

/* ==========================================================================
   Row building
   ========================================================================== */

export interface EnquirySubmissionMeta {
  /** Client-minted uuid. The contact row is keyed on it and anon cannot read it back. */
  id: string;
  enquiryRef: string;
  /** Milliseconds the form was open. Written as-is; the database constrains it. */
  composeMs: number;
  userId?: string | null;
  clientToken?: string | null;
  sourceSurface?: string;
}

/**
 * Build the pi.partner_enquiries insert payload.
 *
 * TWO THINGS THIS FUNCTION EXISTS TO GUARANTEE, both learned from PI-016.
 *
 * 1. It never emits a commercial-state field. The anonymous insert policy
 *    rejects any row arriving with an owner, owner notes, a decline reason, a
 *    response or resolution timestamp, or a contact_provided flag already
 *    set. A stray key here is not a cosmetic bug: it is every enquiry on the
 *    site failing with a policy violation. The row is therefore built by
 *    allowlist, and a test asserts the forbidden keys are ABSENT rather than
 *    merely empty.
 *
 * 2. The id is minted client-side, for the same reason the reference is: the
 *    contact row is keyed on it, and the anonymous role has no select policy.
 *
 * `bot_trap` is emitted deliberately, always, and always empty for a real
 * submission. Sending it is what lets the database enforce the honeypot on a
 * caller that never ran classifySubmission().
 */
export function buildEnquiryRow(
  values: Record<string, unknown>,
  meta: EnquirySubmissionMeta,
): Record<string, unknown> {
  return {
    id: meta.id,
    enquiry_ref: meta.enquiryRef,
    user_id: meta.userId ?? null,
    business_name: text(values.business_name),
    business_category: oneOfOrNull(values.business_category, BUSINESS_CATEGORIES),
    website_or_instagram: textOrNull(values.website_or_instagram),
    interest: oneOfOrNull(values.interest, ENQUIRY_INTERESTS),
    notes: textOrNull(values.notes),
    bot_trap: text(values.bot_trap),
    compose_ms: meta.composeMs,
    source_surface: meta.sourceSurface ?? 'partners-page',
    client_token: meta.clientToken ?? null,
  };
}

/**
 * Build the pi.partner_enquiry_contacts insert payload, or null when there is
 * nothing usable to write.
 *
 * Unlike the corrections equivalent, null here is a FAILURE rather than a
 * legitimate outcome: missingRequiredFields() has already rejected a
 * submission with no name or no address, so a null return means the caller
 * skipped validation. classifyOutcome() below treats it as such.
 */
export function buildContactRow(
  values: Record<string, unknown>,
  enquiryId: string,
): Record<string, unknown> | null {
  const name = text(values.contact_name);
  const email = text(values.email);
  if (!name || !isPlausibleEmail(email)) return null;
  return {
    enquiry_id: enquiryId,
    contact_name: name,
    contact_email: email,
    contact_phone: textOrNull(values.phone),
  };
}

/* ==========================================================================
   Outcome
   ========================================================================== */

export type EnquiryOutcome = 'success' | 'unanswerable' | 'failed';

/**
 * Decide what the reader is told, from what the database actually confirmed.
 *
 * THIS IS THE RULE THE WHOLE TICKET TURNS ON. The defect being fixed was a
 * form that reported nothing and recorded nothing; the way to reintroduce it
 * in a new coat is a form that reports success on an insert that did not
 * happen. So the mapping is written once, here, as a pure function over the
 * two facts that matter, and the test enumerates every combination of those
 * facts and asserts that 'success' appears in exactly one of them.
 *
 *   'success'       both rows confirmed. The enquiry exists AND can be
 *                   answered. This is the only branch that shows a
 *                   confirmation.
 *   'unanswerable'  the enquiry row landed, the contact row did not. The
 *                   enquiry is safe on the server but we cannot reply to it,
 *                   so telling the business "thanks, we'll be in touch" would
 *                   be a lie. They get the reference, an explanation and the
 *                   email fallback.
 *   'failed'        the enquiry row did not land. Nothing was recorded.
 *
 * There is no fourth branch and no default-to-success anywhere: an unknown
 * combination cannot exist, because both inputs are booleans and both are
 * read from an awaited Supabase result rather than from the absence of a
 * thrown exception.
 */
export function classifyOutcome(input: {
  enquiryInserted: boolean;
  contactInserted: boolean;
}): EnquiryOutcome {
  if (!input.enquiryInserted) return 'failed';
  if (!input.contactInserted) return 'unanswerable';
  return 'success';
}

/**
 * The words for each outcome. Kept beside the rule rather than in the page so
 * that a test can assert a confirmation is never produced for a non-success
 * outcome - the failure mode being guarded is copy drifting into optimism.
 */
export function outcomeMessage(outcome: EnquiryOutcome, enquiryRef: string): string {
  switch (outcome) {
    case 'success':
      return (
        'Enquiry received. Your reference is ' + enquiryRef + '. ' +
        'We read every enquiry and reply to the ones where there is a fit, usually within a few business days. ' +
        'Keep the reference: quote it if you follow up.'
      );
    case 'unanswerable':
      return (
        'Your enquiry was recorded as ' + enquiryRef + ', but your contact details did not save with it, ' +
        'so we have no way to reply. Email ' + PARTNERSHIPS_EMAIL + ' quoting that reference and we will ' +
        'attach them to it.'
      );
    case 'failed':
    default:
      return (
        'That did not send, and nothing was recorded. Try once more, and if it fails again email ' +
        PARTNERSHIPS_EMAIL + ' with your business name and what you are interested in.'
      );
  }
}

/** True only for the outcome that is allowed to read as a confirmation. */
export function isConfirmation(outcome: EnquiryOutcome): boolean {
  return outcome === 'success';
}
