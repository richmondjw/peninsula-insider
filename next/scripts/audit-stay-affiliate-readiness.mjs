/**
 * Read-only inventory for a prospective stays affiliate rollout.
 * This does not validate an advertiser account, create a tracking URL, or
 * change any reader-facing link. Run again after each content review.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STAY_TYPES = new Set(['hotel', 'villa', 'cottage', 'glamping', 'farm-stay']);
const CONTENT_DIR = fileURLToPath(new URL('../src/content/venues/', import.meta.url));

function hostOf(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

function isHostOrSubdomain(host, domain) {
  return host === domain || host?.endsWith(`.${domain}`) === true;
}

function providerMatchesDestination(provider, host) {
  if (provider === 'booking.com') return isHostOrSubdomain(host, 'booking.com');
  if (provider === 'airbnb') return ['airbnb.com', 'airbnb.com.au'].some((domain) =>
    isHostOrSubdomain(host, domain));
  if (provider === 'stayz') return ['stayz.com', 'stayz.com.au'].some((domain) =>
    isHostOrSubdomain(host, domain));
  return true;
}

/** Keep raw URLs, tracking parameters and account identifiers out of the report. */
export function auditStayAffiliateReadiness(entries) {
  const accommodation = entries.filter(({ data }) =>
    STAY_TYPES.has(data.type) && data.stayEligible !== false,
  );
  const listed = accommodation.filter(({ data }) =>
    data.status !== 'permanently_closed' &&
    data.operatingStatus !== 'permanently-closed' &&
    !(data.status === 'paused' && data.sourceStatus === 'unsourced'),
  );

  const providerCounts = {};
  const missingDestination = [];
  const websiteFallbackNeedsReview = [];
  const providerDestinationMismatch = [];
  const operatingStatusUnresolved = [];
  const commercialMetadataPresent = [];
  let explicitBookingUrl = 0;
  let websiteFallback = 0;

  for (const { slug, data } of listed) {
    const provider = data.bookingProvider || 'unspecified';
    providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    const destination = data.bookingUrl || data.website;
    if (data.bookingUrl) explicitBookingUrl++;
    else if (data.website) {
      websiteFallback++;
      websiteFallbackNeedsReview.push(slug);
    }
    else missingDestination.push(slug);

    // This is a review flag, not a claim that an account or property is eligible.
    if (destination && !providerMatchesDestination(provider, hostOf(destination))) {
      providerDestinationMismatch.push(slug);
    }
    if (data.operatingStatus === 'verify-open' || data.sourceStatus === 'unsourced') {
      operatingStatusUnresolved.push(slug);
    }
    if (data.affiliateUrl || data.affiliateNote || data.featuredPartner === true) {
      commercialMetadataPresent.push(slug);
    }
  }

  return {
    totalVenueRecords: entries.length,
    accommodationRecords: accommodation.length,
    listedStayRecords: listed.length,
    explicitBookingUrl,
    websiteFallback,
    providerCounts,
    review: {
      missingDestination: missingDestination.sort(),
      websiteFallbackNeedsReview: websiteFallbackNeedsReview.sort(),
      providerDestinationMismatch: providerDestinationMismatch.sort(),
      operatingStatusUnresolved: operatingStatusUnresolved.sort(),
      commercialMetadataPresent: commercialMetadataPresent.sort(),
    },
    caveat: 'Inventory only. No advertiser approval, property mapping, destination test, disclosure or release is implied.',
  };
}

async function main() {
  const names = (await readdir(CONTENT_DIR)).filter((name) =>
    name.endsWith('.json') && !name.startsWith('_'),
  );
  const entries = await Promise.all(names.map(async (name) => ({
    slug: name.slice(0, -5),
    data: JSON.parse(await readFile(path.join(CONTENT_DIR, name), 'utf8')),
  })));
  const result = auditStayAffiliateReadiness(entries);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Stay affiliate readiness audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}
