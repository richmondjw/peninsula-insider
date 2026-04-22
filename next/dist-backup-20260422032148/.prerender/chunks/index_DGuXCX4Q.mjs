import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$SectionHero } from './SectionHero_BlToWmif.mjs';
import { $ as $$VenueCard } from './VenueCard_SLu3UDq1.mjs';
import { $ as $$ArticleCard } from './ArticleCard_D-lJz9rP.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { c as currentSeason, r as routeSlug, i as isLocalFavourite, b as isFirstTimer, d as inSeason, s as seasonBlurb } from './editorial_CD_uAC75.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const eatTypes = ["restaurant", "cafe", "bakery", "pub", "market", "winery"];
  const venues = (await getCollection("venues")).filter((venue) => eatTypes.includes(venue.data.type)).sort((a, b) => Number(b.data.authority?.hats ?? 0) - Number(a.data.authority?.hats ?? 0));
  const season = currentSeason();
  const blurb = seasonBlurb[season];
  const editorPickSlugs = ["ten-minutes-by-tractor", "tedesca-osteria", "laura-pt-leo"];
  const editorPicks = editorPickSlugs.map((slug) => venues.find((venue) => routeSlug(venue) === slug)).filter((venue) => Boolean(venue));
  const longLunchFallback = venues.filter((venue) => ["restaurant", "winery"].includes(venue.data.type)).filter((venue) => !editorPickSlugs.includes(routeSlug(venue))).slice(0, 4);
  const longLunchCurated = venues.filter((venue) => ["polperro", "montalto", "doot-doot-doot", "pt-leo-estate"].includes(routeSlug(venue)));
  const longLunches = longLunchCurated.length >= 3 ? longLunchCurated : longLunchFallback;
  const localFavourites = venues.filter(isLocalFavourite).slice(0, 6);
  const firstTimers = venues.filter(isFirstTimer).slice(0, 6);
  const seasonal = venues.filter((venue) => inSeason(venue, season)).slice(0, 6);
  const casualStops = venues.filter(
    (venue) => ["cafe", "bakery", "pub", "market"].includes(venue.data.type)
  );
  const articlesAll = (await getCollection("articles", ({ data }) => data.status === "published")).sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
  const companionSlugs = [
    "the-long-lunch",
    "three-italian-dinners",
    "the-peninsula-pantry",
    "breakfast-before-the-crowds"
  ];
  const companionReads = companionSlugs.map((slug) => articlesAll.find((a) => routeSlug(a) === slug)).filter((a) => Boolean(a));
  const totalsByType = {};
  venues.forEach((venue) => {
    totalsByType[venue.data.type] = (totalsByType[venue.data.type] ?? 0) + 1;
  });
  [
    { key: "restaurant", label: "Restaurants" },
    { key: "winery", label: "Winery dining" },
    { key: "cafe", label: "Cafés" },
    { key: "bakery", label: "Bakeries" },
    { key: "pub", label: "Pubs" },
    { key: "market", label: "Markets" }
  ].filter((filter) => (totalsByType[filter.key] ?? 0) > 0);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Eat & Drink" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Best Restaurants Mornington Peninsula · Peninsula Insider", "description": "The best restaurants on the Mornington Peninsula — vineyard dining, cellar door lunches, hatted restaurants, and the bakeries worth the detour. Every venue visited. Updated April 2026.", "section": "eat", "canonical": "https://peninsulainsider.com.au/eat", "modifiedTime": "2026-04-13" }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " ", " ", `<section class="format-nav"> <div class="container"> <p class="label label--accent format-nav__label">Start here</p> <div class="format-nav__chips"> <a href="#picks" class="format-chip"><span class="format-chip__name">Editor's picks</span><span class="format-chip__count">`, '</span></a> <a href="#long-lunch" class="format-chip"><span class="format-chip__name">Long lunch</span><span class="format-chip__count">', "</span></a> ", " ", " ", ' <a href="#all" class="format-chip"><span class="format-chip__name">All venues</span><span class="format-chip__count">', "</span></a> </div> </div> </section> ", "", "", "", "", "", '<section class="venues" id="all"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Every dining venue</p> <h2 class="venues__title">All ', ' eat-and-drink venues, by authority</h2> <p class="venues__sub">Ordered by editorial weight  -  three-hat tables first, then the rooms working quietly below them.</p> </div> </div> <div class="venues__grid"> ', " </div> </div> </section> ", '<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Go deeper</p> <h2 class="venues__title">Guides that help you eat better on the Peninsula</h2> </div> </div> <div class="venues__grid venues__grid--links"> <div class="venue-card"><h3 class="venue-card__name"><a href="/journal/best-brunch-mornington-peninsula">Best Brunch on the Peninsula</a></h3><p class="venue-card__signature">The cafes, bakeries, and hotel breakfasts worth driving for — grouped by town with queue times.</p><a href="/journal/best-brunch-mornington-peninsula" class="venue-card__cta">Read the guide →</a></div> <div class="venue-card"><h3 class="venue-card__name"><a href="/journal/mornington-peninsula-winery-tour">Self-Drive Winery Tour</a></h3><p class="venue-card__signature">Four cellar doors, lunch in the middle, the Red Hill plateau loop, and designated driver logistics.</p><a href="/journal/mornington-peninsula-winery-tour" class="venue-card__cta">Read the guide →</a></div> <div class="venue-card"><h3 class="venue-card__name"><a href="/journal/mornington-peninsula-itinerary">3-Day Peninsula Itinerary</a></h3><p class="venue-card__signature">Day-by-day plan with specific restaurants, cellar doors, walks, and beaches.</p><a href="/journal/mornington-peninsula-itinerary" class="venue-card__cta">Read the guide →</a></div> </div> </div> </section> ', " "])), unescapeHTML(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What are the best restaurants on the Mornington Peninsula?",
        acceptedAnswer: { "@type": "Answer", text: "The strongest dining rooms right now are Ten Minutes by Tractor (Red Hill), Laura (Point Leo Estate), and Montalto (Red Hill) — all offering serious food in the vineyard-dining tradition the Peninsula does best. For casual dining, Commonfolk Coffee in Mornington, Flinders General Store, and Merricks General Wine Store are consistently good." }
      },
      {
        "@type": "Question",
        name: "Do I need to book restaurants on the Mornington Peninsula?",
        acceptedAnswer: { "@type": "Answer", text: "Most serious restaurants require bookings, especially on weekends. Cellar door restaurants in Red Hill can book out weeks ahead in summer and autumn. Walk-in options exist — Allis Wine Bar, local bakeries, and pub bistros typically operate without reservations. Book as far ahead as possible for hatted restaurants and Saturday lunches." }
      },
      {
        "@type": "Question",
        name: "Where is the best area for food on the Mornington Peninsula?",
        acceptedAnswer: { "@type": "Answer", text: "The Red Hill plateau (including Main Ridge and Red Hill South) has the highest concentration of serious dining. Mornington town has the strongest casual eating scene. Sorrento and Portsea dominate in summer for atmosphere. For wine-paired lunches, the ridge is unmatched." }
      }
    ]
  })), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), renderComponent($$result2, "SectionHero", $$SectionHero, { "eyebrow": "Eat & Drink", "subEyebrow": "Long lunches · dining rooms · cellar door lunches", "title": "The dining rooms that justify the <em>drive.</em>", "dek": "Vineyard restaurants, long lunches, and rooms with enough ambition to make Melbourne feel very far away  -  plus the bakeries and coffee rooms that stop a weekend turning into one expensive booking after another.", "gradient": "vineyard", "visualLabel": "Red Hill plateau · lunch country", "heroImage": "/images/sourced/place-merricks-01.webp" }), maybeRenderHead(), editorPicks.length, longLunches.length, localFavourites.length > 0 && renderTemplate`<a href="#locals" class="format-chip"><span class="format-chip__name">Local favourites</span><span class="format-chip__count">${localFavourites.length}</span></a>`, firstTimers.length > 0 && renderTemplate`<a href="#first" class="format-chip"><span class="format-chip__name">First visit</span><span class="format-chip__count">${firstTimers.length}</span></a>`, seasonal.length > 0 && renderTemplate`<a href="#seasonal" class="format-chip"><span class="format-chip__name">In season now</span><span class="format-chip__count">${seasonal.length}</span></a>`, venues.length, editorPicks.length > 0 && renderTemplate`<section class="venues" id="picks"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Editor's picks</p> <h2 class="venues__title">Three rooms doing the heaviest lifting right now</h2> <p class="venues__sub">If lunch is the event, start with any of these three. The rest of the weekend will arrange itself.</p> </div> <a href="/journal/the-long-lunch" class="venues__link">Read the long lunch lead →</a> </div> <div class="venues__grid"> ${editorPicks.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`)} </div> </div> </section>`, longLunches.length > 0 && renderTemplate`<section class="venues venues--plain" id="long-lunch"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Long lunch shortlist</p> <h2 class="venues__title">The tables that carry the whole day</h2> <p class="venues__sub">Daylight dining remains the Peninsula's strongest move. These are the rooms worth planning a weekend around.</p> </div> </div> <div class="venues__grid"> ${longLunches.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`)} </div> </div> </section>`, localFavourites.length > 0 && renderTemplate`<section class="venues" id="locals"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Local favourites</p> <h2 class="venues__title">Where locals actually rotate through</h2> <p class="venues__sub">Not the rooms that win trophies  -  the rooms that win Tuesday nights.</p> </div> </div> <div class="venues__grid"> ${localFavourites.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`)} </div> </div> </section>`, firstTimers.length > 0 && renderTemplate`<section class="venues venues--plain" id="first"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">First visit</p> <h2 class="venues__title">If it's your first Peninsula weekend, start here</h2> <p class="venues__sub">A clean set of entry points  -  cafés, bakeries, markets, and the dining rooms friendly enough to visit without a plan.</p> </div> <a href="/journal/the-peninsula-orientation-drive" class="venues__link">Read the orientation drive →</a> </div> <div class="venues__grid"> ${firstTimers.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`)} </div> </div> </section>`, seasonal.length > 0 && renderTemplate`<section class="venues" id="seasonal"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">${blurb.label}</p> <h2 class="venues__title">What's in season right now</h2> <p class="venues__sub">${blurb.line}</p> </div> </div> <div class="venues__grid"> ${seasonal.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`)} </div> </div> </section>`, casualStops.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Before and after the booking</p> <h2 class="venues__title">Bakeries, coffee rooms, markets, and useful village pubs</h2> <p class="venues__sub">The stops that keep a Peninsula day feeling inhabited rather than scheduled.</p> </div> </div> <div class="venues__grid"> ${casualStops.slice(0, 8).map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`)} </div> </div> </section>`, venues.length, venues.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`), companionReads.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">From the Journal</p> <h2 class="venues__title">Read the argument before you book</h2> <p class="venues__sub">Service pieces, comparisons, and cellar-door dispatches that sharpen the Peninsula dining decision.</p> </div> <a href="/journal" class="venues__link">All in the Journal →</a> </div> <div class="venues__grid"> ${companionReads.map((article) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": article })}`)} </div> </div> </section>`, renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/eat/index.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/eat/index.astro";
const $$url = "/eat";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
