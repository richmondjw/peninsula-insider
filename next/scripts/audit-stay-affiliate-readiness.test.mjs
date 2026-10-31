import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStayAffiliateReadiness } from './audit-stay-affiliate-readiness.mjs';

const venue = (slug, data) => ({ slug, data: { type: 'hotel', ...data } });

test('only listable accommodation is considered; spas and delisted stays are excluded', () => {
  const result = auditStayAffiliateReadiness([
    venue('stay', { bookingUrl: 'https://operator.example/book' }),
    venue('spa', { type: 'spa' }),
    venue('closed', { status: 'permanently_closed' }),
    venue('paused', { status: 'paused', sourceStatus: 'unsourced' }),
    venue('ineligible', { stayEligible: false }),
  ]);
  assert.equal(result.accommodationRecords, 3);
  assert.equal(result.listedStayRecords, 1);
  assert.equal(result.explicitBookingUrl, 1);
});

test('flags missing destinations and unresolved operation without inventing links', () => {
  const result = auditStayAffiliateReadiness([
    venue('uncertain', { operatingStatus: 'verify-open', sourceStatus: 'unsourced' }),
    venue('fallback', { website: 'https://operator.example' }),
  ]);
  assert.deepEqual(result.review.missingDestination, ['uncertain']);
  assert.deepEqual(result.review.operatingStatusUnresolved, ['uncertain']);
  assert.equal(result.websiteFallback, 1);
  assert.deepEqual(result.review.websiteFallbackNeedsReview, ['fallback']);
});

test('platform provider labels with operator URLs need review, not automatic rewrites', () => {
  const result = auditStayAffiliateReadiness([
    venue('mismatch', { bookingProvider: 'booking.com', bookingUrl: 'https://operator.example' }),
    venue('platform', { bookingProvider: 'booking.com', bookingUrl: 'https://www.booking.com/hotel/au/example.html' }),
    venue('airbnb-mismatch', { bookingProvider: 'airbnb', bookingUrl: 'https://operator.example' }),
  ]);
  assert.deepEqual(result.review.providerDestinationMismatch, ['airbnb-mismatch', 'mismatch']);
  assert.equal(result.providerCounts['booking.com'], 2);
});

test('report omits raw URLs and flags existing commercial metadata', () => {
  const secret = 'account-token-must-not-be-logged';
  const result = auditStayAffiliateReadiness([
    venue('commercial', {
      bookingUrl: `https://operator.example/?ref=${secret}`,
      affiliateNote: 'Affiliate link',
    }),
  ]);
  assert.deepEqual(result.review.commercialMetadataPresent, ['commercial']);
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(JSON.stringify(result).includes('operator.example'), false);
});
