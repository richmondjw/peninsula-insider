/**
 * Staged accommodation affiliate decision. No call site uses this yet.
 * Defaults cannot emit a paid link; account-specific data must be supplied
 * only after advertiser approval and destination review.
 */
export const STAY_AFFILIATE_DISCLOSURE =
  'We may earn a commission if you book through this link, at no extra cost to you.';

function httpsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function isBookingHost(hostname) {
  return hostname === 'booking.com' || hostname.endsWith('.booking.com');
}

function validReviewDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * `approvedTrackingHosts` must come from an independently checked account
 * link, never from the supplied welcome pack's sample identifiers.
 * `destinationVerified` means the final property landing was checked outside
 * this pure function; URL syntax alone cannot establish a matching property.
 */
export function resolveStayAffiliateLink({
  verifiedDirectUrl,
  eligible = false,
  featureEnabled = false,
  advertiserApproved = false,
  affiliate = null,
  approvedTrackingHosts = [],
} = {}) {
  const direct = httpsUrl(verifiedDirectUrl);
  if (!eligible || !direct) return { kind: 'none', href: null };

  const fallback = { kind: 'direct', href: direct.href, rel: 'noopener noreferrer' };
  if (!featureEnabled || !advertiserApproved || !affiliate) return fallback;
  if (affiliate.status !== 'approved' || affiliate.destinationVerified !== true ||
      affiliate.venueMatchVerified !== true || affiliate.disclosureReady !== true ||
      !validReviewDate(affiliate.verifiedOn)) return fallback;

  const tracking = httpsUrl(affiliate.trackingUrl);
  const target = httpsUrl(affiliate.targetUrl);
  if (!tracking || !target || !isBookingHost(target.hostname) || target.pathname === '/') return fallback;
  if (isBookingHost(tracking.hostname) ||
      !Array.isArray(approvedTrackingHosts) ||
      !approvedTrackingHosts.includes(tracking.hostname)) return fallback;

  return {
    kind: 'affiliate',
    href: tracking.href,
    rel: 'sponsored noopener noreferrer',
    disclosure: STAY_AFFILIATE_DISCLOSURE,
    provider: 'booking.com',
  };
}
