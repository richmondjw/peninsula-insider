import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './prerender_DgZBHBwL.mjs';
import 'clsx';
import { h as heroBackgroundStyle } from './editorial_CD_uAC75.mjs';

const $$PlaceCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$PlaceCard;
  const { place, variant = "vineyard" } = Astro2.props;
  const data = place.data;
  const slug = place.id ?? data.slug;
  const zoneLabel = String(data.zone ?? "").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const imgClass = variant === "bay" ? "place-card__image place-card__image--bay" : variant === "sand" ? "place-card__image place-card__image--sand" : "place-card__image";
  const imgStyle = heroBackgroundStyle(data);
  return renderTemplate`${maybeRenderHead()}<article class="place-card"> <div${addAttribute(imgClass, "class")} aria-hidden="true"${addAttribute(imgStyle, "style")}></div> <div class="place-card__body"> <p class="place-card__zone">${zoneLabel} · ${data.kind}</p> <h3 class="place-card__name"> <a${addAttribute(`/places/${slug}`, "href")}>${data.name}</a> </h3> <p class="place-card__intro">${data.intro}</p> </div> </article>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/PlaceCard.astro", void 0);

export { $$PlaceCard as $ };
