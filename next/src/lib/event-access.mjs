import { currentVerifiedPrice } from './event-publication.mjs';
/**
 * Public access label for an event.
 *
 * "Free" is reserved for an unqualified free event. Mixed-access records
 * (for example, a paid hunt with free farmgate entry, or a complimentary
 * activity inside paid bathing admission) must not collapse into a plain
 * "Free" badge.
 */
export function eventAccessLabel(data = {}, now = new Date()) {
  const verified = currentVerifiedPrice(data, now);
  if (!verified) return null;
  const freePaid = String(verified.label).replace(/\s+/g, ' ').trim();
  const hasFreeSignal = /\bfree\b|complimentary|included with/i.test(freePaid);
  if (!hasFreeSignal) return null;

  if (/\bpaid\b[\s\S]*\bfree\b|\bfree\b[\s\S]*\bpaid\b/i.test(freePaid)) {
    return 'Paid and free options';
  }

  if (/complimentary|included with/i.test(freePaid)) {
    const included = freePaid.match(/included with\s+([^)]+)/i);
    if (included?.[1]) return `Included with ${included[1].trim()}`;
    return 'Included with admission';
  }

  if (/\bfree\b\s*\(?entry\)?/i.test(freePaid)) {
    return 'Free entry';
  }

  return /^Free[.!]?$/i.test(freePaid) ? 'Free' : freePaid;
}

export function eventIsUnqualifiedFree(data = {}, now = new Date()) {
  return eventAccessLabel(data, now) === 'Free';
}
