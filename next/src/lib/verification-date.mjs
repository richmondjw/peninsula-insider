/** A legacy/bulk review stamp is not evidence of a factual check. */
export function informationCheckedOn(data, now = Date.now()) {
  const check = data?.editorialProvenance;
  if (!check?.source?.trim() || !check.checkedOn) return undefined;
  const date = new Date(check.checkedOn);
  return Number.isFinite(date.getTime()) && date.getTime() <= now ? date : undefined;
}
