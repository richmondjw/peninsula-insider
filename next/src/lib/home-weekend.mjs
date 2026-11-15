import { startOfDay, addDays } from './event-schedule.ts';

/** Date-only UTC carriers for the Melbourne calendar, independent of host timezone. */
export function homeWeekendWindow(now = new Date()) {
  const today = startOfDay(now);
  const day = today.getUTCDay();
  const saturday = addDays(today, day === 0 ? -1 : 6 - day);
  const sunday = addDays(saturday, 1);
  const month = date => date.toLocaleDateString('en-AU', { month: 'long', timeZone: 'UTC' });
  const label = month(saturday) === month(sunday)
    ? `${saturday.getUTCDate()}–${sunday.getUTCDate()} ${month(sunday)}`
    : `${saturday.getUTCDate()} ${month(saturday)} – ${sunday.getUTCDate()} ${month(sunday)}`;
  return { satISO: saturday.toISOString().slice(0, 10), friday: addDays(saturday, -1), saturday, sunday, label };
}

/** Cache stamps and responsive rendition sizes do not make a different photograph. */
export function weekendImageIdentity(src) {
  if (!src) return '';
  try {
    const url = new URL(src, 'https://peninsulainsider.com.au');
    const path = url.pathname.replace(/\/(_media\/[^/]+)-\d+\.(?:avif|webp)$/, '/$1');
    return `${url.origin}${path}`;
  } catch { return ''; }
}

/** Preserve editorial order while filling from the entire already-eligible pool. */
export function distinctWeekendCards(cards, limit = 3) {
  const images = new Set(), slugs = new Set(), selected = [];
  for (const card of cards) {
    const image = weekendImageIdentity(card.image?.src);
    if (!image || images.has(image) || slugs.has(card.slug)) continue;
    selected.push(card);
    images.add(image);
    slugs.add(card.slug);
    if (selected.length >= limit) break;
  }
  return selected;
}

/** Called after the shared publication/occurrence recheck removes expired cards. */
export function refreshHomeWeekend(section, now = new Date()) {
  const current = section.getAttribute('data-home-weekend') === homeWeekendWindow(now).satISO;
  const nodes = [...section.querySelectorAll('[data-event-promotion]')];
  const selected = current ? distinctWeekendCards(nodes.map(node => ({
    node, slug: node.getAttribute('data-weekend-slug'), image: { src: node.getAttribute('data-weekend-image') },
  }))) : [];
  const visible = new Set(selected.map(card => card.node));
  for (const node of nodes) node.hidden = !visible.has(node);
  // Discovery links never carry event dates, Save controls or event-promotion attributes.
  const spare = Math.max(0, 3 - selected.length);
  [...section.querySelectorAll('[data-weekend-discovery]')].forEach((node, i) => { node.hidden = i >= spare; });
  for (const note of section.querySelectorAll('[data-weekend-sparse]')) note.hidden = spare === 0;
  for (const empty of section.querySelectorAll('[data-event-promotion-empty]')) empty.hidden = selected.length > 0;
  for (const content of section.querySelectorAll('[data-event-promotion-content]')) content.hidden = false;
  for (const heading of section.querySelectorAll('[data-weekend-heading]')) heading.textContent = current ? 'This weekend' : 'Weekend picks';
  section.hidden = false;
}
