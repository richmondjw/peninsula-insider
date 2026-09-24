import { resolveOccurrence } from './event-occurrence.mjs';

/** Calendar selection is not an event closing date. Dates here are UTC date-only values. */
export function listingDateLabel(rule, window) {
  if (rule.kind === 'weekly') return 'Recurring weekly';
  if (rule.kind === 'monthly') return 'Recurring monthly';
  if (rule.start.getTime() === rule.end.getTime()) return 'One-day event';
  const continues = rule.start < window.start || rule.end > window.end;
  const end = rule.end.toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
    ...(rule.end.getUTCFullYear() !== window.start.getUTCFullYear() ? { year: 'numeric' } : {}),
  });
  return `${continues ? 'On during your dates' : 'Multi-day event'} · runs to ${end}`;
}

/** A range row represents its entire published run, even when selection shows only part. */
export function resolveListingOccurrence(data, rule, dayIso, now = new Date()) {
  const iso = date => date.toISOString().slice(0, 10);
  const occurrence = resolveOccurrence(data, rule.kind === 'range' ? iso(rule.start) : dayIso, now,
    rule.kind === 'range' ? { endDayIso: iso(rule.end) } : {});
  // The occurrence model has exactly these three clock states. Preserve that union across JS/TS.
  const phase = /** @type {'upcoming' | 'running' | 'past'} */ (occurrence.phase);
  return { ...occurrence, phase };
}
