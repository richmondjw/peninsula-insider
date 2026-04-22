import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, a as renderTemplate, b as addAttribute } from './prerender_DgZBHBwL.mjs';
import 'clsx';
import { r as routeSlug, g as formatLabel } from './editorial_CD_uAC75.mjs';

const $$ArticleCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$ArticleCard;
  const { article } = Astro2.props;
  const slug = routeSlug(article);
  const authorLabel = article.data.houseByline ? "The Peninsula Insider" : String(article.data.author?.id ?? article.data.author);
  return renderTemplate`${maybeRenderHead()}<article class="venue-card"> <div class="venue-card__top"> <span class="venue-card__type">${formatLabel[article.data.format] ?? article.data.format}</span> ${article.data.readingTimeMinutes && renderTemplate`<span class="venue-card__price">${article.data.readingTimeMinutes} min</span>`} </div> <h3 class="venue-card__name"> <a${addAttribute(`/journal/${slug}`, "href")}>${article.data.title}</a> </h3> <p class="venue-card__place">By ${authorLabel}</p> <p class="venue-card__signature">${article.data.dek}</p> <a${addAttribute(`/journal/${slug}`, "href")} class="venue-card__cta">Read the piece →</a> </article>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/ArticleCard.astro", void 0);

export { $$ArticleCard as $ };
