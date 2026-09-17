/**
 * analytics-contract tests. Run from repo root or next/:
 *
 *   node --test next/src/lib/analytics-contract.test.mjs
 *
 * Uses Node's native TypeScript type-stripping (Node >= 22.18) to import
 * analytics-contract.ts directly. No framework, no build step. Same pattern
 * as season.test.mjs.
 *
 * WHAT THIS GUARDS. The analytics contract has one rule that cannot be
 * enforced by review alone, because it fails silently and only in
 * production: personal data must never reach a payload. The partner enquiry
 * form, the corrections mailto and the search box all sit one careless
 * spread operator away from shipping an email address or a free-text
 * message to GA4. Every assertion below is a payload that a plausible
 * future call site could construct, and the test asserts the value does not
 * survive sanitisation.
 *
 * The dedup assertions guard the second failure mode: a delegated
 * capture-phase listener plus a component that rehydrates across an Astro
 * view transition will double-count a single click, which inflates exactly
 * the number the commercial decision gates read.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANALYTICS_SCHEMA_VERSION,
  DEFAULT_DEDUP_MS,
  FORBIDDEN_PARAM_KEYS,
  MAX_PARAM_STRING_LENGTH,
  bookingClickDecision,
  destinationHost,
  eventEnvelope,
  lengthBucket,
  makeDeduper,
  partnerEnquiryShape,
  safePagePath,
  sanitiseParams,
} from './analytics-contract.ts';

// ---------------------------------------------------------------------------
// sanitiseParams - the personal-data red line
// ---------------------------------------------------------------------------

test('sanitiseParams drops every forbidden key', () => {
  const input = {};
  for (const key of FORBIDDEN_PARAM_KEYS) input[key] = 'something';
  const { params, redacted } = sanitiseParams(input);
  assert.deepEqual(params, {}, 'no forbidden key may survive');
  assert.equal(redacted, FORBIDDEN_PARAM_KEYS.length);
});

test('sanitiseParams matches forbidden keys case-insensitively', () => {
  const { params } = sanitiseParams({ Email: 'a@b.com', NOTES: 'hello', Message: 'hi' });
  assert.deepEqual(params, {});
});

test('sanitiseParams drops an email address hiding under an innocent key', () => {
  const { params, redacted } = sanitiseParams({
    surface: 'partners',
    label: 'jane.doe@example.com',
  });
  assert.deepEqual(params, { surface: 'partners' });
  assert.equal(redacted, 1);
});

test('sanitiseParams drops a phone number hiding under an innocent key', () => {
  const { params } = sanitiseParams({ surface: 'venue', label: '+61 412 345 678' });
  assert.deepEqual(params, { surface: 'venue' });
});

test('sanitiseParams keeps a short slug that contains digits', () => {
  const { params } = sanitiseParams({ entity_slug: 'jackalope-hotel-2026', position: 3 });
  assert.deepEqual(params, { entity_slug: 'jackalope-hotel-2026', position: 3 });
});

test('sanitiseParams drops free text by length', () => {
  const long = 'x'.repeat(MAX_PARAM_STRING_LENGTH + 1);
  const { params, redacted } = sanitiseParams({ surface: 'a', label: long });
  assert.deepEqual(params, { surface: 'a' });
  assert.equal(redacted, 1);
});

test('sanitiseParams drops nested objects and arrays outright', () => {
  const { params, redacted } = sanitiseParams({
    surface: 'a',
    payload: { email: 'a@b.com' },
    tags: ['one', 'two'],
  });
  assert.deepEqual(params, { surface: 'a' });
  assert.equal(redacted, 2);
});

test('sanitiseParams keeps booleans and numbers, skips null and undefined', () => {
  const { params, redacted } = sanitiseParams({
    persisted: false,
    result_count: 0,
    missing: null,
    absent: undefined,
  });
  assert.deepEqual(params, { persisted: false, result_count: 0 });
  assert.equal(redacted, 0, 'an absent value is not a redaction');
});

test('sanitiseParams drops a value carrying a query string', () => {
  // The /itinerary/ share link is short enough to clear the length cap and
  // carries neither an address nor a phone number, so only the query-shape
  // rule stops it. Its ?d= parameter holds day labels the reader typed.
  const share = '/itinerary/?i=venue:doot-doot:d1&d=d1:Emma%20and%20Dad';
  const { params, redacted } = sanitiseParams({ surface: 'itinerary', share_url: share });
  assert.ok(share.length < MAX_PARAM_STRING_LENGTH, 'the length cap alone would have let this through');
  assert.deepEqual(params, { surface: 'itinerary' });
  assert.equal(redacted, 1);
});

test('sanitiseParams keeps slugs and joined key lists that merely contain punctuation', () => {
  const { params, redacted } = sanitiseParams({
    filter_keys: 'cat|mood|place',
    entity_slug: 'ten-minutes-by-tractor',
    destination_host: 'opentable.com.au',
    booking_kind: 'booking',
  });
  assert.equal(redacted, 0, 'the query-shape rule must not swallow ordinary values');
  assert.equal(Object.keys(params).length, 4);
});
test('sanitiseParams tolerates junk input', () => {
  assert.deepEqual(sanitiseParams(null), { params: {}, redacted: 0 });
  assert.deepEqual(sanitiseParams(undefined), { params: {}, redacted: 0 });
});

// ---------------------------------------------------------------------------
// destinationHost - outbound attribution without shipping the URL
// ---------------------------------------------------------------------------

test('destinationHost returns a bare host and strips www', () => {
  assert.equal(destinationHost('https://www.opentable.com.au/r/x?ref=pi'), 'opentable.com.au');
  assert.equal(destinationHost('http://Example.COM/path'), 'example.com');
});

test('destinationHost refuses anything that is not an absolute http(s) URL', () => {
  assert.equal(destinationHost('/eat/doot-doot/'), '');
  assert.equal(destinationHost('mailto:corrections@peninsulainsider.com.au'), '');
  assert.equal(destinationHost('tel:+61412345678'), '');
  assert.equal(destinationHost('javascript:alert(1)'), '');
  assert.equal(destinationHost(''), '');
  assert.equal(destinationHost(undefined), '');
  assert.equal(destinationHost(42), '');
});

test('destinationHost never leaks the query string', () => {
  const host = destinationHost('https://book.example.com/r?email=jane%40example.com&aff=pi');
  assert.equal(host, 'book.example.com');
  assert.ok(!host.includes('@'));
});

// ---------------------------------------------------------------------------
// safePagePath / lengthBucket
// ---------------------------------------------------------------------------

test('safePagePath strips the query string, which is where search terms live', () => {
  assert.equal(safePagePath('/search/?q=where+to+propose&kind=all'), '/search/');
  assert.equal(safePagePath('/eat/#menu'), '/eat/');
  assert.equal(safePagePath(''), '/');
  assert.equal(safePagePath(null), '/');
});

test('lengthBucket reports shape, never content', () => {
  assert.equal(lengthBucket(''), 'empty');
  assert.equal(lengthBucket('  '), 'empty');
  assert.equal(lengthBucket('pub'), 'xs');
  assert.equal(lengthBucket('pub food'), 's');
  assert.equal(lengthBucket('best cellar door for a long lunch'), 'l');
  assert.equal(lengthBucket('x'.repeat(61)), 'xl');
});

// ---------------------------------------------------------------------------
// eventEnvelope
// ---------------------------------------------------------------------------

const CTX = {
  eventId: 'evt-1',
  timestamp: '2026-09-13T01:02:03.000Z',
  pagePath: '/search/?q=secret',
  release: 'abc1234',
  consentState: 'granted',
};

test('eventEnvelope stamps identity, consent and release on every event', () => {
  const out = eventEnvelope('search_submitted', { surface: 'overlay' }, CTX);
  assert.equal(out.pi_event, 'search_submitted');
  assert.equal(out.pi_event_id, 'evt-1');
  assert.equal(out.pi_ts, '2026-09-13T01:02:03.000Z');
  assert.equal(out.pi_page, '/search/', 'the query string must not survive');
  assert.equal(out.pi_release, 'abc1234');
  assert.equal(out.pi_consent, 'granted');
  assert.equal(out.pi_schema, ANALYTICS_SCHEMA_VERSION);
  assert.equal(out.surface, 'overlay');
});

test('eventEnvelope sanitises the payload and reports the redaction count', () => {
  const out = eventEnvelope('partner_enquiry_submitted', {
    email: 'jane@example.com',
    notes: 'we would like to talk about a campaign',
    business_category: 'winery-cellar-door',
  }, CTX);
  assert.equal(out.email, undefined);
  assert.equal(out.notes, undefined);
  assert.equal(out.business_category, 'winery-cellar-door');
  assert.equal(out.pi_redacted, 2);
});

test('eventEnvelope omits pi_redacted when nothing was removed', () => {
  const out = eventEnvelope('save_succeeded', { entity_type: 'venue' }, CTX);
  assert.equal('pi_redacted' in out, false);
});

test('eventEnvelope records the component when one is supplied', () => {
  const out = eventEnvelope('book_out', {}, { ...CTX, component: 'BookingControl' });
  assert.equal(out.pi_component, 'BookingControl');
});

// ---------------------------------------------------------------------------
// makeDeduper - one intent, one event
// ---------------------------------------------------------------------------

test('deduper admits the first call and rejects a repeat inside the window', () => {
  const gate = makeDeduper();
  assert.equal(gate('book:venue/jackalope', undefined, 1_000), true);
  assert.equal(gate('book:venue/jackalope', undefined, 1_100), false);
  assert.equal(gate('book:venue/jackalope', undefined, 1_000 + DEFAULT_DEDUP_MS), true);
});

test('deduper keys are independent', () => {
  const gate = makeDeduper();
  assert.equal(gate('a', undefined, 0), true);
  assert.equal(gate('b', undefined, 0), true);
  assert.equal(gate('a', undefined, 10), false);
});

test('deduper honours a per-call window', () => {
  const gate = makeDeduper(1000);
  assert.equal(gate('x', 50, 0), true);
  assert.equal(gate('x', 50, 40), false);
  assert.equal(gate('x', 50, 60), true);
});

test('deduper does not grow without bound across a long session', () => {
  const gate = makeDeduper(10);
  for (let i = 0; i < 500; i += 1) gate(`k${i}`, 10, i);
  // The sweep runs on insert once the map passes its cap; after 500 distinct
  // keys spread over 500ms with a 10ms window, almost all are expired and
  // collected. Assert the gate still functions rather than a precise size.
  assert.equal(gate('k0', 10, 10_000), true);
});

test('deduper reset clears history', () => {
  const gate = makeDeduper();
  assert.equal(gate('a', undefined, 0), true);
  gate.reset();
  assert.equal(gate('a', undefined, 1), true);
});

// ---------------------------------------------------------------------------
// bookingClickDecision - the rule behind the site's most commercial number
// ---------------------------------------------------------------------------

const SITE = 'peninsulainsider.com.au';

test('bookingClickDecision counts a marked outbound booking link', () => {
  const d = bookingClickDecision({
    href: 'https://www.opentable.com.au/r/doot-doot?ref=pi',
    siteHost: SITE,
    kind: 'booking',
    entityType: 'restaurant',
    entitySlug: 'doot-doot',
    surface: 'venue-booking-bar',
    provider: 'opentable',
  });
  assert.equal(d.fire, true);
  assert.equal(d.reason, 'ok');
  assert.deepEqual(d.params, {
    booking_kind: 'booking',
    destination_host: 'opentable.com.au',
    entity_type: 'restaurant',
    entity_id: 'doot-doot',
    surface: 'venue-booking-bar',
    provider: 'opentable',
  });
});

test('bookingClickDecision refuses a link that was never marked as a booking', () => {
  // The "visit website" links across the site are outbound and absolutely
  // must not be counted as reservation intent.
  const d = bookingClickDecision({ href: 'https://jackalopehotel.com/', siteHost: SITE });
  assert.equal(d.fire, false);
  assert.equal(d.reason, 'not-marked');
  assert.deepEqual(d.params, {});
});

test('bookingClickDecision refuses an internal link even when marked', () => {
  const d = bookingClickDecision({
    href: 'https://peninsulainsider.com.au/eat/doot-doot/',
    siteHost: SITE,
    kind: 'booking',
  });
  assert.equal(d.fire, false);
  assert.equal(d.reason, 'internal');
});

test('bookingClickDecision refuses relative, tel and mailto hrefs', () => {
  for (const href of ['/eat/doot-doot/', 'tel:+61312345678', 'mailto:a@b.com', '#book', '']) {
    const d = bookingClickDecision({ href, siteHost: SITE, kind: 'booking' });
    assert.equal(d.fire, false, `${href} must not count as an outbound booking`);
    assert.equal(d.reason, 'not-absolute');
  }
});

test('bookingClickDecision treats www and the bare host as the same site', () => {
  const d = bookingClickDecision({
    href: 'https://www.peninsulainsider.com.au/stay/',
    siteHost: 'peninsulainsider.com.au',
    kind: 'booking',
  });
  assert.equal(d.reason, 'internal');
});

test('bookingClickDecision never carries the query string off an affiliate link', () => {
  const d = bookingClickDecision({
    href: 'https://book.example.com/r?email=jane%40example.com&aff=pi&sid=abc',
    siteHost: SITE,
    kind: 'tickets',
  });
  assert.equal(d.fire, true);
  assert.equal(d.params.destination_host, 'book.example.com');
  for (const value of Object.values(d.params)) {
    assert.ok(!String(value).includes('@'), 'no payload value may carry an address');
    assert.ok(!String(value).includes('aff='), 'no payload value may carry the query');
  }
});

test('bookingClickDecision still fires when the site host is unknown', () => {
  // Server-side rendering, a sandboxed iframe or a file:// preview can leave
  // location.hostname empty. Failing closed there would silently zero the
  // metric, so an unknown site host only disables the internal-link guard.
  const d = bookingClickDecision({ href: 'https://opentable.com.au/r/x', siteHost: '', kind: 'booking' });
  assert.equal(d.fire, true);
});

test('bookingClickDecision output survives the sanitiser unchanged', () => {
  const d = bookingClickDecision({
    href: 'https://res.example.com/book',
    siteHost: SITE,
    kind: 'booking',
    entitySlug: 'ten-minutes-by-tractor',
  });
  const { params, redacted } = sanitiseParams(d.params);
  assert.equal(redacted, 0);
  assert.deepEqual(params, d.params);
});

// ---------------------------------------------------------------------------
// partnerEnquiryShape - a form full of personal data, measured anyway
// ---------------------------------------------------------------------------

/** The real partner enquiry form, filled in the way a real partner fills it. */
const ENQUIRY = [
  ['business_name', 'Ten Minutes by Tractor'],
  ['contact_name', 'Jane Doe'],
  ['email', 'jane.doe@example.com'],
  ['business_category', 'winery-cellar-door'],
  ['website_or_instagram', 'https://tenminutesbytractor.com.au'],
  ['interest', 'seasonal-campaign'],
  ['notes', 'We are opening a new tasting room in spring and would like to reach visitors planning a long lunch.'],
];

