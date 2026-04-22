import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, b as addAttribute, m as maybeRenderHead, u as unescapeHTML } from './prerender_DgZBHBwL.mjs';
import { g as getCollection, a as getEntry } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$EventCard, a as $$EventBadges } from './EventCard_B8KJvECE.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { r as routeSlug, o as eventLensLabel, l as weatherCopy, v as venueHrefPrefix, n as eventDateLabel, k as kidsGradeCopy, m as eventCategoryLabel } from './editorial_CD_uAC75.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
async function getStaticPaths() {
  const events = await getCollection("events");
  return events.map((event) => ({
    params: { slug: routeSlug(event) },
    props: { event }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$slug;
  const { event } = Astro2.props;
  const place = event.data.place ? await getEntry(event.data.place).catch(() => null) : null;
  const venue = event.data.venue ? await getEntry(event.data.venue).catch(() => null) : null;
  const allEvents = (await getCollection("events")).filter((e) => routeSlug(e) !== routeSlug(event));
  const related = allEvents.filter((e) => e.data.category === event.data.category).slice(0, 3);
  const relatedFallback = allEvents.slice(0, 3);
  const sidebar = related.length >= 2 ? related : relatedFallback;
  const lensList = (event.data.lens ?? []).map((key) => ({
    key,
    label: eventLensLabel[key] ?? key
  }));
  const recurrenceCopy = {
    "one-off": "One-off",
    weekly: "Weekly programme",
    monthly: "Monthly recurring",
    annual: "Annual",
    seasonal: "Seasonal",
    ongoing: "Ongoing"
  };
  const slug = routeSlug(event);
  const placeName = place?.data?.name ?? "Mornington Peninsula";
  const canonical = `https://peninsulainsider.com.au/whats-on/${slug}`;
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.data.title,
    description: event.data.summary,
    startDate: event.data.startDate.toISOString(),
    ...event.data.endDate ? { endDate: event.data.endDate.toISOString() } : {},
    location: {
      "@type": "Place",
      name: venue?.data?.name ?? placeName,
      address: `${placeName}, VIC, Australia`
    },
    url: canonical,
    ...event.data.bookingUrl ? { offers: { "@type": "Offer", url: event.data.bookingUrl } } : {}
  };
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "What's On", href: "/whats-on" },
    { label: event.data.title }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${event.data.title}, ${placeName} · Peninsula Insider`, "description": event.data.summary, "section": "whats-on", "canonical": canonical, "ogImage": event.data.heroImage?.src }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([' <script type="application/ld+json">', "<\/script> ", " ", '<article class="event-detail"> <div class="container"> <div class="event-detail__header"> <div class="event-detail__meta"> <span class="label label--accent">', '</span> <span class="event-detail__dot" aria-hidden="true"></span> <span class="event-detail__meta-item">', '</span> <span class="event-detail__dot" aria-hidden="true"></span> <span class="event-detail__meta-item">', '</span> </div> <h1 class="event-detail__title">', '</h1> <p class="event-detail__summary">', "</p> ", ' </div> <div class="event-detail__body"> <div class="event-detail__main"> ', " ", " ", " ", ' </div> <aside class="event-detail__side"> <div class="event-detail__box"> <p class="event-detail__box-label">At a glance</p> <dl class="event-detail__box-list"> <div> <dt>When</dt> <dd>', "</dd> </div> ", " ", " <div> <dt>Weather</dt> <dd>", "</dd> </div> ", " ", " ", " </dl> </div> ", " </aside> </div> </div> </article> ", "", " "])), unescapeHTML(JSON.stringify(eventSchema)), renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems }), maybeRenderHead(), eventCategoryLabel[event.data.category] ?? event.data.category, eventDateLabel(event.data.startDate, event.data.endDate), recurrenceCopy[event.data.recurrence] ?? event.data.recurrence, event.data.title, event.data.summary, renderComponent($$result2, "EventBadges", $$EventBadges, { "worthTheDrive": event.data.worthTheDrive, "firstTimer": event.data.firstTimer, "kidsGrade": event.data.kidsGrade, "weather": event.data.weather, "skipThis": event.data.skipThis, "size": "md" }), event.data.editorVerdict && renderTemplate`<aside class="event-verdict"> <p class="event-verdict__label">Editor's verdict</p> <p class="event-verdict__body">${event.data.editorVerdict}</p> </aside>`, event.data.editorNote && renderTemplate`<div class="prose"> ${event.data.editorNote.split(/\n\n+/).map((para) => renderTemplate`<p>${para}</p>`)} </div>`, event.data.kidsGrade && event.data.kidsGradeNote && renderTemplate`<aside${addAttribute(`kids-grade-note kids-grade-note--${event.data.kidsGrade.toLowerCase()}`, "class")}> <p class="kids-grade-note__label">${kidsGradeCopy[event.data.kidsGrade]?.label ?? "Kids Grade"}</p> <p class="kids-grade-note__body">${event.data.kidsGradeNote}</p> <p class="kids-grade-note__baseline">${kidsGradeCopy[event.data.kidsGrade]?.blurb}</p> </aside>`, event.data.skipThis && event.data.skipReason && renderTemplate`<aside class="skip-callout"> <p class="skip-callout__label">Skip this</p> <p class="skip-callout__body">${event.data.skipReason}</p> </aside>`, eventDateLabel(event.data.startDate, event.data.endDate), place && renderTemplate`<div> <dt>Where</dt> <dd><a${addAttribute(`/places/${routeSlug(place)}`, "href")}>${place.data.name}</a></dd> </div>`, venue && renderTemplate`<div> <dt>Venue</dt> <dd><a${addAttribute(`${venueHrefPrefix(venue.data.type)}/${routeSlug(venue)}`, "href")}>${venue.data.name}</a></dd> </div>`, weatherCopy[event.data.weather] ?? "Weather flexible", event.data.worthTheDrive && renderTemplate`<div> <dt>Worth the drive</dt> <dd>Yes — unprompted recommendation</dd> </div>`, event.data.firstTimer && renderTemplate`<div> <dt>First time on the Peninsula</dt> <dd>Start here</dd> </div>`, event.data.bookingUrl && renderTemplate`<div> <dt>Book / info</dt> <dd><a${addAttribute(event.data.bookingUrl, "href")} rel="nofollow noreferrer">Organiser -></a></dd> </div>`, lensList.length > 0 && renderTemplate`<div class="event-detail__box event-detail__box--lenses"> <p class="event-detail__box-label">Filed under</p> <ul class="event-detail__lenses"> ${lensList.map((lens) => renderTemplate`<li><span>${lens.label}</span></li>`)} </ul> </div>`, sidebar.length > 0 && renderTemplate`<section class="venues venues--plain"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">Keep planning</p> <h2 class="venues__title">More from What's On</h2> </div> <a href="/whats-on" class="venues__link">All events -></a> </div> <div class="event-grid"> ${sidebar.map((entry) => renderTemplate`${renderComponent($$result2, "EventCard", $$EventCard, { "event": entry })}`)} </div> </div> </section>`, renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})) })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/whats-on/[slug].astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/whats-on/[slug].astro";
const $$url = "/whats-on/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
