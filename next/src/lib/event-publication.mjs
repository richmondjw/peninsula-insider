/** Reader-facing safeguards for event intelligence records. */
export function isVerifiedPriceRecord(price) {
  if (!price || typeof price.label !== 'string' || !price.label.trim() || price.label.length > 300) return false;
  try {
    const source = new URL(price.sourceUrl);
    if (!['https:', 'http:'].includes(source.protocol) || source.username || source.password) return false;
  } catch { return false; }
  if (price.checkedAt == null || price.validUntil == null) return false;
  const checked = new Date(price.checkedAt).getTime();
  const expires = new Date(price.validUntil).getTime();
  return Number.isFinite(checked) && Number.isFinite(expires) && expires > checked;
}

export function currentVerifiedPrice(data, now = new Date()) {
  const price = data?.verifiedPrice;
  if (!isVerifiedPriceRecord(price)) return null;
  const checked = new Date(price.checkedAt).getTime();
  const expires = new Date(price.validUntil).getTime();
  const instant = new Date(now).getTime();
  // Seven days is the maximum unattended freshness window. A source may
  // assign a shorter validity; fresh retrieval is required to extend it.
  if (!Number.isFinite(instant) || checked > instant || instant >= expires || instant - checked >= 7 * 86400000) return null;
  return { ...price, label: price.label.trim(), expiresAt: new Date(Math.min(expires, checked + 7 * 86400000)).toISOString() };
}

export function eventContentKind(data) {
  if (['event', 'experience', 'offer'].includes(data?.contentKind)) return data.contentKind;
  return data?.dateBasis && data.dateBasis !== 'fixed' ? 'experience' : 'event';
}

export function isPublicEventRecord(data, now = new Date()) {
  const publishedArchive = data?.status === 'archived' && data?.publishedAt != null && Number.isFinite(new Date(data.publishedAt).getTime()) && new Date(data.publishedAt) <= new Date(now);
  if (!['published', 'expired', 'past'].includes(data?.status) && !publishedArchive) return false;
  // Legacy publication defaults remain intact. Intelligence imports carry
  // an explicit approval receipt; incomplete receipts cannot expose a URL.
  if (!data.intelligence) return true;
  const receipt = data.intelligence;
  return Boolean(receipt.revision && receipt.approvedBy === 'James' && receipt.approvedAt != null && receipt.reviewedAt != null &&
    Number.isFinite(new Date(receipt.approvedAt).getTime()) &&
    Number.isFinite(new Date(receipt.reviewedAt).getTime()) &&
    new Date(receipt.approvedAt) <= new Date(now) &&
    new Date(receipt.reviewedAt) <= new Date(now) &&
    Number.isFinite(receipt.factScore) && receipt.factScore >= 90 &&
    Array.isArray(receipt.evidenceIds) && receipt.evidenceIds.length);
}

/** Prices start hidden in static HTML and appear only after a current-time check. */
export function refreshVerifiedPriceElements(root, now = Date.now()) {
  let nextExpiry = Infinity;
  for (const row of root.querySelectorAll('[data-verified-price]')) {
    const checked = new Date(row.getAttribute('data-price-checked')).getTime();
    const expiry = new Date(row.getAttribute('data-price-expiry')).getTime();
    const current = Number.isFinite(checked) && Number.isFinite(expiry) && checked <= now && now < expiry;
    const value = row.querySelector('[data-price-current]');
    const fallback = row.querySelector('[data-price-fallback]');
    if (value) value.hidden = !current;
    if (fallback) fallback.hidden = current;
    if (current) nextExpiry = Math.min(nextExpiry, expiry);
  }
  return Number.isFinite(nextExpiry) ? nextExpiry : null;
}
