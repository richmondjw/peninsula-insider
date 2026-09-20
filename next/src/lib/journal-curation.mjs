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
