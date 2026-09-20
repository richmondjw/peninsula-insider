/**
 * analytics-contract - the shared envelope, redaction and dedup rules that
 * every Peninsula Insider analytics event passes through (PI-024).
 *
 * This module holds NO dispatch logic and touches no browser globals, so it
 * is unit-testable under `node --test` (see analytics-contract.test.mjs).
 * Dispatch stays where it already lived: `trackEvent` in v5-analytics.ts,
 * which is the single consent-gated exit from the page.
 *
 * Three rules this file exists to enforce:
 *
 *   1. NO PERSONAL DATA. Never a name, an email address, a phone number, a
 *      free-text message or a raw search string. `sanitiseParams` strips
 *      them by key and by shape, and reports how many it removed rather
 *      than dropping them silently.
 *   2. ONE ENVELOPE. Every event carries the same identity fields so the
 *      warehouse can join, dedupe and audit consent without guessing:
 *      event id, timestamp, page path, release, consent state.
 *   3. STARTS ARE NOT SUCCESSES. This module gives the dedup primitive that
 *      lets a start/success/failure trio fire exactly once per attempt. The
 *      honesty itself is enforced at each call site.
 *
 * See docs/analytics-dictionary.md for the event-by-event contract.
 */

/** Bumped when the envelope shape changes in a way consumers must notice. */
export const ANALYTICS_SCHEMA_VERSION = 1;

/**
 * Parameter keys that must never be transmitted. Matching is case-insensitive
 * and applies to the exact key only; `entity_slug` is fine, `email` is not.
 */
export const FORBIDDEN_PARAM_KEYS: readonly string[] = [
  'address',
  'body',
  'comment',
  'comments',
  'contact_name',
  'email',
  'first_name',
  'full_name',
  'given_name',
  'last_name',
  'message',
  'mobile',
  'name',
  'note',
  'notes',
  'phone',
  'q',
  'query',
  'search_term',
  'surname',
  'trip_title',
  'day_label',
  'share_url',
  'shared_trip_url',
  'prompt',
  'response',
  'tel',
  'text',
  'user_email',
];

/** Longest string value any parameter may carry. Longer values are dropped. */
export const MAX_PARAM_STRING_LENGTH = 120;

const FORBIDDEN_SET = new Set(FORBIDDEN_PARAM_KEYS);

/** Deliberately loose: anything shaped like an address is treated as one. */
const EMAIL_SHAPE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/** Phone shape: eight or more digits with optional separators. */
const PHONE_SHAPE = /(?:\+?\d[\s\-().]*){8,}/;

/**
 * Query-string shape: `?key=` or `&key=` anywhere in the value.
 *
 * A query string is where the unsafe things live. Search terms, affiliate and
 * session ids, and - the case that put this rule here - the /itinerary/ share
 * link, which encodes the reader's stops and the day labels they typed
 * themselves. A short share URL is under MAX_PARAM_STRING_LENGTH and contains
 * neither an address nor a phone number, so nothing else in this file would
 * have stopped it. Attribute a destination with destinationHost(), describe a
 * page with safePagePath(); never ship a URL that carries parameters.
 */
const QUERY_SHAPE = /[?&][^=&\s]+=/;

export interface SanitiseResult {
  params: Record<string, unknown>;
  redacted: number;
}

/**
 * Strip anything that could carry personal data out of an event payload.
 *
 * Removed: forbidden keys, values shaped like an email address or a phone
 * number, and any string longer than MAX_PARAM_STRING_LENGTH (free text does
 * not belong in a payload, and length is the cheapest reliable tell).
 * Objects and arrays are removed outright: nested shapes cannot be audited
 * at a glance, so they are not allowed through.
 */
