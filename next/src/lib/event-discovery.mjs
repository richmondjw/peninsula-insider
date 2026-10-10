import { startOfDay, addDays, isoDate, ruleFor, occursOnDay } from './event-schedule.ts';
import { eventContentKind, isPublicEventRecord, currentVerifiedPrice } from './event-publication.mjs';
import { recordDisposition } from './event-occurrence.mjs';
import { resolveListingOccurrence } from './whatson-listing.mjs';

// Exact town identities, never title matching or a Peninsula-wide substring.
// Border locality Pearcedale requires an explicit reviewed Shire receipt.
const SHIRE_PLACES = new Set('arthurs-seat balnarring balnarring-beach bittern blairgowrie boneo cape-schanck capel-sound crib-point dromana fingal flinders hastings main-ridge mccrae merricks merricks-beach merricks-north moorooduc mornington mount-eliza mount-martha point-leo point-nepean portsea red-hill red-hill-south rosebud rye safety-beach shoreham somers sorrento st-andrews-beach stony-point tootgarook tuerong tyabb'.split(' '));
const ref = value => typeof value === 'string' ? value : value?.id ?? '';
const identity = value => String(ref(value)).trim().toLowerCase().replace(/[.'’]/g, '').replace(/\s+/g, '-');
function reviewedGeography(data, now) {
  const geo = data?.intelligence?.geography;
  const checked = Date.parse(geo?.checkedAt);
  return geo?.shireConfirmed === true && geo.verifiedBy === 'James' && typeof geo.evidenceId === 'string' && geo.evidenceId.trim() && Number.isFinite(checked) && checked <= now.getTime() && now.getTime() - checked < 7 * 86400000;
}
export function hasPromotionGeography(data, now = new Date()) {
  const places = [identity(data?.place), identity(data?.suburb)].filter(Boolean);
  // Conflicting/out-of-scope explicit towns cannot be overridden by a receipt.
  if (places.some(place => !SHIRE_PLACES.has(place) && place !== 'pearcedale')) return false;
  if (data?.intelligence) return Boolean(reviewedGeography(data, now));
  return places.length > 0 && places.every(place => SHIRE_PLACES.has(place));
}

/** Pure, clock-bound promotion projection. Input order preserves editorial ranking. */
export function selectEventPromotions(entries, { now = new Date(), windowDays = 30, windowStart, placeId, venueId, limit = Infinity } = {}) {
  now = new Date(now);
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(windowDays) || windowDays < 1 || windowDays > 366 || !(limit > 0)) return [];
  if (windowStart && !Number.isFinite(new Date(windowStart).getTime())) return [];
  const today = startOfDay(now), start = windowStart ? startOfDay(new Date(windowStart)) : today;
  if (!Number.isFinite(start.getTime())) return [];
  const end = addDays(start, windowDays - 1), output = [], used = new Set();
  for (const supplied of entries ?? []) {
    const originalEvent = supplied?.data?._promotionOriginal ?? supplied;
    const data = originalEvent?.data;
    if (!data || data.status !== 'published' || !data.title || !isPublicEventRecord(data, now) || !hasPromotionGeography(data, now)) continue;
    const disposition = recordDisposition(data, now);
    if (!disposition.promotable) continue;
    const datedData = {...data};
    for (const key of ['startDate','endDate','nextOccurrence']) if (datedData[key]) datedData[key] = new Date(datedData[key]);
    if (['startDate','endDate','nextOccurrence'].some(key => datedData[key] && !Number.isFinite(datedData[key].getTime()))) continue;
    const rule = ruleFor({...originalEvent,data:datedData}, now);
    if (!rule) continue;
    const slug = String(data.slug ?? originalEvent.slug ?? originalEvent.id ?? '');
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || used.has(slug)) continue;
    for (let date = start < today ? today : start; date <= end; date = addDays(date, 1)) {
      if (!occursOnDay(rule, date)) continue;
      const day = isoDate(date), occurrence = resolveListingOccurrence(data, rule, day, now);
      if (!occurrence?.bookable || occurrence.phase === 'past') continue;
      const effective = occurrence.data ?? data;
      // Explicit moved sessions remove their old location. No shared receipt
      // can certify a different venue; omit until a per-session proof exists.
      if (effective.venueName !== data.venueName || !hasPromotionGeography(effective, now)) continue;
      const exception = data.occurrenceExceptions?.find(item => item.date === day);
      if (exception?.venueName && exception.venueName !== data.venueName) continue;
      if (placeId && ![identity(effective.place), identity(effective.suburb)].includes(identity(placeId))) continue;
      if (venueId && ref(effective.venue) !== ref(venueId)) continue;
      const kind = eventContentKind(effective);
      const event = { ...originalEvent, data: { ...effective, _promotionDay: day, _promotionOriginal: originalEvent } };
      const prefix = kind === 'offer' ? 'Offer valid' : kind === 'experience' ? 'Experience session' : '';
      const dateLabel = `${prefix ? prefix + ' · ' : ''}${date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
      output.push({ event, originalEvent, day, dateLabel, kind, href: `/whats-on/${slug}/`, slug, occurrence, rule });
      used.add(slug);
      break;
    }
    if (output.length >= limit) break;
  }
  return output;
}
export function eventPromotionEntries(entries, options = {}) {
  return selectEventPromotions(entries, options).map(item => item.event);
}

/** Recheck static promotions against the reader's clock, without inventing new picks. */
export function refreshEventPromotions(root, now = new Date()) {
  for (const element of root.querySelectorAll('[data-event-promotion]')) {
    try {
      const entry = JSON.parse(element.getAttribute('data-event-promotion'));
      const day = element.getAttribute('data-event-promotion-day');
      const matches = selectEventPromotions([entry], {now, windowStart: new Date(day + 'T00:00:00Z'), windowDays: 1});
      if (!matches.some(item => item.day === day)) element.remove();
    } catch { element.remove(); }
  }
  for (const section of root.querySelectorAll('[data-event-promotions-section]')) {
    const remaining = section.querySelectorAll('[data-event-promotion]').length;
    if (!remaining) section.hidden = true;
    for (const hint of section.querySelectorAll('[data-event-promotion-multi-hint]')) {
      hint.hidden = remaining < 2;
    }
  }
}

/** One navigation-aware freshness timer per browser window. */
export function installEventPromotionRefresh(window, document) {
  const key = Symbol.for('pi.event-promotion-refresh');
  if (window[key]) return window[key];
  let timer = null;
  const stop = () => {if (timer !== null) window.clearInterval(timer); timer = null;};
  const refresh = () => refreshEventPromotions(document);
  const start = () => {stop(); refresh(); timer = window.setInterval(refresh, 60000);};
  document.addEventListener('astro:before-swap', stop);
  document.addEventListener('astro:page-load', start);
  window.addEventListener('pageshow', start);
  const dispose = () => {stop(); document.removeEventListener('astro:before-swap', stop); document.removeEventListener('astro:page-load', start); window.removeEventListener('pageshow', start); delete window[key];};
  window[key] = {dispose}; start(); return window[key];
}

/** Free-entry classification requires an unqualified, current source-verified label. */
export function currentFreePrice(data, now = new Date()) {
  const price = currentVerifiedPrice(data, now);
  return price && /^free(?: entry| admission)?[.!]?$/i.test(price.label.trim()) ? price : null;
}
export function feedHasCurrentFreeEntry(entry, now = new Date()) {
  return entry?.f === true && currentFreePrice({verifiedPrice: entry.fp}, now) !== null;
}