test('partnerEnquiryShape keeps the categories and drops everything identifying', () => {
  const shape = partnerEnquiryShape(ENQUIRY);
  assert.equal(shape.business_category, 'winery-cellar-door');
  assert.equal(shape.interest, 'seasonal-campaign');
  assert.equal(shape.has_website, true);
  assert.equal(shape.notes_length, 'xl');
  assert.equal(shape.fields_provided, 7);
  assert.equal(shape.business_name, undefined);
  assert.equal(shape.contact_name, undefined);
  assert.equal(shape.email, undefined);
  assert.equal(shape.notes, undefined);
  assert.equal(shape.website_or_instagram, undefined);
});

test('partnerEnquiryShape output contains no value from the form', () => {
  const shape = partnerEnquiryShape(ENQUIRY);
  const serialised = JSON.stringify(shape);
  for (const [, value] of ENQUIRY) {
    if (value === 'winery-cellar-door' || value === 'seasonal-campaign') continue;
    assert.ok(!serialised.includes(value), `"${value}" must not reach a payload`);
  }
  assert.ok(!serialised.includes('@'), 'no address may reach a payload');
});

test('partnerEnquiryShape reports an empty optional field without inventing one', () => {
  const shape = partnerEnquiryShape([
    ['business_name', 'A'],
    ['contact_name', 'B'],
    ['email', 'c@d.com'],
    ['business_category', 'other'],
    ['website_or_instagram', '   '],
    ['interest', ''],
    ['notes', ''],
  ]);
  assert.equal(shape.has_website, false);
  assert.equal(shape.notes_length, 'empty');
  assert.equal('interest' in shape, false, 'an unanswered select is absent, not empty-string');
  assert.equal(shape.fields_provided, 4);
});