export function sanitiseParams(input: Record<string, unknown> | null | undefined): SanitiseResult {
  const params: Record<string, unknown> = {};
  let redacted = 0;
  if (!input || typeof input !== 'object') return { params, redacted };

  for (const [rawKey, value] of Object.entries(input)) {
    const key = String(rawKey);
    if (FORBIDDEN_SET.has(key.toLowerCase())) {
      redacted += 1;
      continue;
    }
    if (value === null || value === undefined) continue;
    if (typeof value === 'number' || typeof value === 'boolean') {
      params[key] = value;
      continue;
    }
    if (typeof value !== 'string') {
      redacted += 1;
      continue;
    }
    if (value.length > MAX_PARAM_STRING_LENGTH) {
      redacted += 1;
      continue;
    }
    if (EMAIL_SHAPE.test(value) || PHONE_SHAPE.test(value) || QUERY_SHAPE.test(value)) {
      redacted += 1;
      continue;
    }
    params[key] = value;
  }

  return { params, redacted };
}

/**
 * Host of an outbound URL, for attributing a booking click to a destination
 * without shipping the full URL (query strings carry affiliate ids, session
 * tokens and sometimes an email address).
 *
 * Returns an empty string for anything that is not an absolute http(s) URL,
 * which is the signal that the link was internal and should not be counted
 * as outbound at all.
 */
