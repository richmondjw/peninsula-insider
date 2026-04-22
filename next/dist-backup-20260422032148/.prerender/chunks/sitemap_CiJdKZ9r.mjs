import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { r as routeSlug } from './editorial_CD_uAC75.mjs';

const SITE_URL = "https://peninsulainsider.com.au";
const TODAY = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
function url(path, priority, changefreq, lastmod) {
  return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod ?? TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}
function dateStr(d) {
  if (!d) return void 0;
  try {
    return d.toISOString().split("T")[0];
  } catch {
    return void 0;
  }
}
const GET = async () => {
  const [venues, experiences, places, articles, itineraries, events] = await Promise.all([
    getCollection("venues"),
    getCollection("experiences"),
    getCollection("places"),
    getCollection("articles", ({ data }) => data.status === "published"),
    getCollection("itineraries"),
    getCollection("events")
  ]);
  const eatTypes = ["restaurant", "cafe", "bakery", "pub", "market", "winery"];
  const stayTypes = ["hotel", "villa", "cottage", "glamping", "farm-stay", "spa"];
  const wineTypes = ["winery", "producer", "brewery", "distillery"];
  const eatVenues = venues.filter((v) => eatTypes.includes(v.data.type));
  const stayVenues = venues.filter((v) => stayTypes.includes(v.data.type));
  const wineVenues = venues.filter((v) => wineTypes.includes(v.data.type));
  const entries = [];
  entries.push(url("/", 1, "weekly"));
  for (const section of ["eat", "stay", "wine", "explore", "escape", "whats-on", "journal", "places", "spa", "golf", "weddings", "corporate-events", "walks"]) {
    entries.push(url(`/${section}`, 0.9, "weekly"));
  }
  for (const page of ["/about", "/contact", "/newsletter", "/search", "/site-index", "/privacy", "/terms"]) {
    const priority = ["/about", "/contact", "/newsletter"].includes(page) ? 0.4 : page === "/search" ? 0.6 : 0.3;
    entries.push(url(page, priority, "monthly"));
  }
  entries.push(url("/eat/best-restaurants", 0.9, "weekly"));
  entries.push(url("/wine/best-cellar-doors", 0.9, "weekly"));
  entries.push(url("/explore/best-walks", 0.8, "weekly"));
  entries.push(url("/stay/best-accommodation", 0.8, "weekly"));
  const seoJournalPages = [
    "/journal/mornington-peninsula-in-autumn",
    "/journal/mornington-peninsula-in-winter",
    "/journal/mornington-peninsula-with-kids",
    "/journal/dog-friendly-mornington-peninsula",
    "/journal/mornington-peninsula-day-trip",
    "/journal/mornington-peninsula-hot-springs-guide",
    "/journal/mornington-peninsula-winery-tour",
    "/journal/mornington-peninsula-itinerary",
    "/journal/free-things-to-do-mornington-peninsula",
    "/journal/best-brunch-mornington-peninsula",
    "/journal/mornington-peninsula-wedding-venues"
  ];
  for (const page of seoJournalPages) {
    entries.push(url(page, 0.8, "monthly"));
  }
  for (const venue of eatVenues) {
    entries.push(url(`/eat/${routeSlug(venue)}`, 0.8, "weekly", dateStr(venue.data.publishedAt)));
  }
  for (const venue of stayVenues) {
    entries.push(url(`/stay/${routeSlug(venue)}`, 0.8, "weekly", dateStr(venue.data.publishedAt)));
  }
  for (const venue of wineVenues) {
    entries.push(url(`/wine/${routeSlug(venue)}`, 0.8, "weekly", dateStr(venue.data.publishedAt)));
  }
  for (const experience of experiences) {
    entries.push(url(`/explore/${routeSlug(experience)}`, 0.7, "weekly", dateStr(experience.data.publishedAt)));
  }
  for (const place of places) {
    entries.push(url(`/places/${routeSlug(place)}`, 0.8, "weekly", dateStr(place.data.publishedAt)));
  }
  for (const article of articles) {
    entries.push(url(`/journal/${routeSlug(article)}`, 0.7, "weekly", dateStr(article.data.publishedAt)));
  }
  for (const event of events) {
    entries.push(url(`/whats-on/${routeSlug(event)}`, 0.6, "daily", dateStr(event.data.publishedAt)));
  }
  for (const itinerary of itineraries) {
    entries.push(url(`/escape/${routeSlug(itinerary)}`, 0.7, "weekly", dateStr(itinerary.data.publishedAt)));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
