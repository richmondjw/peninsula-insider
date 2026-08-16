import type { APIRoute } from 'astro';
import {
  addDays,
  firstDayInWindow,
  isoDate,
  loadLiveEvents,
  occursInWindow,
  startOfDay,
  weekendWindow,
  type ScopeWindow,
} from './_data';

// Machine-readable "what's on" feed for AI assistants and agents. The site
// already emits rich Event JSON-LD per page and llms.txt for site structure;
// this is the one surface that answers "what's on the Mornington Peninsula
// this weekend / soon" as a single clean, forward-dated JSON document — the
// highest-value query class for both people and agents. Regenerated on every
// build (like sitemap.xml), so it stays fresh with the events pipeline.

const SITE = 'https://peninsulainsider.com.au';
const WINDOW_DAYS = 90;

export const GET: APIRoute = async () => {
  const now = new Date();
  const today = startOfDay(now);
  const window: ScopeWindow = {
    start: today,
    end: addDays(today, WINDOW_DAYS),
    label: '',
  };
  const weekend = weekendWindow(now);
  const events = await loadLiveEvents(now);

  const upcoming = events
    .filter((live) => occursInWindow(live.rule, window))
    .map((live) => {
      const e = live.event;
      const nextOccurrence = firstDayInWindow(live.rule, window);
      if (!nextOccurrence) return null;
      const occurrenceEnd = live.rule.kind === 'range'
        ? new Date(Math.min(live.rule.end.getTime(), window.end.getTime()))
        : nextOccurrence;
      return {
        title: e.data.title,
        url: `${SITE}${live.href}`,
        startDate: isoDate(nextOccurrence),
        endDate: isoDate(occurrenceEnd),
        recurrence: e.data.recurrence ?? 'one-off',
        category: e.data.category ?? null,
        place: (e.data.place as { id?: string } | undefined)?.id ?? null,
        venue: (e.data.venue as { id?: string } | undefined)?.id ?? null,
        freePaid: e.data.freePaid ?? null,
        summary: e.data.summary ?? '',
        thisWeekend: isoDate(nextOccurrence) <= isoDate(weekend.end) && occursInWindow(live.rule, weekend),
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));

  const body = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: "What's on — Mornington Peninsula (upcoming)",
    description:
      'Machine-readable feed of upcoming Mornington Peninsula events for AI ' +
      'assistants and agents. Forward-dated; regenerated on each build. See ' +
      `${SITE}/llms.txt for the full site map.`,
    generated: isoDate(now),
    site: SITE,
    windowDays: WINDOW_DAYS,
    thisWeekend: {
      start: isoDate(weekend.start),
      end: isoDate(weekend.end),
      label: weekend.label,
      count: upcoming.filter((x) => x.thisWeekend).length,
    },
    numberOfItems: upcoming.length,
    itemListElement: upcoming.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Event',
        name: event.title,
        url: event.url,
        startDate: event.startDate,
        endDate: event.endDate,
        description: event.summary,
        eventStatus: 'https://schema.org/EventScheduled',
      },
    })),
    count: upcoming.length,
    events: upcoming,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
