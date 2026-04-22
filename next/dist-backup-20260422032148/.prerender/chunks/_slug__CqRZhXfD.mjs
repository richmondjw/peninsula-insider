import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, b as addAttribute, F as Fragment, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$VenueCard } from './VenueCard_SLu3UDq1.mjs';
import { $ as $$ExperienceCard } from './ExperienceCard_BzrVPHmr.mjs';
import { $ as $$ItineraryCard } from './ItineraryCard_CecqkvGG.mjs';
import { $ as $$ArticleCard } from './ArticleCard_D-lJz9rP.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { r as routeSlug, p as placeLabel, t as titleize, h as heroBackgroundStyle, v as venueHrefPrefix } from './editorial_CD_uAC75.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
async function getStaticPaths() {
  const experiences = await getCollection("experiences");
  return experiences.map((experience) => ({
    params: { slug: routeSlug(experience) },
    props: { experience }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$slug;
  const difficultyLabel = {
    easy: "Easy",
    moderate: "Moderate",
    hard: "Hard"
  };
  const typeLabel = {
    walk: "Walk",
    beach: "Beach",
    wellness: "Wellness",
    tour: "Tour",
    attraction: "Attraction",
    gallery: "Gallery",
    park: "Park",
    lookout: "Lookout",
    market: "Market",
    workshop: "Workshop",
    "golf-course": "Golf Course"
  };
  const heroVariant = {
    walk: "feature__image-block--hinterland",
    park: "feature__image-block--hinterland",
    beach: "feature__image-block--bay",
    lookout: "feature__image-block--bay",
    market: "feature__image-block--sand",
    gallery: "feature__image-block--sand",
    attraction: "feature__image-block--sand",
    wellness: "feature__image-block--hinterland"
  };
  const { experience } = Astro2.props;
  const allExperiences = await getCollection("experiences");
  const venues = await getCollection("venues");
  const itineraries = await getCollection("itineraries");
  const articles = await getCollection("articles", ({ data }) => data.status === "published");
  const slug = routeSlug(experience);
  const placeSlug = String(experience.data.place?.id ?? experience.data.place);
  const experiencePlace = placeLabel(experience.data.place);
  const relatedExperiences = allExperiences.filter((entry) => routeSlug(entry) !== slug).filter((entry) => String(entry.data.place?.id ?? entry.data.place) === placeSlug || entry.data.zone === experience.data.zone).slice(0, 3);
  const nearbyVenues = venues.filter((venue) => String(venue.data.place?.id ?? venue.data.place) === placeSlug).slice(0, 3);
  const relatedItineraries = itineraries.filter((itinerary) => itinerary.data.stops.some((stop) => String(stop.experience?.id ?? stop.experience ?? "") === slug)).slice(0, 2);
  const relatedArticles = articles.filter((article) => article.data.relatedExperiences.some((entry) => String(entry.id ?? entry) === slug) || article.data.tags.includes(placeSlug)).slice(0, 2);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Explore", href: "/explore" },
    { label: experience.data.name }
  ];
  const seasonBest = experience.data.seasonBest?.length ? experience.data.seasonBest.map((entry) => titleize(entry)).join(" · ") : null;
  const duration = experience.data.durationMinutes ? `${experience.data.durationMinutes} min` : null;
  const difficulty = experience.data.difficulty ? difficultyLabel[experience.data.difficulty] ?? titleize(experience.data.difficulty) : null;
  const heroClass = heroVariant[experience.data.type] ?? "feature__image-block--hinterland";
  const heroStyle = heroBackgroundStyle(experience.data);
  const canonical = `https://peninsulainsider.com.au/explore/${slug}`;
  const ogImage = experience.data.heroImage?.src && !experience.data.heroImage.src.includes("placeholder") ? experience.data.heroImage.src : "/images/sourced/home-cover.webp";
  const description = experience.data.editorNote.length > 155 ? experience.data.editorNote.slice(0, 152) + "..." : experience.data.editorNote;
  const schemaTypeMap = {
    "golf-course": ["GolfCourse", "SportsActivityLocation", "TouristAttraction"],
    "walk": "TouristAttraction",
    "beach": "Beach",
    "park": "Park",
    "gallery": "ArtGallery",
    "market": "LocalBusiness",
    "wellness": ["HealthAndBeautyBusiness", "TouristAttraction"],
    "attraction": "TouristAttraction",
    "lookout": "TouristAttraction",
    "tour": "TouristAttraction",
    "workshop": "LocalBusiness"
  };
  const schemaType = schemaTypeMap[experience.data.type] ?? "TouristAttraction";
  const experienceSchema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: experience.data.name,
    description: experience.data.editorNote,
    address: {
      "@type": "PostalAddress",
      streetAddress: experience.data.address ?? void 0,
      addressLocality: experiencePlace,
      addressRegion: "VIC",
      addressCountry: "AU"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: experience.data.coordinates?.lat,
      longitude: experience.data.coordinates?.lng
    },
    url: canonical,
    ...experience.data.website ? { sameAs: [experience.data.website] } : {}
  };
  if (experience.data.type === "golf-course") {
    const golfData = experience.data.golf;
    if (golfData?.holes) experienceSchema.numberOfHoles = golfData.holes;
    if (golfData?.access) {
      experienceSchema.publicAccess = golfData.access === "public";
    }
  }
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${experience.data.name}, ${experiencePlace} · Peninsula Insider`, "description": description, "section": "explore", "canonical": canonical, "ogImage": ogImage }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " ", '<section class="experience-detail"> <div class="container"> <div class="experience-detail__meta"> <a href="/explore" class="experience-detail__type">', '</a> <span class="experience-detail__dot" aria-hidden="true"></span> <a', ' class="experience-detail__place">', "</a> ", ' </div> <h1 class="experience-detail__title">', "</h1> <div", ' aria-hidden="true"', '> <div class="experience-detail__hero-fog"></div> <span class="experience-detail__hero-label">', '</span> </div> <div class="experience-detail__grid"> <div> <div class="prose"> ', ' </div> </div> <aside class="facts"> <p class="facts__title">At a glance</p> <dl> <dt>Place</dt> <dd><a', ">", "</a></dd> <dt>Type</dt> <dd>", "</dd> ", " ", " ", " ", " ", ' </dl> <a class="facts__cta"', ">Open place hub</a> </aside> </div> </div> </section> ", "", "", "", "", " "])), unescapeHTML(JSON.stringify(experienceSchema)), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), maybeRenderHead(), typeLabel[experience.data.type] ?? titleize(experience.data.type), addAttribute(`/places/${placeSlug}`, "href"), experiencePlace, duration && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <span class="experience-detail__dot" aria-hidden="true"></span> <span class="experience-detail__place">${duration}</span> ` })}`, experience.data.name, addAttribute(`experience-detail__hero feature__image-block ${heroClass}`, "class"), addAttribute(heroStyle, "style"), experience.data.heroImage.alt, experience.data.editorNote.split(/\n\n+/).map((paragraph) => renderTemplate`<p>${paragraph}</p>`), addAttribute(`/places/${placeSlug}`, "href"), experiencePlace, typeLabel[experience.data.type] ?? titleize(experience.data.type), duration && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <dt>Timing</dt> <dd>${duration}</dd> ` })}`, difficulty && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <dt>Difficulty</dt> <dd>${difficulty}</dd> ` })}`, seasonBest && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <dt>Best in</dt> <dd>${seasonBest}</dd> ` })}`, experience.data.address && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <dt>Access</dt> <dd>${experience.data.address}</dd> ` })}`, experience.data.website && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <dt>Website</dt> <dd><a${addAttribute(experience.data.website, "href")}>${experience.data.website.replace(/^https?:\/\//, "")}</a></dd> ` })}`, addAttribute(`/places/${placeSlug}`, "href"), nearbyVenues.length > 0 && renderTemplate`<section class="venues"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Pair it with a booking</p> <h2 class="venues__title">Where to eat, drink, or stay nearby</h2> <p class="venues__sub">The best explore pages should lead somewhere next.</p> </div> <a${addAttribute(`/places/${placeSlug}`, "href")} class="venues__link">See ${experiencePlace} →</a> </div> <div class="venues__grid"> ${nearbyVenues.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": venueHrefPrefix(venue.data.type) })}`)} </div> </div> </section>`, relatedItineraries.length > 0 && renderTemplate`<section class="escape-callout"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Use it in a weekend</p> <h2 class="venues__title">Escape plans that already sequence this stop properly</h2> </div> <a href="/escape" class="venues__link">All escapes →</a> </div> <div class="itinerary-grid"> ${relatedItineraries.map((itinerary) => renderTemplate`${renderComponent($$result2, "ItineraryCard", $$ItineraryCard, { "itinerary": itinerary })}`)} </div> </div> </section>`, relatedExperiences.length > 0 && renderTemplate`<section class="experience-index"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Keep going</p> <h2 class="venues__title">More ways to use this side of the Peninsula</h2> </div> <a href="/explore" class="venues__link">Explore more →</a> </div> <div class="experience-grid"> ${relatedExperiences.map((entry) => renderTemplate`${renderComponent($$result2, "ExperienceCard", $$ExperienceCard, { "experience": entry })}`)} </div> </div> </section>`, relatedArticles.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Further reading</p> <h2 class="venues__title">Journal pieces that deepen this stop</h2> </div> <a href="/journal" class="venues__link">Journal →</a> </div> <div class="venues__grid venues__grid--two"> ${relatedArticles.map((article) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": article })}`)} </div> </div> </section>`, renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/explore/[slug].astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/explore/[slug].astro";
const $$url = "/explore/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