test('partnerEnquiryShape survives a field added to the form later', () => {
  // A future field is identifying until proven otherwise: the default branch
  // measures nothing but the provided count.
  const shape = partnerEnquiryShape([
    ['business_category', 'event'],
    ['phone', '+61 412 345 678'],
    ['abn', '12 345 678 901'],
  ]);
  assert.equal(shape.phone, undefined);
  assert.equal(shape.abn, undefined);
  assert.equal(shape.fields_provided, 3);
  assert.equal(sanitiseParams(shape).redacted, 0);
});

// ---------------------------------------------------------------------------
// Whole-envelope guards for the events this ticket added
// ---------------------------------------------------------------------------

test('a booking_outbound_clicked envelope carries consent and release', () => {
  const d = bookingClickDecision({
    href: 'https://opentable.com.au/r/x',
    siteHost: SITE,
    kind: 'booking',
    entitySlug: 'doot-doot',
  });
  const out = eventEnvelope('booking_outbound_clicked', d.params, {
    ...CTX,
    consentState: 'denied',
    component: 'OutboundBooking',
  });
  assert.equal(out.pi_event, 'booking_outbound_clicked');
  assert.equal(out.pi_consent, 'denied');
  assert.equal(out.pi_release, 'abc1234');
  assert.equal(out.pi_component, 'OutboundBooking');
  assert.equal(out.destination_host, 'opentable.com.au');
});

