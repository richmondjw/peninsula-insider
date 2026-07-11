/**
 * /whats-on/feed.json - the What's On JSON island (T-601, HUB-11).
 *
 * Every live event as a compact occurrence record. The /whats-on/ page
 * fetches this once, on demand, when the reader changes date scope (next
 * weekend, school holidays, custom range, month ahead). Nothing here is
 * pre-rendered into hidden DOM; the default weekend view stays fully
 * server-rendered in the page itself.
 *
 * Prerendered at build time, same freshness cadence as the page.
 */
import type { APIRoute } from 'astro';
import { loadLiveEvents, feedFor } from './_data';

export const prerender = true;

export const GET: APIRoute = async () => {
  const now = new Date();
  const events = await loadLiveEvents(now);
  const body = JSON.stringify({
    generated: now.toISOString().slice(0, 10),
    events: feedFor(events),
  });
  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
