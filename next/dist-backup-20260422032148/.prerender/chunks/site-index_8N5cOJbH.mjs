import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead, b as addAttribute } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { e as stayTypes, w as wineTypes, r as routeSlug } from './editorial_CD_uAC75.mjs';

const $$SiteIndex = createComponent(async ($$result, $$props, $$slots) => {
  const [venues, experiences, places, articles, itineraries, events] = await Promise.all([
    getCollection("venues"),
    getCollection("experiences"),
    getCollection("places"),
    getCollection("articles", ({ data }) => data.status === "published"),
    getCollection("itineraries"),
    getCollection("events")
  ]);
  const eatTypes = ["restaurant", "cafe", "bakery", "pub", "market", "winery"];
  const eatVenues = venues.filter((v) => eatTypes.includes(v.data.type)).slice(0, 40);
  const stayVenues = venues.filter((v) => stayTypes.includes(v.data.type)).slice(0, 20);
  const wineVenues = venues.filter((v) => wineTypes.includes(v.data.type)).slice(0, 30);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Site Index" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Site Index | Peninsula Insider", "description": "A crawlable index of Peninsula Insider sections, guides, places, venues, events, and planning pages.", "canonical": "https://peninsulainsider.com.au/site-index" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems })} ${maybeRenderHead()}<article class="article"> <div class="container"> <h1 class="article__title">Site Index</h1> <p class="article__dek">A direct index of the major sections and planning pages on Peninsula Insider. Useful for readers, and useful for crawlers.</p> <div class="prose"> <h2>Core sections</h2> <ul> <li><a href="/eat">Eat & Drink</a></li> <li><a href="/stay">Stay</a></li> <li><a href="/wine">Wine</a></li> <li><a href="/explore">Explore</a></li> <li><a href="/escape">Escape</a></li> <li><a href="/whats-on">What's On</a></li> <li><a href="/journal">Journal</a></li> <li><a href="/places">Places</a></li> </ul> <h2>Priority planning pages</h2> <ul> <li><a href="/eat/best-restaurants">Best Restaurants</a></li> <li><a href="/wine/best-cellar-doors">Best Cellar Doors</a></li> <li><a href="/explore/best-walks">Best Walks</a></li> <li><a href="/stay/best-accommodation">Best Accommodation</a></li> <li><a href="/journal/mornington-peninsula-day-trip">Mornington Peninsula Day Trip</a></li> <li><a href="/journal/mornington-peninsula-in-autumn">Mornington Peninsula in Autumn</a></li> <li><a href="/journal/mornington-peninsula-with-kids">Mornington Peninsula with Kids</a></li> <li><a href="/journal/dog-friendly-mornington-peninsula">Dog-Friendly Mornington Peninsula</a></li> </ul> <h2>Places</h2> <ul> ${places.map((place) => renderTemplate`<li><a${addAttribute(`/places/${routeSlug(place)}`, "href")}>${place.data.name}</a></li>`)} </ul> <h2>Selected Eat & Drink pages</h2> <ul> ${eatVenues.map((venue) => renderTemplate`<li><a${addAttribute(`/eat/${routeSlug(venue)}`, "href")}>${venue.data.name}</a></li>`)} </ul> <h2>Selected Stay pages</h2> <ul> ${stayVenues.map((venue) => renderTemplate`<li><a${addAttribute(`/stay/${routeSlug(venue)}`, "href")}>${venue.data.name}</a></li>`)} </ul> <h2>Selected Wine pages</h2> <ul> ${wineVenues.map((venue) => renderTemplate`<li><a${addAttribute(`/wine/${routeSlug(venue)}`, "href")}>${venue.data.name}</a></li>`)} </ul> <h2>Experiences</h2> <ul> ${experiences.map((entry) => renderTemplate`<li><a${addAttribute(`/explore/${routeSlug(entry)}`, "href")}>${entry.data.name}</a></li>`)} </ul> <h2>Escape plans</h2> <ul> ${itineraries.map((entry) => renderTemplate`<li><a${addAttribute(`/escape/${routeSlug(entry)}`, "href")}>${entry.data.title}</a></li>`)} </ul> <h2>What's On</h2> <ul> ${events.map((entry) => renderTemplate`<li><a${addAttribute(`/whats-on/${routeSlug(entry)}`, "href")}>${entry.data.title}</a></li>`)} </ul> <h2>Journal</h2> <ul> ${articles.slice(0, 50).map((entry) => renderTemplate`<li><a${addAttribute(`/journal/${routeSlug(entry)}`, "href")}>${entry.data.title}</a></li>`)} </ul> </div> </div> </article> ` })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/site-index.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/site-index.astro";
const $$url = "/site-index";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$SiteIndex,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
