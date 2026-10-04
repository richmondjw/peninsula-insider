/** Build event pins only from shared, eligible promotions and explicit location proof. */
export function eventMapItems(promotions, { now = new Date() } = {}) {
  const instant = new Date(now).getTime();
  if (!Number.isFinite(instant)) return [];
  return promotions.flatMap(promotion => {
    const data = promotion.event?.data;
    const proof = data?.intelligence?.geography;
    const coordinates = data?.coordinates;
    if (proof?.shireConfirmed !== true || proof?.verifiedBy !== 'James' || !proof.evidenceId || !proof.coordinateEvidenceId) return [];
    const checked = new Date(proof.checkedAt).getTime();
    const coordinateChecked = new Date(proof.coordinateCheckedAt).getTime();
    if (!Number.isFinite(coordinateChecked) || coordinateChecked > instant || instant - coordinateChecked >= 7 * 86400000) return [];
    if (!Number.isFinite(checked) || checked > instant || instant - checked >= 7 * 86400000) return [];
    if (!coordinates || coordinates.lat === 0 || coordinates.lng === 0 || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng) || Math.abs(coordinates.lat) > 90 || Math.abs(coordinates.lng) > 180) return [];
    if (coordinates.lat !== proof.coordinates?.lat || coordinates.lng !== proof.coordinates?.lng) return [];
    try { const source = new URL(proof.coordinateSourceUrl); if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password) return []; } catch { return []; }
    // A moved session must carry its own effective location proof; an original
    // venue's point must never be reused at a different destination.
    if (promotion.originalEvent?.data?.venueName !== data.venueName) return [];
    const end = new Date(promotion.occurrence?.endsAt).getTime();
    if (!Number.isFinite(end) || end < instant) return [];
    const recordExpiry = data.expiresAt ? new Date(data.expiresAt).getTime() : Infinity;
    if (Number.isNaN(recordExpiry) || recordExpiry <= instant) return [];
    const expiresAt = new Date(Math.min(end + 1, checked + 7 * 86400000, coordinateChecked + 7 * 86400000, recordExpiry)).toISOString();
    const label = promotion.kind === 'offer' ? 'Offer' : promotion.kind === 'experience' ? 'Experience' : 'Event';
    return [{ id: 'event:' + promotion.slug, kind: 'event', slug: promotion.slug,
      title: data.title, href: promotion.href, lat: coordinates.lat, lng: coordinates.lng,
      verdict: String(data.editorVerdict ?? data.summary ?? '').split(/\s+/).slice(0, 25).join(' '),
      meta: [label, promotion.dateLabel, data.suburb].filter(Boolean), group: /** @type {'event'} */ ('event'),
      eventData: data, day: promotion.day, expiresAt }];
  });
}
