import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead, b as addAttribute, F as Fragment } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$VenueCard } from './VenueCard_SLu3UDq1.mjs';
import { $ as $$ExperienceCard } from './ExperienceCard_BzrVPHmr.mjs';
import { $ as $$ItineraryCard } from './ItineraryCard_CecqkvGG.mjs';
import { $ as $$ArticleCard } from './ArticleCard_D-lJz9rP.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { r as routeSlug, e as stayTypes, v as venueHrefPrefix, t as titleize } from './editorial_CD_uAC75.mjs';

async function getStaticPaths() {
  const itineraries = await getCollection("itineraries");
  return itineraries.map((itinerary) => ({
    params: { slug: routeSlug(itinerary) },
    props: { itinerary }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$slug;
  const audienceLabel = {
    couple: "Couples",
    family: "Families",
    friends: "Friends",
    solo: "Solo",
    locals: "Locals"
  };
  const moodLabel = {
    slow: "Slow",
    indulgent: "Indulgent",
    wellness: "Wellness",
    adventure: "Adventure",
    "food-wine": "Food & Wine",
    mixed: "Mixed",
    quick: "Quick"
  };
  const timeOfDayLabel = {
    morning: "Morning",
    midday: "Midday",
    afternoon: "Afternoon",
    evening: "Evening",
    night: "Night"
  };
  const { itinerary } = Astro2.props;
  const allItineraries = await getCollection("itineraries");
  const allVenues = await getCollection("venues");
  const allExperiences = await getCollection("experiences");
  const articles = await getCollection("articles", ({ data }) => data.status === "published");
  const slug = routeSlug(itinerary);
  const venueMap = new Map(allVenues.map((venue) => [routeSlug(venue), venue]));
  const experienceMap = new Map(allExperiences.map((experience) => [routeSlug(experience), experience]));
  const venueSlugs = itinerary.data.stops.map((stop) => String(stop.venue?.id ?? stop.venue ?? "")).filter(Boolean);
  const experienceSlugs = itinerary.data.stops.map((stop) => String(stop.experience?.id ?? stop.experience ?? "")).filter(Boolean);
  const highlightedVenues = Array.from(new Set(venueSlugs)).map((key) => venueMap.get(key)).filter(Boolean);
  const highlightedExperiences = Array.from(new Set(experienceSlugs)).map((key) => experienceMap.get(key)).filter(Boolean);
  const featuredStays = highlightedVenues.filter((venue) => stayTypes.includes(venue.data.type)).slice(0, 3);
  const relatedArticles = articles.filter((article) => article.data.relatedVenues.some((entry) => venueSlugs.includes(String(entry.id ?? entry))) || article.data.relatedExperiences.some((entry) => experienceSlugs.includes(String(entry.id ?? entry)))).slice(0, 2);
  const relatedItineraries = allItineraries.filter((entry) => routeSlug(entry) !== slug).slice(0, 2);
  const days = Array.from(new Set(itinerary.data.stops.map((stop) => stop.day))).sort((a, b) => a - b);
  const groupedStops = days.map((day) => ({
    day,
    stops: itinerary.data.stops.filter((stop) => stop.day === day).sort((a, b) => a.order - b.order).map((stop) => {
      const venueSlug = String(stop.venue?.id ?? stop.venue ?? "");
      const experienceSlug = String(stop.experience?.id ?? stop.experience ?? "");
      const venue = venueSlug ? venueMap.get(venueSlug) : null;
      const experience = experienceSlug ? experienceMap.get(experienceSlug) : null;
      const entry = venue ?? experience;
      const href = venue ? `${venueHrefPrefix(venue.data.type)}/${routeSlug(venue)}` : experience ? `/explore/${routeSlug(experience)}` : void 0;
      const label = venue?.data.name ?? experience?.data.name ?? "Stop";
      return {
        ...stop,
        entry,
        href,
        label
      };
    })
  }));
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Escape", href: "/escape" },
    { label: itinerary.data.title }
  ];
  const nightsLabel = `${itinerary.data.lengthNights} night${itinerary.data.lengthNights === 1 ? "" : "s"}`;
  const canonical = `https://peninsulainsider.com.au/escape/${slug}`;
  const ogImage = itinerary.data.heroImage?.src && !itinerary.data.heroImage.src.includes("placeholder") ? itinerary.data.heroImage.src : "/images/sourced/home-cover.webp";
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${itinerary.data.title} — Mornington Peninsula Weekend Escape | Peninsula Insider`, "description": itinerary.data.dek, "section": "escape", "canonical": canonical, "ogImage": ogImage }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems })} ${maybeRenderHead()}<section class="itinerary-detail"> <div class="container"> <div class="itinerary-detail__meta"> <a href="/escape" class="itinerary-detail__back">Escape</a> <span class="itinerary-detail__dot" aria-hidden="true"></span> <span class="itinerary-detail__nights">${nightsLabel}</span> </div> <h1 class="itinerary-detail__title">${itinerary.data.title}</h1> <p class="itinerary-detail__dek">${itinerary.data.dek}</p> <div class="itinerary-detail__chips"> <span>${audienceLabel[itinerary.data.audience] ?? itinerary.data.audience}</span> <span>${moodLabel[itinerary.data.mood] ?? itinerary.data.mood}</span> ${itinerary.data.totalDriveMinutes && renderTemplate`<span>${itinerary.data.totalDriveMinutes} min driving</span>`} </div> <div class="itinerary-detail__hero feature__image-block feature__image-block--sand" aria-hidden="true"> <div class="itinerary-detail__hero-fog"></div> <span class="itinerary-detail__hero-label">${itinerary.data.heroImage.alt}</span> </div> <div class="itinerary-detail__grid"> <div> <div class="prose itinerary-detail__editor-note"> ${itinerary.data.editorNote.split(/\n\n+/).map((paragraph) => renderTemplate`<p>${paragraph}</p>`)} </div> <div class="stop-list"> ${groupedStops.map((group) => renderTemplate`<section class="stop-day"> <h2 class="stop-day__heading">Day ${group.day}</h2> <ol class="stop-day__stops"> ${group.stops.map((stop) => renderTemplate`<li class="stop-item"> <div class="stop-item__time">${timeOfDayLabel[stop.timeOfDay] ?? titleize(stop.timeOfDay)}</div> <div> <h3 class="stop-item__name"> ${stop.href ? renderTemplate`<a${addAttribute(stop.href, "href")}>${stop.label}</a>` : stop.label} </h3> ${stop.note && renderTemplate`<p class="stop-item__note">${stop.note}</p>`} </div> </li>`)} </ol> </section>`)} </div> </div> <aside class="facts"> <p class="facts__title">At a glance</p> <dl> <dt>Length</dt> <dd>${nightsLabel}</dd> <dt>Audience</dt> <dd>${audienceLabel[itinerary.data.audience] ?? itinerary.data.audience}</dd> <dt>Mood</dt> <dd>${moodLabel[itinerary.data.mood] ?? itinerary.data.mood}</dd> <dt>Stops</dt> <dd>${itinerary.data.stops.length} sequenced stops</dd> ${itinerary.data.totalDriveMinutes && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <dt>Driving</dt> <dd>${itinerary.data.totalDriveMinutes} minutes total</dd> ` })}`} </dl> <a class="facts__cta" href="/stay">Choose the stay</a> </aside> </div> </div> </section> ${featuredStays.length > 0 && renderTemplate`<section class="venues"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Sleep here</p> <h2 class="venues__title">Stays that anchor this escape properly</h2> </div> <a href="/stay" class="venues__link">All stays →</a> </div> <div class="venues__grid"> ${featuredStays.map((venue) => renderTemplate`${renderComponent($$result2, "VenueCard", $$VenueCard, { "venue": venue, "hrefPrefix": venueHrefPrefix(venue.data.type) })}`)} </div> </div> </section>`}${highlightedExperiences.length > 0 && renderTemplate`<section class="experience-index"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Move the trip outside</p> <h2 class="venues__title">Explore stops inside this plan</h2> </div> <a href="/explore" class="venues__link">Explore →</a> </div> <div class="experience-grid"> ${highlightedExperiences.slice(0, 3).map((experience) => renderTemplate`${renderComponent($$result2, "ExperienceCard", $$ExperienceCard, { "experience": experience })}`)} </div> </div> </section>`}${relatedArticles.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Further reading</p> <h2 class="venues__title">Journal pieces that sharpen this version of the Peninsula</h2> </div> <a href="/journal" class="venues__link">Journal →</a> </div> <div class="venues__grid venues__grid--two"> ${relatedArticles.map((article) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": article })}`)} </div> </div> </section>`}${relatedItineraries.length > 0 && renderTemplate`<section class="escape-callout"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Try another shape</p> <h2 class="venues__title">More escape plans from the rebuild</h2> </div> <a href="/escape" class="venues__link">All escapes →</a> </div> <div class="itinerary-grid"> ${relatedItineraries.map((entry) => renderTemplate`${renderComponent($$result2, "ItineraryCard", $$ItineraryCard, { "itinerary": entry })}`)} </div> </div> </section>`}${renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})} ` })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/escape/[slug].astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/escape/[slug].astro";
const $$url = "/escape/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
