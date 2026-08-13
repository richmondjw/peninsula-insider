/**
 * Public access label for an event.
 *
 * "Free" is reserved for an unqualified free event. Mixed-access records
 * (for example, a paid hunt with free farmgate entry, or a complimentary
 * activity inside paid bathing admission) must not collapse into a plain
 * "Free" badge.
 */
export function eventAccessLabel(data = {}) {
  const freePaid = String(data.freePaid ?? '').replace(/\s+/g, ' ').trim();
  const lensFree = Array.isArray(data.lens) && data.lens.includes('free');
  const hasFreeSignal =
    data.priceTier === 'free' || /\bfree\b|complimentary/i.test(freePaid) || lensFree;

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

  return 'Free';
}

export function eventIsUnqualifiedFree(data = {}) {
  return eventAccessLabel(data) === 'Free';
}
