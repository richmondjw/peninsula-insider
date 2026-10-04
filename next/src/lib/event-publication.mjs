/** Canonical approved public content. This detects drift; authenticated approval remains external. */
const approvedFields = ('slug eventId contentKind title summary description category subcategory startDate endDate nextOccurrence sourceUpdatedAt sourceReview retiredSourceLinks startTime endTime endsNextDay timezone venue venueName place venueRegion suburb streetAddress coordinates indoorOutdoor bookingUrl ticketingUrl officialEventUrl primarySourceUrl secondarySourceUrl bookingRequired bookingStatus bookingStatusNote bookingStatusSourceUrl bookingStatusCheckedAt freePaid priceTier recurrence recurrenceNote dateBasis occurrenceExceptions seriesOccurrences verifiedPrice suitableFor audienceTags familyFriendly petFriendly accessibilityNotes weather weatherDependency weatherShape organiser verification verificationStatus verificationNote lastVerifiedAt lastCheckedDate visitorAppealScore editorialPriority nearbyAttractions suggestedItineraryPairing nearestVenues worthTheDrive firstTimer skipThis skipReason skipInstead editorVerdict whyWeCare standoutOfMonth pairingProse editorVisited featuredInDispatch relatedArticles lens editorNote heroImage cancelled cancelledOn cancellationNote cancellationSourceUrl cancellationSourceLabel postponed postponedOn postponedFrom rescheduledTo postponementNote postponementSourceUrl postponementSourceLabel expiresAt').split(' ');
const approvalDefaults = {timezone:'Australia/Melbourne',bookingStatus:'unknown',recurrence:'one-off',occurrenceExceptions:[],audienceTags:[],weather:'mixed',nearestVenues:[],worthTheDrive:false,firstTimer:false,skipThis:false,standoutOfMonth:false,editorVisited:false,relatedArticles:[],lens:[],cancelled:false,postponed:false};
const dayFields = new Set(['startDate','endDate','nextOccurrence','postponedFrom','rescheduledTo']);
const instantFields = new Set(['sourceUpdatedAt','checkedAt','coordinateCheckedAt','validUntil','lastVerifiedAt','lastCheckedDate','bookingStatusCheckedAt','cancelledOn','postponedOn','expiresAt']);
function approvedValue(value,key='') {
  if (value == null) return value;
  if (dayFields.has(key) || instantFields.has(key)) {const date = new Date(value);if (!Number.isFinite(date.getTime())) return String(value);return dayFields.has(key)?date.toISOString().slice(0,10):date.toISOString();}
  if (['place','venue'].includes(key)) return typeof value === 'string' ? value : value.id;
  if (Array.isArray(value)) return value.map(item => approvedValue(item));
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,approvedValue(value[k],k)]));
  return value;
}
export function approvedEventContent(data) {
  const content={};
  for (const key of approvedFields) {const value=data?.[key] ?? approvalDefaults[key];if(value!==undefined)content[key]=approvedValue(value,key);}
  if(data?.intelligence?.geography)content.geography=approvedValue(data.intelligence.geography);
  return JSON.stringify(content);
}

/** Explicit public payload; never serialize whole CMS records into browser attributes. */
export function publicEventData(data) {
  const content=JSON.parse(approvedEventContent(data));
  delete content.geography;
  for(const key of ['status','publishedAt','archivedAt','archivedReason'])if(data?.[key]!=null)content[key]=data[key];
  if(data?.intelligence){const receipt=data.intelligence;content.intelligence=Object.fromEntries(['revision','approvedContent','approvedBy','approvedAt','reviewedAt','factScore','evidenceIds','geography'].filter(key=>receipt[key]!==undefined).map(key=>[key,receipt[key]]));}
  return content;
}

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
  return Boolean(typeof receipt.approvedContent === 'string' && receipt.approvedContent === approvedEventContent(data) && receipt.revision && receipt.approvedBy === 'James' && receipt.approvedAt != null && receipt.reviewedAt != null &&
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
