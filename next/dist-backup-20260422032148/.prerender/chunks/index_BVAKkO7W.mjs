import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { r as renderComponent, a as renderTemplate, m as maybeRenderHead, b as addAttribute } from './prerender_DgZBHBwL.mjs';
import { g as getCollection } from './_astro_content_CykX4FgV.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BLvjf5bd.mjs';
import { $ as $$Breadcrumbs } from './Breadcrumbs_DNHb82Kc.mjs';
import { $ as $$SectionHero } from './SectionHero_BlToWmif.mjs';
import { $ as $$EventCard } from './EventCard_B8KJvECE.mjs';
import { $ as $$WeekendPickerBlock } from './WeekendPickerBlock_DG9bzSFf.mjs';
import { $ as $$NewsletterBlock } from './NewsletterBlock_CsLef5zT.mjs';
import { j as isUpcoming, r as routeSlug, m as eventCategoryLabel } from './editorial_CD_uAC75.mjs';

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const now = /* @__PURE__ */ new Date();
  const events = (await getCollection("events")).filter((event) => {
    if (["weekly", "monthly", "ongoing"].includes(event.data.recurrence)) return true;
    const end = event.data.endDate ?? event.data.startDate;
    return isUpcoming(end, now);
  }).sort((a, b) => a.data.startDate.getTime() - b.data.startDate.getTime());
  const dispatches = (await getCollection("articles", ({ data }) => data.status === "published")).filter((a) => a.data.format === "weekend-picker").sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
  const currentDispatch = dispatches[0];
  const upcomingWeekendStart = /* @__PURE__ */ new Date("2026-04-25T00:00:00+10:00");
  const upcomingWeekendEnd = /* @__PURE__ */ new Date("2026-04-27T23:59:59+10:00");
  const nextWeekendEvents = events.filter((event) => {
    const start = event.data.startDate;
    if (start > upcomingWeekendEnd) return false;
    const isRecurring = ["weekly", "monthly", "ongoing"].includes(event.data.recurrence);
    if (isRecurring) return true;
    const end = event.data.endDate ?? event.data.startDate;
    return end >= upcomingWeekendStart;
  });
  const editorsPicks = nextWeekendEvents.filter((event) => event.data.lens.includes("weekend-pick")).slice(0, 3);
  const skipEvents = events.filter((event) => event.data.skipThis);
  const categoryOrder = [
    {
      key: "racing-sport",
      title: "Racing & Sport",
      blurb: "The Peninsula's racing days and endurance weekends - the single category Melbourne visitors under-plan."
    },
    {
      key: "writers-ideas",
      title: "Writers & Ideas",
      blurb: "Festivals, panels and literary weekends with a programme worth planning a stay around."
    },
    {
      key: "market",
      title: "Markets, Ranked",
      blurb: "The Peninsula runs eight recurring markets. Here they are in the order we'd actually attend them."
    },
    {
      key: "cellar-door",
      title: "Cellar Door Events",
      blurb: "Release weekends, winemaker dinners and tastings - the region's strongest category, rarely treated as events."
    },
    {
      key: "live-music",
      title: "Live Music",
      blurb: "Sunday sessions, ridge vineyard sets, and the recurring gigs no other Peninsula site tracks."
    },
    {
      key: "wellness",
      title: "Wellness & Retreats",
      blurb: "Thermal circuits, sound baths, and the ongoing programming at Alba and the Hot Springs."
    },
    {
      key: "family-programs",
      title: "Kids & Family",
      blurb: "School-holiday programmes graded A/B/C. We've been to most of them. We'll tell you which ones."
    },
    {
      key: "nature",
      title: "Nature & Council Gems",
      blurb: "Free council-run walks, ranger programmes, and the best-hidden family assets on the Peninsula."
    },
    {
      key: "exhibition",
      title: "Exhibitions & Galleries",
      blurb: "The region's serious public art, a strong rainy-day category nobody leans into."
    },
    {
      key: "civic",
      title: "Civic & Annual",
      blurb: "ANZAC dawn services, council events, and the moments the Peninsula steps out of its tourist costume."
    },
    {
      key: "festival",
      title: "Festivals",
      blurb: "Multi-day programming that defines the Peninsula calendar."
    }
  ];
  const groups = categoryOrder.map((group) => ({
    ...group,
    items: events.filter((event) => event.data.category === group.key)
  })).filter((group) => group.items.length > 0);
  const lensOrder = [
    { key: "weekend-pick", label: "Weekend Pick", note: "What we'd actually book" },
    { key: "family-saturday", label: "Family Saturday", note: "A-grade kids days" },
    { key: "rainy-day", label: "Rainy Day", note: "Weather-proof options" },
    { key: "worth-the-drive", label: "Worth The Drive", note: "From Melbourne, unprompted" },
    { key: "date-idea", label: "Date Idea", note: "Adult-first weekends" },
    { key: "school-holidays", label: "School Holidays", note: "Kid-graded, A/B/C" },
    { key: "free", label: "Free", note: "No ticket required" },
    { key: "locals-know", label: "Locals Know", note: "Under-published picks" }
  ];
  const lensCounts = Object.fromEntries(
    lensOrder.map((lens) => [lens.key, nextWeekendEvents.filter((event) => event.data.lens.includes(lens.key)).length])
  );
  const totalEvents = events.length;
  const totalGroups = groups.length;
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "What's On" }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "What's On Mornington Peninsula · Peninsula Insider", "description": "The Peninsula's events page that actually has an opinion. Weekend picks, kids-graded school holidays, worth-the-drive badges, and what to skip.", "section": "whats-on", "canonical": "https://peninsulainsider.com.au/whats-on", "ogImage": "/images/sourced/place-mornington-01.webp" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Breadcrumbs", $$Breadcrumbs, { "items": breadcrumbItems })} ${renderComponent($$result2, "SectionHero", $$SectionHero, { "eyebrow": "What's On", "subEyebrow": "Events · dispatches · what to skip", "title": "Peninsula events, with an <em>opinion</em> for a change.", "dek": "The Peninsula event web is a list-and-walk-away zone. Every other site publishes the calendar; nobody says what's worth it. This is the one page that does. Weekend picks on Wednesday, kids-grade A/B/C on every family event, and honest skips on the things the tourism feed won't name.", "gradient": "journal", "heroImage": "/images/sourced/place-mornington-01.webp", "visualLabel": "Weekend Picker · Worth The Drive · Skip this" })} ${currentDispatch && renderTemplate`${renderComponent($$result2, "WeekendPickerBlock", $$WeekendPickerBlock, { "dispatch": currentDispatch, "weekend": "24 to 26 April" })}`}${maybeRenderHead()}<section class="events-lens"> <div class="container"> <div class="split-intro"> <div> <p class="label label--accent">Browse by mood</p> <h2 class="split-intro__title">Start from what you actually want the weekend to do</h2> </div> <p class="split-intro__body">Pick the mood or the occasion first. The events below sort themselves around whichever feels right for the weekend.</p> </div> <div class="events-lens__chips"> ${lensOrder.map((lens) => renderTemplate`<a${addAttribute(`#lens-${lens.key}`, "href")}${addAttribute(`events-lens__chip ${lensCounts[lens.key] === 0 ? "is-empty" : ""}`, "class")}> <span class="events-lens__chip-label">${lens.label}</span> <span class="events-lens__chip-note">${lens.note}</span> <span class="events-lens__chip-count">${lensCounts[lens.key]}</span> </a>`)} </div> </div> </section> ${editorsPicks.length > 0 && renderTemplate`<section class="venues venues--plain" id="lens-weekend-pick"> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">This weekend's anchors</p> <h2 class="venues__title">If you only do two things this weekend</h2> <p class="venues__sub">The clearest event anchors shaping the Peninsula from 24 to 26 April.</p> </div> <span class="venues__count">${editorsPicks.length} picks</span> </div> <div class="event-grid"> ${editorsPicks.map((event, i) => renderTemplate`${renderComponent($$result2, "EventCard", $$EventCard, { "event": event, "featured": i === 0 })}`)} </div> </div> </section>`}${lensOrder.filter((lens) => lens.key !== "weekend-pick" && lensCounts[lens.key] > 0).map((lens) => {
    const lensEvents = nextWeekendEvents.filter((event) => event.data.lens.includes(lens.key));
    return renderTemplate`<section class="venues venues--plain"${addAttribute(`lens-${lens.key}`, "id")}> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">${lens.label}</p> <h2 class="venues__title">${lens.note}</h2> <p class="venues__sub">${lensEvents.length} event${lensEvents.length === 1 ? "" : "s"} matching this mood.</p> </div> <span class="venues__count">${lensEvents.length}</span> </div> <div class="event-grid"> ${lensEvents.map((event, i) => renderTemplate`${renderComponent($$result2, "EventCard", $$EventCard, { "event": event, "featured": i === 0 })}`)} </div> </div> </section>`;
  })}<section class="events-stats"> <div class="container"> <dl class="events-stats__list"> <div><dt>Curated events</dt><dd>${totalEvents}</dd></div> <div><dt>Categories</dt><dd>${totalGroups}</dd></div> <div><dt>Reviewed</dt><dd>Weekly</dd></div> <div><dt>Next dispatch</dt><dd>Wednesday 6pm</dd></div> </dl> <p class="events-stats__note">
