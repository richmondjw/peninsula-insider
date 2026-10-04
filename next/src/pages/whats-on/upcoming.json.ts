import {hasExplicitSeries,occurrenceData} from '../../lib/intelligence-series.mjs';
import type { APIRoute } from 'astro';
import {
  addDays,
  isoDate,
  loadLiveEvents,
  occurrenceStateFor,
  occursInWindow,
  occursOnDay,
  startOfDay,
  weekendWindow,
  type ScopeWindow,
} from './_data';
import { eventContentKind } from '../../lib/event-publication.mjs';
import { listingEventStatus } from '../../lib/event-occurrence.mjs';

// Machine-readable "what's on" feed for AI assistants and agents. The site
// already emits rich Event JSON-LD per page and llms.txt for site structure;
// this is the one surface that answers "what's on the Mornington Peninsula
// this weekend / soon" as a single clean, forward-dated JSON document - the
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
      const contentKind = eventContentKind(e.data);
      let nextOccurrence: Date | null = null;
      for (let day = window.start; day <= window.end; day = addDays(day, 1)) {
        if (!occursOnDay(live.rule, day)) continue;
        if (occurrenceStateFor(live, isoDate(day), now).phase === 'past') continue;
        nextOccurrence = day;
        break;
      }
      if (!nextOccurrence) return null;
      const occurrenceEnd = live.rule.kind === 'range'
        ? new Date(Math.min(live.rule.end.getTime(), window.end.getTime()))
        : nextOccurrence;
      const startIso = isoDate(nextOccurrence);
      const endIso = isoDate(occurrenceEnd);
      // The feed used to stamp EventScheduled on every node, so a postponement
      // that had been given a new date, and any single occurrence an editor had
      // cancelled out of a series, both told an agent the event was going ahead
      // as normal. The same resolver the pages render from answers it here, over
      // the whole run for a range rather than over its opening day, and returns
      // nothing at all when there is nothing true to say.
      const actualData = occurrenceData(e.data, startIso) ?? e.data;
      const eventStatus = hasExplicitSeries(e.data) ? occurrenceStateFor(live, startIso, now).schemaStatus : listingEventStatus(
        e.data as Record<string, any>,
        startIso,
        now,
        endIso === startIso ? {} : { endDayIso: endIso }
      );
      // A series may next run on Thursday AND also run this weekend. Publish
      // those actual occurrences independently of its next upcoming date.
      const weekendOccurrences = [];
      for (let day = weekend.start; day <= weekend.end; day = addDays(day, 1)) {
        if (day < today) continue;
        if (!occursOnDay(live.rule, day)) continue;
        const date = isoDate(day);
        const state = occurrenceStateFor(live, date, now);
        if (state.phase === 'past') continue;
        weekendOccurrences.push({ date, ...(contentKind === 'event' ? { eventStatus: state.schemaStatus } : {}) });
        // A range is one continuous occurrence, even when it spans days.
        if (live.rule.kind === 'range') break;
      }
      return {
        title: e.data.title,
        contentKind,
        dateMeaning: contentKind === 'event' ? 'occurrence' : contentKind === 'offer' ? 'validity' : 'availability',
        url: `${SITE}${live.href}`,
        startDate: startIso,
        endDate: endIso,
        id: `${SITE}${live.href}`,
        sourceUrl: actualData.officialEventUrl || actualData.organiser?.website || null,
        factCheckedOn: e.data.editorialProvenance?.checkedOn ? isoDate(new Date(e.data.editorialProvenance.checkedOn)) : null,
        recurrence: e.data.recurrence ?? 'one-off',
        category: e.data.category ?? null,
        place: (actualData.place as { id?: string } | undefined)?.id ?? null,
        venue: (actualData.venue as { id?: string } | undefined)?.id ?? null,
        freePaid: e.data.freePaid ?? null,
        summary: e.data.summary ?? '',
        ...(hasExplicitSeries(e.data) ? {venueName: actualData.venueName, startTime: actualData.startTime, endTime: actualData.endTime} : {}),
        // undefined rather than null: JSON.stringify drops the key, so a
        // finished occurrence says nothing instead of saying nothing loudly.
        eventStatus: contentKind === 'event' ? eventStatus ?? undefined : undefined,
        weekendOccurrences,
        thisWeekend: weekendOccurrences.length > 0,
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));

  const body = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: "What's on - Mornington Peninsula (upcoming)",
    description:
      'Machine-readable feed of upcoming Mornington Peninsula events for AI ' +
      'assistants and agents. Forward-dated; regenerated on each build. See ' +
      `${SITE}/llms.txt for the full site map.`,
    generated: isoDate(now),
    generatedAt: now.toISOString(),
    schemaVersion: '1.2',
    timezone: 'Australia/Melbourne',
    dateSemantics: 'Local calendar dates, not midnight timestamps. dateMeaning distinguishes event occurrences, experience availability and offer validity. generatedAt is the build time, not a fact check.',
    window: { start: isoDate(window.start), end: isoDate(window.end) },
    documentation: `${SITE}/agents/#trust`,
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
        '@type': event.contentKind === 'event' ? 'Event' : event.contentKind === 'offer' ? 'Offer' : 'Service',
        name: event.title,
        url: event.url,
        ...(event.contentKind === 'event' ? { startDate: event.startDate, endDate: event.endDate } : event.contentKind === 'offer' ? { validFrom: event.startDate, validThrough: event.endDate } : {}),
        description: event.summary,
        ...(event.eventStatus ? { eventStatus: event.eventStatus } : {}),
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
