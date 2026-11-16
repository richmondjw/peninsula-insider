/** Journal discovery is editorial; Picks remain published at their original URLs. */
export function isInsiderPicks(data) {
  return (data.tags ?? []).some((tag) => typeof tag === 'string' && tag.trim().toLowerCase() === 'insider-picks');
}

export function isJournalEditorial(data) {
  return data.status === 'published' && (data.section ?? 'journal') === 'journal' && !isInsiderPicks(data);
}

/** Publishing-frequency tags are internal metadata, not promises to readers. */
export function visibleArticleTags(data) {
  return (data.tags ?? []).filter((tag) => !isInsiderPicks(data) || !/^(daily|weekly)$/i.test(String(tag).trim()));
}

/** Seasonal promotion expires without unpublishing the archived story. */
export function isJournalDiscovery(data, now = Date.now()) {
  if (!isJournalEditorial(data)) return false;
  if (!data.promotionExpiresAt) return true;
  const end = new Date(data.promotionExpiresAt).getTime();
  return Number.isFinite(end) && end > Number(now);
}
