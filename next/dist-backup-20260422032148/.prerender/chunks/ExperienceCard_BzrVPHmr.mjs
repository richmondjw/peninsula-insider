import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './prerender_DgZBHBwL.mjs';
import 'clsx';
import { r as routeSlug, t as titleize, h as heroBackgroundStyle, p as placeLabel } from './editorial_CD_uAC75.mjs';

const $$ExperienceCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$ExperienceCard;
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
    workshop: "Workshop"
  };
  const { experience } = Astro2.props;
  const data = experience.data;
  const slug = routeSlug(experience);
  const duration = data.durationMinutes ? `${data.durationMinutes} min` : null;
  const difficulty = data.difficulty ? difficultyLabel[data.difficulty] ?? titleize(data.difficulty) : null;
  const imgStyle = heroBackgroundStyle(data);
  return renderTemplate`${maybeRenderHead()}<article class="experience-card"> <div${addAttribute(`experience-card__visual experience-card__visual--${data.type}`, "class")} aria-hidden="true"${addAttribute(imgStyle, "style")}> <div class="experience-card__fog"></div> <span class="experience-card__tag">${typeLabel[data.type] ?? titleize(data.type)}</span> </div> <div class="experience-card__body"> <div class="experience-card__meta"> <a${addAttribute(`/places/${data.place?.id ?? data.place}`, "href")} class="experience-card__place-link">${placeLabel(data.place)}</a> ${(duration || difficulty) && renderTemplate`<span>${[duration, difficulty].filter(Boolean).join(" · ")}</span>`} </div> <h3 class="experience-card__title"> <a${addAttribute(`/explore/${slug}`, "href")}>${data.name}</a> </h3> <p class="experience-card__summary">${data.editorNote}</p> <a${addAttribute(`/explore/${slug}`, "href")} class="experience-card__cta">Open the guide →</a> </div> </article>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/ExperienceCard.astro", void 0);

export { $$ExperienceCard as $ };