export function destinationHost(url: unknown): string {
  if (typeof url !== 'string' || url === '') return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** Strip the query string and hash off a path. Query strings carry search terms. */
export function safePagePath(pathOrUrl: unknown): string {
  if (typeof pathOrUrl !== 'string' || pathOrUrl === '') return '/';
  const withoutHash = pathOrUrl.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  return withoutQuery || '/';
}

/**
 * Bucket a free-text length rather than the text. Lets the warehouse tell a
 * one-word search from a sentence without ever seeing either.
 */
export function lengthBucket(value: unknown): string {
  const n = typeof value === 'string' ? value.trim().length : Number(value) || 0;
  if (n <= 0) return 'empty';
  if (n <= 3) return 'xs';
  if (n <= 10) return 's';
  if (n <= 25) return 'm';
  if (n <= 60) return 'l';
  return 'xl';
}

export interface EnvelopeContext {
  eventId: string;
  timestamp: string;
  pagePath: string;
  release: string;
  consentState: 'granted' | 'denied' | 'unknown';
  component?: string;
}

/**
 * Wrap a sanitised payload in the identity fields every event carries.
 * Envelope keys are prefixed `pi_` so they can never collide with a
 * call-site parameter, and so a GA4 explorer can select them as a group.
 */
export function eventEnvelope(
  name: string,
  params: Record<string, unknown>,
  ctx: EnvelopeContext,
): Record<string, unknown> {
  const { params: safe, redacted } = sanitiseParams(params);
  const envelope: Record<string, unknown> = {
    ...safe,
    pi_event: name,
    pi_event_id: ctx.eventId,
    pi_ts: ctx.timestamp,
    pi_page: safePagePath(ctx.pagePath),
    pi_release: ctx.release,
    pi_consent: ctx.consentState,
    pi_schema: ANALYTICS_SCHEMA_VERSION,
  };
  if (ctx.component) envelope.pi_component = ctx.component;
  if (redacted > 0) envelope.pi_redacted = redacted;
  return envelope;
}

/**
 * Decide whether a clicked link is an outbound booking click, and build the
 * payload for it. Pure, so the rule that decides the site's most commercially
 * loaded number is testable without a DOM.
 *
 * The rule is deliberately narrow. A click is a booking click only when the
 * link was marked as a booking affordance at render time AND it leaves the
 * site for an http(s) host. A link to a venue's homepage is NOT a booking
 * click: it carries no reservation intent and counting it would inflate the
 * one number the commercial gates read. See docs/analytics-dictionary.md.
 *
 * `fire: false` carries a `reason` so a call site can be debugged without
 * guessing, and so the tests can assert WHY something was rejected.
 */
export interface BookingClickDecision {
  fire: boolean;
  reason: 'ok' | 'not-marked' | 'not-absolute' | 'internal';
  params: Record<string, unknown>;
}

export interface BookingClickInput {
  /** The href as authored. */
  href: unknown;
  /** Host of the page the click happened on, e.g. 'peninsulainsider.com.au'. */
  siteHost: unknown;
  /** Render-time marker. Absent or empty means this was not a booking link. */
  kind?: unknown;
  entityType?: unknown;
  entitySlug?: unknown;
  surface?: unknown;
  /** Booking provider slug where the content model records one. */
  provider?: unknown;
}

export function bookingClickDecision(input: BookingClickInput): BookingClickDecision {
  const kind = typeof input.kind === 'string' ? input.kind.trim() : '';
  if (!kind) return { fire: false, reason: 'not-marked', params: {} };

  const host = destinationHost(input.href);
  if (!host) return { fire: false, reason: 'not-absolute', params: {} };

  const site = destinationHost(
    typeof input.siteHost === 'string' && input.siteHost.includes('//')
      ? input.siteHost
      : `https://${String(input.siteHost ?? '')}`,
  );
  if (site && host === site) return { fire: false, reason: 'internal', params: {} };

  const params: Record<string, unknown> = {
    booking_kind: kind,
    destination_host: host,
  };
  if (typeof input.entityType === 'string' && input.entityType) params.entity_type = input.entityType;
  if (typeof input.entitySlug === 'string' && input.entitySlug) params.entity_id = input.entitySlug;
  if (typeof input.surface === 'string' && input.surface) params.surface = input.surface;
  if (typeof input.provider === 'string' && input.provider) params.provider = input.provider;

  return { fire: true, reason: 'ok', params };
}

/**
 * Reduce a partner enquiry form to the shape of a submission, never its
 * content. Every free-text and identifying field is replaced by a category,
 * a boolean or a length bucket before it can reach a payload.
 *
 * Takes plain entries so it can be tested without a FormData or a DOM.
 */
export function partnerEnquiryShape(entries: Iterable<[string, unknown]>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let provided = 0;
  for (const [key, raw] of entries) {
    const value = typeof raw === 'string' ? raw.trim() : raw;
    const filled = value !== '' && value !== null && value !== undefined;
    if (filled) provided += 1;
    switch (key) {
      // Category-style fields are closed vocabularies from a <select>, so the
      // value itself is safe and is the only thing worth measuring.
      case 'business_category':
      case 'interest':
        if (filled) out[key] = value;
        break;
      // Presence only. Never the value.
      case 'website_or_instagram':
        out.has_website = filled;
        break;
      case 'notes':
        out.notes_length = lengthBucket(filled ? value : '');
        break;
      // business_name, contact_name, email and anything added later are
      // identifying. They are not measured at all, not even as presence,
      // because presence of a required field is a constant.
      default:
        break;
    }
  }
  out.fields_provided = provided;
  return out;
}

/** Default dedup window. One user intent, one event, per this many ms. */
export const DEFAULT_DEDUP_MS = 1000;

export interface Deduper {
  /** True when this key has not been seen inside the window. Records it. */
  (key: string, windowMs?: number, now?: number): boolean;
  reset(): void;
}

/**
 * Build a dedup gate. Guards the two ways a click gets counted twice: a
 * capture-phase delegated listener that also matches a nested element, and
 * a component that hydrates more than once across an Astro view transition.
 *
 * Keys are caller-supplied and should identify the intent, not the element,
 * so a booking click from the sticky bar and one from the inline CTA still
 * count separately.
 */
export function makeDeduper(defaultWindowMs: number = DEFAULT_DEDUP_MS): Deduper {
  const seen = new Map<string, number>();

  const gate = ((key: string, windowMs?: number, now?: number): boolean => {
    const w = typeof windowMs === 'number' ? windowMs : defaultWindowMs;
    const t = typeof now === 'number' ? now : Date.now();
    const last = seen.get(key);
    if (last !== undefined && t - last < w) return false;
    seen.set(key, t);
    // Bound the map so a long session cannot grow it without limit.
    if (seen.size > 200) {
      for (const [k, v] of seen) {
        if (t - v >= w) seen.delete(k);
      }
    }
    return true;
  }) as Deduper;

  gate.reset = () => seen.clear();
  return gate;
}
