import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './prerender_DgZBHBwL.mjs';
import 'clsx';
import { r as routeSlug } from './editorial_CD_uAC75.mjs';

const $$WeekendPickerBlock = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$WeekendPickerBlock;
  const { dispatch, weekend } = Astro2.props;
  const slug = routeSlug(dispatch);
  const pubDate = dispatch?.data?.publishedAt?.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return renderTemplate`${maybeRenderHead()}<section class="weekend-picker" aria-label="Peninsula This Weekend"> <div class="container"> <div class="weekend-picker__inner"> <div class="weekend-picker__label-block"> <span class="label label--accent">Peninsula This Weekend</span> <p class="weekend-picker__cadence">Published Wednesday 6pm · one pick, one backup, one thing to skip</p> </div> <div class="weekend-picker__content"> <p class="weekend-picker__kicker"> ${weekend ?? "This weekend"} · dispatch ${pubDate} </p> <h2 class="weekend-picker__title"> <a${addAttribute(`/journal/${slug}`, "href")}>${dispatch.data.title}</a> </h2> <p class="weekend-picker__dek">${dispatch.data.dek}</p> <div class="weekend-picker__ctas"> <a${addAttribute(`/journal/${slug}`, "href")} class="weekend-picker__cta">Read this week's dispatch →</a> <a href="/whats-on" class="weekend-picker__cta weekend-picker__cta--ghost">All events →</a> </div> </div> </div> </div> </section>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/WeekendPickerBlock.astro", void 0);

export { $$WeekendPickerBlock as $ };
