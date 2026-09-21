/** Bounded, read-only decoding for public trip links. No store writes. */
export function parseSharedTrip(search: string, kinds: readonly string[]) {
  const params = new URLSearchParams(search);
  const raw = params.get('i');
  if (!raw || raw.length > 16000) return null;
  const items = raw.split('|').slice(0, 100).flatMap((value) => {
    const [kind, slug, dayId = '', ...extra] = value.split(':');
    if (extra.length || !kinds.includes(kind) || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(slug || '')) return [];
    return [{ kind, slug, dayId: dayId.slice(0, 80) }];
  });
  if (!items.length) return null;
  const ids = new Set<string>();
  const days = (params.get('d') || '').split('|').slice(0, 20).flatMap((value) => {
    const split = value.indexOf(':');
    if (split < 1) return [];
    const id = value.slice(0, split).slice(0, 80);
    if (ids.has(id)) return [];
    ids.add(id);
    let label = value.slice(split + 1);
    try { label = decodeURIComponent(label); } catch { /* Show safely escaped original. */ }
    return [{ id, label: label.slice(0, 120) || 'Your day' }];
  });
  return { items, days };
}

export function sharedTripGroups(shared: NonNullable<ReturnType<typeof parseSharedTrip>>) {
  const known = new Set(shared.days.map((day) => day.id));
  const groups = shared.days.map((day) => ({
    label: day.label, items: shared.items.filter((item) => item.dayId === day.id),
  })).filter((group) => group.items.length);
  const loose = shared.items.filter((item) => !known.has(item.dayId));
  if (loose.length) groups.push({ label: groups.length ? 'Unscheduled' : 'Your Peninsula day', items: loose });
  return groups;
}