test('a trip_copy envelope never carries the share URL or a day label', () => {
  // The /itinerary/ share URL encodes stop slugs AND reader-typed day labels.
  // The call site passes counts only; this asserts the contract would strip
  // the URL even if a future call site forgot.
  const out = eventEnvelope('trip_copy_succeeded', {
    attempt_id: 'a1',
    surface: 'itinerary',
    stop_count: 6,
    day_count: 2,
    method: 'clipboard',
    share_url: 'https://peninsulainsider.com.au/itinerary/?i=venue:doot-doot:d1&d=d1:Emma%20and%20Dad',
  }, CTX);
  assert.equal(out.share_url, undefined, 'the share URL is too long to survive, and must not');
  assert.equal(out.stop_count, 6);
  assert.equal(out.pi_redacted, 1);
});

test('a search envelope carries a length bucket and never the query', () => {
  const query = 'where to propose in sorrento';
  const out = eventEnvelope('search_submitted', {
    surface: 'search_page',
    trigger: 'submit',
    query_length: lengthBucket(query),
    result_count: 0,
    zero_results: true,
  }, { ...CTX, pagePath: `/search/?q=${encodeURIComponent(query)}` });
  assert.equal(out.query_length, 'l');
  assert.equal(out.pi_page, '/search/');
  assert.ok(!JSON.stringify(out).includes('propose'), 'the query must not appear anywhere');
});

test('a filter_applied envelope carries facet slugs, which are a closed vocabulary', () => {
  const out = eventEnvelope('filter_applied', {
    interaction_source: 'url',
    noun: 'places',
    filter_keys: 'cat|mood|place',
    filter_count: 4,
    results_shown: 12,
    results_total: 88,
    cleared: false,
  }, CTX);
  assert.equal(out.filter_keys, 'cat|mood|place');
  assert.equal(out.filter_count, 4);
  assert.equal('pi_redacted' in out, false);
});

test('reserved GA4 attribution keys never survive a custom event envelope', () => {
  const out = eventEnvelope('note_popup_shown', {
    source: 'scroll',
    medium: 'popup',
    campaign: 'spring',
    interaction_source: 'scroll',
  }, CTX);
  assert.equal(out.source, undefined);
  assert.equal(out.medium, undefined);
  assert.equal(out.campaign, undefined);
  assert.equal(out.interaction_source, 'scroll');
  assert.equal(out.pi_redacted, 3);
});
