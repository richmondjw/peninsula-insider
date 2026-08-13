/**
 * Empty-state copy for the What's On day list.
 *
 * Multi-day events render once, on their first active day. When a later day
 * has no newly-starting event, the empty state must not claim there is
 * nothing on: an earlier event may still be running.
 */
export function emptyDayMessage(continuingCount = 0) {
  if (continuingCount === 1) {
    return 'No new event starts today. One event from earlier in this date range is still running.';
  }
  if (continuingCount > 1) {
    return `No new event starts today. ${continuingCount} events from earlier in this date range are still running.`;
  }
  return 'A quiet one. Nothing we would send you to.';
}
