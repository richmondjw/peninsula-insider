import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug } from '../../lib/editorial';
import { upcomingWeekend, eventInWindow } from '../../lib/events';

// Machine-readable "what's on" feed for AI assistants and agents. The site
// already emits rich Event JSON-LD per page and llms.txt for site structure;
// this is the one surface that answers "what's on the Mornington Peninsula
// this weekend / soon" as a single clean, forward-dated JSON document — the
// highest-value query class for both people and agents. Regenerated on every
// build (like sitemap.xml), so it stays fresh with the events pipeline.

const SITE = 'https://peninsulainsider.com.au';
const WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const iso = (d: Date): string => d.toISOString().split('T')[0];

export const GET: APIRoute = async () => {
  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_DAYS * DAY_MS);
  const weekend = upcomingWeekend(now);

  const events = await getCollection('events', ({ data }) => !data.sitemapExclude);

  const upcoming = events
    .filter((e) => {
      const start = e.data.startDate;
      const end = e.data.endDate ?? e.data.startDate;
      const recurring = e.data.recurrence && e.data.recurrence !== 'one-off';
      if (recurring) return true; // recurring events remain valid
      const stillCurrent = end && end.getTime() >= now.getTime() - DAY_MS;
      const withinHorizon = start && start.getTime() <= horizon.getTime();
      return Boolean(stillCurrent && withinHorizon);
    })
    .sort((a, b) => (a.data.startDate?.getTime() ?? 0) - (b.data.startDate?.getTime() ?? 0))
    .map((e) => {
      const slug = routeSlug(e);
      return {
        title: e.data.title,
        url: `${SITE}/whats-on/${slug}/`,
        startDate: e.data.startDate ? iso(e.data.startDate) : null,
        endDate: e.data.endDate ? iso(e.data.endDate) : null,
        recurrence: e.data.recurrence ?? 'one-off',
        category: e.data.category ?? null,
        place: (e.data.place as { id?: string } | undefined)?.id ?? null,
        venue: (e.data.venue as { id?: string } | undefined)?.id ?? null,
        freePaid: e.data.freePaid ?? null,
        summary: e.data.summary ?? '',
        thisWeekend: eventInWindow(e, weekend.start, weekend.end),
      };
    });

  const body = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: "What's on — Mornington Peninsula (upcoming)",
    description:
      'Machine-readable feed of upcoming Mornington Peninsula events for AI ' +
      'assistants and agents. Forward-dated; regenerated on each build. See ' +
      `${SITE}/llms.txt for the full site map.`,
    generated: iso(now),
    site: SITE,
    windowDays: WINDOW_DAYS,
    thisWeekend: {
      start: iso(weekend.start),
      end: iso(weekend.end),
      label: weekend.label,
      count: upcoming.filter((x) => x.thisWeekend).length,
    },
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
