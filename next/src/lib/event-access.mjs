/**
 * Public access label for an event.
 *
 * "Free" is reserved for free entry. Mixed-access records (for example, a
 * paid hunt with free farmgate entry, or a complimentary activity inside paid
 * bathing admission) must not collapse into a plain "Free" badge.
 *
 * One vocabulary for readers: "Free", "Included with {x}" or "Paid and free
 * options". A record worded "Free (entry)" reads "Free" like every other free
 * listing, but it keeps its own kind, so the Free filter chip, which counts
 * only unqualified free records, selects exactly what it selected before.
 */
function accessKind(data = {}) {
  const freePaid = String(data.freePaid ?? '').replace(/\s+/g, ' ').trim();
  const lensFree = Array.isArray(data.lens) && data.lens.includes('free');
  const hasFreeSignal =
    data.priceTier === 'free' || /\bfree\b|complimentary/i.test(freePaid) || lensFree;

  if (!hasFreeSignal) return { kind: 'none', label: null };

  if (/\bpaid\b[\s\S]*\bfree\b|\bfree\b[\s\S]*\bpaid\b/i.test(freePaid)) {
    return { kind: 'mixed', label: 'Paid and free options' };
  }

  if (/complimentary|included with/i.test(freePaid)) {
    const included = freePaid.match(/included with\s+([^)]+)/i);
    if (included?.[1]) return { kind: 'included', label: `Included with ${included[1].trim()}` };
    return { kind: 'included', label: 'Included with admission' };
  }

  if (/\bfree\b\s*\(?entry\)?/i.test(freePaid)) {
    return { kind: 'free-entry', label: 'Free' };
  }

  return { kind: 'free', label: 'Free' };
}

export function eventAccessLabel(data = {}) {
  return accessKind(data).label;
}

export function eventIsUnqualifiedFree(data = {}) {
  return accessKind(data).kind === 'free';
}
