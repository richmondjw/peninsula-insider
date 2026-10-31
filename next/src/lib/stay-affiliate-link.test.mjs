import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStayAffiliateLink, STAY_AFFILIATE_DISCLOSURE } from './stay-affiliate-link.mjs';

const direct = 'https://operator.example/stay';
const target = 'https://www.booking.com/hotel/au/example.html';
const candidate = {
  status: 'approved',
  trackingUrl: `https://tracking.example/click?url=${encodeURIComponent(target)}`,
  targetUrl: target,
  verifiedOn: '2026-10-01',
  destinationVerified: true,
  venueMatchVerified: true,
  disclosureReady: true,
};
const ready = {
  verifiedDirectUrl: direct,
  eligible: true,
  featureEnabled: true,
  advertiserApproved: true,
  affiliate: candidate,
  approvedTrackingHosts: ['tracking.example'],
};

test('defaults to no link, or a verified direct link, never a paid one', () => {
  assert.deepEqual(resolveStayAffiliateLink(), { kind: 'none', href: null });
  const result = resolveStayAffiliateLink({ ...ready, featureEnabled: false });
  assert.equal(result.kind, 'direct');
  assert.equal(result.href, direct);
  assert.equal('disclosure' in result, false);
  assert.equal(result.rel.includes('sponsored'), false);
});

test('every approval, destination and disclosure gate is required', () => {
  const cases = [
    { advertiserApproved: false },
    { approvedTrackingHosts: [] },
    { approvedTrackingHosts: 'not-tracking.example' },
    { affiliate: { ...candidate, status: 'pending' } },
    { affiliate: { ...candidate, destinationVerified: false } },
    { affiliate: { ...candidate, venueMatchVerified: false } },
    { affiliate: { ...candidate, disclosureReady: false } },
    { affiliate: { ...candidate, verifiedOn: '' } },
    { affiliate: { ...candidate, verifiedOn: '2026-02-30' } },
    { affiliate: { ...candidate, trackingUrl: 'http://tracking.example/click' } },
    { affiliate: { ...candidate, trackingUrl: 'https://tracking.example.evil/click' } },
    { affiliate: { ...candidate, targetUrl: 'https://booking.com.evil/hotel/au/example.html' } },
    { affiliate: { ...candidate, targetUrl: 'https://www.booking.com/' } },
  ];
  for (const change of cases) {
    assert.equal(resolveStayAffiliateLink({ ...ready, ...change }).kind, 'direct');
  }
});

test('unverified or ineligible stays have no CTA, including no affiliate CTA', () => {
  assert.deepEqual(resolveStayAffiliateLink({ ...ready, eligible: false }), { kind: 'none', href: null });
  assert.deepEqual(resolveStayAffiliateLink({ ...ready, verifiedDirectUrl: undefined }), { kind: 'none', href: null });
  assert.deepEqual(resolveStayAffiliateLink({ ...ready, verifiedDirectUrl: 'javascript:alert(1)' }), { kind: 'none', href: null });
});

test('reviewed candidate is disclosed and marked sponsored', () => {
  const result = resolveStayAffiliateLink(ready);
  assert.equal(result.kind, 'affiliate');
  assert.equal(result.href, candidate.trackingUrl);
  assert.equal(result.rel, 'sponsored noopener noreferrer');
  assert.equal(result.disclosure, STAY_AFFILIATE_DISCLOSURE);
  assert.equal(result.provider, 'booking.com');
});
