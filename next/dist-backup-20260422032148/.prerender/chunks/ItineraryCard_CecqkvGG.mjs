import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './prerender_DgZBHBwL.mjs';
import 'clsx';
import { r as routeSlug, h as heroBackgroundStyle } from './editorial_CD_uAC75.mjs';

const $$ItineraryCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$ItineraryCard;
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
  const { itinerary } = Astro2.props;
  const data = itinerary.data;
  const slug = routeSlug(itinerary);
  const nightsLabel = `${data.lengthNights} night${data.lengthNights === 1 ? "" : "s"}`;
  return renderTemplate`${maybeRenderHead()}<article class="itinerary-card"> ${data.heroImage && renderTemplate`<div class="itinerary-card__hero"${addAttribute(heroBackgroundStyle(data), "style")} aria-hidden="true"></div>`} <div class="itinerary-card__top"> <span class="itinerary-card__label">Escape plan</span> <span class="itinerary-card__meta">${nightsLabel}</span> </div> <h3 class="itinerary-card__title"> <a${addAttribute(`/escape/${slug}`, "href")}>${data.title}</a> </h3> <p class="itinerary-card__dek">${data.dek}</p> <div class="itinerary-card__chips"> <span>${audienceLabel[data.audience] ?? data.audience}</span> <span>${moodLabel[data.mood] ?? data.mood}</span> ${data.totalDriveMinutes && renderTemplate`<span>${data.totalDriveMinutes} min driving</span>`} </div> <a${addAttribute(`/escape/${slug}`, "href")} class="itinerary-card__cta">See the full plan →</a> </article>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/ItineraryCard.astro", void 0);

export { $$ItineraryCard as $ };