Reviewed weekly by a named editor. We publish what we'd actually attend, with a sentence of judgement on every entry. If you think we've missed something, <a href="/contact">tell us</a>.
</p> </div> </section> ${skipEvents.length > 0 && renderTemplate`<section class="skip-block" id="lens-skip"> <div class="container"> <div class="skip-block__inner"> <div> <p class="label label--accent">Skip this</p> <h2 class="skip-block__title">What the rest of the Peninsula press won't name</h2> <p class="skip-block__body">One honest paragraph a month. The word "Insider" doing work.</p> </div> <div class="skip-block__list"> ${skipEvents.map((event) => renderTemplate`<article class="skip-entry"> <h3 class="skip-entry__title"> <a${addAttribute(`/whats-on/${routeSlug(event)}`, "href")}>${event.data.title}</a> </h3> <p class="skip-entry__reason">${event.data.skipReason ?? event.data.editorVerdict ?? event.data.summary}</p> </article>`)} </div> </div> </div> </section>`}<section class="events-nav"> <div class="container"> <p class="label label--accent events-nav__label">Navigate by category</p> <div class="events-nav__chips"> ${groups.map((group) => renderTemplate`<a${addAttribute(`#cat-${group.key}`, "href")} class="format-chip"> <span class="format-chip__name">${group.title}</span> <span class="format-chip__count">${group.items.length}</span> </a>`)} </div> </div> </section> ${groups.map((group) => renderTemplate`<section class="venues venues--alt"${addAttribute(`cat-${group.key}`, "id")}> <div class="container"> <div class="venues__header"> <div> <p class="label label--accent">${eventCategoryLabel[group.key] ?? group.title}</p> <h2 class="venues__title">${group.title}</h2> <p class="venues__sub">${group.blurb}</p> </div> <span class="venues__count">${group.items.length} events</span> </div> <div class="event-grid"> ${group.items.map((event) => renderTemplate`${renderComponent($$result2, "EventCard", $$EventCard, { "event": event })}`)} </div> </div> </section>`)}${renderComponent($$result2, "NewsletterBlock", $$NewsletterBlock, {})} ` })}`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/whats-on/index.astro", void 0);

const $$file = "/home/node/.openclaw/workspace/peninsula-insider/next/src/pages/whats-on/index.astro";
const $$url = "/whats-on";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
