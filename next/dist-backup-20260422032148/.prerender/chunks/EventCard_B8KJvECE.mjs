import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, b as addAttribute, a as renderTemplate, r as renderComponent } from './prerender_DgZBHBwL.mjs';
import 'clsx';
import { k as kidsGradeCopy, l as weatherCopy, r as routeSlug, m as eventCategoryLabel, h as heroBackgroundStyle, n as eventDateLabel } from './editorial_CD_uAC75.mjs';

const $$EventBadges = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$EventBadges;
  const {
    worthTheDrive = false,
    firstTimer = false,
    kidsGrade,
    weather,
    skipThis = false,
    size = "sm"
  } = Astro2.props;
  const kidsLabel = kidsGrade ? kidsGradeCopy[kidsGrade]?.label : void 0;
  const weatherLabel = weather && weather !== "mixed" ? weatherCopy[weather] : void 0;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(`event-badges event-badges--${size}`, "class")}> ${skipThis && renderTemplate`<span class="event-badge event-badge--skip" title="Editor says skip this">Skip this</span>`} ${worthTheDrive && renderTemplate`<span class="event-badge event-badge--drive" title="Worth the 90-minute drive from Melbourne">Worth the drive</span>`} ${firstTimer && renderTemplate`<span class="event-badge event-badge--first" title="If you've never been  -  start here">First timer</span>`} ${kidsLabel && renderTemplate`<span${addAttribute(`event-badge event-badge--kids event-badge--kids-${(kidsGrade ?? "B").toLowerCase()}`, "class")}>${kidsLabel}</span>`} ${weatherLabel && renderTemplate`<span class="event-badge event-badge--weather">${weatherLabel}</span>`} </div>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/EventBadges.astro", void 0);

const $$EventCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$EventCard;
  const { event, featured = false } = Astro2.props;
  const slug = routeSlug(event);
  const category = event.data.category;
  function recurrenceAwareDateLabel(data) {
    if (data.recurrence === "weekly") {
      const dayName = data.startDate.toLocaleDateString("en-AU", { weekday: "long" });
      return `Every ${dayName}`;
    }
    if (data.recurrence === "monthly") {
      return `Monthly — ${eventDateLabel(data.startDate, data.endDate)}`;
    }
    return eventDateLabel(data.startDate, data.endDate);
  }
  const dateLabel = recurrenceAwareDateLabel(event.data);
  const placeLabel = typeof event.data.place === "string" ? event.data.place : event.data.place?.id;
  return renderTemplate`${maybeRenderHead()}<article${addAttribute(`event-card ${featured ? "event-card--featured" : ""}`, "class")}> ${event.data.heroImage && renderTemplate`<div class="event-card__hero"${addAttribute(heroBackgroundStyle(event.data), "style")} aria-hidden="true"></div>`} <div class="event-card__top"> <span class="event-card__date">${dateLabel}</span> <span class="event-card__category">${eventCategoryLabel[category] ?? category}</span> </div> <h3 class="event-card__name"> <a${addAttribute(`/whats-on/${slug}`, "href")}>${event.data.title}</a> </h3> ${placeLabel && renderTemplate`<p class="event-card__place">${String(placeLabel).replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</p>`} <p class="event-card__summary">${event.data.summary}</p> ${event.data.editorVerdict && renderTemplate`<blockquote class="event-card__verdict"> <span class="event-card__verdict-label">Editor's verdict</span> <p>${event.data.editorVerdict}</p> </blockquote>`} ${renderComponent($$result, "EventBadges", $$EventBadges, { "worthTheDrive": event.data.worthTheDrive, "firstTimer": event.data.firstTimer, "kidsGrade": event.data.kidsGrade, "weather": event.data.weather, "skipThis": event.data.skipThis })} <a${addAttribute(`/whats-on/${slug}`, "href")} class="event-card__cta">Read the full guide -></a> </article>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/EventCard.astro", void 0);

export { $$EventCard as $, $$EventBadges as a };
