import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$SectionHero } from './SectionHero_BlToWmif.mjs';
import { $ as $$VenueCard } from './VenueCard_SLu3UDq1.mjs';
import { $ as $$ItineraryCard } from './ItineraryCard_CecqkvGG.mjs';
import { $ as $$ArticleCard } from './ArticleCard_D-lJz9rP.mjs';
import { $ as $$PlaceCard } from './PlaceCard_xGrkBH_3.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { e as stayTypes, c as currentSeason, r as routeSlug, s as seasonBlurb } from './editorial_CD_uAC75.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const venues = (await getCollection("venues")).filter((venue) => stayTypes.includes(venue.data.type));
  const itineraries = await getCollection("itineraries");
  const places = await getCollection("places");
  const season = currentSeason();
  const blurb = seasonBlurb[season];
  const featuredStaySlugs = ["jackalope", "hotel-sorrento", "flinders-hotel"];
  const featuredStays = featuredStaySlugs.map((slug) => venues.find((venue) => routeSlug(venue) === slug)).filter((venue) => Boolean(venue));
  const ridgeZones = ["red-hill-plateau", "hinterland"];
  const coastZones = ["ocean-coast", "back-beaches", "tip"];
  const bayZones = ["bayside"];
  const ridgeStays = venues.filter((venue) => ridgeZones.includes(venue.data.zone));
  const coastStays = venues.filter((venue) => coastZones.includes(venue.data.zone));
  const bayStays = venues.filter((venue) => bayZones.includes(venue.data.zone));
  const vineyardStays = venues.filter((venue) => {
    const moods = venue.data.tags?.mood ?? [];
    return moods.includes("cellar-door") || moods.includes("long-lunch") || ridgeZones.includes(venue.data.zone);
  }).slice(0, 6);
  const coastalStays = venues.filter((venue) => {
    const moods = venue.data.tags?.mood ?? [];
    return moods.includes("beach") || moods.includes("waterfront") || coastZones.includes(venue.data.zone);
  }).slice(0, 6);
  const wellnessStays = venues.filter((venue) => {
    const moods = venue.data.tags?.mood ?? [];
    return moods.includes("wellness") || venue.data.type === "spa";
  }).slice(0, 4);
  const articlesAll = (await getCollection("articles", ({ data }) => data.status === "published")).sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
  const companionSlugs = [
    "where-to-stay-for-a-two-night-escape",
    "the-one-night-escape",
    "the-vineyard-villa-weekend",
    "the-thermal-springs-weekend"
  ];
  const companionReads = companionSlugs.map((slug) => articlesAll.find((a) => routeSlug(a) === slug)).filter((a) => Boolean(a));
  const placeHighlights = places.filter((place) => ["red-hill", "sorrento", "flinders"].includes(routeSlug(place)));
  const stayStats = {
    total: venues.length,
    ridge: ridgeStays.length,
    coast: coastStays.length,
    bay: bayStays.length
  };
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Stay" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Where to Stay on the Mornington Peninsula · Peninsula Insider", "description": "Where to stay on the Mornington Peninsula — hotels, vineyard villas, coastal cottages, and farm stays. Every property visited and reviewed. Prices from $150/night. Updated April 2026.", "section": "stay", "canonical": "https://peninsulainsider.com.au/stay", "modifiedTime": "2026-04-13" }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " ", " ", `<section class="format-nav"> <div class="container"> <p class="label label--accent format-nav__label">Jump to a weekend shape</p> <div class="format-nav__chips"> <a href="#editors" class="format-chip"><span class="format-chip__name">Editor's picks</span><span class="format-chip__count">`, "</span></a> ", " ", " ", ' <a href="#itineraries" class="format-chip"><span class="format-chip__name">Use it in sequence</span><span class="format-chip__count">', '</span></a> <a href="#all" class="format-chip"><span class="format-chip__name">All stays</span><span class="format-chip__count">', '</span></a> </div> </div> </section> <section class="zone-intro"> <div class="container"> <div class="split-intro"> <div> <p class="label label--accent">How to choose</p> <h2 class="split-intro__title">Start with the geography, then pick the room</h2> </div> <p class="split-intro__body">Red Hill suits couples who want vineyard calm and long lunches nearby. Sorrento works when you want the social theatre of the tip and late light on the coast. Flinders is the quieter southern reset, better for one-night decompressions and ocean weather.</p> </div> <div class="zone-intro__grid"> <a href="#vineyard" class="zone-card zone-card--link"> <p class="zone-card__label">Red Hill · ridge</p> <h3 class="zone-card__title">', ` vineyard weekends</h3> <p class="zone-card__body">Stay here if lunch, cellar doors, and slower inland pacing are the point. It's the strongest base for a two-night food-and-wine version of the Peninsula.</p> </a> <a href="#coastal" class="zone-card zone-card--link"> <p class="zone-card__label">Sorrento · tip</p> <h3 class="zone-card__title">`, ' coastal weekends</h3> <p class="zone-card__body">The main-street hotel and coastal cottage stay suits people who want the back beach, the ferry edge, and a bit more theatre around dusk and dinner.</p> </a> <a href="#all" class="zone-card zone-card--link"> <p class="zone-card__label">Bayside · easier entry</p> <h3 class="zone-card__title">', ' easy-entry stays</h3> <p class="zone-card__body">Use Mornington and Mount Martha when you want coffee, galleries, and a swim rather than a booked-out weekend.</p> </a> </div> </div> </section> ', "", "", "", '<section class="venues" id="all"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">All stays</p> <h2 class="venues__title">Every bed currently mapped, from hotel to cottage</h2> <p class="venues__sub">', '</p> </div> </div> <div class="venues__grid"> ', " </div> </div> </section> ", "", "", '<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Go deeper</p> <h2 class="venues__title">Guides that help you plan the stay</h2> </div> </div> <div class="venues__grid venues__grid--links"> <div class="venue-card"><h3 class="venue-card__name"><a href="/journal/mornington-peninsula-itinerary">3-Day Peninsula Itinerary</a></h3><p class="venue-card__signature">Where to base yourself, day-by-day plan, and why Red Hill is the most central option.</p><a href="/journal/mornington-peninsula-itinerary" class="venue-card__cta">Read the guide →</a></div> <div class="venue-card"><h3 class="venue-card__name"><a href="/journal/mornington-peninsula-wedding-venues">Wedding Venues</a></h3><p class="venue-card__signature">Vineyard estates, coastal venues, and boutique properties — with capacity and honest notes.</p><a href="/journal/mornington-peninsula-wedding-venues" class="venue-card__cta">Read the guide →</a></div> <div class="venue-card"><h3 class="venue-card__name"><a href="/journal/mornington-peninsula-in-winter">Winter on the Peninsula</a></h3><p class="venue-card__signature">Where to stay in winter — fireplaces, heated floors, and why you should avoid pool-focused properties.</p><a href="/journal/mornington-peninsula-in-winter" class="venue-card__cta">Read the guide →</a></div> </div> </div> </section> ', " "])), unescapeHTML(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where is the best area to stay on the Mornington Peninsula?",
        acceptedAnswer: { "@type": "Answer", text: "Red Hill and Main Ridge for cellar door weekends — vineyard restaurants are walkable from many stays. Sorrento for coastal village atmosphere and ocean beach access. Mornington town for the most accessible base from Melbourne (60 minutes). The right answer depends on the weekend you want — wine country, beach village, or practical proximity." }
      },
      {
        "@type": "Question",
        name: "How much does accommodation cost on the Mornington Peninsula?",
        acceptedAnswer: { "@type": "Answer", text: "Budget $250–400/night for a good mid-range self-contained villa or cottage. Luxury vineyard stays (Jackalope, Lindenderry) run $450–800/night. Budget options in Rosebud, Dromana, and Rye start from $150/night. Prices peak in summer and over long weekends — autumn midweek offers the best value." }
      },
      {
        "@type": "Question",
        name: "Is one night enough on the Mornington Peninsula?",
        acceptedAnswer: { "@type": "Answer", text: "One night works for a focused escape — arrive Friday evening, spend Saturday on the ridge (cellar doors + lunch), and drive home Sunday after a morning walk. Two nights is better: it allows a beach day, a second area to explore, and the slower pace the Peninsula rewards. Base in Mornington or Sorrento for single-night trips." }
      }
    ]
  })), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), renderComponent($$result2, "SectionHero", $$SectionHero, { "eyebrow": "Stay", "subEyebrow": "Hotels · vineyard stays · coastal weekends", "title": "Choose the base, and the whole <em>weekend</em> changes.", "dek": "The Peninsula is a region of different moods packed close together. A Red Hill country-house stay produces a different trip from a Sorrento main-street hotel. This hub sorts the beds by the kind of weekend you actually want.", "gradient": "stay", "visualLabel": "Vines inland · limestone coast beyond", "heroImage": "/images/sourced/place-sorrento-01.webp" }), maybeRenderHead(), featuredStays.length, vineyardStays.length > 0 && renderTemplate`<a href="#vineyard" class="format-chip"><span class="format-chip__name">Vineyard weekends</span><span class="format-chip__count">${vineyardStays.length}</span></a>`, coastalStays.length > 0 && renderTemplate`<a href="#coastal" class="format-chip"><span class="format-chip__name">Coastal weekends</span><span class="format-chip__count">${coastalStays.length}</span></a>`, wellnessStays.length > 0 && renderTemplate`<a href="#wellness" class="format-chip"><span class="format-chip__name">Wellness & retreats</span><span class="format-chip__count">${wellnessStays.length}</span></a>`, itineraries.length, venues.length, stayStats.ridge, stayStats.coast, stayStats.bay, featuredStays.length > 0 && renderTemplate`<section class="venues" id="editors"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Editor's picks</p> <h2 class="venues__title">Three stays worth planning the trip around</h2> <p class="venues__sub">From design-hotel spectacle to quieter village-hotel weekends  -  the rooms that change what the trip feels like.</p> </div> <a href="/journal/where-to-stay-for-a-two-night-escape" class="venues__link">Editor's stay guide →</a> </div> <div class="venues__grid"> ${featuredStays.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/stay" })}`)} </div> </div> </section>`, vineyardStays.length > 0 && renderTemplate`<section class="venues venues--plain" id="vineyard"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Vineyard weekends</p> <h2 class="venues__title">Beds with a long lunch already attached</h2> <p class="venues__sub">The stays that make the Red Hill version of the Peninsula hold together  -  close to cellar doors, built for pinot pacing.</p> </div> <a href="/wine" class="venues__link">Wine country →</a> </div> <div class="venues__grid"> ${vineyardStays.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/stay" })}`)} </div> </div> </section>`, coastalStays.length > 0 && renderTemplate`<section class="venues" id="coastal"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Coastal weekends</p> <h2 class="venues__title">For salt air, dusk walks, and back-beach weather</h2> <p class="venues__sub">Rooms that put you near limestone, open water, and the quieter southern end of the region.</p> </div> <a href="/places/sorrento" class="venues__link">Sorrento hub →</a> </div> <div class="venues__grid"> ${coastalStays.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/stay" })}`)} </div> </div> </section>`, wellnessStays.length > 0 && renderTemplate`<section class="venues venues--plain" id="wellness"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Wellness & retreats</p> <h2 class="venues__title">The Peninsula's slow-down layer</h2> <p class="venues__sub">Springs, spa cabins, and farm-stay beds for the weekend that has to do more with less.</p> </div> <a href="/journal/the-thermal-springs-weekend" class="venues__link">Thermal springs guide →</a> </div> <div class="venues__grid"> ${wellnessStays.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/stay" })}`)} </div> </div> </section>`, blurb.line, venues.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/stay" })}`), itineraries.length > 0 && renderTemplate`<section class="escape-callout" id="itineraries"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Turn the bed into a plan</p> <h2 class="venues__title">The best stay choices make the itinerary easier</h2> <p class="venues__sub">If the room is right, the rest of the weekend starts arranging itself.</p> </div> <a href="/escape" class="venues__link">See escape plans →</a> </div> <div class="itinerary-grid"> ${itineraries.map((itinerary) => renderTemplate`${renderComponent($$result2, "ItineraryCard", $$ItineraryCard, { "itinerary": itinerary })}`)} </div> </div> </section>`, placeHighlights.length > 0 && renderTemplate`<section class="places"> <div class="container"> <div class="places__header"> <p class="label label--accent places__label">Choose the district</p> <h2 class="places__title">Browse stays through the places they belong to</h2> <p class="places__sub">Each hub pulls together the beds, tables, and walks that belong to that stretch of the Peninsula.</p> </div> <div class="places__grid"> ${placeHighlights.map((place, index) => renderTemplate`${renderComponent($$result2, "PlaceCard", $$PlaceCard, { "place": place, "variant": index === 1 ? "bay" : index === 2 ? "sand" : "vineyard" })}`)} </div> </div> </section>`, companionReads.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">From the Journal</p> <h2 class="venues__title">Read the stay logic before you book</h2> </div> <a href="/journal" class="venues__link">Journal →</a> </div> <div class="venues__grid"> ${companionReads.map((article) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": article })}`)} </div> </div> </section>`, renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/stay/index.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/stay/index.astro";
const $$url = "/stay";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
