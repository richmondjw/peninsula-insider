import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, F as Fragment, m as maybeRenderHead, b as addAttribute, a as renderTemplate, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$PlaceCard } from './PlaceCard_xGrkBH_3.mjs';
import { $ as $$VenueCard } from './VenueCard_SLu3UDq1.mjs';
import { $ as $$ExperienceCard } from './ExperienceCard_BzrVPHmr.mjs';
import { $ as $$ItineraryCard } from './ItineraryCard_CecqkvGG.mjs';
import { $ as $$ArticleCard } from './ArticleCard_D-lJz9rP.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { t as titleize, h as heroBackgroundStyle, r as routeSlug, e as stayTypes, w as wineTypes } from './editorial_CD_uAC75.mjs';

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(cooked.slice()) }));
var _a$1;
const $$PlaceDetailTemplate = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$PlaceDetailTemplate;
  const {
    place,
    eatVenues = [],
    wineVenues = [],
    stayVenues = [],
    experiences = [],
    itineraries = [],
    articles = [],
    relatedPlaces = [],
    snapshotCards = []
  } = Astro2.props;
  const zoneLabel = titleize(place.data.zone);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Places", href: "/places" },
    { label: place.data.name }
  ];
  const zoneGradient = {
    "red-hill-plateau": "hero-grad--hinterland",
    hinterland: "hero-grad--hinterland",
    bayside: "hero-grad--bay",
    "ocean-coast": "hero-grad--sand",
    "back-beaches": "hero-grad--sand",
    tip: "hero-grad--stay"
  };
  const heroGradientClass = zoneGradient[place.data.zone] ?? "hero-grad--vineyard";
  const anchors = [];
  if (eatVenues.length > 0) anchors.push({ href: "#eat-drink", label: "Eat & drink", count: eatVenues.length });
  if (wineVenues.length > 0) anchors.push({ href: "#wine", label: "Wine & producers", count: wineVenues.length });
  if (stayVenues.length > 0) anchors.push({ href: "#stay", label: "Stay", count: stayVenues.length });
  if (experiences.length > 0) anchors.push({ href: "#explore", label: "Explore", count: experiences.length });
  if (itineraries.length > 0) anchors.push({ href: "#escapes", label: "Escape plans", count: itineraries.length });
  if (articles.length > 0) anchors.push({ href: "#journal", label: "From the journal", count: articles.length });
  const totalVenues = eatVenues.length + wineVenues.length + stayVenues.length;
  const canonical = `https://peninsulainsider.com.au/places/${place.slug}`;
  const placeTitle = `${place.data.name} Guide | Peninsula Insider`;
  const placeDescription = place.data.intro;
  const ogImage = place.data.heroImage?.src && !place.data.heroImage.src.includes("placeholder") ? place.data.heroImage.src : "/images/sourced/home-cover.webp";
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: place.data.name,
    description: place.data.intro,
    url: canonical,
    ...ogImage !== "/images/sourced/home-cover.webp" ? { image: `https://peninsulainsider.com.au${ogImage}` } : {},
    containedInPlace: "Mornington Peninsula"
  };
  return renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "slot": "head" }, { "default": ($$result2) => renderTemplate(_a$1 || (_a$1 = __template$1(["<title>", '</title><meta name="description"', '><link rel="canonical"', '><meta property="og:title"', '><meta property="og:description"', '><meta property="og:url"', '><meta property="og:image"', '><script type="application/ld+json">', "<\/script>"])), placeTitle, addAttribute(placeDescription, "content"), addAttribute(canonical, "href"), addAttribute(placeTitle, "content"), addAttribute(placeDescription, "content"), addAttribute(canonical, "content"), addAttribute(`https://peninsulainsider.com.au${ogImage}`, "content"), unescapeHTML(JSON.stringify(placeSchema))) })}${renderComponent($$result, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems })}${maybeRenderHead()}<section class="place-detail"> <div class="container"> <p class="place-detail__eyebrow">${zoneLabel} · ${place.data.kind}</p> <h1 class="place-detail__title">${place.data.name}</h1> <p class="place-detail__intro">${place.data.intro}</p> <div${addAttribute(`place-detail__hero ${heroGradientClass}`, "class")} aria-hidden="true"${addAttribute(heroBackgroundStyle(place.data), "style")}> <div class="section-hero__visual-fog"></div> <span class="section-hero__visual-label">${place.data.heroImage.alt}</span> </div> <dl class="place-detail__stats"> <div><dt>Zone</dt><dd>${zoneLabel}</dd></div> <div><dt>Kind</dt><dd>${titleize(place.data.kind)}</dd></div> <div><dt>Venues mapped</dt><dd>${totalVenues}</dd></div> <div><dt>Experiences</dt><dd>${experiences.length}</dd></div> </dl> ${anchors.length > 0 && renderTemplate`<nav class="place-detail__nav"${addAttribute(`${place.data.name} sections`, "aria-label")}> ${anchors.map((anchor) => renderTemplate`<a${addAttribute(anchor.href, "href")} class="place-detail__nav-link"> <span class="place-detail__nav-label">${anchor.label}</span> <span class="place-detail__nav-count">${anchor.count}</span> </a>`)} </nav>`} </div> </section> ${snapshotCards.length > 0 && renderTemplate`<section class="zone-intro"> <div class="container"> <div class="split-intro"> <div> <p class="label label--accent">How this hub works</p> <h2 class="split-intro__title">The place layer is now doing real editorial work</h2> </div> <p class="split-intro__body">Instead of acting like a geography label, the place page connects tables, beds, walks, and weekend logic around one part of the Peninsula.</p> </div> <div class="zone-intro__grid zone-intro__grid--four"> ${snapshotCards.map((card) => renderTemplate`<article class="zone-card"> <p class="zone-card__label">${card.label}</p> <h3 class="zone-card__title">${card.title}</h3> <p class="zone-card__body">${card.body}</p> </article>`)} </div> </div> </section>`} ${eatVenues.length > 0 && renderTemplate`<section class="venues" id="eat-drink"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Eat & drink</p> <h2 class="venues__title">Where to eat and drink in ${place.data.name}</h2> <p class="venues__sub">Restaurants, cafés, bakeries, and pubs  -  each with an editor note, not a star rating.</p> </div> <a href="/eat" class="venues__link">All venues →</a> </div> <div class="venues__grid"> ${eatVenues.map((venue) => renderTemplate`${renderComponent($$result, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/eat" })}`)} </div> <p class="venues__rankings-link"><a href="/eat/best-restaurants">See the editorial rankings → Best Restaurants on the Peninsula</a></p> </div> </section>`} ${wineVenues.length > 0 && renderTemplate`<section class="venues venues--plain" id="wine"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Wine & producers</p> <h2 class="venues__title">Cellar doors and makers around ${place.data.name}</h2> <p class="venues__sub">The producers worth the appointment  -  and the ones already shaping the region's vintage conversation.</p> </div> <a href="/wine" class="venues__link">All wine →</a> </div> <div class="venues__grid"> ${wineVenues.map((venue) => renderTemplate`${renderComponent($$result, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/wine" })}`)} </div> <p class="venues__rankings-link"><a href="/wine/best-cellar-doors">See the editorial rankings → Best Cellar Doors on the Peninsula</a></p> </div> </section>`} ${stayVenues.length > 0 && renderTemplate`<section class="venues" id="stay"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Stay</p> <h2 class="venues__title">Sleep in ${place.data.name}</h2> <p class="venues__sub">When a place has a workable bed attached, it stops being a stop and starts becoming a base.</p> </div> <a href="/stay" class="venues__link">All stays →</a> </div> <div class="venues__grid"> ${stayVenues.map((venue) => renderTemplate`${renderComponent($$result, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": "/stay" })}`)} </div> <p class="venues__rankings-link"><a href="/stay/best-accommodation">See the editorial rankings → Best Places to Stay on the Peninsula</a></p> </div> </section>`} ${experiences.length > 0 && renderTemplate`<section class="experience-index" id="explore"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Get outside</p> <h2 class="venues__title">Explore moves anchored to ${place.data.name}</h2> <p class="venues__sub">Walks, beaches, lookouts, and markets worth scheduling around the meals.</p> </div> <a href="/explore" class="venues__link">Explore all →</a> </div> <div class="experience-grid"> ${experiences.map((experience) => renderTemplate`${renderComponent($$result, "ExperienceCard", $$ExperienceCard, { "experience": experience })}`)} </div> </div> </section>`} ${itineraries.length > 0 && renderTemplate`<section class="escape-callout" id="escapes"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Use it in sequence</p> <h2 class="venues__title">Escapes that already route through ${place.data.name}</h2> <p class="venues__sub">These plans have been written around the landscape here  -  not bolted on after.</p> </div> <a href="/escape" class="venues__link">Escape plans →</a> </div> <div class="itinerary-grid"> ${itineraries.map((itinerary) => renderTemplate`${renderComponent($$result, "ItineraryCard", $$ItineraryCard, { "itinerary": itinerary })}`)} </div> </div> </section>`} ${articles.length > 0 && renderTemplate`<section class="venues venues--plain" id="journal"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Read this place properly</p> <h2 class="venues__title">Journal pieces connected to ${place.data.name}</h2> </div> <a href="/journal" class="venues__link">Journal →</a> </div> <div class="venues__grid"> ${articles.map((article) => renderTemplate`${renderComponent($$result, "ArticleCard", $$ArticleCard, { "article": article })}`)} </div> </div> </section>`}  <section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Planning guides</p> <h2 class="venues__title">Service guides for your ${place.data.name} trip</h2> <p class="venues__sub">Long-form editorial that helps you build a weekend, not just a list of places.</p> </div> <a href="/journal" class="venues__link">All guides →</a> </div> <div class="venues__grid venues__grid--links"> <a href="/journal/mornington-peninsula-itinerary" class="venue-card__cta">3-Day Peninsula Itinerary →</a> ${(place.data.zone === "red-hill-plateau" || place.data.zone === "hinterland") && renderTemplate`<a href="/journal/mornington-peninsula-winery-tour" class="venue-card__cta">Self-Drive Winery Tour →</a>`} ${(place.data.zone === "tip" || place.data.zone === "back-beaches" || place.data.zone === "bayside") && renderTemplate`<a href="/journal/free-things-to-do-mornington-peninsula" class="venue-card__cta">Free Things to Do →</a>`} <a href="/journal/best-brunch-mornington-peninsula" class="venue-card__cta">Best Brunch Guide →</a> <a href="/journal/mornington-peninsula-hot-springs-guide" class="venue-card__cta">Hot Springs Guide →</a> <a href="/journal/mornington-peninsula-in-winter" class="venue-card__cta">Winter Guide →</a> ${place.data.kind === "town" && renderTemplate`<a href="/journal/mornington-peninsula-wedding-venues" class="venue-card__cta">Wedding Venues →</a>`} ${(place.data.zone === "ocean-coast" || place.data.zone === "back-beaches" || place.data.zone === "tip") && renderTemplate`<a href="/golf" class="venue-card__cta">Best Golf Courses →</a>`} </div> </div> </section> ${relatedPlaces.length > 0 && renderTemplate`<section class="places"> <div class="container"> <div class="places__header"> <p class="label label--accent places__label">Keep going</p> <h2 class="places__title">Nearby places worth knowing next</h2> <p class="places__sub">Because a Peninsula trip is always made up of two or three pockets, not one.</p> </div> <div class="places__grid"> ${relatedPlaces.map((item, index) => renderTemplate`${renderComponent($$result, "PlaceCard", $$PlaceCard, { "place": item, "variant": index % 2 === 0 ? "bay" : "sand" })}`)} </div> </div> </section>`} ${renderComponent($$result, "NewsletterBlock", $$NewsletterBlock, {})}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/PlaceDetailTemplate.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a, _b;
async function getStaticPaths() {
  const places = await getCollection("places");
  return places.map((place) => ({
    params: { slug: routeSlug(place) },
    props: { place }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$slug;
  const { place } = Astro2.props;
  const allVenues = await getCollection("venues");
  const places = await getCollection("places");
  const allExperiences = await getCollection("experiences");
  const allItineraries = await getCollection("itineraries");
  const allArticles = await getCollection("articles", ({ data }) => data.status === "published");
  const placeSlug = routeSlug(place);
  const placeNameLower = place.data.name.toLowerCase();
  const venuesForPlace = allVenues.filter((venue) => String(venue.data.place?.id ?? venue.data.place) === placeSlug);
  const venueSlugs = venuesForPlace.map((venue) => routeSlug(venue));
  const experiences = allExperiences.filter((experience) => String(experience.data.place?.id ?? experience.data.place) === placeSlug);
  const experienceSlugs = experiences.map((experience) => routeSlug(experience));
  const eatVenues = venuesForPlace.filter((venue) => !stayTypes.includes(venue.data.type) && !wineTypes.includes(venue.data.type)).slice(0, 6);
  const wineVenues = venuesForPlace.filter((venue) => wineTypes.includes(venue.data.type)).slice(0, 6);
  const stayVenues = venuesForPlace.filter((venue) => stayTypes.includes(venue.data.type)).slice(0, 4);
  const relatedSlugs = (place.data.relatedPlaces ?? []).map((entry) => String(entry.id ?? entry));
  const relatedPlaces = places.filter((entry) => relatedSlugs.includes(routeSlug(entry)));
  const itineraries = allItineraries.filter(
    (itinerary) => itinerary.data.stops.some(
      (stop) => venueSlugs.includes(String(stop.venue?.id ?? stop.venue ?? "")) || experienceSlugs.includes(String(stop.experience?.id ?? stop.experience ?? ""))
    )
  ).slice(0, 3);
  const articles = allArticles.filter(
    (article) => article.data.tags.includes(placeSlug) || article.data.tags.some((tag) => tag === placeNameLower) || article.data.relatedVenues.some((entry) => venueSlugs.includes(String(entry.id ?? entry))) || article.data.relatedExperiences.some((entry) => experienceSlugs.includes(String(entry.id ?? entry))) || article.data.title.toLowerCase().includes(placeNameLower)
  ).slice(0, 4);
  const snapshotCards = [
    {
      label: "Eat & drink",
      title: eatVenues.length > 0 ? `${venuesForPlace.filter((venue) => !stayTypes.includes(venue.data.type) && !wineTypes.includes(venue.data.type)).length} dining picks mapped` : "Dining coverage coming",
      body: eatVenues.length > 0 ? "Restaurants, cafés, bakeries, and pubs already connected to the place layer — each with its own editor note." : "This hub will add dining picks as the rebuild continues filling in the venue layer."
    },
    {
      label: "Wine & producers",
      title: wineVenues.length > 0 ? `${venuesForPlace.filter((venue) => wineTypes.includes(venue.data.type)).length} cellar doors & makers` : "Wine coverage coming",
      body: wineVenues.length > 0 ? "Wineries, producers, and distillers worth working into the day. The place hub anchors them into real geography." : "The wine layer is still being mapped for this hub — expect producers as the rebuild progresses."
    },
    {
      label: "Stay",
      title: stayVenues.length > 0 ? `${venuesForPlace.filter((venue) => stayTypes.includes(venue.data.type)).length} stays in the hub` : "Stays coming",
      body: stayVenues.length > 0 ? "When a place has a workable bed attached, it stops being a stop and starts becoming a base." : "Stay coverage will appear here as rooms, villas, and cottages are added."
    },
    {
      label: "Explore",
      title: experiences.length > 0 ? `${experiences.length} nearby experience${experiences.length === 1 ? "" : "s"}` : "Explore coverage coming",
      body: experiences.length > 0 ? "Walks, lookouts, beaches, and market moves are connected into the place layer rather than floating off on their own." : "Explore entries will connect into this hub as the experiences layer is expanded."
    }
  ];
  const canonical = `https://peninsulainsider.com.au/places/${placeSlug}`;
  const ogImage = place.data.heroImage?.src && !place.data.heroImage.src.includes("placeholder") ? place.data.heroImage.src : `/images/sourced/place-${placeSlug}-01.webp`;
  const titleOverrides = {
    "sorrento": `Sorrento Mornington Peninsula 2026 — Where to Eat, Stay & Swim | Peninsula Insider`,
    "red-hill": `Red Hill Mornington Peninsula 2026 — Best Wineries & Restaurants | Peninsula Insider`,
    "flinders": `Flinders Mornington Peninsula 2026 — Guide to the Ocean Village | Peninsula Insider`,
    "mornington": `Mornington Town Guide 2026 — Restaurants, Markets & Beaches | Peninsula Insider`,
    "rye": `Rye Mornington Peninsula 2026 — Beaches, Hot Springs & Brewery Guide | Peninsula Insider`,
    "portsea": `Portsea Guide 2026 — Beaches, Dining & the Tip of the Peninsula | Peninsula Insider`,
    "main-ridge": `Main Ridge Guide 2026 — Cellar Doors, Producers & the Plateau | Peninsula Insider`,
    "dromana": `Dromana Guide 2026 — Gateway to the Peninsula & Arthur's Seat | Peninsula Insider`,
    "mount-martha": `Mount Martha Guide 2026 — Beaches, Walks & Bayside Living | Peninsula Insider`,
    "cape-schanck": `Cape Schanck Guide 2026 — Walks, Lighthouse & Wild Coast | Peninsula Insider`,
    "balnarring": `Balnarring Guide 2026 — Market, Beaches & Hinterland Quiet | Peninsula Insider`,
    "merricks": `Merricks Guide 2026 — Wineries, General Store & Village Pace | Peninsula Insider`,
    "point-nepean": `Point Nepean Guide 2026 — Fort Walk, National Park & History | Peninsula Insider`
  };
  const descOverrides = {
    "sorrento": "The insider guide to Sorrento on the Mornington Peninsula — best restaurants, ocean baths, where to stay, and why off-season Sorrento is a revelation. Updated 2026.",
    "red-hill": "The insider guide to Red Hill on the Mornington Peninsula — best cellar doors, vineyard restaurants, where to stay on the plateau, and the Saturday market. Updated 2026.",
    "flinders": "The insider guide to Flinders on the Mornington Peninsula — ocean coast walks, the bakery, the pub, and why this quiet village draws the weekend-escape crowd. Updated 2026.",
    "mornington": "The insider guide to Mornington town — Wednesday market, foreshore bathing boxes, best restaurants on Main Street, and the most practical Peninsula base. Updated 2026.",
    "rye": "The insider guide to Rye on the Mornington Peninsula — front beach and back beach, Peninsula Hot Springs, the brewery precinct, and the best family base. Updated 2026.",
    "portsea": "The insider guide to Portsea — ocean back beach, the Portsea pub, Point Nepean access, and the quieter, more private end of the Peninsula. Updated 2026.",
    "main-ridge": "The insider guide to Main Ridge — cellar doors, cool-climate producers, the quiet plateau heart of the Peninsula wine region. Updated 2026.",
    "dromana": "The insider guide to Dromana — Arthur's Seat Eagle, gateway to the Peninsula, and the bayside strip between Melbourne and the ridge. Updated 2026.",
    "mount-martha": "The insider guide to Mount Martha — bayside beaches, the Briars, walking trails, and the Peninsula's most liveable residential town. Updated 2026.",
    "cape-schanck": "The insider guide to Cape Schanck — Bushrangers Bay walk, the lighthouse, wild Southern Ocean coast, and the best dramatic scenery on the Peninsula. Updated 2026.",
    "balnarring": "The insider guide to Balnarring — the monthly Balnarring Farmers' Market, quiet beaches, and a hinterland pocket away from the tourist trail. Updated 2026.",
    "merricks": "The insider guide to Merricks — wineries, Merricks General Wine Store, beach access, and the laid-back village pace the Peninsula does well. Updated 2026.",
    "point-nepean": "The insider guide to Point Nepean — the fort walk, national park, quarantine station history, and the tip of the Mornington Peninsula. Updated 2026."
  };
  const pageTitle = titleOverrides[placeSlug] ?? `${place.data.name} Guide — Things to Do, Eat & Stay | Peninsula Insider`;
  const description = descOverrides[placeSlug] ?? (place.data.intro.length > 155 ? place.data.intro.slice(0, 152) + "..." : place.data.intro);
  const townFaqs = {
    "sorrento": [
      { q: "What is Sorrento known for on the Mornington Peninsula?", a: "Sorrento is the social heart of the Peninsula — limestone cliffs, ocean swimming, the ferry to Queenscliff, and a main street that has evolved into one of the region's strongest dining strips. The ocean baths at the back beach are carved from rock and free to use at low tide. Summer is busy and expensive; off-season Sorrento is quieter, cheaper, and arguably better." },
      { q: "Where should I eat in Sorrento?", a: "The Continental Sorrento anchors the main street dining scene. For casual eating, the Sorrento fish and chip shops at the pier are an institution, and the bakeries on Ocean Beach Road do strong morning trade. Book ahead for weekend dinners in summer — the town fills from Friday lunch." },
      { q: "Is Sorrento worth visiting in winter?", a: "Yes — arguably more than summer. The restaurants operate at their best without the crush, accommodation prices drop significantly, the back beach walks are dramatic in winter light, and the ocean baths still work if you are game for it. Winter weekends in Sorrento are an underrated Peninsula move." }
    ],
    "red-hill": [
      { q: "What is Red Hill known for on the Mornington Peninsula?", a: "Red Hill is the wine and dining capital of the Peninsula — a basalt plateau home to the highest concentration of cellar doors and hatted restaurants in the region. Ten Minutes by Tractor, Montalto, and Crittenden Estate are all here. The Saturday market (first Saturday of the month) is one of Victoria's best regional markets." },
      { q: "What are the best wineries in Red Hill?", a: "Ten Minutes by Tractor for benchmark Pinot Noir, Montalto for the complete estate experience (wine, food, sculpture), Crittenden Estate for the family legacy, Main Ridge Estate for one of Australia's original cool-climate producers, and Polperro for casual cellar door atmosphere. The plateau rewards visiting two or three in an afternoon rather than rushing five." },
      { q: "Should I stay in Red Hill or Sorrento?", a: "Red Hill for a wine-country weekend — cellar doors are walkable from many stays and lunch is the main event. Sorrento for a coastal village weekend with ocean swimming and main-street energy. They are 20 minutes apart, so both areas are accessible from either base." }
    ],
    "flinders": [
      { q: "Is Flinders worth visiting on the Mornington Peninsula?", a: "Yes — if you want the quieter, wilder side of the Peninsula. Flinders sits on the ocean coast facing Bass Strait, away from the manicured bay-side villages. The general store, the pub, and the bakery are all genuinely good. The Flinders foreshore walk and nearby Cape Schanck are standout coastal experiences." },
      { q: "What is there to do in Flinders?", a: "Walk the foreshore and pier, eat at the general store or the hotel pub, drive to Cape Schanck for the boardwalk and lighthouse, visit Montalto or Red Hill Cheese on the plateau nearby, and swim at Shoreham or West Head beach. Flinders is a slow-down destination — the value is in doing less, not more." },
      { q: "How far is Flinders from Melbourne?", a: "Flinders is about 100 km from Melbourne CBD, approximately 90 minutes via the Mornington Peninsula Freeway and Flinders Road. It is one of the furthest towns on the Peninsula from Melbourne, which is part of its appeal — it feels properly away." }
    ],
    "mornington": [
      { q: "What is there to do in Mornington town?", a: "Walk the Esplanade and bathing boxes at Mornington Beach, visit the Wednesday farmers' market on the foreshore, eat on Main Street (several strong restaurants and cafes), swim at Mothers Beach or the pier, and use the town as a base for day trips to Red Hill and the Peninsula's southern coast. Mornington works as both a destination and a gateway." },
      { q: "Is Mornington a good base for visiting the Peninsula?", a: "Yes — it is the most accessible town from Melbourne (60 minutes), and central enough to reach Red Hill's cellar doors (20 minutes south), the ocean beaches (30 minutes), and the hot springs (25 minutes). For a first visit or a single-night escape, Mornington is the most practical base on the Peninsula." },
      { q: "When is the Mornington farmers market?", a: "The Mornington Farmers' Market runs every Wednesday morning on the Esplanade, year-round. It is one of the Peninsula's best — local produce, baked goods, flowers, and prepared food stalls. Arrive before 9am for the best selection. The market is a strong anchor for a Mornington day trip." }
    ],
    "rye": [
      { q: "What is Rye known for on the Mornington Peninsula?", a: "Rye is the Peninsula's family beach town — a long calm front beach on the bay, a wild back beach on the ocean, and Peninsula Hot Springs nearby. The town has improved in recent years with a growing brewery and cafe scene. Rye is also the gateway to the back beaches: Number Sixteen, St Andrews, and Gunnamatta." },
      { q: "Is Rye or Sorrento better for families?", a: "Rye for younger families — the front beach is flatter, calmer, and more forgiving than Sorrento's beaches. The town is less expensive and less crowded in summer. Sorrento has more dining and atmosphere for couples and older kids. Peninsula Hot Springs is closer to Rye (10 minutes) than to Sorrento (20 minutes)." },
      { q: "How close is Peninsula Hot Springs to Rye?", a: "Peninsula Hot Springs is about 10 minutes' drive from Rye, inland on Springs Lane near Fingal. It is one of the most common day-trip combinations: morning at the springs, afternoon at Rye front beach. Book hot springs sessions in advance, especially on weekends." }
    ],
    "portsea": [
      { q: "What is Portsea known for?", a: "Portsea is the most exclusive address on the Peninsula — old-money beach houses, the famous Portsea pub, a dramatic ocean back beach, and the gateway to Point Nepean National Park. The front beach is sheltered and calm; the back beach is wild Southern Ocean with rock pools and surf." },
      { q: "Is Portsea worth visiting?", a: "Yes — for the back beach, the Point Nepean walk, and the pub lunch. Portsea is quieter and more private than Sorrento (10 minutes away). The back beach rock pools at low tide are one of the Peninsula's best-kept experiences. The Portsea Hotel pub lunch with bay views is an institution." },
      { q: "How do I get to Point Nepean from Portsea?", a: "Point Nepean National Park starts at the end of Point Nepean Road in Portsea. Entry is via the visitor centre. You can walk the full track to Fort Nepean (approx. 7 km one way) or take the hop-on shuttle. The fort and tunnels at the tip are worth the full walk if you have 3–4 hours." }
    ],
    "main-ridge": [
      { q: "What is Main Ridge known for?", a: "Main Ridge is the quiet, elevated centre of the Peninsula wine region. It has some of Australia's oldest cool-climate vineyards (Main Ridge Estate was planted in 1975) and a concentration of serious producers who favour quality over cellar-door tourism. The fog, altitude, and basalt soils produce exceptional Pinot Noir." },
      { q: "What are the best wineries in Main Ridge?", a: "Main Ridge Estate (the original), Paringa Estate (consistently rated among Australia's best Pinot producers), and Eldridge Estate (tiny, appointment-only, exceptional). These are not cellar doors with gift shops — they are working vineyards that happen to welcome visitors who book ahead." },
      { q: "Is Main Ridge the same as Red Hill?", a: "They're adjacent but distinct. Main Ridge is higher, quieter, and more producer-focused. Red Hill has the restaurants, the market, and the larger cellar doors. Together they form the Peninsula's wine plateau — most visitors experience both in a single afternoon without noticing the boundary." }
    ],
    "dromana": [
      { q: "What is there to do in Dromana?", a: `Ride the Arthur's Seat Eagle gondola for panoramic bay views, eat at the growing strip of Main Street cafes, swim at Dromana foreshore, and use the town as a gateway to the Red Hill plateau (15 minutes uphill). Dromana is the first Peninsula town that feels genuinely "away" from Melbourne.` },
      { q: "Is Dromana a good base for the Mornington Peninsula?", a: "It's practical but not the most atmospheric base. Dromana is the gateway — most visitors pass through on the way to Red Hill or Sorrento. For a budget-friendly stay with easy plateau access, it works. For a destination weekend, Sorrento, Red Hill, or Mornington offer more." },
      { q: "What is Arthur's Seat Eagle?", a: "A modern gondola ride from the base of Arthur's Seat to the summit, with views across Port Phillip Bay to Melbourne. The ride takes about 15 minutes. The summit has walking trails, a small cafe, and the Enchanted Adventure Garden. Best on a clear day — fog at the top is common in winter." }
    ],
    "mount-martha": [
      { q: "Is Mount Martha worth visiting?", a: "Yes — Mount Martha has the Peninsula's best bayside beach for swimming (calm, clean, long), the Briars historic homestead for walking, and a quiet residential character that feels more local than tourist. It's 50 minutes from Melbourne and the most practical beach day-trip on the Peninsula." },
      { q: "What is the best beach in Mount Martha?", a: "Mount Martha South Beach (also called The Pillars) is the standout — a sheltered bay beach backed by cliffs, excellent for swimming. Mount Martha North Beach is closer to the village and good for families. Both are calm Port Phillip Bay beaches — no surf, warm in summer." },
      { q: "How far is Mount Martha from Melbourne?", a: "About 55 km, approximately 50–60 minutes via the Mornington Peninsula Freeway. It's the closest Peninsula beach town to Melbourne — making it the best option for a quick summer beach day without committing to the full drive to Sorrento or Portsea." }
    ],
    "cape-schanck": [
      { q: "What is there to do at Cape Schanck?", a: "Walk the Cape Schanck boardwalk to the lighthouse platform (20 minutes, stunning ocean views), hike to Bushrangers Bay (45 minutes, the Peninsula's best coastal walk), and explore the rock platforms at low tide. Cape Schanck is also the Peninsula's golf country — St Andrews Beach, Moonah Links, and RACV Cape Schanck are all within 10 minutes. The area combines wild Southern Ocean coast with world-ranked links golf." },
      { q: "Is Cape Schanck good for golf?", a: "Cape Schanck is the Peninsula's best golf base. St Andrews Beach Golf Course (Tom Doak, world top 100, public access) is in Fingal on the Cape Schanck plateau. Moonah Links is a 10-minute drive. The Dunes and RACV Cape Schanck are nearby. For a golf-focused weekend, staying at Cape Schanck or Fingal puts you inside 10 minutes of the best public-access courses on the Peninsula." },
      { q: "Is the Bushrangers Bay walk hard?", a: "Moderate — about 45 minutes each way with a steep descent to the beach. The track is well-maintained but includes steps and uneven sections. The reward is a wild, usually empty beach with basalt platforms and no development. Not suitable for very young children or mobility-limited visitors. Bring water." },
      { q: "Can you swim at Cape Schanck?", a: "Swimming is dangerous at Cape Schanck — the Southern Ocean coast has strong rips, no lifeguards, and exposed rock platforms. Bushrangers Bay is not a swimming beach. For safe swimming, drive 15 minutes north to a bay-side beach (Safety Beach, Dromana, or Mount Martha)." }
    ],
    "balnarring": [
      { q: "When is the Balnarring Farmers Market?", a: "The Balnarring Farmers' Market runs on the third Saturday of every month, year-round. It's one of the Peninsula's best produce markets — smaller and more local than Red Hill Market, with a strong focus on growers from the Western Port side of the Peninsula." },
      { q: "What is Balnarring like?", a: "Balnarring is the quiet hinterland of the Peninsula's Western Port side — rural, unhurried, and away from the tourist trail. The beach (Balnarring Beach) faces Western Port Bay and is excellent for families. The monthly market, Foxeys Hangout winery, and the surrounding farmland are the main draws." },
      { q: "Is Balnarring on the Mornington Peninsula?", a: "Yes — Balnarring is on the eastern (Western Port) side of the Peninsula, about 20 minutes from Mornington town. It has a different character from the bay-side and ocean-side towns — more rural, less visited, and priced lower. It's a good base for exploring the quieter eastern Peninsula." }
    ],
    "merricks": [
      { q: "What is Merricks known for?", a: "Merricks General Wine Store is the anchor — a village store turned wine bar and restaurant that has become one of the Peninsula's most popular casual dining destinations. The area is also home to several excellent wineries (Merricks Estate, Merricks Creek) and a quiet beach on Western Port Bay." },
      { q: "Is Merricks the same as Merricks North?", a: "They're adjacent villages. Merricks is the coastal village with the general store and beach access. Merricks North is slightly inland and higher, home to several vineyards and properties on the slopes toward Red Hill. Both are quiet, residential, and share the same relaxed character." },
      { q: "Can you swim at Merricks Beach?", a: "Yes — Merricks Beach faces Western Port Bay and is calm, shallow, and good for families. It's less developed than the Port Phillip Bay beaches and rarely crowded. Access is via Merricks Beach Road. The beach is best at mid to high tide." }
    ],
    "point-nepean": [
      { q: "Is Point Nepean worth visiting?", a: "Absolutely — Point Nepean National Park is one of the most historically significant and scenically dramatic places on the Peninsula. The walk to Fort Nepean at the tip passes through military history, coastal scrub, and ends with views across the Rip to Queenscliff. Allow 3–4 hours for the full experience." },
      { q: "How long is the Point Nepean walk?", a: "The walk from the visitor centre to Fort Nepean is approximately 7 km one way (14 km return). A shuttle bus runs regularly and you can hop on/off, making it possible to walk one way and ride back. The fort itself takes 30–45 minutes to explore properly." },
      { q: "Do you need to pay to enter Point Nepean?", a: "Yes — there is a Parks Victoria entry fee. As of 2026, it is included in a Parks Victoria annual pass. The visitor centre at the entrance has a cafe, parking, and the shuttle departure point. Arrive before 10am on weekends to avoid parking pressure." }
    ]
  };
  const currentFaqs = townFaqs[placeSlug];
  const faqSchema = currentFaqs ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: currentFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a }
    }))
  } : null;
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: place.data.name,
    description: place.data.intro,
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.data.coordinates?.lat,
      longitude: place.data.coordinates?.lng
    },
    url: canonical
  };
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": pageTitle, "description": description, "section": "places", "canonical": canonical, "ogImage": ogImage }, { "default": async ($$result2) => renderTemplate(_b || (_b = __template([' <script type="application/ld+json">', "<\/script> ", "", " "])), unescapeHTML(JSON.stringify(placeSchema)), faqSchema && renderTemplate(_a || (_a = __template(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify(faqSchema))), renderComponent($$result2, "PlaceDetailTemplate", $$PlaceDetailTemplate, { "place": place, "eatVenues": eatVenues, "wineVenues": wineVenues, "stayVenues": stayVenues, "experiences": experiences, "itineraries": itineraries, "articles": articles, "relatedPlaces": relatedPlaces, "snapshotCards": snapshotCards })) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/places/[slug].astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/places/[slug].astro";
const $$url = "/places/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
